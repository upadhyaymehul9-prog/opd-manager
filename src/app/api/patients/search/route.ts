import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAbhaInput } from "@/lib/abha";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 1) {
      return NextResponse.json([]);
    }

    const num = /^\d+$/.test(q) ? Number(q) : null;
    const abhaFormatted = parseAbhaInput(q);

    const patients = await prisma.patient.findMany({
      where: {
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
        last_age: p.visits[0]?.age ?? null,
        last_visit_name: p.visits[0]?.patient_name ?? p.name,
      })),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
