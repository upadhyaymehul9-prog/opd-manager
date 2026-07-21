import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
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
    return errorResponse("consultation-templates GET", e, "Failed to load templates");
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

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
    return errorResponse("consultation-templates POST", e, "Create failed");
  }
}
