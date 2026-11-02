import type { HistoryEntry, WoerterState } from "@spielestube/woerterei";

export function playerName(state: WoerterState, id: string): string {
  return state.players.find((p) => p.id === id)?.name ?? "Jemand";
}

/** Verständliche Beschreibung eines Zuges, z. B. „Sigrid hat HAUS gelegt – 10 Punkte.“ */
export function describeEntry(state: WoerterState, entry: HistoryEntry | undefined): string | null {
  if (!entry) return null;
  switch (entry.type) {
    case "legen": {
      const words = entry.words.map((w) => w.word).join(", ");
      const points = entry.score === 1 ? "1\u00A0Punkt" : `${entry.score}\u00A0Punkte`;
      return `${playerName(state, entry.playerId)} hat ${words} gelegt – ${points}.`;
    }
    case "tauschen":
      return `${playerName(state, entry.playerId)} hat ${entry.count === 1 ? "einen Buchstaben" : `${entry.count} Buchstaben`} getauscht.`;
    case "aussetzen":
      return `${playerName(state, entry.playerId)} hat ausgesetzt.`;
    case "ende":
      return entry.reason === "ausgespielt" ? "Die Buchstaben sind aufgebraucht – die Partie ist zu Ende." : "Keiner konnte mehr legen – die Partie ist zu Ende.";
  }
}

export function lastMoveEntry(state: WoerterState): HistoryEntry | undefined {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = state.history[i]!;
    if (e.type !== "ende") return e;
  }
  return undefined;
}

export function points(n: number): string {
  return n === 1 || n === -1 ? `${n}\u00A0Punkt` : `${n}\u00A0Punkte`;
}
