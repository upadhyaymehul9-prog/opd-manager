import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseAbhaInput } from "@/lib/abha";

/** Age in whole years from DOB (IST-agnostic calendar math via UTC date parts). */
function ageFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

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
          select: {
            age: true,
            gender: true,
            mobile: true,
            address: true,
            patient_name: true,
          },
        },
      },
    });

    return NextResponse.json(
      patients.map((p) => {
        const last = p.visits[0];
        const dobIso = p.date_of_birth?.toISOString().slice(0, 10) ?? null;
        const fromDob = ageFromDob(p.date_of_birth);
        return {
          id: p.id,
          patient_number: p.patient_number,
          name: p.name,
          mobile: p.mobile ?? last?.mobile ?? null,
          address: p.address ?? last?.address ?? null,
          gender: p.gender ?? last?.gender ?? null,
          emergency_contact: p.emergency_contact ?? null,
          date_of_birth: dobIso,
          occupation: p.occupation ?? null,
          national_id_type: p.national_id_type ?? null,
          national_id: p.national_id ?? null,
          abha_id: p.abha_id,
          allergies: p.allergies ?? null,
          blood_group: p.blood_group ?? null,
          last_age: fromDob ?? last?.age ?? null,
          last_visit_name: last?.patient_name ?? p.name,
          merged_into_patient_number: p.merged_into?.patient_number ?? null,
          merged_into_name: p.merged_into?.name ?? null,
          is_merged: Boolean(p.merged_into_patient_id),
        };
      }),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
