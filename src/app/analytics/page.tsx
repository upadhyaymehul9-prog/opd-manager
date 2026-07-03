"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { StockAlertsPanel } from "@/components/StockAlertsPanel";
import {
  BarChart,
  BusynessBadge,
  StatCard,
  formatMinutes,
  useAnalytics,
} from "@/components/AnalyticsWidgets";

export default function AnalyticsPage() {
  const { data, loading, error } = useAnalytics();

  return (
    <ConsoleShell
      title="OPD Analytics"
      subtitle="Today's clinic performance — auto-refreshes every 30 seconds"
      current="/analytics"
    >
      {loading && !data && (
        <p className="text-slate-600">Loading analytics…</p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {data && (
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <StatCard label="Total patients today" value={data.summary.totalPatients} accent="border-indigo-200" />
            <StatCard label="New patients" value={data.summary.newPatients} accent="border-emerald-200" />
            <StatCard label="Old / follow-up" value={data.summary.oldPatients} accent="border-blue-200" />
            <StatCard label="Completed (exit)" value={data.summary.completed} />
            <StatCard label="Still in OPD" value={data.summary.active} accent="border-amber-200" />
            <StatCard
              label="Avg turnaround"
              value={formatMinutes(data.summary.avgTurnaroundMinutes)}
              sub={`Median ${formatMinutes(data.summary.medianTurnaroundMinutes)}`}
            />
          </section>

          <section className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Pharmacy sales (today)
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Bills" value={data.pharmacy.billsToday} />
              <StatCard
                label="Revenue"
                value={`₹${Math.round(data.pharmacy.revenueToday)}`}
                accent="border-teal-300"
              />
              <StatCard
                label="GST collected"
                value={`₹${Math.round(data.pharmacy.gstToday)}`}
              />
              <StatCard
                label="Cash / UPI / Card"
                value={data.pharmacy.byPayment
                  .filter((p) => p.count > 0)
                  .map((p) => `${p.mode}: ₹${Math.round(p.amount)}`)
                  .join(" · ") || "—"}
              />
            </div>
          </section>

          <section className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  OPD prediction (end of day)
                </h2>
                <p className="mt-2 max-w-2xl text-slate-700">
                  {data.prediction.message}
                </p>
              </div>
              <BusynessBadge level={data.prediction.busyness} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Current"
                value={data.prediction.currentCount}
              />
              <StatCard
                label="Predicted total"
                value={data.prediction.predictedEndOfDay}
              />
              <StatCard
                label="Expected more"
                value={data.prediction.expectedMoreToday}
              />
              <StatCard
                label="Avg / hour"
                value={data.prediction.avgPerHour}
                sub={data.prediction.peakHourLabel ?? undefined}
              />
            </div>
          </section>

          {data.insights.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Insights</h2>
              <ul className="mt-3 list-inside list-disc space-y-1 text-slate-700">
                {data.insights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Pharmacy stock</h2>
            <p className="mt-1 text-sm text-slate-600">
              Low stock, depleted items, and expiry reminders
            </p>
            <div className="mt-4">
              <StockAlertsPanel showStockLink showEmpty />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Age distribution">
              {data.ageGroups.length === 0 ? (
                <EmptyNote />
              ) : (
                <BarChart
                  items={data.ageGroups.map((g) => ({
                    label: g.label,
                    value: g.count,
                    sub: `${g.percent}%`,
                  }))}
                />
              )}
            </Panel>

            <Panel title="Patients per hour (today)">
              <BarChart
                items={data.hourlyToday.map((h) => ({
                  label: h.label,
                  value: h.count,
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Laboratory & Lab TAT">
              <DeptGrid dept={data.lab} deptLabel="Lab" />
            </Panel>
            <Panel title="Radiology & Radiology TAT">
              <DeptGrid dept={data.radiology} deptLabel="Radiology" />
            </Panel>
          </div>

          <Panel title="Doctor-wise breakdown">
            {data.byDoctor.length === 0 ? (
              <EmptyNote />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2 pr-4">Doctor</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">New</th>
                      <th className="py-2 pr-4">Old</th>
                      <th className="py-2 pr-4">Active</th>
                      <th className="py-2 pr-4">Completed</th>
                      <th className="py-2">Avg TAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDoctor.map((d) => (
                      <tr key={d.doctorId} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium">{d.doctorName}</td>
                        <td className="py-2 pr-4">{d.total}</td>
                        <td className="py-2 pr-4">{d.newCount}</td>
                        <td className="py-2 pr-4">{d.oldCount}</td>
                        <td className="py-2 pr-4">{d.active}</td>
                        <td className="py-2 pr-4">{d.completed}</td>
                        <td className="py-2">
                          {formatMinutes(d.avgTurnaroundMinutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Fastest exit today"
              value={formatMinutes(data.summary.fastestMinutes)}
            />
            <StatCard
              label="Slowest exit today"
              value={formatMinutes(data.summary.slowestMinutes)}
            />
            <StatCard
              label="Lab avg TAT"
              value={formatMinutes(data.lab.avgTatMinutes)}
              sub={
                data.lab.reportsWithTat > 0
                  ? `${data.lab.reportsWithTat} report(s) tracked`
                  : "Mark report ready in lab console"
              }
              accent="border-purple-200"
            />
            <StatCard
              label="Radiology avg TAT"
              value={formatMinutes(data.radiology.avgTatMinutes)}
              sub={
                data.radiology.reportsWithTat > 0
                  ? `${data.radiology.reportsWithTat} report(s) tracked`
                  : "Mark report ready in radiology console"
              }
              accent="border-indigo-200"
            />
          </section>
        </div>
      )}
    </ConsoleShell>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DeptGrid({
  dept,
  deptLabel,
}: {
  dept: {
    totalReferred: number;
    pending: number;
    ready: number;
    completedPath: number;
    avgTatMinutes: number | null;
    medianTatMinutes: number | null;
    fastestTatMinutes: number | null;
    slowestTatMinutes: number | null;
    reportsWithTat: number;
    recentReports: {
      tokenNumber: number;
      patientName: string;
      tatMinutes: number;
    }[];
  };
  deptLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total referred" value={dept.totalReferred} />
        <StatCard label="Pending" value={dept.pending} accent="border-amber-200" />
        <StatCard label="Report ready" value={dept.ready} accent="border-green-200" />
        <StatCard label="Completed OPD" value={dept.completedPath} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
          {deptLabel} TAT (arrival → report ready)
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Average</p>
            <p className="text-lg font-bold text-slate-900">
              {formatMinutes(dept.avgTatMinutes)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Median</p>
            <p className="text-lg font-bold text-slate-900">
              {formatMinutes(dept.medianTatMinutes)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Fastest</p>
            <p className="text-lg font-bold text-green-700">
              {formatMinutes(dept.fastestTatMinutes)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Slowest</p>
            <p className="text-lg font-bold text-red-700">
              {formatMinutes(dept.slowestTatMinutes)}
            </p>
          </div>
        </div>
        {dept.reportsWithTat === 0 && (
          <p className="mt-3 text-sm text-slate-500">
            TAT appears after lab marks patient arrived and report ready.
          </p>
        )}
      </div>

      {dept.recentReports.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Recent {deptLabel.toLowerCase()} TAT
          </h3>
          <ul className="space-y-1 text-sm">
            {dept.recentReports.map((r) => (
              <li
                key={r.tokenNumber}
                className="flex justify-between rounded bg-white px-3 py-2 border border-slate-100"
              >
                <span>
                  #{r.tokenNumber} {r.patientName}
                </span>
                <span className="font-semibold text-slate-800">
                  {formatMinutes(r.tatMinutes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyNote() {
  return (
    <p className="text-sm text-slate-500">No data yet — register patients at reception.</p>
  );
}
