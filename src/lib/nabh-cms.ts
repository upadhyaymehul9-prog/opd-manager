export const POINT_OF_ORIGIN_OPTIONS = [
  { id: "walk_in", label: "Walk-in" },
  { id: "referral", label: "Referral" },
  { id: "website", label: "Website / online portal" },
  { id: "phone", label: "Call centre / phone" },
  { id: "health_camp", label: "Health camp" },
  { id: "bookmyclinic", label: "Mobile app (BookMyClinic)" },
] as const;

export type PointOfOrigin = (typeof POINT_OF_ORIGIN_OPTIONS)[number]["id"];

export const NATIONAL_ID_TYPES = [
  { id: "abha", label: "ABHA" },
  { id: "aadhaar", label: "Aadhaar" },
  { id: "driving_license", label: "Driving license" },
  { id: "other", label: "Other national ID" },
] as const;

export type MlcDetails = {
  brought_by_name?: string;
  brought_by_relation?: string;
  police_officer_name?: string;
  fir_ddr_number?: string;
  incident_history?: string;
  patient_status?: "alive" | "dead";
  identification_mark_1?: string;
  identification_mark_2?: string;
  injury_description?: string;
  evidence_collected?: string;
};

export function parseMlcDetails(raw: string | null | undefined): MlcDetails | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as MlcDetails;
  } catch {
    return null;
  }
}

export function generateMobileVerifyCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const FEEDBACK_QUESTIONS = [
  { id: "q1_overall", label: "Overall experience at the clinic" },
  { id: "q2_care_quality", label: "Quality of care (consultation, nursing, etc.)" },
  { id: "q3_communication", label: "Clarity of communication and treatment explanation" },
  { id: "q4_environment", label: "Clinic environment (cleanliness, amenities)" },
  { id: "q5_registration", label: "Ease of registration / discharge process" },
] as const;

/** Hindi labels for COP.1k multilingual OPD summary */
export const OPD_SUMMARY_HINDI = {
  title: "ओपीडी परामर्श सारांश",
  patient: "रोगी",
  token: "टोकन",
  doctor: "चिकित्सक",
  visitDate: "दौरे की तिथि",
  complaint: "मुख्य शिकायत",
  findings: "नैदानिक निष्कर्ष",
  allergy: "एलर्जी",
  provisionalDx: "अनंतिम निदान",
  finalDx: "अंतिम निदान",
  treatment: "उपचार / दवाएं",
  investigations: "जांच / परीक्षण",
  followUp: "फॉलो-अप निर्देश",
  referral: "रेफरल",
  lifestyle: "जीवनशैली सलाह",
  signature: "चिकित्सक प्रमाणीकरण",
} as const;
