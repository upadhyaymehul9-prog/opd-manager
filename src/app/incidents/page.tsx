"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES } from "@/lib/nabh";

type Incident = {
  id: string;
  patient_name: string;
  category: string;
  severity: string;
  description: string;
  immediate_action: string | null;
  status: string;
  reported_by: string;
  created_at: string;
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patientName, setPatientName] = useState("");
  const [category, setCategory] = useState<string>(INCIDENT_CATEGORIES[0].id);
  const [severity, setSeverity] = useState<string>(INCIDENT_SEVERITIES[0].id);
  const [description, setDescription] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/incidents")
      .then((r) => (r.ok ? r.json() : []))
      .then(setIncidents);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          category,
          severity,
          description,
          immediate_action: immediateAction || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPatientName("");
      setDescription("");
      setImmediateAction("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function closeIncident(id: string) {
    await fetch(`/api/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    load();
  }

  return (
    <ConsoleShell
      title="Incident reporting"
      subtitle="Patient safety events · NABH PSQ.7a requirement"
      current="/incidents"
    >
      <form
        onSubmit={submit}
        className="mb-8 rounded-2xl border border-red-200 bg-red-50/50 p-6"
      >
        <h2 className="font-semibold text-red-900">Report new incident</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Patient name</span>
            <input
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Severity</span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Description</span>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Immediate action taken</span>
          <textarea
            rows={2}
            value={immediateAction}
            onChange={(e) => setImmediateAction(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit report"}
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Incident log</h2>
        {incidents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No incidents reported.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {incidents.map((inc) => (
              <li key={inc.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {inc.patient_name} — {inc.category.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-slate-600">
                      {format(new Date(inc.created_at), "d MMM yyyy, h:mm a")} ·{" "}
                      {inc.severity} · by {inc.reported_by}
                    </p>
                    <p className="mt-1 text-sm">{inc.description}</p>
                    {inc.immediate_action && (
                      <p className="mt-1 text-sm text-slate-600">
                        Action: {inc.immediate_action}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        inc.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {inc.status}
                    </span>
                    {inc.status === "open" && (
                      <button
                        type="button"
                        onClick={() => closeIncident(inc.id)}
                        className="text-xs text-indigo-700 hover:underline"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsoleShell>
  );
}
