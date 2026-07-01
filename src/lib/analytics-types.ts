export type PatientType = "new" | "old";

export type AnalyticsSummary = {
  period: "today";
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

export type AnalyticsDept = {
  totalReferred: number;
  pending: number;
  ready: number;
  completedPath: number;
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

export type AnalyticsPayload = {
  summary: AnalyticsSummary;
  ageGroups: AnalyticsAgeGroup[];
  byDoctor: AnalyticsDoctorRow[];
  lab: AnalyticsDept;
  radiology: AnalyticsDept;
  hourlyToday: AnalyticsHourly[];
  prediction: AnalyticsPrediction;
  insights: string[];
};

export type VisitForAnalytics = {
  id: string;
  patient_name: string;
  doctor_id: string;
  status: string;
  patient_type: string;
  age: number | null;
  lab_referred: boolean;
  radio_referred: boolean;
  registered_at: Date;
  completed_at: Date | null;
  doctors: { name: string };
};
