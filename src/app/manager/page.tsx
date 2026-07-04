"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DateRangeBar } from "@/components/DateRangeBar";
import { StatusBadge } from "@/components/PatientCard";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import { todayStr } from "@/lib/date-range";
import type { PatientStatus } from "@/lib/types";

const FLOW_STAGES: { key: string; label: string; statuses: PatientStatus[] }[] =
  [
    {
      key: "reception",
      label: "Reception",
      statuses: ["registered"],
    },
    {
      key: "doctor",
      label: "Doctor",
      statuses: ["calling", "in_consultation", "in_followup", "return_to_doctor"],
    },
    {
      key: "lab",
      label: "Lab",
      statuses: ["to_lab", "at_lab", "lab_processing", "lab_ready"],
    },
    {
      key: "radiology",
      label: "Radiology",
      statuses: [
        "to_radiology",
        "at_radiology",
        "radio_processing",
        "radio_ready",
      ],
    },
    {
      key: "pharmacy",
      label: "Pharmacy",
      statuses: ["to_pharmacy", "at_pharmacy"],
    },
    {
      key: "exit",
      label: "Completed",
      statuses: ["completed"],
    },
  ];

function stageForStatus(status: PatientStatus) {
  return (
    FLOW_STAGES.find((s) => s.statuses.includes(status))?.label ?? status
  );
}

export default function ManagerPage() {
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const queryRange = useMemo(() => {
    if (fromDate <= toDate) return { from: fromDate, to: toDate };
    return { from: toDate, to: fromDate };
  }, [fromDate, toDate]);

  const isToday =
    queryRange.from === todayStr() && queryRange.to === todayStr();

  const { visits, loading, error } = usePatientVisits({
    from: queryRange.from,
    to: queryRange.to,
  });

  const active = visits.filter((v) => v.status !== "completed");
  const completedToday = visits.filter((v) => v.status === "completed");

  const byStage = FLOW_STAGES.map((stage) => ({
    ...stage,
    label:
      stage.key === "exit" && isToday ? "Exited today" : stage.label,
    count:
      stage.key === "exit"
        ? completedToday.length
        : active.filter((v) => stage.statuses.includes(v.status)).length,
  }));

  return (
    <ConsoleShell
      title="OPD Manager"
      subtitle="Full clinic view — every patient from entry to exit"
      current="/manager"
    >
      <DateRangeBar
        fromDate={fromDate}
        toDate={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
        onPreset={(from, to) => {
          setFromDate(from);
          setToDate(to);
        }}
      />

      {loading && <p className="text-slate-600">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {byStage.map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
          >
            <p className="text-3xl font-black text-slate-900">{s.count}</p>
            <p className="text-sm text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm text-slate-600">
          <span>
            <strong>{active.length}</strong> in clinic now
          </span>
          <span>
            <strong>{completedToday.length}</strong> completed
          </span>
        </div>
        <Link
          href="/records"
          className="text-sm font-medium text-indigo-700 hover:underline"
        >
          Patient records & bills →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Patient ID</th>
              <th className="px-4 py-3 font-semibold">Token</th>
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Consultant</th>
              <th className="px-4 py-3 font-semibold">Room</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Registered</th>
              <th className="px-4 py-3 font-semibold">ETAs</th>
              <th className="px-4 py-3 font-semibold">Record</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr
                key={v.id}
                className={`border-b border-slate-100 ${v.status === "completed" ? "opacity-50" : ""}`}
              >
                <td className="px-4 py-3 font-medium text-indigo-800">
                  {v.patient_number != null ? `P-${v.patient_number}` : "—"}
                </td>
                <td className="px-4 py-3 font-bold">#{v.token_number}</td>
                <td className="px-4 py-3">{v.patient_name}</td>
                <td className="px-4 py-3">{v.doctors?.name ?? "—"}</td>
                <td className="px-4 py-3">{v.room_number}</td>
                <td className="px-4 py-3">{stageForStatus(v.status)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {format(new Date(v.registered_at), "h:mm a")}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {v.lab_eta &&
                    `Lab ${format(new Date(v.lab_eta), "h:mm a")}`}
                  {v.lab_eta && v.radio_eta && " · "}
                  {v.radio_eta &&
                    `Radio ${format(new Date(v.radio_eta), "h:mm a")}`}
                  {!v.lab_eta && !v.radio_eta && "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/records/${v.id}`}
                    className="text-indigo-700 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visits.length === 0 && !loading && (
          <p className="p-8 text-center text-slate-500">No visits in this period</p>
        )}
      </div>
    </ConsoleShell>
  );
}
