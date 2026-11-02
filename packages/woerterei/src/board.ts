/**
 * Spielbrett der Wörterei: 15 × 15 Felder mit eigener Anordnung der Bonusfelder.
 *
 * Das Brett wird als Zeichenkette mit 225 Zeichen gespeichert (Zeile für Zeile):
 *   "."            leeres Feld
 *   "A"–"Z","ÄÖÜ"  gelegter Buchstabe
 *   "a"–"z","äöü"  Joker, der diesen Buchstaben darstellt (zählt 0 Punkte)
 * Das ist kompakt und lässt sich direkt in der Datenbank speichern.
 */

export const BOARD_SIZE = 15;
export const CENTER = 7;
export const EMPTY = ".";

export type Premium = "W3" | "W2" | "L3" | "L2" | "START";

/**
 * Bonusfelder im oberen linken Achtel (Zeile ≤ Spalte ≤ 7), in der
 * klassischen, aus dem Brettspiel vertrauten Anordnung.
 * Daraus wird das ganze Brett durch Spiegelung erzeugt (achtfach symmetrisch):
 * 8 × Dreifach-Wort, 16 × Doppel-Wort, 12 × Dreifach-Buchstabe,
 * 24 × Doppel-Buchstabe, Stern in der Mitte.
 */
const PREMIUM_SEEDS: ReadonlyArray<[number, number, Premium]> = [
  [0, 0, "W3"],
  [0, 7, "W3"],
  [1, 1, "W2"],
  [2, 2, "W2"],
  [3, 3, "W2"],
  [4, 4, "W2"],
  [1, 5, "L3"],
  [5, 5, "L3"],
  [0, 3, "L2"],
  [2, 6, "L2"],
  [3, 7, "L2"],
  [6, 6, "L2"],
  [CENTER, CENTER, "START"],
];

function buildPremiumMap(): ReadonlyMap<number, Premium> {
  const map = new Map<number, Premium>();
  const last = BOARD_SIZE - 1;
  for (const [r, c, p] of PREMIUM_SEEDS) {
    for (const [a, b] of [
      [r, c],
      [c, r],
    ] as const) {
      for (const row of [a, last - a]) {
        for (const col of [b, last - b]) {
          map.set(row * BOARD_SIZE + col, p);
        }
      }
    }
  }
  return map;
}

const PREMIUMS = buildPremiumMap();

export function premiumAt(row: number, col: number): Premium | null {
  return PREMIUMS.get(row * BOARD_SIZE + col) ?? null;
}

/** Wortfaktor eines Bonusfelds (Startfeld zählt doppelt). */
export function wordMultiplier(p: Premium | null): number {
  return p === "W3" ? 3 : p === "W2" || p === "START" ? 2 : 1;
}

export function letterMultiplier(p: Premium | null): number {
  return p === "L3" ? 3 : p === "L2" ? 2 : 1;
}

export function emptyBoard(): string {
  return EMPTY.repeat(BOARD_SIZE * BOARD_SIZE);
}

export function inBounds(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row < BOARD_SIZE && col < BOARD_SIZE;
}

export function cellAt(board: string, row: number, col: number): string {
  if (!inBounds(row, col)) return EMPTY;
  return board.charAt(row * BOARD_SIZE + col);
}

export function isEmptyBoard(board: string): boolean {
  return !/[^.]/.test(board);
}

/** Ist das Zeichen auf dem Brett ein Joker? */
export function isJokerCell(ch: string): boolean {
  return ch !== EMPTY && ch !== ch.toUpperCase();
}

export function setCells(board: string, cells: ReadonlyArray<{ row: number; col: number; ch: string }>): string {
  const arr = board.split("");
  for (const { row, col, ch } of cells) arr[row * BOARD_SIZE + col] = ch;
  return arr.join("");
}

/** Brett als Textraster (zum Testen und Debuggen). */
export function boardToRows(board: string): string[] {
  const rows: string[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) rows.push(board.slice(r * BOARD_SIZE, (r + 1) * BOARD_SIZE));
  return rows;
}
