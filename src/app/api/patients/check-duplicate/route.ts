import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { findDuplicatePatients } from "@/lib/duplicate-patients";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") ?? "";
    const mobile = searchParams.get("mobile");
    const abha_id = searchParams.get("abha_id");
    const national_id = searchParams.get("national_id");
    const exclude = searchParams.get("exclude_patient_id");

    if (!name.trim() && !mobile && !abha_id && !national_id) {
      return NextResponse.json([]);
    }

    const matches = await withClinicScope(session.clinicId, (tx) =>
      findDuplicatePatients(tx, {
        name: name.trim() || " ",
        mobile,
        abha_id,
        national_id,
        exclude_patient_id: exclude ?? undefined,
      }),
    );

    return NextResponse.json(
      matches.map((p) => ({
        ...p,
        date_of_birth: p.date_of_birth?.toISOString().slice(0, 10) ?? null,
      })),
    );
  } catch (e) {
    return errorResponse("patients/check-duplicate GET", e, "Check failed");
  }
}
