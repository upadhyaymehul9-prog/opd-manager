import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let clinicAId: string;
let clinicBId: string;

beforeAll(async () => {
  const clinicA = await prisma.clinic.create({
    data: { slug: "rls-test-a", name: "RLS Test Clinic A" },
  });
  const clinicB = await prisma.clinic.create({
    data: { slug: "rls-test-b", name: "RLS Test Clinic B" },
  });
  clinicAId = clinicA.id;
  clinicBId = clinicB.id;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicAId}'`);
    await tx.doctor.create({
      data: { clinic_id: clinicAId, name: "Dr. A", room_number: "1" },
    });
  });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicBId}'`);
    await tx.doctor.create({
      data: { clinic_id: clinicBId, name: "Dr. B", room_number: "1" },
    });
  });
});

afterAll(async () => {
  // Deleting the clinics cascades nothing (onDelete: Restrict on doctors),
  // so clean up the doctors first, then the clinics, bypassing RLS by
  // setting each clinic_id in turn.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicAId}'`);
    await tx.doctor.deleteMany({ where: { clinic_id: clinicAId } });
  });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicBId}'`);
    await tx.doctor.deleteMany({ where: { clinic_id: clinicBId } });
  });
  await prisma.clinic.deleteMany({ where: { id: { in: [clinicAId, clinicBId] } } });
  await prisma.$disconnect();
});

describe("Postgres RLS tenant isolation", () => {
  it("a session scoped to clinic A cannot see clinic B's rows", async () => {
    const doctors = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicAId}'`);
      return tx.doctor.findMany();
    });
    expect(doctors.every((d) => d.clinic_id === clinicAId)).toBe(true);
    expect(doctors.some((d) => d.clinic_id === clinicBId)).toBe(false);
  });

  it("a session with no app.clinic_id set sees zero rows (fail closed)", async () => {
    const doctors = await prisma.$transaction(async (tx) => {
      return tx.doctor.findMany();
    });
    expect(doctors).toHaveLength(0);
  });

  it("a session scoped to clinic A cannot write a row claiming clinic B's id", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicAId}'`);
        await tx.doctor.create({
          data: { clinic_id: clinicBId, name: "Sneaky", room_number: "9" },
        });
      }),
    ).rejects.toThrow();
  });
});
