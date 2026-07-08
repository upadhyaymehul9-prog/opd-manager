import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/audit";
import type { VisitLabTestResultInput } from "@/lib/lab-test-types";
import { serializeVisitLabTest } from "@/lib/lab-tests";
import { prisma } from "@/lib/prisma";

const RESULT_ROLES = new Set(["lab", "admin", "manager"]);
const ORDER_ROLES = new Set(["doctor", "lab", "admin", "manager"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ visitId: string; id: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId, id } = await params;
    const body = (await request.json()) as VisitLabTestResultInput;

    const existing = await prisma.visitLabTest.findFirst({
      where: { id, patient_visit_id: visitId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const hasValue =
      body.value_numeric !== undefined ||
      body.value_text !== undefined ||
      body.notes !== undefined;
    const isCancel = body.status === "cancelled";
    const isResult = hasValue || body.status === "resulted";

    if (isResult && !RESULT_ROLES.has(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isCancel && !ORDER_ROLES.has(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const valueNumeric =
      body.value_numeric !== undefined
        ? body.value_numeric === null
          ? null
          : Number(body.value_numeric)
        : existing.value_numeric;

    const valueText =
      body.value_text !== undefined
        ? body.value_text?.trim() || null
        : existing.value_text;

    const hasEnteredValue =
      valueNumeric != null && !Number.isNaN(valueNumeric) ||
      Boolean(valueText?.trim());

    let status = body.status ?? existing.status;
    if (hasEnteredValue && status !== "cancelled") {
      status = "resulted";
    }

    const row = await prisma.visitLabTest.update({
      where: { id },
      data: {
        value_numeric:
          valueNumeric != null && !Number.isNaN(valueNumeric) ? valueNumeric : null,
        value_text: valueText,
        notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
        status,
        resulted_at: status === "resulted" ? new Date() : existing.resulted_at,
        resulted_by:
          status === "resulted"
            ? session.displayName || session.username
            : existing.resulted_by,
        resulted_by_role:
          status === "resulted" ? session.role : existing.resulted_by_role,
      },
    });

    return NextResponse.json(serializeVisitLabTest(row));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lab test update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ visitId: string; id: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !ORDER_ROLES.has(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId, id } = await params;
    const existing = await prisma.visitLabTest.findFirst({
      where: { id, patient_visit_id: visitId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    await prisma.visitLabTest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lab test delete error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
