"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import { formatMedicineLabel } from "@/lib/medicine";
import type { Medicine } from "@/lib/prescription-types";

type StockRow = {
  medicine: Medicine;
  available: number;
  low: boolean;
  out_of_stock: boolean;
  batches: {
    id: string;
    batch_no: string;
    expiry_date: string;
    quantity: number;
    mrp: number | null;
  }[];
};

export default function StockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const [medQuery, setMedQuery] = useState("");
  const [medSuggestions, setMedSuggestions] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null,
  );

  const [form, setForm] = useState({
    quantity: "",
    batch_no: "",
    expiry_date: "",
    mrp: "",
  });

  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    brand: "",
    form: "",
    strength: "",
  });
  const [addingMed, setAddingMed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stockRes = await fetch(
        `/api/stock${showLowOnly ? "?low=true" : ""}`,
      );
      if (!stockRes.ok) throw new Error("Failed to load stock");
      setRows(await stockRes.json());
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

  useEffect(() => {
    if (!medQuery.trim()) {
      setMedSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/medicines?q=${encodeURIComponent(medQuery)}&limit=30`,
      );
      if (res.ok) setMedSuggestions(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [medQuery]);

  async function addMedicine(e: React.FormEvent) {
    e.preventDefault();
    setAddingMed(true);
    setError(null);
    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMed.name.trim(),
          brand: newMed.brand.trim() || null,
          form: newMed.form.trim() || null,
          strength: newMed.strength.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add medicine");
      setSelectedMedicine(data);
      setMedQuery(formatMedicineLabel(data));
      setMedSuggestions([]);
      setNewMed({ name: "", brand: "", form: "", strength: "" });
      setShowAddMed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add medicine");
    } finally {
      setAddingMed(false);
    }
  }

  async function addStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMedicine) {
      setError("Select or add a medicine first");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_id: selectedMedicine.id,
          quantity: Number(form.quantity),
          batch_no: form.batch_no.trim(),
          expiry_date: form.expiry_date,
          mrp: form.mrp || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add stock failed");
      setForm({ quantity: "", batch_no: "", expiry_date: "", mrp: "" });
      setSelectedMedicine(null);
      setMedQuery("");
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
      subtitle="Generic names · batch & expiry required · search or add medicines"
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

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowAddMed((v) => !v)}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900"
        >
          {showAddMed ? "Hide add medicine" : "+ Add new medicine to catalog"}
        </button>
      </div>

      {showAddMed && (
        <form
          onSubmit={addMedicine}
          className="mb-6 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <h2 className="sm:col-span-2 lg:col-span-5 font-semibold text-slate-900">
            New medicine (generic name)
          </h2>
          <input
            required
            placeholder="Generic name * e.g. Paracetamol"
            value={newMed.name}
            onChange={(e) => setNewMed((m) => ({ ...m, name: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2 text-sm lg:col-span-2"
          />
          <input
            placeholder="Brand (optional)"
            value={newMed.brand}
            onChange={(e) => setNewMed((m) => ({ ...m, brand: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Form e.g. tablet"
            value={newMed.form}
            onChange={(e) => setNewMed((m) => ({ ...m, form: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Strength e.g. 500mg"
            value={newMed.strength}
            onChange={(e) =>
              setNewMed((m) => ({ ...m, strength: e.target.value }))
            }
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addingMed}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 lg:col-span-5 lg:max-w-xs"
          >
            {addingMed ? "Saving…" : "Save medicine"}
          </button>
        </form>
      )}

      <form
        onSubmit={addStock}
        className="mb-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <h2 className="sm:col-span-2 lg:col-span-6 font-semibold text-slate-900">
          Receive stock (batch & expiry required)
        </h2>
        <div className="relative lg:col-span-2">
          <input
            required
            value={medQuery}
            onChange={(e) => {
              setMedQuery(e.target.value);
              setSelectedMedicine(null);
            }}
            placeholder="Search generic name *"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          {medSuggestions.length > 0 && !selectedMedicine && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg">
              {medSuggestions.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setSelectedMedicine(m);
                      setMedQuery(formatMedicineLabel(m));
                      setMedSuggestions([]);
                    }}
                  >
                    {formatMedicineLabel(m)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          type="number"
          min={1}
          required
          placeholder="Quantity *"
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Batch no *"
          value={form.batch_no}
          onChange={(e) => setForm((f) => ({ ...f, batch_no: e.target.value }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          required
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
                {formatMedicineLabel(row.medicine)}
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
                    Batch {b.batch_no} · Qty {b.quantity} · Exp {b.expiry_date}
                    {b.mrp != null ? ` · MRP ₹${b.mrp}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {rows.length === 0 && !loading && (
          <p className="text-center text-slate-500">
            No stock yet — search a medicine above and receive a batch.
          </p>
        )}
      </div>
    </ConsoleShell>
  );
}
