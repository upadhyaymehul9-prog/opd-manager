import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireApi } from "@/lib/api-guard";
import { serializeMedicine } from "@/lib/serialize";
import { serializeBatch, startOfDay } from "@/lib/stock";
import { withClinicScope } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const guard = await requireApi(request);
    if (guard.response) return guard.response;
    const { session } = guard;

    const today = startOfDay(new Date());

    const batches = await withClinicScope(session.clinicId, (tx) =>
      tx.stockBatch.findMany({
        where: {
          quantity: { gt: 0 },
          expiry_date: { lt: today },
        },
        include: { medicine: true },
        orderBy: [{ expiry_date: "asc" }, { medicine: { name: "asc" } }],
      }),
    );

    return NextResponse.json(
      batches.map((b) => ({
        batch: serializeBatch(b),
        medicine: serializeMedicine(b.medicine),
      })),
    );
  } catch (e) {
    return errorResponse("stock/expired GET", e, "Expired stock error");
  }
}
