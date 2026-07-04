import { addDays, startOfDay } from "date-fns";
import { PAYMENT_MODES } from "@/lib/billing-types";
import { prisma } from "@/lib/prisma";

export type ModeTotal = {
  mode: string;
  bills: number;
  amount: number;
};

export type ReconciliationReport = {
  date: string;
  reception: {
    by_mode: ModeTotal[];
    total: { bills: number; amount: number };
    lines: {
      bill_no: string | null;
      patient_name: string;
      token_number: number;
      payment_mode: string;
      amount: number;
      paid_at: string;
    }[];
  };
  pharmacy: {
    by_mode: ModeTotal[];
    total: { bills: number; amount: number; gst: number };
    lines: {
      bill_no: string;
      patient_name: string;
      token_number: number;
      payment_mode: string;
      amount: number;
      gst: number;
      created_at: string;
    }[];
  };
  combined: { mode: string; amount: number }[];
  grand_total: number;
};

function sumByMode(
  rows: { payment_mode: string; amount: number }[],
): ModeTotal[] {
  const map = new Map<string, { bills: number; amount: number }>();
  for (const mode of PAYMENT_MODES) {
    map.set(mode, { bills: 0, amount: 0 });
  }
  for (const row of rows) {
    const mode = row.payment_mode?.toLowerCase() || "cash";
    const cur = map.get(mode) ?? { bills: 0, amount: 0 };
    cur.bills += 1;
    cur.amount += row.amount;
    map.set(mode, cur);
  }
  return PAYMENT_MODES.map((mode) => ({
    mode,
    bills: map.get(mode)!.bills,
    amount: Math.round(map.get(mode)!.amount * 100) / 100,
  }));
}

export async function buildReconciliation(date: Date): Promise<ReconciliationReport> {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const dateStr = dayStart.toISOString().slice(0, 10);

  const [consultationVisits, pharmacyBills] = await Promise.all([
    prisma.patientVisit.findMany({
      where: {
        consultation_paid_at: { gte: dayStart, lt: dayEnd },
        consultation_fee: { not: null, gt: 0 },
      },
      orderBy: { consultation_paid_at: "asc" },
      select: {
        patient_name: true,
        token_number: true,
        consultation_bill_no: true,
        consultation_payment_mode: true,
        consultation_fee: true,
        consultation_paid_at: true,
      },
    }),
    prisma.pharmacyBill.findMany({
      where: { created_at: { gte: dayStart, lt: dayEnd } },
      orderBy: { created_at: "asc" },
      include: {
        patient_visit: {
          select: { patient_name: true, token_number: true },
        },
      },
    }),
  ]);

  const receptionRows = consultationVisits.map((v) => ({
    payment_mode: v.consultation_payment_mode ?? "cash",
    amount: v.consultation_fee ?? 0,
  }));

  const pharmacyRows = pharmacyBills.map((b) => ({
    payment_mode: b.payment_mode,
    amount: b.grand_total,
  }));

  const receptionByMode = sumByMode(receptionRows);
  const pharmacyByMode = sumByMode(pharmacyRows);

  const combinedMap = new Map<string, number>();
  for (const mode of PAYMENT_MODES) combinedMap.set(mode, 0);
  for (const row of [...receptionRows, ...pharmacyRows]) {
    const mode = row.payment_mode?.toLowerCase() || "cash";
    combinedMap.set(mode, (combinedMap.get(mode) ?? 0) + row.amount);
  }

  const combined = PAYMENT_MODES.map((mode) => ({
    mode,
    amount: Math.round((combinedMap.get(mode) ?? 0) * 100) / 100,
  }));

  const grand_total = Math.round(combined.reduce((s, c) => s + c.amount, 0) * 100) / 100;

  return {
    date: dateStr,
    reception: {
      by_mode: receptionByMode,
      total: {
        bills: consultationVisits.length,
        amount: Math.round(receptionRows.reduce((s, r) => s + r.amount, 0) * 100) / 100,
      },
      lines: consultationVisits.map((v) => ({
        bill_no: v.consultation_bill_no,
        patient_name: v.patient_name,
        token_number: v.token_number,
        payment_mode: v.consultation_payment_mode ?? "cash",
        amount: v.consultation_fee ?? 0,
        paid_at: v.consultation_paid_at!.toISOString(),
      })),
    },
    pharmacy: {
      by_mode: pharmacyByMode,
      total: {
        bills: pharmacyBills.length,
        amount: Math.round(pharmacyRows.reduce((s, r) => s + r.amount, 0) * 100) / 100,
        gst: Math.round(pharmacyBills.reduce((s, b) => s + b.gst_total, 0) * 100) / 100,
      },
      lines: pharmacyBills.map((b) => ({
        bill_no: b.bill_no,
        patient_name: b.patient_visit.patient_name,
        token_number: b.patient_visit.token_number,
        payment_mode: b.payment_mode,
        amount: b.grand_total,
        gst: b.gst_total,
        created_at: b.created_at.toISOString(),
      })),
    },
    combined,
    grand_total,
  };
}
