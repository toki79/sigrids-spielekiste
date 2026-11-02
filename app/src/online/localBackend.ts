/**
 * Test-Umsetzung des Online-Modus ohne Server: Alle Daten liegen im
 * localStorage des Browsers. Zwei Browser-Tabs teilen sich diese Daten und
 * werden über das „storage“-Ereignis benachrichtigt – so lassen sich zwei
 * Geräte gegeneinander simulieren. Nur für Entwicklung und automatische Tests
 * (Aufruf der Web-Version mit `?backend=local`).
 */
import { generateFamilyCode, normalizeFamilyCode } from "@spielestube/core";
import type { WoerterState } from "@spielestube/woerterei";
import { gameFields, newId, type Family, type OnlineBackend, type OnlineGame } from "./types";

interface Db {
  families: Record<string, { code: string; members: Record<string, { name: string; lastSeen: number | null }> }>;
  games: Record<string, Omit<OnlineGame, "state"> & { stateJson: string }>;
}

const KEY = "spielestube.lokaler-server.v1";

function read(): Db {
  try {
    return (JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "null") as Db | null) ?? { families: {}, games: {} };
  } catch {
    return { families: {}, games: {} };
  }
}

const listeners = new Set<() => void>();

function write(db: Db) {
  globalThis.localStorage?.setItem(KEY, JSON.stringify(db));
  // Andere Tabs erhalten das „storage“-Ereignis; dieser Tab benachrichtigt sich selbst.
  setTimeout(() => listeners.forEach((l) => l()), 0);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) listeners.forEach((l) => l());
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  setTimeout(fn, 0);
  return () => {
    listeners.delete(fn);
  };
}

function toFamily(code: string, db: Db): Family | null {
  const f = db.families[code];
  if (!f) return null;
  const members = Object.entries(f.members).map(([id, m]) => ({ id, name: m.name, lastSeen: m.lastSeen }));
  members.sort((a, b) => a.name.localeCompare(b.name, "de"));
  return { code, members };
}

function toGame(id: string, db: Db): OnlineGame | null {
  const g = db.games[id];
  if (!g) return null;
  const { stateJson, ...rest } = g;
  return { ...rest, id, state: JSON.parse(stateJson) as WoerterState };
}

export class LocalBackend implements OnlineBackend {
  readonly kind = "local" as const;

  async signIn() {
    return "lokal";
  }

  async createFamily(founderName: string) {
    const db = read();
    let code = generateFamilyCode();
    while (db.families[code]) code = generateFamilyCode();
    const memberId = newId();
    db.families[code] = { code, members: { [memberId]: { name: founderName.trim(), lastSeen: Date.now() } } };
    write(db);
    return { code, memberId };
  }

  async getFamily(code: string) {
    return toFamily(normalizeFamilyCode(code), read());
  }

  async joinFamily(code: string, as: { memberId: string } | { name: string }) {
    const db = read();
    const f = db.families[normalizeFamilyCode(code)];
    if (!f) throw new Error("Diesen Familiencode gibt es nicht.");
    if ("memberId" in as) {
      if (f.members[as.memberId]) f.members[as.memberId]!.lastSeen = Date.now();
      write(db);
      return as.memberId;
    }
    const memberId = newId();
    f.members[memberId] = { name: as.name.trim(), lastSeen: Date.now() };
    write(db);
    return memberId;
  }

  watchFamily(code: string, onChange: (family: Family | null) => void) {
    const c = normalizeFamilyCode(code);
    return subscribe(() => onChange(toFamily(c, read())));
  }

  async touchPresence(code: string, memberId: string) {
    const db = read();
    const m = db.families[normalizeFamilyCode(code)]?.members[memberId];
    if (m) {
      m.lastSeen = Date.now();
      write(db);
    }
  }

  async createGame(code: string, state: WoerterState) {
    const db = read();
    const id = newId();
    db.games[id] = { id, familyCode: normalizeFamilyCode(code), ...gameFields(state), updatedAt: Date.now(), stateJson: JSON.stringify(state) };
    write(db);
    return id;
  }

  watchGames(code: string, memberId: string, onChange: (games: OnlineGame[]) => void) {
    const c = normalizeFamilyCode(code);
    return subscribe(() => {
      const db = read();
      const games = Object.keys(db.games)
        .map((id) => toGame(id, db))
        .filter((g): g is OnlineGame => !!g && g.familyCode === c && g.playerIds.includes(memberId));
      games.sort((a, b) => b.updatedAt - a.updatedAt);
      onChange(games);
    });
  }

  watchFamilyGames(code: string, onChange: (games: OnlineGame[]) => void) {
    const c = normalizeFamilyCode(code);
    return subscribe(() => {
      const db = read();
      onChange(Object.keys(db.games).map((id) => toGame(id, db)).filter((g): g is OnlineGame => !!g && g.familyCode === c));
    });
  }

  watchGame(_code: string, gameId: string, onChange: (game: OnlineGame | null) => void) {
    return subscribe(() => onChange(toGame(gameId, read())));
  }

  async submitMove(_code: string, gameId: string, expectedMoveCount: number, next: WoerterState) {
    const db = read();
    const g = db.games[gameId];
    if (!g || g.moveCount !== expectedMoveCount) return "conflict" as const;
    db.games[gameId] = { ...g, ...gameFields(next), updatedAt: Date.now(), stateJson: JSON.stringify(next) };
    write(db);
    return "ok" as const;
  }

  async deleteGame(_code: string, gameId: string) {
    const db = read();
    delete db.games[gameId];
    write(db);
  }
}
