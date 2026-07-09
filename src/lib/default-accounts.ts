/**
 * Matches the fallback default in prisma/seed-users.ts. Only meaningful for
 * an account that has never had its password changed — seed-users.ts never
 * overwrites password_hash on an existing account, so once someone sets
 * their own password this constant simply no longer applies to them.
 *
 * This ships in the client bundle (it has to, to prefill the login form),
 * so it is not a secret. For a real deployment, set SEED_USER_PASSWORD to
 * something unique and drop the autofill-from-homepage convenience below.
 */
export const DEFAULT_BOOTSTRAP_PASSWORD = "Clinic@2026";
