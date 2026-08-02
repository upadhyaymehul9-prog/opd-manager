import { describe, expect, it } from "vitest";
import { buildNabhChecklist, visitEmrCompleteForDischarge, visitHasEmr } from "@/lib/nabh";

const emptyVisit = {
  chief_complaint: null,
  diagnosis: null,
  final_diagnosis: null,
  examination_notes: null,
  advice: null,
  vitals_bp: null,
  vitals_pulse: null,
  vitals_temp: null,
  vitals_weight: null,
  vitals_spo2: null,
};

describe("nabh EMR helpers", () => {
  it("detects when any EMR field is present", () => {
    expect(visitHasEmr(emptyVisit)).toBe(false);
    expect(visitHasEmr({ ...emptyVisit, vitals_pulse: 72 })).toBe(true);
    expect(visitHasEmr({ ...emptyVisit, chief_complaint: "Fever" })).toBe(true);
  });

  it("requires chief complaint and diagnosis for discharge readiness", () => {
    expect(
      visitEmrCompleteForDischarge({
        chief_complaint: "Fever",
        diagnosis: null,
        final_diagnosis: null,
      }),
    ).toBe(false);
    expect(
      visitEmrCompleteForDischarge({
        chief_complaint: "Fever",
        diagnosis: "Viral fever",
        final_diagnosis: null,
      }),
    ).toBe(true);
    expect(
      visitEmrCompleteForDischarge({
        chief_complaint: "Fever",
        diagnosis: null,
        final_diagnosis: "Viral fever",
      }),
    ).toBe(true);
  });
});

describe("buildNabhChecklist HRM.1d", () => {
  const base = {
    todayVisits: 0,
    visitsWithConsent: 0,
    visitsWithEmr: 0,
    visitsWithAbhaToday: 0,
    openIncidents: 0,
    auditLogsToday: 0,
    visitsCompleted: 0,
    visitsWithTwoIdentifiers: 0,
    mlcVisits: 0,
    mlcDocumented: 0,
    feedbackToday: 0,
    visitsSigned: 0,
    attendanceRecordedToday: 0,
  };

  it("HRM.1d is 'met' when at least one attendance record exists today", () => {
    const { items } = buildNabhChecklist({ ...base, attendanceRecordedToday: 3 });
    const item = items.find((i) => i.id === "hrm-attendance")!;
    expect(item).toBeDefined();
    expect(item.standard).toBe("HRM.1d");
    expect(item.status).toBe("met");
  });

  it("HRM.1d is 'partial' when no attendance records exist today", () => {
    const { items } = buildNabhChecklist({ ...base, attendanceRecordedToday: 0 });
    const item = items.find((i) => i.id === "hrm-attendance")!;
    expect(item.status).toBe("partial");
  });

  it("HRM.1d is never 'gap'", () => {
    const { items } = buildNabhChecklist({ ...base, attendanceRecordedToday: 0 });
    const item = items.find((i) => i.id === "hrm-attendance")!;
    expect(item.status).not.toBe("gap");
  });

  it("score is higher with attendance data than without", () => {
    const { score: withData } = buildNabhChecklist({ ...base, attendanceRecordedToday: 1 });
    const { score: withoutData } = buildNabhChecklist({ ...base, attendanceRecordedToday: 0 });
    expect(withData).toBeGreaterThan(withoutData);
  });
});
