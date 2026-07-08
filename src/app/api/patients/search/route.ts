import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAbhaInput } from "@/lib/abha";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const includeMerged = searchParams.get("include_merged") === "true";

    if (q.length < 1) {
      return NextResponse.json([]);
    }

    const num = /^\d+$/.test(q) ? Number(q) : null;
    const abhaFormatted = parseAbhaInput(q);

    const patients = await prisma.patient.findMany({
      where: {
        ...(includeMerged ? {} : { merged_into_patient_id: null }),
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          ...(q.length >= 3
            ? [{ mobile: { contains: q, mode: "insensitive" as const } }]
            : []),
          ...(num != null ? [{ patient_number: num }] : []),
          ...(abhaFormatted ? [{ abha_id: abhaFormatted }] : []),
        ],
      },
      orderBy: [{ patient_number: "desc" }],
      take: 20,
      include: {
        merged_into: {
          select: { patient_number: true, name: true },
        },
        visits: {
          orderBy: { registered_at: "desc" },
          take: 1,
          select: { age: true, mobile: true, patient_name: true },
        },
      },
    });

    return NextResponse.json(
      patients.map((p) => ({
        id: p.id,
        patient_number: p.patient_number,
        name: p.name,
        mobile: p.mobile,
        abha_id: p.abha_id,
        date_of_birth: p.date_of_birth?.toISOString().slice(0, 10) ?? null,
        last_age: p.visits[0]?.age ?? null,
        last_visit_name: p.visits[0]?.patient_name ?? p.name,
        merged_into_patient_number: p.merged_into?.patient_number ?? null,
        merged_into_name: p.merged_into?.name ?? null,
        is_merged: Boolean(p.merged_into_patient_id),
      })),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
