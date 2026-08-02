export function isStaffRole(role: string): boolean {
  return role !== "display";
}

export function computeDuration(clockIn: Date, clockOut: Date): string {
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
