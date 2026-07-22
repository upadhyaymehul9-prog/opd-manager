import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import { addDays, dateStrIST, istTimeLabel, startOfDay, todayStr } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;
const HOUR_MS = 60 * 60 * 1000;

// dayStart (from startOfDay) is the absolute instant of IST midnight, so
// adding whole hours to it lands on that many IST hours past midnight —
// correct regardless of the host process's timezone. Date#setHours() (the
// old approach here) sets local-timezone hours, which is wrong on a
// non-IST host.
function istHourMark(dayStart: Date, hour: number): Date {
  return new Date(dayStart.getTime() + hour * HOUR_MS);
}

export type ClinicSchedule = {
  slot_duration_minutes: number;
  opd_start_hour: number;
  opd_end_hour: number;
};

export type AppointmentView = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  patient_id: string | null;
  patient_name: string;
  mobile: string | null;
  age: number | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  source: string;
  external_ref: string | null;
  notes: string | null;
  visit_id: string | null;
  created_at: string;
};

const DEFAULT_SCHEDULE: ClinicSchedule = {
  slot_duration_minutes: 15,
  opd_start_hour: 9,
  opd_end_hour: 18,
};

export async function getClinicSchedule(): Promise<ClinicSchedule> {
  const row = await prisma.clinicSettings.findUnique({
    where: { id: "default" },
  });
  return row ?? DEFAULT_SCHEDULE;
}

export function serializeAppointment(a: {
  id: string;
  doctor_id: string;
  patient_id: string | null;
  patient_name: string;
  mobile: string | null;
  age: number | null;
  scheduled_at: Date;
  duration_minutes: number;
  status: string;
  source: string;
  external_ref: string | null;
  notes: string | null;
  visit_id: string | null;
  created_at: Date;
  doctor: { name: string };
}): AppointmentView {
  return {
    id: a.id,
    doctor_id: a.doctor_id,
    doctor_name: a.doctor.name,
    patient_id: a.patient_id,
    patient_name: a.patient_name,
    mobile: a.mobile,
    age: a.age,
    scheduled_at: a.scheduled_at.toISOString(),
    duration_minutes: a.duration_minutes,
    status: a.status,
    source: a.source,
    external_ref: a.external_ref,
    notes: a.notes,
    visit_id: a.visit_id,
    created_at: a.created_at.toISOString(),
  };
}

function slotEnd(start: Date, durationMinutes: number) {
  return addMinutes(start, durationMinutes);
}

function overlaps(
  aStart: Date,
  aDuration: number,
  bStart: Date,
  bDuration: number,
) {
  const aEnd = slotEnd(aStart, aDuration);
  const bEnd = slotEnd(bStart, bDuration);
  return aStart < bEnd && bStart < aEnd;
}

export async function getBookedAppointmentsForDoctor(
  doctorId: string,
  dayStart: Date,
  dayEnd: Date,
  client: Tx | typeof prisma = prisma,
) {
  return client.appointment.findMany({
    where: {
      doctor_id: doctorId,
      scheduled_at: { gte: dayStart, lt: dayEnd },
      status: { in: ["booked", "arrived"] },
    },
  });
}

export async function generateAvailableSlots(
  doctorId: string,
  dateStr: string,
  schedule?: ClinicSchedule,
) {
  const resolvedSchedule = schedule ?? (await getClinicSchedule());
  const dayStart = startOfDay(new Date(dateStr));
  const dayEnd = addDays(dayStart, 1);

  const booked = await getBookedAppointmentsForDoctor(
    doctorId,
    dayStart,
    dayEnd,
  );

  const slots: { time: string; label: string; available: boolean }[] = [];
  const { slot_duration_minutes, opd_start_hour, opd_end_hour } = resolvedSchedule;

  let cursor = istHourMark(dayStart, opd_start_hour);
  const end = istHourMark(dayStart, opd_end_hour);

  const now = new Date();
  const isToday = dateStrIST(dayStart) === todayStr();
  while (cursor < end) {
    const taken = booked.some((b) =>
      overlaps(cursor, slot_duration_minutes, b.scheduled_at, b.duration_minutes),
    );
    const inPast = cursor <= now && isToday;
    slots.push({
      time: cursor.toISOString(),
      label: istTimeLabel(cursor),
      available: !taken && !inPast,
    });
    cursor = addMinutes(cursor, slot_duration_minutes);
  }

  return slots;
}

export async function assertSlotAvailable(
  doctorId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeId?: string,
  client: Tx | typeof prisma = prisma,
) {
  const dayStart = startOfDay(scheduledAt);
  const dayEnd = addDays(dayStart, 1);
  const booked = await getBookedAppointmentsForDoctor(
    doctorId,
    dayStart,
    dayEnd,
    client,
  );

  const conflict = booked.find(
    (b) =>
      b.id !== excludeId &&
      overlaps(scheduledAt, durationMinutes, b.scheduled_at, b.duration_minutes),
  );

  if (conflict) {
    throw new Error("This time slot is already booked");
  }
}

/**
 * Runs `fn` at Serializable isolation with a few retries. Used to wrap the
 * "check slot is free, then create" sequence so two concurrent bookings for
 * the same doctor/time can't both pass the check before either commits —
 * Postgres aborts the losing transaction (P2034) and we retry it.
 */
export async function runBookingTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      const isConflict =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!isConflict || attempt === 3) throw e;
    }
  }
  throw new Error("Unreachable");
}
