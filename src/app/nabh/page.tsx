"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import { CONSENT_TEXT_V1 } from "@/lib/nabh";

type CheckItem = {
  id: string;
  standard: string;
  requirement: string;
  status: "met" | "partial" | "gap";
  note: string;
};

type AuditRow = {
  id: string;
  username: string;
  role: string;
  action: string;
  summary: string;
  created_at: string;
};

const STATUS_STYLE = {
  met: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  gap: "bg-red-100 text-red-800",
};

export default function NabhPage() {
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<CheckItem[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [feedbackAverage, setFeedbackAverage] = useState<number | null>(null);
  const [feedbackToday, setFeedbackToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/nabh/compliance")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load compliance data");
        return data;
      })
      .then((data) => {
        setScore(data.score ?? 0);
        setItems(data.items ?? []);
        setAudits(data.recentAudits ?? []);
        setFeedbackAverage(data.feedbackAverage ?? null);
        setFeedbackToday(data.feedbackToday ?? 0);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load compliance data"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConsoleShell
      title="NABH compliance"
      subtitle="Digital Health CMS checklist · audit trail · patient safety"
      current="/nabh"
    >
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-slate-600">Compliance score (today)</p>
          <p className="text-4xl font-bold text-slate-900">
            {loading ? "…" : error ? "—" : `${score}%`}
          </p>
        </div>
        {feedbackAverage != null && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-6 py-4">
            <p className="text-sm text-violet-700">Patient satisfaction (all time avg)</p>
            <p className="text-2xl font-bold text-violet-900">{feedbackAverage}/5</p>
            <p className="text-xs text-violet-600">{feedbackToday} survey(s) today</p>
          </div>
        )}
        <Link
          href="/incidents"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Report incident
        </Link>
        <Link
          href="/feedback"
          className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50"
        >
          Patient feedback form
        </Link>
        <Link
          href="/records/completeness"
          className="rounded-lg border border-cyan-300 bg-white px-4 py-2 text-sm font-medium text-cyan-900 hover:bg-cyan-50"
        >
          Record completeness
        </Link>
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Standards checklist</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aligned with NABH Digital Health CMS (clinic OPD). Status derived from today&apos;s data.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="pb-2 pr-4">Standard</th>
                <th className="pb-2 pr-4">Requirement</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-mono text-xs">{item.standard}</td>
                  <td className="py-3 pr-4">{item.requirement}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${STATUS_STYLE[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Informed consent (v1.0)</h2>
        <p className="mt-2 text-sm text-slate-700">{CONSENT_TEXT_V1}</p>
        <p className="mt-2 text-xs text-slate-500">
          Full consent text stored per visit with staff name, role, and witness.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Audit trail (today)</h2>
        {audits.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No audit events logged today yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {audits.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="text-slate-500">
                  {format(new Date(a.created_at), "d MMM h:mm a")}
                </span>
                <span className="mx-2 text-slate-400">·</span>
                <span className="font-medium">{a.username}</span>
                <span className="text-slate-500"> ({a.role})</span>
                <span className="mx-2 text-slate-400">—</span>
                {a.summary}
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsoleShell>
  );
}
