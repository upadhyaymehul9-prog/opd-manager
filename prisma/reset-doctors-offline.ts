import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.doctor.updateMany({
    data: { opd_status: "offline" },
  });
  console.log(`Set ${result.count} doctor(s) to Not in OPD (offline).`);
  console.log("Each doctor must tap Available in OPD from their console.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
