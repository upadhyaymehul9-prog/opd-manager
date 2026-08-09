import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { buildBillPreview } from "@/lib/billing";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(request.url);
    const prescriptionId = searchParams.get("prescription_id")?.trim();

    if (!prescriptionId) {
      return NextResponse.json(
        { error: "prescription_id required" },
        { status: 400 },
      );
    }

    const preview = await withClinicScope(session.clinicId, (tx) =>
      buildBillPreview(tx, prescriptionId),
    );

    return NextResponse.json(preview);
  } catch (e) {
    return errorResponse("bills/preview GET", e, "Preview error");
  }
}
