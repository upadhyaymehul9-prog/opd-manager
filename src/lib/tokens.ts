import { prisma } from "@/lib/prisma";

function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function nextTokenNumber(): Promise<number> {
  const visitDate = todayDateOnly();

  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyToken.findUnique({
      where: { visit_date: visitDate },
    });

    if (existing) {
      return tx.dailyToken.update({
        where: { visit_date: visitDate },
        data: { last_token: { increment: 1 } },
      });
    }

    return tx.dailyToken.create({
      data: { visit_date: visitDate, last_token: 1 },
    });
  });

  return row.last_token;
}
