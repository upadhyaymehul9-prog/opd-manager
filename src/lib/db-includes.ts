export const doctorSelect = {
  id: true,
  name: true,
  room_number: true,
  specialty: true,
  opd_status: true,
} as const;

export const visitInclude = {
  doctors: {
    select: doctorSelect,
  },
  patient: {
    select: { id: true, patient_number: true },
  },
} as const;
