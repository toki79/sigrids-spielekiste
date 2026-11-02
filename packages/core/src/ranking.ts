/**
 * Allgemeine Familien-Rangliste über beendete Partien – für jedes Spiel nutzbar.
 */
import type { PlayerId } from "./game-module";

export interface FinishedGameSummary {
  players: { id: PlayerId; name: string; score: number }[];
  winners: PlayerId[];
}

export interface RankedMember {
  id: PlayerId;
  name: string;
  /** Platz (gleiche Leistung = gleicher Platz). */
  rank: number;
  games: number;
  wins: number;
  winRate: number;
  totalPoints: number;
  avgPoints: number;
  bestGame: number;
}

/** Eine Zeile in den „Rekorden“, z. B. „Bester Zug: Sigrid mit QUARK – 64 Punkte“. */
export interface RecordLine {
  icon: string;
  label: string;
  name?: string;
  text: string;
}

/** Rangfolge: Siege → Siegquote → Ø Punkte. Unentschieden zählt für alle Gewinner als Sieg. */
export function rankMembers(games: readonly FinishedGameSummary[]): RankedMember[] {
  const map = new Map<PlayerId, RankedMember>();
  for (const g of games) {
    for (const p of g.players) {
      let s = map.get(p.id);
      if (!s) {
        s = { id: p.id, name: p.name, rank: 0, games: 0, wins: 0, winRate: 0, totalPoints: 0, avgPoints: 0, bestGame: Number.NEGATIVE_INFINITY };
        map.set(p.id, s);
      }
      s.name = p.name;
      s.games += 1;
      if (g.winners.includes(p.id)) s.wins += 1;
      s.totalPoints += p.score;
      s.bestGame = Math.max(s.bestGame, p.score);
    }
  }
  const list = [...map.values()].map((s) => ({
    ...s,
    winRate: s.games ? s.wins / s.games : 0,
    avgPoints: s.games ? Math.round(s.totalPoints / s.games) : 0,
  }));
  const key = (s: RankedMember) => [s.wins, s.winRate, s.avgPoints];
  const better = (a: RankedMember, b: RankedMember) => {
    const [x, y] = [key(a), key(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! > y[i]!;
    return false;
  };
  list.sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : a.name.localeCompare(b.name, "de")));
  for (const s of list) s.rank = 1 + list.filter((o) => better(o, s)).length;
  return list;
}
