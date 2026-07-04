"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { DateRangeBar } from "@/components/DateRangeBar";
import { todayStr } from "@/lib/date-range";

export type ReportTab =
  | "overview"
  | "reception"
  | "doctor"
  | "lab"
  | "radiology"
  | "pharmacy"
  | "medicines";

export type ReportData = {
  from: string;
  to: string;
  summary: {
    total_visits: number;
    completed: number;
    new_patients: number;
    medicines_dispensed_lines: number;
    procedures: number;
  };
  revenue: {
    total: number;
    reception: { bills: number; amount: number };
    pharmacy: { bills: number; amount: number; gst: number };
    procedures: { count: number; amount: number };
    lab: { referrals: number; reports_ready: number; amount: number };
    radiology: { referrals: number; reports_ready: number; amount: number };
  };
  medicine_wise: {
    medicine_name: string;
    patients: number;
    total_qty: number;
    patient_rows: {
      patient_name: string;
      token_number: number;
      patient_number: number | null;
      quantity: number;
      dispensed_at: string | null;
      doctor_name: string;
    }[];
  }[];
  patient_medicine: {
    medicine_name: string;
    quantity: number;
    patient_name: string;
    patient_number: number | null;
    token_number: number;
    doctor_name: string;
    dispensed_at: string | null;
  }[];
  doctor_wise: {
    doctor_id: string;
    doctor_name: string;
    total: number;
    completed: number;
    consultation_revenue: number;
  }[];
  procedures: { procedure_type: string; count: number }[];
  pharmacy_bills: {
    bill_no: string;
    patient_name: string;
    token_number: number;
    payment_mode: string;
    grand_total: number;
    created_at: string;
  }[];
  reception_registrations: {
    token_number: number;
    patient_name: string;
    patient_type: string;
    doctor_name: string;
    consultation_fee: number | null;
    consultation_paid_at: string | null;
    registered_at: string;
    status: string;
  }[];
  lab_visits: {
    token_number: number;
    patient_name: string;
    doctor_name: string;
    status: string;
    registered_at: string;
  }[];
  radiology_visits: {
    token_number: number;
    patient_name: string;
    doctor_name: string;
    status: string;
    registered_at: string;
  }[];
};

const TABS: { id: ReportTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reception", label: "Reception" },
  { id: "doctor", label: "Doctor" },
  { id: "lab", label: "Lab" },
  { id: "radiology", label: "Radiology" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "medicines", label: "Medicines" },
];

const PROCEDURE_LABELS: Record<string, string> = {
  iv_drip: "IV drip",
  dressing: "Dressing",
  nebulisation: "Nebulisation",
  injection: "Injection",
  other: "Other",
};

type ReportsDashboardProps = {
  initialTab?: ReportTab;
  showTabs?: ReportTab[];
  fromDate?: string;
  toDate?: string;
  hideDateBar?: boolean;
};

export function ReportsDashboard({
  initialTab = "overview",
  showTabs,
  fromDate: controlledFrom,
  toDate: controlledTo,
  hideDateBar = false,
}: ReportsDashboardProps) {
  const [internalFrom, setInternalFrom] = useState(todayStr);
  const [internalTo, setInternalTo] = useState(todayStr);
  const fromDate = controlledFrom ?? internalFrom;
  const toDate = controlledTo ?? internalTo;
  const [tab, setTab] = useState<ReportTab>(initialTab);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMedicine, setExpandedMedicine] = useState<string | null>(null);

  const visibleTabs = showTabs
    ? TABS.filter((t) => showTabs.includes(t.id))
    : TABS;

  const queryRange = useMemo(() => {
    if (fromDate <= toDate) return { from: fromDate, to: toDate };
    return { from: toDate, to: fromDate };
  }, [fromDate, toDate]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: queryRange.from,
      to: queryRange.to,
    });
    fetch(`/api/reports?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then(setData)
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [queryRange]);

  function setPreset(from: string, to: string) {
    if (controlledFrom == null) setInternalFrom(from);
    if (controlledTo == null) setInternalTo(to);
  }

  return (
    <div>
      {!hideDateBar && (
        <DateRangeBar
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setInternalFrom}
          onToChange={setInternalTo}
          onPreset={setPreset}
        />
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border border-b-0 border-slate-200 bg-white text-slate-900"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-600">Loading reports…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {data && tab === "overview" && (
        <OverviewTab data={data} onTab={setTab} />
      )}
      {data && tab === "reception" && <ReceptionTab data={data} />}
      {data && tab === "doctor" && <DoctorTab data={data} />}
      {data && tab === "lab" && <LabTab data={data} />}
      {data && tab === "radiology" && <RadiologyTab data={data} />}
      {data && tab === "pharmacy" && <PharmacyTab data={data} />}
      {data && tab === "medicines" && (
        <MedicinesTab
          data={data}
          expandedMedicine={expandedMedicine}
          onExpand={setExpandedMedicine}
        />
      )}
    </div>
  );
}

function OverviewTab({
  data,
  onTab,
}: {
  data: ReportData;
  onTab: (tab: ReportTab) => void;
}) {
  const { revenue, summary } = data;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6">
        <h2 className="text-lg font-bold text-slate-900">Total revenue</h2>
        <p className="mt-1 text-3xl font-bold text-emerald-800">
          ₹{Math.round(revenue.total)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Reception + Pharmacy + Procedures for selected period
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Total visits", summary.total_visits],
          ["Completed", summary.completed],
          ["New patients", summary.new_patients],
          ["Medicines dispensed", summary.medicines_dispensed_lines],
          ["Procedures", summary.procedures],
          ["Pharmacy bills", revenue.pharmacy.bills],
        ].map(([label, value]) => (
          <StatCard key={String(label)} label={String(label)} value={value} />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RevenueCard
          title="Reception"
          amount={revenue.reception.amount}
          detail={`${revenue.reception.bills} consultation bill(s)`}
          onClick={() => onTab("reception")}
        />
        <RevenueCard
          title="Pharmacy"
          amount={revenue.pharmacy.amount}
          detail={`${revenue.pharmacy.bills} bill(s) · GST ₹${Math.round(revenue.pharmacy.gst)}`}
          onClick={() => onTab("pharmacy")}
        />
        <RevenueCard
          title="Procedures"
          amount={revenue.procedures.amount}
          detail={`${revenue.procedures.count} procedure(s)`}
          onClick={() => onTab("doctor")}
        />
        <RevenueCard
          title="Lab"
          amount={revenue.lab.amount}
          detail={`${revenue.lab.referrals} referred · ${revenue.lab.reports_ready} ready`}
          onClick={() => onTab("lab")}
          noCurrency={revenue.lab.amount === 0}
        />
        <RevenueCard
          title="Radiology"
          amount={revenue.radiology.amount}
          detail={`${revenue.radiology.referrals} referred · ${revenue.radiology.reports_ready} ready`}
          onClick={() => onTab("radiology")}
          noCurrency={revenue.radiology.amount === 0}
        />
        <RevenueCard
          title="Medicines"
          amount={null}
          detail={`${data.medicine_wise.length} medicine type(s) dispensed`}
          onClick={() => onTab("medicines")}
          noCurrency
        />
      </section>
    </div>
  );
}

function ReceptionTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Registrations" value={data.summary.total_visits} />
        <StatCard label="New patients" value={data.summary.new_patients} />
        <StatCard
          label="Consultation revenue"
          value={`₹${Math.round(data.revenue.reception.amount)}`}
        />
        <StatCard
          label="Consultation bills"
          value={data.revenue.reception.bills}
        />
      </section>
      <DataTable
        title="Registration register"
        columns={["Token", "Patient", "Type", "Doctor", "Fee", "Paid", "Time"]}
        rows={data.reception_registrations.map((r) => [
          `#${r.token_number}`,
          r.patient_name,
          r.patient_type,
          r.doctor_name,
          r.consultation_fee ? `₹${r.consultation_fee}` : "—",
          r.consultation_paid_at
            ? format(new Date(r.consultation_paid_at), "h:mm a")
            : "—",
          format(new Date(r.registered_at), "d MMM h:mm a"),
        ])}
        empty="No registrations in this period."
      />
    </div>
  );
}

function DoctorTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <DataTable
        title="Doctor-wise register"
        columns={[
          "Doctor",
          "Patients",
          "Completed",
          "Consultation ₹",
        ]}
        rows={data.doctor_wise.map((r) => [
          r.doctor_name,
          String(r.total),
          String(r.completed),
          r.consultation_revenue ? `₹${Math.round(r.consultation_revenue)}` : "—",
        ])}
        empty="No doctor activity in this period."
      />
      {data.procedures.length > 0 && (
        <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
          <h2 className="font-semibold">Procedures</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.procedures.map((p) => (
              <li key={p.procedure_type}>
                {PROCEDURE_LABELS[p.procedure_type] ?? p.procedure_type}:{" "}
                <strong>{p.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LabTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Lab referrals" value={data.revenue.lab.referrals} />
        <StatCard label="Reports ready" value={data.revenue.lab.reports_ready} />
        <StatCard
          label="Pending"
          value={Math.max(
            0,
            data.revenue.lab.referrals - data.revenue.lab.reports_ready,
          )}
        />
      </section>
      <DataTable
        title="Lab patient register"
        columns={["Token", "Patient", "Doctor", "Status", "Registered"]}
        rows={data.lab_visits.map((r) => [
          `#${r.token_number}`,
          r.patient_name,
          r.doctor_name,
          r.status.replace(/_/g, " "),
          format(new Date(r.registered_at), "d MMM h:mm a"),
        ])}
        empty="No lab patients in this period."
      />
    </div>
  );
}

function RadiologyTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Radiology referrals"
          value={data.revenue.radiology.referrals}
        />
        <StatCard
          label="Reports ready"
          value={data.revenue.radiology.reports_ready}
        />
        <StatCard
          label="Pending"
          value={Math.max(
            0,
            data.revenue.radiology.referrals -
              data.revenue.radiology.reports_ready,
          )}
        />
      </section>
      <DataTable
        title="Radiology patient register"
        columns={["Token", "Patient", "Doctor", "Status", "Registered"]}
        rows={data.radiology_visits.map((r) => [
          `#${r.token_number}`,
          r.patient_name,
          r.doctor_name,
          r.status.replace(/_/g, " "),
          format(new Date(r.registered_at), "d MMM h:mm a"),
        ])}
        empty="No radiology patients in this period."
      />
    </div>
  );
}

function PharmacyTab({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pharmacy bills" value={data.revenue.pharmacy.bills} />
        <StatCard
          label="Revenue"
          value={`₹${Math.round(data.revenue.pharmacy.amount)}`}
        />
        <StatCard
          label="GST collected"
          value={`₹${Math.round(data.revenue.pharmacy.gst)}`}
        />
        <StatCard
          label="Medicine lines"
          value={data.summary.medicines_dispensed_lines}
        />
      </section>
      <DataTable
        title="Pharmacy bill register"
        columns={["Bill no", "Patient", "Token", "Mode", "Amount", "Time"]}
        rows={data.pharmacy_bills.map((b) => [
          b.bill_no,
          b.patient_name,
          `#${b.token_number}`,
          b.payment_mode.toUpperCase(),
          `₹${Math.round(b.grand_total)}`,
          format(new Date(b.created_at), "d MMM h:mm a"),
        ])}
        empty="No pharmacy bills in this period."
      />
    </div>
  );
}

function MedicinesTab({
  data,
  expandedMedicine,
  onExpand,
}: {
  data: ReportData;
  expandedMedicine: string | null;
  onExpand: (name: string | null) => void;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Medicine-wise summary</h2>
        <p className="text-xs text-slate-500">
          Total quantity used — click a row to see patient-wise breakdown
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-600">
              <th className="pb-2">Medicine</th>
              <th className="pb-2">Patients</th>
              <th className="pb-2">Total qty</th>
            </tr>
          </thead>
          <tbody>
            {data.medicine_wise.map((row) => (
              <Fragment key={row.medicine_name}>
                <tr
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() =>
                    onExpand(
                      expandedMedicine === row.medicine_name
                        ? null
                        : row.medicine_name,
                    )
                  }
                >
                  <td className="py-2 font-medium">
                    {expandedMedicine === row.medicine_name ? "▾ " : "▸ "}
                    {row.medicine_name}
                  </td>
                  <td className="py-2">{row.patients}</td>
                  <td className="py-2 font-semibold">{row.total_qty}</td>
                </tr>
                {expandedMedicine === row.medicine_name && (
                  <tr>
                    <td colSpan={3} className="bg-slate-50 px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-600">
                            <th className="pb-1 text-left">Patient</th>
                            <th className="pb-1 text-left">P#</th>
                            <th className="pb-1 text-left">Token</th>
                            <th className="pb-1 text-left">Qty</th>
                            <th className="pb-1 text-left">Doctor</th>
                            <th className="pb-1 text-left">Dispensed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.patient_rows.map((p, i) => (
                            <tr key={i} className="border-t border-slate-200">
                              <td className="py-1">{p.patient_name}</td>
                              <td className="py-1">
                                {p.patient_number ? `P${p.patient_number}` : "—"}
                              </td>
                              <td className="py-1">#{p.token_number}</td>
                              <td className="py-1 font-semibold">{p.quantity}</td>
                              <td className="py-1">{p.doctor_name}</td>
                              <td className="py-1">
                                {p.dispensed_at
                                  ? format(new Date(p.dispensed_at), "d MMM h:mm a")
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {data.medicine_wise.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            No dispensed medicines in this period.
          </p>
        )}
      </section>

      <DataTable
        title="Patient-wise medicine register (itemwise)"
        columns={[
          "Patient",
          "P#",
          "Token",
          "Medicine",
          "Qty",
          "Doctor",
          "Dispensed",
        ]}
        rows={data.patient_medicine.map((r) => [
          r.patient_name,
          r.patient_number ? `P${r.patient_number}` : "—",
          `#${r.token_number}`,
          r.medicine_name,
          String(r.quantity),
          r.doctor_name,
          r.dispensed_at
            ? format(new Date(r.dispensed_at), "d MMM h:mm a")
            : "—",
        ])}
        empty="No medicine dispensing in this period."
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

function RevenueCard({
  title,
  amount,
  detail,
  onClick,
  noCurrency,
}: {
  title: string;
  amount: number | null;
  detail: string;
  onClick: () => void;
  noCurrency?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:shadow-sm"
    >
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {noCurrency || amount == null ? "—" : `₹${Math.round(amount)}`}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </button>
  );
}

function DataTable({
  title,
  columns,
  rows,
  empty,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                {columns.map((c) => (
                  <th key={c} className="pb-2 pr-4">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 pr-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
