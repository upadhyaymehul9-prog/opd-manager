import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { parseDateParam, todayStr } from "@/lib/date-range";
import { buildReconciliation } from "@/lib/reconciliation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") ?? todayStr();
    const date = parseDateParam(dateParam) ?? new Date();

    const report = await buildReconciliation(date);
    return NextResponse.json(report);
  } catch (e) {
    return errorResponse("reconciliation GET", e, "Reconciliation error");
  }
}
