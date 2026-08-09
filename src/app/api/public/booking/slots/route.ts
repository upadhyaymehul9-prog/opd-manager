import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { generateAvailableSlots } from "@/lib/appointments";
import { verifyBookMyClinicKey } from "@/lib/bookmyclinic";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  if (!verifyBookMyClinicKey(request as import("next/server").NextRequest)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  try {
    const clinicId = request.headers.get("x-clinic-id");
    if (!clinicId) {
      return NextResponse.json({ error: "Unknown clinic" }, { status: 400 });
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

    const result = await withClinicScope(clinicId, async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true },
      });
      if (!doctor) return null;
      return generateAvailableSlots(doctorId, date, clinicId, tx);
    });

    if (!result) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({
      doctor_id: doctorId,
      date,
      slots: result.filter((s) => s.available),
    });
  } catch (e) {
    return errorResponse("public/booking/slots GET", e, "Failed to load slots");
  }
}
