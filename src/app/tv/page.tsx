"use client";

import { useEffect, useState } from "react";
import { differenceInMinutes, format } from "date-fns";
import { useDoctors } from "@/hooks/useDoctors";
import { usePatientVisits } from "@/hooks/usePatientVisits";
import {
  DOCTOR_OPD_STATUS_COLORS,
  DOCTOR_OPD_STATUS_LABELS,
  DOCTOR_OPD_STATUS_SIDEBAR_ACCENT,
  isDoctorAvailable,
} from "@/lib/doctor-status";
import {
  getLabReportStatusLabel,
  isLabPending,
  isLabReady,
  isTokenWaiting,
  LAB_REPORT_STATUSES,
  TV_TOKEN_STATUS_LABELS,
} from "@/lib/tv-display";
import type { Doctor, PatientVisit } from "@/lib/types";

export default function TVDisplayPage() {
  const { visits, loading: visitsLoading } = usePatientVisits({ activeOnly: true });
  const { doctors, loading: doctorsLoading } = useDoctors();

  const labReports = visits
    .filter((v) => LAB_REPORT_STATUSES.includes(v.status))
    .sort((a, b) => a.token_number - b.token_number);

  const tokens = [...visits].sort((a, b) => a.token_number - b.token_number);

  const labPending = visits.filter((v) => isLabPending(v.status)).length;
  const labReady = visits.filter((v) => isLabReady(v.status)).length;
  const tokensWaiting = visits.filter((v) => isTokenWaiting(v.status)).length;
  const doctorsAvailable = doctors.filter((d) =>
    isDoctorAvailable(d.opd_status),
  ).length;

  const loading = visitsLoading || doctorsLoading;

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] text-slate-900">
      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-300 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">OPD Manager — TV Display</h1>
            <LiveClock />
          </div>
        </header>

        {loading && (
          <p className="p-6 text-center text-slate-600">Loading…</p>
        )}

        <div className="space-y-6 p-4 md:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Lab Pending" value={labPending} />
            <SummaryCard label="Lab Ready" value={labReady} />
            <SummaryCard label="Tokens Waiting" value={tokensWaiting} />
            <SummaryCard label="Doctors Available" value={doctorsAvailable} />
          </div>

          <TvSection title="Lab Reports">
            <TvTable
              headers={["Case No", "Name", "Test", "Status", "Ready Time"]}
              emptyMessage="No lab reports right now"
              rows={labReports.map((v) => ({
                key: v.id,
                highlight: v.status !== "lab_ready",
                cells: [
                  String(v.token_number),
                  v.patient_name,
                  "—",
                  getLabReportStatusLabel(v.status),
                  v.lab_eta ? format(new Date(v.lab_eta), "hh:mm a") : "—",
                ],
              }))}
            />
          </TvSection>

          <TvSection title="Tokens">
            <TvTable
              headers={[
                "Case No",
                "Name",
                "Doctor",
                "Room",
                "Wait (min)",
                "Status",
              ]}
              emptyMessage="No active tokens"
              rows={tokens.map((v) => ({
                key: v.id,
                highlight: v.status === "calling",
                cells: [
                  String(v.token_number),
                  v.patient_name,
                  v.doctors?.name ?? "—",
                  v.room_number,
                  String(waitMinutes(v)),
                  TV_TOKEN_STATUS_LABELS[v.status],
                ],
              }))}
            />
          </TvSection>
        </div>
      </div>

      <DoctorStatusSidebar doctors={doctors} loading={doctorsLoading} />
    </div>
  );
}

function DoctorStatusSidebar({
  doctors,
  loading,
}: {
  doctors: Doctor[];
  loading: boolean;
}) {
  const sorted = [...doctors].sort((a, b) => {
    if (a.opd_status === "available" && b.opd_status !== "available") return -1;
    if (b.opd_status === "available" && a.opd_status !== "available") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l-4 border-blue-600 bg-slate-900 text-white lg:w-80 xl:w-96">
      <div className="border-b border-slate-700 bg-blue-700 px-4 py-4">
        <h2 className="text-xl font-bold tracking-wide">Doctor Status</h2>
        <p className="mt-1 text-sm text-blue-100">
          Live availability for patients
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {loading && (
          <p className="px-2 py-4 text-center text-slate-400">Loading…</p>
        )}

        {!loading && sorted.length === 0 && (
          <p className="px-2 py-4 text-center text-slate-400">No doctors</p>
        )}

        {sorted.map((doctor) => (
          <div
            key={doctor.id}
            className={`rounded-lg border-l-4 bg-slate-800 p-4 shadow-md ${DOCTOR_OPD_STATUS_SIDEBAR_ACCENT[doctor.opd_status]}`}
          >
            <p className="text-lg font-bold leading-tight">{doctor.name}</p>
            <p className="mt-1 text-sm text-slate-300">
              Room <span className="font-semibold text-white">{doctor.room_number}</span>
              {doctor.specialty ? ` · ${doctor.specialty}` : ""}
            </p>
            <p
              className={`mt-3 inline-block rounded-md px-3 py-1.5 text-sm font-bold ${DOCTOR_OPD_STATUS_COLORS[doctor.opd_status]}`}
            >
              {DOCTOR_OPD_STATUS_LABELS[doctor.opd_status]}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 px-4 py-3 text-center text-xs text-slate-500">
        Updates every few seconds
      </div>
    </aside>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm text-slate-600">
      {now
        ? `${format(now, "EEEE, d MMM yyyy · h:mm a")} · Press F11 for full screen`
        : "Press F11 for full screen"}
    </p>
  );
}

function waitMinutes(visit: PatientVisit) {
  return Math.max(
    0,
    differenceInMinutes(new Date(), new Date(visit.registered_at)),
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white px-4 py-5 text-center shadow-sm">
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

function TvSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <h2 className="border-b border-slate-300 bg-[#e9ecef] px-4 py-2 text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function TvTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: {
    key: string;
    cells: string[];
    highlight?: boolean;
    statusClass?: string;
  }[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-slate-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-300 bg-[#f8f9fa]">
            {headers.map((h) => (
              <th
                key={h}
                className="border-r border-slate-200 px-3 py-2 font-semibold last:border-r-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-slate-200 ${
                row.highlight ? "bg-[#fff3cd]" : "bg-white"
              }`}
            >
              {row.cells.map((cell, i) => {
                const isStatusCol = headers[i] === "Status";
                return (
                  <td
                    key={`${row.key}-${i}`}
                    className="border-r border-slate-200 px-3 py-2 last:border-r-0"
                  >
                    {isStatusCol && row.statusClass ? (
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${row.statusClass}`}
                      >
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
