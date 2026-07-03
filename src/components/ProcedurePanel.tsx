"use client";

import { useCallback, useEffect, useState } from "react";
import { PROCEDURE_TYPES, type ProcedureType } from "@/lib/types";

const PROCEDURE_LABELS: Record<ProcedureType, string> = {
  iv_drip: "IV drip",
  dressing: "Dressing",
  nebulisation: "Nebulisation",
  injection: "Injection",
  other: "Other procedure",
};

type ProcedureRow = {
  id: string;
  procedure_type: ProcedureType;
  notes: string | null;
  fee: number | null;
  created_at: string;
};

export function ProcedurePanel({ visitId }: { visitId: string }) {
  const [rows, setRows] = useState<ProcedureRow[]>([]);
  const [type, setType] = useState<ProcedureType>("iv_drip");
  const [notes, setNotes] = useState("");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/visits/${visitId}/procedures`);
    if (res.ok) setRows(await res.json());
  }, [visitId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addProcedure() {
    setBusy(true);
    try {
      const res = await fetch(`/api/visits/${visitId}/procedures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedure_type: type,
          notes: notes.trim() || null,
          fee: fee ? Number(fee) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNotes("");
      setFee("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <h3 className="font-semibold text-slate-900">Procedures</h3>
      <p className="mt-1 text-xs text-slate-600">
        IV drip, dressing, nebulisation, etc.
      </p>

      {rows.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="rounded bg-white px-2 py-1">
              <span className="font-medium">
                {PROCEDURE_LABELS[r.procedure_type]}
              </span>
              {r.fee != null && (
                <span className="text-slate-600"> · ₹{r.fee}</span>
              )}
              {r.notes && (
                <span className="text-slate-500"> — {r.notes}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ProcedureType)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          {PROCEDURE_TYPES.map((t) => (
            <option key={t} value={t}>
              {PROCEDURE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="Fee ₹ (optional)"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-w-[120px] flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={addProcedure}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          Add
        </button>
      </div>
    </div>
  );
}
