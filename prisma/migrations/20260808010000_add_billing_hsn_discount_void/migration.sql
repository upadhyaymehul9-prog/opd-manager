-- AlterTable
-- HSN code snapshot per bill line (GST invoice compliance), a flat
-- bill-level discount, and void fields so a wrong/disputed bill can be
-- excluded from revenue without ever hard-deleting the record.
-- Additive-only: all nullable or defaulted, no data change.
ALTER TABLE "pharmacy_bill_items"
ADD COLUMN "hsn_code" TEXT;

ALTER TABLE "pharmacy_bills"
ADD COLUMN "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discount_reason" TEXT,
ADD COLUMN "voided_at" TIMESTAMPTZ(6),
ADD COLUMN "voided_by" TEXT,
ADD COLUMN "voided_by_role" TEXT,
ADD COLUMN "void_reason" TEXT;
