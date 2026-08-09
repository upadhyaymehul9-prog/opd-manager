import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { withClinicScope } from "@/lib/tenant";
import type { VisitLabTestInput } from "@/lib/lab-test-types";
import { matchLabPanelByName } from "@/lib/lab-panels";
import { serializeVisitLabTest } from "@/lib/lab-tests";

const ORDER_ROLES = new Set(["doctor", "lab", "admin", "manager"]);
const RESULT_ROLES = new Set(["lab", "admin", "manager"]);
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
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    if (!VIEW_ROLES.has(session.role)) {
      throw new AppError("Unauthorized", 401);
    }

    const { visitId } = await params;
    const rows = await withClinicScope(session.clinicId, (tx) =>
      tx.visitLabTest.findMany({
        where: { patient_visit_id: visitId },
        orderBy: [{ sort_order: "asc" }, { ordered_at: "asc" }],
      }),
    );

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
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    if (!ORDER_ROLES.has(session.role)) {
      throw new AppError("Unauthorized", 401);
    }

    const { visitId } = await params;
    const body = (await request.json()) as VisitLabTestInput & {
      items?: VisitLabTestInput[];
    };

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

    const created = await withClinicScope(session.clinicId, async (tx) => {
      const visit = await tx.patientVisit.findUnique({ where: { id: visitId } });
      if (!visit) {
        throw new AppError("Visit not found", 404);
      }

      const existingCount = await tx.visitLabTest.count({
        where: { patient_visit_id: visitId },
      });

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
            clinic_id: session.clinicId,
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

      // Ordering tests only flags the referral — the doctor moves the patient
      // with the explicit "Send to Lab" button when the consult step is done.
      if (!visit.lab_referred) {
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

type BulkResultLine = {
  id: string;
  value_numeric?: number | null;
  value_text?: string | null;
  notes?: string | null;
};

/** Bulk result entry OR bulk cancel of ordered/collected tests. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { visitId } = await params;
    const body = (await request.json()) as {
      results?: BulkResultLine[];
      cancel_ids?: string[];
    };

    const cancelIds = Array.isArray(body.cancel_ids)
      ? body.cancel_ids.map(String).filter(Boolean)
      : [];

    if (cancelIds.length > 0) {
      if (!ORDER_ROLES.has(session.role)) {
        throw new AppError("Unauthorized", 401);
      }

      const rows = await withClinicScope(session.clinicId, async (tx) => {
        const result = await tx.visitLabTest.updateMany({
          where: {
            patient_visit_id: visitId,
            id: { in: cancelIds },
            status: { in: ["ordered", "collected"] },
          },
          data: { status: "cancelled" },
        });

        if (result.count === 0) {
          throw new AppError("No removable tests selected", 400);
        }

        const rows = await tx.visitLabTest.findMany({
          where: { patient_visit_id: visitId },
          orderBy: [{ sort_order: "asc" }, { ordered_at: "asc" }],
        });
        return { cancelled: result.count, rows };
      });

      return NextResponse.json({
        cancelled: rows.cancelled,
        tests: rows.rows.map(serializeVisitLabTest),
      });
    }

    if (!RESULT_ROLES.has(session.role)) {
      throw new AppError("Unauthorized", 401);
    }

    const lines = Array.isArray(body.results) ? body.results : [];
    if (lines.length === 0) {
      throw new AppError("No results to save", 400);
    }

    const now = new Date();
    const by = session.displayName || session.username;

    const updated = await withClinicScope(session.clinicId, async (tx) => {
      const rows = [];
      for (const line of lines) {
        if (!line.id) continue;
        const existing = await tx.visitLabTest.findFirst({
          where: { id: String(line.id), patient_visit_id: visitId },
        });
        if (!existing || existing.status === "cancelled") continue;

        const valueNumeric =
          line.value_numeric != null && !Number.isNaN(Number(line.value_numeric))
            ? Number(line.value_numeric)
            : null;
        const valueText = line.value_text?.trim() || null;
        if (valueNumeric == null && !valueText) continue;

        const row = await tx.visitLabTest.update({
          where: { id: existing.id },
          data: {
            value_numeric: valueNumeric,
            value_text: valueText,
            notes:
              line.notes !== undefined
                ? line.notes?.trim() || null
                : existing.notes,
            status: "resulted",
            resulted_at: now,
            resulted_by: by,
            resulted_by_role: session.role,
          },
        });
        rows.push(serializeVisitLabTest(row));
      }

      if (rows.length === 0) {
        throw new AppError("No values entered — fill in results before saving", 400);
      }
      return rows;
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse("lab-tests bulk PATCH", e, "Could not save results");
  }
}
