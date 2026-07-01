import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  const password =
    process.env.SEED_USER_PASSWORD?.trim() || "Clinic@2026";

  const hash = await bcrypt.hash(password, 12);

  for (const user of DEFAULT_USERS) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
        username: user.username,
        password_hash: hash,
        role: user.role,
        display_name: user.display_name,
      },
      update: {
        password_hash: hash,
        role: user.role,
        display_name: user.display_name,
      },
    });
  }

  console.log("Seeded clinic login accounts:");
  for (const user of DEFAULT_USERS) {
    console.log(`  ${user.username} / ${password}  (${user.display_name})`);
  }
  console.log("\nChange passwords after first login in production.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
