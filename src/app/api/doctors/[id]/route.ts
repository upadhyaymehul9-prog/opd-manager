import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeDoctor } from "@/lib/serialize";
import type { DoctorOpdStatus, UpdateDoctorInput } from "@/lib/types";

const VALID_STATUSES: DoctorOpdStatus[] = [
  "offline",
  "available",
  "busy",
  "on_leave",
  "on_round",
  "in_surgery",
  "in_dressing",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({ where: { id } });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json(serializeDoctor(doctor));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    const body = (await request.json()) as UpdateDoctorInput;

    const data: Record<string, unknown> = {};
    const isAdmin =
      session?.role === "admin" || session?.role === "manager";

    if (body.opd_status != null) {
      if (!VALID_STATUSES.includes(body.opd_status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const canSetStatus =
        isAdmin ||
        (session?.role === "doctor" && session.doctorId === id);
      if (!canSetStatus) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      data.opd_status = body.opd_status;
    }

    if (isAdmin) {
      if (body.name?.trim()) data.name = body.name.trim();
      if (body.room_number?.trim()) data.room_number = body.room_number.trim();
      if (body.specialty !== undefined) {
        data.specialty = body.specialty?.trim() || null;
      }
      if (body.qualifications !== undefined) {
        data.qualifications = body.qualifications?.trim() || null;
      }
      if (body.bio !== undefined) data.bio = body.bio?.trim() || null;
      if (body.photo_url !== undefined) {
        data.photo_url = body.photo_url || null;
      }
      if (body.consultation_fee !== undefined) {
        data.consultation_fee =
          body.consultation_fee != null && body.consultation_fee > 0
            ? Number(body.consultation_fee)
            : null;
      }
    } else if (session?.role === "doctor" && session.doctorId === id) {
      if (body.qualifications !== undefined) {
        data.qualifications = body.qualifications?.trim() || null;
      }
      if (body.bio !== undefined) data.bio = body.bio?.trim() || null;
      if (body.photo_url !== undefined) {
        data.photo_url = body.photo_url || null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data,
    });

    return NextResponse.json(serializeDoctor(doctor));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
