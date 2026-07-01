import { differenceInMinutes, startOfDay, subDays } from "date-fns";
import type {
  AnalyticsAgeGroup,
  AnalyticsDept,
  AnalyticsDoctorRow,
  AnalyticsHourly,
  AnalyticsPayload,
  AnalyticsPrediction,
  AnalyticsSummary,
  VisitForAnalytics,
} from "./analytics-types";

const LAB_STATUSES = new Set([
  "to_lab",
  "at_lab",
  "lab_processing",
  "lab_ready",
]);
const LAB_PENDING = new Set(["to_lab", "at_lab", "lab_processing"]);
const RADIO_STATUSES = new Set([
  "to_radiology",
  "at_radiology",
  "radio_processing",
  "radio_ready",
]);
const RADIO_PENDING = new Set([
  "to_radiology",
  "at_radiology",
  "radio_processing",
]);

const AGE_BUCKETS = [
  { label: "0–17", min: 0, max: 17 },
  { label: "18–30", min: 18, max: 30 },
  { label: "31–45", min: 31, max: 45 },
  { label: "46–60", min: 46, max: 60 },
  { label: "61+", min: 61, max: 200 },
  { label: "Unknown", min: -1, max: -1 },
];

function turnaroundMinutes(v: VisitForAnalytics): number | null {
  if (!v.completed_at) return null;
  return Math.max(
    0,
    differenceInMinutes(v.completed_at, v.registered_at),
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function isToday(d: Date, todayStart: Date): boolean {
  return d >= todayStart;
}

export function buildAnalytics(
  todayVisits: VisitForAnalytics[],
  recentVisits: VisitForAnalytics[],
  now = new Date(),
): AnalyticsPayload {
  const todayStart = startOfDay(now);
  const completedToday = todayVisits.filter((v) => v.status === "completed");
  const activeToday = todayVisits.filter((v) => v.status !== "completed");
  const tatValues = completedToday
    .map(turnaroundMinutes)
    .filter((v): v is number => v !== null);

  const summary: AnalyticsSummary = {
    period: "today",
    totalPatients: todayVisits.length,
    newPatients: todayVisits.filter((v) => v.patient_type === "new").length,
    oldPatients: todayVisits.filter((v) => v.patient_type === "old").length,
    completed: completedToday.length,
    active: activeToday.length,
    avgTurnaroundMinutes: avg(tatValues),
    medianTurnaroundMinutes: median(tatValues),
    fastestMinutes: tatValues.length ? Math.min(...tatValues) : null,
    slowestMinutes: tatValues.length ? Math.max(...tatValues) : null,
  };

  const ageGroups = buildAgeGroups(todayVisits);
  const byDoctor = buildDoctorStats(todayVisits);
  const lab = buildDeptStats(todayVisits, "lab");
  const radiology = buildDeptStats(todayVisits, "radiology");
  const hourlyToday = buildHourly(todayVisits, now);
  const prediction = buildPrediction(todayVisits, recentVisits, now);
  const insights = buildInsights(summary, lab, radiology, prediction, byDoctor);

  return {
    summary,
    ageGroups,
    byDoctor,
    lab,
    radiology,
    hourlyToday,
    prediction,
    insights,
  };
}

function buildAgeGroups(visits: VisitForAnalytics[]): AnalyticsAgeGroup[] {
  const total = visits.length || 1;
  return AGE_BUCKETS.map((bucket) => {
    const count =
      bucket.min === -1
        ? visits.filter((v) => v.age == null).length
        : visits.filter(
            (v) => v.age != null && v.age >= bucket.min && v.age <= bucket.max,
          ).length;
    return {
      label: bucket.label,
      count,
      percent: Math.round((count / total) * 100),
    };
  }).filter((g) => g.count > 0 || g.label === "Unknown");
}

function buildDoctorStats(visits: VisitForAnalytics[]): AnalyticsDoctorRow[] {
  const map = new Map<string, AnalyticsDoctorRow>();

  for (const v of visits) {
    const key = v.doctor_id;
    if (!map.has(key)) {
      map.set(key, {
        doctorId: v.doctor_id,
        doctorName: v.doctors.name,
        total: 0,
        completed: 0,
        active: 0,
        newCount: 0,
        oldCount: 0,
        avgTurnaroundMinutes: null,
      });
    }
    const row = map.get(key)!;
    row.total += 1;
    if (v.status === "completed") row.completed += 1;
    else row.active += 1;
    if (v.patient_type === "new") row.newCount += 1;
    else row.oldCount += 1;
  }

  for (const row of map.values()) {
    const tats = visits
      .filter((v) => v.doctor_id === row.doctorId && v.status === "completed")
      .map(turnaroundMinutes)
      .filter((v): v is number => v !== null);
    row.avgTurnaroundMinutes = avg(tats);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

function buildDeptStats(
  visits: VisitForAnalytics[],
  dept: "lab" | "radiology",
): AnalyticsDept {
  const referredFlag = dept === "lab" ? "lab_referred" : "radio_referred";
  const statusSet = dept === "lab" ? LAB_STATUSES : RADIO_STATUSES;
  const pendingSet = dept === "lab" ? LAB_PENDING : RADIO_PENDING;
  const readyStatus = dept === "lab" ? "lab_ready" : "radio_ready";

  const referred = visits.filter((v) => v[referredFlag] || statusSet.has(v.status));
  return {
    totalReferred: referred.length,
    pending: visits.filter((v) => pendingSet.has(v.status)).length,
    ready: visits.filter((v) => v.status === readyStatus).length,
    completedPath: referred.filter((v) => v.status === "completed").length,
  };
}

function buildHourly(visits: VisitForAnalytics[], now: Date): AnalyticsHourly[] {
  const hours: AnalyticsHourly[] = [];
  for (let h = 8; h <= 20; h++) {
    const count = visits.filter((v) => v.registered_at.getHours() === h).length;
    const period = h < 12 ? "AM" : "PM";
    const display = h <= 12 ? h : h - 12;
    hours.push({
      hour: h,
      label: `${display}${period}`,
      count,
    });
  }
  return hours;
}

function buildPrediction(
  todayVisits: VisitForAnalytics[],
  recentVisits: VisitForAnalytics[],
  now: Date,
): AnalyticsPrediction {
  const opdOpenHour = 9;
  const opdCloseHour = 18;
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const hoursElapsed = Math.max(0.5, currentHour - opdOpenHour);
  const hoursRemaining = Math.max(0, opdCloseHour - currentHour);
  const currentCount = todayVisits.length;
  const avgPerHour =
    currentCount > 0 ? Math.round((currentCount / hoursElapsed) * 10) / 10 : 0;
  const expectedMore = Math.round(avgPerHour * hoursRemaining);
  const predictedEndOfDay = currentCount + expectedMore;

  const hourly = buildHourly(todayVisits, now);
  const peak = [...hourly].sort((a, b) => b.count - a.count)[0];
  const peakHourLabel =
    peak && peak.count > 0 ? `${peak.label} (${peak.count} pts)` : null;

  const todayStart = startOfDay(now);
  const weekday = now.getDay();
  const pastWeekdayCounts: number[] = [];
  for (let d = 1; d <= 14; d++) {
    const day = subDays(todayStart, d);
    if (day.getDay() !== weekday) continue;
    const count = recentVisits.filter(
      (v) =>
        v.registered_at >= startOfDay(day) &&
        v.registered_at < startOfDay(subDays(day, -1)),
    ).length;
    if (count > 0) pastWeekdayCounts.push(count);
  }
  const recentWeekdayAvg =
    pastWeekdayCounts.length > 0 ? Math.round(avg(pastWeekdayCounts)!) : null;

  let busyness: AnalyticsPrediction["busyness"] = "low";
  if (currentCount >= 40 || avgPerHour >= 8) busyness = "high";
  else if (currentCount >= 20 || avgPerHour >= 4) busyness = "moderate";

  let message = `Based on today's pace (~${avgPerHour}/hr), expect ~${predictedEndOfDay} patients by end of OPD.`;
  if (recentWeekdayAvg) {
    message += ` Recent same-weekday average: ${recentWeekdayAvg}.`;
  }

  return {
    currentCount,
    predictedEndOfDay,
    expectedMoreToday: expectedMore,
    avgPerHour,
    peakHourLabel,
    busyness,
    recentWeekdayAvg,
    message,
  };
}

function buildInsights(
  summary: AnalyticsSummary,
  lab: AnalyticsDept,
  radio: AnalyticsDept,
  prediction: AnalyticsPrediction,
  doctors: AnalyticsDoctorRow[],
): string[] {
  const insights: string[] = [];

  if (summary.totalPatients === 0) {
    insights.push("No patients registered today yet.");
    return insights;
  }

  if (summary.newPatients > summary.oldPatients) {
    insights.push(
      `More new patients (${summary.newPatients}) than follow-ups (${summary.oldPatients}) today.`,
    );
  } else if (summary.oldPatients > summary.newPatients) {
    insights.push(
      `More follow-up patients (${summary.oldPatients}) than new registrations today.`,
    );
  }

  if (summary.avgTurnaroundMinutes != null) {
    insights.push(
      `Average OPD turnaround today: ${summary.avgTurnaroundMinutes} minutes (registration → exit).`,
    );
  }

  if (lab.totalReferred > 0) {
    insights.push(
      `${lab.totalReferred} patient(s) sent to lab; ${lab.pending} pending, ${lab.ready} ready.`,
    );
  }

  if (radio.totalReferred > 0) {
    insights.push(
      `${radio.totalReferred} patient(s) sent to radiology; ${radio.pending} pending, ${radio.ready} ready.`,
    );
  }

  const busiest = doctors[0];
  if (busiest && doctors.length > 1) {
    insights.push(`${busiest.doctorName} has the busiest OPD (${busiest.total} patients).`);
  }

  if (prediction.busyness === "high") {
    insights.push("High OPD load — consider extra reception support.");
  }

  return insights;
}

export function formatMinutes(mins: number | null): string {
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
