"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { ReportsDashboard } from "@/components/ReportsDashboard";

export default function ReportsPage() {
  return (
    <ConsoleShell
      title="Clinic reports"
      subtitle="Department-wise registers, revenue, and medicine tracking — pick any date range"
      current="/reports"
    >
      <ReportsDashboard />
    </ConsoleShell>
  );
}
