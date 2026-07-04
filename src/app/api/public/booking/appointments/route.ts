import { NextResponse } from "next/server";
import {
  assertSlotAvailable,
  getClinicSchedule,
  serializeAppointment,
} from "@/lib/appointments";
import { BOOKMYCLINIC_SOURCE, verifyBookMyClinicKey } from "@/lib/bookmyclinic";
import { findOrCreatePatient } from "@/lib/patients";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!verifyBookMyClinicKey(request as import("next/server").NextRequest)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      doctor_id,
      patient_name,
      mobile,
      age,
      scheduled_at,
      notes,
      external_ref,
    } = body;

    if (!doctor_id || !patient_name?.trim() || !scheduled_at) {
      return NextResponse.json(
        { error: "doctor_id, patient_name, and scheduled_at are required" },
        { status: 400 },
      );
    }

    const schedule = await getClinicSchedule();
    const when = new Date(scheduled_at);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled_at" }, { status: 400 });
    }

    if (external_ref) {
      const existing = await prisma.appointment.findUnique({
        where: { external_ref: String(external_ref) },
        include: { doctor: { select: { name: true } } },
      });
      if (existing) {
        return NextResponse.json(serializeAppointment(existing));
      }
    }

    await assertSlotAvailable(doctor_id, when, schedule.slot_duration_minutes);

    const appointment = await prisma.$transaction(async (tx) => {
      const patient = await findOrCreatePatient(tx, {
        name: patient_name.trim(),
        mobile: mobile?.trim() || null,
      });

      return tx.appointment.create({
        data: {
          doctor_id,
          patient_id: patient.id,
          patient_name: patient_name.trim(),
          mobile: mobile?.trim() || null,
          age: age != null && age > 0 ? Math.round(age) : null,
          scheduled_at: when,
          duration_minutes: schedule.slot_duration_minutes,
          status: "booked",
          source: BOOKMYCLINIC_SOURCE,
          external_ref: external_ref ? String(external_ref) : null,
          notes: notes?.trim() || null,
        },
        include: { doctor: { select: { name: true } } },
      });
    });

    return NextResponse.json(serializeAppointment(appointment), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Booking failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
