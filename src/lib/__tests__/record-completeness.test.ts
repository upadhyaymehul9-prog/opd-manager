import { describe, expect, it } from "vitest";
import { buildRecordCompletenessReport } from "@/lib/record-completeness";

function makeVisit(
  overrides: Partial<{
    id: string;
    status: string;
    chief_complaint: string | null;
    diagnosis: string | null;
    medico_legal: boolean;
    mlc_record: { arrival_at: Date; police_intimated_at: Date | null } | null;
    signed_at: Date | null;
    registered_at: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? "visit-1",
    token_number: 1,
    patient_name: "Test Patient",
    doctor_id: "doc-1",
    status: overrides.status ?? "completed",
    registered_at: overrides.registered_at ?? new Date(),
    completed_at: null,
    chief_complaint: overrides.chief_complaint ?? null,
    diagnosis: overrides.diagnosis ?? null,
    final_diagnosis: null,
    examination_notes: null,
    advice: null,
    vitals_bp: null,
    vitals_pulse: null,
    vitals_temp: null,
    vitals_weight: null,
    vitals_spo2: null,
    signed_at: overrides.signed_at ?? null,
    medico_legal: overrides.medico_legal ?? false,
    doctors: { name: "Dr Test" },
    patient: { patient_number: 101 },
    mlc_record: overrides.mlc_record ?? null,
  };
}

describe("record-completeness", () => {
  it("flags completed visits without complete EMR", () => {
    const report = buildRecordCompletenessReport(
      [makeVisit({ status: "completed" })],
      "2026-07-01",
      "2026-07-06",
    );
    expect(report.delinquent_count).toBe(1);
    expect(report.by_issue.completed_without_emr).toBe(1);
    expect(report.items[0].issues).toContain("completed_without_emr");
  });

  it("flags medico-legal visits without MLC register entry", () => {
    const report = buildRecordCompletenessReport(
      [
        makeVisit({
          status: "in_consultation",
          medico_legal: true,
          chief_complaint: "RTA",
          diagnosis: "Laceration",
        }),
      ],
      "2026-07-01",
      "2026-07-06",
    );
    expect(report.by_issue.mlc_no_record).toBe(1);
  });

  it("counts complete EMR visits", () => {
    const report = buildRecordCompletenessReport(
      [
        makeVisit({
          status: "completed",
          chief_complaint: "Fever",
          diagnosis: "Viral fever",
          signed_at: new Date(),
        }),
      ],
      "2026-07-01",
      "2026-07-06",
    );
    expect(report.emr_complete).toBe(1);
    expect(report.delinquent_count).toBe(0);
  });
});
