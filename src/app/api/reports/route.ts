import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRange } from "@/lib/date-range";

const LAB_STATUSES = new Set([
  "to_lab",
  "at_lab",
  "lab_processing",
  "lab_ready",
]);
const RADIO_STATUSES = new Set([
  "to_radiology",
  "at_radiology",
  "radio_processing",
  "radio_ready",
]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { rangeStart, rangeEndExclusive, from, to } =
      resolveRange(searchParams);

    const [visits, dispensedItems, procedures, pharmacyBills] =
      await Promise.all([
        prisma.patientVisit.findMany({
          where: {
            registered_at: { gte: rangeStart, lt: rangeEndExclusive },
          },
          include: { doctors: { select: { id: true, name: true } } },
        }),
        prisma.prescriptionItem.findMany({
          where: {
            dispensed: true,
            dispensed_at: { gte: rangeStart, lt: rangeEndExclusive },
          },
          include: {
            prescription: {
              include: {
                patient_visit: {
                  select: {
                    id: true,
                    token_number: true,
                    patient_name: true,
                    doctors: { select: { name: true } },
                    patient: { select: { patient_number: true } },
                  },
                },
              },
            },
          },
          orderBy: { dispensed_at: "desc" },
        }),
        prisma.visitProcedure.findMany({
          where: { created_at: { gte: rangeStart, lt: rangeEndExclusive } },
          include: {
            patient_visit: {
              select: { patient_name: true, token_number: true },
            },
          },
        }),
        prisma.pharmacyBill.findMany({
          where: { created_at: { gte: rangeStart, lt: rangeEndExclusive } },
          include: {
            patient_visit: {
              select: { patient_name: true, token_number: true },
            },
          },
          orderBy: { created_at: "desc" },
        }),
      ]);

    const medicineMap = new Map<
      string,
      {
        medicine_name: string;
        patients: number;
        total_qty: number;
        patient_rows: {
          patient_name: string;
          token_number: number;
          patient_number: number | null;
          quantity: number;
          dispensed_at: string | null;
          doctor_name: string;
        }[];
      }
    >();
    const patientSets = new Map<string, Set<string>>();

    for (const item of dispensedItems) {
      const key = item.medicine_name;
      const visit = item.prescription.patient_visit;
      const visitId = item.prescription.patient_visit_id;
      const qty = item.quantity ?? 1;

      if (!medicineMap.has(key)) {
        medicineMap.set(key, {
          medicine_name: key,
          patients: 0,
          total_qty: 0,
          patient_rows: [],
        });
        patientSets.set(key, new Set());
      }
      const row = medicineMap.get(key)!;
      row.total_qty += qty;
      patientSets.get(key)!.add(visitId);
      row.patient_rows.push({
        patient_name: visit.patient_name,
        token_number: visit.token_number,
        patient_number: visit.patient?.patient_number ?? null,
        quantity: qty,
        dispensed_at: item.dispensed_at?.toISOString() ?? null,
        doctor_name: visit.doctors.name,
      });
    }
    for (const [key, row] of medicineMap) {
      row.patients = patientSets.get(key)?.size ?? 0;
    }

    const byDoctor = new Map<
      string,
      {
        doctor_id: string;
        doctor_name: string;
        total: number;
        completed: number;
        consultation_revenue: number;
      }
    >();
    for (const v of visits) {
      const id = v.doctor_id;
      if (!byDoctor.has(id)) {
        byDoctor.set(id, {
          doctor_id: id,
          doctor_name: v.doctors.name,
          total: 0,
          completed: 0,
          consultation_revenue: 0,
        });
      }
      const row = byDoctor.get(id)!;
      row.total += 1;
      if (v.status === "completed") row.completed += 1;
      if (
        v.consultation_paid_at &&
        v.consultation_paid_at >= rangeStart &&
        v.consultation_paid_at < rangeEndExclusive &&
        v.consultation_fee
      ) {
        row.consultation_revenue += v.consultation_fee;
      }
    }

    const procedureCounts = new Map<string, number>();
    let procedureRevenue = 0;
    for (const p of procedures) {
      procedureCounts.set(
        p.procedure_type,
        (procedureCounts.get(p.procedure_type) ?? 0) + 1,
      );
      procedureRevenue += p.fee ?? 0;
    }

    const consultationVisits = visits.filter(
      (v) =>
        v.consultation_paid_at &&
        v.consultation_paid_at >= rangeStart &&
        v.consultation_paid_at < rangeEndExclusive &&
        v.consultation_fee,
    );
    const consultationRevenue = consultationVisits.reduce(
      (s, v) => s + (v.consultation_fee ?? 0),
      0,
    );

    const pharmacyRevenue = pharmacyBills.reduce((s, b) => s + b.grand_total, 0);
    const pharmacyGst = pharmacyBills.reduce((s, b) => s + b.gst_total, 0);

    const labVisits = visits.filter(
      (v) => v.lab_referred || LAB_STATUSES.has(v.status),
    );
    const radioVisits = visits.filter(
      (v) => v.radio_referred || RADIO_STATUSES.has(v.status),
    );

    const labReady = labVisits.filter((v) =>
      ["lab_ready", "completed"].includes(v.status),
    ).length;
    const radioReady = radioVisits.filter((v) =>
      ["radio_ready", "completed"].includes(v.status),
    ).length;

    return NextResponse.json({
      from,
      to,
      date: from === to ? from : null,
      summary: {
        total_visits: visits.length,
        completed: visits.filter((v) => v.status === "completed").length,
        new_patients: visits.filter((v) => v.patient_type === "new").length,
        medicines_dispensed_lines: dispensedItems.length,
        procedures: procedures.length,
      },
      revenue: {
        total: consultationRevenue + pharmacyRevenue + procedureRevenue,
        reception: {
          bills: consultationVisits.length,
          amount: consultationRevenue,
        },
        pharmacy: {
          bills: pharmacyBills.length,
          amount: pharmacyRevenue,
          gst: pharmacyGst,
        },
        procedures: {
          count: procedures.length,
          amount: procedureRevenue,
        },
        lab: {
          referrals: labVisits.length,
          reports_ready: labReady,
          amount: 0,
        },
        radiology: {
          referrals: radioVisits.length,
          reports_ready: radioReady,
          amount: 0,
        },
      },
      medicine_wise: [...medicineMap.values()].sort(
        (a, b) => b.total_qty - a.total_qty,
      ),
      patient_medicine: dispensedItems.map((i) => ({
        medicine_name: i.medicine_name,
        quantity: i.quantity ?? 1,
        patient_name: i.prescription.patient_visit.patient_name,
        patient_number:
          i.prescription.patient_visit.patient?.patient_number ?? null,
        token_number: i.prescription.patient_visit.token_number,
        doctor_name: i.prescription.patient_visit.doctors.name,
        dispensed_at: i.dispensed_at?.toISOString() ?? null,
      })),
      doctor_wise: [...byDoctor.values()].sort((a, b) => b.total - a.total),
      procedures: [...procedureCounts.entries()].map(([type, count]) => ({
        procedure_type: type,
        count,
      })),
      pharmacy_bills: pharmacyBills.map((b) => ({
        bill_no: b.bill_no,
        patient_name: b.patient_visit.patient_name,
        token_number: b.patient_visit.token_number,
        payment_mode: b.payment_mode,
        grand_total: b.grand_total,
        created_at: b.created_at.toISOString(),
      })),
      reception_registrations: visits.map((v) => ({
        token_number: v.token_number,
        patient_name: v.patient_name,
        patient_type: v.patient_type,
        doctor_name: v.doctors.name,
        consultation_fee: v.consultation_fee,
        consultation_paid_at: v.consultation_paid_at?.toISOString() ?? null,
        registered_at: v.registered_at.toISOString(),
        status: v.status,
      })),
      lab_visits: labVisits.map((v) => ({
        token_number: v.token_number,
        patient_name: v.patient_name,
        doctor_name: v.doctors.name,
        status: v.status,
        lab_started_at: v.lab_started_at?.toISOString() ?? null,
        lab_ready_at: v.lab_ready_at?.toISOString() ?? null,
        registered_at: v.registered_at.toISOString(),
      })),
      radiology_visits: radioVisits.map((v) => ({
        token_number: v.token_number,
        patient_name: v.patient_name,
        doctor_name: v.doctors.name,
        status: v.status,
        radio_started_at: v.radio_started_at?.toISOString() ?? null,
        radio_ready_at: v.radio_ready_at?.toISOString() ?? null,
        registered_at: v.registered_at.toISOString(),
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Report error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
