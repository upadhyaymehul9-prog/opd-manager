import { NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import {
  assertSlotAvailable,
  getClinicSchedule,
  runBookingTransaction,
  serializeAppointment,
} from "@/lib/appointments";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? startOfDay(new Date()).toISOString().slice(0, 10);
    const doctorId = searchParams.get("doctor_id");
    const status = searchParams.get("status");

    const dayStart = startOfDay(new Date(date));
    const dayEnd = addDays(dayStart, 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        scheduled_at: { gte: dayStart, lt: dayEnd },
        ...(doctorId ? { doctor_id: doctorId } : {}),
        ...(status ? { status } : {}),
      },
      include: { doctor: { select: { name: true } } },
      orderBy: { scheduled_at: "asc" },
    });

    return NextResponse.json(appointments.map(serializeAppointment));
  } catch (e) {
    return errorResponse("appointments GET", e, "Failed to load appointments");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const body = await request.json();
    const {
      doctor_id,
      patient_name,
      mobile,
      age,
      patient_id,
      scheduled_at,
      notes,
      source,
      external_ref,
    } = body;

    if (!doctor_id || !patient_name?.trim() || !scheduled_at) {
      return NextResponse.json(
        { error: "Doctor, patient name, and scheduled time are required" },
        { status: 400 },
      );
    }

    const schedule = await getClinicSchedule();
    const when = new Date(scheduled_at);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled time" }, { status: 400 });
    }

    if (external_ref) {
      const dup = await prisma.appointment.findUnique({
        where: { external_ref },
      });
      if (dup) {
        return NextResponse.json(serializeAppointment({
          ...dup,
          doctor: await prisma.doctor.findUniqueOrThrow({
            where: { id: dup.doctor_id },
            select: { name: true },
          }),
        }));
      }
    }

    const appointment = await runBookingTransaction(async (tx) => {
      await assertSlotAvailable(
        doctor_id,
        when,
        schedule.slot_duration_minutes,
        undefined,
        tx,
      );

      return tx.appointment.create({
        data: {
          doctor_id,
          patient_id: patient_id ?? null,
          patient_name: patient_name.trim(),
          mobile: mobile?.trim() || null,
          age: age != null && age > 0 ? Math.round(age) : null,
          scheduled_at: when,
          duration_minutes: schedule.slot_duration_minutes,
          status: "booked",
          source: source?.trim() || "reception",
          external_ref: external_ref?.trim() || null,
          notes: notes?.trim() || null,
        },
        include: { doctor: { select: { name: true } } },
      });
    });

    return NextResponse.json(serializeAppointment(appointment), { status: 201 });
  } catch (e) {
    return errorResponse("appointments POST", e, "Booking failed");
  }
}
