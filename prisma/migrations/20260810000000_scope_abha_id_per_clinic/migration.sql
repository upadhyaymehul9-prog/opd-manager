-- DropIndex
DROP INDEX "patients_abha_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "patients_clinic_id_abha_id_key" ON "patients"("clinic_id", "abha_id");
