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
