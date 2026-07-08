"use client";

import { useCallback, useEffect, useState } from "react";
import type { PatientVisit } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

export function usePatientVisits(options?: {
  activeOnly?: boolean;
  todayOnly?: boolean;
  from?: string;
  to?: string;
  /** Poll interval in ms. Default 3000. Set false to disable polling. */
  pollMs?: number | false;
}) {
  const activeOnly = options?.activeOnly ?? false;
  const todayOnly = options?.todayOnly ?? false;
  const from = options?.from;
  const to = options?.to;
  const pollMs = options?.pollMs ?? POLL_INTERVAL_MS;
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeOnly) params.set("active", "true");
      if (todayOnly) params.set("today", "true");
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const res = await fetch(`/api/patients${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load patients");
      }
      const data = await res.json();
      setVisits(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeOnly, todayOnly, from, to]);

  useEffect(() => {
    fetchVisits();
    if (pollMs === false) return;
    const interval = setInterval(fetchVisits, pollMs);
    return () => clearInterval(interval);
  }, [fetchVisits, pollMs]);

  return { visits, loading, error, refresh: fetchVisits };
}

export async function updatePatient(
  id: string,
  updates: Record<string, unknown>,
) {
  const res = await fetch(`/api/patients/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Update failed");
  }
  return res.json();
}

export async function deletePatient(id: string) {
  const res = await fetch(`/api/patients/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Delete failed");
  }
  return res.json();
}
