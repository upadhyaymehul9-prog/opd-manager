"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ConsoleShell } from "@/components/ConsoleShell";

type ReportData = {
  from: string;
  to: string;
  date: string | null;
  summary: {
    total_visits: number;
    completed: number;
    new_patients: number;
    medicines_dispensed_lines: number;
    procedures: number;
  };
  medicine_wise: {
    medicine_name: string;
    patients: number;
    total_qty: number;
  }[];
  doctor_wise: {
    doctor_id: string;
    doctor_name: string;
    total: number;
    completed: number;
  }[];
  procedures: { procedure_type: string; count: number }[];
};

const PROCEDURE_LABELS: Record<string, string> = {
  iv_drip: "IV drip",
  dressing: "Dressing",
  nebulisation: "Nebulisation",
  injection: "Injection",
  other: "Other",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryRange = useMemo(() => {
    if (fromDate <= toDate) return { from: fromDate, to: toDate };
    return { from: toDate, to: fromDate };
  }, [fromDate, toDate]);

  const rangeLabel = useMemo(() => {
    if (queryRange.from === queryRange.to) {
      return format(new Date(queryRange.from), "d MMM yyyy");
    }
    return `${format(new Date(queryRange.from), "d MMM yyyy")} – ${format(new Date(queryRange.to), "d MMM yyyy")}`;
  }, [queryRange]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: queryRange.from,
      to: queryRange.to,
    });
    fetch(`/api/reports?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then(setData)
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [queryRange]);

  function setPreset(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
  }

  return (
    <ConsoleShell
      title="Clinic reports"
      subtitle="Medicine-wise, doctor-wise, and daily totals"
      current="/reports"
    >
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">From</span>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <div className="flex flex-wrap gap-2 pb-0.5">
          <button
            type="button"
            onClick={() => {
              const t = todayStr();
              setPreset(t, t);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const t = todayStr();
              setPreset(subDays(new Date(), 6).toISOString().slice(0, 10), t);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              setPreset(
                start.toISOString().slice(0, 10),
                now.toISOString().slice(0, 10),
              );
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            This month
          </button>
        </div>
        <p className="pb-1 text-sm text-slate-600">
          Showing: <strong>{rangeLabel}</strong>
        </p>
      </div>

      {loading && <p className="text-slate-600">Loading reports…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {data && (
        <div className="space-y-8">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Total visits", data.summary.total_visits],
              ["Completed", data.summary.completed],
              ["New patients", data.summary.new_patients],
              ["Medicines dispensed", data.summary.medicines_dispensed_lines],
              ["Procedures", data.summary.procedures],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center"
              >
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-slate-600">{label}</p>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Medicine-wise (dispensed)</h2>
            <p className="text-xs text-slate-500">
              How many patients received each medicine in this period
            </p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="pb-2">Medicine</th>
                  <th className="pb-2">Patients</th>
                  <th className="pb-2">Total qty</th>
                </tr>
              </thead>
              <tbody>
                {data.medicine_wise.map((row) => (
                  <tr key={row.medicine_name} className="border-b border-slate-100">
                    <td className="py-2">{row.medicine_name}</td>
                    <td className="py-2">{row.patients}</td>
                    <td className="py-2">{row.total_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.medicine_wise.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                No dispensed medicines in this period.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Doctor-wise</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="pb-2">Doctor</th>
                  <th className="pb-2">Patients seen</th>
                  <th className="pb-2">Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.doctor_wise.map((row) => (
                  <tr key={row.doctor_id} className="border-b border-slate-100">
                    <td className="py-2">{row.doctor_name}</td>
                    <td className="py-2">{row.total}</td>
                    <td className="py-2">{row.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {data.procedures.length > 0 && (
            <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <h2 className="font-semibold">Procedures</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {data.procedures.map((p) => (
                  <li key={p.procedure_type}>
                    {PROCEDURE_LABELS[p.procedure_type] ?? p.procedure_type}:{" "}
                    <strong>{p.count}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </ConsoleShell>
  );
}
