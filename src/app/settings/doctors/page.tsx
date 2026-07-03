"use client";

import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import type { Doctor } from "@/lib/types";

export default function DoctorSettingsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    name: "",
    room_number: "",
    specialty: "",
    qualifications: "",
    bio: "",
    consultation_fee: "",
    photo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDoctors(data);
          if (data[0]) setSelectedId(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    const d = doctors.find((x) => x.id === selectedId);
    if (!d) return;
    setForm({
      name: d.name,
      room_number: d.room_number,
      specialty: d.specialty ?? "",
      qualifications: d.qualifications ?? "",
      bio: d.bio ?? "",
      consultation_fee:
        d.consultation_fee != null ? String(d.consultation_fee) : "",
      photo_url: d.photo_url ?? "",
    });
  }, [selectedId, doctors]);

  async function handlePhoto(file: File | null) {
    if (!file) return;
    if (file.size > 500_000) {
      setError("Photo must be under 500 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, photo_url: String(reader.result) }));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/doctors/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          room_number: form.room_number.trim(),
          specialty: form.specialty.trim() || null,
          qualifications: form.qualifications.trim() || null,
          bio: form.bio.trim() || null,
          consultation_fee: form.consultation_fee
            ? Number(form.consultation_fee)
            : null,
          photo_url: form.photo_url || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDoctors((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      setMessage("Doctor profile saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConsoleShell
      title="Doctor profiles"
      subtitle="Name, specialty, photo, consultation fee — shown on TV display"
      current="/settings/doctors"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <label className="block text-sm font-medium text-slate-700">
            Select doctor
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className="mt-4 space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Doctor name"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <input
              value={form.room_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, room_number: e.target.value }))
              }
              placeholder="Room number"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <input
              value={form.specialty}
              onChange={(e) =>
                setForm((f) => ({ ...f, specialty: e.target.value }))
              }
              placeholder="Specialty"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <input
              value={form.qualifications}
              onChange={(e) =>
                setForm((f) => ({ ...f, qualifications: e.target.value }))
              }
              placeholder="Qualifications (MBBS, MD, etc.)"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={form.consultation_fee}
              onChange={(e) =>
                setForm((f) => ({ ...f, consultation_fee: e.target.value }))
              }
              placeholder="Default consultation fee (₹)"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Bio / notes (optional)"
              rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Photo (max 500 KB)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-3 text-sm text-green-700">{message}</p>}

          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-900 p-6 text-white">
          <p className="text-sm text-slate-400">TV preview</p>
          {form.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.photo_url}
              alt=""
              className="mt-3 h-24 w-24 rounded-full border-2 border-blue-400 object-cover"
            />
          )}
          <p className="mt-4 text-2xl font-bold">{form.name || "Doctor name"}</p>
          <p className="mt-1 text-slate-300">
            Room {form.room_number || "—"}
            {form.specialty ? ` · ${form.specialty}` : ""}
          </p>
          {form.qualifications && (
            <p className="mt-2 text-sm text-blue-200">{form.qualifications}</p>
          )}
          {form.bio && (
            <p className="mt-2 text-sm text-slate-400">{form.bio}</p>
          )}
        </div>
      </div>
    </ConsoleShell>
  );
}
