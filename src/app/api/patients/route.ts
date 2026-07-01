import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/db-includes";
import { serializeVisit } from "@/lib/serialize";
import { nextTokenNumber } from "@/lib/tokens";
import type { CreatePatientInput } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const visits = await prisma.patientVisit.findMany({
      where: activeOnly ? { status: { not: "completed" } } : undefined,
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
    const { patient_name, doctor_id, patient_type, age, mobile } = body;

    if (!patient_name?.trim() || !doctor_id) {
      return NextResponse.json(
        { error: "Patient name and doctor are required" },
        { status: 400 },
      );
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctor_id },
      select: { room_number: true },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    let resolvedType = patient_type ?? "new";

    if (!patient_type) {
      const prior = await prisma.patientVisit.findFirst({
        where: {
          patient_name: { equals: patient_name.trim(), mode: "insensitive" },
        },
        select: { id: true },
      });
      if (prior) resolvedType = "old";
    }

    const token_number = await nextTokenNumber();

    const visit = await prisma.patientVisit.create({
      data: {
        patient_name: patient_name.trim(),
        doctor_id,
        room_number: doctor.room_number,
        token_number,
        status: "registered",
        patient_type: resolvedType,
        age: age != null && age > 0 ? Math.round(age) : null,
        mobile: mobile?.trim() || null,
      },
      include: visitInclude,
    });

    return NextResponse.json(serializeVisit(visit), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
