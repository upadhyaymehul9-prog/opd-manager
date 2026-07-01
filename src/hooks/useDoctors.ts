"use client";

import { useCallback, useEffect, useState } from "react";
import type { Doctor } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

export function useDoctors() {
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
    const interval = setInterval(fetchDoctors, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDoctors]);

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
