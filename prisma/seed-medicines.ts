import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { withClinicScope } from "../src/lib/tenant";

const prisma = new PrismaClient();

type SeedMedicine = {
  name: string;
  brand?: string;
  form?: string;
  strength?: string;
};

const MEDICINES: SeedMedicine[] = JSON.parse(
  readFileSync(join(__dirname, "data", "common-medicines.json"), "utf8"),
);

async function main() {
  const clinicId = process.env.CLINIC_ID;
  if (!clinicId) {
    console.error("CLINIC_ID env var is required (see: npm run db:seed-clinic)");
    process.exit(1);
  }

  // One withClinicScope transaction per medicine, not one transaction for
  // the whole ~140-item catalog -- Prisma's default interactive-transaction
  // timeout (5s) is easily exceeded by that many sequential round trips.
  let created = 0;
  for (const med of MEDICINES) {
    const wasCreated = await withClinicScope(clinicId, async (tx) => {
      const existing = await tx.medicine.findFirst({
        where: {
          clinic_id: clinicId,
          name: { equals: med.name, mode: "insensitive" },
          brand: med.brand ?? null,
          form: med.form ?? null,
          strength: med.strength ?? null,
        },
      });
      if (existing) return false;

      await tx.medicine.create({
        data: {
          clinic_id: clinicId,
          name: med.name,
          brand: med.brand ?? null,
          form: med.form ?? null,
          strength: med.strength ?? null,
        },
      });
      return true;
    });
    if (wasCreated) created += 1;
  }

  const total = await withClinicScope(clinicId, (tx) =>
    tx.medicine.count({ where: { clinic_id: clinicId, is_active: true } }),
  );
  console.log(`Seeded ${created} new medicine(s). Catalog has ${total} active items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
