"use client";

import { useEffect, useState } from "react";

type MlcRecordView = {
  id: string;
  casualty_number: number;
  arrival_at: string;
  brought_by_name: string | null;
  brought_by_relation: string | null;
  history_own_words: string | null;
  identification_mark_1: string | null;
  identification_mark_2: string | null;
  injury_description: string | null;
  treatment_given: string | null;
  patient_status: string | null;
  dying_declaration_needed: boolean;
  evidence_collected: string | null;
  police_station: string | null;
  police_officer_name: string | null;
  fir_ddr_number: string | null;
  police_intimated_at: string | null;
  acknowledgment_receipt_ref: string | null;
  acknowledgment_received_at: string | null;
  police_intimation_overdue: boolean;
};

export function MlcDetailsPanel({ visitId }: { visitId: string }) {
  const [record, setRecord] = useState<MlcRecordView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const res = await fetch(`/api/visits/${visitId}/mlc`);
    if (res.ok) setRecord(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [visitId]);

  async function openCase() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/mlc`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open MLC case");
      setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open MLC case");
    } finally {
      setBusy(false);
    }
  }

  function setField<K extends keyof MlcRecordView>(key: K, value: MlcRecordView[K]) {
    setRecord((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function save() {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/mlc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brought_by_name: record.brought_by_name,
          brought_by_relation: record.brought_by_relation,
          history_own_words: record.history_own_words,
          identification_mark_1: record.identification_mark_1,
          identification_mark_2: record.identification_mark_2,
          injury_description: record.injury_description,
          treatment_given: record.treatment_given,
          patient_status: record.patient_status,
          dying_declaration_needed: record.dying_declaration_needed,
          evidence_collected: record.evidence_collected,
          police_station: record.police_station,
          police_officer_name: record.police_officer_name,
          fir_ddr_number: record.fir_ddr_number,
          acknowledgment_receipt_ref: record.acknowledgment_receipt_ref,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setRecord(data);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function markPoliceIntimated() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/mlc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ police_intimated_at: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveAcknowledgment() {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}/mlc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acknowledgment_receipt_ref: record.acknowledgment_receipt_ref,
          acknowledgment_received_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  if (!record) {
    return (
      <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h4 className="font-semibold text-amber-900">Medico-legal case (MLC)</h4>
        <p className="mt-1 text-sm text-amber-800">
          No MLC case record opened yet for this visit. Opening one assigns a
          permanent casualty register number and starts the police-intimation clock.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={openCase}
          className="mt-3 rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Opening…" : "Open MLC case record"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-amber-900">
          MLC case #{record.casualty_number} (NABH Annexure D / COP.2c)
        </h4>
        <span className="text-xs text-amber-700">
          Arrived {new Date(record.arrival_at).toLocaleString()}
        </span>
      </div>

      {record.police_intimation_overdue && (
        <p className="mt-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-900">
          ⚠ Police have not been intimated and more than 24 hours have passed
          since arrival — this is required regardless of patient consent.
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
        <label className="block">
          Brought by (name)
          <input
            value={record.brought_by_name ?? ""}
            onChange={(e) => setField("brought_by_name", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Relation
          <input
            value={record.brought_by_relation ?? ""}
            onChange={(e) => setField("brought_by_relation", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Patient status on examination
          <select
            value={record.patient_status ?? ""}
            onChange={(e) => setField("patient_status", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="">Select</option>
            <option value="alive">Alive</option>
            <option value="dead">Dead</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={record.dying_declaration_needed}
            onChange={(e) => setField("dying_declaration_needed", e.target.checked)}
          />
          Dying declaration needed
        </label>
        <label className="block sm:col-span-2">
          History in patient&apos;s/informant&apos;s own words
          <textarea
            rows={2}
            value={record.history_own_words ?? ""}
            onChange={(e) => setField("history_own_words", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Identification mark 1
          <input
            value={record.identification_mark_1 ?? ""}
            onChange={(e) => setField("identification_mark_1", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          Identification mark 2
          <input
            value={record.identification_mark_2 ?? ""}
            onChange={(e) => setField("identification_mark_2", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          Injury description (no abbreviations)
          <textarea
            rows={2}
            value={record.injury_description ?? ""}
            onChange={(e) => setField("injury_description", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          Treatment given
          <textarea
            rows={2}
            value={record.treatment_given ?? ""}
            onChange={(e) => setField("treatment_given", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block sm:col-span-2">
          Evidence collected
          <textarea
            rows={2}
            value={record.evidence_collected ?? ""}
            onChange={(e) => setField("evidence_collected", e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {saved && <p className="mt-2 text-xs text-emerald-700">MLC details saved.</p>}
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-3 rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save MLC details"}
      </button>

      <div className="mt-4 rounded-lg border border-red-200 bg-red-50/60 p-3">
        <p className="font-semibold text-red-900">Police intimation (mandatory)</p>
        {record.police_intimated_at ? (
          <p className="mt-1 text-sm text-red-800">
            Intimated at {new Date(record.police_intimated_at).toLocaleString()}
          </p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={markPoliceIntimated}
            className="mt-2 rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Mark police intimated now
          </button>
        )}
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input
            placeholder="Police station"
            value={record.police_station ?? ""}
            onChange={(e) => setField("police_station", e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Officer name"
            value={record.police_officer_name ?? ""}
            onChange={(e) => setField("police_officer_name", e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="FIR / DDR number"
            value={record.fir_ddr_number ?? ""}
            onChange={(e) => setField("fir_ddr_number", e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        <p className="mt-3 font-semibold text-red-900">Acknowledgment receipt</p>
        {record.acknowledgment_received_at ? (
          <p className="mt-1 text-sm text-red-800">
            Received {new Date(record.acknowledgment_received_at).toLocaleString()}
            {record.acknowledgment_receipt_ref ? ` · Ref: ${record.acknowledgment_receipt_ref}` : ""}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              placeholder="Receipt / reference number"
              value={record.acknowledgment_receipt_ref ?? ""}
              onChange={(e) => setField("acknowledgment_receipt_ref", e.target.value)}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={saveAcknowledgment}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Record acknowledgment received
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

