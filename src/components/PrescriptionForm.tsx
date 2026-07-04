"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Medicine,
  Prescription,
  PrescriptionItemInput,
} from "@/lib/prescription-types";
import { ActionButton } from "./PatientCard";
import { PrescriptionCompactQueue } from "./PrescriptionCompactQueue";
import { formatMedicineLabel } from "@/lib/medicine";
import type { PatientVisit } from "@/lib/types";

const FREQUENCIES = ["OD", "BD", "TDS", "QID", "SOS", "HS"];

type MedicineWithStock = Medicine & {
  stock?: { available: number; low: boolean; out_of_stock: boolean };
};

type DraftLine = PrescriptionItemInput & {
  key: string;
  dispensed?: boolean;
  persisted?: boolean;
};

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
    persisted: false,
  };
}

function buildSaveItems(
  lines: DraftLine[],
  persistedIds: Set<string>,
): PrescriptionItemInput[] {
  return lines
    .filter((line) => line.medicine_name.trim())
    .map((line, index) => {
      const item: PrescriptionItemInput = {
        medicine_id: line.medicine_id ?? null,
        medicine_name: line.medicine_name.trim(),
        dose: line.dose?.trim() || null,
        frequency: line.frequency?.trim() || null,
        duration_days:
          line.duration_days != null && line.duration_days > 0
            ? line.duration_days
            : null,
        quantity:
          line.quantity != null && line.quantity > 0 ? line.quantity : null,
        instructions: line.instructions?.trim() || null,
        sort_order: index,
      };
      if (line.id && persistedIds.has(line.id)) {
        item.id = line.id;
      }
      return item;
    });
}

function stockLabel(stock?: MedicineWithStock["stock"]) {
  if (!stock) return null;
  if (stock.out_of_stock) return { text: "Out of stock", className: "text-red-600" };
  if (stock.low)
    return {
      text: `${stock.available} in stock (low)`,
      className: "text-amber-700",
    };
  return { text: `${stock.available} in stock`, className: "text-green-700" };
}

export function PrescriptionForm({
  visitId,
  doctorId,
  visit,
}: {
  visitId: string;
  doctorId: string;
  visit: PatientVisit;
}) {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MedicineWithStock[]>([]);
  const [lineStock, setLineStock] = useState<
    Record<string, { available: number; low: boolean; out_of_stock: boolean }>
  >({});
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const [stockOnly, setStockOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set());

  const isSent =
    prescription != null &&
    prescription.status !== "draft";

  const isFullyDispensed = prescription?.status === "dispensed";

  const loadPrescription = useCallback(async () => {
    const res = await fetch(`/api/prescriptions?visit_id=${visitId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data) return;
    setPrescription(data);
    setNotes(data.notes ?? "");
    setPersistedIds(new Set(data.items.map((i: Prescription["items"][number]) => i.id)));
    if (data.items.length > 0) {
      setLines(
        data.items.map((item: Prescription["items"][number]) => ({
          key: item.id,
          id: item.id,
          medicine_id: item.medicine_id,
          medicine_name: item.medicine_name,
          dose: item.dose,
          frequency: item.frequency,
          duration_days: item.duration_days,
          quantity: item.quantity,
          instructions: item.instructions,
          dispensed: item.dispensed,
          persisted: true,
        })),
      );
      const ids = data.items
        .map((i: Prescription["items"][number]) => i.medicine_id)
        .filter(Boolean);
      if (ids.length > 0) {
        const stockRes = await fetch(
          `/api/stock/availability?ids=${ids.join(",")}`,
        );
        if (stockRes.ok) {
          const availability = await stockRes.json();
          const byLine: typeof lineStock = {};
          for (const item of data.items as Prescription["items"]) {
            if (item.medicine_id && availability[item.medicine_id]) {
              byLine[item.id] = availability[item.medicine_id];
            }
          }
          setLineStock(byLine);
        }
      }
    }
  }, [visitId]);

  useEffect(() => {
    loadPrescription();
  }, [loadPrescription]);

  useEffect(() => {
    if (!isSent || expanded) return;
    const t = setInterval(loadPrescription, 15_000);
    return () => clearInterval(t);
  }, [isSent, expanded, loadPrescription]);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({
        q: query,
        stock: "true",
        limit: "50",
      });
      if (stockOnly) params.set("in_stock", "true");
      const res = await fetch(`/api/medicines?${params}`);
      if (res.ok) setSuggestions(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [query, stockOnly]);

  useEffect(() => {
    if (activeLine) loadMedicineList(activeLine);
  }, [stockOnly]);

  async function loadMedicineList(lineKey: string) {
    setActiveLine(lineKey);
    const params = new URLSearchParams({
      stock: "true",
      limit: "100",
    });
    if (query.trim()) params.set("q", query.trim());
    if (stockOnly) params.set("in_stock", "true");
    const res = await fetch(`/api/medicines?${params}`);
    if (res.ok) setSuggestions(await res.json());
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    const line = lines.find((l) => l.key === key);
    if (line?.dispensed) {
      setError("Cannot remove a medicine already dispensed at pharmacy");
      return;
    }
    setLines((prev) => prev.filter((line) => line.key !== key));
  }

  function pickMedicine(lineKey: string, medicine: MedicineWithStock) {
    updateLine(lineKey, {
      medicine_id: medicine.id,
      medicine_name: formatMedicineLabel(medicine),
    });
    if (medicine.stock) {
      setLineStock((prev) => ({ ...prev, [lineKey]: medicine.stock! }));
    }
    setQuery("");
    setSuggestions([]);
    setActiveLine(null);
  }

  async function savePrescription(): Promise<Prescription | null> {
    const validLines = lines.filter((line) => line.medicine_name.trim());
    if (validLines.length === 0) {
      setError("Add at least one medicine");
      return null;
    }

    const payloadItems = buildSaveItems(validLines, persistedIds);

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
          items: payloadItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.items.length < payloadItems.length) {
        throw new Error(
          `Only ${data.items.length} of ${payloadItems.length} medicines saved — try again`,
        );
      }
      setPrescription(data);
      setMessage(
        isSent
          ? `Saved ${data.items.length} medicine(s) — pharmacy will see all`
          : `Saved ${data.items.length} medicine(s)`,
      );
      await loadPrescription();
      if (isSent) setExpanded(false);
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

    const payloadItems = buildSaveItems(validLines, persistedIds);

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
          items: payloadItems,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || "Save failed");
      if (saved.items.length < payloadItems.length) {
        throw new Error(
          `Only ${saved.items.length} of ${payloadItems.length} medicines saved before send`,
        );
      }

      const res = await fetch(`/api/prescriptions/${saved.id}/send`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setPrescription(data);
      setMessage(`Sent ${saved.items.length} medicine(s) to pharmacy`);
      setExpanded(false);
      await loadPrescription();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  if (isFullyDispensed) {
    return null;
  }

  if (isSent && prescription && !expanded) {
    return (
      <PrescriptionCompactQueue
        visit={visit}
        prescription={prescription}
        onExpand={() => setExpanded(true)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <h3 className="font-semibold text-slate-900">
        {isSent ? "Edit prescription (patient at pharmacy)" : "Write prescription"}
      </h3>
      {isSent && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-xs font-medium text-teal-700 hover:underline"
        >
          ← Back to compact queue view
        </button>
      )}
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={stockOnly}
          onChange={(e) => setStockOnly(e.target.checked)}
          className="rounded border-slate-300"
        />
        Show only medicines in stock
      </label>
      {stockOnly && (
        <p className="mt-1 text-xs text-slate-600">
          Click the medicine box to see in-stock items. Add batches in{" "}
          <strong>Stock</strong> if the list is empty.
        </p>
      )}
      {isSent && (
        <p className="mt-1 text-xs text-teal-800">
          Add new lines or edit undispensed medicines. Dispensed lines are locked.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {lines.map((line) => {
          const stock = line.medicine_id
            ? lineStock[line.key] ??
              lineStock[line.id ?? ""] ??
              suggestions.find((s) => s.id === line.medicine_id)?.stock
            : undefined;
          const stockInfo = stockLabel(stock);
          const locked = Boolean(line.dispensed);

          return (
            <div
              key={line.key}
              className={`rounded-lg border bg-white p-3 ${locked ? "border-teal-200 bg-teal-50/30" : "border-slate-200"}`}
            >
              {locked && (
                <p className="mb-2 text-xs font-medium text-teal-800">
                  Dispensed at pharmacy — locked
                </p>
              )}
              <div className="relative">
                <input
                  value={line.medicine_name}
                  disabled={locked}
                  onFocus={() => loadMedicineList(line.key)}
                  onChange={(e) => {
                    updateLine(line.key, {
                      medicine_name: e.target.value,
                      medicine_id: null,
                    });
                    setQuery(e.target.value);
                    setActiveLine(line.key);
                  }}
                  placeholder={
                    stockOnly
                      ? "Search in-stock medicines"
                      : "Search or type any medicine name"
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
                {stockInfo && (
                  <p className={`mt-1 text-xs font-medium ${stockInfo.className}`}>
                    {stockInfo.text}
                  </p>
                )}
                {activeLine === line.key && !locked && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg">
                    {suggestions.length === 0 ? (
                      <li className="px-3 py-3 text-sm text-amber-900">
                        {stockOnly
                          ? "No medicines in stock right now. Add stock under Stock, or uncheck the filter above to prescribe any medicine."
                          : "No matches — keep typing or pick from the list."}
                      </li>
                    ) : (
                      suggestions.map((med) => {
                        const hint = stockLabel(med.stock);
                        return (
                          <li key={med.id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={() => pickMedicine(line.key, med)}
                            >
                              <span>{formatMedicineLabel(med)}</span>
                              {hint && (
                                <span
                                  className={`shrink-0 text-xs font-medium ${hint.className}`}
                                >
                                  {hint.text}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <input
                  value={line.dose ?? ""}
                  disabled={locked}
                  onChange={(e) => updateLine(line.key, { dose: e.target.value })}
                  placeholder="Dose"
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                />
                <select
                  value={line.frequency ?? "BD"}
                  disabled={locked}
                  onChange={(e) =>
                    updateLine(line.key, { frequency: e.target.value })
                  }
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
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
                  disabled={locked}
                  value={line.duration_days ?? ""}
                  onChange={(e) =>
                    updateLine(line.key, {
                      duration_days: Number(e.target.value) || null,
                    })
                  }
                  placeholder="Days"
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                />
                <input
                  type="number"
                  min={1}
                  disabled={locked}
                  value={line.quantity ?? ""}
                  onChange={(e) =>
                    updateLine(line.key, {
                      quantity: Number(e.target.value) || null,
                    })
                  }
                  placeholder="Qty"
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                />
              </div>
              <input
                value={line.instructions ?? ""}
                disabled={locked}
                onChange={(e) =>
                  updateLine(line.key, { instructions: e.target.value })
                }
                placeholder="Instructions (optional)"
                className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
              {!locked && lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  className="mt-2 text-xs text-red-600"
                >
                  Remove line
                </button>
              )}
            </div>
          );
        })}
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

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <ActionButton
          label={isSent ? "Save medicines" : "Save medicines"}
          onClick={savePrescription}
          disabled={busy}
          variant={isSent ? "secondary" : "primary"}
        />
        {!isSent && (
          <ActionButton
            label="Send to pharmacy"
            variant="pharmacy"
            onClick={sendToPharmacy}
            disabled={busy}
          />
        )}
      </div>
    </div>
  );
}
