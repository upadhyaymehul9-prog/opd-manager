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
    visitsWithDiagnosis: 0,
    visitsWithIcdCode: 0,
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

describe("buildNabhChecklist IMS.1d (ICD-10 coding)", () => {
  const base = {
    todayVisits: 10,
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
    visitsWithDiagnosis: 0,
    visitsWithIcdCode: 0,
  };

  function icdItem(overrides: Partial<typeof base>) {
    const { items } = buildNabhChecklist({ ...base, ...overrides });
    return items.find((i) => i.id === "ims-icd-coding")!;
  }

  it("is 'partial' when no diagnosed visits exist today", () => {
    const item = icdItem({});
    expect(item).toBeDefined();
    expect(item.standard).toBe("IMS.1d");
    expect(item.status).toBe("partial");
    expect(item.note).toBe("No diagnosed visits today.");
  });

  it("is 'met' when at least 80% of diagnosed visits are coded", () => {
    expect(icdItem({ visitsWithDiagnosis: 10, visitsWithIcdCode: 8 }).status).toBe("met");
    expect(icdItem({ visitsWithDiagnosis: 5, visitsWithIcdCode: 5 }).status).toBe("met");
  });

  it("is 'partial' when coding is below 80%", () => {
    expect(icdItem({ visitsWithDiagnosis: 10, visitsWithIcdCode: 7 }).status).toBe("partial");
    expect(icdItem({ visitsWithDiagnosis: 4, visitsWithIcdCode: 1 }).status).toBe("partial");
  });

  it("is never 'gap', even with zero coded diagnoses", () => {
    expect(icdItem({ visitsWithDiagnosis: 10, visitsWithIcdCode: 0 }).status).toBe("partial");
  });

  it("reports the honest coded/diagnosed count in the note", () => {
    expect(icdItem({ visitsWithDiagnosis: 7, visitsWithIcdCode: 0 }).note).toBe(
      "0/7 diagnosed visits coded with ICD-10 today.",
    );
  });
});
