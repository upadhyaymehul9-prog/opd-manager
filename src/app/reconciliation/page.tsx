"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { PrintActions } from "@/components/PrintActions";
import { todayStr } from "@/lib/date-range";
import type { ReconciliationReport } from "@/lib/reconciliation";

export default function ReconciliationPage() {
  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reconciliation?date=${date}`);
      if (!res.ok) throw new Error("Failed to load reconciliation");
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ConsoleShell
      title="Day-end reconciliation"
      subtitle="Cash · UPI · Card totals by reception and pharmacy"
      current="/reconciliation"
    >
      <div className="mb-6 flex flex-wrap items-end gap-4 print:hidden">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Load
        </button>
        {report && <PrintActions label="Print report" pdfLabel="Save as PDF" />}
      </div>

      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {report && (
        <div className="space-y-6">
          <section className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6">
            <h2 className="text-lg font-bold text-indigo-900">
              Grand total — {report.date}
            </h2>
            <p className="mt-2 text-4xl font-black text-indigo-950">
              ₹{report.grand_total.toLocaleString("en-IN")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {report.combined.map((row) => (
                <div
                  key={row.mode}
                  className="rounded-lg border border-indigo-200 bg-white p-4"
                >
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {row.mode}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    ₹{row.amount.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-emerald-900">
                Reception (consultation)
              </h3>
              <p className="text-sm text-slate-600">
                {report.reception.total.bills} bills · ₹
                {report.reception.total.amount.toLocaleString("en-IN")}
              </p>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2">Mode</th>
                    <th className="pb-2">Bills</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.reception.by_mode.map((r) => (
                    <tr key={r.mode} className="border-b border-slate-100">
                      <td className="py-2 uppercase">{r.mode}</td>
                      <td className="py-2">{r.bills}</td>
                      <td className="py-2 text-right">₹{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-teal-900">Pharmacy</h3>
              <p className="text-sm text-slate-600">
                {report.pharmacy.total.bills} bills · ₹
                {report.pharmacy.total.amount.toLocaleString("en-IN")} · GST ₹
                {report.pharmacy.total.gst.toLocaleString("en-IN")}
              </p>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2">Mode</th>
                    <th className="pb-2">Bills</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.pharmacy.by_mode.map((r) => (
                    <tr key={r.mode} className="border-b border-slate-100">
                      <td className="py-2 uppercase">{r.mode}</td>
                      <td className="py-2">{r.bills}</td>
                      <td className="py-2 text-right">₹{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer font-medium text-slate-800">
              Bill-wise detail ({report.reception.lines.length + report.pharmacy.lines.length}{" "}
              rows)
            </summary>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-emerald-800">Reception</h4>
                <ul className="mt-2 max-h-60 space-y-1 overflow-auto text-xs">
                  {report.reception.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b py-1">
                      <span>
                        #{l.token_number} {l.patient_name}{" "}
                        <span className="uppercase text-slate-500">{l.payment_mode}</span>
                      </span>
                      <span>₹{l.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-teal-800">Pharmacy</h4>
                <ul className="mt-2 max-h-60 space-y-1 overflow-auto text-xs">
                  {report.pharmacy.lines.map((l) => (
                    <li key={l.bill_no} className="flex justify-between gap-2 border-b py-1">
                      <span>
                        {l.bill_no} #{l.token_number}{" "}
                        <span className="uppercase text-slate-500">{l.payment_mode}</span>
                      </span>
                      <span>₹{l.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>

          <p className="text-xs text-slate-500 print:hidden">
            Printed {format(new Date(), "d MMM yyyy, h:mm a")} — match physical cash drawer
            against Cash total.
          </p>
        </div>
      )}
    </ConsoleShell>
  );
}
