/**
 * Statistik und Rangliste über alle beendeten Partien einer Familie.
 */
import type { PlayerId } from "@spielestube/core";
import { result, type WoerterState } from "./game";

export interface MemberStats {
  id: PlayerId;
  name: string;
  /** Platz in der Rangliste (gleiche Leistung = gleicher Platz). */
  rank: number;
  games: number;
  wins: number;
  /** Anteil gewonnener Partien, 0 bis 1. */
  winRate: number;
  totalPoints: number;
  avgPoints: number;
  /** Höchste Punktzahl am Ende einer Partie. */
  bestGame: number;
  /** Zug mit den meisten Punkten (Hauptwort des Zuges). */
  bestMove: { word: string; score: number } | null;
}

export interface FamilyRecords {
  bestMove: { playerId: PlayerId; name: string; word: string; score: number } | null;
  bestGame: { playerId: PlayerId; name: string; score: number } | null;
  finishedGames: number;
}

/**
 * Rangfolge: zuerst Siege, dann Siegquote, dann Ø Punkte.
 * Bei Gleichstand am Ende einer Partie zählt sie für alle Gewinner als Sieg.
 */
export function computeStats(games: readonly WoerterState[]): { ranking: MemberStats[]; records: FamilyRecords } {
  const finished = games.filter((g) => g.status === "beendet");
  const map = new Map<PlayerId, MemberStats>();
  const records: FamilyRecords = { bestMove: null, bestGame: null, finishedGames: finished.length };

  for (const g of finished) {
    const res = result(g);
    for (const p of g.players) {
      let s = map.get(p.id);
      if (!s) {
        s = { id: p.id, name: p.name, rank: 0, games: 0, wins: 0, winRate: 0, totalPoints: 0, avgPoints: 0, bestGame: 0, bestMove: null };
        map.set(p.id, s);
      }
      s.name = p.name;
      s.games += 1;
      if (res.winners.includes(p.id)) s.wins += 1;
      s.totalPoints += p.score;
      s.bestGame = Math.max(s.bestGame, p.score);
      if (!records.bestGame || p.score > records.bestGame.score) records.bestGame = { playerId: p.id, name: p.name, score: p.score };
    }
    for (const h of g.history) {
      if (h.type !== "legen") continue;
      const s = map.get(h.playerId);
      const word = [...h.words].sort((a, b) => b.word.length - a.word.length)[0]?.word ?? "";
      if (s && (!s.bestMove || h.score > s.bestMove.score)) s.bestMove = { word, score: h.score };
      if (!records.bestMove || h.score > records.bestMove.score) {
        records.bestMove = { playerId: h.playerId, name: s?.name ?? "", word, score: h.score };
      }
    }
  }

  const ranking = [...map.values()].map((s) => ({
    ...s,
    winRate: s.games ? s.wins / s.games : 0,
    avgPoints: s.games ? Math.round(s.totalPoints / s.games) : 0,
  }));
  const key = (s: MemberStats) => [s.wins, s.winRate, s.avgPoints] as const;
  const better = (a: MemberStats, b: MemberStats) => {
    const [x, y] = [key(a), key(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! > y[i]!;
    return false;
  };
  ranking.sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : a.name.localeCompare(b.name, "de")));
  for (const s of ranking) s.rank = 1 + ranking.filter((o) => better(o, s)).length;
  return { ranking, records };
}
