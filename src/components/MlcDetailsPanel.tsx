"use client";

import { useEffect, useState } from "react";
import type { MlcDetails } from "@/lib/nabh-cms";

export function MlcDetailsPanel({
  visitId,
  initialDetails,
}: {
  visitId: string;
  initialDetails?: string | null;
}) {
  const [form, setForm] = useState<MlcDetails>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialDetails) {
      try {
        setForm(JSON.parse(initialDetails) as MlcDetails);
      } catch {
        /* ignore */
      }
    }
  }, [initialDetails]);

  function setField<K extends keyof MlcDetails>(key: K, value: MlcDetails[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/visits/${visitId}/emr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mlc_details: JSON.stringify(form) }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h4 className="font-semibold text-amber-900">MLC checklist (NABH Annexure D / COP.3a)</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
        <label className="block">
          Brought by (name)
          <input
            value={form.brought_by_name ?? ""}
            onChange={(e) => setField("brought_by_name", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Relation
          <input
            value={form.brought_by_relation ?? ""}
            onChange={(e) => setField("brought_by_relation", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Police officer name
          <input
            value={form.police_officer_name ?? ""}
            onChange={(e) => setField("police_officer_name", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          FIR / DDR number
          <input
            value={form.fir_ddr_number ?? ""}
            onChange={(e) => setField("fir_ddr_number", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Patient status
          <select
            value={form.patient_status ?? ""}
            onChange={(e) =>
              setField("patient_status", e.target.value as MlcDetails["patient_status"])
            }
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="">Select</option>
            <option value="alive">Alive</option>
            <option value="dead">Dead</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          Incident history
          <textarea
            rows={2}
            value={form.incident_history ?? ""}
            onChange={(e) => setField("incident_history", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Identification mark 1
          <input
            value={form.identification_mark_1 ?? ""}
            onChange={(e) => setField("identification_mark_1", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Identification mark 2
          <input
            value={form.identification_mark_2 ?? ""}
            onChange={(e) => setField("identification_mark_2", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          Injury description
          <textarea
            rows={2}
            value={form.injury_description ?? ""}
            onChange={(e) => setField("injury_description", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          Evidence collected
          <textarea
            rows={2}
            value={form.evidence_collected ?? ""}
            onChange={(e) => setField("evidence_collected", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-3 rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save MLC details"}
      </button>
      {saved && <p className="mt-2 text-xs text-emerald-700">MLC details saved.</p>}
    </div>
  );
}
