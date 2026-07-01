"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth-types";

type SessionInfo = {
  username: string;
  role: UserRole;
  displayName: string | null;
  navPaths: string[];
};

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data))
      .finally(() => setLoading(false));
  }, []);

  return { session, loading };
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}
