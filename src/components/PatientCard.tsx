import { format, formatDistanceToNow } from "date-fns";
import type { PatientVisit } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

export function StatusBadge({ status }: { status: PatientVisit["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PatientCard({
  visit,
  actions,
  showDoctor = true,
}: {
  visit: PatientVisit;
  actions?: React.ReactNode;
  showDoctor?: boolean;
}) {
  const doctor = visit.doctors;

  return (
    <article className="card overflow-hidden">
      <div className="card-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {visit.patient_number != null && (
                <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                  P-{visit.patient_number}
                </span>
              )}
              {visit.patient_abha_id && (
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                  ABHA {visit.patient_abha_id}
                </span>
              )}
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">
                #{visit.token_number}
              </span>
              <h3 className="text-lg font-semibold text-slate-900">
                {visit.patient_name}
              </h3>
            </div>
            {showDoctor && doctor && (
              <p className="mt-1 text-sm text-slate-600">
                {doctor.name} · Room {visit.room_number}
                {doctor.specialty ? ` · ${doctor.specialty}` : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Registered {format(new Date(visit.registered_at), "h:mm a")} (
              {formatDistanceToNow(new Date(visit.registered_at), {
                addSuffix: true,
              })}
              )
            </p>
          </div>
          <StatusBadge status={visit.status} />
        </div>
      </div>

      {(visit.medico_legal ||
        visit.patient_allergies ||
        visit.lab_eta ||
        visit.radio_eta) && (
        <div className="space-y-2 border-b border-slate-100 px-4 py-3">
          {visit.medico_legal && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
              MLC — medico-legal case
            </p>
          )}
          {visit.patient_allergies && (
            <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-900">
              Allergy: {visit.patient_allergies}
            </p>
          )}
          {(visit.lab_eta || visit.radio_eta) && (
            <div className="flex flex-wrap gap-2 text-sm">
              {visit.lab_eta && (
                <span className="rounded-md bg-purple-50 px-2 py-1 text-purple-800">
                  Lab ETA: {format(new Date(visit.lab_eta), "h:mm a")}
                </span>
              )}
              {visit.radio_eta && (
                <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-800">
                  Radiology ETA: {format(new Date(visit.radio_eta), "h:mm a")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {actions && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          {actions}
        </div>
      )}
    </article>
  );
}

export function ActionButton({
  label,
  onClick,
  variant = "secondary",
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "lab" | "radio" | "pharmacy";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    lab: "bg-purple-600 text-white hover:bg-purple-700",
    radio: "bg-indigo-600 text-white hover:bg-indigo-700",
    pharmacy: "bg-teal-600 text-white hover:bg-teal-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition disabled:opacity-50 ${styles[variant]}`}
    >
      {label}
    </button>
  );
}
