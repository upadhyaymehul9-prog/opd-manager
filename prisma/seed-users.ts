import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { withClinicScope } from "../src/lib/tenant";

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  { username: "admin", role: "admin", display_name: "Administrator" },
  { username: "manager", role: "manager", display_name: "OPD Manager" },
  { username: "reception", role: "reception", display_name: "Reception" },
  { username: "doctor", role: "doctor", display_name: "Doctor Console" },
  { username: "lab", role: "lab", display_name: "Laboratory" },
  { username: "radiology", role: "radiology", display_name: "Radiology" },
  { username: "pharmacy", role: "pharmacy", display_name: "Pharmacy" },
  { username: "tv", role: "display", display_name: "TV Display" },
] as const;

async function main() {
  const clinicId = process.env.CLINIC_ID;
  if (!clinicId) {
    console.error("CLINIC_ID env var is required (see: npm run db:seed-clinic)");
    process.exit(1);
  }

  const password = process.env.SEED_USER_PASSWORD?.trim() || "Clinic@2026";
  const hash = await bcrypt.hash(password, 12);

  await withClinicScope(clinicId, async (tx) => {
    for (const user of DEFAULT_USERS) {
      await tx.user.upsert({
        where: { clinic_id_username: { clinic_id: clinicId, username: user.username } },
        create: {
          clinic_id: clinicId,
          username: user.username,
          password_hash: hash,
          role: user.role,
          display_name: user.display_name,
          must_change_password: true,
        },
        update: {
          role: user.role,
          display_name: user.display_name,
        },
      });
    }
  });

  console.log(`Seeded clinic login accounts for clinic ${clinicId} (existing passwords left untouched):`);
  for (const user of DEFAULT_USERS) {
    console.log(`  ${user.username} / ${password}  (${user.display_name}) -- only applies if newly created`);
  }
  console.log("\nEach account must set its own password on first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
