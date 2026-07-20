"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BillPreview, PaymentMode, PharmacyBillView } from "@/lib/billing-types";
import { PAYMENT_MODES } from "@/lib/billing-types";
import { calculateLine, round2 } from "@/lib/billing";
import type { Prescription } from "@/lib/prescription-types";
import type { PatientVisit } from "@/lib/types";
import { ActionButton } from "./PatientCard";
import { PharmacyBillReceipt } from "./PharmacyBillReceipt";
import { PrintActions } from "./PrintActions";
import { updatePatient } from "@/hooks/usePatientVisits";

export function PrescriptionDetail({
  visit,
  onComplete,
}: {
  visit: PatientVisit;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stock, setStock] = useState<
    Record<string, { available: number; low: boolean; out_of_stock: boolean }>
  >({});
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [gstRates, setGstRates] = useState<Record<string, number>>({});
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [completedBill, setCompletedBill] = useState<PharmacyBillView | null>(
    null,
  );
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/prescriptions?visit_id=${visit.id}`);
      if (!res.ok) throw new Error("Could not load prescription");
      const data = await res.json();
      setPrescription(data);
      if (!silent) {
        const qtyMap: Record<string, string> = {};
        for (const item of data?.items ?? []) {
          qtyMap[item.id] = String(item.quantity ?? 1);
        }
        setQuantities(qtyMap);
      }

      const billRes = await fetch(`/api/bills?visit_id=${visit.id}`);
      if (billRes.ok) {
        const billData = await billRes.json();
        if (billData?.bill_no) setCompletedBill(billData);
      }

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
    load(false);
    if (visit.status === "to_pharmacy") {
      updatePatient(visit.id, { status: "at_pharmacy" }).catch(() => {});
    }
  }, [load, visit.id, visit.status]);

  const pending =
    prescription?.items.filter((i) => !i.dispensed && !i.skipped).length ?? 0;
  const dispensedCount =
    prescription?.items.filter((i) => i.dispensed).length ?? 0;
  const readyToBill = prescription != null && pending === 0 && dispensedCount > 0;
  const readyToExitWithoutBill =
    prescription != null &&
    prescription.items.length > 0 &&
    pending === 0 &&
    dispensedCount === 0;

  useEffect(() => {
    if (!prescription || !readyToBill || completedBill) return;
    fetch(`/api/bills/preview?prescription_id=${prescription.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((preview: BillPreview | null) => {
        if (!preview?.lines) return;
        const prices: Record<string, string> = {};
        const rates: Record<string, number> = {};
        for (const line of preview.lines) {
          prices[line.prescription_item_id] = String(line.unit_price);
          rates[line.prescription_item_id] = line.gst_rate;
        }
        setUnitPrices(prices);
        setGstRates(rates);
      })
      .catch(() => {});
  }, [prescription, readyToBill, completedBill]);

  const billTotals = useMemo(() => {
    if (!prescription || !readyToBill) return null;
    const lines = prescription.items
      .filter((i) => i.dispensed)
      .map((item) => {
        const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
        const unit_price = round2(
          Number(unitPrices[item.id] ?? 0) || 0,
        );
        const gst_rate = gstRates[item.id] ?? 12;
        return {
          ...item,
          quantity,
          unit_price,
          gst_rate,
          ...calculateLine(quantity, unit_price, gst_rate),
        };
      });
    const subtotal = round2(lines.reduce((s, l) => s + l.taxable_amount, 0));
    const gst_total = round2(lines.reduce((s, l) => s + l.gst_amount, 0));
    return {
      lines,
      subtotal,
      gst_total,
      grand_total: round2(subtotal + gst_total),
    };
  }, [prescription, readyToBill, unitPrices, gstRates]);

  async function toggleDispensed(itemId: string, dispensed: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispensed,
          quantity: Number(quantities[itemId]) || undefined,
          substituted_note: notes[itemId] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveQuantity(itemId: string) {
    const qty = Math.round(Number(quantities[itemId]));
    if (!qty || qty < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update quantity");
      await load(true);
      setQuantities((prev) => ({ ...prev, [itemId]: String(qty) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update quantity");
    } finally {
      setBusy(false);
    }
  }

  async function skipItem(itemId: string, reason: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped: true, skip_reason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not skip medicine");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not skip medicine");
    } finally {
      setBusy(false);
    }
  }

  function canDispenseItem(item: Prescription["items"][number]) {
    if (item.skipped) return false;
    if (!item.medicine_id) return false;
    const availability = stock[item.medicine_id];
    if (!availability || availability.out_of_stock) return false;
    const qty = Number(quantities[item.id] ?? item.quantity ?? 1);
    return qty <= (availability.available ?? 0);
  }

  async function removeItem(itemId: string, medicineName: string) {
    if (
      !window.confirm(
        `Remove "${medicineName.split(" · ")[0]}" from this prescription? (e.g. out of stock)`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/items/${itemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove medicine");
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove medicine");
    } finally {
      setBusy(false);
    }
  }

  async function completeWithBill() {
    if (!prescription || !billTotals) return;

    const zeroRates = billTotals.lines.filter((l) => l.unit_price <= 0);
    if (zeroRates.length > 0) {
      setError(
        `Enter rate (₹) for: ${zeroRates.map((l) => l.medicine_name).join(", ")}. Add MRP in Stock if missing.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/${prescription.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_mode: paymentMode,
          lines: billTotals.lines.map((l) => ({
            prescription_item_id: l.id,
            unit_price: l.unit_price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Complete failed");
      if (data.bill) {
        setCompletedBill(data.bill);
      } else {
        onComplete?.();
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusy(false);
    }
  }

  async function exitWithoutBill() {
    if (!prescription || !readyToExitWithoutBill) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/prescriptions/${prescription.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_mode: paymentMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Exit failed");
      onComplete?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Exit failed");
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

  if (completedBill) {
    return (
      <div className="space-y-4">
        <PharmacyBillReceipt bill={completedBill} visit={visit} />
        <PrintActions label="Print receipt" pdfLabel="Save receipt as PDF" />
        <button
          type="button"
          onClick={() => {
            onComplete?.();
            router.push("/pharmacy");
          }}
          className="focus-ring rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 print:hidden"
        >
          Back to pharmacy queue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-lg font-bold text-slate-900">{visit.patient_name}</p>
        <p className="text-sm text-slate-600">
          {visit.patient_number != null && (
            <>Patient P-{visit.patient_number} · </>
          )}
          Token #{visit.token_number} · {visit.doctors?.name ?? "Doctor"} · Room{" "}
          {visit.room_number}
        </p>
        {prescription.notes && (
          <p className="mt-2 text-sm text-slate-700">{prescription.notes}</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          Dispense in-stock medicines, then <strong>Skip</strong> outside or unavailable
          lines — you can bill without dispensing every medicine.
        </p>
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Dispensed</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {prescription.items.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-slate-100 ${
                  item.skipped ? "bg-slate-50 opacity-80" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{item.medicine_name}</p>
                  {!item.medicine_id && (
                    <p className="text-xs font-medium text-amber-800">
                      Outside pharmacy stock
                    </p>
                  )}
                  {item.skipped && (
                    <p className="text-xs font-medium text-slate-600">
                      Skipped — {item.skip_reason?.replace(/_/g, " ") ?? "not dispensed"}
                    </p>
                  )}
                  {item.dose && (
                    <p className="text-xs text-slate-500">
                      {item.dose}
                      {item.frequency ? ` · ${item.frequency}` : ""}
                      {item.duration_days ? ` · ${item.duration_days} days` : ""}
                    </p>
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
                    disabled={item.dispensed}
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-100"
                  />
                </td>
                <td className="px-4 py-3">
                  {item.dispensed ? (
                    <span className="font-medium">{item.quantity ?? 1}</span>
                  ) : item.skipped ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={quantities[item.id] ?? String(item.quantity ?? 1)}
                        disabled={busy}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onBlur={() => saveQuantity(item.id)}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.medicine_id ? (
                    <span
                      className={
                        stock[item.medicine_id]?.out_of_stock
                          ? "font-medium text-red-600"
                          : stock[item.medicine_id]?.low
                            ? "font-medium text-amber-700"
                            : Number(quantities[item.id] ?? item.quantity ?? 1) >
                                (stock[item.medicine_id]?.available ?? 0)
                              ? "font-medium text-red-600"
                              : "text-green-700"
                      }
                    >
                      {stock[item.medicine_id]?.out_of_stock
                        ? "Out of stock"
                        : `${stock[item.medicine_id]?.available ?? 0} in stock`}
                    </span>
                  ) : (
                    <span className="font-medium text-amber-800">Outside stock</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.skipped ? (
                    <span className="text-slate-500">Skipped</span>
                  ) : (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.dispensed}
                        disabled={busy || (!item.dispensed && !canDispenseItem(item))}
                        title={
                          !canDispenseItem(item) && !item.dispensed
                            ? "Not in stock — use Skip for outside medicines"
                            : undefined
                        }
                        onChange={(e) =>
                          toggleDispensed(item.id, e.target.checked)
                        }
                      />
                      <span>{item.dispensed ? "Yes" : "No"}</span>
                    </label>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!item.dispensed && !item.skipped && (
                    <div className="flex flex-col gap-1">
                      {(!item.medicine_id ||
                        stock[item.medicine_id]?.out_of_stock) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            skipItem(
                              item.id,
                              !item.medicine_id ? "outside_stock" : "out_of_stock",
                            )
                          }
                          className="text-xs font-medium text-amber-800 hover:underline disabled:opacity-50"
                        >
                          Skip
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeItem(item.id, item.medicine_name)}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readyToBill && billTotals && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <h3 className="font-semibold text-slate-900">GST bill</h3>
          <p className="mt-1 text-xs text-slate-600">
            Rates from stock MRP · edit if needed · GST 12% default
          </p>
          {billTotals.lines.some((l) => l.unit_price <= 0) && (
            <p className="mt-2 rounded bg-amber-100 px-3 py-2 text-xs text-amber-900">
              Some rates are ₹0 — enter MRP in Stock for new batches, or type
              rates below before generating the bill.
            </p>
          )}
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="pb-2">Medicine</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Rate (₹)</th>
                <th className="pb-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {billTotals.lines.map((line) => (
                <tr key={line.id} className="border-t border-indigo-100">
                  <td className="py-2">{line.medicine_name}</td>
                  <td className="py-2">{line.quantity}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={unitPrices[line.id] ?? ""}
                      onChange={(e) =>
                        setUnitPrices((prev) => ({
                          ...prev,
                          [line.id]: e.target.value,
                        }))
                      }
                      className="w-24 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 text-right">
                    ₹{line.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Taxable</span>
              <span>₹{billTotals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST</span>
              <span>₹{billTotals.gst_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900">
              <span>Total</span>
              <span>₹{billTotals.grand_total.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-sm font-medium text-slate-700">
              Payment mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">
          {pending > 0
            ? `${pending} medicine(s) still pending — dispense or skip each line`
            : readyToExitWithoutBill
              ? "All lines skipped — you can exit without a pharmacy bill"
              : "Ready to generate bill and exit"}
        </p>
        {readyToExitWithoutBill ? (
          <ActionButton
            label="Exit without bill"
            variant="primary"
            disabled={busy}
            onClick={exitWithoutBill}
          />
        ) : (
          <ActionButton
            label="Generate bill & exit"
            variant="primary"
            disabled={busy || !readyToBill}
            onClick={completeWithBill}
          />
        )}
      </div>
    </div>
  );
}
