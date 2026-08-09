import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { withClinicScope } from "@/lib/tenant";
import { verifyBookMyClinicKey } from "@/lib/bookmyclinic";

export async function GET(request: Request) {
  if (!verifyBookMyClinicKey(request as import("next/server").NextRequest)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  try {
    const clinicId = request.headers.get("x-clinic-id");
    if (!clinicId) {
      return NextResponse.json({ error: "Unknown clinic" }, { status: 400 });
    }

    const doctors = await withClinicScope(clinicId, (tx) =>
      tx.doctor.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          specialty: true,
          room_number: true,
          consultation_fee: true,
          opd_status: true,
        },
      }),
    );

    return NextResponse.json({ doctors });
  } catch (e) {
    return errorResponse("public/booking/doctors GET", e, "Failed to load doctors");
  }
}
