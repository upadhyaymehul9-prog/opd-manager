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

  // On re-run this must never touch password_hash/must_change_password for
  // an account that already exists -- someone may have already set their
  // own password, and silently resetting it back to the shared default
  // would undo that (and re-force a change on an account that doesn't need
  // one). Only brand-new accounts get the default password.
  for (const user of DEFAULT_USERS) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: {
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

  console.log("Seeded clinic login accounts (existing passwords left untouched):");
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
