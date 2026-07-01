"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalyticsPayload } from "@/lib/analytics-types";
import { formatMinutes } from "@/lib/analytics";

export function useAnalytics(pollMs = 30_000) {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load analytics");
      }
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  return { data, loading, error, refresh: load };
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${accent ?? "border-slate-200"}`}
    >
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function BarChart({
  items,
  maxValue,
}: {
  items: { label: string; value: number; sub?: string }[];
  maxValue?: number;
}) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-600">
              {item.value}
              {item.sub ? ` · ${item.sub}` : ""}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BusynessBadge({
  level,
}: {
  level: "low" | "moderate" | "high";
}) {
  const styles = {
    low: "bg-green-100 text-green-800",
    moderate: "bg-amber-100 text-amber-900",
    high: "bg-red-100 text-red-900",
  };
  const labels = { low: "Low load", moderate: "Moderate", high: "High load" };
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}

export { formatMinutes };
