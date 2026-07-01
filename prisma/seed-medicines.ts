import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

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
  let created = 0;
  for (const med of MEDICINES) {
    const existing = await prisma.medicine.findFirst({
      where: {
        name: { equals: med.name, mode: "insensitive" },
        brand: med.brand ?? null,
        form: med.form ?? null,
        strength: med.strength ?? null,
      },
    });
    if (existing) continue;

    await prisma.medicine.create({
      data: {
        name: med.name,
        brand: med.brand ?? null,
        form: med.form ?? null,
        strength: med.strength ?? null,
      },
    });
    created += 1;
  }

  const total = await prisma.medicine.count({ where: { is_active: true } });
  console.log(`Seeded ${created} new medicine(s). Catalog has ${total} active items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
