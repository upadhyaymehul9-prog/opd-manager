import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

function rating(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export async function POST(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;

    const body = await request.json();
    const patient_name = String(body.patient_name ?? "").trim();
    const q1 = rating(body.q1_overall);
    const q2 = rating(body.q2_care_quality);
    const q3 = rating(body.q3_communication);
    const q4 = rating(body.q4_environment);
    const q5 = rating(body.q5_registration);

    if (!patient_name || !q1 || !q2 || !q3 || !q4 || !q5) {
      return NextResponse.json(
        { error: "Name and all 5 ratings (1–5) are required" },
        { status: 400 },
      );
    }

    const feedback = await prisma.patientFeedback.create({
      data: {
        patient_visit_id: body.patient_visit_id || null,
        patient_name,
        mobile: body.mobile?.trim() || null,
        q1_overall: q1,
        q2_care_quality: q2,
        q3_communication: q3,
        q4_environment: q4,
        q5_registration: q5,
        comments: body.comments?.trim() || null,
      },
    });

    const avg = (q1 + q2 + q3 + q4 + q5) / 5;

    return NextResponse.json({ ...feedback, average_score: avg }, { status: 201 });
  } catch (e) {
    return errorResponse("feedback POST", e, "Could not save feedback");
  }
}

export async function GET() {
  try {
    const rows = await prisma.patientFeedback.findMany({
      orderBy: { created_at: "desc" },
      take: 50,
    });

    const avg =
      rows.length === 0
        ? 0
        : rows.reduce(
            (sum, r) =>
              sum +
              (r.q1_overall +
                r.q2_care_quality +
                r.q3_communication +
                r.q4_environment +
                r.q5_registration) /
                5,
            0,
          ) / rows.length;

    return NextResponse.json({ average_score: Math.round(avg * 10) / 10, rows });
  } catch (e) {
    return errorResponse("feedback GET", e, "Failed to load feedback");
  }
}
