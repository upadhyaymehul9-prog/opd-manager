"use client";

import { ConsoleShell } from "@/components/ConsoleShell";
import { AppointmentsPanel } from "@/components/AppointmentsPanel";

export default function AppointmentsPage() {
  return (
    <ConsoleShell
      title="Appointments"
      subtitle="Book slots · manage queue · BookMyClinic bookings appear here"
      current="/appointments"
    >
      <AppointmentsPanel />
    </ConsoleShell>
  );
}
