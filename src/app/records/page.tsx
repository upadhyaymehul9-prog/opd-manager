"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { StatusBadge } from "@/components/PatientCard";
import type { PharmacyBillView } from "@/lib/billing-types";
import type { Prescription } from "@/lib/prescription-types";
import type { PatientVisit } from "@/lib/types";

type RecordRow = {
  visit: PatientVisit;
  prescription: Prescription | null;
  bill: PharmacyBillView | null;
  summary: {
    medicine_count: number;
    dispensed_count: number;
    has_bill: boolean;
    bill_total: number | null;
  };
};

export default function RecordsPage() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, completed: 0 });

  useEffect(() => {
    fetch("/api/records")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setRows(data.rows ?? []);
        setStats({ total: data.total ?? 0, completed: data.completed ?? 0 });
      })
      .catch(() => setError("Could not load records"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConsoleShell
      title="Patient records"
      subtitle="Today's visits — prescriptions, dispense, and pharmacy bills"
      current="/records"
    >
      <p className="mb-4 text-sm text-slate-600">
        {stats.total} visit(s) today · {stats.completed} completed · open any row
        for full detail, print, or PDF
      </p>

      {loading && <p className="text-slate-600">Loading records…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Medicines</th>
              <th className="px-4 py-3">Dispensed</th>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Record</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.visit.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-bold">#{row.visit.token_number}</td>
                <td className="px-4 py-3">{row.visit.patient_name}</td>
                <td className="px-4 py-3">{row.visit.doctors?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.visit.status} />
                </td>
                <td className="px-4 py-3">{row.summary.medicine_count}</td>
                <td className="px-4 py-3">{row.summary.dispensed_count}</td>
                <td className="px-4 py-3">
                  {row.summary.has_bill
                    ? `₹${row.summary.bill_total?.toFixed(2)}`
                    : row.visit.status === "completed"
                      ? "Missing"
                      : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {format(new Date(row.visit.registered_at), "h:mm a")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/records/${row.visit.id}`}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <p className="p-8 text-center text-slate-500">No visits today yet</p>
        )}
      </div>
    </ConsoleShell>
  );
}
