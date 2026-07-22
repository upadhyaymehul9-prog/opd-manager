import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { todayStr } from "@/lib/date-range";
import {
  getPharmacyStockSnapshot,
  listStockAudits,
  saveStockAudit,
} from "@/lib/stock-audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("snapshot") === "true") {
      const snapshot = await getPharmacyStockSnapshot();
      return NextResponse.json({ lines: snapshot });
    }

    const audits = await listStockAudits();
    return NextResponse.json(audits);
  } catch (e) {
    return errorResponse("stock/audit GET", e, "Stock audit error");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await request.json();
    const audit = await saveStockAudit({
      audit_date: String(body.audit_date ?? todayStr()),
      department: String(body.department ?? "pharmacy"),
      notes: body.notes ?? null,
      created_by: session?.displayName || session?.username || null,
      lines: Array.isArray(body.lines) ? body.lines : [],
    });
    return NextResponse.json(audit, { status: 201 });
  } catch (e) {
    return errorResponse("stock/audit POST", e, "Stock audit error");
  }
}
