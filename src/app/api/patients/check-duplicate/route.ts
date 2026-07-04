import { NextResponse } from "next/server";
import { findDuplicatePatients } from "@/lib/duplicate-patients";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") ?? "";
    const mobile = searchParams.get("mobile");
    const abha_id = searchParams.get("abha_id");
    const national_id = searchParams.get("national_id");
    const exclude = searchParams.get("exclude_patient_id");

    if (!name.trim() && !mobile && !abha_id && !national_id) {
      return NextResponse.json([]);
    }

    const matches = await findDuplicatePatients({
      name: name.trim() || " ",
      mobile,
      abha_id,
      national_id,
      exclude_patient_id: exclude ?? undefined,
    });

    return NextResponse.json(
      matches.map((p) => ({
        ...p,
        date_of_birth: p.date_of_birth?.toISOString().slice(0, 10) ?? null,
      })),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
