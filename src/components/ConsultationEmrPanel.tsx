"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConsultationTemplate, VisitEmrView } from "@/lib/emr-types";
import { searchIcd10, type Icd10Entry } from "@/lib/icd10";
import {
  bmiCategory,
  bmiCategoryLabel,
  bmiCategoryTone,
  calcBmi,
} from "@/lib/bmi";

type ConsultationEmrPanelProps = {
  visitId: string;
  doctorId: string;
  initialAllergies?: string | null;
};

export function ConsultationEmrPanel({
  visitId,
  doctorId,
  initialAllergies,
}: ConsultationEmrPanelProps) {
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [icdCode, setIcdCode] = useState<string | null>(null);
  const [icdDescription, setIcdDescription] = useState<string | null>(null);
  const [icdQuery, setIcdQuery] = useState("");
  const [examinationNotes, setExaminationNotes] = useState("");
  const [advice, setAdvice] = useState("");
  const [lifestyleAdvice, setLifestyleAdvice] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [referralNotes, setReferralNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [allergies, setAllergies] = useState(initialAllergies ?? "");
  const [bloodGroup, setBloodGroup] = useState("");
  const [vitalsBp, setVitalsBp] = useState("");
  const [vitalsPulse, setVitalsPulse] = useState("");
  const [vitalsTemp, setVitalsTemp] = useState("");
  const [vitalsWeight, setVitalsWeight] = useState("");
  const [vitalsHeightCm, setVitalsHeightCm] = useState("");
  const [vitalsSpo2, setVitalsSpo2] = useState("");
  const [vitalsRbs, setVitalsRbs] = useState("");
  const [templates, setTemplates] = useState<ConsultationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const icdMatches = useMemo(() => searchIcd10(icdQuery), [icdQuery]);

  function selectIcd(entry: Icd10Entry) {
    setIcdCode(entry.code);
    setIcdDescription(entry.description);
    // Pre-fill the free text only when empty so an existing note isn't clobbered
    if (!finalDiagnosis.trim()) {
      setFinalDiagnosis(entry.description);
      setDiagnosis(entry.description);
    }
    setIcdQuery("");
    setSaved(false);
  }

  function clearIcd() {
    setIcdCode(null);
    setIcdDescription(null);
    setSaved(false);
  }

  const bmi = useMemo(() => {
    const w = vitalsWeight ? Number(vitalsWeight) : null;
    const h = vitalsHeightCm ? Number(vitalsHeightCm) : null;
    return calcBmi(w, h);
  }, [vitalsWeight, vitalsHeightCm]);

  const bmiInfo =
    bmi != null
      ? {
          value: bmi,
          category: bmiCategory(bmi),
        }
      : null;

  const applyEmr = useCallback((emr: VisitEmrView) => {
    setChiefComplaint(emr.chief_complaint ?? "");
    setProvisionalDiagnosis(emr.provisional_diagnosis ?? "");
    setFinalDiagnosis(emr.final_diagnosis ?? emr.diagnosis ?? "");
    setDiagnosis(emr.diagnosis ?? "");
    setIcdCode(emr.icd_code ?? null);
    setIcdDescription(emr.icd_description ?? null);
    setIcdQuery("");
    setExaminationNotes(emr.examination_notes ?? "");
    setAdvice(emr.advice ?? "");
    setLifestyleAdvice(emr.lifestyle_advice ?? "");
    setFollowUpInstructions(emr.follow_up_instructions ?? "");
    setReferralNotes(emr.referral_notes ?? "");
    setFollowUpDate(emr.follow_up_date ?? "");
    setAllergies(emr.patient.allergies ?? "");
    setBloodGroup(emr.patient.blood_group ?? "");
    setVitalsBp(emr.vitals.bp ?? "");
    setVitalsPulse(emr.vitals.pulse != null ? String(emr.vitals.pulse) : "");
    setVitalsTemp(emr.vitals.temp != null ? String(emr.vitals.temp) : "");
    setVitalsWeight(emr.vitals.weight != null ? String(emr.vitals.weight) : "");
    setVitalsHeightCm(
      emr.vitals.height_cm != null ? String(emr.vitals.height_cm) : "",
    );
    setVitalsSpo2(emr.vitals.spo2 != null ? String(emr.vitals.spo2) : "");
    setVitalsRbs(emr.vitals.rbs != null ? String(emr.vitals.rbs) : "");
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/visits/${visitId}/emr`).then((r) =>
        r.ok ? r.json() : Promise.reject(),
      ),
      fetch(`/api/consultation-templates?doctor_id=${doctorId}`).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([emr, tpls]) => {
        applyEmr(emr as VisitEmrView);
        setTemplates(Array.isArray(tpls) ? tpls : []);
        setError(null);
      })
      .catch(() => setError("Could not load consultation notes"))
      .finally(() => setLoading(false));
  }, [visitId, doctorId, applyEmr]);

  function applyTemplate(template: ConsultationTemplate) {
    if (template.chief_complaint) setChiefComplaint(template.chief_complaint);
    if (template.diagnosis) {
      setProvisionalDiagnosis(template.diagnosis);
      setFinalDiagnosis(template.diagnosis);
      setDiagnosis(template.diagnosis);
      // Template text replaces the diagnosis — drop any stale ICD code so the
      // chip can't silently disagree with the new text.
      setIcdCode(null);
      setIcdDescription(null);
    }
    if (template.examination_notes) setExaminationNotes(template.examination_notes);
    if (template.advice) setAdvice(template.advice);
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/visits/${visitId}/emr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chief_complaint: chiefComplaint,
          provisional_diagnosis: provisionalDiagnosis,
          final_diagnosis: finalDiagnosis || diagnosis,
          diagnosis: finalDiagnosis || diagnosis,
          icd_code: icdCode,
          examination_notes: examinationNotes,
          advice,
          lifestyle_advice: lifestyleAdvice,
          follow_up_instructions: followUpInstructions,
          referral_notes: referralNotes,
          follow_up_date: followUpDate || null,
          patient_allergies: allergies,
          patient_blood_group: bloodGroup,
          vitals_bp: vitalsBp,
          vitals_pulse: vitalsPulse ? Number(vitalsPulse) : null,
          vitals_temp: vitalsTemp ? Number(vitalsTemp) : null,
          vitals_weight: vitalsWeight ? Number(vitalsWeight) : null,
          vitals_height_cm: vitalsHeightCm ? Number(vitalsHeightCm) : null,
          vitals_spo2: vitalsSpo2 ? Number(vitalsSpo2) : null,
          vitals_rbs: vitalsRbs ? Number(vitalsRbs) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      applyEmr(data as VisitEmrView);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveAsTemplate() {
    const title = window.prompt("Template name (e.g. Viral fever)");
    if (!title?.trim()) return;
    try {
      const res = await fetch("/api/consultation-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          title: title.trim(),
          chief_complaint: chiefComplaint,
          diagnosis,
          examination_notes: examinationNotes,
          advice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save template");
      setTemplates((prev) => [...prev, data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template save failed");
    }
  }

  if (loading) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading consultation notes…
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-left"
        >
          <h3 className="font-semibold text-blue-900">
            Consultation notes (EMR) {expanded ? "▾" : "▸"}
          </h3>
          <p className="text-xs text-slate-600">Vitals · diagnosis · allergies · templates</p>
        </button>
        {templates.length > 0 && expanded && (
          <select
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            defaultValue=""
            onChange={(e) => {
              const tpl = templates.find((t) => t.id === e.target.value);
              if (tpl) applyTemplate(tpl);
              e.target.value = "";
            }}
          >
            <option value="">Apply template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {expanded && (
        <>
          {(allergies.trim() || initialAllergies?.trim()) && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <strong>Allergy alert:</strong> {allergies.trim() || initialAllergies}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Known allergies (saved on patient file)
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa drugs"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Blood group</label>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. B+"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Vitals
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
            <div>
              <label className="block text-xs text-slate-600">BP</label>
              <input
                type="text"
                value={vitalsBp}
                onChange={(e) => setVitalsBp(e.target.value)}
                placeholder="120/80"
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">Pulse</label>
              <input
                type="number"
                min={0}
                value={vitalsPulse}
                onChange={(e) => setVitalsPulse(e.target.value)}
                placeholder="/min"
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">Temp °F</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={vitalsTemp}
                onChange={(e) => setVitalsTemp(e.target.value)}
                placeholder="98.6"
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">Weight kg</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={vitalsWeight}
                onChange={(e) => setVitalsWeight(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">Height cm</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={vitalsHeightCm}
                onChange={(e) => setVitalsHeightCm(e.target.value)}
                placeholder="165"
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">SpO₂ %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={vitalsSpo2}
                onChange={(e) => setVitalsSpo2(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600">RBS mg/dL</label>
              <input
                type="number"
                min={0}
                value={vitalsRbs}
                onChange={(e) => setVitalsRbs(e.target.value)}
                placeholder="Random Blood Sugar"
                className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {bmiInfo && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">
                BMI: <strong>{bmiInfo.value}</strong>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${bmiCategoryTone(bmiInfo.category)}`}
              >
                {bmiCategoryLabel(bmiInfo.category)}
              </span>
            </div>
          )}

          <div className="mt-4 grid gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Chief complaint</label>
              <textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Provisional diagnosis
              </label>
              <textarea
                value={provisionalDiagnosis}
                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Final diagnosis (NABH IMS.4a) — ICD-10 coded (IMS.1d)
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={icdQuery}
                  onChange={(e) => setIcdQuery(e.target.value)}
                  placeholder="Search ICD-10 by code or name (e.g. J02, sore throat, sugar)…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {icdMatches.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {icdMatches.map((m) => (
                      <li key={m.code}>
                        <button
                          type="button"
                          onClick={() => selectIcd(m)}
                          className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                        >
                          <span className="font-mono font-semibold text-blue-800">
                            {m.code}
                          </span>
                          <span className="text-slate-700">{m.description}</span>
                          <span className="ml-auto text-xs text-slate-400">
                            {m.category}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {icdCode && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                  <span className="font-mono font-semibold">{icdCode}</span>
                  {icdDescription}
                  <button
                    type="button"
                    onClick={clearIcd}
                    aria-label="Remove ICD-10 code"
                    className="ml-0.5 rounded-full px-1 text-blue-700 hover:bg-blue-200"
                  >
                    ×
                  </button>
                </span>
              )}
              <textarea
                value={finalDiagnosis}
                onChange={(e) => {
                  setFinalDiagnosis(e.target.value);
                  setDiagnosis(e.target.value);
                }}
                rows={2}
                placeholder="Free-text diagnosis (used as-is if no code selected)"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Examination notes</label>
              <textarea
                value={examinationNotes}
                onChange={(e) => setExaminationNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Treatment / advice</label>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Lifestyle advice</label>
              <textarea
                value={lifestyleAdvice}
                onChange={(e) => setLifestyleAdvice(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Follow-up instructions
              </label>
              <textarea
                value={followUpInstructions}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">Follow-up date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Referral notes</label>
                <input
                  type="text"
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="Referred to specialist…"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {saved && (
            <p className="mt-3 text-sm text-emerald-700">Consultation notes saved.</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save consultation notes"}
            </button>
            <button
              type="button"
              onClick={saveAsTemplate}
              className="rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-800 hover:bg-blue-50"
            >
              Save as my template
            </button>
          </div>
        </>
      )}
    </form>
  );
}
