/**
 * Die 106 Steine: Zahlen 1–13 in vier Farben, jeweils doppelt, plus zwei Joker.
 * Ein Stein wird überall nur über seine Nummer (0–105) angesprochen.
 */

export type TileId = number;

/** Farben: 0 Rot, 1 Blau, 2 Schwarz, 3 Orange. Joker: -1. */
export type TileColor = 0 | 1 | 2 | 3 | -1;

export const COLOR_NAMES = ["Rot", "Blau", "Schwarz", "Orange"] as const;
export const JOKER_IDS: readonly TileId[] = [104, 105];
export const TILE_COUNT = 106;
export const RACK_START = 14;
/** Strafpunkte für einen Joker, der am Ende noch auf der Bank liegt. */
export const JOKER_PENALTY = 30;
/** Mindestwert beim ersten Auslegen. */
export const INITIAL_MELD = 30;

export interface Tile {
  id: TileId;
  color: TileColor;
  /** 1–13, beim Joker 0. */
  n: number;
  joker: boolean;
}

/** Steinnummer → Farbe und Zahl (feste Zuordnung, damit alle Geräte gleich rechnen). */
export function tile(id: TileId): Tile {
  if (id === 104 || id === 105) return { id, color: -1, n: 0, joker: true };
  if (!Number.isInteger(id) || id < 0 || id > 105) throw new Error(`Unbekannter Stein ${id}`);
  const k = id % 52;
  return { id, color: Math.floor(k / 13) as TileColor, n: (k % 13) + 1, joker: false };
}

export function allTileIds(): TileId[] {
  return Array.from({ length: TILE_COUNT }, (_, i) => i);
}

export function isJoker(id: TileId): boolean {
  return id === 104 || id === 105;
}

/** Strafwert eines Steins auf der Bank am Spielende. */
export function penaltyValue(id: TileId): number {
  return isJoker(id) ? JOKER_PENALTY : tile(id).n;
}

export function rackPenalty(rack: readonly TileId[]): number {
  return rack.reduce((s, id) => s + penaltyValue(id), 0);
}

/** Bank sortieren: nach Farbe, dann Zahl (Joker ans Ende). */
export function sortByColor(ids: readonly TileId[]): TileId[] {
  return [...ids].sort((a, b) => {
    const x = tile(a), y = tile(b);
    if (x.joker !== y.joker) return x.joker ? 1 : -1;
    return x.color - y.color || x.n - y.n || a - b;
  });
}

/** Bank sortieren: nach Zahl, dann Farbe (Joker ans Ende). */
export function sortByNumber(ids: readonly TileId[]): TileId[] {
  return [...ids].sort((a, b) => {
    const x = tile(a), y = tile(b);
    if (x.joker !== y.joker) return x.joker ? 1 : -1;
    return x.n - y.n || x.color - y.color || a - b;
  });
}
