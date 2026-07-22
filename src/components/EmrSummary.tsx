import type { PatientVisit } from "@/lib/types";

// Chief complaint, diagnosis, examination notes, advice, and allergies are
// already shown by OpdVisitSummary right below this on the records detail
// page — this panel only carries what that one doesn't: vitals and blood
// group. Don't re-add clinical notes here without removing them there.
export function EmrSummary({ visit }: { visit: PatientVisit }) {
  const hasVitals =
    visit.vitals_bp ||
    visit.vitals_pulse != null ||
    visit.vitals_temp != null ||
    visit.vitals_weight != null ||
    visit.vitals_spo2 != null;

  if (!hasVitals && !visit.patient_blood_group) {
    return null;
  }

  return (
    <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <h2 className="font-semibold text-blue-900">Vitals</h2>
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
    </section>
  );
}
