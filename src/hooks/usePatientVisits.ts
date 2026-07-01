"use client";

import { useCallback, useEffect, useState } from "react";
import type { PatientVisit } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

export function usePatientVisits(activeOnly = false) {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/patients${activeOnly ? "?active=true" : ""}`,
      );
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
  }, [activeOnly]);

  useEffect(() => {
    fetchVisits();
    const interval = setInterval(fetchVisits, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchVisits]);

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
