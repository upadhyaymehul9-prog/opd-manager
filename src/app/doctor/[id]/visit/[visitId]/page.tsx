"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ConsoleShell } from "@/components/ConsoleShell";
import { StatusBadge } from "@/components/PatientCard";
import { PatientActions } from "@/components/PatientActions";
import { TransferDoctorPanel } from "@/components/TransferDoctorPanel";
import { EditPatientDetailsPanel } from "@/components/EditPatientDetailsPanel";
import {
  DoctorWorkspaceTabs,
  isAtPharmacy,
  type WorkspaceTab,
} from "@/components/DoctorWorkspaceTabs";
import { deletePatient } from "@/hooks/usePatientVisits";
import type { PatientVisit } from "@/lib/types";
import type { Prescription } from "@/lib/prescription-types";
import type { PharmacyBillView } from "@/lib/billing-types";

type FocusData = {
  visit: PatientVisit;
  prescription: Prescription | null;
  bill: PharmacyBillView | null;
  appointment: { scheduled_at: string; source: string } | null;
  vitals_history: { id: string; registered_at: string; vitals_bp: string | null }[];
};

const AVATAR_COLORS = [
  "bg-teal-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-sky-600",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function PatientAvatar({ name }: { name: string }) {
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColor(name)}`}
    >
      {initials(name)}
    </div>
  );
}

type StepStatus = "done" | "active" | "pending";

const STEP_STYLES: Record<StepStatus, string> = {
  done: "bg-emerald-100 text-emerald-800",
  active: "bg-amber-100 text-amber-900",
  pending: "bg-slate-100 text-slate-500",
};

function JourneyStepRow({
  icon,
  label,
  status,
  detail,
}: {
  icon: string;
  label: string;
  status: StepStatus;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${STEP_STYLES[status]}`}
          aria-hidden
        >
          {icon}
        </span>
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STEP_STYLES[status]}`}
      >
        {detail}
      </span>
    </div>
  );
}

function buildJourneySteps(data: FocusData): {
  icon: string;
  label: string;
  status: StepStatus;
  detail: string;
}[] {
  const { visit, prescription, bill, appointment } = data;
  const steps: { icon: string; label: string; status: StepStatus; detail: string }[] = [];

  steps.push({
    icon: "📅",
    label: appointment ? "Appointment" : "Registration",
    status: "done",
    detail: appointment ? "Booked" : "Walk-in",
  });

  const consultDone =
    visit.status !== "registered" && visit.status !== "calling";
  const consultActive = visit.status === "calling";
  steps.push({
    icon: "🩺",
    label: "Consultation",
    status: consultDone ? "done" : consultActive ? "active" : "pending",
    detail: consultDone ? "Completed" : consultActive ? "Calling" : "Waiting",
  });

  if (visit.lab_referred) {
    const labDone = ["lab_ready", "return_to_doctor", "in_followup", "to_pharmacy", "at_pharmacy", "completed"].includes(visit.status);
    const labActive = ["to_lab", "lab_calling", "at_lab", "lab_processing"].includes(visit.status);
    steps.push({
      icon: "🧪",
      label: "Lab",
      status: labDone ? "done" : labActive ? "active" : "pending",
      detail: labDone ? "Report ready" : labActive ? "In progress" : "Referred",
    });
  }

  if (visit.radio_referred) {
    const radioDone = ["radio_ready", "return_to_doctor", "in_followup", "to_pharmacy", "at_pharmacy", "completed"].includes(visit.status);
    const radioActive = ["to_radiology", "radio_calling", "at_radiology", "radio_processing"].includes(visit.status);
    steps.push({
      icon: "📷",
      label: "Radiology",
      status: radioDone ? "done" : radioActive ? "active" : "pending",
      detail: radioDone ? "Report ready" : radioActive ? "In progress" : "Referred",
    });
  }

  const rxStatus = prescription?.status;
  steps.push({
    icon: "📋",
    label: "Prescription",
    status: rxStatus === "dispensed" ? "done" : prescription ? "active" : "pending",
    detail:
      rxStatus === "dispensed"
        ? "Dispensed"
        : rxStatus === "partially_dispensed"
          ? "Partially dispensed"
          : rxStatus === "sent_to_pharmacy"
            ? "Sent to pharmacy"
            : prescription
              ? "Draft"
              : "Not written",
  });

  steps.push({
    icon: "💳",
    label: "Billing",
    status: bill ? "done" : "pending",
    detail: bill ? `Paid ₹${bill.grand_total.toFixed(2)}` : "Pending",
  });

  return steps;
}

function parseSystolic(bp: string | null): number | null {
  if (!bp) return null;
  const n = Number(bp.split("/")[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function VitalsTrendChart({
  points,
}: {
  points: { label: string; systolic: number }[];
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Not enough prior BP readings for this patient yet.
      </p>
    );
  }

  const width = 260;
  const height = 90;
  const pad = 8;
  const values = points.map((p) => p.systolic);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((p.systolic - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const last = points[points.length - 1];
  const lastCoord = coords[coords.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full text-teal-600">
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2} fill="currentColor" />
        ))}
        <text x={lastCoord.x} y={lastCoord.y - 8} fontSize={11} fill="currentColor" textAnchor="end" fontWeight={600}>
          {last.systolic}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

export default function DoctorPatientFocusPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { id: doctorId, visitId } = use(params);
  const [data, setData] = useState<FocusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("emr");
  const [busyDelete, setBusyDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits/${visitId}/focus`);
      if (!res.ok) throw new Error("Could not load patient");
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load patient");
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <ConsoleShell title="Patient" current="/doctor">
        <p className="text-slate-600">Loading patient…</p>
      </ConsoleShell>
    );
  }

  if (!data) {
    return (
      <ConsoleShell title="Patient" current="/doctor">
        <p className="text-red-600">{error ?? "Not found"}</p>
      </ConsoleShell>
    );
  }

  const { visit, prescription } = data;

  const chartPoints = [
    ...data.vitals_history
      .map((v) => ({
        label: formatDistanceToNow(new Date(v.registered_at), { addSuffix: false }),
        systolic: parseSystolic(v.vitals_bp),
      }))
      .filter((p): p is { label: string; systolic: number } => p.systolic !== null),
    ...(parseSystolic(visit.vitals_bp) !== null
      ? [{ label: "Today", systolic: parseSystolic(visit.vitals_bp)! }]
      : []),
  ];

  async function handleRemove() {
    const ok = window.confirm(
      `Remove ${visit.patient_name} (Token #${visit.token_number}) from workflow?\n\nThis deletes the visit and related entries for this OPD encounter.`,
    );
    if (!ok) return;
    setBusyDelete(true);
    try {
      await deletePatient(visit.id);
      window.location.href = `/doctor/${doctorId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove patient");
      setBusyDelete(false);
    }
  }

  return (
    <ConsoleShell title={visit.patient_name} subtitle="Patient focus view" current="/doctor">
      <Link href={`/doctor/${doctorId}`} className="mb-4 inline-block text-sm text-teal-700">
        ← Back to queue
      </Link>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Header */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PatientAvatar name={visit.patient_name} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{visit.patient_name}</h2>
                <StatusBadge status={visit.status} />
              </div>
              <p className="mt-0.5 text-sm text-slate-600">
                {visit.patient_number != null ? `P-${visit.patient_number} · ` : ""}
                #{visit.token_number}
                {visit.age ? ` · ${visit.age} yrs` : ""}
                {visit.gender ? ` · ${visit.gender}` : ""}
                {data.vitals_history.length > 0 &&
                  ` · Prior visit ${formatDistanceToNow(new Date(data.vitals_history[data.vitals_history.length - 1].registered_at), { addSuffix: true })}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {visit.patient_type === "old" ? "Follow-up" : "New patient"}
                </span>
                {visit.medico_legal && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    MLC
                  </span>
                )}
                {visit.patient_allergies && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    Allergy: {visit.patient_allergies}
                  </span>
                )}
                {visit.follow_up_date && (
                  <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                    Follow-up due {visit.follow_up_date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(visit.vitals_bp || visit.vitals_pulse != null || visit.vitals_weight != null) && (
            <div className="flex gap-5">
              {visit.vitals_bp && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">BP</p>
                  <p className="text-lg font-bold text-slate-900">{visit.vitals_bp}</p>
                </div>
              )}
              {visit.vitals_pulse != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Pulse</p>
                  <p className="text-lg font-bold text-slate-900">{visit.vitals_pulse}</p>
                </div>
              )}
              {visit.vitals_weight != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Weight</p>
                  <p className="text-lg font-bold text-slate-900">{visit.vitals_weight}kg</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-4 space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PatientActions visit={visit} role="doctor" onUpdated={load} />
        <EditPatientDetailsPanel visit={visit} onUpdated={load} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 pt-2">
          <TransferDoctorPanel
            visitId={visit.id}
            currentDoctorId={doctorId}
            onTransferred={load}
          />
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={busyDelete}
            className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
          >
            {busyDelete ? "Removing..." : "Remove patient"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Patient journey</h3>
            <div className="mt-1 divide-y divide-slate-100">
              {buildJourneySteps(data).map((step) => (
                <JourneyStepRow key={step.label} {...step} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Clinical workspace</h3>
            <DoctorWorkspaceTabs
              visit={visit}
              doctorId={doctorId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onRefresh={load}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Systolic BP trend</h3>
            <VitalsTrendChart points={chartPoints} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Latest prescription</h3>
              {isAtPharmacy(visit.status) && (
                <span className="text-xs font-medium text-teal-700">At pharmacy</span>
              )}
            </div>
            {prescription && prescription.items.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {prescription.items.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="font-medium text-slate-800">
                      {item.medicine_name}
                      {item.dispensed && (
                        <span className="ml-1.5 text-xs font-normal text-emerald-700">
                          · Dispensed
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[item.dose, item.frequency, item.duration_days ? `${item.duration_days} days` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No prescription on file yet.</p>
            )}
          </div>

          {data.bill && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Pharmacy bill</h3>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                ₹{data.bill.grand_total.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                Bill {data.bill.bill_no} · {data.bill.payment_mode.toUpperCase()}
              </p>
            </div>
          )}
        </div>
      </div>
    </ConsoleShell>
  );
}
