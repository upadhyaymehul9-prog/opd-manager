"use client";

import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";

type ReportData = {
  date: string;
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

export default function ReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <ConsoleShell
      title="Clinic reports"
      subtitle="Medicine-wise, doctor-wise, and daily totals"
      current="/reports"
    >
      <label className="mb-6 inline-flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-700">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </label>

      {loading && <p className="text-slate-600">Loading reports…</p>}

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
              How many patients received each medicine today
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
              <p className="mt-2 text-sm text-slate-500">No dispensed medicines on this date.</p>
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
