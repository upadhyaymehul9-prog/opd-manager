import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { verifyBookMyClinicKey } from "@/lib/bookmyclinic";

export async function GET(request: Request) {
  if (!verifyBookMyClinicKey(request as import("next/server").NextRequest)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  try {
    const doctors = await prisma.doctor.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        specialty: true,
        room_number: true,
        consultation_fee: true,
        opd_status: true,
      },
    });

    return NextResponse.json({ doctors });
  } catch (e) {
    return errorResponse("public/booking/doctors GET", e, "Failed to load doctors");
  }
}
