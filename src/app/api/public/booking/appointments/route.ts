import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import {
  assertSlotAvailable,
  getClinicSchedule,
  runBookingTransaction,
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

    // Interim: derive clinicId from doctor's clinic_id.
    // A later task adds subdomain-based tenant-resolution middleware that will forward
    // a trusted clinic-id header on every request, including unauthenticated ones.
    // Once that lands, prefer reading the header over inferring clinicId from the doctor lookup.
    // Note: this derivation alone does not close the Finding-1 gap in findOrCreatePatient.
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctor_id },
      select: { clinic_id: true },
    });
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const schedule = await getClinicSchedule(doctor.clinic_id);
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

    const appointment = await runBookingTransaction(async (tx) => {
      await assertSlotAvailable(
        doctor_id,
        when,
        schedule.slot_duration_minutes,
        undefined,
        tx,
      );

      const patient = await findOrCreatePatient(tx, doctor.clinic_id, {
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
    return errorResponse("public/booking/appointments POST", e, "Booking failed");
  }
}
