"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DateRangeBar } from "@/components/DateRangeBar";
import { todayStr } from "@/lib/date-range";

type RoiRelease = {
  id: string;
  patient_visit_id: string | null;
  patient_name: string;
  patient_number: number | null;
  requested_by: string;
  requester_relation: string | null;
  purpose: string;
  information_released: string;
  release_mode: string;
  identity_verified: boolean;
  id_proof_type: string | null;
  id_proof_ref: string | null;
  approved_by: string | null;
  released_by: string;
  released_by_role: string;
  released_at: string;
  remarks: string | null;
  visit: { token_number: number } | null;
};

const RELEASE_MODE_OPTIONS = [
  { id: "printed_copy", label: "Printed copy" },
  { id: "digital_pdf", label: "Digital PDF" },
  { id: "email", label: "Email" },
  { id: "other", label: "Other" },
];

export default function RoiReleasePage() {
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [rows, setRows] = useState<RoiRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientVisitId, setPatientVisitId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [requesterRelation, setRequesterRelation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [informationReleased, setInformationReleased] = useState("");
  const [releaseMode, setReleaseMode] = useState(RELEASE_MODE_OPTIONS[0].id);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [idProofType, setIdProofType] = useState("");
  const [idProofRef, setIdProofRef] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [releasedAt, setReleasedAt] = useState("");
  const [remarks, setRemarks] = useState("");

  const queryRange = useMemo(() => {
    if (fromDate <= toDate) return { from: fromDate, to: toDate };
    return { from: toDate, to: fromDate };
  }, [fromDate, toDate]);

  function clearForm() {
    setPatientVisitId("");
    setPatientName("");
    setRequestedBy("");
    setRequesterRelation("");
    setPurpose("");
    setInformationReleased("");
    setReleaseMode(RELEASE_MODE_OPTIONS[0].id);
    setIdentityVerified(false);
    setIdProofType("");
    setIdProofRef("");
    setApprovedBy("");
    setReleasedAt("");
    setRemarks("");
  }

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      from: queryRange.from,
      to: queryRange.to,
    });
    fetch(`/api/records/release?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load ROI log");
        return data;
      })
      .then((data) => setRows(data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load ROI log"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryRange.from, queryRange.to]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        patient_visit_id: patientVisitId.trim() || null,
        patient_name: patientName,
        requested_by: requestedBy,
        requester_relation: requesterRelation || null,
        purpose,
        information_released: informationReleased,
        release_mode: releaseMode,
        identity_verified: identityVerified,
        id_proof_type: idProofType || null,
        id_proof_ref: idProofRef || null,
        approved_by: approvedBy || null,
        released_at: releasedAt ? new Date(releasedAt).toISOString() : null,
        remarks: remarks || null,
      };

      const res = await fetch("/api/records/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save ROI entry");

      clearForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save ROI entry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConsoleShell
      title="Release of information log"
      subtitle="Track every disclosure of records, purpose, requester, and identity proof"
      current="/records/release"
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

      <p className="mb-4 text-sm text-slate-600">
        Use this legal register whenever any OPD information is shared (copy, PDF, email).
        Entries are immutable audit records.
      </p>

      <form
        onSubmit={submit}
        className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-6"
      >
        <h2 className="font-semibold text-cyan-950">New release entry</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="font-medium text-slate-700">Patient name *</span>
            <input
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Patient visit ID (optional)</span>
            <input
              value={patientVisitId}
              onChange={(e) => setPatientVisitId(e.target.value)}
              placeholder="Paste visit UUID"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Requested by *</span>
            <input
              required
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Relation to patient</span>
            <input
              value={requesterRelation}
              onChange={(e) => setRequesterRelation(e.target.value)}
              placeholder="Self / spouse / insurer / police"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Purpose *</span>
            <input
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Insurance claim / second opinion / legal case"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Release mode *</span>
            <select
              value={releaseMode}
              onChange={(e) => setReleaseMode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {RELEASE_MODE_OPTIONS.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="font-medium text-slate-700">Information released *</span>
            <textarea
              required
              rows={2}
              value={informationReleased}
              onChange={(e) => setInformationReleased(e.target.value)}
              placeholder="OPD summary, prescriptions, lab/radiology reports..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Approved by</span>
            <input
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">Released at</span>
            <input
              type="datetime-local"
              value={releasedAt}
              onChange={(e) => setReleasedAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">ID proof type</span>
            <input
              value={idProofType}
              onChange={(e) => setIdProofType(e.target.value)}
              placeholder="Aadhaar / PAN / Passport"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-slate-700">ID proof reference</span>
            <input
              value={idProofRef}
              onChange={(e) => setIdProofRef(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="mt-7 flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={identityVerified}
              onChange={(e) => setIdentityVerified(e.target.checked)}
            />
            Identity verified before release
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            <span className="font-medium text-slate-700">Remarks</span>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save release entry"}
        </button>
      </form>

      {loading && <p className="text-slate-600">Loading ROI log…</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Released</th>
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Requester</th>
              <th className="px-4 py-3 font-semibold">Purpose</th>
              <th className="px-4 py-3 font-semibold">Information</th>
              <th className="px-4 py-3 font-semibold">Mode</th>
              <th className="px-4 py-3 font-semibold">Identity</th>
              <th className="px-4 py-3 font-semibold">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 align-top">
                <td className="px-4 py-3 text-xs text-slate-600">
                  {format(new Date(row.released_at), "d MMM yyyy, h:mm a")}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.patient_name}</p>
                  <p className="text-xs text-indigo-700">
                    {row.patient_number != null ? `P-${row.patient_number}` : "No patient no."}
                    {row.visit ? ` · Token #${row.visit.token_number}` : ""}
                  </p>
                  {row.patient_visit_id && (
                    <Link
                      href={`/records/${row.patient_visit_id}`}
                      className="text-xs text-indigo-700 hover:underline"
                    >
                      Open record
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p>{row.requested_by}</p>
                  {row.requester_relation && (
                    <p className="text-xs text-slate-600">{row.requester_relation}</p>
                  )}
                </td>
                <td className="px-4 py-3">{row.purpose}</td>
                <td className="px-4 py-3">{row.information_released}</td>
                <td className="px-4 py-3">{row.release_mode.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      row.identity_verified
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {row.identity_verified ? "verified" : "not verified"}
                  </span>
                  {(row.id_proof_type || row.id_proof_ref) && (
                    <p className="mt-1 text-slate-600">
                      {[row.id_proof_type, row.id_proof_ref].filter(Boolean).join(": ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-700">
                  {row.released_by} ({row.released_by_role})
                  {row.approved_by && <p className="mt-1">Approved: {row.approved_by}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <p className="p-8 text-center text-slate-500">No release entries in this period.</p>
        )}
      </div>
    </ConsoleShell>
  );
}
