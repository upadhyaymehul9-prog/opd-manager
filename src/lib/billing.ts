import { format } from "date-fns";
import type { Prisma } from "@prisma/client";
import type {
  BillPreview,
  BillPreviewLine,
  PaymentMode,
  PharmacyBillView,
} from "@/lib/billing-types";
import { DEFAULT_GST_RATE, PAYMENT_MODES } from "@/lib/billing-types";
import { startOfDay, usableBatchWhere } from "@/lib/stock";

type Tx = Prisma.TransactionClient;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isPaymentMode(value: string): value is PaymentMode {
  return (PAYMENT_MODES as readonly string[]).includes(value);
}

export function calculateLine(
  quantity: number,
  unitPrice: number,
  gstRate: number,
): Pick<BillPreviewLine, "taxable_amount" | "gst_amount" | "line_total"> {
  const taxable_amount = round2(quantity * unitPrice);
  const gst_amount = round2((taxable_amount * gstRate) / 100);
  return {
    taxable_amount,
    gst_amount,
    line_total: round2(taxable_amount + gst_amount),
  };
}

export async function getSuggestedUnitPrice(
  tx: Tx,
  medicineId: string | null,
): Promise<number> {
  if (!medicineId) return 0;
  const batch = await tx.stockBatch.findFirst({
    where: {
      ...usableBatchWhere(medicineId),
      mrp: { not: null },
    },
    orderBy: [{ expiry_date: "asc" }, { created_at: "asc" }],
  });
  return batch?.mrp ?? 0;
}

export async function buildBillPreview(
  tx: Tx,
  prescriptionId: string,
  priceOverrides?: Map<string, number>,
): Promise<BillPreview> {
  const prescription = await tx.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      items: {
        where: { dispensed: true },
        orderBy: { sort_order: "asc" },
        include: { medicine: true },
      },
    },
  });

  if (!prescription) {
    throw new Error("Prescription not found");
  }

  if (prescription.items.length === 0) {
    throw new Error("No dispensed medicines to bill");
  }

  const lines: BillPreviewLine[] = [];

  for (const item of prescription.items) {
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const gst_rate = item.medicine?.gst_rate ?? DEFAULT_GST_RATE;
    const suggested = await getSuggestedUnitPrice(tx, item.medicine_id);
    const unit_price = round2(priceOverrides?.get(item.id) ?? suggested);
    const amounts = calculateLine(quantity, unit_price, gst_rate);

    lines.push({
      prescription_item_id: item.id,
      medicine_name: item.medicine_name,
      quantity,
      unit_price,
      gst_rate,
      ...amounts,
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.taxable_amount, 0));
  const gst_total = round2(lines.reduce((s, l) => s + l.gst_amount, 0));

  return {
    prescription_id: prescriptionId,
    subtotal,
    gst_total,
    grand_total: round2(subtotal + gst_total),
    lines,
  };
}

export async function generateBillNo(tx: Tx): Promise<string> {
  const today = format(new Date(), "yyyyMMdd");
  const prefix = `PH-${today}-`;
  const todayStart = startOfDay(new Date());
  const count = await tx.pharmacyBill.count({
    where: { created_at: { gte: todayStart } },
  });
  return `${prefix}${String(count + 1).padStart(3, "0")}`;
}

export function serializeBill(bill: {
  id: string;
  bill_no: string;
  patient_visit_id: string;
  prescription_id: string;
  payment_mode: string;
  subtotal: number;
  gst_total: number;
  grand_total: number;
  created_at: Date;
  items: {
    id: string;
    prescription_item_id: string | null;
    medicine_name: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    taxable_amount: number;
    gst_amount: number;
    line_total: number;
  }[];
}): PharmacyBillView {
  return {
    id: bill.id,
    bill_no: bill.bill_no,
    patient_visit_id: bill.patient_visit_id,
    prescription_id: bill.prescription_id,
    payment_mode: bill.payment_mode as PaymentMode,
    subtotal: bill.subtotal,
    gst_total: bill.gst_total,
    grand_total: bill.grand_total,
    created_at: bill.created_at.toISOString(),
    items: bill.items.map((i) => ({
      id: i.id,
      prescription_item_id: i.prescription_item_id,
      medicine_name: i.medicine_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      gst_rate: i.gst_rate,
      taxable_amount: i.taxable_amount,
      gst_amount: i.gst_amount,
      line_total: i.line_total,
    })),
  };
}

export async function createPharmacyBill(
  tx: Tx,
  prescriptionId: string,
  paymentMode: PaymentMode,
  priceOverrides?: Map<string, number>,
) {
  const existing = await tx.pharmacyBill.findUnique({
    where: { prescription_id: prescriptionId },
  });
  if (existing) {
    return tx.pharmacyBill.findUniqueOrThrow({
      where: { id: existing.id },
      include: { items: true },
    });
  }

  const prescription = await tx.prescription.findUnique({
    where: { id: prescriptionId },
  });
  if (!prescription) throw new Error("Prescription not found");

  const preview = await buildBillPreview(tx, prescriptionId, priceOverrides);
  const bill_no = await generateBillNo(tx);

  return tx.pharmacyBill.create({
    data: {
      bill_no,
      patient_visit_id: prescription.patient_visit_id,
      prescription_id: prescriptionId,
      payment_mode: paymentMode,
      subtotal: preview.subtotal,
      gst_total: preview.gst_total,
      grand_total: preview.grand_total,
      items: {
        create: preview.lines.map((line) => ({
          prescription_item_id: line.prescription_item_id,
          medicine_name: line.medicine_name,
          quantity: line.quantity,
          unit_price: line.unit_price,
          gst_rate: line.gst_rate,
          taxable_amount: line.taxable_amount,
          gst_amount: line.gst_amount,
          line_total: line.line_total,
        })),
      },
    },
    include: { items: true },
  });
}
