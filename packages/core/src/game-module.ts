/**
 * Einheitliche Schnittstelle für alle Spiele der Spielestube.
 *
 * Der Plattformkern (Familienliste, Partien, Push, Online-Abgleich) kennt nur
 * diese Schnittstelle. Jedes Spiel (Wörterei, später Mühle, Dame …) liefert
 * eine Implementierung. Alle Funktionen sind rein: Sie verändern den
 * übergebenen Zustand nicht, sondern liefern einen neuen. Der Zustand ist
 * reines JSON und kann so direkt in der Datenbank gespeichert werden.
 */

export type PlayerId = string;

export interface PlayerInfo {
  id: PlayerId;
  name: string;
}

/** Ergebnis einer Zugprüfung. Meldungen sind für Senioren verständlich formuliert. */
export type MoveCheck<Details = unknown> =
  | { ok: true; details: Details }
  | { ok: false; message: string; code: string };

export interface Standing {
  playerId: PlayerId;
  score: number;
  rank: number;
}

export interface GameResult {
  standings: Standing[];
  /** Spieler mit der höchsten Punktzahl (bei Gleichstand mehrere). */
  winners: PlayerId[];
}

export interface GameModule<State, Move, Options = Record<string, never>, CheckDetails = unknown> {
  /** Technischer Name, z. B. "woerterei". */
  readonly id: string;
  /** Anzeigename, z. B. "Wörterei". */
  readonly title: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;

  /** Neue Partie anlegen. `seed` macht Zufall (z. B. Buchstabenbeutel) reproduzierbar. */
  createGame(players: PlayerInfo[], seed: number, options?: Partial<Options>): State;

  /** Wer ist am Zug? `null`, wenn die Partie beendet ist. */
  currentPlayer(state: State): PlayerId | null;

  /** Zug prüfen, ohne ihn auszuführen (z. B. für die Punktevorschau). */
  checkMove(state: State, playerId: PlayerId, move: Move): MoveCheck<CheckDetails>;

  /** Zug ausführen. Wirft einen Fehler, wenn der Zug ungültig ist. */
  applyMove(state: State, playerId: PlayerId, move: Move): State;

  isOver(state: State): boolean;

  /** Aktueller Punktestand bzw. Endergebnis. */
  result(state: State): GameResult;
}

/** Fehler für ungültige Züge – trägt die verständliche Meldung weiter. */
export class InvalidMoveError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "InvalidMoveError";
  }
}

/** Hilfsfunktion: Platzierungen aus Punktzahlen berechnen (gleiche Punkte = gleicher Platz). */
export function rankStandings(scores: { playerId: PlayerId; score: number }[]): GameResult {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const standings: Standing[] = sorted.map((s) => ({
    ...s,
    rank: 1 + sorted.filter((o) => o.score > s.score).length,
  }));
  const best = sorted[0]?.score;
  const winners = sorted.filter((s) => s.score === best).map((s) => s.playerId);
  return { standings, winners };
}
