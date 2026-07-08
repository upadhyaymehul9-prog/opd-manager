import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/db-includes";
import { serializeVisit } from "@/lib/serialize";
import { visitEmrCompleteForDischarge } from "@/lib/nabh";
import { AUDIT_ACTIONS, diffFields, getSessionFromCookies, logAudit } from "@/lib/audit";
import type { PatientStatus, UpdatePatientInput } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdatePatientInput;
    const session = await getSessionFromCookies();

    let status: PatientStatus | undefined = body.status;
    if (status === "return_to_doctor") {
      status = "in_followup";
    }

    const clinicalRoles = ["doctor", "reception", "admin", "manager"];
    if (status === "completed" && !clinicalRoles.includes(session?.role ?? "")) {
      return NextResponse.json(
        { error: "Only doctor/reception can mark a visit completed" },
        { status: 403 },
      );
    }
    if (body.doctor_id && !clinicalRoles.includes(session?.role ?? "")) {
      return NextResponse.json(
        { error: "Only doctor/reception can reassign a visit's doctor" },
        { status: 403 },
      );
    }

    const existing = await prisma.patientVisit.findUnique({ where: { id } });
    const now = new Date();

    if (status === "completed" && existing) {
      if (!visitEmrCompleteForDischarge(existing)) {
        return NextResponse.json(
          {
            error:
              "NABH: complete EMR (chief complaint and diagnosis) before marking visit completed",
          },
          { status: 400 },
        );
      }
    }

    const data: Record<string, unknown> = {
      ...(status !== undefined && { status }),
      ...(body.medico_legal !== undefined && { medico_legal: body.medico_legal }),
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

    if (body.doctor_id && body.doctor_id !== existing?.doctor_id) {
      const newDoctor = await prisma.doctor.findUnique({
        where: { id: body.doctor_id },
        select: { room_number: true },
      });
      if (!newDoctor) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }
      data.doctor_id = body.doctor_id;
      data.room_number = newDoctor.room_number;
      const earlyDoctorStatuses = [
        "registered",
        "calling",
        "in_consultation",
        "in_followup",
        "return_to_doctor",
      ];
      if (existing && earlyDoctorStatuses.includes(existing.status)) {
        data.status = "registered";
      }
      await prisma.prescription.updateMany({
        where: { patient_visit_id: id },
        data: { doctor_id: body.doctor_id },
      });
    }

    const visit = await prisma.patientVisit.update({
      where: { id },
      data,
      include: visitInclude,
    });

    const diff = existing
      ? diffFields(existing, visit, [
          "status",
          "doctor_id",
          "medico_legal",
          "room_number",
          "lab_eta",
          "radio_eta",
          "completed_at",
        ])
      : {};

    if (Object.keys(diff).length > 0) {
      await logAudit({
        action: AUDIT_ACTIONS.VISIT_UPDATE,
        entity_type: "visit",
        entity_id: id,
        summary: `Visit updated for ${visit.patient_name}${status ? ` — status → ${status}` : ""}`,
        details: { changes: diff },
        session,
      });
    }

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
