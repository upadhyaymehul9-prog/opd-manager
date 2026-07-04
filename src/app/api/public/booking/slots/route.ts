import { NextResponse } from "next/server";
import { generateAvailableSlots } from "@/lib/appointments";
import { verifyBookMyClinicKey } from "@/lib/bookmyclinic";

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

    const slots = await generateAvailableSlots(doctorId, date);
    return NextResponse.json({
      doctor_id: doctorId,
      date,
      slots: slots.filter((s) => s.available),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
