"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import type { AppointmentView } from "@/lib/appointments";
import type { Doctor, PatientVisit } from "@/lib/types";
import { ConsultationBillReceipt } from "@/components/ConsultationBillReceipt";
import { PrintActions } from "@/components/PrintActions";

type Slot = { time: string; label: string; available: boolean };

type AppointmentsPanelProps = {
  compact?: boolean;
  showBookForm?: boolean;
};

export function AppointmentsPanel({
  compact = false,
  showBookForm = true,
}: AppointmentsPanelProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<AppointmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookDoctorId, setBookDoctorId] = useState("");
  const [bookDate, setBookDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  const [arrivingId, setArrivingId] = useState<string | null>(null);
  const [lastArrival, setLastArrival] = useState<PatientVisit | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?date=${date}`);
      if (!res.ok) throw new Error("Failed to load appointments");
      setAppointments(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDoctors(data);
          if (data[0]) setBookDoctorId(data[0].id);
        }
      })
      .catch(() => setError("Could not load doctors"));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAppointments();
    const t = setInterval(loadAppointments, 30_000);
    return () => clearInterval(t);
  }, [loadAppointments]);

  useEffect(() => {
    if (!bookDoctorId || !bookDate) {
      setSlots([]);
      return;
    }
    fetch(
      `/api/appointments/slots?doctor_id=${bookDoctorId}&date=${bookDate}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setSelectedSlot(null);
      })
      .catch(() => setSlots([]));
  }, [bookDoctorId, bookDate]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookDoctorId || !selectedSlot || !patientName.trim()) return;

    setBooking(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: bookDoctorId,
          patient_name: patientName.trim(),
          mobile: mobile.trim() || null,
          age: age ? Number(age) : null,
          scheduled_at: selectedSlot,
          notes: notes.trim() || null,
          source: "reception",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      setPatientName("");
      setMobile("");
      setAge("");
      setNotes("");
      setSelectedSlot(null);
      if (bookDate === date) await loadAppointments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  async function handleArrive(id: string) {
    setArrivingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${id}/arrive`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setLastArrival(data.visit);
      await loadAppointments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setArrivingId(null);
    }
  }

  async function handleStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      await loadAppointments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  const statusColor: Record<string, string> = {
    booked: "bg-blue-100 text-blue-800",
    arrived: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-slate-100 text-slate-600",
    no_show: "bg-amber-100 text-amber-800",
  };

  const sourceLabel: Record<string, string> = {
    reception: "Reception",
    bookmyclinic: "BookMyClinic",
    walk_in: "Walk-in",
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-8"}>
      {showBookForm && (
        <form
          onSubmit={handleBook}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Book appointment</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Doctor</label>
              <select
                value={bookDoctorId}
                onChange={(e) => setBookDoctorId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={bookDate}
                min={today}
                onChange={(e) => setBookDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Patient name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Mobile</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Age</label>
                <input
                  type="number"
                  min={0}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          {slots.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">Available slots</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots
                  .filter((s) => s.available)
                  .map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => setSelectedSlot(s.time)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        selectedSlot === s.time
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={booking || !selectedSlot || !patientName.trim()}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {booking ? "Booking…" : "Book slot"}
          </button>
        </form>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {compact ? "Today's appointments" : "Appointments"}
          </h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading…</p>
        ) : appointments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No appointments for this date.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-[4.5rem] text-sm font-bold text-slate-800">
                  {format(new Date(a.scheduled_at), "h:mm a")}
                </div>
                <div className="flex-1 min-w-[10rem]">
                  <p className="font-medium text-slate-900">{a.patient_name}</p>
                  <p className="text-xs text-slate-500">
                    Dr. {a.doctor_name}
                    {a.mobile ? ` · ${a.mobile}` : ""}
                    {a.source !== "reception" && (
                      <> · {sourceLabel[a.source] ?? a.source}</>
                    )}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[a.status] ?? "bg-slate-100"}`}
                >
                  {a.status.replace("_", " ")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {a.status === "booked" && (
                    <>
                      <button
                        type="button"
                        disabled={arrivingId === a.id}
                        onClick={() => handleArrive(a.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {arrivingId === a.id ? "…" : "Arrive → register"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatus(a.id, "no_show")}
                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50"
                      >
                        No show
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatus(a.id, "cancelled")}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {a.status === "arrived" && a.visit_id && (
                    <span className="text-xs text-emerald-700">Registered</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastArrival && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <p className="text-sm font-medium uppercase text-emerald-700">Registered from appointment</p>
          <p className="mt-2 text-4xl font-black text-emerald-900">
            Token #{lastArrival.token_number}
          </p>
          {lastArrival.patient_number != null && (
            <p className="mt-1 font-semibold text-indigo-800">
              Patient ID: P-{lastArrival.patient_number}
            </p>
          )}
          {lastArrival.consultation_bill_no && (
            <div className="mt-4 space-y-3">
              <ConsultationBillReceipt visit={lastArrival} />
              <PrintActions label="Print bill" pdfLabel="Save PDF" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
