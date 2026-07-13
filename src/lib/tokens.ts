import { prisma } from "@/lib/prisma";
import { istDateOnly } from "@/lib/date-range";

export async function nextTokenNumber(): Promise<number> {
  // Token numbers reset per IST calendar day (visit_date is a @db.Date), so
  // the day boundary must be pinned to IST regardless of server timezone.
  const visitDate = istDateOnly();

  // Atomic upsert: two registrations at opening time can't both create the
  // day's first token row (which previously raced to a P2002 collision).
  const row = await prisma.dailyToken.upsert({
    where: { visit_date: visitDate },
    create: { visit_date: visitDate, last_token: 1 },
    update: { last_token: { increment: 1 } },
  });

  return row.last_token;
}
