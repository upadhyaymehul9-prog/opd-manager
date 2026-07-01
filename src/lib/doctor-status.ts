import type { DoctorOpdStatus } from "./types";

export const DOCTOR_OPD_STATUS_LABELS: Record<DoctorOpdStatus, string> = {
  offline: "Not in OPD",
  available: "Available in OPD",
  busy: "Busy",
  on_leave: "On Leave",
  on_round: "On Round",
  in_surgery: "In Surgery",
  in_dressing: "In Dressing",
};

export const DOCTOR_OPD_STATUS_COLORS: Record<DoctorOpdStatus, string> = {
  offline: "bg-slate-500 text-white",
  available: "bg-green-500 text-white",
  busy: "bg-orange-500 text-white",
  on_leave: "bg-red-500 text-white",
  on_round: "bg-amber-500 text-white",
  in_surgery: "bg-purple-600 text-white",
  in_dressing: "bg-blue-500 text-white",
};

/** Softer badges for tables */
export const DOCTOR_OPD_STATUS_TABLE_COLORS: Record<DoctorOpdStatus, string> = {
  offline: "bg-slate-100 text-slate-700",
  available: "bg-green-100 text-green-900",
  busy: "bg-orange-100 text-orange-900",
  on_leave: "bg-red-100 text-red-900",
  on_round: "bg-amber-100 text-amber-900",
  in_surgery: "bg-purple-100 text-purple-900",
  in_dressing: "bg-blue-100 text-blue-900",
};

export const DOCTOR_OPD_STATUS_OPTIONS: {
  value: DoctorOpdStatus;
  label: string;
}[] = [
  { value: "available", label: "Available in OPD" },
  { value: "busy", label: "Busy" },
  { value: "on_leave", label: "On Leave" },
  { value: "on_round", label: "On Round" },
  { value: "in_surgery", label: "In Surgery" },
  { value: "in_dressing", label: "In Dressing" },
  { value: "offline", label: "Not in OPD (Leave)" },
];

export const DOCTOR_OPD_STATUS_SIDEBAR_ACCENT: Record<DoctorOpdStatus, string> =
  {
    offline: "border-l-slate-400",
    available: "border-l-green-400",
    busy: "border-l-orange-400",
    on_leave: "border-l-red-400",
    on_round: "border-l-amber-400",
    in_surgery: "border-l-purple-400",
    in_dressing: "border-l-blue-400",
  };

export function isDoctorAvailable(status: DoctorOpdStatus) {
  return status === "available";
}
