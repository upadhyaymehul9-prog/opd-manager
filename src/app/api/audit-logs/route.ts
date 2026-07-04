import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const action = searchParams.get("action");

    const logs = await prisma.auditLog.findMany({
      where: action ? { action } : undefined,
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        username: true,
        role: true,
        action: true,
        entity_type: true,
        entity_id: true,
        summary: true,
        ip_address: true,
        created_at: true,
      },
    });

    return NextResponse.json(logs);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
