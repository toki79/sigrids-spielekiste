import { describe, expect, it } from "vitest";
import { createRandom, formatFamilyCode, generateFamilyCode, isPlausibleFamilyCode, normalizeFamilyCode, rankStandings } from "@spielestube/core";

describe("Familiencodes", () => {
  it("erzeugt gut lesbare Codes", () => {
    const r = createRandom(1);
    for (let i = 0; i < 50; i++) {
      const code = generateFamilyCode(r);
      expect(code).toMatch(/^[A-Z]+\d{2}$/);
      expect(isPlausibleFamilyCode(code)).toBe(true);
    }
  });

  it("verzeiht Eingabevarianten", () => {
    for (const input of ["blume-27", " Blume 27 ", "BLUME27", "blume–27"]) {
      expect(normalizeFamilyCode(input)).toBe("BLUME27");
    }
    expect(formatFamilyCode("blume27")).toBe("BLUME-27");
    expect(isPlausibleFamilyCode("hallo")).toBe(false);
  });
});

describe("Platzierungen", () => {
  it("vergibt bei Gleichstand den gleichen Platz", () => {
    const r = rankStandings([
      { playerId: "a", score: 10 },
      { playerId: "b", score: 30 },
      { playerId: "c", score: 30 },
    ]);
    expect(r.winners).toEqual(["b", "c"]);
    expect(r.standings.map((s) => s.rank)).toEqual([1, 1, 3]);
  });
});
