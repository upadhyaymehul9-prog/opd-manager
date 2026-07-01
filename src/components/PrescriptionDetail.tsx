"use client";

import { useCallback, useEffect, useState } from "react";
import type { Prescription } from "@/lib/prescription-types";
import type { PatientVisit } from "@/lib/types";
import { ActionButton } from "./PatientCard";
import { updatePatient } from "@/hooks/usePatientVisits";

export function PrescriptionDetail({
  visit,
  onComplete,
}: {
  visit: PatientVisit;
  onComplete?: () => void;
}) {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stock, setStock] = useState<
    Record<string, { available: number; low: boolean; out_of_stock: boolean }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prescriptions?visit_id=${visit.id}`);
      if (!res.ok) throw new Error("Could not load prescription");
      const data = await res.json();
      setPrescription(data);

      const ids = (data?.items ?? [])
        .map((i: { medicine_id: string | null }) => i.medicine_id)
        .filter(Boolean);
      if (ids.length > 0) {
        const stockRes = await fetch(
          `/api/stock/availability?ids=${ids.join(",")}`,
        );
        if (stockRes.ok) setStock(await stockRes.json());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [visit.id]);

  useEffect(() => {
    load();
    if (visit.status === "to_pharmacy") {
      updatePatient(visit.id, { status: "at_pharmacy" }).catch(() => {});
    }
  }, [load, visit.id, visit.status]);

  async function toggleDispensed(itemId: string, dispensed: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispensed,
          substituted_note: notes[itemId] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function completeVisit() {
    if (!prescription) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/${prescription.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Complete failed");
      onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-slate-600">Loading prescription…</p>;
  if (!prescription) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
        No prescription on file. Doctor must send medicines before dispensing.
      </p>
    );
  }

  const pending = prescription.items.filter((i) => !i.dispensed).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-lg font-bold text-slate-900">{visit.patient_name}</p>
        <p className="text-sm text-slate-600">
          Token #{visit.token_number} · {visit.doctors?.name ?? "Doctor"} · Room{" "}
          {visit.room_number}
        </p>
        {prescription.notes && (
          <p className="mt-2 text-sm text-slate-700">{prescription.notes}</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Dose</th>
              <th className="px-4 py-3">Freq</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Dispensed</th>
            </tr>
          </thead>
          <tbody>
            {prescription.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.medicine_name}</p>
                  {item.instructions && (
                    <p className="text-xs text-slate-500">{item.instructions}</p>
                  )}
                  <input
                    value={notes[item.id] ?? item.substituted_note ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    placeholder="Substitution note"
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-4 py-3">{item.dose ?? "—"}</td>
                <td className="px-4 py-3">{item.frequency ?? "—"}</td>
                <td className="px-4 py-3">{item.duration_days ?? "—"}</td>
                <td className="px-4 py-3">{item.quantity ?? "—"}</td>
                <td className="px-4 py-3">
                  {item.medicine_id ? (
                    <span
                      className={
                        stock[item.medicine_id]?.out_of_stock
                          ? "font-medium text-red-600"
                          : stock[item.medicine_id]?.low
                            ? "font-medium text-amber-700"
                            : "text-green-700"
                      }
                    >
                      {stock[item.medicine_id]?.out_of_stock
                        ? "Out of stock"
                        : `${stock[item.medicine_id]?.available ?? 0} in stock`}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.dispensed}
                      disabled={busy}
                      onChange={(e) =>
                        toggleDispensed(item.id, e.target.checked)
                      }
                    />
                    <span>{item.dispensed ? "Yes" : "No"}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">
          {pending > 0
            ? `${pending} medicine(s) still pending`
            : "All medicines dispensed"}
        </p>
        <ActionButton
          label="Complete & exit"
          variant="primary"
          disabled={busy || pending > 0}
          onClick={completeVisit}
        />
      </div>
    </div>
  );
}
