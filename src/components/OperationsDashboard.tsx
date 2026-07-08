"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyticsPayload } from "@/lib/analytics-types";
import { formatMinutes } from "@/lib/analytics";
import { BusynessBadge } from "@/components/AnalyticsWidgets";

type StockCounts = {
  low_stock: number;
  expiring_soon: number;
};

function MiniBars({
  items,
  color,
}: {
  items: { label: string; value: number }[];
  color: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="mt-3 flex items-end justify-between gap-1.5 h-14">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-t ${color} transition-all`}
            style={{
              height: `${Math.max(8, (item.value / max) * 100)}%`,
              minHeight: item.value > 0 ? 8 : 4,
            }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="text-[9px] leading-none text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutStat({
  value,
  total,
  color,
  label,
}: {
  value: number;
  total: number;
  color: string;
  label: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="text-2xl font-bold text-slate-900">{pct}%</p>
        <p className="text-xs text-slate-600">{label}</p>
        <p className="text-[10px] text-slate-400">
          {value}/{total}
        </p>
      </div>
    </div>
  );
}

function JourneyCard({
  step,
  title,
  subtitle,
  color,
  items,
}: {
  step: string;
  title: string;
  subtitle: string;
  color: string;
  items: { label: string; done?: boolean; active?: boolean }[];
}) {
  return (
    <div className={`rounded-xl border-2 ${color} bg-white p-4 shadow-sm`}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${color.includes("blue") ? "bg-blue-600" : color.includes("green") ? "bg-emerald-600" : color.includes("purple") ? "bg-violet-600" : "bg-indigo-600"}`}
        >
          {step}
        </span>
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                item.done
                  ? "bg-emerald-500"
                  : item.active
                    ? "bg-amber-400 animate-pulse"
                    : "bg-slate-200"
              }`}
            />
            <span className={item.active ? "font-medium text-slate-900" : "text-slate-600"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommandCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${accent}`}>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function OperationsDashboard({
  data,
  periodLabel,
}: {
  data: AnalyticsPayload;
  periodLabel: string;
}) {
  const [stock, setStock] = useState<StockCounts | null>(null);
  const [doctorCount, setDoctorCount] = useState(0);

  useEffect(() => {
    fetch("/api/stock/alerts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setStock(
          d?.counts
            ? {
                low_stock: d.counts.low_stock,
                expiring_soon: d.counts.expiring_soon,
              }
            : null,
        ),
      )
      .catch(() => setStock(null));
    fetch("/api/doctors")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDoctorCount(Array.isArray(d) ? d.length : 0))
      .catch(() => setDoctorCount(0));
  }, []);

  const ops = data.operations;
  const lowStock = stock?.low_stock ?? 0;
  const expiringSoon = stock?.expiring_soon ?? 0;
  const activeDoctors = data.byDoctor.filter((d) => d.active > 0).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
              Integrated Healthcare System
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight">MY CLINIC</h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              End-to-end patient journey — registration → consultation → lab → pharmacy.
              Real-time operations command center {periodLabel}.
            </p>
          </div>
          {data.summary.isToday && (
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs text-blue-200">OPD load</p>
              <BusynessBadge level={data.prediction.busyness} />
              <p className="mt-2 text-xs text-blue-100">
                ~{data.prediction.predictedEndOfDay} patients predicted EOD
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Journey flow */}
        <div className="space-y-4 lg:col-span-9">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <JourneyCard
              step="1"
              title="Patient Registration"
              subtitle="UHID · demographics · consent"
              color="border-blue-200"
              items={[
                { label: `Registered (${ops.registration.total})`, done: ops.registration.total > 0 },
                { label: `New patients (${ops.registration.newPatients})`, done: ops.registration.newPatients > 0 },
                { label: `Returning (${ops.registration.returning})`, done: ops.registration.returning > 0 },
                { label: "Consent & ABHA capture", done: ops.registration.total > 0 },
              ]}
            />
            <JourneyCard
              step="2"
              title="OPD Consultation"
              subtitle="Vitals · diagnosis · Rx"
              color="border-blue-300"
              items={[
                { label: `Waiting (${ops.opd.waiting})`, active: ops.opd.waiting > 0 },
                { label: `In consultation (${ops.opd.inConsultation})`, active: ops.opd.inConsultation > 0 },
                { label: `Completed (${ops.opd.completed})`, done: ops.opd.completed > 0 },
                { label: "Follow-up scheduled", done: false },
              ]}
            />
            <JourneyCard
              step="3"
              title="Laboratory"
              subtitle="Sample → processing → report"
              color="border-emerald-200"
              items={[
                { label: `Tests ordered (${ops.lab.ordered})`, done: ops.lab.ordered > 0 },
                { label: `Pending (${ops.lab.pending})`, active: ops.lab.pending > 0 },
                { label: `Processing (${ops.lab.processing})`, active: ops.lab.processing > 0 },
                { label: `Ready (${ops.lab.ready})`, done: ops.lab.ready > 0 },
              ]}
            />
            <JourneyCard
              step="4"
              title="Pharmacy"
              subtitle="Dispense · stock · billing"
              color="border-violet-200"
              items={[
                { label: `Rx queue (${ops.pharmacy.rxQueue})`, active: ops.pharmacy.rxQueue > 0 },
                { label: `Dispensing (${ops.pharmacy.atPharmacy})`, active: ops.pharmacy.atPharmacy > 0 },
                { label: `Bills (${ops.pharmacy.billsToday})`, done: ops.pharmacy.billsToday > 0 },
                { label: "Inventory updated", done: ops.pharmacy.billsToday > 0 },
              ]}
            />
          </div>

          {/* EMR hub */}
          <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Unified Patient Record (EMR)
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {[
                "Demographics",
                "Consultation",
                "Prescriptions",
                "Lab results",
                "Medications",
                "Documents",
                "Follow-ups",
                "Visit history",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/15 px-3 py-1 font-medium backdrop-blur"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Command center */}
          <div>
            <h3 className="mb-3 text-lg font-bold text-slate-900">
              6. Operations Command Center
              <span className="ml-2 text-sm font-normal text-slate-500">
                Real-time dashboard
              </span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <CommandCard title="OPD Overview" accent="border-blue-200">
                <MetricRow label="Patients" value={ops.registration.total} />
                <MetricRow label="Waiting" value={ops.opd.waiting} />
                <MetricRow
                  label="Avg wait / TAT"
                  value={formatMinutes(ops.opd.avgWaitMinutes)}
                />
                <MetricRow label="Consultations done" value={ops.opd.completed} />
                <MiniBars
                  color="bg-blue-500"
                  items={[
                    { label: "Wait", value: ops.opd.waiting },
                    { label: "Rx", value: ops.opd.inConsultation },
                    { label: "Done", value: ops.opd.completed },
                  ]}
                />
              </CommandCard>

              <CommandCard title="Lab Overview" accent="border-emerald-200">
                <MetricRow label="Tests ordered" value={ops.lab.ordered} />
                <MetricRow label="Pending" value={ops.lab.pending} />
                <MetricRow label="Ready" value={ops.lab.ready} />
                <MetricRow label="Avg TAT" value={formatMinutes(ops.lab.avgTatMinutes)} />
                <MiniBars
                  color="bg-emerald-500"
                  items={[
                    { label: "Pend", value: ops.lab.pending },
                    { label: "Proc", value: ops.lab.processing },
                    { label: "Rdy", value: ops.lab.ready },
                  ]}
                />
              </CommandCard>

              <CommandCard title="Pharmacy Overview" accent="border-violet-200">
                <MetricRow label="Prescriptions" value={ops.pharmacy.rxQueue + ops.pharmacy.atPharmacy} />
                <MetricRow label="Dispensing" value={ops.pharmacy.atPharmacy} />
                <MetricRow label="Low stock items" value={lowStock} />
                <MetricRow label="Expiring soon" value={expiringSoon} />
                <MiniBars
                  color="bg-violet-500"
                  items={[
                    { label: "Queue", value: ops.pharmacy.rxQueue },
                    { label: "Disp", value: ops.pharmacy.atPharmacy },
                    { label: "Bills", value: ops.pharmacy.billsToday },
                  ]}
                />
              </CommandCard>

              <CommandCard title="Radiology Overview" accent="border-indigo-200">
                <MetricRow label="Tests ordered" value={ops.radiology.ordered} />
                <MetricRow label="Pending" value={ops.radiology.pending} />
                <MetricRow label="Ready" value={ops.radiology.ready} />
                <MetricRow
                  label="Avg TAT"
                  value={formatMinutes(ops.radiology.avgTatMinutes)}
                />
                <MiniBars
                  color="bg-indigo-500"
                  items={[
                    { label: "Pend", value: ops.radiology.pending },
                    { label: "Proc", value: ops.radiology.processing },
                    { label: "Rdy", value: ops.radiology.ready },
                  ]}
                />
              </CommandCard>

              <CommandCard title="Clinical Team" accent="border-sky-200">
                <MetricRow label="Consultants" value={doctorCount} />
                <MetricRow label="With active queue" value={activeDoctors} />
                <MetricRow label="Still in OPD" value={data.summary.active} />
                <DonutStat
                  value={activeDoctors}
                  total={Math.max(doctorCount, 1)}
                  color="#0ea5e9"
                  label="Doctors busy"
                />
              </CommandCard>

              <CommandCard title="Financial Overview" accent="border-amber-200">
                <MetricRow
                  label="Total revenue"
                  value={`₹${Math.round(data.revenue.total)}`}
                />
                <MetricRow
                  label="OPD / reception"
                  value={`₹${Math.round(data.revenue.reception)}`}
                />
                <MetricRow
                  label="Pharmacy"
                  value={`₹${Math.round(data.revenue.pharmacy)}`}
                />
                <MetricRow
                  label="Procedures"
                  value={`₹${Math.round(data.revenue.procedures)}`}
                />
                <MiniBars
                  color="bg-amber-500"
                  items={[
                    { label: "OPD", value: Math.round(data.revenue.reception) },
                    { label: "Rx", value: Math.round(data.revenue.pharmacy) },
                    { label: "Proc", value: Math.round(data.revenue.procedures) },
                  ]}
                />
              </CommandCard>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-900">Daily operations</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex justify-between">
                <span>OPD patients</span>
                <strong>{ops.registration.total}</strong>
              </li>
              <li className="flex justify-between">
                <span>Completed exits</span>
                <strong>{ops.opd.completed}</strong>
              </li>
              <li className="flex justify-between">
                <span>Lab referrals</span>
                <strong>{ops.lab.ordered}</strong>
              </li>
              <li className="flex justify-between">
                <span>Pharmacy bills</span>
                <strong>{ops.pharmacy.billsToday}</strong>
              </li>
              {data.summary.isToday && (
                <li className="flex justify-between text-indigo-700">
                  <span>Predicted EOD</span>
                  <strong>{data.prediction.predictedEndOfDay}</strong>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <h3 className="font-bold text-green-900">Automated communication</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {["WhatsApp", "Token SMS", "Records", "Feedback"].map((ch) => (
                <span
                  key={ch}
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-green-800 shadow-sm"
                >
                  {ch}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-green-800">
              Token alerts via WhatsApp · patient feedback at discharge
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-slate-900">Quick links</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/reception" className="text-blue-700 hover:underline">
                Reception
              </Link>
              <Link href="/doctor" className="text-blue-700 hover:underline">
                Doctor queue
              </Link>
              <Link href="/lab" className="text-emerald-700 hover:underline">
                Laboratory
              </Link>
              <Link href="/pharmacy" className="text-violet-700 hover:underline">
                Pharmacy
              </Link>
              <Link href="/nabh" className="text-teal-700 hover:underline">
                NABH compliance
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer value props */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">Why it matters</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "One system, one patient record",
            "Real-time visibility across departments",
            "Faster OPD turnaround",
            "NABH-ready audit & compliance",
          ].map((line) => (
            <p key={line} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="text-emerald-500">✓</span>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
