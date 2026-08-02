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
