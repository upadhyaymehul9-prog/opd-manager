"use client";

import type { Prescription } from "@/lib/prescription-types";
import type { PatientVisit } from "@/lib/types";

export function PrescriptionCompactQueue({
  visit,
  prescription,
  onExpand,
}: {
  visit: PatientVisit;
  prescription: Prescription;
  onExpand: () => void;
}) {
  const pending = prescription.items.filter((i) => !i.dispensed).length;
  const total = prescription.items.length;

  return (
    <div className="overflow-hidden rounded-xl border border-teal-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-teal-100 bg-teal-50 px-4 py-2.5 text-sm">
        <span className="font-bold text-teal-800">#{visit.token_number}</span>
        <span className="font-medium text-slate-900">{visit.patient_name}</span>
        {visit.patient_number != null && (
          <span className="text-xs font-semibold text-indigo-700">
            P-{visit.patient_number}
          </span>
        )}
        <span
          className={
            pending > 0 ? "font-medium text-amber-800" : "font-medium text-green-700"
          }
        >
          {total} meds · {pending} pending
        </span>
        <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-medium text-white">
          Sent to pharmacy
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="ml-auto text-xs font-semibold text-blue-700 hover:underline"
        >
          Edit medicines
        </button>
      </div>
      <ul className="flex flex-wrap gap-2 px-4 py-3">
        {prescription.items.map((item) => (
          <li
            key={item.id}
            className={`rounded-lg px-2.5 py-1 text-xs ${
              item.dispensed
                ? "bg-green-100 text-green-900 line-through decoration-green-700/50"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            {item.medicine_name.split(" · ")[0]}
            {item.dispensed ? " ✓" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
