"use client";

import { format } from "date-fns";
import type { PatientVisit } from "@/lib/types";

export function ConsultationBillReceipt({ visit }: { visit: PatientVisit }) {
  if (!visit.consultation_bill_no || visit.consultation_fee == null) {
    return null;
  }

  return (
    <div className="consultation-bill-print rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900">Consultation Bill</h2>
        <p className="text-sm text-slate-600">OPD Manager Clinic</p>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Bill No</dt>
          <dd className="font-medium">{visit.consultation_bill_no}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Date</dt>
          <dd>
            {visit.consultation_paid_at
              ? format(new Date(visit.consultation_paid_at), "d MMM yyyy, h:mm a")
              : format(new Date(visit.registered_at), "d MMM yyyy, h:mm a")}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Patient</dt>
          <dd className="font-medium">
            {visit.patient_number != null && `P-${visit.patient_number} · `}
            {visit.patient_name}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Token</dt>
          <dd>#{visit.token_number}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Consultant</dt>
          <dd>{visit.doctors?.name ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Room</dt>
          <dd>{visit.room_number}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
          <dt>Consultation fee</dt>
          <dd>₹{visit.consultation_fee.toFixed(2)}</dd>
        </div>
        {visit.consultation_payment_mode && (
          <div className="flex justify-between text-slate-600">
            <dt>Payment</dt>
            <dd className="uppercase">{visit.consultation_payment_mode}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
