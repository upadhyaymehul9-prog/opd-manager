import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeAppointment } from "@/lib/appointments";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body as { status?: string; notes?: string };

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
      include: { doctor: { select: { name: true } } },
    });

    return NextResponse.json(serializeAppointment(appointment));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
