"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { PrintActions } from "@/components/PrintActions";
import { OPD_SUMMARY_HINDI, parseMlcDetails } from "@/lib/nabh-cms";
import type { PatientVisit } from "@/lib/types";

type PrescriptionItem = {
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: number | null;
};

type OpdSummaryData = {
  visit: PatientVisit;
  consent: { accepted: boolean; created_at: string; version: string } | null;
  prescription: { items: PrescriptionItem[] } | null;
};

export function OpdVisitSummary({ visitId }: { visitId: string }) {
  const [data, setData] = useState<OpdSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "hi">("en");

  useEffect(() => {
    fetch(`/api/visits/${visitId}/opd-summary`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [visitId]);

  if (loading) return <p className="text-sm text-slate-600">Loading OPD summary…</p>;
  if (!data) return null;

  const { visit, consent, prescription } = data;
  const hi = OPD_SUMMARY_HINDI;
  const mlc = parseMlcDetails(
    (visit as PatientVisit & { mlc_details?: string }).mlc_details,
  );

  const dxFinal = visit.final_diagnosis || visit.diagnosis;

  return (
    <section className="mb-6 rounded-xl border border-teal-200 bg-teal-50/40 p-4 print:border-black print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-teal-900">
            {lang === "hi" ? hi.title : "OPD visit summary"} (NABH COP.1i)
          </h2>
          <p className="text-xs text-teal-700">COP.1k multilingual · print / PDF</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as "en" | "hi")}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm print:hidden"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
          <PrintActions label="Print summary" pdfLabel="Save summary PDF" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 print:text-black">
        <div>
          <p className="font-medium text-slate-900">
            {lang === "hi" ? hi.patient : "Patient"}: {visit.patient_name}
          </p>
          <p className="text-slate-600">
            {visit.patient_number != null ? `P-${visit.patient_number}` : "—"}
            {visit.patient_abha_id ? ` · ABHA ${visit.patient_abha_id}` : ""}
          </p>
          <p className="text-slate-600">
            {lang === "hi" ? hi.token : "Token"} #{visit.token_number}
            {visit.age ? ` · ${lang === "hi" ? "आयु" : "Age"} ${visit.age}` : ""}
            {visit.gender ? ` · ${visit.gender}` : ""}
          </p>
          {visit.mobile && <p className="text-slate-600">Mobile: {visit.mobile}</p>}
        </div>
        <div>
          <p className="text-slate-600">
            {lang === "hi" ? hi.doctor : "Doctor"}: {visit.doctors?.name ?? "—"}
            {visit.doctors?.specialty ? ` (${visit.doctors.specialty})` : ""}
          </p>
          <p className="text-slate-600">
            {lang === "hi" ? hi.visitDate : "Visit"}:{" "}
            {format(new Date(visit.registered_at), "d MMM yyyy, h:mm a")}
          </p>
          {visit.completed_at && (
            <p className="text-slate-600">
              Discharge: {format(new Date(visit.completed_at), "h:mm a")}
            </p>
          )}
          {visit.medico_legal && (
            <p className="mt-1 font-medium text-amber-800">Medico-legal case (MLC)</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {visit.chief_complaint && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.complaint : "Chief complaint"}:
            </span>{" "}
            {visit.chief_complaint}
          </p>
        )}
        {visit.examination_notes && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.findings : "Clinical findings"}:
            </span>{" "}
            {visit.examination_notes}
          </p>
        )}
        {visit.patient_allergies && (
          <p className="font-medium text-red-700">
            {lang === "hi" ? hi.allergy : "Allergies"}: {visit.patient_allergies}
          </p>
        )}
        {visit.provisional_diagnosis && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.provisionalDx : "Provisional diagnosis"}:
            </span>{" "}
            {visit.provisional_diagnosis}
          </p>
        )}
        {dxFinal && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.finalDx : "Final diagnosis"}:
            </span>{" "}
            {dxFinal}
          </p>
        )}
        {visit.advice && (
          <p>
            <span className="font-medium">{lang === "hi" ? hi.treatment : "Treatment"}:</span>{" "}
            {visit.advice}
          </p>
        )}
        {visit.lifestyle_advice && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.lifestyle : "Lifestyle advice"}:
            </span>{" "}
            {visit.lifestyle_advice}
          </p>
        )}
        {visit.investigations_ordered && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.investigations : "Investigations ordered"}:
            </span>{" "}
            {visit.investigations_ordered}
          </p>
        )}
        {visit.follow_up_instructions && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.followUp : "Follow-up"}:
            </span>{" "}
            {visit.follow_up_instructions}
            {visit.follow_up_date ? ` (${visit.follow_up_date})` : ""}
          </p>
        )}
        {visit.referral_notes && (
          <p>
            <span className="font-medium">
              {lang === "hi" ? hi.referral : "Referral"}:
            </span>{" "}
            {visit.referral_notes}
          </p>
        )}
      </div>

      {prescription && prescription.items.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-900">
            {lang === "hi" ? "प्रिस्क्रिप्शन" : "Prescription"}
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {prescription.items.map((item, i) => (
              <li key={i}>
                {item.medicine_name}
                {item.dosage ? ` — ${item.dosage}` : ""}
                {item.frequency ? `, ${item.frequency}` : ""}
                {item.duration ? ` for ${item.duration}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mlc && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900">MLC details (Annexure D)</p>
      {mlc.incident_history && <p className="mt-1">Incident: {mlc.incident_history}</p>}
      {mlc.police_officer_name && <p>Police: {mlc.police_officer_name}</p>}
      {mlc.fir_ddr_number && <p>FIR/DDR: {mlc.fir_ddr_number}</p>}
      {mlc.injury_description && <p>Injuries: {mlc.injury_description}</p>}
      {mlc.evidence_collected && <p>Evidence: {mlc.evidence_collected}</p>}
        </div>
      )}

      {visit.signed_by && visit.signed_at && (
        <p className="mt-4 text-xs text-slate-600">
          {lang === "hi" ? hi.signature : "Authenticated by"}: {visit.signed_by} ·{" "}
          {format(new Date(visit.signed_at), "d MMM yyyy, h:mm a")}
        </p>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Consent:{" "}
        {consent?.accepted
          ? `Recorded ${format(new Date(consent.created_at), "d MMM yyyy")} (v${consent.version})`
          : "Not on file"}
      </p>
    </section>
  );
}
