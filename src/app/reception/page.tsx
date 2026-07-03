"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ConsoleShell, SetupBanner } from "@/components/ConsoleShell";
import { ConsultationBillReceipt } from "@/components/ConsultationBillReceipt";
import { PrintActions } from "@/components/PrintActions";
import type { Doctor, PatientType, PatientVisit } from "@/lib/types";

type PatientSearchHit = {
  id: string;
  patient_number: number;
  name: string;
  mobile: string | null;
  last_age: number | null;
};

export default function ReceptionPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientType, setPatientType] = useState<PatientType>("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchHit[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientNumber, setSelectedPatientNumber] = useState<
    number | null
  >(null);

  const [patientName, setPatientName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [age, setAge] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [collectFee, setCollectFee] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [lastVisit, setLastVisit] = useState<PatientVisit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDoctors(data);
          if (data[0]) {
            setDoctorId(data[0].id);
            if (data[0].consultation_fee) {
              setConsultationFee(String(data[0].consultation_fee));
            }
          }
        }
      })
      .catch(() => setError("Could not load doctors — check DATABASE_URL setup"));
  }, []);

  useEffect(() => {
    const d = doctors.find((x) => x.id === doctorId);
    if (d?.consultation_fee && collectFee) {
      setConsultationFee(String(d.consultation_fee));
    }
  }, [doctorId, doctors, collectFee]);

  useEffect(() => {
    if (patientType !== "old" || searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/patients/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      if (res.ok) setSearchResults(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, patientType]);

  function pickPatient(p: PatientSearchHit) {
    setSelectedPatientId(p.id);
    setSelectedPatientNumber(p.patient_number);
    setPatientName(p.name);
    setMobile(p.mobile ?? "");
    if (p.last_age) setAge(String(p.last_age));
    setSearchQuery("");
    setSearchResults([]);
  }

  function resetPatientType(type: PatientType) {
    setPatientType(type);
    setSelectedPatientId(null);
    setSelectedPatientNumber(null);
    setPatientName("");
    setAge("");
    setMobile("");
    setAddress("");
    setSearchQuery("");
    setSearchResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientName.trim() || !doctorId) return;
    if (patientType === "old" && !selectedPatientId) {
      setError("Search and select an existing patient first");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          doctor_id: doctorId,
          patient_id: selectedPatientId ?? undefined,
          patient_type: patientType,
          age: age ? Number(age) : null,
          mobile: mobile || null,
          address: address.trim() || null,
          consultation_fee:
            collectFee && consultationFee ? Number(consultationFee) : null,
          consultation_payment_mode: collectFee ? paymentMode : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      setLastVisit(data);
      setPatientName("");
      setAge("");
      setMobile("");
      setAddress("");
      setSelectedPatientId(null);
      setSelectedPatientNumber(null);
      setPatientType("new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  return (
    <ConsoleShell
      title="Reception"
      subtitle="Register patient — new or returning · consultation billing"
      current="/reception"
    >
      {doctors.length === 0 && <SetupBanner />}

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Register patient</h2>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Patient type
          </label>
          <div className="mt-2 flex gap-3">
            {(["new", "old"] as PatientType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => resetPatientType(t)}
                className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-medium ${
                  patientType === t
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {t === "new" ? "New patient" : "Old / follow-up"}
              </button>
            ))}
          </div>

          {patientType === "old" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Search by name, mobile, or P-number
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search…"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              {selectedPatientNumber != null && (
                <p className="mt-2 text-sm font-medium text-indigo-800">
                  Selected: P-{selectedPatientNumber}
                </p>
              )}
              {searchResults.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => pickPatient(p)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold">P-{p.patient_number}</span>{" "}
                        {p.name}
                        {p.mobile ? ` · ${p.mobile}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {patientType === "new" && (
            <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
              A new permanent patient ID (P-number) will be assigned on register.
            </p>
          )}

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Patient name
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Full name"
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            required
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Age</label>
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Mobile
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Address
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Village, street, landmark (optional)"
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
          />

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Consultant
          </label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg"
            required
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — Room {d.room_number}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <input
                type="checkbox"
                checked={collectFee}
                onChange={(e) => setCollectFee(e.target.checked)}
              />
              Collect consultation fee now
            </label>
            {collectFee && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="Fee ₹"
                  className="rounded border border-slate-300 px-3 py-2"
                />
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="rounded border border-slate-300 px-3 py-2"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            )}
          </div>

          {selectedDoctor && (
            <p className="mt-3 text-sm text-emerald-800">
              Room <strong>{selectedDoctor.room_number}</strong>
            </p>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !patientName.trim()}
            className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting
              ? "Registering…"
              : collectFee && consultationFee
                ? "Register & generate consultation bill"
                : "Register patient"}
          </button>
        </form>

        {lastVisit && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
              <p className="text-sm font-medium uppercase text-emerald-700">
                Registered
              </p>
              <p className="mt-2 text-5xl font-black text-emerald-900">
                Token #{lastVisit.token_number}
              </p>
              {lastVisit.patient_number != null && (
                <p className="mt-1 text-lg font-semibold text-indigo-800">
                  Patient ID: P-{lastVisit.patient_number}
                </p>
              )}
              <p className="mt-2 text-xl font-semibold">{lastVisit.patient_name}</p>
            </div>

            {lastVisit.consultation_bill_no && (
              <div className="space-y-3">
                <ConsultationBillReceipt visit={lastVisit} />
                <PrintActions
                  label="Print consultation bill"
                  pdfLabel="Save bill as PDF"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
