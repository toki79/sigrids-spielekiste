/**
 * Prüfung einer Reihe auf dem Tisch.
 *
 * Gruppe: 3–4 Steine mit gleicher Zahl in verschiedenen Farben.
 * Folge:  mindestens 3 Steine einer Farbe mit aufeinanderfolgenden Zahlen (1 bis 13, nicht „rundherum“).
 * Joker ersetzen beliebige Steine.
 */
import { tile, type TileColor, type TileId } from "./tiles";

export type SetKind = "gruppe" | "folge";

export type SetAnalysis =
  | {
      valid: true;
      kind: SetKind;
      /** Steine in Anzeige-Reihenfolge (Folge aufsteigend, Joker an ihrer Stelle). */
      ordered: TileId[];
      /** Wert, den jeder Stein in dieser Reihe darstellt (Joker inklusive). */
      values: number[];
      /** Summe der Werte (für das erste Auslegen). */
      value: number;
    }
  | { valid: false; reason: string; ordered: TileId[] };

const sorted = (ids: readonly TileId[]) =>
  [...ids].sort((a, b) => {
    const x = tile(a), y = tile(b);
    if (x.joker !== y.joker) return x.joker ? 1 : -1;
    return x.n - y.n || x.color - y.color;
  });

function asGroup(ids: readonly TileId[]): SetAnalysis | null {
  const tiles = ids.map(tile);
  const normal = tiles.filter((t) => !t.joker);
  if (ids.length < 3 || ids.length > 4) return null;
  if (normal.length === 0) return null;
  const n = normal[0]!.n;
  if (!normal.every((t) => t.n === n)) return null;
  if (new Set(normal.map((t) => t.color)).size !== normal.length) return null;
  const ordered = [...normal.sort((a, b) => a.color - b.color).map((t) => t.id), ...tiles.filter((t) => t.joker).map((t) => t.id)];
  return { valid: true, kind: "gruppe", ordered, values: ordered.map(() => n), value: n * ids.length };
}

function asRun(ids: readonly TileId[]): SetAnalysis | null {
  const tiles = ids.map(tile);
  const normal = tiles.filter((t) => !t.joker).sort((a, b) => a.n - b.n);
  const jokers = tiles.filter((t) => t.joker);
  const len = ids.length;
  if (len < 3 || len > 13 || normal.length === 0) return null;
  const color: TileColor = normal[0]!.color;
  if (!normal.every((t) => t.color === color)) return null;
  for (let i = 1; i < normal.length; i++) if (normal[i]!.n === normal[i - 1]!.n) return null;
  const lo = normal[0]!.n;
  const hi = normal[normal.length - 1]!.n;
  if (hi - lo + 1 > len) return null; // Lücken größer als die Zahl der Joker
  // Start der Folge so hoch wie möglich (Joker zählen dann möglichst viel)
  const start = Math.min(lo, 13 - len + 1);
  if (start < 1 || start > lo || start + len - 1 < hi) return null;
  const ordered: TileId[] = [];
  const values: number[] = [];
  const byNumber = new Map(normal.map((t) => [t.n, t.id]));
  let j = 0;
  for (let v = start; v < start + len; v++) {
    const id = byNumber.get(v);
    if (id !== undefined) ordered.push(id);
    else ordered.push(jokers[j++]!.id);
    values.push(v);
  }
  return { valid: true, kind: "folge", ordered, values, value: values.reduce((a, b) => a + b, 0) };
}

export function analyzeSet(ids: readonly TileId[]): SetAnalysis {
  if (ids.length === 0) return { valid: false, reason: "Leere Reihe.", ordered: [] };
  if (ids.length < 3) return { valid: false, reason: "Eine Reihe braucht mindestens 3 Steine.", ordered: sorted(ids) };
  const options = [asGroup(ids), asRun(ids)].filter((x): x is Extract<SetAnalysis, { valid: true }> => !!x && x.valid);
  if (options.length === 0) {
    return {
      valid: false,
      reason: "Das ist weder eine Gruppe (gleiche Zahl, verschiedene Farben) noch eine Folge (eine Farbe, Zahlen der Reihe nach).",
      ordered: sorted(ids),
    };
  }
  // Gibt es beides (z. B. 5, Joker, Joker), zählt die wertvollere Möglichkeit.
  return options.sort((a, b) => b.value - a.value)[0]!;
}
