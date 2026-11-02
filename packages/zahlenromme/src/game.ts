/**
 * Spielablauf Zahlen-Rommé.
 *
 * Ein Zug ist entweder
 *  - „legen“: der Spieler schickt die komplette neue Tischbelegung (alle Reihen).
 *    Geprüft wird: nur eigene Steine dazugekommen, mindestens einer, keine
 *    Tischsteine auf die Bank genommen, alle Reihen gültig, beim ersten
 *    Auslegen ≥ 30 Punkte nur aus eigenen Steinen und ohne Umlegen.
 *  - „ziehen“: einen Stein aus dem Vorrat nehmen (ist er leer: aussetzen).
 *
 * Ende: Wer seine letzten Steine ablegt, gewinnt. Ist der Vorrat leer und
 * setzen alle nacheinander aus, gewinnt, wer die wenigsten Strafpunkte hat.
 */
import {
  InvalidMoveError,
  createRandom,
  rankStandings,
  shuffled,
  type GameModule,
  type GameResult,
  type MoveCheck,
  type PlayerId,
  type PlayerInfo,
} from "@spielestube/core";
import { analyzeSet } from "./sets";
import { INITIAL_MELD, RACK_START, allTileIds, rackPenalty, type TileId } from "./tiles";

export interface RommePlayer {
  id: PlayerId;
  name: string;
  rack: TileId[];
  /** Punkte (erst am Spielende gesetzt: Gewinner +, Verlierer −). */
  score: number;
  /** Hat schon zum ersten Mal ausgelegt (≥ 30 Punkte)? */
  melded: boolean;
}

export type RommeMove = { type: "legen"; table: TileId[][] } | { type: "ziehen" };

export type RommeHistoryEntry =
  | { type: "legen"; playerId: PlayerId; tiles: TileId[]; initial: boolean; value: number }
  | { type: "ziehen"; playerId: PlayerId }
  | { type: "aussetzen"; playerId: PlayerId }
  | { type: "ende"; reason: "ausgespielt" | "keine_zuege"; adjustments: { playerId: PlayerId; points: number }[] };

export interface RommeState {
  game: "zahlenromme";
  version: 1;
  seed: number;
  pool: TileId[];
  /** Reihen auf dem Tisch. */
  table: TileId[][];
  players: RommePlayer[];
  turn: number;
  moveCount: number;
  /** Aussetzen in Folge bei leerem Vorrat. */
  passes: number;
  history: RommeHistoryEntry[];
  status: "laeuft" | "beendet";
  endReason: "ausgespielt" | "keine_zuege" | null;
}

export type RommeCheckDetails = { type: "legen"; played: TileId[]; value: number; initial: boolean } | { type: "ziehen" };

export function createZahlenromme(): GameModule<RommeState, RommeMove, Record<string, never>, RommeCheckDetails> {
  return {
    id: "zahlenromme",
    title: "Zahlen-Rommé",
    minPlayers: 2,
    maxPlayers: 4,
    createGame: (players, seed) => createGame(players, seed),
    currentPlayer,
    checkMove,
    applyMove,
    isOver: (s) => s.status === "beendet",
    result,
  };
}

export function createGame(players: PlayerInfo[], seed: number): RommeState {
  if (players.length < 2 || players.length > 4) throw new Error("Zahlen-Rommé ist für 2 bis 4 Spieler.");
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new Error("Spieler doppelt angegeben.");
  const random = createRandom(seed);
  const pool = shuffled(allTileIds(), random);
  const ps: RommePlayer[] = players.map((p) => ({ id: p.id, name: p.name, rack: pool.splice(-RACK_START), score: 0, melded: false }));
  return {
    game: "zahlenromme",
    version: 1,
    seed,
    pool,
    table: [],
    players: ps,
    turn: Math.floor(random() * players.length),
    moveCount: 0,
    passes: 0,
    history: [],
    status: "laeuft",
    endReason: null,
  };
}

export function currentPlayer(state: RommeState): PlayerId | null {
  return state.status === "laeuft" ? (state.players[state.turn]?.id ?? null) : null;
}

export function playersToAct(state: RommeState): PlayerId[] {
  const id = currentPlayer(state);
  return id ? [id] : [];
}

const key = (set: readonly TileId[]) => [...set].sort((a, b) => a - b).join(",");

function fail(code: string, message: string): MoveCheck<RommeCheckDetails> {
  return { ok: false, code, message };
}

export function checkMove(state: RommeState, playerId: PlayerId, move: RommeMove): MoveCheck<RommeCheckDetails> {
  if (state.status !== "laeuft") return fail("BEENDET", "Diese Partie ist schon beendet.");
  if (currentPlayer(state) !== playerId) return fail("NICHT_DRAN", "Du bist gerade nicht an der Reihe.");
  const player = state.players[state.turn]!;

  if (move.type === "ziehen") return { ok: true, details: { type: "ziehen" } };
  if (move.type !== "legen" || !Array.isArray(move.table)) return fail("UNBEKANNT", "Unbekannter Spielzug.");

  const newTable = move.table.filter((s) => s.length > 0);
  const oldTiles = state.table.flat();
  const newTiles = newTable.flat();
  if (new Set(newTiles).size !== newTiles.length) return fail("DOPPELT", "Ein Stein liegt doppelt auf dem Tisch.");

  const newSet = new Set(newTiles);
  if (!oldTiles.every((id) => newSet.has(id))) {
    return fail("TISCHSTEIN_GENOMMEN", "Steine vom Tisch dürfen nicht zurück auf die Bank. Bitte lege sie in eine Reihe.");
  }
  const oldSet = new Set(oldTiles);
  const played = newTiles.filter((id) => !oldSet.has(id));
  const rack = new Set(player.rack);
  if (!played.every((id) => rack.has(id))) return fail("NICHT_AUF_BANK", "Diese Steine hast du nicht auf deiner Bank.");
  if (played.length === 0) return fail("NICHTS_GELEGT", "Lege mindestens einen eigenen Stein – oder ziehe einen Stein.");

  for (const set of newTable) {
    const a = analyzeSet(set);
    if (!a.valid) return fail("UNGUELTIGE_REIHE", `Mindestens eine Reihe ist noch nicht richtig. ${a.reason}`);
  }

  if (!player.melded) {
    // Erstes Auslegen: vorhandene Reihen bleiben unverändert, neue Reihen nur aus eigenen Steinen
    const oldKeys = new Map<string, number>();
    for (const s of state.table) oldKeys.set(key(s), (oldKeys.get(key(s)) ?? 0) + 1);
    let value = 0;
    for (const s of newTable) {
      const k = key(s);
      const left = oldKeys.get(k) ?? 0;
      if (left > 0) {
        oldKeys.set(k, left - 1);
        continue;
      }
      if (!s.every((id) => rack.has(id))) {
        return fail("ERSTES_AUSLEGEN_UMLEGEN", "Beim ersten Auslegen darfst du nur eigene Steine in neue Reihen legen – noch nichts am Tisch verändern.");
      }
      const a = analyzeSet(s);
      value += a.valid ? a.value : 0;
    }
    if ([...oldKeys.values()].some((v) => v > 0)) {
      return fail("ERSTES_AUSLEGEN_UMLEGEN", "Beim ersten Auslegen darfst du nur eigene Steine in neue Reihen legen – noch nichts am Tisch verändern.");
    }
    if (value < INITIAL_MELD) {
      return fail("ZU_WENIG", `Beim ersten Auslegen brauchst du mindestens ${INITIAL_MELD} Punkte. Bisher sind es ${value}.`);
    }
    return { ok: true, details: { type: "legen", played, value, initial: true } };
  }

  return { ok: true, details: { type: "legen", played, value: 0, initial: false } };
}

export function applyMove(state: RommeState, playerId: PlayerId, move: RommeMove): RommeState {
  const check = checkMove(state, playerId, move);
  if (!check.ok) throw new InvalidMoveError(check.message, check.code);
  const next: RommeState = JSON.parse(JSON.stringify(state));
  const player = next.players[next.turn]!;
  next.moveCount += 1;

  if (check.details.type === "legen" && move.type === "legen") {
    const played = new Set(check.details.played);
    next.table = move.table.filter((s) => s.length > 0).map((s) => [...s]);
    player.rack = player.rack.filter((id) => !played.has(id));
    if (check.details.initial) player.melded = true;
    next.passes = 0;
    next.history.push({ type: "legen", playerId, tiles: check.details.played, initial: check.details.initial, value: check.details.value });
    if (player.rack.length === 0) return finish(next, "ausgespielt", playerId);
  } else if (next.pool.length > 0) {
    player.rack.push(next.pool.pop()!);
    next.passes = 0;
    next.history.push({ type: "ziehen", playerId });
  } else {
    next.passes += 1;
    next.history.push({ type: "aussetzen", playerId });
    if (next.passes >= next.players.length) return finish(next, "keine_zuege", null);
  }

  next.turn = (next.turn + 1) % next.players.length;
  return next;
}

/**
 * Abrechnung: Jeder verliert die Werte seiner Reststeine (Joker 30).
 * Der Gewinner bekommt die Summe der anderen gutgeschrieben.
 * Ohne Ausspielen gewinnt, wer die wenigsten Strafpunkte hat.
 */
function finish(state: RommeState, reason: "ausgespielt" | "keine_zuege", finisher: PlayerId | null): RommeState {
  const penalties = state.players.map((p) => ({ id: p.id, pen: rackPenalty(p.rack) }));
  const min = Math.min(...penalties.map((p) => p.pen));
  const winners = finisher ? [finisher] : penalties.filter((p) => p.pen === min).map((p) => p.id);
  const adjustments = state.players.map((p) => {
    const own = penalties.find((x) => x.id === p.id)!.pen;
    if (winners.includes(p.id)) {
      const others = penalties.filter((x) => !winners.includes(x.id)).reduce((s, x) => s + x.pen, 0);
      return { playerId: p.id, points: Math.round(others / winners.length) - (finisher ? 0 : own) };
    }
    return { playerId: p.id, points: -own };
  });
  for (const a of adjustments) state.players.find((p) => p.id === a.playerId)!.score += a.points;
  state.history.push({ type: "ende", reason, adjustments });
  state.status = "beendet";
  state.endReason = reason;
  return state;
}

export function result(state: RommeState): GameResult {
  return rankStandings(state.players.map((p) => ({ playerId: p.id, score: p.score })));
}
