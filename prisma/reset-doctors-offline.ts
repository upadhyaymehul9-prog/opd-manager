import { PrismaClient } from "@prisma/client";
import { isValidClinicId, withClinicScope } from "../src/lib/tenant";

const prisma = new PrismaClient();

async function main() {
  const clinicId = process.env.CLINIC_ID;
  if (!clinicId || !isValidClinicId(clinicId)) {
    console.error("CLINIC_ID env var is required (see: npm run db:seed-clinic)");
    process.exit(1);
  }

  const result = await withClinicScope(clinicId, (tx) =>
    tx.doctor.updateMany({
      where: { clinic_id: clinicId },
      data: { opd_status: "offline" },
    }),
  );
  console.log(`Set ${result.count} doctor(s) to Not in OPD (offline).`);
  console.log("Each doctor must tap Available in OPD from their console.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
