import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { getStockAudit } from "@/lib/stock-audit";
import { withClinicScope } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { id } = await params;
    const audit = await withClinicScope(session.clinicId, (tx) =>
      getStockAudit(tx, id),
    );
    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    return NextResponse.json(audit);
  } catch (e) {
    return errorResponse("stock/audit/[id] GET", e, "Stock audit error");
  }
}
