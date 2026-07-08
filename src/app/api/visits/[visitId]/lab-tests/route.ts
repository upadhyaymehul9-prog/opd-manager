import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/audit";
import type { VisitLabTestInput } from "@/lib/lab-test-types";
import { serializeVisitLabTest } from "@/lib/lab-tests";
import { prisma } from "@/lib/prisma";

const ORDER_ROLES = new Set(["doctor", "lab", "admin", "manager"]);
const VIEW_ROLES = new Set([
  "doctor",
  "lab",
  "admin",
  "manager",
  "reception",
  "pharmacy",
  "radiology",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !VIEW_ROLES.has(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await params;
    const rows = await prisma.visitLabTest.findMany({
      where: { patient_visit_id: visitId },
      orderBy: [{ sort_order: "asc" }, { ordered_at: "asc" }],
    });

    return NextResponse.json(rows.map(serializeVisitLabTest));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lab tests error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !ORDER_ROLES.has(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await params;
    const body = (await request.json()) as VisitLabTestInput & {
      items?: VisitLabTestInput[];
    };

    const visit = await prisma.patientVisit.findUnique({ where: { id: visitId } });
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const items = Array.isArray(body.items)
      ? body.items
      : body.test_name
        ? [body]
        : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "At least one test is required" }, { status: 400 });
    }

    const existingCount = await prisma.visitLabTest.count({
      where: { patient_visit_id: visitId },
    });

    const created = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const testName = String(item.test_name ?? "").trim();
      if (!testName) continue;

      let catalog = null;
      if (item.catalog_id) {
        catalog = await prisma.labTestCatalog.findUnique({
          where: { id: item.catalog_id },
        });
      }

      const row = await prisma.visitLabTest.create({
        data: {
          patient_visit_id: visitId,
          catalog_id: catalog?.id ?? item.catalog_id ?? null,
          test_name: catalog?.name ?? testName,
          unit: item.unit?.trim() || catalog?.unit || null,
          ref_range: item.ref_range?.trim() || catalog?.ref_range || null,
          value_type:
            item.value_type ??
            (catalog?.value_type as "numeric" | "text" | "both" | undefined) ??
            "numeric",
          ordered_by: session.displayName || session.username,
          ordered_by_role: session.role,
          sort_order: existingCount + i,
        },
      });
      created.push(serializeVisitLabTest(row));
    }

    if (created.length === 0) {
      return NextResponse.json({ error: "No valid tests to add" }, { status: 400 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lab tests error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
