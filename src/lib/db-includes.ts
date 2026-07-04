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
    select: { id: true, patient_number: true, allergies: true, blood_group: true, abha_id: true },
  },
} as const;
