import { describe, expect, it } from "vitest";
import { LAB_PANELS, getLabPanel, matchLabPanelByName } from "@/lib/lab-panels";

describe("lab panels", () => {
  it("exposes a CBC panel with the full haemogram components", () => {
    const cbc = getLabPanel("cbc");
    expect(cbc).toBeDefined();
    const names = cbc!.components.map((c) => c.name.toLowerCase());
    for (const expected of [
      "hemoglobin",
      "platelet count",
      "mcv",
      "mch",
      "mchc",
    ]) {
      expect(names.some((n) => n.includes(expected))).toBe(true);
    }
    expect(cbc!.components.length).toBeGreaterThanOrEqual(15);
  });

  it("gives every panel a unique code and at least one component", () => {
    const codes = new Set<string>();
    for (const panel of LAB_PANELS) {
      expect(panel.code).toBeTruthy();
      expect(codes.has(panel.code)).toBe(false);
      codes.add(panel.code);
      expect(panel.components.length).toBeGreaterThan(0);
      for (const c of panel.components) {
        expect(c.name.trim()).toBeTruthy();
        expect(["numeric", "text", "both"]).toContain(c.value_type);
      }
    }
  });

  it("returns undefined for an unknown panel code", () => {
    expect(getLabPanel("does-not-exist")).toBeUndefined();
  });
});

describe("matchLabPanelByName", () => {
  it("matches catalog panel names like CBC and LFT to their templates", () => {
    expect(matchLabPanelByName("CBC (Complete Blood Count)")?.code).toBe("cbc");
    expect(matchLabPanelByName("cbc")?.code).toBe("cbc");
    expect(matchLabPanelByName("Complete Blood Count")?.code).toBe("cbc");
    expect(matchLabPanelByName("LFT (Liver Function Test)")?.code).toBe("lft");
    expect(matchLabPanelByName("Lipid Profile")?.code).toBe("lipid");
    expect(matchLabPanelByName("TFT (Thyroid Function Test)")?.code).toBe("tft");
    expect(matchLabPanelByName("Urine Routine & Microscopy")?.code).toBe(
      "urine_routine",
    );
  });

  it("does not match single-analyte tests", () => {
    expect(matchLabPanelByName("Hemoglobin (Hb)")).toBeUndefined();
    expect(matchLabPanelByName("Serum Creatinine")).toBeUndefined();
    expect(matchLabPanelByName("")).toBeUndefined();
  });
});
