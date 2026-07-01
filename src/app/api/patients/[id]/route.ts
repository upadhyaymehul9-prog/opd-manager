import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/db-includes";
import { serializeVisit } from "@/lib/serialize";
import type { PatientStatus, UpdatePatientInput } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdatePatientInput;

    let status: PatientStatus | undefined = body.status;
    if (status === "return_to_doctor") {
      status = "in_followup";
    }

    const existing = await prisma.patientVisit.findUnique({ where: { id } });
    const now = new Date();

    const data: Record<string, unknown> = {
      ...(status !== undefined && { status }),
      ...(body.room_number !== undefined && { room_number: body.room_number }),
      ...(body.lab_eta !== undefined && {
        lab_eta: body.lab_eta ? new Date(body.lab_eta) : null,
      }),
      ...(body.radio_eta !== undefined && {
        radio_eta: body.radio_eta ? new Date(body.radio_eta) : null,
      }),
    };

    if (status === "to_lab") data.lab_referred = true;
    if (status === "to_radiology") data.radio_referred = true;
    if (status === "completed") data.completed_at = now;

    if (status === "at_lab" || status === "lab_processing" || status === "lab_ready") {
      if (!existing?.lab_started_at) data.lab_started_at = now;
    }
    if (status === "lab_ready") data.lab_ready_at = now;

    if (
      status === "at_radiology" ||
      status === "radio_processing" ||
      status === "radio_ready"
    ) {
      if (!existing?.radio_started_at) data.radio_started_at = now;
    }
    if (status === "radio_ready") data.radio_ready_at = now;

    const visit = await prisma.patientVisit.update({
      where: { id },
      data,
      include: visitInclude,
    });

    return NextResponse.json(serializeVisit(visit));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const visit = await prisma.patientVisit.findUnique({
      where: { id },
      include: visitInclude,
    });

    if (!visit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(serializeVisit(visit));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
