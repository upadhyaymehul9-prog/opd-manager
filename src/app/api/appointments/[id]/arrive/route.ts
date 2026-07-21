import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { visitInclude } from "@/lib/db-includes";
import { nextConsultationBillNo } from "@/lib/consultation-billing";
import { CONSENT_TEXT_V1 } from "@/lib/nabh";
import { findOrCreatePatient } from "@/lib/patients";
import { serializeVisit } from "@/lib/serialize";
import { nextTokenNumber } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";
import { serializeAppointment } from "@/lib/appointments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      consent_accepted?: boolean;
    };
    // Same NABH rule as walk-in registration: consent must be explicitly
    // confirmed by the patient at check-in, not silently auto-recorded.
    if (!body.consent_accepted) {
      return NextResponse.json(
        { error: "Informed consent must be confirmed at check-in (NABH)" },
        { status: 400 },
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: { select: { name: true, room_number: true, consultation_fee: true } } },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.visit_id) {
      const visit = await prisma.patientVisit.findUnique({
        where: { id: appointment.visit_id },
        include: visitInclude,
      });
      return NextResponse.json({
        appointment: serializeAppointment(appointment),
        visit: visit ? serializeVisit(visit) : null,
        already_registered: true,
      });
    }

    if (appointment.status === "cancelled") {
      return NextResponse.json({ error: "Cancelled appointment cannot be registered" }, { status: 400 });
    }

    const token_number = await nextTokenNumber();
    const fee =
      appointment.doctor.consultation_fee && appointment.doctor.consultation_fee > 0
        ? appointment.doctor.consultation_fee
        : null;

    const result = await prisma.$transaction(async (tx) => {
      let patient;
      if (appointment.patient_id) {
        patient = await tx.patient.findUnique({
          where: { id: appointment.patient_id },
        });
      }
      if (!patient) {
        patient = await findOrCreatePatient(tx, {
          name: appointment.patient_name,
          mobile: appointment.mobile,
        });
      }

      const prior = await tx.patientVisit.findFirst({
        where: { patient_id: patient.id },
        select: { id: true },
      });

      let billNo: string | null = null;
      let paidAt: Date | null = null;
      if (fee != null) {
        billNo = await nextConsultationBillNo(tx);
        paidAt = new Date();
      }

      const visit = await tx.patientVisit.create({
        data: {
          patient_name: appointment.patient_name,
          patient_id: patient.id,
          doctor_id: appointment.doctor_id,
          room_number: appointment.doctor.room_number,
          token_number,
          status: "registered",
          patient_type: prior ? "old" : "new",
          age: appointment.age,
          mobile: appointment.mobile ?? patient.mobile,
          consultation_fee: fee,
          consultation_payment_mode: fee != null ? "cash" : null,
          consultation_bill_no: billNo,
          consultation_paid_at: paidAt,
        },
        include: visitInclude,
      });

      const updatedAppointment = await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "arrived", visit_id: visit.id, patient_id: patient.id },
        include: { doctor: { select: { name: true } } },
      });

      await tx.patientConsent.create({
        data: {
          patient_visit_id: visit.id,
          patient_id: patient.id,
          accepted: true,
          consent_text: CONSENT_TEXT_V1,
          recorded_by: session.displayName || session.username,
          recorded_by_role: session.role,
        },
      });

      return { visit, appointment: updatedAppointment };
    });

    await logAudit({
      action: AUDIT_ACTIONS.CONSENT_RECORD,
      entity_type: "visit",
      entity_id: result.visit.id,
      summary: `Consent recorded for appointment check-in: ${result.visit.patient_name}`,
      session,
    });

    return NextResponse.json({
      appointment: serializeAppointment(result.appointment),
      visit: serializeVisit(result.visit),
      already_registered: false,
    });
  } catch (e) {
    return errorResponse("appointments/[id]/arrive POST", e, "Registration failed");
  }
}
