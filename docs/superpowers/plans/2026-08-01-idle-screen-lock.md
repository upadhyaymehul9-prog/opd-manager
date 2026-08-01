# Idle Screen-Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auto screen-lock overlay to every authenticated console route that triggers after 5 minutes of inactivity, survives a page refresh via sessionStorage, and requires the signed-in user's password to unlock — satisfying NABH DOM.3c and logging to the audit trail for DOM.3a.

**Architecture:** A single config constant drives the timeout. A `useIdleLock` hook tracks DOM activity events (debounced), stores lock state in `sessionStorage`, and is wired into `ConsoleShell`. A `LockScreen` overlay calls two new thin API routes (`/api/auth/screen-lock` to log the event, `/api/auth/screen-unlock` to verify the password via the existing `verifyPassword` function). After 5 failed unlock attempts the hook calls the existing `logout()` which redirects to `/login`.

**Tech Stack:** Next.js App Router, React hooks, Tailwind CSS, bcryptjs (via existing `verifyPassword`), Prisma (existing), Vitest (existing test suite)

## Global Constraints

- No new npm dependencies — use only what is already in the project.
- Tests run with `npm test` (Vitest, node environment). All new tests go in `src/lib/__tests__/`.
- Tailwind only — no inline `style=` props.
- All client components must have `"use client"` as the first line.
- Follow the existing `logAudit` pattern for all audit events.
- The `/tv` route is **not** affected — it does not use `ConsoleShell`.
- `verifyPassword` from `src/lib/auth.ts` is the only password-checking function; do not call bcrypt directly.
- `sessionStorage` key for lock state: `opd_screen_locked` (value `"1"` when locked).
- Debounce delay for activity events: 300 ms.
- Max unlock attempts before forced logout: 5 (same as `MAX_FAILED_LOGIN_ATTEMPTS` in `auth.ts`).

---

## File Map

| Status | Path | Role |
|--------|------|------|
| Create | `src/lib/idle-lock-config.ts` | Named constants: timeout, session key, max attempts |
| Create | `src/lib/__tests__/idle-lock.test.ts` | Unit tests for the constants |
| Modify | `src/lib/audit.ts` | Add `SCREEN_LOCK`, `SCREEN_UNLOCK`, `SCREEN_UNLOCK_FAILED` to `AUDIT_ACTIONS` |
| Modify | `src/lib/auth.ts` | Allow `/api/auth/screen-lock` and `/api/auth/screen-unlock` in `canAccessApi` |
| Modify | `src/lib/__tests__/auth-access.test.ts` | Tests for the two new `canAccessApi` entries |
| Create | `src/app/api/auth/screen-lock/route.ts` | POST — logs lock event |
| Create | `src/app/api/auth/screen-unlock/route.ts` | POST — verifies password, logs unlock/failure |
| Create | `src/hooks/useIdleLock.ts` | Activity tracking hook with sessionStorage persistence |
| Create | `src/components/LockScreen.tsx` | Full-viewport lock overlay component |
| Modify | `src/components/ConsoleShell.tsx` | Wire hook + render overlay |
| Modify | `src/app/account/change-password/page.tsx` | Read-only idle-timeout info block |

---

### Task 1: Config constants and unit tests

**Files:**
- Create: `src/lib/idle-lock-config.ts`
- Create: `src/lib/__tests__/idle-lock.test.ts`

**Interfaces:**
- Produces:
  - `IDLE_LOCK_TIMEOUT_MS: number` — milliseconds before lock triggers
  - `IDLE_LOCK_TIMEOUT_MINUTES: number` — same value in minutes, for display
  - `SCREEN_LOCK_SESSION_KEY: string` — sessionStorage key
  - `LOCK_SCREEN_MAX_ATTEMPTS: number` — failed-unlock threshold

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/idle-lock.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MAX_FAILED_LOGIN_ATTEMPTS } from "@/lib/auth";
import {
  IDLE_LOCK_TIMEOUT_MINUTES,
  IDLE_LOCK_TIMEOUT_MS,
  LOCK_SCREEN_MAX_ATTEMPTS,
  SCREEN_LOCK_SESSION_KEY,
} from "@/lib/idle-lock-config";

describe("idle-lock constants", () => {
  it("IDLE_LOCK_TIMEOUT_MS is exactly 5 minutes (300 000 ms)", () => {
    expect(IDLE_LOCK_TIMEOUT_MS).toBe(300_000);
  });

  it("IDLE_LOCK_TIMEOUT_MINUTES derives correctly from the ms constant", () => {
    expect(IDLE_LOCK_TIMEOUT_MINUTES).toBe(5);
  });

  it("SCREEN_LOCK_SESSION_KEY is the expected storage key string", () => {
    expect(SCREEN_LOCK_SESSION_KEY).toBe("opd_screen_locked");
  });

  it("LOCK_SCREEN_MAX_ATTEMPTS matches MAX_FAILED_LOGIN_ATTEMPTS — intentionally aligned", () => {
    expect(LOCK_SCREEN_MAX_ATTEMPTS).toBe(MAX_FAILED_LOGIN_ATTEMPTS);
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```
npm test -- idle-lock
```

Expected: 4 failures, all `Cannot find module '@/lib/idle-lock-config'`.

- [ ] **Step 3: Create the config file**

Create `src/lib/idle-lock-config.ts`:

```ts
export const IDLE_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
export const IDLE_LOCK_TIMEOUT_MINUTES = IDLE_LOCK_TIMEOUT_MS / 60_000;
export const SCREEN_LOCK_SESSION_KEY = "opd_screen_locked";
export const LOCK_SCREEN_MAX_ATTEMPTS = 5;
```

- [ ] **Step 4: Run tests — expect all 4 pass**

```
npm test -- idle-lock
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```
git add src/lib/idle-lock-config.ts src/lib/__tests__/idle-lock.test.ts
git commit -m "feat: add idle-lock config constants and tests (NABH DOM.3c)"
```

---

### Task 2: AUDIT_ACTIONS additions

**Files:**
- Modify: `src/lib/audit.ts` (around line 109 — the `AUDIT_ACTIONS` const)

**Interfaces:**
- Produces: `AUDIT_ACTIONS.SCREEN_LOCK`, `AUDIT_ACTIONS.SCREEN_UNLOCK`, `AUDIT_ACTIONS.SCREEN_UNLOCK_FAILED`

No new tests needed — `AUDIT_ACTIONS` is a plain object constant; correctness is verified when the API routes that use it are tested manually in Task 6/7.

- [ ] **Step 1: Add the three new actions to `AUDIT_ACTIONS` in `src/lib/audit.ts`**

Find the `AUDIT_ACTIONS` object (currently ends with `ROI_RELEASE_CREATE`). Add after that last entry:

```ts
  SCREEN_LOCK: "screen_lock",
  SCREEN_UNLOCK: "screen_unlock",
  SCREEN_UNLOCK_FAILED: "screen_unlock_failed",
```

The full object after the edit should end with:

```ts
  ROI_RELEASE_CREATE: "roi_release_create",
  SCREEN_LOCK: "screen_lock",
  SCREEN_UNLOCK: "screen_unlock",
  SCREEN_UNLOCK_FAILED: "screen_unlock_failed",
} as const;
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

```
npm test
```

Expected: all existing tests still pass.

- [ ] **Step 3: Commit**

```
git add src/lib/audit.ts
git commit -m "feat: add SCREEN_LOCK/UNLOCK audit actions"
```

---

### Task 3: Allow new routes in `canAccessApi` + tests

**Files:**
- Modify: `src/lib/auth.ts` (inside `canAccessApi`, near the top alongside other `/api/auth/*` entries)
- Modify: `src/lib/__tests__/auth-access.test.ts` (add new describe block at the end)

**Interfaces:**
- Consumes: `canAccessApi` from `src/lib/auth.ts` (already exported)
- Produces: `/api/auth/screen-lock` and `/api/auth/screen-unlock` return `true` for all valid sessions

- [ ] **Step 1: Write the failing tests**

Open `src/lib/__tests__/auth-access.test.ts`. The file already imports `canAccessApi`, `USER_ROLES`, `sessionFor`. Append this describe block at the end of the file:

```ts
describe("canAccessApi — screen-lock routes", () => {
  it("allows every role to POST to /api/auth/screen-lock", () => {
    for (const role of USER_ROLES) {
      expect(
        canAccessApi(sessionFor(role), "/api/auth/screen-lock", "POST"),
      ).toBe(true);
    }
  });

  it("allows every role to POST to /api/auth/screen-unlock", () => {
    for (const role of USER_ROLES) {
      expect(
        canAccessApi(sessionFor(role), "/api/auth/screen-unlock", "POST"),
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect 2 new failures**

```
npm test -- auth-access
```

Expected: the two new `it` blocks fail because `canAccessApi` returns `false` for the unknown routes (default-deny).

- [ ] **Step 3: Add the allow rule to `canAccessApi` in `src/lib/auth.ts`**

Find the block near the top of `canAccessApi` that allows `/api/auth/logout`, `/api/auth/me`, and `/api/auth/change-password`. Add immediately after it:

```ts
  if (
    pathname === "/api/auth/screen-lock" ||
    pathname === "/api/auth/screen-unlock"
  ) {
    return true;
  }
```

- [ ] **Step 4: Run tests — expect all pass**

```
npm test -- auth-access
```

Expected: all tests in the file pass, including the two new ones.

- [ ] **Step 5: Commit**

```
git add src/lib/auth.ts src/lib/__tests__/auth-access.test.ts
git commit -m "feat: allow screen-lock API routes in canAccessApi"
```

---

### Task 4: `POST /api/auth/screen-lock` route

**Files:**
- Create: `src/app/api/auth/screen-lock/route.ts`

**Interfaces:**
- Consumes:
  - `getSessionFromCookies(): Promise<SessionPayload | null>` from `@/lib/audit`
  - `logAudit(input)` from `@/lib/audit`
  - `AUDIT_ACTIONS.SCREEN_LOCK` from `@/lib/audit`
- Produces: `POST /api/auth/screen-lock` → `{ ok: true }` (200) or `{ error: "Unauthorized" }` (401)

No unit test — Next.js API route handlers require request mocking that is outside the established test style for this codebase. Manual verification in Task 9 (ConsoleShell wiring).

- [ ] **Step 1: Create the route directory and file**

Create `src/app/api/auth/screen-lock/route.ts`:

```ts
import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await logAudit({
    action: AUDIT_ACTIONS.SCREEN_LOCK,
    entity_type: "session",
    summary: `${session.displayName ?? session.username} screen locked (${session.role})`,
    session,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Run the full test suite — no regressions**

```
npm test
```

Expected: all tests pass (this file has no unit test; TypeScript compilation errors would show up here if the imports are wrong).

- [ ] **Step 3: Commit**

```
git add src/app/api/auth/screen-lock/route.ts
git commit -m "feat: add /api/auth/screen-lock route"
```

---

### Task 5: `POST /api/auth/screen-unlock` route

**Files:**
- Create: `src/app/api/auth/screen-unlock/route.ts`

**Interfaces:**
- Consumes:
  - `verifyPassword(password: string, hash: string): Promise<boolean>` from `@/lib/auth`
  - `getSessionFromCookies()`, `logAudit()`, `AUDIT_ACTIONS` from `@/lib/audit`
  - `prisma.user.findUnique` from `@/lib/prisma`
- Produces: `POST /api/auth/screen-unlock` with body `{ password: string }` → `{ ok: true }` (200) or `{ error: string }` (400/401)

- [ ] **Step 1: Create the route file**

Create `src/app/api/auth/screen-unlock/route.ts`:

```ts
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const password = String(body.password ?? "");
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);

  if (ok) {
    await logAudit({
      action: AUDIT_ACTIONS.SCREEN_UNLOCK,
      entity_type: "session",
      summary: `${session.displayName ?? session.username} unlocked screen (${session.role})`,
      session,
    });
    return NextResponse.json({ ok: true });
  }

  await logAudit({
    action: AUDIT_ACTIONS.SCREEN_UNLOCK_FAILED,
    entity_type: "session",
    summary: `Failed screen-unlock attempt for ${session.displayName ?? session.username} (${session.role})`,
    session,
  });
  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
```

- [ ] **Step 2: Run the full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/app/api/auth/screen-unlock/route.ts
git commit -m "feat: add /api/auth/screen-unlock route"
```

---

### Task 6: `useIdleLock` hook

**Files:**
- Create: `src/hooks/useIdleLock.ts`

**Interfaces:**
- Consumes:
  - `IDLE_LOCK_TIMEOUT_MS` from `@/lib/idle-lock-config`
  - `SCREEN_LOCK_SESSION_KEY` from `@/lib/idle-lock-config`
- Produces:
  - `useIdleLock(enabled: boolean): { locked: boolean; unlock: () => void }`
  - `locked` — true when the session is locked (either timer fired or sessionStorage flag was set)
  - `unlock()` — clears sessionStorage flag and resets locked to false; call after successful password verify

**Behaviour notes:**
- `useState(false)` always as initial value (avoids SSR/hydration mismatch). A `useEffect` reads sessionStorage on mount (or whenever `enabled` becomes true) to restore lock state from a previous session/refresh.
- The idle timer only runs when `enabled` is true. Setting `enabled` to false (no session, publicMode) tears down listeners and timer immediately.
- When the timer fires, `lock()` is idempotent — calling it while already locked is harmless.
- Activity events on `window` are caught with `{ passive: true }` to avoid blocking scroll performance.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useIdleLock.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IDLE_LOCK_TIMEOUT_MS,
  SCREEN_LOCK_SESSION_KEY,
} from "@/lib/idle-lock-config";

export function useIdleLock(enabled: boolean) {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    sessionStorage.setItem(SCREEN_LOCK_SESSION_KEY, "1");
    setLocked(true);
  }, []);

  const unlock = useCallback(() => {
    sessionStorage.removeItem(SCREEN_LOCK_SESSION_KEY);
    setLocked(false);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(lock, IDLE_LOCK_TIMEOUT_MS);
  }, [lock]);

  // Restore lock state from sessionStorage whenever enabled becomes true
  // (covers page refreshes and initial mount after the session loads).
  useEffect(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(SCREEN_LOCK_SESSION_KEY) === "1") {
      setLocked(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    function handleActivity() {
      // Ignore activity while a debounce is already queued.
      if (debounceRef.current) return;
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        resetTimer();
      }, 300);
    }

    const events = ["mousemove", "keydown", "touchstart", "click"] as const;
    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, resetTimer]);

  return { locked, unlock };
}
```

- [ ] **Step 2: Run the full test suite — no regressions**

```
npm test
```

Expected: all tests pass. (The hook itself requires a DOM so it is not unit-tested; TypeScript errors would surface here.)

- [ ] **Step 3: Commit**

```
git add src/hooks/useIdleLock.ts
git commit -m "feat: add useIdleLock hook with sessionStorage persistence"
```

---

### Task 7: `LockScreen` overlay component

**Files:**
- Create: `src/components/LockScreen.tsx`

**Interfaces:**
- Consumes:
  - `logout` from `@/hooks/useSession`
  - `LOCK_SCREEN_MAX_ATTEMPTS` from `@/lib/idle-lock-config`
  - `POST /api/auth/screen-lock` (fire-and-forget on mount)
  - `POST /api/auth/screen-unlock` with body `{ password: string }`
- Produces:
  ```ts
  // Props type (inline — SessionInfo is not exported from useSession.ts)
  type LockScreenProps = {
    session: { username: string; displayName: string | null; role: string };
    onUnlock: () => void;
  };
  function LockScreen(props: LockScreenProps): JSX.Element
  ```

**Behaviour notes:**
- On mount: fires `POST /api/auth/screen-lock` (async, fire-and-forget — never blocks render).
- On mount: focuses the password input automatically.
- Failed attempt counter lives in local state. After `LOCK_SCREEN_MAX_ATTEMPTS` failures the component calls `logout()` (from `useSession`) which POSTs to `/api/auth/logout` and redirects to `/login`.
- The overlay sits at `z-[200]` — above the sidebar (`z-30`), mobile nav (`z-50`), and any modals the underlying page may have open.
- `onUnlock` is called on a 200 response from `/api/auth/screen-unlock`; it propagates to `ConsoleShell` which calls `unlock()` from the hook (clearing sessionStorage).

- [ ] **Step 1: Create the component**

Create `src/components/LockScreen.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "@/hooks/useSession";
import { LOCK_SCREEN_MAX_ATTEMPTS } from "@/lib/idle-lock-config";

type LockScreenSession = {
  username: string;
  displayName: string | null;
  role: string;
};

export function LockScreen({
  session,
  onUnlock,
}: {
  session: LockScreenSession;
  onUnlock: () => void;
}) {
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/screen-lock", { method: "POST" });
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/screen-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onUnlock();
        return;
      }

      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setPassword("");

      if (nextAttempts >= LOCK_SCREEN_MAX_ATTEMPTS) {
        await logout();
        return;
      }

      setError(
        `Incorrect password (${nextAttempts} of ${LOCK_SCREEN_MAX_ATTEMPTS} attempts)`,
      );
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = session.displayName || session.username;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            OPD Manager
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Session locked</h2>
          <p className="mt-3 text-sm text-slate-300">{displayName}</p>
          <p className="text-xs capitalize text-slate-500">{session.role}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Password</span>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Enter your password"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/components/LockScreen.tsx
git commit -m "feat: add LockScreen overlay component"
```

---

### Task 8: Wire `useIdleLock` into `ConsoleShell`

**Files:**
- Modify: `src/components/ConsoleShell.tsx`

**Interfaces:**
- Consumes:
  - `useIdleLock(enabled: boolean)` from `@/hooks/useIdleLock`
  - `LockScreen` from `@/components/LockScreen`
- `enabled` value passed to `useIdleLock`: `!publicMode && !!session`
  - `false` when `publicMode` is true (public-facing pages, no lock needed)
  - `false` when `session` is null (not yet loaded or not authenticated)
  - `true` for every authenticated console session

**Note:** `ConsoleShell` already has `"use client"` and calls `useSession()`. The `session` object returned by `useSession()` matches the `LockScreenSession` shape (`username`, `displayName`, `role`).

- [ ] **Step 1: Add imports to `ConsoleShell.tsx`**

At the top of `src/components/ConsoleShell.tsx`, add after the existing imports:

```ts
import { useIdleLock } from "@/hooks/useIdleLock";
import { LockScreen } from "@/components/LockScreen";
```

- [ ] **Step 2: Call the hook inside the `ConsoleShell` function**

In the body of `ConsoleShell` (after the existing `useSession()` and `useState` calls), add:

```ts
const { locked, unlock } = useIdleLock(!publicMode && !!session);
```

- [ ] **Step 3: Render the overlay**

In the `return` of the non-public branch (the `<div className="flex min-h-screen ...">` branch), add `<LockScreen>` as the **first child** of the outermost div, before the `<aside>` and mobile nav:

```tsx
return (
  <div className="flex min-h-screen bg-[var(--color-clinic-bg)]">
    {locked && session && (
      <LockScreen session={session} onUnlock={unlock} />
    )}
    {session && (
      <aside className="fixed inset-y-0 left-0 z-30 ...">
    {/* ... rest of existing JSX unchanged ... */}
  </div>
);
```

- [ ] **Step 4: Run the full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add src/components/ConsoleShell.tsx
git commit -m "feat: wire idle screen-lock into ConsoleShell"
```

---

### Task 9: Idle-timeout info note on account page

**Files:**
- Modify: `src/app/account/change-password/page.tsx`

**Interfaces:**
- Consumes: `IDLE_LOCK_TIMEOUT_MINUTES` from `@/lib/idle-lock-config`

**Note:** `IDLE_LOCK_TIMEOUT_MINUTES` is a plain number constant with no server-only imports, so importing it in a client component is safe.

- [ ] **Step 1: Add the import to `change-password/page.tsx`**

At the top of `src/app/account/change-password/page.tsx`, add:

```ts
import { IDLE_LOCK_TIMEOUT_MINUTES } from "@/lib/idle-lock-config";
```

- [ ] **Step 2: Add the info block after the `</form>` closing tag**

After `</form>` and before `</ConsoleShell>`:

```tsx
<div className="mt-6 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4">
  <p className="text-sm font-medium text-slate-700">Session security</p>
  <p className="mt-1 text-sm text-slate-500">
    Screen locks after {IDLE_LOCK_TIMEOUT_MINUTES} minutes of inactivity on all
    console roles.
  </p>
</div>
```

- [ ] **Step 3: Run the full test suite — no regressions**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```
git add src/app/account/change-password/page.tsx
git commit -m "feat: show idle-timeout note on account page (NABH DOM.3c)"
```

---

## Manual Verification Checklist

After all tasks are complete, verify the following in the running app (`npm run dev`):

- [ ] Sign in as any console role (e.g. reception). Wait 5 minutes idle (or temporarily set `IDLE_LOCK_TIMEOUT_MS = 10_000` in config for a 10-second test). Lock screen appears.
- [ ] Lock screen shows the correct user name and role.
- [ ] Entering the wrong password shows "Incorrect password (1 of 5 attempts)".
- [ ] After 5 wrong passwords, the app redirects to `/login`.
- [ ] Entering the correct password dismisses the overlay; the underlying page is intact with no state loss.
- [ ] While locked, refresh the page. The lock screen reappears immediately after the session loads (not after another 5-minute wait).
- [ ] Navigate to `/account/change-password` and confirm the "Screen locks after 5 minutes" info block is visible.
- [ ] Open the NABH audit log. Confirm `screen_lock` and `screen_unlock` (or `screen_unlock_failed`) events appear.
- [ ] Visit the `/tv` route. Confirm no lock screen ever appears there.
