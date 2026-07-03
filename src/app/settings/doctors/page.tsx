"use client";

import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { useSession } from "@/hooks/useSession";
import type { Doctor } from "@/lib/types";

export default function DoctorSettingsPage() {
  const { session } = useSession();
  const isAdmin = session?.role === "admin" || session?.role === "manager";

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
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    room_number: "",
    specialty: "",
  });
  const [addingDoctor, setAddingDoctor] = useState(false);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setDoctors(data);
        if (session?.role === "doctor" && session.doctorId) {
          setSelectedId(session.doctorId);
        } else if (data[0]) {
          setSelectedId(data[0].id);
        }
      });
  }, [session?.role, session?.doctorId]);

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

  async function addDoctor() {
    if (!newDoctor.name.trim() || !newDoctor.room_number.trim()) return;
    setAddingDoctor(true);
    setError(null);
    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoctor),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add doctor");
      setDoctors((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(data.id);
      setNewDoctor({ name: "", room_number: "", specialty: "" });
      setShowAddDoctor(false);
      setMessage("Doctor added — edit name and fee below, then save");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add doctor");
    } finally {
      setAddingDoctor(false);
    }
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = isAdmin
        ? {
            name: form.name.trim(),
            room_number: form.room_number.trim(),
            specialty: form.specialty.trim() || null,
            qualifications: form.qualifications.trim() || null,
            bio: form.bio.trim() || null,
            consultation_fee: form.consultation_fee
              ? Number(form.consultation_fee)
              : null,
            photo_url: form.photo_url || null,
          }
        : {
            qualifications: form.qualifications.trim() || null,
            bio: form.bio.trim() || null,
            photo_url: form.photo_url || null,
          };

      const res = await fetch(`/api/doctors/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDoctors((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      setMessage("Profile saved — photo will show on TV display");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConsoleShell
      title={isAdmin ? "Doctor profiles" : "My profile & photo"}
      subtitle="Upload photo here — it appears on the waiting-room TV"
      current="/settings/doctors"
    >
      {isAdmin && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm text-emerald-900">
            <strong>Add or edit doctor name:</strong> use &quot;Add new doctor&quot; below,
            or select a doctor and change the name field → Save profile.
          </p>
          <button
            type="button"
            onClick={() => setShowAddDoctor((v) => !v)}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {showAddDoctor ? "Cancel" : "+ Add new doctor"}
          </button>
          {showAddDoctor && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                placeholder="Doctor name *"
                value={newDoctor.name}
                onChange={(e) =>
                  setNewDoctor((d) => ({ ...d, name: e.target.value }))
                }
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Room no *"
                value={newDoctor.room_number}
                onChange={(e) =>
                  setNewDoctor((d) => ({ ...d, room_number: e.target.value }))
                }
                className="w-24 rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Specialty"
                value={newDoctor.specialty}
                onChange={(e) =>
                  setNewDoctor((d) => ({ ...d, specialty: e.target.value }))
                }
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={addingDoctor}
                onClick={addDoctor}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {addingDoctor ? "Adding…" : "Create doctor"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          {isAdmin ? (
            <>
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
            </>
          ) : (
            <p className="text-lg font-semibold text-slate-900">{form.name}</p>
          )}

          <div className="mt-6 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-5">
            <p className="font-semibold text-indigo-900">Upload photo</p>
            <p className="mt-1 text-sm text-indigo-800">
              JPG or PNG, max 500 KB — shown on TV next to your name
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.photo_url}
                  alt=""
                  className="h-20 w-20 rounded-full border-2 border-indigo-400 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-200 text-2xl font-bold text-indigo-800">
                  {form.name.charAt(0) || "?"}
                </div>
              )}
              <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Choose photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {isAdmin && (
              <>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
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
              </>
            )}
            <input
              value={form.qualifications}
              onChange={(e) =>
                setForm((f) => ({ ...f, qualifications: e.target.value }))
              }
              placeholder="Qualifications (MBBS, MD, etc.)"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Bio / notes (optional)"
              rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
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
          <div className="mt-4 flex items-start gap-3">
            {form.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.photo_url}
                alt=""
                className="h-16 w-16 rounded-full border-2 border-blue-400 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-xl font-bold">
                {form.name.charAt(0) || "?"}
              </div>
            )}
            <div>
              <p className="text-2xl font-bold">{form.name || "Doctor name"}</p>
              <p className="mt-1 text-slate-300">
                Room {form.room_number || "—"}
                {form.specialty ? ` · ${form.specialty}` : ""}
              </p>
            </div>
          </div>
          {form.qualifications && (
            <p className="mt-3 text-sm text-blue-200">{form.qualifications}</p>
          )}
          {form.bio && (
            <p className="mt-2 text-sm text-slate-400">{form.bio}</p>
          )}
        </div>
      </div>
    </ConsoleShell>
  );
}
