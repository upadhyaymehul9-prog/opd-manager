"use client";

import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { computeDuration } from "@/lib/attendance";
import { todayStr } from "@/lib/date-range";

type AttendanceRecord = {
  id: string;
  username: string;
  role: string;
  display_name: string | null;
  clock_in: string;
  clock_out: string | null;
};

function formatIST(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttendancePage() {
  const [date, setDate] = useState(todayStr());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance/daily?date=${date}`)
      .then((r) => r.json())
      .then((data: { records: AttendanceRecord[] }) => {
        setRecords(data.records ?? []);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <ConsoleShell
      title="Attendance"
      subtitle="Daily staff clock-in / clock-out log (NABH HRM.1d)"
      current="/attendance"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance records for this date.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Name", "Role", "Clock In", "Clock Out", "Duration"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.display_name || r.username}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{r.role}</td>
                    <td className="px-4 py-3 text-slate-700">{formatIST(r.clock_in)}</td>
                    <td className="px-4 py-3">
                      {r.clock_out ? (
                        <span className="text-slate-700">{formatIST(r.clock_out)}</span>
                      ) : (
                        <span className="text-amber-500">— ⚠</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.clock_out
                        ? computeDuration(new Date(r.clock_in), new Date(r.clock_out))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
