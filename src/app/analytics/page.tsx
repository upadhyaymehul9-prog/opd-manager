"use client";

import { useMemo, useState } from "react";
import { ConsoleShell } from "@/components/ConsoleShell";
import { DateRangeBar } from "@/components/DateRangeBar";
import { ReportsDashboard } from "@/components/ReportsDashboard";
import { OperationsDashboard } from "@/components/OperationsDashboard";
import { StockAlertsPanel } from "@/components/StockAlertsPanel";
import {
  BarChart,
  StatCard,
  formatMinutes,
  useAnalytics,
} from "@/components/AnalyticsWidgets";
import { todayStr } from "@/lib/date-range";

export default function AnalyticsPage() {
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [showDetails, setShowDetails] = useState(false);

  const queryRange = useMemo(() => {
    if (fromDate <= toDate) return { from: fromDate, to: toDate };
    return { from: toDate, to: fromDate };
  }, [fromDate, toDate]);

  const { data, loading, error } = useAnalytics(
    queryRange.from,
    queryRange.to,
  );

  const periodLabel = data?.summary.isToday ? "today" : "in selected period";

  return (
    <ConsoleShell
      title="Operations Center"
      subtitle="MY CLINIC integrated dashboard — live journey + command center · refreshes every 30s"
      current="/analytics"
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

      {loading && !data && (
        <p className="text-slate-600">Loading operations dashboard…</p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {data && (
        <>
          <OperationsDashboard data={data} periodLabel={periodLabel} />

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm hover:bg-slate-50"
            >
              <span className="font-semibold text-slate-900">
                Detailed analytics &amp; registers
              </span>
              <span className="text-sm text-slate-500">
                {showDetails ? "Hide ▴" : "Show ▾"}
              </span>
            </button>

            {showDetails && (
              <div className="mt-4 space-y-8">
                <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">Pharmacy stock</h2>
                  <div className="mt-4">
                    <StockAlertsPanel showStockLink showEmpty />
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

                <div className="grid gap-6 lg:grid-cols-2">
                  <DetailPanel title="Age distribution">
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
                  </DetailPanel>
                  <DetailPanel title="Patients per hour">
                    <BarChart
                      items={data.hourlyToday.map((h) => ({
                        label: h.label,
                        value: h.count,
                      }))}
                    />
                  </DetailPanel>
                </div>

                <DetailPanel title="Doctor-wise breakdown">
                  {data.byDoctor.length === 0 ? (
                    <EmptyNote />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="border-b text-slate-600">
                          <tr>
                            <th className="py-2 pr-4">Doctor</th>
                            <th className="py-2 pr-4">Total</th>
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
                </DetailPanel>

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    label="Fastest exit"
                    value={formatMinutes(data.summary.fastestMinutes)}
                  />
                  <StatCard
                    label="Slowest exit"
                    value={formatMinutes(data.summary.slowestMinutes)}
                  />
                  <StatCard
                    label="Lab avg TAT"
                    value={formatMinutes(data.lab.avgTatMinutes)}
                  />
                  <StatCard
                    label="Radiology avg TAT"
                    value={formatMinutes(data.radiology.avgTatMinutes)}
                  />
                </section>

                <ReportsDashboard
                  hideDateBar
                  fromDate={queryRange.from}
                  toDate={queryRange.to}
                />
              </div>
            )}
          </div>
        </>
      )}
    </ConsoleShell>
  );
}

function DetailPanel({
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

function EmptyNote() {
  return (
    <p className="text-sm text-slate-500">No data for this period yet.</p>
  );
}
