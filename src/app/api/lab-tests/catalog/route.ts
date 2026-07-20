import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LAB_TESTS, serializeLabCatalog } from "@/lib/lab-tests";

async function ensureDefaultCatalog() {
  const existing = await prisma.labTestCatalog.findMany({
    select: { name: true },
  });
  const have = new Set(existing.map((r) => r.name.trim().toLowerCase()));
  const missing = DEFAULT_LAB_TESTS.filter(
    (t) => !have.has(t.name.trim().toLowerCase()),
  );
  if (missing.length === 0) return;
  await prisma.labTestCatalog.createMany({
    data: missing.map((t) => ({
      name: t.name,
      unit: t.unit,
      ref_range: t.ref_range,
      value_type: t.value_type,
    })),
  });
}

export async function GET(request: Request) {
  try {
    await ensureDefaultCatalog();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? (q ? 50 : 200)), 500);

    const rows = await prisma.labTestCatalog.findMany({
      where: {
        is_active: true,
        ...(q
          ? { name: { contains: q, mode: "insensitive" } }
          : {}),
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json(rows.map(serializeLabCatalog));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Catalog error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Test name is required" }, { status: 400 });
    }

    const unit = body.unit?.trim() || null;
    const ref_range = body.ref_range?.trim() || null;
    const value_type = body.value_type === "text" ? "text" : body.value_type === "both" ? "both" : "numeric";

    const existing = await prisma.labTestCatalog.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(serializeLabCatalog(existing));
    }

    const row = await prisma.labTestCatalog.create({
      data: { name, unit, ref_range, value_type },
    });
    return NextResponse.json(serializeLabCatalog(row), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Catalog error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
