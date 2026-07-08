"use client";

import { use } from "react";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DoctorStatusPanel } from "@/components/DoctorStatusPanel";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { ConsultationEmrPanel } from "@/components/ConsultationEmrPanel";
import { MlcDetailsPanel } from "@/components/MlcDetailsPanel";
import { ProcedurePanel } from "@/components/ProcedurePanel";
import { TransferDoctorPanel } from "@/components/TransferDoctorPanel";
import { PatientCard } from "@/components/PatientCard";
import { DoctorPatientQueueBar } from "@/components/DoctorPatientQueueBar";
import { PatientActions } from "@/components/PatientActions";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { canWritePrescription, getRelevantPatients } from "@/lib/status";
import type { PatientVisit } from "@/lib/types";

function isAtPharmacy(status: PatientVisit["status"]) {
  return status === "to_pharmacy" || status === "at_pharmacy";
}

export default function DoctorConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: doctorId } = use(params);
  const { visits, loading, error, refresh } = usePatientVisits({ activeOnly: true });

  const myPatients = getRelevantPatients(visits, "doctor", doctorId).sort(
    (a, b) => a.token_number - b.token_number,
  );

  const doctorName =
    visits.find((v) => v.doctor_id === doctorId)?.doctors?.name ?? "Doctor";

  return (
    <ConsoleShell
      title={doctorName}
      subtitle="Tap to call patient or guide them to lab / radiology / pharmacy"
      current="/doctor"
    >
      <Link
        href="/settings/doctors"
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
      >
        My profile &amp; photo for TV →
      </Link>

      {loading && <p className="text-slate-600">Loading patients…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <DoctorStatusPanel doctorId={doctorId} />

      <div className="space-y-4">
        {myPatients.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-8 text-center text-slate-500">
            No patients in your queue right now.
          </p>
        )}
        {myPatients.map((visit, idx) => (
          <div key={visit.id} className="space-y-3">
            {isAtPharmacy(visit.status) ? (
              <DoctorPatientQueueBar visit={visit} queueIndex={idx + 1} />
            ) : (
              <PatientCard
                visit={visit}
                showDoctor={false}
                actions={
                  <div className="space-y-3">
                    <PatientActions
                      visit={visit}
                      role="doctor"
                      onUpdated={refresh}
                    />
                    <TransferDoctorPanel
                      visitId={visit.id}
                      currentDoctorId={doctorId}
                      onTransferred={refresh}
                    />
                  </div>
                }
              />
            )}
            {canWritePrescription(visit.status) && (
              <>
                {!isAtPharmacy(visit.status) && (
                  <>
                    <ConsultationEmrPanel
                      visitId={visit.id}
                      doctorId={doctorId}
                      initialAllergies={visit.patient_allergies}
                    />
                    {visit.medico_legal && (
                      <MlcDetailsPanel visitId={visit.id} />
                    )}
                    <ProcedurePanel visitId={visit.id} />
                  </>
                )}
                <PrescriptionForm
                  visitId={visit.id}
                  doctorId={doctorId}
                  patientAllergies={visit.patient_allergies}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </ConsoleShell>
  );
}
