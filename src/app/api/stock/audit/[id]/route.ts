import { NextResponse } from "next/server";
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
    const message = e instanceof Error ? e.message : "Stock audit error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
