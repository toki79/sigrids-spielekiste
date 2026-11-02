/**
 * Verzeichnis aller Spiele der Spielestube.
 * Alles, was die App spielübergreifend braucht (Titel, neue Partie, wer ist dran,
 * Beschreibung des letzten Zuges, Rangliste), steht hier – die eigentlichen
 * Spielregeln liegen in den Paketen unter packages/.
 */
import { rankStandings, type PlayerInfo, type RankedMember, type RecordLine } from "@spielestube/core";
import { computeStats, playersToAct as woerterActors, type WoerterState } from "@spielestube/woerterei";
import { computeRommeStats, createGame as createRomme, playersToAct as rommeActors, type RommeState } from "@spielestube/zahlenromme";
import { getGame as getWoerterei } from "../game";
import { describeEntry, lastMoveEntry, playerName } from "../texts";

export type GameType = "woerterei" | "zahlenromme";
export type AnyState = WoerterState | RommeState;

export interface GameStats {
  ranking: RankedMember[];
  records: RecordLine[];
  finishedGames: number;
}

export interface GameInfo {
  type: GameType;
  title: string;
  icon: string;
  /** Ein Satz für die Spielauswahl. */
  description: string;
  create(players: PlayerInfo[], seed: number): AnyState;
  /** Wer muss gerade etwas tun? */
  playersToAct(state: AnyState): string[];
  /** Verständliche Beschreibung des letzten Zuges (für die Übergabe am selben Gerät). */
  describeLast(state: AnyState): string | null;
  /** Kurzinfo je Spieler, z. B. „34 Punkte“ oder „12 Steine“. */
  playerLine(state: AnyState, playerId: string): string;
  /** Bezeichnung der Reste bei der Endabrechnung. */
  restLabel: string;
  stats(states: AnyState[]): GameStats;
}

const woerterei: GameInfo = {
  type: "woerterei",
  title: "Wörterei",
  icon: "🔤",
  description: "Wörter legen auf dem Spielbrett – wie das bekannte Buchstaben-Legespiel.",
  create: (players, seed) => getWoerterei().createGame(players, seed),
  playersToAct: (s) => woerterActors(s as WoerterState),
  describeLast: (s) => describeEntry(s as WoerterState, lastMoveEntry(s as WoerterState)),
  playerLine: (s, id) => `${s.players.find((p) => p.id === id)?.score ?? 0} Punkte`,
  restLabel: "Restbuchstaben",
  stats: (states) => {
    const { ranking, records } = computeStats(states as WoerterState[]);
    const lines: RecordLine[] = [];
    if (records.bestMove)
      lines.push({ icon: "🏆", label: "Bester Zug", name: records.bestMove.name, text: `mit ${records.bestMove.word} (${records.bestMove.score} Punkte)` });
    if (records.bestGame)
      lines.push({ icon: "⭐", label: "Höchste Punktzahl in einer Partie", name: records.bestGame.name, text: `mit ${records.bestGame.score} Punkten` });
    lines.push({ icon: "🎲", label: "Beendete Partien insgesamt", text: String(records.finishedGames) });
    return { ranking, records: lines, finishedGames: records.finishedGames };
  },
};

function describeRomme(s: RommeState): string | null {
  for (let i = s.history.length - 1; i >= 0; i--) {
    const h = s.history[i]!;
    if (h.type === "ende") continue;
    const name = playerName(s as never, h.playerId);
    if (h.type === "legen") {
      const n = h.tiles.length === 1 ? "einen Stein" : `${h.tiles.length} Steine`;
      return h.initial ? `${name} hat zum ersten Mal ausgelegt – ${n} mit ${h.value} Punkten.` : `${name} hat ${n} gelegt.`;
    }
    if (h.type === "ziehen") return `${name} hat einen Stein gezogen.`;
    return `${name} hat ausgesetzt (keine Steine mehr im Vorrat).`;
  }
  return null;
}

const zahlenromme: GameInfo = {
  type: "zahlenromme",
  title: "Zahlen-Rommé",
  icon: "🔢",
  description: "Zahlensteine in Reihen und Gruppen ablegen – wer zuerst alle Steine los ist, gewinnt.",
  create: (players, seed) => createRomme(players, seed),
  playersToAct: (s) => rommeActors(s as RommeState),
  describeLast: (s) => describeRomme(s as RommeState),
  playerLine: (s, id) => {
    const p = (s as RommeState).players.find((x) => x.id === id);
    if (!p) return "";
    if (s.status === "beendet") return `${p.score} Punkte`;
    return p.rack.length === 1 ? "1 Stein" : `${p.rack.length} Steine`;
  },
  restLabel: "Reststeine",
  stats: (states) => computeRommeStats(states as RommeState[]),
};

export const GAMES: Record<GameType, GameInfo> = { woerterei, zahlenromme };
export const GAME_LIST: GameInfo[] = [woerterei, zahlenromme];

export function gameOf(state: AnyState): GameInfo {
  return GAMES[state.game] ?? woerterei;
}

export function standings(state: AnyState) {
  return rankStandings(state.players.map((p) => ({ playerId: p.id, score: p.score })));
}
