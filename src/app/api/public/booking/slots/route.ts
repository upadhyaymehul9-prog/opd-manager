import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { generateAvailableSlots } from "@/lib/appointments";
import { verifyBookMyClinicKey } from "@/lib/bookmyclinic";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!verifyBookMyClinicKey(request as import("next/server").NextRequest)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctor_id");
    const date = searchParams.get("date");

    if (!doctorId || !date) {
      return NextResponse.json(
        { error: "doctor_id and date are required" },
        { status: 400 },
      );
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { clinic_id: true },
    });
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const slots = await generateAvailableSlots(doctorId, date, doctor.clinic_id);
    return NextResponse.json({
      doctor_id: doctorId,
      date,
      slots: slots.filter((s) => s.available),
    });
  } catch (e) {
    return errorResponse("public/booking/slots GET", e, "Failed to load slots");
  }
}
