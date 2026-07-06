"use client";

import Link from "next/link";
import { useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";

type PatientHit = {
  id: string;
  patient_number: number;
  name: string;
  mobile: string | null;
  abha_id: string | null;
  date_of_birth: string | null;
  last_age: number | null;
};

function PatientPicker({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  hint: string;
  selected: PatientHit | null;
  onSelect: (p: PatientHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setResults(await res.json());
    setSearching(false);
  }

  if (selected) {
    return (
      <div className="card overflow-hidden">
        <div className="card-header">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {label}
          </p>
        </div>
        <div className="p-4">
          <p className="text-lg font-bold text-slate-900">
            P-{selected.patient_number} — {selected.name}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {selected.mobile ?? "No mobile"}
            {selected.date_of_birth ? ` · DOB ${selected.date_of_birth}` : ""}
            {selected.abha_id ? ` · ABHA ${selected.abha_id}` : ""}
            {selected.last_age != null ? ` · Last age ${selected.last_age}` : ""}
          </p>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="focus-ring mt-3 text-sm font-medium text-indigo-700 hover:underline"
          >
            Change selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <label className="block text-sm font-semibold text-slate-800">{label}</label>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Name, mobile, P-number, or ABHA"
        className="focus-ring mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {searching && <p className="mt-1 text-xs text-slate-500">Searching…</p>}
      {results.length > 0 && (
        <ul className="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full flex-col px-3 py-2.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">
                  P-{p.patient_number} — {p.name}
                </span>
                <span className="text-xs text-slate-500">
                  {[p.mobile, p.date_of_birth ? `DOB ${p.date_of_birth}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PatientMergePage() {
  const [source, setSource] = useState<PatientHit | null>(null);
  const [target, setTarget] = useState<PatientHit | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summary: {
      visitsMoved: number;
      appointmentsMoved: number;
      consentsMoved: number;
      fieldsFilledOnTarget: string[];
      abhaMoved: boolean;
    };
    target?: { patient_number: number; name: string };
  } | null>(null);

  const bothSelected = source && target;
  const samePatient = bothSelected && source.id === target.id;

  async function merge() {
    if (!source || !target) return;
    if (!reason.trim()) {
      setError("Please give a reason for this merge");
      return;
    }
    if (
      !window.confirm(
        `Merge P-${source.patient_number} (${source.name}) into P-${target.patient_number} (${target.name})?\n\nThis cannot be undone automatically. The duplicate record is kept forever as a redirect.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/patients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_patient_id: source.id,
          target_patient_id: target.id,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Merge failed");
      setResult(data);
      setSource(null);
      setTarget(null);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConsoleShell
      title="Merge duplicate patients"
      subtitle="Combine two records that are the same person — nothing is ever deleted"
      current="/settings/patients/merge"
    >
      <div className="max-w-3xl space-y-4">
        <div className="card p-5">
          <p className="text-sm leading-relaxed text-slate-600">
            Pick the <strong>duplicate</strong> record (merged away) and the{" "}
            <strong>keep</strong> record (surviving). All visits, appointments, and
            consents move to the kept record. Blank fields on the kept record are
            filled from the duplicate. The duplicate row stays in the database forever
            as a permanent redirect — required for lifetime medical records.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <PatientPicker
            label="Duplicate record"
            hint="Will be marked merged — not deleted"
            selected={source}
            onSelect={setSource}
          />
          <PatientPicker
            label="Keep record"
            hint="Surviving patient file"
            selected={target}
            onSelect={setTarget}
          />
        </div>

        {samePatient && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            These are the same record — pick two different patients.
          </p>
        )}

        {bothSelected && !samePatient && (
          <div className="card border-amber-200 bg-amber-50/50 p-5">
            <label className="block text-sm font-semibold text-amber-950">
              Reason for merge (required)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Same person registered twice with different mobile numbers"
              className="focus-ring mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={merge}
              className="focus-ring mt-4 rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {busy
                ? "Merging…"
                : `Merge P-${source.patient_number} → P-${target.patient_number}`}
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {result && (
          <div className="card border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-950">
            <p className="text-base font-semibold">Merge complete</p>
            {result.target && (
              <p className="mt-1">
                Kept record: P-{result.target.patient_number} — {result.target.name}
              </p>
            )}
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>{result.summary.visitsMoved} visit(s) moved</li>
              <li>{result.summary.appointmentsMoved} appointment(s) moved</li>
              <li>{result.summary.consentsMoved} consent(s) moved</li>
              {result.summary.abhaMoved && <li>ABHA ID transferred to kept record</li>}
              {result.summary.fieldsFilledOnTarget.length > 0 && (
                <li>Fields filled: {result.summary.fieldsFilledOnTarget.join(", ")}</li>
              )}
            </ul>
          </div>
        )}

        <p className="text-xs text-slate-500">
          <Link href="/reception" className="text-teal-700 hover:underline">
            ← Back to reception
          </Link>
        </p>
      </div>
    </ConsoleShell>
  );
}
