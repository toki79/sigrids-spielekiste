import type { WoerterState } from "@spielestube/woerterei";

/** Ein Familienmitglied. `id` bleibt gleich, auch wenn jemand ein neues Gerät nimmt. */
export interface Member {
  id: string;
  name: string;
  /** Zuletzt in der App gesehen (Millisekunden seit 1970), für „gerade da“. */
  lastSeen: number | null;
}

export interface Family {
  /** Gespeicherte Form ohne Bindestrich, z. B. „BLUME27“. */
  code: string;
  members: Member[];
}

export interface OnlineGame {
  id: string;
  familyCode: string;
  playerIds: string[];
  /** Wer ist dran (Mitglieds-ID), `null` wenn beendet. */
  turnId: string | null;
  status: "laeuft" | "beendet";
  moveCount: number;
  updatedAt: number;
  state: WoerterState;
}

export type Unsubscribe = () => void;

/** Ergebnis eines Zuges: „conflict“, wenn inzwischen jemand anderes gezogen hat. */
export type SubmitResult = "ok" | "conflict";

/**
 * Alles, was der Online-Modus vom Server braucht.
 * Umsetzungen: Firebase (echt) und lokal im Browser (zum Testen).
 */
export interface OnlineBackend {
  readonly kind: "firebase" | "local";
  /** Anmelden (anonym). Liefert die Geräte-Kennung. */
  signIn(): Promise<string>;
  /** Neue Familie mit dem Gründer als erstem Mitglied. */
  createFamily(founderName: string): Promise<{ code: string; memberId: string }>;
  getFamily(code: string): Promise<Family | null>;
  /** Als bestehendes Mitglied (memberId) oder neu (name) beitreten. Liefert die Mitglieds-ID. */
  joinFamily(code: string, as: { memberId: string } | { name: string }): Promise<string>;
  watchFamily(code: string, onChange: (family: Family | null) => void): Unsubscribe;
  touchPresence(code: string, memberId: string): Promise<void>;
  createGame(code: string, state: WoerterState): Promise<string>;
  watchGames(code: string, memberId: string, onChange: (games: OnlineGame[]) => void): Unsubscribe;
  /** Alle Partien der Familie (für Statistik und Rangliste). */
  watchFamilyGames(code: string, onChange: (games: OnlineGame[]) => void): Unsubscribe;
  watchGame(code: string, gameId: string, onChange: (game: OnlineGame | null) => void): Unsubscribe;
  /** Zug speichern – nur wenn die Partie noch beim erwarteten Stand ist. */
  submitMove(code: string, gameId: string, expectedMoveCount: number, next: WoerterState): Promise<SubmitResult>;
  deleteGame(code: string, gameId: string): Promise<void>;
}

/** Felder, die zusätzlich zum Spielzustand gespeichert werden (für Listen und Abfragen). */
export function gameFields(state: WoerterState) {
  return {
    playerIds: state.players.map((p) => p.id),
    turnId: state.status === "laeuft" ? (state.players[state.turn]?.id ?? null) : null,
    status: state.status,
    moveCount: state.moveCount,
  };
}

export function newId(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** „Gerade da“, wenn in den letzten 3 Minuten gesehen. */
export function isOnline(member: Member | undefined, now = Date.now()): boolean {
  return !!member?.lastSeen && now - member.lastSeen < 3 * 60 * 1000;
}

export function lastSeenText(member: Member | undefined, now = Date.now()): string {
  if (!member?.lastSeen) return "noch nie da gewesen";
  if (isOnline(member, now)) return "gerade da";
  const min = Math.round((now - member.lastSeen) / 60000);
  if (min < 60) return `vor ${min} Minuten da gewesen`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? "vor einer Stunde da gewesen" : `vor ${h} Stunden da gewesen`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern da gewesen" : `vor ${d} Tagen da gewesen`;
}
