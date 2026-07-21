import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { buildBillPreview } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prescriptionId = searchParams.get("prescription_id")?.trim();

    if (!prescriptionId) {
      return NextResponse.json(
        { error: "prescription_id required" },
        { status: 400 },
      );
    }

    const preview = await prisma.$transaction((tx) =>
      buildBillPreview(tx, prescriptionId),
    );

    return NextResponse.json(preview);
  } catch (e) {
    return errorResponse("bills/preview GET", e, "Preview error");
  }
}
