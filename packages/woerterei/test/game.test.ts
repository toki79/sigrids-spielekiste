import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { InvalidMoveError } from "@spielestube/core";
import {
  BOARD_SIZE,
  CENTER,
  CompactDictionary,
  LETTER_COUNTS,
  RACK_SIZE,
  allowWord,
  boardToRows,
  cellAt,
  checkPlay,
  createWoerterei,
  fullBag,
  playersToAct,
  removeFromRack,
  type Placement,
  type WoerterMove,
  type WoerterState,
} from "@spielestube/woerterei";

const text = readFileSync(fileURLToPath(new URL("../data/woerter.txt", import.meta.url)), "utf-8");
const dictionary = CompactDictionary.fromText(text);
const spiel = createWoerterei(dictionary);
const players = [
  { id: "sigrid", name: "Sigrid" },
  { id: "tobi", name: "Tobi" },
];

function allTiles(state: WoerterState): string[] {
  return [...state.bag, ...state.players.flatMap((p) => p.rack), ...[...state.board].filter((c) => c !== ".").map((c) => (c === c.toUpperCase() ? c : "?"))];
}

describe("Wörterbuch", () => {
  it("kennt gebeugte Formen, Umlaute und ß als SS", () => {
    for (const w of ["HAUS", "HÄUSER", "GING", "GEGANGEN", "SCHÖNSTEN", "STRASSE", "FÜSSE", "BAUHOLZ", "OMA", "ENKEL"]) {
      expect(dictionary.has(w), w).toBe(true);
    }
    expect(dictionary.has("haus")).toBe(true);
  });

  it("lehnt Unsinn und Abkürzungen ab", () => {
    for (const w of ["XQZ", "HAUSS", "USA", "KM", "NR", "BZW"]) expect(dictionary.has(w), w).toBe(false);
  });

  it("enthält rund 300.000 Wörter", () => {
    expect(dictionary.size).toBeGreaterThan(250_000);
  });
});

describe("Neue Partie", () => {
  it("verteilt 102 Steine korrekt", () => {
    expect(fullBag()).toHaveLength(102);
    const s = spiel.createGame(players, 42);
    expect(s.players.every((p) => p.rack.length === RACK_SIZE)).toBe(true);
    expect(s.bag).toHaveLength(102 - 2 * RACK_SIZE);
  });

  it("ist mit gleichem Startwert auf jedem Gerät gleich", () => {
    expect(spiel.createGame(players, 7)).toEqual(spiel.createGame(players, 7));
    expect(spiel.createGame(players, 7).bag).not.toEqual(spiel.createGame(players, 8).bag);
  });

  it("verlangt 2 bis 4 Spieler", () => {
    expect(() => spiel.createGame([players[0]!], 1)).toThrow();
  });

  it("ist reines JSON", () => {
    const s = spiel.createGame(players, 1);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe("Spielzüge", () => {
  /** Partie mit festgelegten Bänken, damit der Test unabhängig vom Zufall ist. */
  function prepared(): WoerterState {
    const s = spiel.createGame(players, 99);
    s.turn = 0;
    s.players[0]!.rack = ["H", "A", "U", "S", "E", "N", "?"];
    s.players[1]!.rack = ["M", "A", "U", "S", "R", "E", "T"];
    return s;
  }

  it("lässt nur den Spieler ziehen, der dran ist", () => {
    const s = prepared();
    expect(spiel.checkMove(s, "tobi", { type: "aussetzen" })).toMatchObject({ ok: false, code: "NICHT_DRAN" });
    expect(() => spiel.applyMove(s, "tobi", { type: "aussetzen" })).toThrow(InvalidMoveError);
  });

  it("legt ein Wort, zählt Punkte, füllt die Bank auf und gibt weiter", () => {
    const s = prepared();
    const move: WoerterMove = { type: "legen", placements: [..."HAUS"].map((letter, i) => ({ row: CENTER, col: 5 + i, letter })) };
    const next = spiel.applyMove(s, "sigrid", move);
    expect(next.players[0]!.score).toBe(10);
    expect(next.players[0]!.rack).toHaveLength(RACK_SIZE);
    expect(spiel.currentPlayer(next)).toBe("tobi");
    expect(cellAt(next.board, CENTER, 5)).toBe("H");
    expect(s.board).not.toBe(next.board); // Ausgangszustand unverändert
    expect(allTiles(next).sort()).toEqual(allTiles(s).sort());
  });

  it("tauscht Steine, ohne dass Steine verloren gehen", () => {
    const s = prepared();
    const next = spiel.applyMove(s, "sigrid", { type: "tauschen", tiles: ["H", "?"] });
    expect(next.players[0]!.rack).toHaveLength(RACK_SIZE);
    expect(removeFromRack(next.players[0]!.rack, ["A", "U", "S", "E", "N"])).not.toBeNull();
    expect(allTiles(next).sort()).toEqual(allTiles(s).sort());
    expect(next.history.at(-1)).toEqual({ type: "tauschen", playerId: "sigrid", count: 2 });
  });

  it("verbietet Tauschen, wenn der Beutel fast leer ist", () => {
    const s = prepared();
    s.bag = s.bag.slice(0, 3);
    expect(spiel.checkMove(s, "sigrid", { type: "tauschen", tiles: ["H"] })).toMatchObject({ ok: false, code: "BEUTEL_LEER" });
  });

  it("beendet die Partie, wenn alle zweimal hintereinander aussetzen", () => {
    let s = prepared();
    for (let i = 0; i < 4; i++) s = spiel.applyMove(s, spiel.currentPlayer(s)!, { type: "aussetzen" });
    expect(spiel.isOver(s)).toBe(true);
    expect(s.endReason).toBe("keine_zuege");
    // Reststeine werden abgezogen
    expect(s.players[0]!.score).toBeLessThan(0);
    expect(spiel.currentPlayer(s)).toBeNull();
  });

  it("erlaubt ein zusätzliches Wort nach Zustimmung", () => {
    let s = prepared();
    const placements: Placement[] = [..."HAUSN"].map((letter, i) => ({ row: CENTER, col: 5 + i, letter }));
    expect(spiel.checkMove(s, "sigrid", { type: "legen", placements })).toMatchObject({ ok: false, code: "UNBEKANNTE_WOERTER" });
    s = allowWord(s, "hausn");
    expect(spiel.checkMove(s, "sigrid", { type: "legen", placements }).ok).toBe(true);
  });

  it("schreibt dem Spieler, der ausspielt, die Reststeine der anderen gut", () => {
    const s = prepared();
    s.bag = [];
    s.players[0]!.rack = ["S", "O"];
    s.players[1]!.rack = ["Q", "X"]; // 10 + 8 = 18
    const next = spiel.applyMove(s, "sigrid", { type: "legen", placements: [{ row: CENTER, col: 7, letter: "S" }, { row: CENTER, col: 8, letter: "O" }] });
    expect(next.status).toBe("beendet");
    expect(next.endReason).toBe("ausgespielt");
    // SO auf Startfeld: (1+2)×2 = 6, plus 18 von Tobi
    expect(next.players[0]!.score).toBe(6 + 18);
    expect(next.players[1]!.score).toBe(-18);
    expect(spiel.result(next).winners).toEqual(["sigrid"]);
  });
});

describe("Komplette Partie", () => {
  /** Ein einfacher Spieler, der einfach das beste Wort aus wenigen Ansätzen sucht – nur zum Testen. */
  function findMove(state: WoerterState): WoerterMove {
    const player = state.players[state.turn]!;
    const rack = player.rack.filter((t) => t !== "?");
    const anchors: { row: number; col: number }[] = [];
    if (/^\.+$/.test(state.board)) anchors.push({ row: CENTER, col: CENTER });
    else {
      for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) if (cellAt(state.board, r, c) !== ".") anchors.push({ row: r, col: c });
    }
    let best: { move: WoerterMove; score: number } | null = null;
    const perms = new Set<string>();
    const build = (prefix: string, rest: string[]) => {
      if (prefix.length >= 1) perms.add(prefix);
      if (prefix.length >= 3) return;
      rest.forEach((t, i) => build(prefix + t, rest.filter((_, j) => j !== i)));
    };
    build("", rack);
    for (const word of perms) {
      for (const a of anchors.slice(-20)) {
        for (const down of [false, true]) {
          for (let offset = -word.length; offset <= 1; offset++) {
            const placements: Placement[] = [];
            let r = a.row + (down ? offset : 0);
            let c = a.col + (down ? 0 : offset);
            for (const letter of word) {
              while (cellAt(state.board, r, c) !== "." && r < BOARD_SIZE && c < BOARD_SIZE) down ? r++ : c++;
              placements.push({ row: r, col: c, letter });
              down ? r++ : c++;
            }
            const check = checkPlay(state.board, placements, { dictionary, rack: player.rack, extraWords: state.extraWords });
            if (check.ok && (!best || check.evaluation.score > best.score)) {
              best = { move: { type: "legen", placements }, score: check.evaluation.score };
            }
          }
        }
      }
    }
    if (best) return best.move;
    if (state.bag.length >= RACK_SIZE) return { type: "tauschen", tiles: player.rack.slice(0, 3) };
    return { type: "aussetzen" };
  }

  it("läuft bis zum Ende, ohne dass Steine verschwinden", () => {
    let s = spiel.createGame(players, 2026);
    let moves = 0;
    while (!spiel.isOver(s) && moves < 200) {
      const id = spiel.currentPlayer(s)!;
      const move = findMove(s);
      s = spiel.applyMove(s, id, move);
      expect(allTiles(s).sort()).toEqual(fullBag().sort());
      moves++;
    }
    expect(spiel.isOver(s)).toBe(true);
    if (process.env.DEBUG_BOARD) {
      console.log(boardToRows(s.board).join("\n"));
      console.log(s.players.map((p) => `${p.name}: ${p.score}`).join(", "), s.endReason, moves);
    }
    const placed = s.history.filter((h) => h.type === "legen").length;
    expect(placed).toBeGreaterThan(10);
    expect(Object.values(LETTER_COUNTS).reduce((a, b) => a + b, 0)).toBe(102);
  }, 120_000);
});

describe("Wörterbuch-Modul für die App", () => {
  it("liefert dieselben Ergebnisse wie die Textliste", async () => {
    const blocks = (await import("../generated/woerter-bloecke.js")).default as Record<string, string>;
    const fromBlocks = CompactDictionary.fromBlocks(blocks);
    expect(fromBlocks.size).toBe(dictionary.size);
    for (const w of ["HAUS", "HÄUSER", "STRASSE", "AB", "ERHOLUNGSURLAUB", "XQZ", "USA"]) {
      expect(fromBlocks.has(w), w).toBe(dictionary.has(w));
    }
  });
});

describe("Wort-Abstimmung", () => {
  function prepared(n = 2): WoerterState {
    const ps = [
      { id: "sigrid", name: "Sigrid" },
      { id: "tobi", name: "Tobi" },
      { id: "oma", name: "Oma" },
    ].slice(0, n);
    const s = spiel.createGame(ps, 99);
    s.turn = 0;
    s.players[0]!.rack = ["H", "A", "U", "S", "E", "N", "?"];
    return s;
  }
  const hausn: Placement[] = [..."HAUSN"].map((letter, i) => ({ row: CENTER, col: 5 + i, letter }));
  const haus: Placement[] = [..."HAUS"].map((letter, i) => ({ row: CENTER, col: 5 + i, letter }));

  it("lässt nur unbekannte Wörter zur Abstimmung zu", () => {
    const s = prepared();
    expect(spiel.checkMove(s, "sigrid", { type: "wort_anfragen", placements: haus })).toMatchObject({ ok: false, code: "ALLES_BEKANNT" });
    expect(spiel.checkMove(s, "sigrid", { type: "wort_anfragen", placements: [{ row: 0, col: 0, letter: "A" }] }).ok).toBe(false);
    expect(spiel.checkMove(s, "sigrid", { type: "wort_anfragen", placements: hausn })).toMatchObject({ ok: true, details: { words: ["HAUSN"] } });
  });

  it("der Gegenspieler muss zustimmen – dann wird gelegt", () => {
    let s = spiel.applyMove(prepared(), "sigrid", { type: "wort_anfragen", placements: hausn });
    expect(s.wordRequest?.words).toEqual(["HAUSN"]);
    expect(playersToAct(s)).toEqual(["tobi"]);
    expect(spiel.currentPlayer(s)).toBe("sigrid");
    // Sigrid kann nicht selbst zustimmen und nichts anderes tun
    expect(spiel.checkMove(s, "sigrid", { type: "abstimmen", accept: true }).ok).toBe(false);
    expect(spiel.checkMove(s, "sigrid", { type: "aussetzen" })).toMatchObject({ ok: false, code: "ANFRAGE_OFFEN" });
    s = spiel.applyMove(s, "tobi", { type: "abstimmen", accept: true });
    expect(s.wordRequest).toBeNull();
    expect(s.extraWords).toContain("HAUSN");
    expect(cellAt(s.board, CENTER, 9)).toBe("N");
    expect(s.players[0]!.score).toBeGreaterThan(0);
    expect(spiel.currentPlayer(s)).toBe("tobi");
    expect(s.history.map((h) => h.type)).toEqual(["anfrage", "abstimmung", "legen"]);
  });

  it("ein Nein beendet die Anfrage, der Spieler bleibt dran", () => {
    let s = spiel.applyMove(prepared(), "sigrid", { type: "wort_anfragen", placements: hausn });
    s = spiel.applyMove(s, "tobi", { type: "abstimmen", accept: false });
    expect(s.wordRequest).toBeNull();
    expect(s.board).toBe(prepared().board);
    expect(spiel.currentPlayer(s)).toBe("sigrid");
    expect(s.extraWords).toEqual([]);
    expect(s.scorelessTurns).toBe(0);
  });

  it("bei drei Spielern müssen beide anderen zustimmen", () => {
    let s = spiel.applyMove(prepared(3), "sigrid", { type: "wort_anfragen", placements: hausn });
    s = spiel.applyMove(s, "tobi", { type: "abstimmen", accept: true });
    expect(s.wordRequest).not.toBeNull();
    expect(playersToAct(s)).toEqual(["oma"]);
    expect(spiel.checkMove(s, "tobi", { type: "abstimmen", accept: true })).toMatchObject({ ok: false, code: "SCHON_ABGESTIMMT" });
    s = spiel.applyMove(s, "oma", { type: "abstimmen", accept: true });
    expect(s.wordRequest).toBeNull();
    expect(cellAt(s.board, CENTER, 9)).toBe("N");
  });

  it("die Anfrage kann zurückgezogen werden", () => {
    let s = spiel.applyMove(prepared(), "sigrid", { type: "wort_anfragen", placements: hausn });
    s = spiel.applyMove(s, "sigrid", { type: "anfrage_zurueckziehen" });
    expect(s.wordRequest).toBeNull();
    expect(spiel.checkMove(s, "sigrid", { type: "legen", placements: haus }).ok).toBe(true);
  });
});
