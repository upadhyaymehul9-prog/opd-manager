import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clinicId = process.env.CLINIC_ID;
  if (!clinicId) {
    console.error("CLINIC_ID env var is required (see: npm run db:seed-clinic)");
    process.exit(1);
  }

  const count = await prisma.doctor.count({ where: { clinic_id: clinicId } });
  if (count > 0) {
    console.log("Doctors already seeded for this clinic, skipping.");
    return;
  }

  await prisma.doctor.createMany({
    data: [
      { clinic_id: clinicId, name: "Dr. Sharma", room_number: "101", specialty: "General Medicine", opd_status: "offline" },
      { clinic_id: clinicId, name: "Dr. Patel", room_number: "102", specialty: "Cardiology", opd_status: "offline" },
      { clinic_id: clinicId, name: "Dr. Khan", room_number: "103", specialty: "Orthopedics", opd_status: "offline" },
    ],
  });

  console.log("Seeded 3 sample doctors.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
