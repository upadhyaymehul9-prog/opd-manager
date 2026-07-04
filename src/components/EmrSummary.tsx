import type { PatientVisit } from "@/lib/types";

export function EmrSummary({ visit }: { visit: PatientVisit }) {
  const hasVitals =
    visit.vitals_bp ||
    visit.vitals_pulse != null ||
    visit.vitals_temp != null ||
    visit.vitals_weight != null ||
    visit.vitals_spo2 != null;

  const hasNotes =
    visit.chief_complaint ||
    visit.diagnosis ||
    visit.examination_notes ||
    visit.advice;

  if (!hasVitals && !hasNotes && !visit.patient_allergies && !visit.patient_blood_group) {
    return null;
  }

  return (
    <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <h2 className="font-semibold text-blue-900">Consultation (EMR)</h2>

      {visit.patient_allergies && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <strong>Allergies:</strong> {visit.patient_allergies}
        </p>
      )}

      {(visit.patient_blood_group || hasVitals) && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {visit.patient_blood_group && (
            <span className="rounded bg-white px-2 py-1">
              Blood group: <strong>{visit.patient_blood_group}</strong>
            </span>
          )}
          {visit.vitals_bp && (
            <span className="rounded bg-white px-2 py-1">
              BP: <strong>{visit.vitals_bp}</strong>
            </span>
          )}
          {visit.vitals_pulse != null && (
            <span className="rounded bg-white px-2 py-1">
              Pulse: <strong>{visit.vitals_pulse}/min</strong>
            </span>
          )}
          {visit.vitals_temp != null && (
            <span className="rounded bg-white px-2 py-1">
              Temp: <strong>{visit.vitals_temp}°F</strong>
            </span>
          )}
          {visit.vitals_weight != null && (
            <span className="rounded bg-white px-2 py-1">
              Weight: <strong>{visit.vitals_weight} kg</strong>
            </span>
          )}
          {visit.vitals_spo2 != null && (
            <span className="rounded bg-white px-2 py-1">
              SpO₂: <strong>{visit.vitals_spo2}%</strong>
            </span>
          )}
        </div>
      )}

      {visit.chief_complaint && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-slate-700">Chief complaint</p>
          <p className="mt-0.5 whitespace-pre-wrap text-slate-800">{visit.chief_complaint}</p>
        </div>
      )}
      {visit.diagnosis && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-slate-700">Diagnosis</p>
          <p className="mt-0.5 whitespace-pre-wrap text-slate-800">{visit.diagnosis}</p>
        </div>
      )}
      {visit.examination_notes && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-slate-700">Examination</p>
          <p className="mt-0.5 whitespace-pre-wrap text-slate-800">{visit.examination_notes}</p>
        </div>
      )}
      {visit.advice && (
        <div className="mt-3 text-sm">
          <p className="font-medium text-slate-700">Advice</p>
          <p className="mt-0.5 whitespace-pre-wrap text-slate-800">{visit.advice}</p>
        </div>
      )}
    </section>
  );
}
