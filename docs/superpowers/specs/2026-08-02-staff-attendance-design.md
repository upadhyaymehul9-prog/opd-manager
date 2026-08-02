# Staff Attendance Feature — Design Spec
**NABH HRM.1d: "The system has capability to capture staff attendance"**
Date: 2026-08-02

---

## Background and context

The OPD Manager has no existing "Staff" concept beyond `User` (role-based login) and `Doctor` (clinical scheduling entity). Every logged-in person is a `User` row with one of eight roles: `admin`, `manager`, `reception`, `doctor`, `lab`, `radiology`, `pharmacy`, `display`. The `Doctor` model is for patient visits and scheduling; it is not the identity anchor for attendance. The schema has no multi-tenant scoping (no `clinic_id` / `branch_id` on any table) — this is a single-tenant-per-deployment system.

NABH HRM.1d requires only that the system *has the capability* to capture staff attendance. A simple clock-in / clock-out mechanism with a manager-visible daily view satisfies this objective element. No shift model, no HR module, no payroll integration.

---

## Identity model (pre-design finding)

- **Identity anchor:** `User.id` (`session.userId` from `SessionPayload`)
- **Session fields available at write time:** `userId`, `username`, `role`, `displayName`
- **`display` role excluded:** TV-screen accounts are not staff and must not appear in attendance records
- **No FK to `User`:** consistent with the schema pattern for audit/operational records — if a user is deleted, their attendance history must not be lost

---

## Section 1 — Data Model

### New Prisma model: `StaffAttendance`

```prisma
model StaffAttendance {
  id           String    @id @default(uuid()) @db.Uuid
  user_id      String    @db.Uuid
  username     String
  role         String
  display_name String?
  clock_in     DateTime  @db.Timestamptz(6)
  clock_out    DateTime? @db.Timestamptz(6)
  created_at   DateTime  @default(now()) @db.Timestamptz(6)

  @@index([user_id])
  @@index([clock_in(sort: Desc)])
  @@map("staff_attendance")
}
```

**Design decisions:**

- `user_id` is stored for efficient querying but is **not** a Prisma `@relation` — same rationale as `AuditLog.user_id`: prevents attendance history from vanishing if a `User` row is ever deleted.
- `username`, `role`, `display_name` are denormalized at write time, matching `AuditLog`'s hybrid pattern. The manager view renders without joins.
- No `clinic_id` — consistent with every other model in the schema.
- No DB-level unique constraint on `(user_id, date)` — the one-per-day guard is enforced at the API layer (same approach used for daily token/bill counters). A PostgreSQL expression index on a derived date column would require a raw-SQL migration artifact invisible to Prisma — not worth it for attendance data.
- **Race condition:** a client-side disable-on-click (one `useState` flag) closes the double-click case entirely. The residual concurrent-tab risk is negligible for a single-shift OPD clinic where one person has one active session. Accepted.
- Migration: single `prisma migrate dev`, no data backfill.

---

## Section 2 — API Routes

All four routes live under `/api/attendance/` and use `requireApi(request)` from `src/lib/api-guard.ts` for auth. Role rules are registered in `canAccessApi` in `src/lib/auth.ts` — no hand-rolled role checks inside handlers.

### New rules in `canAccessApi` (`src/lib/auth.ts`)

```ts
if (
  pathname === "/api/attendance/status" ||
  pathname === "/api/attendance/clock-in" ||
  pathname === "/api/attendance/clock-out"
) {
  return session.role !== "display";
}

if (pathname === "/api/attendance/daily") {
  return session.role === "admin" || session.role === "manager";
}
```

### IST day-window helper (used in all four routes and the NABH compliance query)

```ts
import { startOfDay, addDays } from "@/lib/date-range";

const todayStart    = startOfDay(new Date());
const tomorrowStart = addDays(todayStart, 1);
// WHERE clock_in >= todayStart AND clock_in < tomorrowStart
```

`startOfDay` (not `istDateOnly`) is correct here because `clock_in` is `@db.Timestamptz(6)`. `istDateOnly` is only for `@db.Date` columns — this is documented explicitly in `src/lib/date-range.ts`.

---

### `GET /api/attendance/status`

Returns the calling user's attendance record for today's IST window.

**Auth:** Any non-`display` role.

**Query:** `WHERE user_id = session.userId AND clock_in >= todayStart AND clock_in < tomorrowStart`

**Response:**
```ts
{ state: "absent" }
{ state: "clocked_in",  record: { id, clock_in } }
{ state: "clocked_out", record: { id, clock_in, clock_out } }
```

---

### `POST /api/attendance/clock-in`

Creates a new attendance record for today.

**Auth:** Any non-`display` role.

**Guards:**
1. Record already exists for today's IST window → `409 Conflict`

**Action:** Insert `StaffAttendance` with `clock_in = new Date()`, denormalized fields from session. Then `logAudit` with `AUDIT_ACTIONS.CLOCK_IN`.

**Response:** `201` with `{ id, clock_in }`

---

### `POST /api/attendance/clock-out`

Sets `clock_out` on today's open record.

**Auth:** Any non-`display` role.

**Guards:**
1. No open record for today → `409` ("Not clocked in today")
2. Record exists but `clock_out` already set → `409` ("Already clocked out")

**Action:** `UPDATE ... SET clock_out = now() WHERE id = record.id`. Then `logAudit` with `AUDIT_ACTIONS.CLOCK_OUT`.

**Response:** `200` with `{ id, clock_in, clock_out }`

---

### `GET /api/attendance/daily?date=YYYY-MM-DD`

All staff attendance for a given IST date (defaults to today). Manager/admin only.

**Auth:** `manager` or `admin`.

**Query:** IST-window filter on `clock_in` for the requested date, ordered `clock_in ASC`.

**Response:**
```ts
{
  date: "2026-08-02",
  records: [{ id, user_id, username, role, display_name, clock_in, clock_out }]
}
```

`clock_out: null` = open record (either still clocked in today, or forgotten clock-out on a past date — the manager view distinguishes by context).

---

## Section 3 — UI Components

### 3a. `AttendanceWidget` (`src/components/AttendanceWidget.tsx`)

A `"use client"` component rendered in the `ConsoleShell` sidebar footer, above the Password / Log out buttons, for every session where `role !== "display"` (public mode is already excluded by the `publicMode` prop).

**Widget states:**

| State | Renders |
|---|---|
| Loading | Subtle spinner, no layout shift |
| `absent` | Full-width teal "Clock in" button |
| `clocked_in` | "Since HH:MM" label + amber "Clock out" button |
| `clocked_out` | Muted "✓ Clocked out HH:MM" — no action |
| Error on button action | Small red inline message below button |

**Error feedback (user-initiated actions only):**
- Button sets a local `loading: boolean` on click (prevents double-submission, re-enables only on error).
- Failed responses set `errorMessage: string | null`, shown as a small red line below the button.
- `409` → human-readable string: `"Already clocked in today"` / `"Already clocked out"`.
- Network/unexpected errors → `"Couldn't reach the server — try again"`.
- `errorMessage` clears on the next button click.
- Initial status-fetch failure: silent (non-critical background load, no widget rendered).

**Time display:** `toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })` — no new dependency.

**Data flow:** Fetch `GET /api/attendance/status` on mount. After a successful clock action, update state from the `POST` response directly — no second fetch.

---

### 3b. `/attendance` — Manager Daily View (`src/app/attendance/page.tsx`)

Server component. Standard `ConsoleShell` wrapper with `current="/attendance"`.

**Layout:** Date picker (`<input type="date">`, IST default via `todayStr()`) above an attendance table.

**Table columns:** Name | Role | Clock In | Clock Out | Duration

- Clock Out `"— ⚠"` (amber) for open records — read-only, no manager action.
- Duration computed from `clock_in` / `clock_out` via `computeDuration` (see Section 6); omitted when `clock_out` is null.
- Empty state: "No attendance records for this date."

**Nav link:** "Attendance" added to `ADMIN_GROUPS` in `ConsoleShell` under "Reports & Records" (admin/manager sidebar only).

**Page access:** Added to `PAGE_ACCESS` in `src/lib/auth.ts` for `["manager", "admin"]`.

---

## Section 4 — Audit Logging

### New constants in `src/lib/audit.ts`

```ts
CLOCK_IN:  "clock_in",
CLOCK_OUT: "clock_out",
```

### Clock-in log entry
```ts
await logAudit({
  action: AUDIT_ACTIONS.CLOCK_IN,
  entity_type: "staff_attendance",
  entity_id: record.id,
  summary: `${session.username} clocked in`,
  session,
});
```

### Clock-out log entry
```ts
await logAudit({
  action: AUDIT_ACTIONS.CLOCK_OUT,
  entity_type: "staff_attendance",
  entity_id: record.id,
  summary: `${session.username} clocked out`,
  details: { clock_in: record.clock_in, clock_out: record.clock_out },
  session,
});
```

`details` on clock-out captures both timestamps so the audit log is self-contained — a reviewer does not need to cross-reference `staff_attendance` to understand the event.

`logAudit` already swallows its own errors with `console.error`; logging failure never breaks the clock-in/clock-out response.

---

## Section 5 — NABH Checklist Update

### `src/lib/nabh.ts` — `buildNabhChecklist`

**New input parameter:**
```ts
attendanceRecordedToday: number
```

**New checklist item:**
```ts
{
  id: "hrm-attendance",
  standard: "HRM.1d",
  requirement: "System has capability to capture staff attendance",
  status: input.attendanceRecordedToday > 0 ? "met" : "partial",
  note:
    input.attendanceRecordedToday > 0
      ? `${input.attendanceRecordedToday} staff attendance record(s) today.`
      : "Attendance module active; no records for today yet.",
},
```

**Honest-labeling rationale:**
- `"met"` when ≥ 1 person has clocked in today — capability demonstrated in use.
- `"partial"` (not `"gap"`) when no records today — module is live; absence of data on a given day does not mean the capability is absent. Mirrors how `pre-feedback` handles zero submissions.
- Never `"gap"` — that would misrepresent a deployed, working feature.

The score denominator increases by one item; scores will be slightly diluted until attendance data starts appearing. This is correct and honest.

### NABH compliance API route

One additional query before calling `buildNabhChecklist`:

```ts
const attendanceRecordedToday = await prisma.staffAttendance.count({
  where: {
    clock_in: { gte: startOfDay(new Date()), lt: addDays(startOfDay(new Date()), 1) },
  },
});
```

Same `startOfDay` / `addDays` helpers from `src/lib/date-range.ts`. No second implementation.

---

## Section 6 — Tests

All tests in `src/lib/__tests__/`, pure Vitest, no mocks, pure functions only.

### Helper module: `src/lib/attendance.ts`

Two pure functions extracted for testability:

**`isStaffRole(role: string): boolean`** — returns `false` for `"display"`, `true` for all other roles. Keeps the role-exclusion logic out of route handlers.

**`computeDuration(clockIn: Date, clockOut: Date): string`** — returns `"8h 47m"` style string for the manager view duration column.

---

### `src/lib/__tests__/nabh.test.ts` — extended

New `describe` block added to the existing file:

```ts
describe("buildNabhChecklist HRM.1d", () => {
  it("is 'met' when attendance records exist today", ...);
  it("is 'partial' when no attendance records today", ...);
  it("score is higher with attendance data than without", ...);
});
```

### `src/lib/__tests__/attendance.test.ts` — new file

```ts
describe("isStaffRole", () => {
  it("excludes display role", ...);
  it("includes all seven staff roles", ...);
});

describe("computeDuration", () => {
  it("formats hours and minutes correctly", ...);
  it("handles sub-hour durations", ...);
});
```

### `src/lib/__tests__/api-guard.test.ts` — extended

New cases for `/api/attendance/*` paths:
- `display` role → `false` on status / clock-in / clock-out routes
- `reception`, `doctor`, `lab`, `radiology`, `pharmacy` → `true` on those same routes
- Non-manager roles → `false` on `/api/attendance/daily`
- `manager` and `admin` → `true` on `/api/attendance/daily`

---

## Forgotten clock-out handling

No background job or midnight-cutoff logic. Both the widget and the daily view determine "today's record" by querying where `clock_in` falls within the current IST calendar day. An old open record from a prior day is invisible to today's query — the widget shows "Clock in" fresh the next morning. A forgotten record stays in the DB with `clock_out = null` (honest audit trail). The manager browsing a past date sees `"— ⚠"` in the Clock Out column for such records — no action required.

---

## Files changed / created

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `StaffAttendance` model |
| `prisma/migrations/…` | Generated migration |
| `src/lib/attendance.ts` | New — `isStaffRole`, `computeDuration` |
| `src/lib/audit.ts` | Add `CLOCK_IN`, `CLOCK_OUT` to `AUDIT_ACTIONS` |
| `src/lib/auth.ts` | Add `canAccessApi` rules + `/attendance` to `PAGE_ACCESS` |
| `src/lib/nabh.ts` | Add `attendanceRecordedToday` param + HRM.1d item |
| `src/app/api/attendance/status/route.ts` | New |
| `src/app/api/attendance/clock-in/route.ts` | New |
| `src/app/api/attendance/clock-out/route.ts` | New |
| `src/app/api/attendance/daily/route.ts` | New |
| `src/app/api/nabh/compliance/route.ts` | Add attendance count query |
| `src/components/AttendanceWidget.tsx` | New |
| `src/components/ConsoleShell.tsx` | Add `AttendanceWidget` + nav link |
| `src/app/attendance/page.tsx` | New manager daily view |
| `src/lib/__tests__/nabh.test.ts` | Extend with HRM.1d cases |
| `src/lib/__tests__/attendance.test.ts` | New |
| `src/lib/__tests__/api-guard.test.ts` | Extend with attendance route cases |
