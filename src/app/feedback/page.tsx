"use client";

import { useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { FEEDBACK_QUESTIONS } from "@/lib/nabh-cms";

export default function FeedbackPage() {
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName,
          mobile: mobile || null,
          q1_overall: ratings.q1_overall,
          q2_care_quality: ratings.q2_care_quality,
          q3_communication: ratings.q3_communication,
          q4_environment: ratings.q4_environment,
          q5_registration: ratings.q5_registration,
          comments: comments || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <ConsoleShell title="Thank you" subtitle="Patient feedback (NABH PRE.7a)" publicMode>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="text-lg font-semibold text-emerald-900">
            Thank you for your feedback
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            Your responses help us improve care quality.
          </p>
        </div>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell
      title="Patient feedback"
      subtitle="NABH PRE.7a · 5-point satisfaction survey"
      current="/feedback"
      publicMode
    >
      <form
        onSubmit={submit}
        className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-medium text-slate-700">
          Your name
          <input
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Mobile (optional)
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <p className="mt-6 text-sm font-medium text-slate-800">
          Rate each item from 1 (poor) to 5 (excellent)
        </p>
        {FEEDBACK_QUESTIONS.map((q) => (
          <fieldset key={q.id} className="mt-4">
            <legend className="text-sm text-slate-700">{q.label}</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-sm font-medium ${
                    ratings[q.id] === n
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={n}
                    className="sr-only"
                    required
                    onChange={() => setRatings((prev) => ({ ...prev, [q.id]: n }))}
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Comments (optional)
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit feedback"}
        </button>
      </form>
    </ConsoleShell>
  );
}
