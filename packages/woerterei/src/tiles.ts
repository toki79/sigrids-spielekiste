/**
 * Buchstabensteine der Wörterei.
 *
 * Verteilung und Werte sind aus der Buchstabenhäufigkeit der eigenen
 * Wortliste abgeleitet: häufige Buchstaben gibt es oft und sie bringen wenig
 * Punkte, seltene umgekehrt. 100 Buchstaben + 2 Joker = 102 Steine.
 */

/** Zeichen für einen Joker auf der Bank. */
export const JOKER = "?";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ";

export const LETTER_COUNTS: Readonly<Record<string, number>> = {
  E: 15, N: 9, S: 7, R: 6, T: 6, I: 6, A: 6, U: 5, D: 4, H: 4, M: 4,
  L: 3, G: 3, O: 3, B: 2, C: 2, F: 2, K: 2,
  P: 1, Z: 1, W: 1, V: 1, J: 1, Ä: 1, Ö: 1, Ü: 1, X: 1, Y: 1, Q: 1,
  [JOKER]: 2,
};

export const LETTER_VALUES: Readonly<Record<string, number>> = {
  E: 1, N: 1, S: 1, R: 1, T: 1, I: 1, A: 1, U: 1, D: 1,
  L: 2, H: 2, G: 2, O: 2, M: 2,
  B: 3, F: 3, K: 3, W: 3,
  C: 4, P: 4, Z: 4,
  V: 6, J: 6, Ä: 6, Ü: 6,
  Ö: 8, X: 8,
  Y: 10, Q: 10,
  [JOKER]: 0,
};

/** Anzahl Steine auf der Bank. */
export const RACK_SIZE = 7;

/** Bonus, wenn alle sieben Steine in einem Zug gelegt werden. */
export const ALL_TILES_BONUS = 50;

/** Alle Steine eines neuen Beutels (ungemischt). */
export function fullBag(): string[] {
  const bag: string[] = [];
  for (const [letter, count] of Object.entries(LETTER_COUNTS)) {
    for (let i = 0; i < count; i++) bag.push(letter);
  }
  return bag;
}

export function isLetter(ch: string): boolean {
  return ch.length === 1 && LETTERS.includes(ch);
}

/** Punktwert eines Steins auf der Bank (Joker = 0). */
export function tileValue(tile: string): number {
  return LETTER_VALUES[tile] ?? 0;
}

/** Summe der Punktwerte einer Bank (für die Endabrechnung). */
export function rackValue(rack: readonly string[]): number {
  return rack.reduce((sum, t) => sum + tileValue(t), 0);
}
