import { describe, expect, it } from "vitest";
import { ICD10_CODES, findIcd10ByCode, searchIcd10 } from "@/lib/icd10";

describe("ICD10_CODES dataset", () => {
  it("has a curated OPD-scale size (200-300 codes)", () => {
    expect(ICD10_CODES.length).toBeGreaterThanOrEqual(200);
    expect(ICD10_CODES.length).toBeLessThanOrEqual(300);
  });

  it("has no duplicate codes", () => {
    const codes = ICD10_CODES.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every code matches the ICD-10 format", () => {
    for (const entry of ICD10_CODES) {
      expect(entry.code).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
    }
  });

  it("every entry has a description and category", () => {
    for (const entry of ICD10_CODES) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
      expect(entry.category.trim().length).toBeGreaterThan(0);
    }
  });

  it("aliases are lowercase so case-insensitive search works", () => {
    for (const entry of ICD10_CODES) {
      for (const alias of entry.aliases) {
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });
});

describe("searchIcd10", () => {
  it("matches by code prefix, case-insensitive", () => {
    const results = searchIcd10("j02");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe("J02.9");
  });

  it("matches by description substring", () => {
    const results = searchIcd10("pharyngitis");
    expect(results.some((r) => r.code === "J02.9")).toBe(true);
  });

  it("matches by alias (Indian OPD shorthand)", () => {
    expect(searchIcd10("sugar").some((r) => r.code === "E11.9")).toBe(true);
    expect(searchIcd10("bukhar").some((r) => r.code === "R50.9")).toBe(true);
    expect(searchIcd10("piles").some((r) => r.code === "K64.9")).toBe(true);
  });

  it("ranks code-prefix matches before text matches", () => {
    // "I10" is both a code and appears nowhere as text; hypertension search
    const results = searchIcd10("i10");
    expect(results[0].code).toBe("I10");
  });

  it("respects the limit", () => {
    expect(searchIcd10("a", 5).length).toBeLessThanOrEqual(5);
  });

  it("returns nothing for blank queries", () => {
    expect(searchIcd10("")).toEqual([]);
    expect(searchIcd10("   ")).toEqual([]);
  });

  it("returns nothing for gibberish", () => {
    expect(searchIcd10("zzzzqqq")).toEqual([]);
  });
});

describe("findIcd10ByCode", () => {
  it("finds a code exactly, ignoring case and whitespace", () => {
    expect(findIcd10ByCode("j02.9")?.description).toMatch(/pharyngitis/i);
    expect(findIcd10ByCode(" I10 ")?.description).toMatch(/hypertension/i);
  });

  it("returns undefined for unknown codes", () => {
    expect(findIcd10ByCode("X99.9")).toBeUndefined();
  });
});
