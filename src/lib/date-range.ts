// The clinic operates in IST (UTC+5:30, no DST). Day boundaries here are
// pinned to IST regardless of the server process's local timezone — otherwise
// a host running in UTC would shift "today" by 5.5 hours, misattributing
// late-night/early-morning activity to the wrong calendar day in reports and
// day-end reconciliation.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// Fractional IST hour-of-day (e.g. 13.5 = 1:30 PM IST), for hourly buckets
// and "how far into the OPD day are we" predictions. Using date.getHours()
// instead of this shifts every reading by 5.5h on a non-IST host.
export function istHourOfDay(date: Date): number {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return shifted.getUTCHours() + shifted.getUTCMinutes() / 60;
}

// IST day-of-week (0 = Sunday), for same-weekday comparisons. date.getDay()
// reads the server process's local timezone, not the clinic's.
export function istWeekday(date: Date): number {
  return new Date(date.getTime() + IST_OFFSET_MS).getUTCDay();
}

// "9:00 AM" style clock label in IST, regardless of host timezone. Do not
// pass instants like this through date-fns format() — it renders using the
// server process's local timezone, which is wrong for a patient/reception
// facing clock label on a non-IST host.
export function istTimeLabel(date: Date): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const hours24 = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

export function dateStrIST(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// UTC midnight of the IST calendar date containing `date`. Use this for
// `@db.Date` columns (visit_date, expiry_date, audit_date): Prisma stores and
// compares those at UTC midnight, so the boundary must be a UTC-midnight
// instant of the correct IST day — NOT startOfDay(), which returns a
// timestamptz instant (18:30Z of the prior day) meant for @db.Timestamptz
// columns. Idempotent for values already at UTC midnight.
export function istDateOnly(date: Date = new Date()): Date {
  return new Date(`${dateStrIST(date)}T00:00:00.000Z`);
}

export function parseDateParam(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = startOfDay(new Date(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function todayStr() {
  return dateStrIST(new Date());
}

export function yesterdayStr() {
  return dateStrIST(subDays(new Date(), 1));
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
  const from = dateStrIST(rangeStart);
  const to = dateStrIST(rangeEnd);
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
