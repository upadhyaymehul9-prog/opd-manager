"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConsoleShell, SetupBanner } from "@/components/ConsoleShell";
import { TodayCollectionPanel } from "@/components/TodayCollectionPanel";
import { AppointmentsPanel } from "@/components/AppointmentsPanel";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { tokenRegisteredMessage } from "@/lib/whatsapp-messages";
import { CONSENT_TEXT_V1 } from "@/lib/nabh";
import { NATIONAL_ID_TYPES, POINT_OF_ORIGIN_OPTIONS } from "@/lib/nabh-cms";
import { ConsultationBillReceipt } from "@/components/ConsultationBillReceipt";
import { PrintActions } from "@/components/PrintActions";
import { StatusBadge } from "@/components/PatientCard";
import { deletePatient, usePatientVisits } from "@/hooks/usePatientVisits";
import type { Doctor, PatientType, PatientVisit } from "@/lib/types";

type PatientSearchHit = {
  id: string;
  patient_number: number;
  name: string;
  mobile: string | null;
  address: string | null;
  gender: string | null;
  emergency_contact: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  national_id_type: string | null;
  national_id: string | null;
  abha_id: string | null;
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
  const [abhaId, setAbhaId] = useState("");
  const [gender, setGender] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [medicoLegal, setMedicoLegal] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [witnessName, setWitnessName] = useState("");
  const [pointOfOrigin, setPointOfOrigin] = useState("walk_in");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [occupation, setOccupation] = useState("");
  const [nationalIdType, setNationalIdType] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<
    { id: string; patient_number: number; name: string; mobile: string | null }[]
  >([]);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [consultationFee, setConsultationFee] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [collectFee, setCollectFee] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [lastVisit, setLastVisit] = useState<PatientVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { visits: activeVisits, refresh: refreshActive } = usePatientVisits({
    activeOnly: true,
  });

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
    if (patientType !== "new" || patientName.trim().length < 2) {
      setDuplicateWarning([]);
      return;
    }
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ name: patientName.trim() });
      if (mobile.trim()) params.set("mobile", mobile.trim());
      if (abhaId.trim()) params.set("abha_id", abhaId.trim());
      if (nationalId.trim()) params.set("national_id", nationalId.trim());
      const res = await fetch(`/api/patients/check-duplicate?${params}`);
      if (res.ok) {
        const hits = await res.json();
        setDuplicateWarning(hits);
        if (hits.length === 0) setDuplicateConfirmed(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientName, mobile, abhaId, nationalId, patientType]);

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
    setAddress(p.address ?? "");
    setGender(
      p.gender === "male" || p.gender === "female" || p.gender === "other"
        ? p.gender
        : (p.gender ?? "").trim().toLowerCase() || "",
    );
    setEmergencyContact(p.emergency_contact ?? "");
    setDateOfBirth(p.date_of_birth ?? "");
    setOccupation(p.occupation ?? "");
    setNationalIdType(p.national_id_type ?? "");
    setNationalId(p.national_id ?? "");
    setAbhaId(p.abha_id ?? "");
    if (p.last_age != null) setAge(String(p.last_age));
    else setAge("");
    setSearchQuery("");
    setSearchResults([]);
  }

  function clearRegistrationForm() {
    setPatientName("");
    setAge("");
    setMobile("");
    setAddress("");
    setAbhaId("");
    setGender("");
    setEmergencyContact("");
    setMedicoLegal(false);
    setConsentAccepted(false);
    setWitnessName("");
    setPointOfOrigin("walk_in");
    setDateOfBirth("");
    setOccupation("");
    setNationalIdType("");
    setNationalId("");
    setDuplicateConfirmed(false);
    setDuplicateWarning([]);
    setSelectedPatientId(null);
    setSelectedPatientNumber(null);
  }

  function resetPatientType(type: PatientType) {
    clearRegistrationForm();
    setPatientType(type);
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
    if (!consentAccepted) {
      setError("Patient or attendant must accept informed consent (NABH requirement)");
      return;
    }
    if (
      patientType === "new" &&
      duplicateWarning.length > 0 &&
      !duplicateConfirmed
    ) {
      setError(
        "Possible duplicate patient found — select existing patient or confirm new registration below",
      );
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
          abha_id: abhaId.trim() || null,
          gender: gender || null,
          emergency_contact: emergencyContact.trim() || null,
          medico_legal: medicoLegal,
          consent_accepted: true,
          witness_name: witnessName.trim() || null,
          point_of_origin: pointOfOrigin,
          date_of_birth: dateOfBirth || null,
          occupation: occupation.trim() || null,
          national_id_type: nationalIdType || null,
          national_id: nationalId.trim() || null,
          duplicate_confirmed: duplicateConfirmed || patientType === "old",
          consultation_fee:
            collectFee && consultationFee ? Number(consultationFee) : null,
          consultation_payment_mode: collectFee ? paymentMode : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      setLastVisit(data);
      clearRegistrationForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  async function handleRemoveVisit(visit: PatientVisit) {
    const ok = window.confirm(
      `Remove ${visit.patient_name} (Token #${visit.token_number}) from workflow?\n\nThis will delete this OPD visit.`,
    );
    if (!ok) return;
    setDeletingId(visit.id);
    setActionError(null);
    try {
      await deletePatient(visit.id);
      if (lastVisit?.id === visit.id) setLastVisit(null);
      await refreshActive();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not remove visit");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ConsoleShell
      title="Reception"
      subtitle="Register patient — new or returning · consultation billing"
      current="/reception"
    >
      {doctors.length === 0 && <SetupBanner />}

      <TodayCollectionPanel variant="reception" />

      <div className="mb-8">
        <AppointmentsPanel compact showBookForm={false} />
      </div>

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
                Search by name, mobile, P-number, or ABHA
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
                        {p.abha_id ? ` · ABHA ${p.abha_id}` : ""}
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

          {patientType === "new" && duplicateWarning.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Possible duplicate</p>
              <ul className="mt-1 list-inside list-disc">
                {duplicateWarning.map((p) => (
                  <li key={p.id ?? p.patient_number}>
                    <button
                      type="button"
                      className="text-left underline hover:text-amber-950"
                      onClick={async () => {
                        setPatientType("old");
                        // Load full demographics so the form auto-fills.
                        const res = await fetch(
                          `/api/patients/search?q=${encodeURIComponent(String(p.patient_number))}`,
                        );
                        if (res.ok) {
                          const hits = (await res.json()) as PatientSearchHit[];
                          const match =
                            hits.find((h) => h.id === p.id) ?? hits[0];
                          if (match) {
                            pickPatient(match);
                            setDuplicateWarning([]);
                            setDuplicateConfirmed(false);
                            return;
                          }
                        }
                        setSelectedPatientId(p.id);
                        setSelectedPatientNumber(p.patient_number);
                        setPatientName(p.name);
                        setMobile(p.mobile ?? "");
                        setDuplicateWarning([]);
                        setDuplicateConfirmed(false);
                      }}
                    >
                      P-{p.patient_number} {p.name}
                      {p.mobile ? ` · ${p.mobile}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
              <label className="mt-3 flex items-start gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={duplicateConfirmed}
                  onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                I confirm this is a genuinely new patient (not a duplicate)
              </label>
              <p className="mt-2 text-xs text-amber-800">
                Already registered under two IDs?{" "}
                <Link
                  href="/settings/patients/merge"
                  className="font-semibold underline hover:text-amber-950"
                >
                  Merge duplicate records
                </Link>{" "}
                (manager/admin) instead of creating a third.
              </p>
            </div>
          )}

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Point of origin
          </label>
          <select
            value={pointOfOrigin}
            onChange={(e) => setPointOfOrigin(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
          >
            {POINT_OF_ORIGIN_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

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
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Date of birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Occupation</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">National ID type</label>
              <select
                value={nationalIdType}
                onChange={(e) => setNationalIdType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              >
                <option value="">None</option>
                {NATIONAL_ID_TYPES.filter((t) => t.id !== "abha").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {nationalIdType && nationalIdType !== "abha" && (
            <label className="mt-4 block text-sm font-medium text-slate-700">
              National ID number
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </label>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Emergency contact
              </label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Relative mobile"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-900">
            <input
              type="checkbox"
              checked={medicoLegal}
              onChange={(e) => setMedicoLegal(e.target.checked)}
            />
            Medico-legal case (assault, MLC, etc.)
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            ABHA ID (optional)
          </label>
          <input
            type="text"
            value={abhaId}
            onChange={(e) => setAbhaId(e.target.value)}
            placeholder="91-1234-5678-9012 (14 digits, ABDM)"
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3"
          />

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

          <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <h3 className="text-sm font-semibold text-teal-900">
              Informed consent (NABH)
            </h3>
            <p className="mt-2 text-xs text-teal-800">{CONSENT_TEXT_V1}</p>
            <label className="mt-3 flex items-start gap-2 text-sm font-medium text-teal-900">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1"
                required
              />
              Patient / attendant accepts treatment and data use
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">Witness (optional)</span>
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Name if signed by attendant"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

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
              {lastVisit.patient_abha_id && (
                <p className="mt-1 text-sm font-medium text-indigo-700">
                  ABHA: {lastVisit.patient_abha_id}
                </p>
              )}
              <p className="mt-2 text-xl font-semibold">{lastVisit.patient_name}</p>
              {lastVisit.mobile && lastVisit.doctors && (
                <div className="mt-4 space-y-3">
                  <WhatsAppLink
                    mobile={lastVisit.mobile}
                    message={tokenRegisteredMessage({
                      patientName: lastVisit.patient_name,
                      tokenNumber: lastVisit.token_number,
                      doctorName: lastVisit.doctors.name,
                      roomNumber: lastVisit.room_number,
                    })}
                    label="Send token on WhatsApp"
                    className="text-sm"
                  />
                </div>
              )}
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

      {actionError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Active patients in clinic</h2>
        <p className="mt-1 text-sm text-slate-600">
          Reception can remove visits when requested by doctor/admin.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2 pr-3">Token</th>
                <th className="py-2 pr-3">Patient</th>
                <th className="py-2 pr-3">Consultant</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Registered</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeVisits.map((v) => (
                <tr key={v.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold">#{v.token_number}</td>
                  <td className="py-2 pr-3">
                    {v.patient_name}
                    {v.patient_number != null && (
                      <span className="ml-2 text-xs text-indigo-700">P-{v.patient_number}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{v.doctors?.name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="py-2 pr-3 text-slate-600">
                    {new Date(v.registered_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveVisit(v)}
                      disabled={deletingId === v.id}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === v.id ? "Removing..." : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
              {activeVisits.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No active visits right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </ConsoleShell>
  );
}
