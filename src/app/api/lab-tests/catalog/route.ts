import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { withClinicScope } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";
import { DEFAULT_LAB_TESTS, serializeLabCatalog } from "@/lib/lab-tests";

async function ensureDefaultCatalog(tx: Prisma.TransactionClient, clinicId: string) {
  const existing = await tx.labTestCatalog.findMany({
    select: { name: true },
  });
  const have = new Set(existing.map((r) => r.name.trim().toLowerCase()));
  const missing = DEFAULT_LAB_TESTS.filter(
    (t) => !have.has(t.name.trim().toLowerCase()),
  );
  if (missing.length === 0) return;
  await tx.labTestCatalog.createMany({
    data: missing.map((t) => ({
      clinic_id: clinicId,
      name: t.name,
      unit: t.unit,
      ref_range: t.ref_range,
      value_type: t.value_type,
    })),
  });
}

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? (q ? 50 : 200)), 500);

    const rows = await withClinicScope(session.clinicId, async (tx) => {
      await ensureDefaultCatalog(tx, session.clinicId);
      return tx.labTestCatalog.findMany({
        where: {
          is_active: true,
          ...(q
            ? { name: { contains: q, mode: "insensitive" } }
            : {}),
        },
        orderBy: { name: "asc" },
        take: limit,
      });
    });

    return NextResponse.json(rows.map(serializeLabCatalog));
  } catch (e) {
    return errorResponse("lab-tests/catalog GET", e, "Catalog error");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Test name is required" }, { status: 400 });
    }

    const unit = body.unit?.trim() || null;
    const ref_range = body.ref_range?.trim() || null;
    const value_type = body.value_type === "text" ? "text" : body.value_type === "both" ? "both" : "numeric";

    const result = await withClinicScope(session.clinicId, async (tx) => {
      const existing = await tx.labTestCatalog.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      if (existing) {
        return { row: existing, created: false };
      }

      const row = await tx.labTestCatalog.create({
        data: { clinic_id: session.clinicId, name, unit, ref_range, value_type },
      });
      return { row, created: true };
    });

    return NextResponse.json(
      serializeLabCatalog(result.row),
      { status: result.created ? 201 : 200 },
    );
  } catch (e) {
    return errorResponse("lab-tests/catalog POST", e, "Catalog error");
  }
}
