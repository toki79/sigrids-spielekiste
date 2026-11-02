/**
 * Zugprüfung und Punktewertung für das Legen von Buchstaben.
 */
import {
  BOARD_SIZE,
  CENTER,
  EMPTY,
  cellAt,
  inBounds,
  isEmptyBoard,
  isJokerCell,
  letterMultiplier,
  premiumAt,
  setCells,
  wordMultiplier,
} from "./board";
import type { Dictionary } from "./dictionary";
import { ALL_TILES_BONUS, JOKER, LETTER_VALUES, RACK_SIZE, isLetter } from "./tiles";

/** Ein Stein, der in diesem Zug aufs Brett gelegt wird. */
export interface Placement {
  row: number;
  col: number;
  /** Großbuchstabe, den der Stein zeigt (bei Jokern: der gewählte Buchstabe). */
  letter: string;
  /** true, wenn dafür ein Joker von der Bank verwendet wird. */
  joker?: boolean;
}

export interface FormedWord {
  word: string;
  /** Felder des Wortes in Lesereihenfolge. */
  cells: { row: number; col: number }[];
  score: number;
  valid: boolean;
}

export interface PlayEvaluation {
  words: FormedWord[];
  /** Gesamtpunktzahl inklusive Bonus für alle sieben Steine. */
  score: number;
  allTilesBonus: number;
  /** Brett nach dem Zug. */
  board: string;
}

export type PlayCheck =
  | { ok: true; evaluation: PlayEvaluation }
  | { ok: false; code: PlayErrorCode; message: string; evaluation?: PlayEvaluation };

export type PlayErrorCode =
  | "KEINE_STEINE"
  | "AUSSERHALB"
  | "FELD_BELEGT"
  | "DOPPELT"
  | "UNGUELTIGER_BUCHSTABE"
  | "NICHT_IN_REIHE"
  | "LUECKE"
  | "START_NICHT_MITTE"
  | "START_ZU_KURZ"
  | "NICHT_ANGELEGT"
  | "NICHT_AUF_BANK"
  | "UNBEKANNTE_WOERTER";

export interface CheckPlayOptions {
  dictionary: Dictionary;
  /** Von allen Mitspielern zusätzlich erlaubte Wörter. */
  extraWords?: readonly string[];
  /** Bank des Spielers. Wenn angegeben, wird geprüft, ob er die Steine hat. */
  rack?: readonly string[];
}

const fail = (code: PlayErrorCode, message: string, evaluation?: PlayEvaluation): PlayCheck => ({
  ok: false,
  code,
  message,
  ...(evaluation ? { evaluation } : {}),
});

/** Welche Steine verbraucht der Zug von der Bank? */
export function tilesUsed(placements: readonly Placement[]): string[] {
  return placements.map((p) => (p.joker ? JOKER : p.letter));
}

/** Prüft, ob die Bank die benötigten Steine enthält, und liefert die Restbank. */
export function removeFromRack(rack: readonly string[], tiles: readonly string[]): string[] | null {
  const rest = [...rack];
  for (const t of tiles) {
    const i = rest.indexOf(t);
    if (i < 0) return null;
    rest.splice(i, 1);
  }
  return rest;
}

export function checkPlay(board: string, placements: readonly Placement[], options: CheckPlayOptions): PlayCheck {
  if (placements.length === 0) {
    return fail("KEINE_STEINE", "Bitte lege mindestens einen Buchstaben aufs Brett.");
  }

  // 1. Jeder Stein für sich
  const seen = new Set<number>();
  for (const p of placements) {
    if (!inBounds(p.row, p.col)) return fail("AUSSERHALB", "Ein Buchstabe liegt außerhalb des Spielbretts.");
    if (!isLetter(p.letter)) {
      return fail(
        "UNGUELTIGER_BUCHSTABE",
        p.joker ? "Bitte wähle aus, welchen Buchstaben der Joker darstellen soll." : "Dieser Buchstabe ist im Spiel nicht vorgesehen.",
      );
    }
    if (cellAt(board, p.row, p.col) !== EMPTY) return fail("FELD_BELEGT", "Auf diesem Feld liegt schon ein Buchstabe.");
    const key = p.row * BOARD_SIZE + p.col;
    if (seen.has(key)) return fail("DOPPELT", "Auf ein Feld passt nur ein Buchstabe.");
    seen.add(key);
  }

  if (options.rack && !removeFromRack(options.rack, tilesUsed(placements))) {
    return fail("NICHT_AUF_BANK", "Diese Buchstaben hast du nicht auf deiner Bank.");
  }

  // 2. Alle in einer Reihe?
  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  if (rows.size > 1 && cols.size > 1) {
    return fail("NICHT_IN_REIHE", "Alle Buchstaben eines Zuges müssen in einer Reihe liegen – entweder waagerecht oder senkrecht.");
  }

  const after = setCells(
    board,
    placements.map((p) => ({ row: p.row, col: p.col, ch: p.joker ? p.letter.toLowerCase() : p.letter })),
  );
  const firstMove = isEmptyBoard(board);

  // Hauptrichtung bestimmen
  let horizontal: boolean;
  if (placements.length > 1) {
    horizontal = rows.size === 1;
  } else {
    const p = placements[0]!;
    horizontal = cellAt(after, p.row, p.col - 1) !== EMPTY || cellAt(after, p.row, p.col + 1) !== EMPTY;
  }
  const [dr, dc] = horizontal ? [0, 1] : [1, 0];

  // 3. Zusammenhängend (Lücken nur durch bereits liegende Steine gefüllt)
  const sorted = [...placements].sort((a, b) => (horizontal ? a.col - b.col : a.row - b.row));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  for (let r = first.row, c = first.col; r <= last.row && c <= last.col; r += dr, c += dc) {
    if (cellAt(after, r, c) === EMPTY) {
      return fail("LUECKE", "Zwischen deinen Buchstaben ist eine Lücke. Das Wort muss zusammenhängen.");
    }
  }

  // 4. Erster Zug über die Mitte, sonst Anschluss an liegende Steine
  if (firstMove) {
    if (!placements.some((p) => p.row === CENTER && p.col === CENTER)) {
      return fail("START_NICHT_MITTE", "Das erste Wort muss über das Sternfeld in der Mitte gehen.");
    }
    if (placements.length < 2) {
      return fail("START_ZU_KURZ", "Das erste Wort muss mindestens zwei Buchstaben haben.");
    }
  } else {
    const touches = placements.some(({ row, col }) =>
      [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ].some(([r, c]) => cellAt(board, r!, c!) !== EMPTY),
    );
    if (!touches) {
      return fail("NICHT_ANGELEGT", "Dein Wort muss an ein Wort anschließen, das schon auf dem Brett liegt.");
    }
  }

  // 5. Entstandene Wörter sammeln
  const newCells = new Set(placements.map((p) => p.row * BOARD_SIZE + p.col));
  const words: FormedWord[] = [];
  const main = readWord(after, first.row, first.col, dr, dc);
  if (main.length >= 2) words.push(scoreWord(after, main, newCells, options));
  for (const p of placements) {
    const cross = readWord(after, p.row, p.col, dc, dr);
    if (cross.length >= 2) words.push(scoreWord(after, cross, newCells, options));
  }
  if (words.length === 0) {
    // Nur möglich bei einem einzelnen Stein ohne Nachbarn – wird oben schon abgefangen.
    return fail("NICHT_ANGELEGT", "Dein Wort muss an ein Wort anschließen, das schon auf dem Brett liegt.");
  }

  const allTilesBonus = placements.length === RACK_SIZE ? ALL_TILES_BONUS : 0;
  const evaluation: PlayEvaluation = {
    words,
    score: words.reduce((s, w) => s + w.score, 0) + allTilesBonus,
    allTilesBonus,
    board: after,
  };

  const unknown = words.filter((w) => !w.valid).map((w) => w.word);
  if (unknown.length > 0) {
    const list = [...new Set(unknown)].map((w) => `„${w}“`);
    const message =
      list.length === 1
        ? `Das Wort ${list[0]} steht nicht in unserem Wörterbuch.`
        : `Diese Wörter stehen nicht in unserem Wörterbuch: ${list.join(", ")}.`;
    return fail("UNBEKANNTE_WOERTER", message, evaluation);
  }

  return { ok: true, evaluation };
}

/** Liest das Wort, das durch (row, col) in Richtung (dr, dc) verläuft. */
function readWord(board: string, row: number, col: number, dr: number, dc: number): { row: number; col: number }[] {
  let r = row;
  let c = col;
  while (cellAt(board, r - dr, c - dc) !== EMPTY) {
    r -= dr;
    c -= dc;
  }
  const cells: { row: number; col: number }[] = [];
  while (cellAt(board, r, c) !== EMPTY) {
    cells.push({ row: r, col: c });
    r += dr;
    c += dc;
  }
  return cells;
}

function scoreWord(
  board: string,
  cells: { row: number; col: number }[],
  newCells: ReadonlySet<number>,
  options: CheckPlayOptions,
): FormedWord {
  let sum = 0;
  let factor = 1;
  let word = "";
  for (const { row, col } of cells) {
    const ch = cellAt(board, row, col);
    word += ch.toUpperCase();
    const base = isJokerCell(ch) ? 0 : (LETTER_VALUES[ch] ?? 0);
    if (newCells.has(row * BOARD_SIZE + col)) {
      const p = premiumAt(row, col);
      sum += base * letterMultiplier(p);
      factor *= wordMultiplier(p);
    } else {
      sum += base;
    }
  }
  const valid = options.dictionary.has(word) || (options.extraWords ?? []).includes(word);
  return { word, cells, score: sum * factor, valid };
}
