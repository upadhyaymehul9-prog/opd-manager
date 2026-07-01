"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import type { Medicine } from "@/lib/prescription-types";

type StockRow = {
  medicine: Medicine;
  available: number;
  low: boolean;
  out_of_stock: boolean;
  batches: {
    id: string;
    batch_no: string | null;
    expiry_date: string | null;
    quantity: number;
    mrp: number | null;
  }[];
};

export default function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [form, setForm] = useState({
    medicine_id: "",
    quantity: "",
    batch_no: "",
    expiry_date: "",
    mrp: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stockRes, medRes] = await Promise.all([
        fetch(`/api/stock${showLowOnly ? "?low=true" : ""}`),
        fetch("/api/medicines?q="),
      ]);
      if (!stockRes.ok) throw new Error("Failed to load stock");
      setRows(await stockRes.json());
      if (medRes.ok) setMedicines(await medRes.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [showLowOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function addStock(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_id: form.medicine_id,
          quantity: Number(form.quantity),
          batch_no: form.batch_no || null,
          expiry_date: form.expiry_date || null,
          mrp: form.mrp || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add stock failed");
      setForm({
        medicine_id: "",
        quantity: "",
        batch_no: "",
        expiry_date: "",
        mrp: "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add stock failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConsoleShell
      title="Pharmacy Stock"
      subtitle="Track batches, expiry, and quantity on hand"
      current="/stock"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showLowOnly}
            onChange={(e) => setShowLowOnly(e.target.checked)}
          />
          Show low / out of stock only
        </label>
        <Link href="/pharmacy" className="text-sm text-teal-700">
          ← Back to pharmacy queue
        </Link>
      </div>

      <form
        onSubmit={addStock}
        className="mb-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <h2 className="sm:col-span-2 lg:col-span-6 font-semibold text-slate-900">
          Add stock (admin / manager)
        </h2>
        <select
          required
          value={form.medicine_id}
          onChange={(e) => setForm((f) => ({ ...f, medicine_id: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
        >
          <option value="">Select medicine</option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.strength ? ` ${m.strength}` : ""}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          required
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Batch no (optional)"
          value={form.batch_no}
          onChange={(e) => setForm((f) => ({ ...f, batch_no: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={form.expiry_date}
          onChange={(e) =>
            setForm((f) => ({ ...f, expiry_date: e.target.value }))
          }
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add stock"}
        </button>
      </form>

      {loading && <p className="text-slate-600">Loading stock…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.medicine.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">
                {row.medicine.name}
                {row.medicine.strength ? ` ${row.medicine.strength}` : ""}
              </p>
              <span
                className={
                  row.out_of_stock
                    ? "rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                    : row.low
                      ? "rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
                      : "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                }
              >
                {row.out_of_stock
                  ? "Out of stock"
                  : `${row.available} in stock${row.low ? " (low)" : ""}`}
              </span>
            </div>
            {row.batches.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {row.batches.map((b) => (
                  <li key={b.id}>
                    Batch {b.batch_no ?? "—"} · Qty {b.quantity}
                    {b.expiry_date ? ` · Exp ${b.expiry_date}` : ""}
                    {b.mrp != null ? ` · MRP ₹${b.mrp}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {rows.length === 0 && !loading && (
          <p className="text-center text-slate-500">No stock records yet.</p>
        )}
      </div>
    </ConsoleShell>
  );
}
