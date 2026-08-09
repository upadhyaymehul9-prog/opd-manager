import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { generateAvailableSlots } from "@/lib/appointments";
import { getSessionFromCookies } from "@/lib/audit";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctor_id");
    const date = searchParams.get("date");

    if (!doctorId || !date) {
      return NextResponse.json(
        { error: "doctor_id and date are required" },
        { status: 400 },
      );
    }

    const slots = await withClinicScope(session.clinicId, (tx) =>
      generateAvailableSlots(doctorId, date, session.clinicId, tx),
    );
    return NextResponse.json({ doctor_id: doctorId, date, slots });
  } catch (e) {
    return errorResponse("appointments/slots GET", e, "Failed to load slots");
  }
}
