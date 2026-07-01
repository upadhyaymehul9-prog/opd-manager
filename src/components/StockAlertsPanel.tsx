"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StockAlertsData = {
  low_stock: { medicine: string; available: number }[];
  depleted: { medicine: string }[];
  expiring_soon: {
    medicine: string;
    batch_no: string;
    expiry_date: string;
    quantity: number;
    days_until_expiry: number;
  }[];
  expired: {
    medicine: string;
    batch_no: string;
    expiry_date: string;
    quantity: number;
  }[];
  counts: {
    low_stock: number;
    depleted: number;
    expiring_soon: number;
    expired: number;
    total: number;
  };
};

export function StockAlertsPanel({
  showStockLink = false,
  showEmpty = false,
}: {
  showStockLink?: boolean;
  showEmpty?: boolean;
}) {
  const [alerts, setAlerts] = useState<StockAlertsData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stock/alerts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAlerts(data))
      .catch(() => setAlerts(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (!alerts || alerts.counts.total === 0) {
    if (!showEmpty) return null;
    return (
      <p className="text-sm text-green-700">
        No stock alerts — low, depleted, and expiry checks are clear.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {(alerts.counts.low_stock > 0 || alerts.counts.depleted > 0) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Stock needs attention</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {alerts.counts.low_stock > 0 && (
              <li>
                {alerts.counts.low_stock} medicine(s) running low (≤10 units)
              </li>
            )}
            {alerts.counts.depleted > 0 && (
              <li>
                {alerts.counts.depleted} medicine(s) depleted (was stocked, now
                zero)
              </li>
            )}
          </ul>
          {alerts.low_stock.slice(0, 3).map((item) => (
            <p key={item.medicine} className="mt-1 text-xs">
              {item.medicine} — {item.available} left
            </p>
          ))}
          {showStockLink && (
            <Link
              href="/stock?low=true"
              className="mt-2 inline-block text-sm underline"
            >
              Open pharmacy stock →
            </Link>
          )}
        </div>
      )}

      {(alerts.counts.expiring_soon > 0 || alerts.counts.expired > 0) && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 p-4 text-orange-950">
          <p className="font-semibold">Expiry reminders</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {alerts.counts.expiring_soon > 0 && (
              <li>
                {alerts.counts.expiring_soon} batch(es) expiring within 90 days
              </li>
            )}
            {alerts.counts.expired > 0 && (
              <li>
                {alerts.counts.expired} batch(es) already expired — do not
                dispense
              </li>
            )}
          </ul>
          {alerts.expiring_soon.slice(0, 5).map((b, i) => (
            <p key={`${b.batch_no}-${i}`} className="mt-1 text-xs">
              {b.medicine} · batch {b.batch_no} · expires {b.expiry_date} (
              {b.days_until_expiry} days) · qty {b.quantity}
            </p>
          ))}
          {showStockLink && (
            <Link href="/stock" className="mt-2 inline-block text-sm underline">
              Review batches on stock screen →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
