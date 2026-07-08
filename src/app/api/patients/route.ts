import { NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/db-includes";
import { nextConsultationBillNo } from "@/lib/consultation-billing";
import { parseDateParam } from "@/lib/date-range";
import { findOrCreatePatient } from "@/lib/patients";
import { isValidAbhaInput, parseAbhaInput } from "@/lib/abha";
import { findDuplicatePatients } from "@/lib/duplicate-patients";
import { serializeVisit } from "@/lib/serialize";
import { nextTokenNumber } from "@/lib/tokens";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";
import { CONSENT_TEXT_V1 } from "@/lib/nabh";
import type { CreatePatientInput } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const todayOnly = searchParams.get("today") === "true";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const where: {
      status?: { not: string };
      registered_at?: { gte: Date; lt?: Date };
    } = {};

    if (activeOnly) where.status = { not: "completed" };
    if (todayOnly) where.registered_at = { gte: startOfDay(new Date()) };
    else if (fromParam || toParam) {
      const rangeStart = parseDateParam(fromParam) ?? startOfDay(new Date());
      const rangeEnd = parseDateParam(toParam) ?? rangeStart;
      const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
      const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
      where.registered_at = { gte: start, lt: addDays(end, 1) };
    }

    const visits = await prisma.patientVisit.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: visitInclude,
      orderBy: { registered_at: "desc" },
    });

    return NextResponse.json(visits.map(serializeVisit));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePatientInput;
    const {
      patient_name,
      doctor_id,
      patient_type,
      patient_id,
      age,
      gender,
      mobile,
      address,
      emergency_contact,
      medico_legal,
      consent_accepted,
      witness_name,
      point_of_origin,
      date_of_birth,
      occupation,
      national_id_type,
      national_id,
      duplicate_confirmed,
      consultation_fee,
      consultation_payment_mode,
      abha_id,
    } = body;

    if (!patient_name?.trim() || !doctor_id) {
      return NextResponse.json(
        { error: "Patient name and doctor are required" },
        { status: 400 },
      );
    }

    if (!consent_accepted) {
      return NextResponse.json(
        { error: "Informed consent must be accepted before registration (NABH)" },
        { status: 400 },
      );
    }

    const session = await getSessionFromCookies();

    if (!isValidAbhaInput(abha_id)) {
      return NextResponse.json(
        { error: "ABHA ID must be 14 digits (e.g. 91-1234-5678-9012)" },
        { status: 400 },
      );
    }

    const normalizedAbha = abha_id ? parseAbhaInput(abha_id) : null;

    if (normalizedAbha) {
      const abhaTaken = await prisma.patient.findFirst({
        where: {
          abha_id: normalizedAbha,
          ...(patient_id ? { NOT: { id: patient_id } } : {}),
        },
      });
      if (abhaTaken) {
        return NextResponse.json(
          { error: "This ABHA ID is already registered to another patient" },
          { status: 400 },
        );
      }
    }

    if (!patient_id && !duplicate_confirmed) {
      const duplicates = await findDuplicatePatients({
        name: patient_name.trim(),
        mobile: mobile?.trim() || null,
        abha_id: normalizedAbha,
        national_id: national_id?.trim() || null,
        date_of_birth: date_of_birth || null,
      });
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: "Possible duplicate patient — select existing patient or confirm new registration",
            duplicates,
          },
          { status: 409 },
        );
      }
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctor_id },
      select: { room_number: true, consultation_fee: true },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    let resolvedType = patient_type ?? (patient_id ? "old" : "new");

    if (!patient_type && !patient_id) {
      const prior = await prisma.patientVisit.findFirst({
        where: {
          patient_name: { equals: patient_name.trim(), mode: "insensitive" },
        },
        select: { id: true },
      });
      if (prior) resolvedType = "old";
    }

    const fee =
      consultation_fee != null && consultation_fee > 0
        ? Number(consultation_fee)
        : doctor.consultation_fee && doctor.consultation_fee > 0
          ? doctor.consultation_fee
          : null;

    const token_number = await nextTokenNumber();
    const dob = date_of_birth ? new Date(date_of_birth) : null;

    const visit = await prisma.$transaction(async (tx) => {
      let patient;
      if (patient_id) {
        patient = await tx.patient.findUnique({ where: { id: patient_id } });
        if (!patient) throw new Error("Patient not found");
        if (normalizedAbha && patient.abha_id !== normalizedAbha) {
          patient = await tx.patient.update({
            where: { id: patient_id },
            data: {
              abha_id: normalizedAbha,
              ...(gender?.trim() && { gender: gender.trim() }),
              ...(emergency_contact?.trim() && {
                emergency_contact: emergency_contact.trim(),
              }),
              ...(dob && { date_of_birth: dob }),
              ...(occupation?.trim() && { occupation: occupation.trim() }),
              ...(national_id?.trim() && {
                national_id: national_id.trim(),
                national_id_type: national_id_type?.trim() || null,
              }),
            },
          });
        } else if (
          gender?.trim() ||
          emergency_contact?.trim() ||
          dob ||
          occupation?.trim() ||
          national_id?.trim()
        ) {
          patient = await tx.patient.update({
            where: { id: patient_id },
            data: {
              ...(gender?.trim() && { gender: gender.trim() }),
              ...(emergency_contact?.trim() && {
                emergency_contact: emergency_contact.trim(),
              }),
              ...(dob && { date_of_birth: dob }),
              ...(occupation?.trim() && { occupation: occupation.trim() }),
              ...(national_id?.trim() && {
                national_id: national_id.trim(),
                national_id_type: national_id_type?.trim() || null,
              }),
            },
          });
        }
        if (mobile?.trim() && !patient.mobile_verified_at) {
          patient = await tx.patient.update({
            where: { id: patient_id },
            data: { mobile: mobile.trim(), mobile_verified_at: new Date() },
          });
        }
      } else {
        patient = await findOrCreatePatient(tx, {
          name: patient_name.trim(),
          mobile: mobile?.trim() || null,
          address: address?.trim() || null,
          abha_id: normalizedAbha,
          gender: gender?.trim() || null,
          emergency_contact: emergency_contact?.trim() || null,
          date_of_birth: dob,
          occupation: occupation?.trim() || null,
          national_id_type: national_id_type?.trim() || null,
          national_id: national_id?.trim() || null,
        });
      }

      let billNo: string | null = null;
      let paidAt: Date | null = null;
      if (fee != null && fee > 0) {
        billNo = await nextConsultationBillNo(tx);
        paidAt = new Date();
      }

      const created = await tx.patientVisit.create({
        data: {
          patient_name: patient_name.trim(),
          patient_id: patient.id,
          doctor_id,
          room_number: doctor.room_number,
          token_number,
          status: "registered",
          patient_type: resolvedType,
          age: age != null && age > 0 ? Math.round(age) : null,
          gender: gender?.trim() || patient.gender || null,
          medico_legal: Boolean(medico_legal),
          point_of_origin: point_of_origin?.trim() || "walk_in",
          mobile: mobile?.trim() || patient.mobile || null,
          address: address?.trim() || null,
          consultation_fee: fee,
          consultation_payment_mode:
            fee != null && fee > 0
              ? consultation_payment_mode?.trim() || "cash"
              : null,
          consultation_bill_no: billNo,
          consultation_paid_at: paidAt,
        },
        include: visitInclude,
      });

      if (session) {
        await tx.patientConsent.create({
          data: {
            patient_visit_id: created.id,
            patient_id: patient.id,
            accepted: true,
            consent_text: CONSENT_TEXT_V1,
            recorded_by: session.displayName || session.username,
            recorded_by_role: session.role,
            witness_name: witness_name?.trim() || null,
          },
        });
      }

      return created;
    });

    await logAudit({
      action: AUDIT_ACTIONS.CONSENT_RECORD,
      entity_type: "visit",
      entity_id: visit.id,
      summary: `Consent recorded for ${visit.patient_name}`,
      session,
    });

    await logAudit({
      action: AUDIT_ACTIONS.PATIENT_REGISTER,
      entity_type: "visit",
      entity_id: visit.id,
      summary: `Registered ${visit.patient_name} · token #${visit.token_number}`,
      details: {
        patient_number: visit.patient?.patient_number,
        medico_legal: Boolean(medico_legal),
      },
      session,
    });

    return NextResponse.json(serializeVisit(visit), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
