import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, getSessionFromCookies, logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const code = String(body.code ?? "").trim();

    const visit = await prisma.patientVisit.findUnique({
      where: { id },
      select: { patient_id: true, mobile: true, patient_name: true },
    });

    if (!visit?.patient_id) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: visit.patient_id },
      select: { mobile_verify_code: true, mobile_verified_at: true },
    });

    if (!patient?.mobile_verify_code) {
      return NextResponse.json(
        { error: "No verification code on file" },
        { status: 400 },
      );
    }

    if (patient.mobile_verify_code !== code) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    await prisma.patient.update({
      where: { id: visit.patient_id },
      data: {
        mobile_verified_at: new Date(),
        mobile_verify_code: null,
      },
    });

    const session = await getSessionFromCookies();
    await logAudit({
      action: AUDIT_ACTIONS.VISIT_UPDATE,
      entity_type: "patient",
      entity_id: visit.patient_id,
      summary: `Mobile verified for ${visit.patient_name}`,
      session,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
