import { describe, expect, it } from "vitest";
import {
  JOKER_IDS,
  allTileIds,
  analyzeSet,
  computeRommeStats,
  createZahlenromme,
  rackPenalty,
  tile,
  type RommeState,
  type TileId,
} from "@spielestube/zahlenromme";

/** Stein-Nummer aus Farbe (0 Rot, 1 Blau, 2 Schwarz, 3 Orange), Zahl und Satz (0/1). */
const t = (color: number, n: number, copy = 0): TileId => copy * 52 + color * 13 + (n - 1);
const [J1, J2] = JOKER_IDS as [TileId, TileId];
const R = 0, B = 1, S = 2, O = 3;

const spiel = createZahlenromme();
const players = [
  { id: "sigrid", name: "Sigrid" },
  { id: "tobi", name: "Tobi" },
];

/** Partie mit festgelegten Bänken; übrige Steine bilden den Vorrat. */
function prepared(racks: [TileId[], TileId[]], table: TileId[][] = [], melded = [false, false]): RommeState {
  const s = spiel.createGame(players, 7);
  s.turn = 0;
  s.table = table;
  s.players[0]!.rack = racks[0];
  s.players[1]!.rack = racks[1];
  s.players[0]!.melded = melded[0]!;
  s.players[1]!.melded = melded[1]!;
  const used = new Set([...racks.flat(), ...table.flat()]);
  s.pool = allTileIds().filter((id) => !used.has(id));
  return s;
}

describe("Steine", () => {
  it("gibt es 106 Stück mit 2 Jokern", () => {
    const tiles = allTileIds().map(tile);
    expect(tiles).toHaveLength(106);
    expect(tiles.filter((x) => x.joker)).toHaveLength(2);
    expect(tile(t(O, 13, 1))).toMatchObject({ color: O, n: 13 });
    expect(rackPenalty([t(R, 5), J1])).toBe(35);
  });
});

describe("Reihen prüfen", () => {
  it("erkennt Gruppen", () => {
    expect(analyzeSet([t(R, 7), t(B, 7), t(S, 7)])).toMatchObject({ valid: true, kind: "gruppe", value: 21 });
    expect(analyzeSet([t(R, 7), t(B, 7), t(S, 7), t(O, 7)]).valid).toBe(true);
    expect(analyzeSet([t(R, 7), t(R, 7, 1), t(S, 7)]).valid).toBe(false); // Farbe doppelt
    expect(analyzeSet([t(R, 7), t(B, 7), J1]).valid).toBe(true);
  });

  it("erkennt Folgen, auch mit Jokern in Lücken und am Rand", () => {
    expect(analyzeSet([t(B, 5), t(B, 3), t(B, 4)])).toMatchObject({ valid: true, kind: "folge", value: 12 });
    const withGap = analyzeSet([t(B, 3), J1, t(B, 5)]);
    expect(withGap).toMatchObject({ valid: true, kind: "folge", values: [3, 4, 5] });
    expect(withGap.ordered).toEqual([t(B, 3), J1, t(B, 5)]);
    // Joker am Ende: möglichst hoch zählen
    expect(analyzeSet([t(S, 11), t(S, 12), J1])).toMatchObject({ valid: true, values: [11, 12, 13] });
    expect(analyzeSet([t(S, 12), t(S, 13), J1])).toMatchObject({ valid: true, values: [11, 12, 13] });
    expect(analyzeSet([t(S, 13), t(S, 1), t(S, 2)]).valid).toBe(false); // nicht rundherum
    expect(analyzeSet([t(S, 3), t(B, 4), t(S, 5)]).valid).toBe(false); // Farben gemischt
    expect(analyzeSet([t(S, 3), t(S, 4)]).valid).toBe(false); // zu kurz
    expect(analyzeSet([t(R, 1), J1, J2, t(R, 6)]).valid).toBe(false); // Lücke zu groß
  });
});

describe("Erstes Auslegen", () => {
  it("braucht mindestens 30 Punkte", () => {
    const s = prepared([[t(R, 1), t(R, 2), t(R, 3), t(B, 10), t(R, 10), t(S, 10)], [t(O, 1)]]);
    expect(spiel.checkMove(s, "sigrid", { type: "legen", table: [[t(R, 1), t(R, 2), t(R, 3)]] })).toMatchObject({ ok: false, code: "ZU_WENIG" });
    const ok = spiel.applyMove(s, "sigrid", { type: "legen", table: [[t(B, 10), t(R, 10), t(S, 10)]] });
    expect(ok.players[0]!.melded).toBe(true);
    expect(ok.players[0]!.rack).toHaveLength(3);
    expect(spiel.currentPlayer(ok)).toBe("tobi");
  });

  it("darf vorhandene Reihen noch nicht verändern", () => {
    const table = [[t(O, 4), t(O, 5), t(O, 6)]];
    const s = prepared([[t(O, 7), t(B, 10), t(R, 10), t(S, 10)], []], table);
    const r = spiel.checkMove(s, "sigrid", { type: "legen", table: [[t(O, 4), t(O, 5), t(O, 6), t(O, 7)], [t(B, 10), t(R, 10), t(S, 10)]] });
    expect(r).toMatchObject({ ok: false, code: "ERSTES_AUSLEGEN_UMLEGEN" });
  });
});

describe("Umlegen nach dem ersten Auslegen", () => {
  it("erlaubt freies Umlegen, solange alle Reihen gültig sind", () => {
    const table = [[t(R, 5), t(B, 5), t(S, 5), t(O, 5)]];
    const s = prepared([[t(R, 6), t(R, 7), t(O, 1)], [t(B, 1)]], table, [true, true]);
    // Rote 5 aus der Gruppe nehmen und mit 6, 7 eine Folge bilden
    const next = spiel.applyMove(s, "sigrid", { type: "legen", table: [[t(B, 5), t(S, 5), t(O, 5)], [t(R, 5), t(R, 6), t(R, 7)]] });
    expect(next.table).toHaveLength(2);
    expect(next.players[0]!.rack).toEqual([t(O, 1)]);
  });

  it("verbietet, Tischsteine auf die Bank zu nehmen und ungültige Reihen", () => {
    const table = [[t(R, 5), t(B, 5), t(S, 5), t(O, 5)]];
    const s = prepared([[t(R, 6), t(R, 7)], [t(B, 1)]], table, [true, true]);
    expect(spiel.checkMove(s, "sigrid", { type: "legen", table: [[t(B, 5), t(S, 5), t(O, 5)], [t(R, 6), t(R, 7)]] })).toMatchObject({
      ok: false,
      code: "TISCHSTEIN_GENOMMEN",
    });
    expect(spiel.checkMove(s, "sigrid", { type: "legen", table: [[t(R, 5), t(B, 5), t(S, 5), t(O, 5), t(R, 6)]] })).toMatchObject({
      ok: false,
      code: "UNGUELTIGE_REIHE",
    });
    expect(spiel.checkMove(s, "sigrid", { type: "legen", table })).toMatchObject({ ok: false, code: "NICHTS_GELEGT" });
  });
});

describe("Ziehen und Spielende", () => {
  it("zieht einen Stein und gibt weiter", () => {
    const s = prepared([[t(R, 1)], [t(B, 1)]]);
    const next = spiel.applyMove(s, "sigrid", { type: "ziehen" });
    expect(next.players[0]!.rack).toHaveLength(2);
    expect(next.pool).toHaveLength(s.pool.length - 1);
    expect(spiel.currentPlayer(next)).toBe("tobi");
  });

  it("wer die letzten Steine ablegt, gewinnt und bekommt die Reststeine der anderen", () => {
    const s = prepared([[t(R, 11), t(R, 12), t(R, 13)], [t(B, 3), J1]], [], [true, false]);
    const next = spiel.applyMove(s, "sigrid", { type: "legen", table: [[t(R, 11), t(R, 12), t(R, 13)]] });
    expect(next.status).toBe("beendet");
    expect(next.endReason).toBe("ausgespielt");
    expect(next.players[0]!.score).toBe(33);
    expect(next.players[1]!.score).toBe(-33);
    expect(spiel.result(next).winners).toEqual(["sigrid"]);
  });

  it("ist der Vorrat leer und setzen alle aus, gewinnt die kleinste Bank", () => {
    let s = prepared([[t(R, 1), t(R, 2)], [t(B, 9), t(B, 13)]]);
    s.pool = [];
    s = spiel.applyMove(s, "sigrid", { type: "ziehen" });
    s = spiel.applyMove(s, "tobi", { type: "ziehen" });
    expect(s.status).toBe("beendet");
    expect(s.endReason).toBe("keine_zuege");
    expect(spiel.result(s).winners).toEqual(["sigrid"]);
    expect(s.players[0]!.score).toBe(22 - 3);
    expect(s.players[1]!.score).toBe(-22);
  });

  it("verliert nie einen Stein (zufällige Partie mit Ziehen)", () => {
    let s = spiel.createGame(players, 11);
    for (let i = 0; i < 40 && s.status === "laeuft"; i++) s = spiel.applyMove(s, spiel.currentPlayer(s)!, { type: "ziehen" });
    const all = [...s.pool, ...s.table.flat(), ...s.players.flatMap((p) => p.rack)].sort((a, b) => a - b);
    expect(all).toEqual(allTileIds());
  });
});

describe("Rangliste", () => {
  it("zählt Siege und Rekorde", () => {
    const s = prepared([[t(R, 11), t(R, 12), t(R, 13)], [t(B, 3)]], [], [true, false]);
    const won = spiel.applyMove(s, "sigrid", { type: "legen", table: [[t(R, 11), t(R, 12), t(R, 13)]] });
    const { ranking, records, finishedGames } = computeRommeStats([won, s]);
    expect(finishedGames).toBe(1);
    expect(ranking.map((r) => [r.name, r.rank, r.wins])).toEqual([
      ["Sigrid", 1, 1],
      ["Tobi", 2, 0],
    ]);
    expect(records.find((r) => r.label.startsWith("Meiste"))).toMatchObject({ name: "Sigrid", text: "mit 3 Steinen" });
  });
});
