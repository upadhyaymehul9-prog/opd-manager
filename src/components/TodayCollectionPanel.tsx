"use client";

import { useCallback, useEffect, useState } from "react";

type CollectionData = {
  date: string;
  reception?: { bills: number; amount: number };
  pharmacy?: { bills: number; amount: number; gst: number };
};

type TodayCollectionPanelProps = {
  variant: "reception" | "pharmacy" | "both";
};

export function TodayCollectionPanel({ variant }: TodayCollectionPanelProps) {
  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/collection/today");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return (
      <p className="mb-6 text-sm text-slate-600">Loading today&apos;s collection…</p>
    );
  }

  if (!data) return null;

  const showReception =
    (variant === "reception" || variant === "both") && data.reception;
  const showPharmacy =
    (variant === "pharmacy" || variant === "both") && data.pharmacy;

  if (!showReception && !showPharmacy) return null;

  return (
    <section className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
      <h2 className="text-lg font-bold text-slate-900">Today&apos;s collection</h2>
      <p className="text-xs text-slate-600">Live total for {data.date} — refreshes every 30s</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {showReception && (
          <div className="rounded-lg border border-emerald-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-600">Consultation (Reception)</p>
            <p className="mt-1 text-3xl font-bold text-emerald-800">
              ₹{Math.round(data.reception!.amount)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {data.reception!.bills} bill(s) collected today
            </p>
          </div>
        )}
        {showPharmacy && (
          <div className="rounded-lg border border-teal-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-600">Pharmacy sales</p>
            <p className="mt-1 text-3xl font-bold text-teal-800">
              ₹{Math.round(data.pharmacy!.amount)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {data.pharmacy!.bills} bill(s) · GST ₹{Math.round(data.pharmacy!.gst)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
