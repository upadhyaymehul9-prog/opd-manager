"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { PrintActions } from "@/components/PrintActions";
import {
  STOCK_AUDIT_DEPARTMENTS,
  type StockAuditView,
} from "@/lib/stock-audit";

type CountLine = {
  medicine_id: string;
  medicine_name: string;
  system_qty: number;
  physical_qty: string;
  notes: string;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function diffLabel(diff: number) {
  if (diff === 0) return "Match";
  if (diff < 0) return `Short ${Math.abs(diff)}`;
  return `Excess +${diff}`;
}

function diffClass(diff: number) {
  if (diff === 0) return "text-green-700";
  if (diff < 0) return "text-red-700";
  return "text-amber-700";
}

export default function StockAuditPage() {
  const [auditDate, setAuditDate] = useState(todayStr);
  const [department, setDepartment] = useState("pharmacy");
  const [lines, setLines] = useState<CountLine[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAudit, setSavedAudit] = useState<StockAuditView | null>(null);
  const [pastAudits, setPastAudits] = useState<StockAuditView[]>([]);
  const [printSheetMode, setPrintSheetMode] = useState(false);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stock/audit?snapshot=true");
      if (!res.ok) throw new Error("Could not load stock");
      const data = await res.json();
      setLines(
        (data.lines as Omit<CountLine, "physical_qty" | "notes">[]).map((row) => ({
          ...row,
          physical_qty: "",
          notes: "",
        })),
      );
      setSavedAudit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPast = useCallback(async () => {
    const res = await fetch("/api/stock/audit");
    if (res.ok) setPastAudits(await res.json());
  }, []);

  useEffect(() => {
    if (department === "pharmacy") {
      loadSnapshot();
    } else {
      setLines([]);
      setLoading(false);
    }
    loadPast();
  }, [department, loadSnapshot, loadPast]);

  const enteredLines = useMemo(
    () =>
      lines.filter(
        (line) =>
          line.physical_qty.trim() !== "" && !Number.isNaN(Number(line.physical_qty)),
      ),
    [lines],
  );

  const previewSummary = useMemo(() => {
    let matched = 0;
    let short_qty = 0;
    let excess_qty = 0;
    let short_items = 0;
    let excess_items = 0;

    for (const line of enteredLines) {
      const physical = Number(line.physical_qty);
      const diff = physical - line.system_qty;
      if (diff === 0) matched += 1;
      else if (diff < 0) {
        short_items += 1;
        short_qty += Math.abs(diff);
      } else {
        excess_items += 1;
        excess_qty += diff;
      }
    }

    return {
      medicines_counted: enteredLines.length,
      matched,
      short_items,
      short_qty,
      excess_items,
      excess_qty,
    };
  }, [enteredLines]);

  const displaySummary = savedAudit?.summary ?? previewSummary;
  const showReport = Boolean(savedAudit) || enteredLines.length > 0;

  async function saveAudit() {
    if (enteredLines.length === 0) {
      setError("Enter physical count for at least one medicine");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/stock/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audit_date: auditDate,
          department,
          notes,
          lines: enteredLines.map((line) => ({
            medicine_id: line.medicine_id,
            medicine_name: line.medicine_name,
            system_qty: line.system_qty,
            physical_qty: Number(line.physical_qty),
            notes: line.notes.trim() || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSavedAudit(data);
      setPrintSheetMode(false);
      await loadPast();
      setTimeout(() => window.print(), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function printCountSheet() {
    setPrintSheetMode(true);
    setSavedAudit(null);
    setTimeout(() => window.print(), 100);
  }

  function printReport() {
    setPrintSheetMode(false);
    setTimeout(() => window.print(), 100);
  }

  return (
    <ConsoleShell
      title="Month-end stock audit"
      subtitle="Print system quantities, enter physical count, generate variance report (PDF)"
      current="/stock"
    >
      <div className="stock-audit-print">
        <div className="mb-4 hidden border-b border-slate-300 pb-3 print:block">
          <h1 className="text-xl font-bold text-black">
            {printSheetMode
              ? "Stock count sheet — Pharmacy"
              : "Stock audit variance report — Pharmacy"}
          </h1>
          <p className="text-sm text-black">
            Audit date: {format(new Date(auditDate), "d MMM yyyy")}
          </p>
          <p className="text-xs text-slate-600">
            Printed {format(new Date(), "d MMM yyyy, h:mm a")}
          </p>
        </div>

        <div className="mb-4 print:hidden">
          <Link href="/stock" className="text-sm text-amber-700 hover:underline">
            ← Back to stock
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Audit date</span>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Department</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1.5"
            >
              {STOCK_AUDIT_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id !== "pharmacy"}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={printCountSheet}
              disabled={lines.length === 0}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Print count sheet
            </button>
            {showReport && (
              <button
                type="button"
                onClick={printReport}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Print variance report
              </button>
            )}
            <PrintActions label="Save as PDF" pdfLabel="Save as PDF" />
          </div>
        </div>

        {department !== "pharmacy" && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 print:hidden">
            Lab and radiology stock tracking is coming soon. Pharmacy audit is ready now.
          </p>
        )}

        {loading && <p className="text-slate-600 print:hidden">Loading system stock…</p>}
        {error && <p className="text-red-600 print:hidden">{error}</p>}

        {!loading && department === "pharmacy" && (
          <>
            <p className="mb-4 text-sm text-slate-600 print:hidden">
              Example: system shows Paracetamol <strong>850</strong>, you count{" "}
              <strong>840</strong> → difference <strong>Short 10</strong>.
            </p>

            {showReport && !printSheetMode && (
              <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  ["Medicines counted", displaySummary.medicines_counted],
                  ["Matched", displaySummary.matched],
                  ["Short (items)", displaySummary.short_items],
                  ["Short (total qty)", displaySummary.short_qty],
                  ["Excess (total qty)", displaySummary.excess_qty],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-center print:border-black"
                  >
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-xs text-slate-600">{label}</p>
                  </div>
                ))}
              </section>
            )}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white print:border-black">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-slate-200 bg-amber-50 print:bg-white">
                  <tr className="text-left text-slate-700">
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">System qty</th>
                    {!printSheetMode && (
                      <>
                        <th className="px-3 py-2 print:hidden">Physical count</th>
                        <th className="px-3 py-2">Difference</th>
                      </>
                    )}
                    {printSheetMode && (
                      <th className="hidden px-3 py-2 print:table-cell">Physical count</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {savedAudit && !printSheetMode
                    ? savedAudit.lines.map((line) => (
                        <tr key={line.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium">{line.medicine_name}</td>
                          <td className="px-3 py-2 font-semibold">{line.system_qty}</td>
                          <td className="px-3 py-2 print:hidden">{line.physical_qty}</td>
                          <td className={`px-3 py-2 font-semibold ${diffClass(line.difference)}`}>
                            {diffLabel(line.difference)}
                          </td>
                        </tr>
                      ))
                    : lines.map((line) => {
                        const physical = line.physical_qty.trim();
                        const diff =
                          physical !== "" && !Number.isNaN(Number(physical))
                            ? Number(physical) - line.system_qty
                            : null;

                        return (
                          <tr key={line.medicine_id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium">{line.medicine_name}</td>
                            <td className="px-3 py-2 font-semibold">{line.system_qty}</td>
                            {!printSheetMode && (
                              <>
                                <td className="px-3 py-2 print:hidden">
                                  <input
                                    type="number"
                                    min={0}
                                    value={line.physical_qty}
                                    onChange={(e) =>
                                      setLines((prev) =>
                                        prev.map((row) =>
                                          row.medicine_id === line.medicine_id
                                            ? { ...row, physical_qty: e.target.value }
                                            : row,
                                        ),
                                      )
                                    }
                                    placeholder="Count"
                                    className="w-24 rounded border border-slate-300 px-2 py-1"
                                  />
                                </td>
                                <td
                                  className={`px-3 py-2 font-semibold ${
                                    diff == null ? "" : diffClass(diff)
                                  }`}
                                >
                                  {diff == null ? "—" : diffLabel(diff)}
                                </td>
                              </>
                            )}
                            {printSheetMode && (
                              <td className="hidden border-b border-slate-300 px-3 py-5 print:table-cell" />
                            )}
                          </tr>
                        );
                      })}
                </tbody>
                {showReport && !printSheetMode && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                      <td className="px-3 py-2">Total variance</td>
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 print:hidden" />
                      <td className="px-3 py-2">
                        Short {displaySummary.short_qty} · Excess {displaySummary.excess_qty}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </section>

            <div className="mt-4 space-y-3 print:hidden">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full max-w-xl rounded border border-slate-300 px-3 py-2"
                  placeholder="e.g. Month-end physical verification"
                />
              </label>
              <button
                type="button"
                disabled={saving || enteredLines.length === 0}
                onClick={saveAudit}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : `Save audit & print report (${enteredLines.length} medicines)`}
              </button>
            </div>
          </>
        )}

        {pastAudits.length > 0 && (
          <section className="mt-10 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
            <h2 className="font-semibold">Past audits</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {pastAudits.map((audit) => (
                <li
                  key={audit.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 px-3 py-2"
                >
                  <span>
                    {format(new Date(audit.audit_date), "d MMM yyyy")} · {audit.department}{" "}
                    · {audit.summary.medicines_counted} medicines · short{" "}
                    {audit.summary.short_qty} / excess {audit.summary.excess_qty}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(`/api/stock/audit/${audit.id}`);
                      if (res.ok) {
                        setSavedAudit(await res.json());
                        setPrintSheetMode(false);
                        setTimeout(() => window.print(), 200);
                      }
                    }}
                    className="text-amber-700 hover:underline"
                  >
                    Re-print PDF
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </ConsoleShell>
  );
}
