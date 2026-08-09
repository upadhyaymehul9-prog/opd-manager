import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { withClinicScope } from "@/lib/tenant";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const { id } = await params;
    await withClinicScope(session.clinicId, (tx) =>
      tx.consultationTemplate.delete({ where: { id } }),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse("consultation-templates/[id] DELETE", e, "Delete failed");
  }
}
