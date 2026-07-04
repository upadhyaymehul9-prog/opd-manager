import { prisma } from "@/lib/prisma";
import { formatMedicineLabel } from "@/lib/medicine";
import { startOfDay } from "@/lib/stock";

export const STOCK_AUDIT_DEPARTMENTS = [
  { id: "pharmacy", label: "Pharmacy" },
  { id: "lab", label: "Lab (coming soon)" },
  { id: "radiology", label: "Radiology (coming soon)" },
] as const;

export type StockAuditDepartment = (typeof STOCK_AUDIT_DEPARTMENTS)[number]["id"];

export type StockAuditSnapshotLine = {
  medicine_id: string;
  medicine_name: string;
  system_qty: number;
};

export type StockAuditLineView = {
  id: string;
  medicine_id: string;
  medicine_name: string;
  system_qty: number;
  physical_qty: number;
  difference: number;
  notes: string | null;
};

export type StockAuditView = {
  id: string;
  audit_date: string;
  department: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  lines: StockAuditLineView[];
  summary: {
    medicines_counted: number;
    matched: number;
    short_items: number;
    short_qty: number;
    excess_items: number;
    excess_qty: number;
  };
};

export async function getPharmacyStockSnapshot(): Promise<StockAuditSnapshotLine[]> {
  const medicines = await prisma.medicine.findMany({
    where: { is_active: true },
    include: {
      stock_batches: {
        where: { quantity: { gt: 0 } },
      },
      _count: { select: { stock_batches: true } },
    },
    orderBy: { name: "asc" },
  });

  const today = startOfDay(new Date());

  return medicines
    .filter((med) => med._count.stock_batches > 0)
    .map((med) => {
      const system_qty = med.stock_batches
        .filter((b) => startOfDay(b.expiry_date) >= today)
        .reduce((sum, b) => sum + b.quantity, 0);
      return {
        medicine_id: med.id,
        medicine_name: formatMedicineLabel(med),
        system_qty,
      };
    })
    .filter((row) => row.system_qty > 0);
}

export async function saveStockAudit(input: {
  audit_date: string;
  department: string;
  created_by?: string | null;
  notes?: string | null;
  lines: {
    medicine_id: string;
    medicine_name: string;
    system_qty: number;
    physical_qty: number;
    notes?: string | null;
  }[];
}): Promise<StockAuditView> {
  if (input.department !== "pharmacy") {
    throw new Error("Only pharmacy stock audit is available right now");
  }
  if (input.lines.length === 0) {
    throw new Error("Enter physical count for at least one medicine");
  }

  const audit = await prisma.stockAudit.create({
    data: {
      audit_date: startOfDay(new Date(input.audit_date)),
      department: input.department,
      notes: input.notes?.trim() || null,
      created_by: input.created_by ?? null,
      lines: {
        create: input.lines.map((line) => ({
          medicine_id: line.medicine_id,
          medicine_name: line.medicine_name,
          system_qty: line.system_qty,
          physical_qty: line.physical_qty,
          difference: line.physical_qty - line.system_qty,
          notes: line.notes?.trim() || null,
        })),
      },
    },
    include: { lines: { orderBy: { medicine_name: "asc" } } },
  });

  return serializeAudit(audit);
}

export async function listStockAudits(limit = 20) {
  const rows = await prisma.stockAudit.findMany({
    orderBy: { audit_date: "desc" },
    take: limit,
    include: { lines: true },
  });
  return rows.map(serializeAudit);
}

export async function getStockAudit(id: string) {
  const audit = await prisma.stockAudit.findUnique({
    where: { id },
    include: { lines: { orderBy: { medicine_name: "asc" } } },
  });
  if (!audit) return null;
  return serializeAudit(audit);
}

function summarize(lines: StockAuditLineView[]) {
  let matched = 0;
  let short_items = 0;
  let short_qty = 0;
  let excess_items = 0;
  let excess_qty = 0;

  for (const line of lines) {
    if (line.difference === 0) matched += 1;
    else if (line.difference < 0) {
      short_items += 1;
      short_qty += Math.abs(line.difference);
    } else {
      excess_items += 1;
      excess_qty += line.difference;
    }
  }

  return {
    medicines_counted: lines.length,
    matched,
    short_items,
    short_qty,
    excess_items,
    excess_qty,
  };
}

function serializeAudit(audit: {
  id: string;
  audit_date: Date;
  department: string;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  lines: {
    id: string;
    medicine_id: string;
    medicine_name: string;
    system_qty: number;
    physical_qty: number;
    difference: number;
    notes: string | null;
  }[];
}): StockAuditView {
  const lines = audit.lines.map((line) => ({
    id: line.id,
    medicine_id: line.medicine_id,
    medicine_name: line.medicine_name,
    system_qty: line.system_qty,
    physical_qty: line.physical_qty,
    difference: line.difference,
    notes: line.notes,
  }));

  return {
    id: audit.id,
    audit_date: audit.audit_date.toISOString().slice(0, 10),
    department: audit.department,
    notes: audit.notes,
    created_by: audit.created_by,
    created_at: audit.created_at.toISOString(),
    lines,
    summary: summarize(lines),
  };
}
