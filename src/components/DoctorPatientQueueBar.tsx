"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/PatientCard";
import type { Prescription } from "@/lib/prescription-types";
import type { PatientVisit } from "@/lib/types";

export function DoctorPatientQueueBar({
  visit,
  queueIndex,
}: {
  visit: PatientVisit;
  queueIndex: number;
}) {
  const [rx, setRx] = useState<{ total: number; pending: number } | null>(null);

  useEffect(() => {
    fetch(`/api/prescriptions?visit_id=${visit.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Prescription | null) => {
        if (!data?.items) {
          setRx({ total: 0, pending: 0 });
          return;
        }
        const pending = data.items.filter((i) => !i.dispensed && !i.skipped).length;
        setRx({ total: data.items.length, pending });
      })
      .catch(() => setRx(null));
  }, [visit.id, visit.status]);

  const hint =
    visit.status === "at_pharmacy"
      ? "At pharmacy — edit Rx below"
      : "En route to pharmacy — edit Rx below";

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <tbody>
          <tr
            className={
              visit.status === "at_pharmacy"
                ? "bg-teal-50/80"
                : "bg-amber-50/50"
            }
          >
            <td className="w-12 px-4 py-3 font-bold text-teal-800">{queueIndex}</td>
            <td className="w-16 px-3 py-3 font-bold">#{visit.token_number}</td>
            <td className="min-w-[120px] px-3 py-3">
              <p className="font-medium">{visit.patient_name}</p>
              {visit.patient_number != null && (
                <p className="text-xs text-indigo-700">P-{visit.patient_number}</p>
              )}
            </td>
            <td className="px-3 py-3">
              <StatusBadge status={visit.status} />
            </td>
            <td className="px-3 py-3">
              {rx ? (
                rx.total > 0 ? (
                  <span
                    className={
                      rx.pending > 0
                        ? "font-medium text-amber-800"
                        : "text-green-700"
                    }
                  >
                    {rx.total} meds · {rx.pending} pending
                  </span>
                ) : (
                  <span className="text-amber-700">No Rx</span>
                )
              ) : (
                <span className="text-slate-400">…</span>
              )}
            </td>
            <td className="px-3 py-3 text-xs text-slate-500">
              {formatDistanceToNow(new Date(visit.registered_at), {
                addSuffix: true,
              })}
            </td>
            <td className="px-4 py-3 text-right text-xs font-medium text-teal-800">
              {hint}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
