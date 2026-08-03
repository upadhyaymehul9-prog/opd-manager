-- AlterTable
-- ICD-10 coding of the final diagnosis (NABH IMS.1d). Additive-only:
-- two nullable columns, no data change, safe on a live database.
ALTER TABLE "patient_visits"
ADD COLUMN "icd_code" TEXT,
ADD COLUMN "icd_description" TEXT;
