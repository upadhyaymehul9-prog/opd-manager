"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { ReportsDashboard, type ReportTab } from "@/components/ReportsDashboard";
import { useSession } from "@/hooks/useSession";

export default function ReportsPage() {
  const { session } = useSession();
  const todayOnly =
    session?.role === "pharmacy" || session?.role === "reception";

  const showTabs: ReportTab[] | undefined =
    session?.role === "pharmacy"
      ? ["pharmacy", "medicines"]
      : session?.role === "reception"
        ? ["reception"]
        : undefined;

  const initialTab: ReportTab =
    session?.role === "pharmacy"
      ? "pharmacy"
      : session?.role === "reception"
        ? "reception"
        : "overview";

  const subtitle = todayOnly
    ? "Today's collection and register — date range is fixed to today"
    : "Department-wise registers, revenue, and medicine tracking — pick any date range";

  return (
    <ConsoleShell title="Clinic reports" subtitle={subtitle} current="/reports">
      <ReportsDashboard
        todayOnly={todayOnly}
        initialTab={initialTab}
        showTabs={showTabs}
      />
    </ConsoleShell>
  );
}
