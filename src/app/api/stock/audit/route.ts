import { NextResponse } from "next/server";
import {
  getPharmacyStockSnapshot,
  listStockAudits,
  saveStockAudit,
} from "@/lib/stock-audit";
import { getSessionFromCookies } from "@/lib/audit";

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
    const message = e instanceof Error ? e.message : "Stock audit error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    const body = await request.json();
    const audit = await saveStockAudit({
      audit_date: String(body.audit_date ?? new Date().toISOString().slice(0, 10)),
      department: String(body.department ?? "pharmacy"),
      notes: body.notes ?? null,
      created_by: session?.displayName || session?.username || null,
      lines: Array.isArray(body.lines) ? body.lines : [],
    });
    return NextResponse.json(audit, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stock audit error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
