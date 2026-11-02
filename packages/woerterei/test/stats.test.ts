import { describe, expect, it } from "vitest";
import { computeStats, createGame, type WoerterState } from "@spielestube/woerterei";

/** Beendete Partie mit festen Endständen und einem Zug je Spieler. */
function finished(scores: Record<string, number>, moves: Record<string, { word: string; score: number }> = {}): WoerterState {
  const ids = Object.keys(scores);
  const s = createGame(ids.map((id) => ({ id, name: id[0]!.toUpperCase() + id.slice(1) })), 1);
  s.status = "beendet";
  for (const p of s.players) p.score = scores[p.id]!;
  for (const [id, m] of Object.entries(moves)) s.history.push({ type: "legen", playerId: id, placements: [], words: [{ word: m.word, score: m.score }], score: m.score });
  return s;
}

describe("Statistik", () => {
  it("zählt Siege, Partien und Durchschnitt und sortiert die Rangliste", () => {
    const { ranking, records } = computeStats([
      finished({ sigrid: 300, tobi: 250 }, { sigrid: { word: "QUARK", score: 64 }, tobi: { word: "HAUS", score: 20 } }),
      finished({ sigrid: 280, tobi: 310 }),
      finished({ sigrid: 320, tobi: 200, oma: 150 }, { oma: { word: "XYLOPHON", score: 90 } }),
      { ...finished({ sigrid: 0, tobi: 999 }), status: "laeuft" }, // läuft noch → zählt nicht
    ]);
    expect(ranking.map((r) => [r.name, r.rank, r.wins, r.games])).toEqual([
      ["Sigrid", 1, 2, 3],
      ["Tobi", 2, 1, 3],
      ["Oma", 3, 0, 1],
    ]);
    expect(ranking[0]!.avgPoints).toBe(300);
    expect(ranking[0]!.bestMove).toEqual({ word: "QUARK", score: 64 });
    expect(records.bestMove).toMatchObject({ name: "Oma", word: "XYLOPHON", score: 90 });
    expect(records.bestGame).toMatchObject({ name: "Sigrid", score: 320 });
    expect(records.finishedGames).toBe(3);
  });

  it("vergibt bei gleicher Leistung den gleichen Platz", () => {
    const { ranking } = computeStats([finished({ anna: 100, ben: 100 })]);
    expect(ranking.map((r) => r.rank)).toEqual([1, 1]);
    expect(ranking.every((r) => r.wins === 1)).toBe(true);
  });

  it("liefert ohne beendete Partien eine leere Rangliste", () => {
    expect(computeStats([]).ranking).toEqual([]);
  });
});
