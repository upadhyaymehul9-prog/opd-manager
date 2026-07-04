import { NextResponse } from "next/server";
import { DEFAULT_CONSULTATION_TEMPLATES } from "@/lib/emr-types";
import { prisma } from "@/lib/prisma";
import { serializeTemplate } from "@/lib/emr";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctor_id");

    const templates = await prisma.consultationTemplate.findMany({
      where: {
        OR: [{ doctor_id: null }, ...(doctorId ? [{ doctor_id: doctorId }] : [])],
      },
      orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    });

    if (templates.length === 0) {
      return NextResponse.json(
        DEFAULT_CONSULTATION_TEMPLATES.map((t, i) => ({
          id: `default-${i}`,
          doctor_id: null,
          ...t,
        })),
      );
    }

    return NextResponse.json(templates.map(serializeTemplate));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      doctor_id,
      title,
      chief_complaint,
      diagnosis,
      examination_notes,
      advice,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const template = await prisma.consultationTemplate.create({
      data: {
        doctor_id: doctor_id ?? null,
        title: title.trim(),
        chief_complaint: chief_complaint?.trim() || null,
        diagnosis: diagnosis?.trim() || null,
        examination_notes: examination_notes?.trim() || null,
        advice: advice?.trim() || null,
      },
    });

    return NextResponse.json(serializeTemplate(template), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
