import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.doctor.count();
  if (count > 0) {
    console.log("Doctors already seeded, skipping.");
    return;
  }

  await prisma.doctor.createMany({
    data: [
      {
        name: "Dr. Sharma",
        room_number: "101",
        specialty: "General Medicine",
        opd_status: "offline",
      },
      {
        name: "Dr. Patel",
        room_number: "102",
        specialty: "Cardiology",
        opd_status: "offline",
      },
      {
        name: "Dr. Khan",
        room_number: "103",
        specialty: "Orthopedics",
        opd_status: "offline",
      },
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
