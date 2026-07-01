import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDoctor } from "@/lib/serialize";
import type { DoctorOpdStatus, UpdateDoctorInput } from "@/lib/types";

const VALID_STATUSES: DoctorOpdStatus[] = [
  "available",
  "busy",
  "on_leave",
  "on_round",
  "in_surgery",
  "in_dressing",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({ where: { id } });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json(serializeDoctor(doctor));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateDoctorInput;

    if (!body.opd_status || !VALID_STATUSES.includes(body.opd_status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: { opd_status: body.opd_status },
    });

    return NextResponse.json(serializeDoctor(doctor));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
