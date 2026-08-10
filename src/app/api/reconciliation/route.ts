import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { parseDateParam, todayStr } from "@/lib/date-range";
import { buildReconciliation } from "@/lib/reconciliation";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") ?? todayStr();
    const date = parseDateParam(dateParam) ?? new Date();

    const report = await withClinicScope(session.clinicId, (tx) =>
      buildReconciliation(tx, date),
    );
    return NextResponse.json(report);
  } catch (e) {
    return errorResponse("reconciliation GET", e, "Reconciliation error");
  }
}
