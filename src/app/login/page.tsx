import { headers } from "next/headers";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./LoginForm";

async function getClinicName(): Promise<string | null> {
  const clinicId = (await headers()).get("x-clinic-id");
  if (!clinicId) return null;
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true },
  });
  return clinic?.name ?? null;
}

export default async function LoginPage() {
  const clinicName = await getClinicName();
  return (
    <Suspense>
      <LoginForm clinicName={clinicName} />
    </Suspense>
  );
}
