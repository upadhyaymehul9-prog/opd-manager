# Idle Screen-Lock — Design Spec

**Date:** 2026-08-01  
**NABH reference:** DOM.3c (auto screen-lock capability), DOM.3a (log critical security incidents)  
**Status:** Approved

---

## 1. Goal

Automatically lock the console UI after a configurable period of inactivity and require the signed-in user's password to resume. A page refresh must not bypass the lock.

---

## 2. Scope

All routes rendered inside `ConsoleShell` in non-public mode (i.e. every authenticated console: reception, doctor, lab, radiology, pharmacy, manager, admin). The `/tv` route is exempt because it does not use `ConsoleShell` and represents a permanently-on public display with no interactive session concept.

---

## 3. Architecture

### 3.1 Idle-lock configuration constant

**`src/lib/idle-lock-config.ts`** — single source of truth for the timeout.

```ts
export const IDLE_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — all roles
```

Changing this one constant adjusts the timeout everywhere. No per-role differentiation is needed yet; all named console roles get the same 5-minute window.

### 3.2 Activity-tracking hook: `src/hooks/useIdleLock.ts`

Accepts `enabled: boolean`. When disabled, does nothing and always returns `locked = false`.

When enabled:
- Attaches debounced listeners to `mousemove`, `keydown`, `touchstart`, `click` on `window`.
- Debounce delay: 300 ms — activity resets the countdown at most once every 300 ms regardless of how many events fire.
- Sets a `setTimeout` of `IDLE_LOCK_TIMEOUT_MS`. Any debounced activity event clears and restarts it.
- On timeout: sets `sessionStorage.setItem('opd_screen_locked', '1')` and triggers the locked state.
- On mount: reads `sessionStorage` so a page refresh that occurs while locked stays locked immediately.
- Returns `{ locked: boolean, unlock: () => void }`. `unlock()` clears sessionStorage and resets the timer — called by `LockScreen` after a successful password verify.
- Cleans up listeners and timer on unmount.

### 3.3 Lock-screen overlay: `src/components/LockScreen.tsx`

A client component that renders as a `fixed inset-0 z-[200]` overlay (above sidebar, header, and modals).

Contents:
- Clinic name / "Session locked" heading.
- Signed-in user's `displayName || username` and capitalised `role`.
- Single password `<input type="password">` with submit button.
- Failed-attempt counter in local React state.
- On submit: `POST /api/auth/screen-unlock` with `{ password }`.
  - 200 → call `props.onUnlock()` (which calls `unlock()` from the hook).
  - 401 → increment failure counter, show "Incorrect password (N of 5 attempts)".
  - After 5 failures → call `logout()` from `useSession` (redirects to `/login`).
- On mount: `POST /api/auth/screen-lock` to log the lock event (fire-and-forget; never blocks the overlay render).
- Does NOT navigate away — it is a pure overlay. All form state under it is preserved.

Props: `{ session: SessionInfo; onUnlock: () => void }`.

### 3.4 API route: `POST /api/auth/screen-lock`

`src/app/api/auth/screen-lock/route.ts`

- Reads session from cookies.
- Returns 401 if no valid session.
- Calls `logAudit` with `action: AUDIT_ACTIONS.SCREEN_LOCK`.
- Returns `{ ok: true }`.

### 3.5 API route: `POST /api/auth/screen-unlock`

`src/app/api/auth/screen-unlock/route.ts`

Body: `{ password: string }`

- Reads session from cookies; returns 401 if none.
- Fetches `user.password_hash` from DB via `prisma.user.findUnique`.
- Calls `verifyPassword(password, user.password_hash)` from `src/lib/auth.ts`.
- On success: logs `AUDIT_ACTIONS.SCREEN_UNLOCK`, returns `{ ok: true }`.
- On failure: logs `AUDIT_ACTIONS.SCREEN_UNLOCK_FAILED`, returns 401 `{ error: "Incorrect password" }`.

No attempt counter is tracked server-side; the 5-attempt lockout is enforced client-side in `LockScreen`. The rationale: the attacker at a locked screen has the physical device; server-side counting adds complexity without meaningful extra security since the session (and therefore the account) is already known.

### 3.6 `canAccessApi` additions (`src/lib/auth.ts`)

```ts
if (
  pathname === "/api/auth/screen-lock" ||
  pathname === "/api/auth/screen-unlock"
) {
  return true; // any valid session
}
```

Added alongside the other `/api/auth/*` explicit allows at the top of `canAccessApi`.

### 3.7 `AUDIT_ACTIONS` additions (`src/lib/audit.ts`)

```ts
SCREEN_LOCK: "screen_lock",
SCREEN_UNLOCK: "screen_unlock",
SCREEN_UNLOCK_FAILED: "screen_unlock_failed",
```

### 3.8 `ConsoleShell.tsx` wiring

```tsx
const { locked, unlock } = useIdleLock(!publicMode && !!session);

// Inside the return, as the very first child of the outermost div:
{locked && session && (
  <LockScreen session={session} onUnlock={unlock} />
)}
```

The overlay renders on top of everything else; no changes to the existing layout structure are needed.

### 3.9 Idle-timeout note (account area)

`src/app/account/change-password/page.tsx` — add a small read-only info block below the form:

```
Session security
Screen locks after 5 minutes of inactivity on all console roles.
```

Value is derived from `IDLE_LOCK_TIMEOUT_MS / 60_000` so it stays in sync automatically if the constant changes.

---

## 4. sessionStorage lock persistence

Key: `opd_screen_locked`  
Set to `'1'` when the idle timer fires.  
Cleared by `unlock()` after successful password verification.  

A page refresh while locked re-reads this key on mount and immediately re-enters the locked state. The user cannot bypass the lock by refreshing.

---

## 5. Audit trail

| Event | `action` | Logged where |
|---|---|---|
| Screen locks | `screen_lock` | `POST /api/auth/screen-lock` (called on LockScreen mount) |
| Unlock success | `screen_unlock` | `POST /api/auth/screen-unlock` on password match |
| Unlock failure | `screen_unlock_failed` | `POST /api/auth/screen-unlock` on password mismatch |

All three events appear in the existing `AuditLog` table and are visible in the audit-log viewer.

---

## 6. Tests (`src/lib/__tests__/idle-lock.test.ts`)

Vitest / node environment. Tests that are isolatable without DOM:

1. `IDLE_LOCK_TIMEOUT_MS` equals exactly 5 minutes (300 000 ms) — documents the NABH requirement.
2. The formatted display string derived from the constant reads "5 minutes".
3. The `MAX_FAILED_LOGIN_ATTEMPTS` constant (already in auth.ts, value 5) matches the 5-attempt lockout threshold used in LockScreen — documents that the two are intentionally aligned.

DOM-dependent behaviour (event listeners, setTimeout) is not unit-tested here; that class of test would require jsdom and vitest fake timers, which is out of scope for now.

---

## 7. What this does NOT do

- No settings UI to change the timeout per role (read-only display only, for now).
- No server-side attempt counter for unlock failures.
- No lock state sync across browser tabs (sessionStorage is per-tab by design).
- No dependency on new npm packages.
