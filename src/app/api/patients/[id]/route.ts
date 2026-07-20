import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import {
  AUDIT_ACTIONS,
  diffFields,
  logAudit,
} from "@/lib/audit";
import { assertVisitReadyForDischarge } from "@/lib/discharge-gates";
import { visitInclude } from "@/lib/db-includes";
import { prisma } from "@/lib/prisma";
import { serializeVisit } from "@/lib/serialize";
import {
  assertStatusTransition,
  clinicalRolesMayEditVisitMeta,
} from "@/lib/status-transitions";
import type { PatientStatus, UpdatePatientInput } from "@/lib/types";
import type { UserRole } from "@/lib/auth-types";

async function loadDischargeContext(visitId: string) {
  return prisma.patientVisit.findUnique({
    where: { id: visitId },
    include: {
      prescription: {
        include: {
          items: { where: { voided_at: null }, orderBy: { sort_order: "asc" } },
        },
      },
      pharmacy_bill: { select: { id: true } },
      mlc_record: { select: { id: true } },
      lab_tests: {
        where: { status: { in: ["ordered", "collected"] } },
        select: { id: true },
      },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { id } = await params;
    const body = (await request.json()) as UpdatePatientInput;

    let status: PatientStatus | undefined = body.status;
    // Lab/radiology "send back" maps to follow-up consultation.
    if (status === "return_to_doctor") {
      status = "in_followup";
    }

    const existing = await loadDischargeContext(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const role = session.role as UserRole;

    if (body.medico_legal !== undefined && !clinicalRolesMayEditVisitMeta(role)) {
      throw new AppError("Only clinical staff can set medico-legal flag", 403);
    }
    if (body.doctor_id && !clinicalRolesMayEditVisitMeta(role)) {
      throw new AppError("Only doctor/reception can reassign a visit's doctor", 403);
    }

    if (status !== undefined && status !== existing.status) {
      // Prefer the client-facing edge (return_to_doctor) for ACL; stored value may be in_followup.
      const edgeTo =
        body.status === "return_to_doctor"
          ? ("return_to_doctor" as PatientStatus)
          : status;
      assertStatusTransition({
        from: existing.status as PatientStatus,
        to: edgeTo,
        role,
        allowForce: true,
      });
    }

    if (status === "completed") {
      assertVisitReadyForDischarge({
        visit: existing,
        prescriptionItems: existing.prescription?.items ?? null,
        hasPharmacyBill: Boolean(existing.pharmacy_bill),
        hasMlcRecord: Boolean(existing.mlc_record),
        pendingLabTests: existing.lab_tests.length,
      });
    }

    const now = new Date();
    const data: Record<string, unknown> = {
      ...(status !== undefined && { status }),
      ...(body.medico_legal !== undefined && { medico_legal: body.medico_legal }),
      ...(body.room_number !== undefined &&
        clinicalRolesMayEditVisitMeta(role) && { room_number: body.room_number }),
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
      if (!existing.lab_started_at) data.lab_started_at = now;
    }
    if (status === "lab_ready") data.lab_ready_at = now;

    if (
      status === "at_radiology" ||
      status === "radio_processing" ||
      status === "radio_ready"
    ) {
      if (!existing.radio_started_at) data.radio_started_at = now;
    }
    if (status === "radio_ready") data.radio_ready_at = now;

    if (body.doctor_id && body.doctor_id !== existing.doctor_id) {
      const newDoctor = await prisma.doctor.findUnique({
        where: { id: body.doctor_id },
        select: { room_number: true },
      });
      if (!newDoctor) {
        throw new AppError("Doctor not found", 404);
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
      if (earlyDoctorStatuses.includes(existing.status)) {
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

    const diff = diffFields(
      existing as unknown as Record<string, unknown>,
      visit as unknown as Record<string, unknown>,
      [
        "status",
        "doctor_id",
        "medico_legal",
        "room_number",
        "lab_eta",
        "radio_eta",
        "completed_at",
      ],
    );

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
    return errorResponse("patients/[id] PATCH", e, "Update failed");
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

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
    return errorResponse("patients/[id] GET", e, "Database error");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const allowedRoles = ["doctor", "admin", "manager"];
    if (!allowedRoles.includes(session.role)) {
      throw new AppError(
        "Only doctor/admin/manager can remove a patient visit",
        403,
      );
    }

    const { id } = await params;
    const existing = await prisma.patientVisit.findUnique({
      where: { id },
      select: {
        id: true,
        patient_name: true,
        token_number: true,
        status: true,
        pharmacy_bill: { select: { id: true } },
        consent: { select: { id: true } },
        mlc_record: { select: { id: true } },
        prescription: { select: { id: true, pharmacy_bill: { select: { id: true } } } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (existing.pharmacy_bill || existing.prescription?.pharmacy_bill) {
      throw new AppError(
        "Cannot delete visit with a pharmacy bill — voiding financial records is not allowed",
        409,
      );
    }
    if (existing.mlc_record) {
      throw new AppError(
        "Cannot delete visit with an MLC record — medico-legal evidence is permanent",
        409,
      );
    }
    if (existing.consent) {
      throw new AppError(
        "Cannot delete visit with recorded consent — remove is blocked for compliance",
        409,
      );
    }

    await prisma.patientVisit.delete({ where: { id } });

    await logAudit({
      action: AUDIT_ACTIONS.VISIT_DELETE,
      entity_type: "visit",
      entity_id: id,
      summary: `Visit removed for ${existing.patient_name} (token ${existing.token_number})`,
      details: {
        status: existing.status,
        removed_by: session.displayName || session.username,
        removed_by_role: session.role,
      },
      session,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse("patients/[id] DELETE", e, "Delete failed");
  }
}
