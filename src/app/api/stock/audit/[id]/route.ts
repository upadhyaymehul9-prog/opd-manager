import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { getStockAudit } from "@/lib/stock-audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const audit = await getStockAudit(id);
    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    return NextResponse.json(audit);
  } catch (e) {
    return errorResponse("stock/audit/[id] GET", e, "Stock audit error");
  }
}
