import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { getSessionFromCookies } from "@/lib/audit";
import type { VisitLabTestInput } from "@/lib/lab-test-types";
import { matchLabPanelByName } from "@/lib/lab-panels";
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

/** Visit statuses where ordering tests should also move the patient into the lab queue. */
const CONSULT_STATUSES = new Set([
  "in_consultation",
  "return_to_doctor",
  "in_followup",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !VIEW_ROLES.has(session.role)) {
      throw new AppError("Unauthorized", 401);
    }

    const { visitId } = await params;
    const rows = await prisma.visitLabTest.findMany({
      where: { patient_visit_id: visitId },
      orderBy: [{ sort_order: "asc" }, { ordered_at: "asc" }],
    });

    return NextResponse.json(rows.map(serializeVisitLabTest));
  } catch (e) {
    return errorResponse("lab-tests GET", e, "Lab tests error");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const session = await getSessionFromCookies();
    if (!session || !ORDER_ROLES.has(session.role)) {
      throw new AppError("Unauthorized", 401);
    }

    const { visitId } = await params;
    const body = (await request.json()) as VisitLabTestInput & {
      items?: VisitLabTestInput[];
    };

    const visit = await prisma.patientVisit.findUnique({ where: { id: visitId } });
    if (!visit) {
      throw new AppError("Visit not found", 404);
    }

    const requested = Array.isArray(body.items)
      ? body.items
      : body.test_name
        ? [body]
        : [];

    if (requested.length === 0) {
      throw new AppError("At least one test is required", 400);
    }

    // Panel names (CBC, LFT, Lipid Profile…) expand into one row per
    // component so the lab enters a complete structured report instead of a
    // single free-text value.
    const items: VisitLabTestInput[] = requested.flatMap((item) => {
      const panel = matchLabPanelByName(String(item.test_name ?? ""));
      if (!panel) return [item];
      return panel.components.map((c) => ({
        test_name: c.name,
        unit: c.unit,
        ref_range: c.ref_range,
        value_type: c.value_type,
      }));
    });

    const existingCount = await prisma.visitLabTest.count({
      where: { patient_visit_id: visitId },
    });

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const testName = String(item.test_name ?? "").trim();
        if (!testName) continue;

        let catalog = null;
        if (item.catalog_id) {
          catalog = await tx.labTestCatalog.findUnique({
            where: { id: item.catalog_id },
          });
        }

        const row = await tx.visitLabTest.create({
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
        rows.push(serializeVisitLabTest(row));
      }

      if (rows.length === 0) {
        throw new AppError("No valid tests to add", 400);
      }

      // Keep structured orders in sync with the visit lab queue when ordered mid-consult.
      if (CONSULT_STATUSES.has(visit.status)) {
        await tx.patientVisit.update({
          where: { id: visitId },
          data: { status: "to_lab", lab_referred: true },
        });
      } else if (!visit.lab_referred) {
        await tx.patientVisit.update({
          where: { id: visitId },
          data: { lab_referred: true },
        });
      }

      return rows;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return errorResponse("lab-tests POST", e, "Lab tests error");
  }
}
