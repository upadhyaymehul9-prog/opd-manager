import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidClinicId(clinicId: string): boolean {
  return UUID_PATTERN.test(clinicId);
}

/**
 * Runs `fn` with a Prisma client scoped to one clinic: every query inside
 * `fn` executes in a transaction that has already set the Postgres session
 * variable the RLS policies check (see the enable_rls migration). This is
 * the only supported way to touch tenant data -- it's not possible to
 * "forget" the clinic filter, because there is no clinic-unaware path.
 */
export async function withClinicScope<T>(
  clinicId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!isValidClinicId(clinicId)) {
    throw new Error(`withClinicScope: invalid clinicId "${clinicId}"`);
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.clinic_id = '${clinicId}'`,
    );
    return fn(tx);
  });
}
