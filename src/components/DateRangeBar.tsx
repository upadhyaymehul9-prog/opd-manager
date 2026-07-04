"use client";

import { format, subDays } from "date-fns";
import { todayStr, yesterdayStr } from "@/lib/date-range";

type DateRangeBarProps = {
  fromDate: string;
  toDate: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onPreset: (from: string, to: string) => void;
};

export function DateRangeBar({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  onPreset,
}: DateRangeBarProps) {
  const queryFrom = fromDate <= toDate ? fromDate : toDate;
  const queryTo = fromDate <= toDate ? toDate : fromDate;

  const rangeLabel =
    queryFrom === queryTo
      ? format(new Date(queryFrom), "d MMM yyyy")
      : `${format(new Date(queryFrom), "d MMM yyyy")} – ${format(new Date(queryTo), "d MMM yyyy")}`;

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">From</span>
        <input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">To</span>
        <input
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5"
        />
      </label>
      <div className="flex flex-wrap gap-2 pb-0.5">
        <PresetButton label="Today" onClick={() => onPreset(todayStr(), todayStr())} />
        <PresetButton
          label="Yesterday"
          onClick={() => onPreset(yesterdayStr(), yesterdayStr())}
        />
        <PresetButton
          label="Last 7 days"
          onClick={() =>
            onPreset(subDays(new Date(), 6).toISOString().slice(0, 10), todayStr())
          }
        />
        <PresetButton
          label="This month"
          onClick={() => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            onPreset(start.toISOString().slice(0, 10), todayStr());
          }}
        />
      </div>
      <p className="pb-1 text-sm text-slate-600">
        Showing: <strong>{rangeLabel}</strong>
      </p>
    </div>
  );
}

function PresetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
