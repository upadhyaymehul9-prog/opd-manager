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
import { withClinicScope } from "@/lib/tenant";

export async function POST(request: Request) {
  if (!verifyBookMyClinicKey(request as import("next/server").NextRequest)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  try {
    const clinicId = request.headers.get("x-clinic-id");
    if (!clinicId) {
      return NextResponse.json({ error: "Unknown clinic" }, { status: 400 });
    }

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

    const doctor = await withClinicScope(clinicId, (tx) =>
      tx.doctor.findUnique({
        where: { id: doctor_id },
        select: { id: true },
      }),
    );
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const schedule = await withClinicScope(clinicId, (tx) =>
      getClinicSchedule(clinicId, tx),
    );
    const when = new Date(scheduled_at);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled_at" }, { status: 400 });
    }

    if (external_ref) {
      const existing = await withClinicScope(clinicId, (tx) =>
        tx.appointment.findUnique({
          where: {
            clinic_id_external_ref: { clinic_id: clinicId, external_ref: String(external_ref) },
          },
          include: { doctor: { select: { name: true } } },
        }),
      );
      if (existing) {
        return NextResponse.json(serializeAppointment(existing));
      }
    }

    const appointment = await runBookingTransaction(clinicId, async (tx) => {
      await assertSlotAvailable(
        doctor_id,
        when,
        schedule.slot_duration_minutes,
        undefined,
        tx,
      );

      const patient = await findOrCreatePatient(tx, clinicId, {
        name: patient_name.trim(),
        mobile: mobile?.trim() || null,
      });

      return tx.appointment.create({
        data: {
          clinic_id: clinicId,
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
