-- AlterTable
-- Random Blood Sugar (mg/dL), captured as a vital at consultation (glucometer
-- check), not a lab-sent test. Additive-only: one nullable column, no data
-- change, safe on a live database.
ALTER TABLE "patient_visits"
ADD COLUMN "vitals_rbs" DOUBLE PRECISION;
