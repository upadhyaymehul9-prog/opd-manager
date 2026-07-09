export const USER_ROLES = [
  "admin",
  "manager",
  "reception",
  "doctor",
  "lab",
  "radiology",
  "pharmacy",
  "display",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type SessionPayload = {
  userId: string;
  username: string;
  role: UserRole;
  displayName: string | null;
  doctorId: string | null;
  mustChangePassword: boolean;
};
