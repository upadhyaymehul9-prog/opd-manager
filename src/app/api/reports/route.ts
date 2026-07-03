import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const dayStart = dateParam
      ? startOfDay(new Date(dateParam))
      : startOfDay(new Date());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [visits, dispensedItems, procedures] = await Promise.all([
      prisma.patientVisit.findMany({
        where: { registered_at: { gte: dayStart, lt: dayEnd } },
        include: { doctors: { select: { id: true, name: true } } },
      }),
      prisma.prescriptionItem.findMany({
        where: {
          dispensed: true,
          dispensed_at: { gte: dayStart, lt: dayEnd },
        },
        include: {
          prescription: {
            include: {
              patient_visit: {
                select: {
                  token_number: true,
                  patient_name: true,
                  doctors: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.visitProcedure.findMany({
        where: { created_at: { gte: dayStart, lt: dayEnd } },
      }),
    ]);

    const medicineMap = new Map<
      string,
      { medicine_name: string; patients: number; total_qty: number }
    >();
    const patientSets = new Map<string, Set<string>>();

    for (const item of dispensedItems) {
      const key = item.medicine_name;
      const visitId = item.prescription.patient_visit_id;
      if (!medicineMap.has(key)) {
        medicineMap.set(key, {
          medicine_name: key,
          patients: 0,
          total_qty: 0,
        });
        patientSets.set(key, new Set());
      }
      const row = medicineMap.get(key)!;
      row.total_qty += item.quantity ?? 1;
      patientSets.get(key)!.add(visitId);
    }
    for (const [key, row] of medicineMap) {
      row.patients = patientSets.get(key)?.size ?? 0;
    }

    const byDoctor = new Map<
      string,
      { doctor_id: string; doctor_name: string; total: number; completed: number }
    >();
    for (const v of visits) {
      const id = v.doctor_id;
      if (!byDoctor.has(id)) {
        byDoctor.set(id, {
          doctor_id: id,
          doctor_name: v.doctors.name,
          total: 0,
          completed: 0,
        });
      }
      const row = byDoctor.get(id)!;
      row.total += 1;
      if (v.status === "completed") row.completed += 1;
    }

    const procedureCounts = new Map<string, number>();
    for (const p of procedures) {
      procedureCounts.set(
        p.procedure_type,
        (procedureCounts.get(p.procedure_type) ?? 0) + 1,
      );
    }

    return NextResponse.json({
      date: dayStart.toISOString().slice(0, 10),
      summary: {
        total_visits: visits.length,
        completed: visits.filter((v) => v.status === "completed").length,
        new_patients: visits.filter((v) => v.patient_type === "new").length,
        medicines_dispensed_lines: dispensedItems.length,
        procedures: procedures.length,
      },
      medicine_wise: [...medicineMap.values()].sort(
        (a, b) => b.patients - a.patients,
      ),
      doctor_wise: [...byDoctor.values()].sort((a, b) => b.total - a.total),
      procedures: [...procedureCounts.entries()].map(([type, count]) => ({
        procedure_type: type,
        count,
      })),
      recent_dispensed: dispensedItems.slice(0, 50).map((i) => ({
        medicine_name: i.medicine_name,
        quantity: i.quantity,
        patient_name: i.prescription.patient_visit.patient_name,
        token_number: i.prescription.patient_visit.token_number,
        doctor_name: i.prescription.patient_visit.doctors.name,
        dispensed_at: i.dispensed_at?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Report error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
