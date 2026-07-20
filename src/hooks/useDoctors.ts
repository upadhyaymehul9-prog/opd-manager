"use client";

import { useCallback, useEffect, useState } from "react";
import type { Doctor } from "@/lib/types";

/** Doctor status rarely changes — 3s polling was hammering the API/DB. */
const POLL_INTERVAL_MS = 30_000;

export function useDoctors(options?: { pollMs?: number | false }) {
  const pollMs = options?.pollMs ?? POLL_INTERVAL_MS;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/doctors");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load doctors");
      }
      const data = await res.json();
      setDoctors(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    if (pollMs === false) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(fetchDoctors, pollMs);
    };
    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchDoctors();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchDoctors, pollMs]);

  return { doctors, loading, error, refresh: fetchDoctors };
}

export async function updateDoctorStatus(
  id: string,
  opd_status: Doctor["opd_status"],
) {
  const res = await fetch(`/api/doctors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opd_status }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Update failed");
  }
  return res.json() as Promise<Doctor>;
}
