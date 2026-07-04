"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { TodayCollectionPanel } from "@/components/TodayCollectionPanel";
import { StatusBadge } from "@/components/PatientCard";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { STATUS_LABELS } from "@/lib/status";
import type { Prescription } from "@/lib/prescription-types";
import type { PatientVisit } from "@/lib/types";

function pharmacySort(a: PatientVisit, b: PatientVisit) {
  const rank = (s: PatientVisit["status"]) =>
    s === "at_pharmacy" ? 0 : s === "to_pharmacy" ? 1 : 2;
  const d = rank(a.status) - rank(b.status);
  if (d !== 0) return d;
  return a.token_number - b.token_number;
}

export default function PharmacyPage() {
  const { visits, loading, error } = usePatientVisits({ activeOnly: true });
  const [rxByVisit, setRxByVisit] = useState<
    Record<string, { total: number; pending: number }>
  >({});

  const queue = useMemo(
    () =>
      visits
        .filter((v) => v.status === "to_pharmacy" || v.status === "at_pharmacy")
        .sort(pharmacySort),
    [visits],
  );

  useEffect(() => {
    if (queue.length === 0) return;
    Promise.all(
      queue.map((v) =>
        fetch(`/api/prescriptions?visit_id=${v.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: Prescription | null) => {
            if (!data?.items) return { id: v.id, total: 0, pending: 0 };
            const pending = data.items.filter((i) => !i.dispensed).length;
            return { id: v.id, total: data.items.length, pending };
          }),
      ),
    ).then((rows) => {
      const map: Record<string, { total: number; pending: number }> = {};
      for (const r of rows) map[r.id] = { total: r.total, pending: r.pending };
      setRxByVisit(map);
    });
  }, [queue]);

  const atCounter = queue.filter((v) => v.status === "at_pharmacy").length;
  const waiting = queue.filter((v) => v.status === "to_pharmacy").length;

  return (
    <ConsoleShell
      title="Pharmacy Console"
      subtitle="Dispense prescriptions and send patients outside clinic"
      current="/pharmacy"
    >
      <TodayCollectionPanel variant="pharmacy" />

      <div className="mb-4 flex gap-4 text-sm text-slate-600">
        <span>
          <strong>{queue.length}</strong> in pharmacy queue
        </span>
        <span>
          <strong>{atCounter}</strong> at counter
        </span>
        <span>
          <strong>{waiting}</strong> on the way
        </span>
      </div>

      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-teal-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Queue</th>
              <th className="px-4 py-3 font-semibold">Token</th>
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Consultant</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Prescription</th>
              <th className="px-4 py-3 font-semibold">Waiting</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((visit, idx) => {
              const rx = rxByVisit[visit.id];
              return (
                <tr
                  key={visit.id}
                  className={`border-b border-slate-100 ${
                    visit.status === "at_pharmacy"
                      ? "bg-teal-50/80"
                      : "bg-white"
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-teal-800">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-bold">#{visit.token_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{visit.patient_name}</p>
                    {visit.patient_number != null && (
                      <p className="text-xs text-indigo-700">
                        P-{visit.patient_number}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {visit.doctors?.name ?? "—"}
                    <br />
                    <span className="text-xs">Room {visit.room_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={visit.status} />
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDistanceToNow(new Date(visit.registered_at), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/pharmacy/${visit.id}`}
                      className="inline-block rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700"
                    >
                      {visit.status === "at_pharmacy"
                        ? "Dispense"
                        : "Open Rx"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {queue.length === 0 && !loading && (
          <p className="p-10 text-center text-slate-500">
            Pharmacy queue is empty — patients appear here when doctor sends to
            pharmacy ({STATUS_LABELS.to_pharmacy} / {STATUS_LABELS.at_pharmacy})
          </p>
        )}
      </div>
    </ConsoleShell>
  );
}
