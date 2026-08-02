# Staff Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clock-in / clock-out attendance tracking for all staff roles, a manager-only daily view, audit logging of each event, and an HRM.1d entry in the NABH compliance checklist — satisfying NABH HRM.1d with no new npm dependencies.

**Architecture:** A new `StaffAttendance` Prisma model (user-anchored, denormalized, no FK) stores one record per user per IST calendar day. Four API routes under `/api/attendance/` all use `requireApi` + role rules in `canAccessApi`. An `AttendanceWidget` client component lives in the ConsoleShell sidebar footer. A manager-only `/attendance` page shows the daily table. The NABH compliance snapshot gains one new count query feeding an HRM.1d checklist item.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), React hooks, Tailwind CSS, Vitest (existing test suite)

## Global Constraints

- No new npm dependencies — use only what is already in the project.
- Tests run with `npm test` (Vitest, node environment). All new tests go in `src/lib/__tests__/`.
- All client components must have `"use client"` as the first line.
- Tailwind only — no inline `style=` props.
- All API routes use `requireApi(request)` from `@/lib/api-guard` — no hand-rolled session checks.
- Role rules for new routes live exclusively in `canAccessApi` in `src/lib/auth.ts`.
- IST day boundaries use `startOfDay(new Date())` and `addDays(startOfDay(new Date()), 1)` from `@/lib/date-range` — never `istDateOnly` (which is for `@db.Date` columns only) and never an inline reimplementation.
- `display` role is excluded from attendance at the `canAccessApi` layer — not in route handlers.
- `logAudit` from `@/lib/audit` is used for all audit events; errors are swallowed by it already.
- `sessionStorage` key for attendance: not used here (attendance persists in DB, not sessionStorage).
- One clock-in record per user per IST calendar day; enforced at API layer, not DB constraint.
- `computeDuration` and `isStaffRole` are extracted as pure functions in `src/lib/attendance.ts` so they can be unit-tested without a DOM or DB.

---

## File Map

| Status | Path | Role |
|--------|------|------|
| Create | `src/lib/attendance.ts` | Pure helpers: `isStaffRole`, `computeDuration` |
| Create | `src/lib/__tests__/attendance.test.ts` | Unit tests for the two pure helpers |
| Modify | `src/lib/audit.ts` | Add `CLOCK_IN`, `CLOCK_OUT` to `AUDIT_ACTIONS` |
| Modify | `src/lib/auth.ts` | Add `canAccessApi` rules + `/attendance` to `PAGE_ACCESS` |
| Modify | `src/lib/__tests__/api-guard.test.ts` | Tests for new attendance `canAccessApi` entries |
| Modify | `prisma/schema.prisma` | Add `StaffAttendance` model |
| Create | `src/app/api/attendance/status/route.ts` | GET — today's attendance state for current user |
| Create | `src/app/api/attendance/clock-in/route.ts` | POST — create clock-in record |
| Create | `src/app/api/attendance/clock-out/route.ts` | POST — set clock-out on today's open record |
| Create | `src/app/api/attendance/daily/route.ts` | GET (manager/admin) — all records for a date |
| Create | `src/components/AttendanceWidget.tsx` | Sidebar widget: clock-in/out controls + status |
| Modify | `src/components/ConsoleShell.tsx` | Add `AttendanceWidget` + "Attendance" nav link |
| Create | `src/app/attendance/page.tsx` | Manager daily attendance view |
| Modify | `src/lib/nabh.ts` | Add `attendanceRecordedToday` param + HRM.1d item |
| Modify | `src/lib/nabh-compliance.ts` | Add attendance count query, pass to `buildNabhChecklist` |
| Modify | `src/lib/__tests__/nabh.test.ts` | Extend with HRM.1d test cases |

---

### Task 1: Pure helpers + unit tests

**Files:**
- Create: `src/lib/attendance.ts`
- Create: `src/lib/__tests__/attendance.test.ts`

**Interfaces:**
- Produces:
  - `isStaffRole(role: string): boolean` — `false` for `"display"`, `true` for all other roles
  - `computeDuration(clockIn: Date, clockOut: Date): string` — e.g. `"8h 47m"`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/attendance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeDuration, isStaffRole } from "@/lib/attendance";

describe("isStaffRole", () => {
  it("returns false for display role", () => {
    expect(isStaffRole("display")).toBe(false);
  });

  it("returns true for all staff roles", () => {
    const staffRoles = ["admin", "manager", "reception", "doctor", "lab", "radiology", "pharmacy"];
    for (const role of staffRoles) {
      expect(isStaffRole(role)).toBe(true);
    }
  });
});

describe("computeDuration", () => {
  it("formats multi-hour durations correctly", () => {
    // 09:00 IST = 03:30 UTC on a standard day
    const clockIn  = new Date("2026-08-02T03:30:00.000Z");
    const clockOut = new Date("2026-08-02T12:17:00.000Z");
    // 8 hours 47 minutes
    expect(computeDuration(clockIn, clockOut)).toBe("8h 47m");
  });

  it("formats sub-hour durations correctly", () => {
    const clockIn  = new Date("2026-08-02T03:30:00.000Z");
    const clockOut = new Date("2026-08-02T04:02:00.000Z");
    // 0 hours 32 minutes
    expect(computeDuration(clockIn, clockOut)).toBe("0h 32m");
  });

  it("formats exact-hour durations correctly", () => {
    const clockIn  = new Date("2026-08-02T03:30:00.000Z");
    const clockOut = new Date("2026-08-02T11:30:00.000Z");
    // 8 hours 0 minutes
    expect(computeDuration(clockIn, clockOut)).toBe("8h 0m");
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```
npm test -- attendance
```

Expected: failures with `Cannot find module '@/lib/attendance'`.

- [ ] **Step 3: Create the helpers file**

Create `src/lib/attendance.ts`:

```ts
export function isStaffRole(role: string): boolean {
  return role !== "display";
}

export function computeDuration(clockIn: Date, clockOut: Date): string {
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
```

- [ ] **Step 4: Run tests — expect all pass**

```
npm test -- attendance
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```
git add src/lib/attendance.ts src/lib/__tests__/attendance.test.ts
git commit -m "feat: add attendance pure helpers and tests (NABH HRM.1d)"
```

---

### Task 2: AUDIT_ACTIONS additions

**Files:**
- Modify: `src/lib/audit.ts` (the `AUDIT_ACTIONS` const near line 109)

**Interfaces:**
- Produces: `AUDIT_ACTIONS.CLOCK_IN` (`"clock_in"`), `AUDIT_ACTIONS.CLOCK_OUT` (`"clock_out"`)

No new tests — `AUDIT_ACTIONS` is a plain constant; correctness is verified by the API routes that use it in Tasks 5–7.

- [ ] **Step 1: Add the two new actions to `AUDIT_ACTIONS` in `src/lib/audit.ts`**

Find the closing lines of `AUDIT_ACTIONS`. They currently end with:

```ts
  SCREEN_LOCK: "screen_lock",
  SCREEN_UNLOCK: "screen_unlock",
  SCREEN_UNLOCK_FAILED: "screen_unlock_failed",
} as const;
```

Add the two new entries before `} as const;`:

```ts
  SCREEN_LOCK: "screen_lock",
  SCREEN_UNLOCK: "screen_unlock",
  SCREEN_UNLOCK_FAILED: "screen_unlock_failed",
  CLOCK_IN: "clock_in",
  CLOCK_OUT: "clock_out",
} as const;
```

- [ ] **Step 2: Run full test suite — no regressions**

```
npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```
git add src/lib/audit.ts
git commit -m "feat: add CLOCK_IN/CLOCK_OUT audit actions"
```

---

### Task 3: Auth rules + canAccessApi tests + PAGE_ACCESS

**Files:**
- Modify: `src/lib/auth.ts` (inside `canAccessApi` and inside `PAGE_ACCESS`)
- Modify: `src/lib/__tests__/api-guard.test.ts` (append new describe block)

**Interfaces:**
- Consumes: `apiGuardDecision` from `@/lib/api-guard` (already imported in the test file)
- Produces:
  - `/api/attendance/status`, `/api/attendance/clock-in`, `/api/attendance/clock-out` — allowed for all roles except `display`
  - `/api/attendance/daily` — allowed for `manager` and `admin` only
  - `/attendance` page — accessible to `manager` and `admin`

- [ ] **Step 1: Write the failing tests**

Open `src/lib/__tests__/api-guard.test.ts`. The file already imports `apiGuardDecision` and defines a `doctor` session fixture. Append this describe block at the end of the file:

```ts
describe("apiGuardDecision — attendance routes", () => {
  const makeSession = (role: SessionPayload["role"]): SessionPayload => ({
    userId: "u1",
    username: role,
    role,
    displayName: null,
    doctorId: null,
    mustChangePassword: false,
  });

  const staffRoutes = [
    "/api/attendance/status",
    "/api/attendance/clock-in",
    "/api/attendance/clock-out",
  ];

  it("allows all non-display roles on staff attendance routes", () => {
    const roles = ["admin", "manager", "reception", "doctor", "lab", "radiology", "pharmacy"] as const;
    for (const role of roles) {
      for (const route of staffRoutes) {
        expect(apiGuardDecision(makeSession(role), route, "GET")).toMatchObject({ ok: true });
        expect(apiGuardDecision(makeSession(role), route, "POST")).toMatchObject({ ok: true });
      }
    }
  });

  it("blocks display role on staff attendance routes", () => {
    for (const route of staffRoutes) {
      expect(apiGuardDecision(makeSession("display"), route, "GET")).toEqual({
        ok: false,
        status: 403,
      });
    }
  });

  it("allows manager and admin on /api/attendance/daily", () => {
    expect(apiGuardDecision(makeSession("manager"), "/api/attendance/daily", "GET")).toMatchObject({ ok: true });
    expect(apiGuardDecision(makeSession("admin"), "/api/attendance/daily", "GET")).toMatchObject({ ok: true });
  });

  it("blocks non-manager roles on /api/attendance/daily", () => {
    const nonManagers = ["reception", "doctor", "lab", "radiology", "pharmacy", "display"] as const;
    for (const role of nonManagers) {
      expect(apiGuardDecision(makeSession(role), "/api/attendance/daily", "GET")).toEqual({
        ok: false,
        status: 403,
      });
    }
  });
});
```

- [ ] **Step 2: Run tests — expect new failures**

```
npm test -- api-guard
```

Expected: the four new `it` blocks fail because `canAccessApi` returns `false` for unknown routes (default-deny).

- [ ] **Step 3: Add canAccessApi rules to `src/lib/auth.ts`**

Inside `canAccessApi`, find the block that allows `/api/auth/screen-lock` and `/api/auth/screen-unlock`. Add the new attendance rules immediately after it:

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

- [ ] **Step 4: Add `/attendance` to `PAGE_ACCESS` in `src/lib/auth.ts`**

Inside the `PAGE_ACCESS` object, add after the `"/settings/patients/merge"` entry:

```ts
  "/attendance": ["manager", "admin"],
```

- [ ] **Step 5: Run tests — expect all pass**

```
npm test -- api-guard
```

Expected: all tests in the file pass including the four new describe blocks.

- [ ] **Step 6: Commit**

```
git add src/lib/auth.ts src/lib/__tests__/api-guard.test.ts
git commit -m "feat: add attendance routes to canAccessApi and PAGE_ACCESS"
```

---

### Task 4: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma` (append new model at the end)

**Interfaces:**
- Produces: `prisma.staffAttendance` Prisma client with fields `id`, `user_id`, `username`, `role`, `display_name`, `clock_in`, `clock_out`, `created_at`

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Append at the very end of `prisma/schema.prisma`:

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

- [ ] **Step 2: Generate and apply the migration**

```
npx prisma migrate dev --name add_staff_attendance
```

Expected: Prisma creates `prisma/migrations/<timestamp>_add_staff_attendance/migration.sql` and applies it to the local DB. The generated SQL should contain `CREATE TABLE "staff_attendance"` with the seven columns.

- [ ] **Step 3: Verify the Prisma client regenerated**

```
npx prisma generate
```

Expected: no errors. `prisma.staffAttendance` is now available in the client.

- [ ] **Step 4: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass (schema change has no effect on existing tests).

- [ ] **Step 5: Commit**

```
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add StaffAttendance schema and migration (NABH HRM.1d)"
```

---

### Task 5: `GET /api/attendance/status` route

**Files:**
- Create: `src/app/api/attendance/status/route.ts`

**Interfaces:**
- Consumes:
  - `requireApi(request)` from `@/lib/api-guard`
  - `prisma.staffAttendance.findFirst` from `@/lib/prisma`
  - `startOfDay`, `addDays` from `@/lib/date-range`
  - `errorResponse` from `@/lib/api-error`
- Produces: `GET /api/attendance/status` →
  - `{ state: "absent" }` when no record today
  - `{ state: "clocked_in", record: { id: string, clock_in: string } }` when open record exists
  - `{ state: "clocked_out", record: { id: string, clock_in: string, clock_out: string } }` when closed record exists

No unit test — route handlers require request mocking outside the established test style. Manual verification in Task 9.

- [ ] **Step 1: Create the route**

Create directory `src/app/api/attendance/status/` and file `route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { addDays, startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const todayStart = startOfDay(new Date());
    const tomorrowStart = addDays(todayStart, 1);

    const record = await prisma.staffAttendance.findFirst({
      where: {
        user_id: session.userId,
        clock_in: { gte: todayStart, lt: tomorrowStart },
      },
      select: { id: true, clock_in: true, clock_out: true },
    });

    if (!record) {
      return NextResponse.json({ state: "absent" });
    }
    if (record.clock_out === null) {
      return NextResponse.json({
        state: "clocked_in",
        record: { id: record.id, clock_in: record.clock_in },
      });
    }
    return NextResponse.json({ state: "clocked_out", record });
  } catch (e) {
    return errorResponse("attendance/status GET", e, "Failed to fetch attendance status");
  }
}
```

- [ ] **Step 2: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/app/api/attendance/status/route.ts
git commit -m "feat: add GET /api/attendance/status route"
```

---

### Task 6: `POST /api/attendance/clock-in` route

**Files:**
- Create: `src/app/api/attendance/clock-in/route.ts`

**Interfaces:**
- Consumes:
  - `requireApi(request)` from `@/lib/api-guard`
  - `AUDIT_ACTIONS`, `logAudit` from `@/lib/audit`
  - `prisma.staffAttendance` from `@/lib/prisma`
  - `startOfDay`, `addDays` from `@/lib/date-range`
  - `errorResponse` from `@/lib/api-error`
- Produces: `POST /api/attendance/clock-in` →
  - `201 { id: string, clock_in: string }` on success
  - `409 { error: "Already clocked in today" }` if a record already exists for today

- [ ] **Step 1: Create the route**

Create directory `src/app/api/attendance/clock-in/` and file `route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { addDays, startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const todayStart = startOfDay(new Date());
    const tomorrowStart = addDays(todayStart, 1);

    const existing = await prisma.staffAttendance.findFirst({
      where: {
        user_id: session.userId,
        clock_in: { gte: todayStart, lt: tomorrowStart },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Already clocked in today" }, { status: 409 });
    }

    const record = await prisma.staffAttendance.create({
      data: {
        user_id: session.userId,
        username: session.username,
        role: session.role,
        display_name: session.displayName,
        clock_in: new Date(),
      },
      select: { id: true, clock_in: true },
    });

    await logAudit({
      action: AUDIT_ACTIONS.CLOCK_IN,
      entity_type: "staff_attendance",
      entity_id: record.id,
      summary: `${session.username} clocked in`,
      session,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    return errorResponse("attendance/clock-in POST", e, "Failed to clock in");
  }
}
```

- [ ] **Step 2: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/app/api/attendance/clock-in/route.ts
git commit -m "feat: add POST /api/attendance/clock-in route"
```

---

### Task 7: `POST /api/attendance/clock-out` route

**Files:**
- Create: `src/app/api/attendance/clock-out/route.ts`

**Interfaces:**
- Consumes:
  - `requireApi(request)` from `@/lib/api-guard`
  - `AUDIT_ACTIONS`, `logAudit` from `@/lib/audit`
  - `prisma.staffAttendance` from `@/lib/prisma`
  - `startOfDay`, `addDays` from `@/lib/date-range`
  - `errorResponse` from `@/lib/api-error`
- Produces: `POST /api/attendance/clock-out` →
  - `200 { id: string, clock_in: string, clock_out: string }` on success
  - `409 { error: "Not clocked in today" }` if no record exists for today
  - `409 { error: "Already clocked out" }` if `clock_out` is already set

- [ ] **Step 1: Create the route**

Create directory `src/app/api/attendance/clock-out/` and file `route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";
import { addDays, startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const todayStart = startOfDay(new Date());
    const tomorrowStart = addDays(todayStart, 1);

    const record = await prisma.staffAttendance.findFirst({
      where: {
        user_id: session.userId,
        clock_in: { gte: todayStart, lt: tomorrowStart },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Not clocked in today" }, { status: 409 });
    }
    if (record.clock_out !== null) {
      return NextResponse.json({ error: "Already clocked out" }, { status: 409 });
    }

    const updated = await prisma.staffAttendance.update({
      where: { id: record.id },
      data: { clock_out: new Date() },
      select: { id: true, clock_in: true, clock_out: true },
    });

    await logAudit({
      action: AUDIT_ACTIONS.CLOCK_OUT,
      entity_type: "staff_attendance",
      entity_id: record.id,
      summary: `${session.username} clocked out`,
      details: { clock_in: updated.clock_in, clock_out: updated.clock_out },
      session,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse("attendance/clock-out POST", e, "Failed to clock out");
  }
}
```

- [ ] **Step 2: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/app/api/attendance/clock-out/route.ts
git commit -m "feat: add POST /api/attendance/clock-out route"
```

---

### Task 8: `GET /api/attendance/daily` route

**Files:**
- Create: `src/app/api/attendance/daily/route.ts`

**Interfaces:**
- Consumes:
  - `requireApi(request)` from `@/lib/api-guard`
  - `prisma.staffAttendance.findMany` from `@/lib/prisma`
  - `startOfDay`, `addDays`, `dateStrIST`, `parseDateParam` from `@/lib/date-range`
  - `errorResponse` from `@/lib/api-error`
- Produces: `GET /api/attendance/daily?date=YYYY-MM-DD` →
  ```ts
  {
    date: string,            // "2026-08-02"
    records: Array<{
      id: string,
      user_id: string,
      username: string,
      role: string,
      display_name: string | null,
      clock_in: string,      // ISO timestamp
      clock_out: string | null
    }>
  }
  ```
  `date` defaults to today (IST) when the query param is absent or invalid.

- [ ] **Step 1: Create the route**

Create directory `src/app/api/attendance/daily/` and file `route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { addDays, dateStrIST, parseDateParam, startOfDay } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const { searchParams } = new URL(request.url);
    const dayStart =
      parseDateParam(searchParams.get("date")) ?? startOfDay(new Date());
    const dayEnd = addDays(dayStart, 1);

    const records = await prisma.staffAttendance.findMany({
      where: {
        clock_in: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { clock_in: "asc" },
      select: {
        id: true,
        user_id: true,
        username: true,
        role: true,
        display_name: true,
        clock_in: true,
        clock_out: true,
      },
    });

    return NextResponse.json({ date: dateStrIST(dayStart), records });
  } catch (e) {
    return errorResponse("attendance/daily GET", e, "Failed to load daily attendance");
  }
}
```

- [ ] **Step 2: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/app/api/attendance/daily/route.ts
git commit -m "feat: add GET /api/attendance/daily route (manager only)"
```

---

### Task 9: `AttendanceWidget` component

**Files:**
- Create: `src/components/AttendanceWidget.tsx`

**Interfaces:**
- Consumes: `GET /api/attendance/status`, `POST /api/attendance/clock-in`, `POST /api/attendance/clock-out`
- Produces:
  ```ts
  export function AttendanceWidget(): JSX.Element
  ```
  Renders nothing visible on initial status-fetch failure; renders the appropriate control otherwise.

- [ ] **Step 1: Create the component**

Create `src/components/AttendanceWidget.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type AttendanceRecord = {
  id: string;
  clock_in: string;
  clock_out?: string | null;
};
type AttendanceState = "loading" | "absent" | "clocked_in" | "clocked_out";

function formatIST(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttendanceWidget() {
  const [state, setState] = useState<AttendanceState>("loading");
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/attendance/status")
      .then((r) => r.json())
      .then((data: { state: AttendanceState; record?: AttendanceRecord }) => {
        setState(data.state);
        setRecord(data.record ?? null);
      })
      .catch(() => {
        // Silent fail — status fetch is a background load, not user-initiated
        setState("absent");
      });
  }, []);

  async function handleClockIn() {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/attendance/clock-in", { method: "POST" });
      if (res.ok) {
        const data: AttendanceRecord = await res.json();
        setRecord(data);
        setState("clocked_in");
      } else if (res.status === 409) {
        setErrorMessage("Already clocked in today");
      } else {
        setErrorMessage("Couldn't reach the server — try again");
      }
    } catch {
      setErrorMessage("Couldn't reach the server — try again");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClockOut() {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/attendance/clock-out", { method: "POST" });
      if (res.ok) {
        const data: AttendanceRecord = await res.json();
        setRecord(data);
        setState("clocked_out");
      } else if (res.status === 409) {
        const body: { error?: string } = await res.json();
        setErrorMessage(body.error ?? "Already clocked out");
      } else {
        setErrorMessage("Couldn't reach the server — try again");
      }
    } catch {
      setErrorMessage("Couldn't reach the server — try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return <div className="mb-2 h-7 animate-pulse rounded-lg bg-slate-800" />;
  }

  return (
    <div className="mb-2">
      {state === "absent" && (
        <button
          type="button"
          onClick={handleClockIn}
          disabled={submitting}
          className="focus-ring w-full rounded-lg bg-teal-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? "Clocking in…" : "Clock in"}
        </button>
      )}

      {state === "clocked_in" && record && (
        <div className="space-y-1">
          <p className="text-[11px] text-slate-400">Since {formatIST(record.clock_in)}</p>
          <button
            type="button"
            onClick={handleClockOut}
            disabled={submitting}
            className="focus-ring w-full rounded-lg border border-amber-600/40 bg-amber-600/10 px-2 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-600/20 disabled:opacity-60"
          >
            {submitting ? "Clocking out…" : "Clock out"}
          </button>
        </div>
      )}

      {state === "clocked_out" && record?.clock_out && (
        <p className="text-[11px] text-slate-400">
          ✓ Clocked out {formatIST(record.clock_out)}
        </p>
      )}

      {errorMessage && (
        <p className="mt-1 text-[11px] text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass. (TypeScript errors in the component would surface here.)

- [ ] **Step 3: Commit**

```
git add src/components/AttendanceWidget.tsx
git commit -m "feat: add AttendanceWidget sidebar component"
```

---

### Task 10: Wire `AttendanceWidget` into `ConsoleShell`

**Files:**
- Modify: `src/components/ConsoleShell.tsx`

**Interfaces:**
- Consumes: `AttendanceWidget` from `@/components/AttendanceWidget`
- The widget must render only when `session.role !== "display"`. The `display` role enters via the public `publicMode` branch of ConsoleShell which has no sidebar — so in practice the sidebar footer only ever renders for non-display roles. The explicit role check is still added for safety.

- [ ] **Step 1: Add the import at the top of `ConsoleShell.tsx`**

After the existing imports, add:

```ts
import { AttendanceWidget } from "@/components/AttendanceWidget";
```

- [ ] **Step 2: Add "Attendance" to `ADMIN_GROUPS`**

Find the `ADMIN_GROUPS` constant. Locate the `"Reports & Records"` group (it contains `Analytics`, `Records`, etc.). Add the Attendance entry as the **last item** in that group's `items` array:

```ts
{
  label: "Reports & Records",
  items: [
    { href: "/analytics", label: "Analytics" },
    { href: "/records", label: "Records" },
    { href: "/records/completeness", label: "Record gaps" },
    { href: "/records/release", label: "ROI log" },
    { href: "/reports", label: "Reports" },
    { href: "/reconciliation", label: "Day-end" },
    { href: "/attendance", label: "Attendance" },   // ← add this line
  ],
},
```

- [ ] **Step 3: Add `AttendanceWidget` to the sidebar footer**

In `SidebarContent`, find the block that starts with `{session && (` and contains the user's name, role, and the Password / Log out buttons. Insert `<AttendanceWidget />` immediately **before** the `<div className="mt-2.5 flex gap-2">` that holds the two buttons:

```tsx
{session && (
  <div className="border-t border-slate-800 px-4 py-3">
    <p className="truncate text-sm font-medium text-white">
      {session.displayName || session.username}
    </p>
    <p className="text-xs capitalize text-slate-400">{session.role}</p>
    {session.role !== "display" && <AttendanceWidget />}   {/* ← add this line */}
    <div className="mt-2.5 flex gap-2">
      <Link href="/account/change-password" ...>Password</Link>
      <button onClick={() => logout()}>Log out</button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add src/components/ConsoleShell.tsx
git commit -m "feat: add AttendanceWidget and Attendance nav link to ConsoleShell"
```

---

### Task 11: Manager daily attendance view

**Files:**
- Create: `src/app/attendance/page.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/attendance/daily?date=YYYY-MM-DD`
  - `ConsoleShell` from `@/components/ConsoleShell`
  - `computeDuration` from `@/lib/attendance`
  - `todayStr` from `@/lib/date-range`
- Produces: `/attendance` page — manager/admin only (enforced by middleware via `PAGE_ACCESS` added in Task 3)

- [ ] **Step 1: Create the page**

Create `src/app/attendance/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { computeDuration } from "@/lib/attendance";
import { todayStr } from "@/lib/date-range";

type AttendanceRecord = {
  id: string;
  username: string;
  role: string;
  display_name: string | null;
  clock_in: string;
  clock_out: string | null;
};

function formatIST(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttendancePage() {
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance/daily?date=${date}`)
      .then((r) => r.json())
      .then((data: { records: AttendanceRecord[] }) => {
        setRecords(data.records ?? []);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <ConsoleShell
      title="Attendance"
      subtitle="Daily staff clock-in / clock-out log (NABH HRM.1d)"
      current="/attendance"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance records for this date.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Name", "Role", "Clock In", "Clock Out", "Duration"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.display_name || r.username}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{r.role}</td>
                    <td className="px-4 py-3 text-slate-700">{formatIST(r.clock_in)}</td>
                    <td className="px-4 py-3">
                      {r.clock_out ? (
                        <span className="text-slate-700">{formatIST(r.clock_out)}</span>
                      ) : (
                        <span className="text-amber-500">— ⚠</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.clock_out
                        ? computeDuration(new Date(r.clock_in), new Date(r.clock_out))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
```

- [ ] **Step 2: Run full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/app/attendance/page.tsx
git commit -m "feat: add manager daily attendance view at /attendance"
```

---

### Task 12: NABH checklist update + tests

**Files:**
- Modify: `src/lib/nabh.ts` (add `attendanceRecordedToday` parameter + HRM.1d item)
- Modify: `src/lib/nabh-compliance.ts` (add attendance count to Promise.all, pass to `buildNabhChecklist`)
- Modify: `src/lib/__tests__/nabh.test.ts` (append new describe block)

**Interfaces:**
- Consumes:
  - `prisma.staffAttendance.count` from `@/lib/prisma`
  - `startOfDay`, `addDays` from `@/lib/date-range`
- Produces:
  - `buildNabhChecklist` now requires `attendanceRecordedToday: number` in its input
  - The returned `items` array gains one entry with `id: "hrm-attendance"`, `standard: "HRM.1d"`

- [ ] **Step 1: Write the failing tests**

Open `src/lib/__tests__/nabh.test.ts`. Add this import at the top:

```ts
import { buildNabhChecklist } from "@/lib/nabh";
```

Then append this describe block at the end of the file (after the existing `describe` blocks):

```ts
describe("buildNabhChecklist HRM.1d", () => {
  const base = {
    todayVisits: 0,
    visitsWithConsent: 0,
    visitsWithEmr: 0,
    visitsWithAbhaToday: 0,
    openIncidents: 0,
    auditLogsToday: 0,
    visitsCompleted: 0,
    visitsWithTwoIdentifiers: 0,
    mlcVisits: 0,
    mlcDocumented: 0,
    feedbackToday: 0,
    visitsSigned: 0,
    attendanceRecordedToday: 0,
  };

  it("HRM.1d is 'met' when at least one attendance record exists today", () => {
    const { items } = buildNabhChecklist({ ...base, attendanceRecordedToday: 3 });
    const item = items.find((i) => i.id === "hrm-attendance")!;
    expect(item).toBeDefined();
    expect(item.standard).toBe("HRM.1d");
    expect(item.status).toBe("met");
  });

  it("HRM.1d is 'partial' when no attendance records exist today", () => {
    const { items } = buildNabhChecklist({ ...base, attendanceRecordedToday: 0 });
    const item = items.find((i) => i.id === "hrm-attendance")!;
    expect(item.status).toBe("partial");
  });

  it("HRM.1d is never 'gap'", () => {
    const { items } = buildNabhChecklist({ ...base, attendanceRecordedToday: 0 });
    const item = items.find((i) => i.id === "hrm-attendance")!;
    expect(item.status).not.toBe("gap");
  });

  it("score is higher with attendance data than without", () => {
    const { score: withData } = buildNabhChecklist({ ...base, attendanceRecordedToday: 1 });
    const { score: withoutData } = buildNabhChecklist({ ...base, attendanceRecordedToday: 0 });
    expect(withData).toBeGreaterThan(withoutData);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```
npm test -- nabh
```

Expected: the new tests fail because `buildNabhChecklist` doesn't yet accept `attendanceRecordedToday` and doesn't emit an `"hrm-attendance"` item.

- [ ] **Step 3: Update `buildNabhChecklist` in `src/lib/nabh.ts`**

In `buildNabhChecklist`, add `attendanceRecordedToday: number` to the input parameter type, then append the new item to the `items` array (after the last existing item, before the closing `]`):

```ts
// Add to the input parameter object type:
attendanceRecordedToday: number;

// Append to the items array:
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

- [ ] **Step 4: Run tests — expect all pass**

```
npm test -- nabh
```

Expected: all 4 new tests pass; existing nabh tests still pass.

- [ ] **Step 5: Update `getNabhComplianceSnapshot` in `src/lib/nabh-compliance.ts`**

Add `startOfDay` and `addDays` to the existing import from `@/lib/date-range` (they may already be imported — check first):

```ts
import { addDays, startOfDay } from "@/lib/date-range";
```

Add the attendance count inside the existing `Promise.all` call. The current call assigns to:
```ts
const [visits, auditCount, openIncidents, feedbackToday, feedbackAvg] = await Promise.all([...]);
```

Change it to:
```ts
const [visits, auditCount, openIncidents, feedbackToday, feedbackAvg, attendanceRecordedToday] =
  await Promise.all([
    // ... all existing queries unchanged ...
    prisma.staffAttendance.count({
      where: {
        clock_in: {
          gte: startOfDay(new Date()),
          lt: addDays(startOfDay(new Date()), 1),
        },
      },
    }),
  ]);
```

Then pass `attendanceRecordedToday` into `buildNabhChecklist`:

```ts
return {
  ...buildNabhChecklist({
    todayVisits: visits.length,
    visitsWithConsent,
    visitsWithEmr,
    visitsWithAbhaToday,
    openIncidents,
    auditLogsToday: auditCount,
    visitsCompleted,
    visitsWithTwoIdentifiers,
    mlcVisits: mlcVisits.length,
    mlcDocumented,
    feedbackToday,
    visitsSigned,
    attendanceRecordedToday,   // ← add this line
  }),
  feedbackAverage,
  feedbackToday,
};
```

- [ ] **Step 6: Run full test suite — all pass**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```
git add src/lib/nabh.ts src/lib/nabh-compliance.ts src/lib/__tests__/nabh.test.ts
git commit -m "feat: add HRM.1d attendance check to NABH compliance checklist"
```

---

## Manual Verification Checklist

After all tasks are complete, verify the following in the running app (`npm run dev`):

- [ ] Sign in as `reception`. The sidebar footer shows a teal "Clock in" button.
- [ ] Click "Clock in". The button changes to "Since HH:MM" + amber "Clock out" button. No error message.
- [ ] Click "Clock in" again in a second tab. The widget shows "Already clocked in today" in red inline text and the button re-enables.
- [ ] Click "Clock out". The widget shows "✓ Clocked out HH:MM" with no further action available.
- [ ] Sign in as `admin`. Navigate to `/attendance`. Today's row for the reception user appears with correct Name, Role, Clock In, Clock Out, and Duration.
- [ ] In the manager view, change the date to yesterday. The table shows "No attendance records for this date." (unless records exist).
- [ ] Sign in as `display` (TV role). The sidebar footer does **not** show the attendance widget.
- [ ] Call `GET /api/attendance/daily` as a non-manager (e.g. reception) directly. Should return 403.
- [ ] Navigate to `/nabh` as manager. The NABH checklist shows a `HRM.1d` row. Its status is `"met"` if someone has clocked in today, `"partial"` otherwise.
- [ ] Open the audit log (`/api/audit-logs`). Confirm `clock_in` and `clock_out` events appear after clocking actions.
