import { rankMembers, type RankedMember, type RecordLine } from "@spielestube/core";
import { result, type RommeState } from "./game";

/** Rangliste und Rekorde über alle beendeten Rommé-Partien. */
export function computeRommeStats(games: readonly RommeState[]): { ranking: RankedMember[]; records: RecordLine[]; finishedGames: number } {
  const finished = games.filter((g) => g.status === "beendet");
  const ranking = rankMembers(finished.map((g) => ({ players: g.players, winners: result(g).winners })));
  const records: RecordLine[] = [];

  let bestMove: { name: string; count: number } | null = null;
  let fastest: { name: string; moves: number } | null = null;
  for (const g of finished) {
    for (const h of g.history) {
      if (h.type === "legen" && (!bestMove || h.tiles.length > bestMove.count)) {
        bestMove = { name: g.players.find((p) => p.id === h.playerId)?.name ?? "", count: h.tiles.length };
      }
    }
    const end = g.history.at(-1);
    if (end?.type === "ende" && end.reason === "ausgespielt") {
      const winner = result(g).winners[0];
      const moves = g.history.filter((h) => h.type !== "ende" && h.playerId === winner).length;
      const name = g.players.find((p) => p.id === winner)?.name ?? "";
      if (!fastest || moves < fastest.moves) fastest = { name, moves };
    }
  }
  if (bestMove) records.push({ icon: "🏆", label: "Meiste Steine in einem Zug", name: bestMove.name, text: `mit ${bestMove.count} Steinen` });
  if (fastest) records.push({ icon: "⚡", label: "Schnellster Sieg", name: fastest.name, text: `nach ${fastest.moves} Zügen` });
  records.push({ icon: "🎲", label: "Beendete Partien insgesamt", text: String(finished.length) });
  return { ranking, records, finishedGames: finished.length };
}
