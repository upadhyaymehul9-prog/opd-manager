"use client";

import { use } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DoctorStatusPanel } from "@/components/DoctorStatusPanel";
import { PrescriptionForm } from "@/components/PrescriptionForm";
import { PatientCard } from "@/components/PatientCard";
import { PatientActions } from "@/components/PatientActions";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { DOCTOR_ACTIONS, canWritePrescription, getRelevantPatients } from "@/lib/status";

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
      {loading && <p className="text-slate-600">Loading patients…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <DoctorStatusPanel doctorId={doctorId} />

      <div className="space-y-4">
        {myPatients.length === 0 && !loading && (
          <p className="rounded-xl bg-white p-8 text-center text-slate-500">
            No patients in your queue right now.
          </p>
        )}
        {myPatients.map((visit) => (
          <div key={visit.id} className="space-y-3">
            <PatientCard
              visit={visit}
              showDoctor={false}
              actions={
                <PatientActions
                  visit={visit}
                  actions={DOCTOR_ACTIONS}
                  onUpdated={refresh}
                />
              }
            />
            {canWritePrescription(visit.status) && (
              <PrescriptionForm visitId={visit.id} doctorId={doctorId} />
            )}
          </div>
        ))}
      </div>
    </ConsoleShell>
  );
}
