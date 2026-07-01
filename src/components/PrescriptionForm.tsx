"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Medicine,
  Prescription,
  PrescriptionItemInput,
} from "@/lib/prescription-types";
import { ActionButton } from "./PatientCard";

const FREQUENCIES = ["OD", "BD", "TDS", "QID", "SOS", "HS"];

type DraftLine = PrescriptionItemInput & { key: string };

function newLineKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function emptyLine(): DraftLine {
  return {
    key: newLineKey(),
    medicine_name: "",
    dose: "1 tablet",
    frequency: "BD",
    duration_days: 5,
    quantity: 10,
    instructions: "",
  };
}

export function PrescriptionForm({
  visitId,
  doctorId,
}: {
  visitId: string;
  doctorId: string;
}) {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadPrescription = useCallback(async () => {
    const res = await fetch(`/api/prescriptions?visit_id=${visitId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;
    setPrescription(data);
    setNotes(data.notes ?? "");
    if (data.status === "draft" && data.items.length > 0) {
      setLines(
        data.items.map((item: Prescription["items"][number]) => ({
          key: item.id,
          medicine_id: item.medicine_id,
          medicine_name: item.medicine_name,
          dose: item.dose,
          frequency: item.frequency,
          duration_days: item.duration_days,
          quantity: item.quantity,
          instructions: item.instructions,
        })),
      );
    }
  }, [visitId]);

  useEffect(() => {
    loadPrescription();
  }, [loadPrescription]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}`);
      if (res.ok) setSuggestions(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }

  function pickMedicine(lineKey: string, medicine: Medicine) {
    const label = [medicine.name, medicine.strength].filter(Boolean).join(" ");
    updateLine(lineKey, {
      medicine_id: medicine.id,
      medicine_name: label,
    });
    setQuery("");
    setSuggestions([]);
    setActiveLine(null);
  }

  async function saveDraft(): Promise<Prescription | null> {
    const validLines = lines.filter((line) => line.medicine_name.trim());
    if (validLines.length === 0) {
      setError("Add at least one medicine");
      return null;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_visit_id: visitId,
          doctor_id: doctorId,
          notes,
          items: validLines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setPrescription(data);
      setMessage("Prescription saved");
      return data as Prescription;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendToPharmacy() {
    const validLines = lines.filter((line) => line.medicine_name.trim());
    if (validLines.length === 0) {
      setError("Add at least one medicine");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saveRes = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_visit_id: visitId,
          doctor_id: doctorId,
          notes,
          items: validLines,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || "Save failed");

      const res = await fetch(`/api/prescriptions/${saved.id}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setPrescription(data);
      setMessage("Sent to pharmacy");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  const isSent =
    prescription &&
    prescription.status !== "draft" &&
    prescription.status !== undefined;

  if (isSent) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <p className="font-semibold text-teal-900">Prescription sent to pharmacy</p>
        <ul className="mt-2 space-y-1 text-sm text-teal-800">
          {prescription.items.map((item) => (
            <li key={item.id}>
              {item.medicine_name}
              {item.dose ? ` — ${item.dose}` : ""}
              {item.frequency ? `, ${item.frequency}` : ""}
              {item.duration_days ? ` × ${item.duration_days} days` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <h3 className="font-semibold text-slate-900">Write prescription</h3>

      <div className="mt-3 space-y-3">
        {lines.map((line) => (
          <div
            key={line.key}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="relative">
              <input
                value={line.medicine_name}
                onChange={(e) => {
                  updateLine(line.key, {
                    medicine_name: e.target.value,
                    medicine_id: null,
                  });
                  setQuery(e.target.value);
                  setActiveLine(line.key);
                }}
                placeholder="Medicine name"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              {activeLine === line.key && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg">
                  {suggestions.map((med) => (
                    <li key={med.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => pickMedicine(line.key, med)}
                      >
                        {med.name}
                        {med.strength ? ` ${med.strength}` : ""}
                        {med.form ? ` (${med.form})` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <input
                value={line.dose ?? ""}
                onChange={(e) => updateLine(line.key, { dose: e.target.value })}
                placeholder="Dose"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <select
                value={line.frequency ?? "BD"}
                onChange={(e) =>
                  updateLine(line.key, { frequency: e.target.value })
                }
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={line.duration_days ?? ""}
                onChange={(e) =>
                  updateLine(line.key, {
                    duration_days: Number(e.target.value) || null,
                  })
                }
                placeholder="Days"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={1}
                value={line.quantity ?? ""}
                onChange={(e) =>
                  updateLine(line.key, {
                    quantity: Number(e.target.value) || null,
                  })
                }
                placeholder="Qty"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <input
              value={line.instructions ?? ""}
              onChange={(e) =>
                updateLine(line.key, { instructions: e.target.value })
              }
              placeholder="Instructions (optional)"
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                className="mt-2 text-xs text-red-600"
              >
                Remove line
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="mt-2 text-sm font-medium text-blue-700"
      >
        + Add medicine
      </button>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Prescription notes (optional)"
        className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        rows={2}
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton
          label="Save draft"
          onClick={saveDraft}
          disabled={busy}
        />
        <ActionButton
          label="Send to pharmacy"
          variant="primary"
          onClick={sendToPharmacy}
          disabled={busy}
        />
      </div>
    </div>
  );
}
