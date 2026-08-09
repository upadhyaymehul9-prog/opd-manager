import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { withClinicScope } from "@/lib/tenant";
import { serializeDoctor } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const doctors = await withClinicScope(session.clinicId, (tx) =>
      tx.doctor.findMany({ orderBy: { name: "asc" } }),
    );
    return NextResponse.json(doctors.map(serializeDoctor));
  } catch (e) {
    return errorResponse("doctors GET", e, "Database error");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const body = await request.json();
    const { name, room_number, specialty } = body;

    if (!name?.trim() || !room_number?.trim()) {
      return NextResponse.json(
        { error: "Name and room number are required" },
        { status: 400 },
      );
    }

    const doctor = await withClinicScope(session.clinicId, (tx) =>
      tx.doctor.create({
        data: {
          clinic_id: session.clinicId,
          name: name.trim(),
          room_number: room_number.trim(),
          specialty: specialty?.trim() || null,
        },
      }),
    );

    return NextResponse.json(serializeDoctor(doctor), { status: 201 });
  } catch (e) {
    return errorResponse("doctors POST", e, "Database error");
  }
}
