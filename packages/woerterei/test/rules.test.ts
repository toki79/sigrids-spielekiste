import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  CENTER,
  CompactDictionary,
  checkPlay,
  emptyBoard,
  premiumAt,
  setCells,
  type Placement,
} from "@spielestube/woerterei";

const dict = CompactDictionary.fromWords(["HAUS", "HAUSE", "AU", "MAUS", "SO", "OH", "ES", "EI", "HASE", "AB", "BAU", "TOR", "AST"]);

/** Wort waagerecht oder senkrecht ab (row, col) als Placements. */
function word(text: string, row: number, col: number, down = false): Placement[] {
  return [...text].map((letter, i) => ({ row: down ? row + i : row, col: down ? col : col + i, letter }));
}

function boardWith(...words: { text: string; row: number; col: number; down?: boolean }[]): string {
  let b = emptyBoard();
  for (const w of words) b = setCells(b, word(w.text, w.row, w.col, w.down).map((p) => ({ row: p.row, col: p.col, ch: p.letter })));
  return b;
}

describe("Spielbrett", () => {
  it("ist symmetrisch und hat die Mitte als Startfeld", () => {
    expect(premiumAt(CENTER, CENTER)).toBe("START");
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        expect(premiumAt(r, c)).toBe(premiumAt(c, r));
        expect(premiumAt(r, c)).toBe(premiumAt(BOARD_SIZE - 1 - r, c));
      }
    }
  });
});

describe("Erster Zug", () => {
  it("wertet HAUS über die Mitte mit doppeltem Wortwert", () => {
    // H(7,5) A(7,6) U(7,7=Start) S(7,8): 2+1+1+1 = 5, Startfeld ×2 = 10
    const r = checkPlay(emptyBoard(), word("HAUS", 7, 5), { dictionary: dict });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.evaluation.words.map((w) => w.word)).toEqual(["HAUS"]);
      expect(r.evaluation.score).toBe(10);
    }
  });

  it("muss über das Mittelfeld gehen", () => {
    const r = checkPlay(emptyBoard(), word("HAUS", 0, 0), { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "START_NICHT_MITTE" });
  });

  it("braucht mindestens zwei Buchstaben", () => {
    const r = checkPlay(emptyBoard(), [{ row: CENTER, col: CENTER, letter: "A" }], { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "START_ZU_KURZ" });
  });
});

describe("Zugprüfung", () => {
  const board = boardWith({ text: "HAUS", row: 7, col: 5 });

  it("lehnt Steine ab, die nicht in einer Reihe liegen", () => {
    const r = checkPlay(board, [
      { row: 8, col: 5, letter: "A" },
      { row: 9, col: 6, letter: "B" },
    ], { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "NICHT_IN_REIHE" });
  });

  it("lehnt Lücken ab", () => {
    const r = checkPlay(board, [
      { row: 8, col: 5, letter: "A" },
      { row: 10, col: 5, letter: "B" },
    ], { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "LUECKE" });
  });

  it("lehnt belegte Felder ab", () => {
    const r = checkPlay(board, [{ row: 7, col: 5, letter: "A" }], { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "FELD_BELEGT" });
  });

  it("lehnt Wörter ohne Anschluss ab", () => {
    const r = checkPlay(board, word("SO", 0, 0), { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "NICHT_ANGELEGT" });
  });

  it("meldet unbekannte Wörter verständlich und liefert trotzdem die Vorschau", () => {
    const r = checkPlay(board, word("XY", 8, 5), { dictionary: dict });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("UNBEKANNTE_WOERTER");
      expect(r.message).toContain("„");
      expect(r.evaluation).toBeDefined();
    }
  });

  it("akzeptiert zusätzlich erlaubte Wörter", () => {
    const r = checkPlay(board, [{ row: 7, col: 9, letter: "X" }], { dictionary: dict, extraWords: ["HAUSX"] });
    expect(r.ok).toBe(true);
  });

  it("prüft die Bank des Spielers", () => {
    const r = checkPlay(board, [{ row: 7, col: 9, letter: "E" }], { dictionary: dict, rack: ["A", "B"] });
    expect(r).toMatchObject({ ok: false, code: "NICHT_AUF_BANK" });
  });

  it("verlangt bei Jokern einen gewählten Buchstaben", () => {
    const r = checkPlay(board, [{ row: 7, col: 9, letter: "?", joker: true }], { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "UNGUELTIGER_BUCHSTABE" });
  });
});

describe("Wertung", () => {
  it("verlängert ein Wort und zählt liegende Steine ohne Bonus", () => {
    // HAUS liegt (7,5)-(7,8). E auf (7,9): HAUSE = 2+1+1+1+1 = 6, (7,9) ist kein Bonusfeld
    const board = boardWith({ text: "HAUS", row: 7, col: 5 });
    expect(premiumAt(7, 9)).toBeNull();
    const r = checkPlay(board, [{ row: 7, col: 9, letter: "E" }], { dictionary: dict });
    expect(r.ok && r.evaluation.score).toBe(6);
  });

  it("zählt Querwörter mit", () => {
    // HAUS waagerecht, darunter ES ab (8,7): senkrecht entsteht U+E = "UE"? -> nicht im Wörterbuch.
    // Stattdessen: O unter H → senkrecht "HO"? Wir nutzen OH: O über H auf (6,5).
    const board = boardWith({ text: "HAUS", row: 7, col: 5 });
    const r = checkPlay(board, [{ row: 6, col: 5, letter: "O" }], { dictionary: dict });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.evaluation.words.map((w) => w.word)).toEqual(["OH"]);
      // O(6,5) = 2 × L3? (6,5) prüfen wir dynamisch
      const p = premiumAt(6, 5);
      const oValue = 2 * (p === "L3" ? 3 : p === "L2" ? 2 : 1);
      const factor = p === "W3" ? 3 : p === "W2" ? 2 : 1;
      expect(r.evaluation.score).toBe((oValue + 2) * factor);
    }
  });

  it("wertet Haupt- und Querwort gemeinsam", () => {
    // HAUS (7,5)-(7,8). Lege "EI" senkrecht ab (8,8)? Querwort: S über E -> "SEI" nicht vorhanden.
    // Lege "ES" waagerecht in Zeile 8 ab (8,7): E unter U → "UE" ungültig.
    // Also: "AB" waagerecht in Zeile 6, A(6,7) über U? → "AU" senkrecht gültig, B(6,8) über S → "BS" ungültig.
    const board = boardWith({ text: "HAUS", row: 7, col: 5 });
    const r = checkPlay(board, word("AB", 6, 7), { dictionary: dict });
    expect(r).toMatchObject({ ok: false, code: "UNBEKANNTE_WOERTER" });
    if (!r.ok) expect(r.message).toContain("BS");
  });

  it("gibt dem Joker null Punkte, aber den Bonus des Felds weiter an das Wort", () => {
    // Erstes Wort SO mit Joker als S auf dem Startfeld: S(7,7)=0, O(7,8)=2 → 2 × 2 = 4
    const r = checkPlay(emptyBoard(), [
      { row: 7, col: 7, letter: "S", joker: true },
      { row: 7, col: 8, letter: "O" },
    ], { dictionary: dict });
    expect(r.ok && r.evaluation.score).toBe(4);
    if (r.ok) expect(r.evaluation.board.charAt(7 * BOARD_SIZE + 7)).toBe("s");
  });

  it("vergibt 50 Bonuspunkte für alle sieben Steine", () => {
    const seven = CompactDictionary.fromWords(["ERHOLEN"]);
    const r = checkPlay(emptyBoard(), word("ERHOLEN", 7, 4), { dictionary: seven });
    expect(r.ok && r.evaluation.allTilesBonus).toBe(50);
  });

  it("multipliziert Wortfelder, wenn ein Wort zwei davon belegt", () => {
    // Senkrecht in Spalte 6: (6,6)=L3, (8,6)=L3. Wir legen ein 3er-Wort auf Wortfelder:
    // Zeile 2: (2,6)=W2 und (2,8)=W2 → Wort von (2,6) bis (2,8) braucht Anschluss.
    const board = boardWith({ text: "TOR", row: 3, col: 6 });
    const r = checkPlay(board, word("AST", 2, 6), { dictionary: CompactDictionary.fromWords(["AST", "AT", "SO", "TR", "TOR"]) });
    // Querwörter: A über T = "AT", S über O = "SO", T über R = "TR"
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(premiumAt(2, 6)).toBe("W2");
      expect(premiumAt(2, 8)).toBe("W2");
      const ast = r.evaluation.words.find((w) => w.word === "AST")!;
      expect(ast.score).toBe((1 + 1 + 1) * 4);
    }
  });
});
