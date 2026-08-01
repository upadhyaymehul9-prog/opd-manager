"use client";

import { useEffect, useState } from "react";
import type { PatientVisit } from "@/lib/types";
import { updatePatient } from "@/hooks/usePatientVisits";

export function EditPatientDetailsPanel({
  visit,
  onUpdated,
}: {
  visit: PatientVisit;
  onUpdated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(visit.patient_name);
  const [age, setAge] = useState(visit.age != null ? String(visit.age) : "");
  const [mobile, setMobile] = useState(visit.mobile ?? "");
  const [gender, setGender] = useState(visit.gender ?? "");
  const [address, setAddress] = useState(visit.address ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(visit.patient_name);
    setAge(visit.age != null ? String(visit.age) : "");
    setMobile(visit.mobile ?? "");
    setGender(visit.gender ?? "");
    setAddress(visit.address ?? "");
    setSaved(false);
    setError(null);
  }, [visit.id, visit.patient_name, visit.age, visit.mobile, visit.gender, visit.address]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Patient name is required");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updatePatient(visit.id, {
        patient_name: name.trim(),
        age: age !== "" ? Number(age) : null,
        mobile: mobile.trim() || null,
        gender: gender.trim() || null,
        address: address.trim() || null,
      });
      setSaved(true);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
      >
        <span className="font-medium text-slate-800">Edit patient details</span>
        <span className="text-xs text-slate-500">{open ? "Hide ▴" : "Show ▾"}</span>
      </button>
      {open && (
        <form onSubmit={handleSave} className="space-y-2 border-t border-slate-200 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-slate-600 sm:col-span-2">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Age
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600">
              Gender
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-xs text-slate-600 sm:col-span-2">
              Mobile
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-600 sm:col-span-2">
              Address
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {saved && <p className="text-xs text-emerald-700">Patient details saved.</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </form>
      )}
    </div>
  );
}
