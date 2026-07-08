export type PatientType = "new" | "old";

export type AnalyticsSummary = {
  periodLabel: string;
  from: string;
  to: string;
  isToday: boolean;
  totalPatients: number;
  newPatients: number;
  oldPatients: number;
  completed: number;
  active: number;
  avgTurnaroundMinutes: number | null;
  medianTurnaroundMinutes: number | null;
  fastestMinutes: number | null;
  slowestMinutes: number | null;
};

export type AnalyticsAgeGroup = {
  label: string;
  count: number;
  percent: number;
};

export type AnalyticsDoctorRow = {
  doctorId: string;
  doctorName: string;
  total: number;
  completed: number;
  active: number;
  newCount: number;
  oldCount: number;
  avgTurnaroundMinutes: number | null;
};

export type AnalyticsDeptReport = {
  tokenNumber: number;
  patientName: string;
  tatMinutes: number;
};

export type AnalyticsDept = {
  totalReferred: number;
  pending: number;
  ready: number;
  completedPath: number;
  avgTatMinutes: number | null;
  medianTatMinutes: number | null;
  fastestTatMinutes: number | null;
  slowestTatMinutes: number | null;
  reportsWithTat: number;
  recentReports: AnalyticsDeptReport[];
};

export type AnalyticsHourly = {
  hour: number;
  label: string;
  count: number;
};

export type AnalyticsPrediction = {
  currentCount: number;
  predictedEndOfDay: number;
  expectedMoreToday: number;
  avgPerHour: number;
  peakHourLabel: string | null;
  busyness: "low" | "moderate" | "high";
  recentWeekdayAvg: number | null;
  message: string;
};

export type AnalyticsPharmacySales = {
  billsCount: number;
  revenue: number;
  gst: number;
  byPayment: { mode: string; count: number; amount: number }[];
};

export type AnalyticsRevenue = {
  total: number;
  reception: number;
  pharmacy: number;
  procedures: number;
};

export type AnalyticsOperations = {
  registration: { total: number; newPatients: number; returning: number };
  opd: {
    waiting: number;
    inConsultation: number;
    completed: number;
    avgWaitMinutes: number | null;
  };
  lab: {
    ordered: number;
    pending: number;
    processing: number;
    ready: number;
    avgTatMinutes: number | null;
  };
  radiology: {
    ordered: number;
    pending: number;
    processing: number;
    ready: number;
    avgTatMinutes: number | null;
  };
  pharmacy: {
    rxQueue: number;
    atPharmacy: number;
    billsToday: number;
    revenue: number;
  };
};

export type AnalyticsPayload = {
  summary: AnalyticsSummary;
  revenue: AnalyticsRevenue;
  operations: AnalyticsOperations;
  ageGroups: AnalyticsAgeGroup[];
  byDoctor: AnalyticsDoctorRow[];
  lab: AnalyticsDept;
  radiology: AnalyticsDept;
  pharmacy: AnalyticsPharmacySales;
  hourlyToday: AnalyticsHourly[];
  prediction: AnalyticsPrediction;
  insights: string[];
};

export type VisitForAnalytics = {
  id: string;
  token_number: number;
  patient_name: string;
  doctor_id: string;
  status: string;
  patient_type: string;
  age: number | null;
  lab_referred: boolean;
  radio_referred: boolean;
  lab_started_at: Date | null;
  lab_ready_at: Date | null;
  radio_started_at: Date | null;
  radio_ready_at: Date | null;
  consultation_fee: number | null;
  consultation_paid_at: Date | null;
  registered_at: Date;
  completed_at: Date | null;
  doctors: { name: string };
};
