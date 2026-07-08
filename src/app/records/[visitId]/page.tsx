"use client";

import { format } from "date-fns";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { StatusBadge } from "@/components/PatientCard";
import { PharmacyBillReceipt } from "@/components/PharmacyBillReceipt";
import { PrintActions } from "@/components/PrintActions";
import type { PharmacyBillView } from "@/lib/billing-types";
import type { Prescription } from "@/lib/prescription-types";
import type { PatientVisit } from "@/lib/types";
import { isReadyForPharmacyBill } from "@/lib/prescription-status";
import { EmrSummary } from "@/components/EmrSummary";
import { OpdVisitSummary } from "@/components/OpdVisitSummary";
import { LabTestsPanel } from "@/components/LabTestsPanel";

export default function RecordDetailPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = use(params);
  const [visit, setVisit] = useState<PatientVisit | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [bill, setBill] = useState<PharmacyBillView | null>(null);
  const [priorVisits, setPriorVisits] = useState<
    {
      visit: PatientVisit;
      medicine_count: number;
      bill_total: number | null;
      bill_no: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/records/${visitId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setVisit(data.visit);
        setPrescription(data.prescription);
        setBill(data.bill);
        setPriorVisits(data.prior_visits ?? []);
        setError(null);
      })
      .catch(() => setError("Could not load record"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [visitId]);

  async function generateMissingBill() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_id: visitId, payment_mode: "cash" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate bill");
      setBill(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate bill");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-8 text-slate-600">Loading record…</p>;
  if (!visit) {
    return (
      <ConsoleShell title="Record" current="/records">
        <p className="text-red-600">{error ?? "Not found"}</p>
      </ConsoleShell>
    );
  }

  const readyForBill =
    prescription && isReadyForPharmacyBill(prescription.items);

  return (
    <ConsoleShell
      title={`${visit.patient_number != null ? `P-${visit.patient_number} · ` : ""}#${visit.token_number} ${visit.patient_name}`}
      subtitle="Full visit record — lab, radiology, prescription, dispense, bill"
      current="/records"
    >
      <Link href="/records" className="mb-4 inline-block text-sm text-indigo-700">
        ← All records today
      </Link>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={visit.status} />
          <span className="text-sm text-slate-600">
            {visit.doctors?.name} · Room {visit.room_number}
          </span>
          <span className="text-sm text-slate-600">
            Registered {format(new Date(visit.registered_at), "d MMM yyyy, h:mm a")}
          </span>
          {visit.completed_at && (
            <span className="text-sm text-slate-600">
              Exit {format(new Date(visit.completed_at), "h:mm a")}
            </span>
          )}
        </div>
        {(visit.age || visit.mobile) && (
          <p className="mt-2 text-sm text-slate-600">
            {visit.age ? `Age ${visit.age}` : ""}
            {visit.age && visit.mobile ? " · " : ""}
            {visit.mobile ?? ""}
          </p>
        )}
      </div>

      <EmrSummary visit={visit} />

      <OpdVisitSummary visitId={visitId} />

      <LabTestsPanel visitId={visitId} compact />

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Radiology workflow</h2>
        <div className="mt-3 text-sm">
          <div className="rounded-lg bg-indigo-50 p-3">
            <p className="font-medium text-indigo-900">Radiology</p>
            <p className="mt-1 text-indigo-800">
              {visit.radio_referred
                ? visit.radio_eta
                  ? `Referred · ETA ${format(new Date(visit.radio_eta), "h:mm a")}`
                  : "Referred"
                : "Not referred"}
            </p>
          </div>
        </div>
      </section>

      {prescription ? (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Prescription & dispense</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="pb-2">Medicine</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Dispensed</th>
                <th className="pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2">{item.medicine_name}</td>
                  <td className="py-2">{item.quantity ?? "—"}</td>
                  <td className="py-2">{item.dispensed ? "Yes" : "No"}</td>
                  <td className="py-2 text-slate-600">
                    {item.dispensed_at
                      ? format(new Date(item.dispensed_at), "h:mm a")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="mb-6 text-slate-600">No prescription on file.</p>
      )}

      {bill ? (
        <section className="space-y-4">
          <h2 className="font-semibold text-slate-900">Pharmacy bill</h2>
          <PharmacyBillReceipt bill={bill} visit={visit} />
          <PrintActions label="Print bill" pdfLabel="Save bill as PDF" />
        </section>
      ) : readyForBill ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">No bill on file</p>
          <p className="mt-1 text-sm text-amber-800">
            Patient exited before billing or bill failed. Generate now using stock
            MRP (enter rates on pharmacy screen for new patients).
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={generateMissingBill}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Generating…" : "Generate bill from dispensed medicines"}
          </button>
        </section>
      ) : null}

      {priorVisits.length > 0 && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Previous visits</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-600">
                <th className="pb-2">Date</th>
                <th className="pb-2">Token</th>
                <th className="pb-2">Doctor</th>
                <th className="pb-2">Medicines</th>
                <th className="pb-2">Bill</th>
                <th className="pb-2">Record</th>
              </tr>
            </thead>
            <tbody>
              {priorVisits.map((row) => (
                <tr key={row.visit.id} className="border-b border-slate-100">
                  <td className="py-2">
                    {format(new Date(row.visit.registered_at), "d MMM yyyy")}
                  </td>
                  <td className="py-2">#{row.visit.token_number}</td>
                  <td className="py-2">{row.visit.doctors?.name ?? "—"}</td>
                  <td className="py-2">{row.medicine_count}</td>
                  <td className="py-2">
                    {row.bill_total != null
                      ? `₹${row.bill_total.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/records/${row.visit.id}`}
                      className="text-indigo-700 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </ConsoleShell>
  );
}
