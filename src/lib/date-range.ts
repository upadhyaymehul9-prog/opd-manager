import { addDays, startOfDay, subDays } from "date-fns";

export function parseDateParam(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = startOfDay(new Date(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr() {
  return subDays(new Date(), 1).toISOString().slice(0, 10);
}

export function resolveRange(searchParams: URLSearchParams) {
  const today = startOfDay(new Date());
  const fromParam = searchParams.get("from") ?? searchParams.get("date");
  const toParam = searchParams.get("to") ?? searchParams.get("date");

  let rangeStart = parseDateParam(fromParam) ?? today;
  let rangeEnd = parseDateParam(toParam) ?? rangeStart;

  if (rangeEnd < rangeStart) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  const rangeEndExclusive = addDays(rangeEnd, 1);
  const from = rangeStart.toISOString().slice(0, 10);
  const to = rangeEnd.toISOString().slice(0, 10);
  const isToday = from === to && from === todayStr();

  return {
    rangeStart,
    rangeEnd,
    rangeEndExclusive,
    from,
    to,
    isToday,
  };
}
