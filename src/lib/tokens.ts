import type { Prisma } from "@prisma/client";
import { istDateOnly } from "@/lib/date-range";

type Tx = Prisma.TransactionClient;

export async function nextTokenNumber(tx: Tx, clinicId: string): Promise<number> {
  // Token numbers reset per IST calendar day (visit_date is a @db.Date), so
  // the day boundary must be pinned to IST regardless of server timezone.
  const visitDate = istDateOnly();

  // Atomic upsert: two registrations at opening time can't both create the
  // day's first token row (which previously raced to a P2002 collision).
  const row = await tx.dailyToken.upsert({
    where: { clinic_id_visit_date: { clinic_id: clinicId, visit_date: visitDate } },
    create: { clinic_id: clinicId, visit_date: visitDate, last_token: 1 },
    update: { last_token: { increment: 1 } },
  });

  return row.last_token;
}
