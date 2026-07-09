"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { useSession } from "@/hooks/useSession";

function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed");

      if (forced) {
        router.push("/");
        router.refresh();
        return;
      }

      setMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-6"
    >
      <label className="block text-sm font-medium text-slate-700">
        {forced ? "Current password (the one you signed in with)" : "Current password"}
        <input
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        New password
        <input
          type="password"
          name="new_password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Confirm new password
        <input
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <p className="text-xs text-slate-500">At least 8 characters.</p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : forced ? "Set password & continue" : "Change password"}
      </button>
    </form>
  );
}

export default function ChangePasswordPage() {
  const { session, loading } = useSession();
  const forced = Boolean(session?.mustChangePassword);

  if (loading) return null;

  if (forced) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-4">
        <div className="w-full max-w-md">
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">Welcome!</p>
            <p className="mt-1 text-sm text-amber-800">
              You&apos;re signing in with a shared default password. Please set your
              own password before continuing.
            </p>
          </div>
          <ChangePasswordForm forced />
        </div>
      </div>
    );
  }

  return (
    <ConsoleShell
      title="Change password"
      subtitle="Update your own sign-in password"
      current="/account/change-password"
    >
      <ChangePasswordForm forced={false} />
    </ConsoleShell>
  );
}
