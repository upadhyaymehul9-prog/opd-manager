import { NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/db-includes";
import { nextConsultationBillNo } from "@/lib/consultation-billing";
import { parseDateParam } from "@/lib/date-range";
import { findOrCreatePatient } from "@/lib/patients";
import { serializeVisit } from "@/lib/serialize";
import { nextTokenNumber } from "@/lib/tokens";
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
      mobile,
      address,
      consultation_fee,
      consultation_payment_mode,
    } = body;

    if (!patient_name?.trim() || !doctor_id) {
      return NextResponse.json(
        { error: "Patient name and doctor are required" },
        { status: 400 },
      );
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

    const visit = await prisma.$transaction(async (tx) => {
      let patient;
      if (patient_id) {
        patient = await tx.patient.findUnique({ where: { id: patient_id } });
        if (!patient) throw new Error("Patient not found");
      } else {
        patient = await findOrCreatePatient(tx, {
          name: patient_name.trim(),
          mobile: mobile?.trim() || null,
          address: address?.trim() || null,
        });
      }

      let billNo: string | null = null;
      let paidAt: Date | null = null;
      if (fee != null && fee > 0) {
        billNo = await nextConsultationBillNo(tx);
        paidAt = new Date();
      }

      return tx.patientVisit.create({
        data: {
          patient_name: patient_name.trim(),
          patient_id: patient.id,
          doctor_id,
          room_number: doctor.room_number,
          token_number,
          status: "registered",
          patient_type: resolvedType,
          age: age != null && age > 0 ? Math.round(age) : null,
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
    });

    return NextResponse.json(serializeVisit(visit), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
