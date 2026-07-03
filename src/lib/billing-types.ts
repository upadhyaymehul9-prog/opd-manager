export const DEFAULT_GST_RATE = 12;

export const PAYMENT_MODES = ["cash", "upi", "card"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export type PharmacyBillItemView = {
  id: string;
  prescription_item_id: string | null;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  taxable_amount: number;
  gst_amount: number;
  line_total: number;
};

export type PharmacyBillView = {
  id: string;
  bill_no: string;
  patient_visit_id: string;
  prescription_id: string;
  payment_mode: PaymentMode;
  subtotal: number;
  gst_total: number;
  grand_total: number;
  created_at: string;
  items: PharmacyBillItemView[];
};

export type BillPreviewLine = {
  prescription_item_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  taxable_amount: number;
  gst_amount: number;
  line_total: number;
};

export type BillPreview = {
  prescription_id: string;
  subtotal: number;
  gst_total: number;
  grand_total: number;
  lines: BillPreviewLine[];
};

export type CompleteWithBillInput = {
  payment_mode: PaymentMode;
  lines?: { prescription_item_id: string; unit_price: number }[];
};
