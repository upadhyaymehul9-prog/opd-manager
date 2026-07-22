import { istTimeLabel } from "@/lib/date-range";

const CLINIC = "MK Tech Clinic";

// This message reaches the patient's phone directly, so it must show the
// clinic's actual IST wall-clock time regardless of what timezone the
// server process happens to run in — date-fns format() renders in the
// server's local timezone, which would show the wrong time on a UTC host.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatIST(date: Date): { dateStr: string; timeStr: string } {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const day = shifted.getUTCDate();
  const month = MONTHS[shifted.getUTCMonth()];
  const year = shifted.getUTCFullYear();
  return {
    dateStr: `${day} ${month} ${year}`,
    timeStr: istTimeLabel(date),
  };
}

export function appointmentReminderMessage(input: {
  patientName: string;
  doctorName: string;
  scheduledAt: string | Date;
}) {
  const when = new Date(input.scheduledAt);
  const { dateStr, timeStr } = formatIST(when);
  return (
    `Dear ${input.patientName},\n\n` +
    `Your appointment at ${CLINIC} is confirmed.\n` +
    `Doctor: Dr. ${input.doctorName}\n` +
    `Date: ${dateStr}\n` +
    `Time: ${timeStr}\n\n` +
    `Please arrive 10 minutes early. Reply if you need to reschedule.\n\n` +
    `— ${CLINIC}`
  );
}

export function tokenRegisteredMessage(input: {
  patientName: string;
  tokenNumber: number;
  doctorName: string;
  roomNumber: string;
}) {
  return (
    `Dear ${input.patientName},\n\n` +
    `You are registered at ${CLINIC}.\n` +
    `Token: #${input.tokenNumber}\n` +
    `Doctor: Dr. ${input.doctorName}\n` +
    `Room: ${input.roomNumber}\n\n` +
    `Please wait in the reception area. We will call your token shortly.\n\n` +
    `— ${CLINIC}`
  );
}

export function callingPatientMessage(input: {
  patientName: string;
  tokenNumber: number;
  roomNumber: string;
}) {
  return (
    `Dear ${input.patientName},\n\n` +
    `Token #${input.tokenNumber} — please proceed to Room ${input.roomNumber} now.\n\n` +
    `— ${CLINIC}`
  );
}

export function labReadyMessage(input: {
  patientName: string;
  tokenNumber: number;
}) {
  return (
    `Dear ${input.patientName},\n\n` +
    `Your lab report is ready at ${CLINIC} (Token #${input.tokenNumber}). ` +
    `Please visit the reception or your doctor as advised.\n\n` +
    `— ${CLINIC}`
  );
}

export function prescriptionReadyMessage(input: {
  patientName: string;
  tokenNumber: number;
}) {
  return (
    `Dear ${input.patientName},\n\n` +
    `Your prescription is ready at ${CLINIC} pharmacy (Token #${input.tokenNumber}). ` +
    `Please collect your medicines from the pharmacy counter.\n\n` +
    `— ${CLINIC}`
  );
}

export function visitMessageForStatus(
  visit: {
    patient_name: string;
    token_number: number;
    room_number: string;
    status: string;
    doctors?: { name: string } | null;
  },
): string {
  const doctorName = visit.doctors?.name ?? "Doctor";

  switch (visit.status) {
    case "registered":
    case "calling":
      return tokenRegisteredMessage({
        patientName: visit.patient_name,
        tokenNumber: visit.token_number,
        doctorName,
        roomNumber: visit.room_number,
      });
    case "in_consultation":
    case "in_followup":
      return callingPatientMessage({
        patientName: visit.patient_name,
        tokenNumber: visit.token_number,
        roomNumber: visit.room_number,
      });
    case "lab_calling":
      return (
        `Dear ${visit.patient_name},\n\n` +
        `Token #${visit.token_number} — please proceed to the laboratory for your tests.\n\n` +
        `— ${CLINIC}`
      );
    case "radio_calling":
      return (
        `Dear ${visit.patient_name},\n\n` +
        `Token #${visit.token_number} — please proceed to radiology for your scan.\n\n` +
        `— ${CLINIC}`
      );
    case "lab_ready":
      return labReadyMessage({
        patientName: visit.patient_name,
        tokenNumber: visit.token_number,
      });
    case "to_pharmacy":
    case "at_pharmacy":
      return prescriptionReadyMessage({
        patientName: visit.patient_name,
        tokenNumber: visit.token_number,
      });
    default:
      return tokenRegisteredMessage({
        patientName: visit.patient_name,
        tokenNumber: visit.token_number,
        doctorName,
        roomNumber: visit.room_number,
      });
  }
}
