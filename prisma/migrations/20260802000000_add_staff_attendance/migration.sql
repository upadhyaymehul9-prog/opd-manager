-- CreateTable
CREATE TABLE "staff_attendance" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "display_name" TEXT,
    "clock_in" TIMESTAMPTZ(6) NOT NULL,
    "clock_out" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_attendance_user_id_idx" ON "staff_attendance"("user_id");

-- CreateIndex
CREATE INDEX "staff_attendance_clock_in_idx" ON "staff_attendance"("clock_in" DESC);
