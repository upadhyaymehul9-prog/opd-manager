import { PrismaClient } from "@prisma/client";
import { isValidClinicSlug } from "../src/lib/clinic-slug";

const prisma = new PrismaClient();

function argValue(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=").slice(1).join("=");
}

async function main() {
  const slug = argValue("slug");
  const name = argValue("name");

  if (!slug || !name) {
    console.error('Usage: npm run db:seed-clinic -- --slug=<slug> --name="<Clinic Name>"');
    process.exit(1);
  }
  if (!isValidClinicSlug(slug)) {
    console.error(`Invalid slug "${slug}" — lowercase alphanumeric + hyphens, 3-63 chars, not reserved.`);
    process.exit(1);
  }

  const existing = await prisma.clinic.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Clinic "${slug}" already exists (id: ${existing.id}). Skipping.`);
    console.log(existing.id);
    return;
  }

  const clinic = await prisma.clinic.create({
    data: {
      slug,
      name,
      status: "active",
    },
  });

  await prisma.clinicSettings.create({
    data: {
      clinic_id: clinic.id,
      display_name: name,
    },
  });

  console.log(`Created clinic "${name}" (slug: ${slug})`);
  console.log(`CLINIC_ID=${clinic.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
