"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DateRangeBar } from "@/components/DateRangeBar";
import { StatusBadge } from "@/components/PatientCard";
import {
  EMR_DELINQUENT_HOURS,
  ISSUE_LABELS,
  ISSUE_STYLES,
  type DelinquencyIssue,
  type RecordCompletenessSummary,
} from "@/lib/record-completeness";
import { addDays, dateStrIST, todayStr } from "@/lib/date-range";

function SummaryCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warn" | "ok" | "danger";
}) {
  const tones = {
    default: "border-slate-200",
    warn: "border-amber-300 bg-amber-50/50",
    ok: "border-emerald-300 bg-emerald-50/50",
    danger: "border-red-300 bg-red-50/50",
  };
  return (
    <div className={`card px-4 py-4 text-center ${tones[tone]}`}>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function RecordCompletenessPage() {
  const [fromDate, setFromDate] = useState(() => dateStrIST(addDays(new Date(), -6)));
  const [toDate, setToDate] = useState(todayStr);
  const [filter, setFilter] = useState<DelinquencyIssue | "all">("all");
  const [report, setReport] = useState<RecordCompletenessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryRange = useMemo(() => {
    if (fromDate <= toDate) return { from: fromDate, to: toDate };
    return { from: toDate, to: fromDate };
  }, [fromDate, toDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from: queryRange.from,
        to: queryRange.to,
      });
      const res = await fetch(`/api/records/completeness?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load report");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [queryRange.from, queryRange.to]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems =
    report?.items.filter((item) =>
      filter === "all" ? true : item.issues.includes(filter),
    ) ?? [];

  return (
    <ConsoleShell
      title="Record completeness"
      subtitle="MRD delinquent-record tracking — EMR, MLC, and documentation gaps"
      current="/records/completeness"
    >
      <DateRangeBar
        fromDate={fromDate}
        toDate={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
        onPreset={(from, to) => {
          setFromDate(from);
          setToDate(to);
        }}
      />

      <p className="mb-4 text-sm text-slate-600">
        Flags visits missing chief complaint or diagnosis after consultation, MLC
        cases without a register entry, and police intimation overdue beyond{" "}
        {EMR_DELINQUENT_HOURS}h. Records are never deleted — fix gaps by completing
        the EMR on the doctor console.
      </p>

      {loading && <p className="text-slate-600">Loading report…</p>}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {report && !loading && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryCard label="Visits in period" value={report.total_visits} />
            <SummaryCard
              label="EMR complete"
              value={report.emr_complete}
              sub={`${report.total_visits > 0 ? Math.round((report.emr_complete / report.total_visits) * 100) : 0}%`}
              tone="ok"
            />
            <SummaryCard
              label="Delinquent"
              value={report.delinquent_count}
              sub={`${report.delinquent_rate}% of visits`}
              tone={report.delinquent_count > 0 ? "warn" : "ok"}
            />
            <SummaryCard
              label="Completed w/o EMR"
              value={report.by_issue.completed_without_emr}
              tone={
                report.by_issue.completed_without_emr > 0 ? "danger" : "default"
              }
            />
            <SummaryCard
              label="MLC gaps"
              value={
                report.by_issue.mlc_no_record + report.by_issue.mlc_police_overdue
              }
              tone={
                report.by_issue.mlc_no_record + report.by_issue.mlc_police_overdue > 0
                  ? "danger"
                  : "default"
              }
            />
          </div>

          {report.by_doctor.length > 0 && (
            <div className="card mb-6 overflow-x-auto">
              <div className="card-header">
                <h2 className="font-semibold text-slate-900">By consultant</h2>
              </div>
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Doctor</th>
                    <th className="px-4 py-2 font-semibold">Visits</th>
                    <th className="px-4 py-2 font-semibold">Delinquent</th>
                    <th className="px-4 py-2 font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_doctor.map((row) => (
                    <tr key={row.doctor_id} className="border-b border-slate-100">
                      <td className="px-4 py-2 font-medium">{row.doctor_name}</td>
                      <td className="px-4 py-2">{row.total}</td>
                      <td className="px-4 py-2">{row.delinquent}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            row.rate > 20
                              ? "font-semibold text-red-700"
                              : row.rate > 0
                                ? "font-medium text-amber-800"
                                : "text-green-700"
                          }
                        >
                          {row.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold ${
                filter === "all"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              All ({report.items.length})
            </button>
            {(Object.keys(ISSUE_LABELS) as DelinquencyIssue[]).map((key) =>
              report.by_issue[key] > 0 ? (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    filter === key
                      ? "ring-2 ring-slate-400 ring-offset-1"
                      : ""
                  } ${ISSUE_STYLES[key]}`}
                >
                  {ISSUE_LABELS[key]} ({report.by_issue[key]})
                </button>
              ) : null,
            )}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Token</th>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Doctor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3 font-semibold">Issues</th>
                  <th className="px-4 py-3 font-semibold">Missing</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.visit_id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-bold">#{item.token_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.patient_name}</p>
                      {item.patient_number != null && (
                        <p className="text-xs text-indigo-700">
                          P-{item.patient_number}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.doctor_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {format(new Date(item.registered_at), "d MMM h:mm a")}
                      <br />
                      <span className="text-slate-400">
                        {item.hours_since_registration}h ago
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.issues.map((issue) => (
                          <span
                            key={issue}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ISSUE_STYLES[issue]}`}
                          >
                            {ISSUE_LABELS[issue]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.missing_fields.length > 0
                        ? item.missing_fields.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/records/${item.visit_id}`}
                        className="font-medium text-indigo-700 hover:underline"
                      >
                        Open record
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <p className="p-10 text-center text-slate-500">
                No delinquent records in this period
                {filter !== "all" ? ` for ${ISSUE_LABELS[filter]}` : ""}.
              </p>
            )}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-slate-500">
        <Link href="/manager" className="text-indigo-700 hover:underline">
          ← OPD Manager
        </Link>
        {" · "}
        <Link href="/nabh" className="text-indigo-700 hover:underline">
          NABH checklist
        </Link>
      </p>
    </ConsoleShell>
  );
}
