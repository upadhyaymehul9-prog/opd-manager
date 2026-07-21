import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { generateAvailableSlots } from "@/lib/appointments";

export async function GET(request: Request) {
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
    return NextResponse.json({ doctor_id: doctorId, date, slots });
  } catch (e) {
    return errorResponse("appointments/slots GET", e, "Failed to load slots");
  }
}
