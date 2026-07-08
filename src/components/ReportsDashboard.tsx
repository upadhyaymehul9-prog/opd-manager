"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { DateRangeBar } from "@/components/DateRangeBar";
import { PrintActions } from "@/components/PrintActions";
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
  todayOnly?: boolean;
};

export function ReportsDashboard({
  initialTab = "overview",
  showTabs,
  fromDate: controlledFrom,
  toDate: controlledTo,
  hideDateBar = false,
  todayOnly = false,
}: ReportsDashboardProps) {
  const [internalFrom, setInternalFrom] = useState(todayStr);
  const [internalTo, setInternalTo] = useState(todayStr);
  const lockedToday = todayOnly ? todayStr() : null;
  const fromDate = lockedToday ?? controlledFrom ?? internalFrom;
  const toDate = lockedToday ?? controlledTo ?? internalTo;
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

  const rangeLabel = useMemo(() => {
    if (queryRange.from === queryRange.to) {
      return format(new Date(queryRange.from), "d MMM yyyy");
    }
    return `${format(new Date(queryRange.from), "d MMM yyyy")} – ${format(new Date(queryRange.to), "d MMM yyyy")}`;
  }, [queryRange]);

  const activeTabLabel =
    visibleTabs.find((t) => t.id === tab)?.label ?? tab;

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
    <div className="reports-print">
      <div className="mb-4 hidden border-b border-slate-300 pb-3 print:block">
        <h1 className="text-xl font-bold text-black">Clinic reports — {activeTabLabel}</h1>
        <p className="mt-1 text-sm text-black">Period: {rangeLabel}</p>
        <p className="text-xs text-slate-600">
          Printed {format(new Date(), "d MMM yyyy, h:mm a")}
        </p>
      </div>

      {todayOnly && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 print:hidden">
          Showing <strong>today&apos;s collection only</strong> ({todayStr()}).
        </p>
      )}
      {!hideDateBar && !todayOnly && (
        <div className="print:hidden">
          <DateRangeBar
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setInternalFrom}
            onToChange={setInternalTo}
            onPreset={setPreset}
          />
        </div>
      )}

      {data && !loading && (
        <div className="mb-4 flex justify-end print:hidden">
          <PrintActions label="Print report" pdfLabel="Save as PDF" />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 print:hidden">
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

      {loading && <p className="text-slate-600 print:hidden">Loading reports…</p>}
      {error && <p className="text-red-600 print:hidden">{error}</p>}

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
  const [selectedMedicine, setSelectedMedicine] = useState("");

  const filteredWise = useMemo(
    () =>
      selectedMedicine
        ? data.medicine_wise.filter((m) => m.medicine_name === selectedMedicine)
        : data.medicine_wise,
    [data.medicine_wise, selectedMedicine],
  );

  const filteredPatientRows = useMemo(
    () =>
      selectedMedicine
        ? data.patient_medicine.filter((r) => r.medicine_name === selectedMedicine)
        : data.patient_medicine,
    [data.patient_medicine, selectedMedicine],
  );

  const selectedRow = filteredWise[0] ?? null;

  function handleMedicineChange(name: string) {
    setSelectedMedicine(name);
    onExpand(name || null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
        <label className="block min-w-[240px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Select medicine
          </span>
          <select
            value={selectedMedicine}
            onChange={(e) => handleMedicineChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">All medicines</option>
            {data.medicine_wise.map((m) => (
              <option key={m.medicine_name} value={m.medicine_name}>
                {m.medicine_name}
              </option>
            ))}
          </select>
        </label>
        {selectedMedicine && selectedRow && (
          <div className="text-sm text-slate-600">
            <strong>{selectedRow.patients}</strong> patient(s) · qty{" "}
            <strong>{selectedRow.total_qty}</strong>
          </div>
        )}
      </div>

      {selectedMedicine && selectedRow && (
        <div className="hidden print:block">
          <p className="text-lg font-bold text-black">{selectedMedicine}</p>
          <p className="text-sm text-black">
            {selectedRow.patients} patient(s) · total qty {selectedRow.total_qty}
          </p>
        </div>
      )}

      {!selectedMedicine && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 print:break-inside-avoid">
          <h2 className="font-semibold">Medicine-wise summary</h2>
          <p className="text-xs text-slate-500 print:hidden">
            Total quantity used — pick a medicine above or click a row for
            breakdown
          </p>
          <MedicineSummaryTable
            rows={filteredWise}
            expandedMedicine={expandedMedicine}
            onExpand={onExpand}
            collapsible
          />
        </section>
      )}

      {selectedMedicine && selectedRow && (
        <section className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 print:border-black print:bg-white">
          <h2 className="font-semibold">{selectedMedicine}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {selectedRow.patients} patient(s) received this medicine · total qty{" "}
            {selectedRow.total_qty}
          </p>
          <PatientBreakdownTable rows={selectedRow.patient_rows} />
        </section>
      )}

      {!selectedMedicine && (
        <div className="hidden print:block print:break-before-page">
          <h2 className="mb-3 font-semibold text-black">
            Patient breakdown by medicine
          </h2>
          {filteredWise.map((row) => (
            <MedicinePrintBlock key={row.medicine_name} row={row} />
          ))}
        </div>
      )}

      {selectedMedicine && (
        <div className="hidden print:block">
          <h2 className="mb-2 font-semibold text-black">Patient list</h2>
          {selectedRow ? (
            <PatientBreakdownTable rows={selectedRow.patient_rows} compact />
          ) : (
            <p className="text-sm">No dispensing for this medicine in period.</p>
          )}
        </div>
      )}

      <DataTable
        title={
          selectedMedicine
            ? `Dispensing register — ${selectedMedicine}`
            : "Patient-wise medicine register (itemwise)"
        }
        columns={
          selectedMedicine
            ? ["Patient", "P#", "Token", "Qty", "Doctor", "Dispensed"]
            : ["Patient", "P#", "Token", "Medicine", "Qty", "Doctor", "Dispensed"]
        }
        rows={filteredPatientRows.map((r) =>
          selectedMedicine
            ? [
                r.patient_name,
                r.patient_number ? `P${r.patient_number}` : "—",
                `#${r.token_number}`,
                String(r.quantity),
                r.doctor_name,
                r.dispensed_at
                  ? format(new Date(r.dispensed_at), "d MMM h:mm a")
                  : "—",
              ]
            : [
                r.patient_name,
                r.patient_number ? `P${r.patient_number}` : "—",
                `#${r.token_number}`,
                r.medicine_name,
                String(r.quantity),
                r.doctor_name,
                r.dispensed_at
                  ? format(new Date(r.dispensed_at), "d MMM h:mm a")
                  : "—",
              ],
        )}
        footerRow={buildRegisterFooter(
          filteredPatientRows,
          selectedMedicine ? 6 : 7,
          selectedMedicine ? 3 : 4,
          Boolean(selectedMedicine),
        )}
        empty={
          selectedMedicine
            ? "No dispensing for this medicine in the selected period."
            : "No medicine dispensing in this period."
        }
      />
    </div>
  );
}

type MedicineRow = ReportData["medicine_wise"][number];
type PatientRow = MedicineRow["patient_rows"][number];

function countUniquePatients(
  rows: { patient_name: string; token_number: number }[],
) {
  return new Set(rows.map((r) => `${r.patient_name}|${r.token_number}`)).size;
}

function sumQty(rows: { quantity: number }[]) {
  return rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0);
}

function buildRegisterFooter(
  rows: ReportData["patient_medicine"],
  columnCount: number,
  qtyColumnIndex: number,
  singleMedicine: boolean,
): string[] | undefined {
  if (rows.length === 0) return undefined;
  const patients = countUniquePatients(rows);
  const totalQty = sumQty(rows);
  const label = singleMedicine
    ? `Total (${patients} patient${patients !== 1 ? "s" : ""})`
    : `Total (${rows.length} line${rows.length !== 1 ? "s" : ""} · ${patients} patient${patients !== 1 ? "s" : ""})`;
  const cells = Array(columnCount).fill("");
  cells[0] = label;
  cells[qtyColumnIndex] = String(totalQty);
  return cells;
}

function MedicineSummaryTable({
  rows,
  expandedMedicine,
  onExpand,
  collapsible,
}: {
  rows: MedicineRow[];
  expandedMedicine: string | null;
  onExpand: (name: string | null) => void;
  collapsible: boolean;
}) {
  const grandQty = rows.reduce((sum, row) => sum + row.total_qty, 0);

  return (
    <>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-600">
            <th className="pb-2">Medicine</th>
            <th className="pb-2">Patients</th>
            <th className="pb-2">Total qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.medicine_name}>
              <tr
                className={`border-b border-slate-100 ${
                  collapsible
                    ? "cursor-pointer hover:bg-slate-50 print:cursor-auto"
                    : ""
                }`}
                onClick={
                  collapsible
                    ? () =>
                        onExpand(
                          expandedMedicine === row.medicine_name
                            ? null
                            : row.medicine_name,
                        )
                    : undefined
                }
              >
                <td className="py-2 font-medium">
                  {collapsible && (
                    <span className="print:hidden">
                      {expandedMedicine === row.medicine_name ? "▾ " : "▸ "}
                    </span>
                  )}
                  {row.medicine_name}
                </td>
                <td className="py-2">{row.patients}</td>
                <td className="py-2 font-semibold">{row.total_qty}</td>
              </tr>
              {collapsible && expandedMedicine === row.medicine_name && (
                <tr className="print:hidden">
                  <td colSpan={3} className="bg-slate-50 px-4 py-3">
                    <PatientBreakdownTable rows={row.patient_rows} compact />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
              <td className="py-2">
                Total ({rows.length} medicine{rows.length !== 1 ? "s" : ""})
              </td>
              <td className="py-2">—</td>
              <td className="py-2">{grandQty}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {rows.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">
          No dispensed medicines in this period.
        </p>
      )}
    </>
  );
}

function PatientBreakdownTable({
  rows,
  compact,
}: {
  rows: PatientRow[];
  compact?: boolean;
}) {
  const totalQty = sumQty(rows);
  const patientCount = countUniquePatients(rows);

  return (
    <table className={`mt-3 w-full ${compact ? "text-xs" : "text-sm"}`}>
      <thead>
        <tr className="border-b text-left text-slate-600">
          <th className="pb-2 pr-3">Patient</th>
          <th className="pb-2 pr-3">P#</th>
          <th className="pb-2 pr-3">Token</th>
          <th className="pb-2 pr-3">Qty</th>
          <th className="pb-2 pr-3">Doctor</th>
          <th className="pb-2">Dispensed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p, i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="py-2 pr-3">{p.patient_name}</td>
            <td className="py-2 pr-3">
              {p.patient_number ? `P${p.patient_number}` : "—"}
            </td>
            <td className="py-2 pr-3">#{p.token_number}</td>
            <td className="py-2 pr-3 font-semibold">{p.quantity}</td>
            <td className="py-2 pr-3">{p.doctor_name}</td>
            <td className="py-2">
              {p.dispensed_at
                ? format(new Date(p.dispensed_at), "d MMM h:mm a")
                : "—"}
            </td>
          </tr>
        ))}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="border-t-2 border-teal-300 bg-teal-100/80 font-bold text-slate-900 print:border-black print:bg-slate-100">
            <td className="py-2 pr-3" colSpan={3}>
              Total ({patientCount} patient{patientCount !== 1 ? "s" : ""})
            </td>
            <td className="py-2 pr-3">{totalQty}</td>
            <td className="py-2 pr-3" colSpan={2} />
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function MedicinePrintBlock({ row }: { row: MedicineRow }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <h3 className="text-sm font-bold text-black">
        {row.medicine_name} — {row.patients} patient(s), qty {row.total_qty}
      </h3>
      <PatientBreakdownTable rows={row.patient_rows} compact />
    </section>
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
  footerRow,
  empty,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  footerRow?: string[];
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 print:break-inside-avoid">
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
            {footerRow && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                  {columns.map((_, j) => (
                    <td key={j} className="py-2 pr-4">
                      {footerRow[j] ?? ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}
