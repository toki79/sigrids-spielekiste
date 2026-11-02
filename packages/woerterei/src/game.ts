/**
 * Spielablauf der Wörterei: Partie anlegen, Züge ausführen, Spielende, Wertung.
 * Der Zustand ist reines JSON und wird nie verändert – jeder Zug liefert einen neuen.
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
import { emptyBoard } from "./board";
import type { Dictionary } from "./dictionary";
import { checkPlay, removeFromRack, tilesUsed, type Placement, type PlayEvaluation } from "./rules";
import { JOKER, RACK_SIZE, fullBag, isLetter, rackValue } from "./tiles";

export interface WoerterPlayer {
  id: PlayerId;
  name: string;
  rack: string[];
  score: number;
}

export type WoerterMove =
  | { type: "legen"; placements: Placement[] }
  | { type: "tauschen"; tiles: string[] }
  | { type: "aussetzen" }
  /** Wort(e), die nicht im Wörterbuch stehen, den Mitspielern zur Abstimmung vorlegen. */
  | { type: "wort_anfragen"; placements: Placement[] }
  /** Mitspieler stimmt über die Anfrage ab (darf auch, wenn er nicht dran ist). */
  | { type: "abstimmen"; accept: boolean }
  /** Wer gefragt hat, nimmt die Anfrage zurück. */
  | { type: "anfrage_zurueckziehen" };

/** Offene Anfrage: Diese Wörter sollen gelten, obwohl sie nicht im Wörterbuch stehen. */
export interface WordRequest {
  playerId: PlayerId;
  placements: Placement[];
  words: string[];
  /** Stimme je Mitspieler: true = einverstanden, null = noch offen. (Ein Nein beendet die Anfrage sofort.) */
  votes: Record<PlayerId, boolean | null>;
}

export type HistoryEntry =
  | { type: "legen"; playerId: PlayerId; placements: Placement[]; words: { word: string; score: number }[]; score: number }
  | { type: "tauschen"; playerId: PlayerId; count: number }
  | { type: "aussetzen"; playerId: PlayerId }
  | { type: "anfrage"; playerId: PlayerId; words: string[] }
  | { type: "abstimmung"; playerId: PlayerId; accept: boolean; words: string[] }
  | { type: "ende"; reason: EndReason; adjustments: { playerId: PlayerId; points: number }[] };

export type EndReason = "ausgespielt" | "keine_zuege";

export interface WoerterOptions {
  /** Nach wie vielen punktlosen Zügen in Folge (je Spieler) die Partie endet. */
  scorelessRoundsToEnd: number;
}

export interface WoerterState {
  game: "woerterei";
  version: 1;
  seed: number;
  board: string;
  bag: string[];
  players: WoerterPlayer[];
  /** Index des Spielers, der am Zug ist. */
  turn: number;
  moveCount: number;
  scorelessTurns: number;
  extraWords: string[];
  history: HistoryEntry[];
  status: "laeuft" | "beendet";
  endReason: EndReason | null;
  options: WoerterOptions;
  /** Offene Wort-Anfrage (fehlt bei älteren Spielständen = keine Anfrage). */
  wordRequest?: WordRequest | null;
}

export type WoerterCheckDetails =
  | { type: "legen"; evaluation: PlayEvaluation }
  | { type: "tauschen" }
  | { type: "aussetzen" }
  | { type: "wort_anfragen"; words: string[] }
  | { type: "abstimmen" }
  | { type: "anfrage_zurueckziehen" };

const DEFAULT_OPTIONS: WoerterOptions = { scorelessRoundsToEnd: 2 };

export function createWoerterei(dictionary: Dictionary): GameModule<WoerterState, WoerterMove, WoerterOptions, WoerterCheckDetails> {
  return {
    id: "woerterei",
    title: "Wörterei",
    minPlayers: 2,
    maxPlayers: 4,
    createGame: (players, seed, options) => createGame(players, seed, options),
    currentPlayer,
    checkMove: (state, playerId, move) => checkMove(state, playerId, move, dictionary),
    applyMove: (state, playerId, move) => applyMove(state, playerId, move, dictionary),
    isOver: (state) => state.status === "beendet",
    result,
  };
}

export function createGame(players: PlayerInfo[], seed: number, options?: Partial<WoerterOptions>): WoerterState {
  if (players.length < 2 || players.length > 4) throw new Error("Wörterei ist für 2 bis 4 Spieler.");
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new Error("Spieler doppelt angegeben.");
  const random = createRandom(seed);
  const bag = shuffled(fullBag(), random);
  const ps: WoerterPlayer[] = players.map((p) => ({ id: p.id, name: p.name, rack: bag.splice(-RACK_SIZE), score: 0 }));
  return {
    game: "woerterei",
    version: 1,
    seed,
    board: emptyBoard(),
    bag,
    players: ps,
    turn: Math.floor(random() * players.length),
    moveCount: 0,
    scorelessTurns: 0,
    extraWords: [],
    history: [],
    status: "laeuft",
    endReason: null,
    options: { ...DEFAULT_OPTIONS, ...options },
    wordRequest: null,
  };
}

export function currentPlayer(state: WoerterState): PlayerId | null {
  return state.status === "laeuft" ? (state.players[state.turn]?.id ?? null) : null;
}

/**
 * Wer muss gerade etwas tun? Normalerweise der Spieler am Zug –
 * bei einer offenen Wort-Anfrage die Mitspieler, die noch nicht abgestimmt haben.
 */
export function playersToAct(state: WoerterState): PlayerId[] {
  if (state.status !== "laeuft") return [];
  const req = state.wordRequest;
  if (req) return Object.entries(req.votes).filter(([, v]) => v === null).map(([id]) => id);
  const id = currentPlayer(state);
  return id ? [id] : [];
}

export function checkMove(
  state: WoerterState,
  playerId: PlayerId,
  move: WoerterMove,
  dictionary: Dictionary,
): MoveCheck<WoerterCheckDetails> {
  if (state.status !== "laeuft") return { ok: false, code: "BEENDET", message: "Diese Partie ist schon beendet." };
  const req = state.wordRequest ?? null;

  // Abstimmen dürfen die Mitspieler – unabhängig davon, wer am Zug ist.
  if (move.type === "abstimmen") {
    if (!req) return { ok: false, code: "KEINE_ANFRAGE", message: "Es gibt gerade kein Wort, über das abgestimmt wird." };
    if (!(playerId in req.votes)) return { ok: false, code: "NICHT_STIMMBERECHTIGT", message: "Über dein eigenes Wort stimmen die anderen ab." };
    if (req.votes[playerId] !== null) return { ok: false, code: "SCHON_ABGESTIMMT", message: "Du hast schon abgestimmt." };
    return { ok: true, details: { type: "abstimmen" } };
  }

  if (currentPlayer(state) !== playerId) {
    return { ok: false, code: "NICHT_DRAN", message: "Du bist gerade nicht an der Reihe." };
  }
  const player = state.players[state.turn]!;

  if (move.type === "anfrage_zurueckziehen") {
    return req ? { ok: true, details: { type: "anfrage_zurueckziehen" } } : { ok: false, code: "KEINE_ANFRAGE", message: "Es gibt keine offene Anfrage." };
  }
  if (req) {
    return { ok: false, code: "ANFRAGE_OFFEN", message: "Erst müssen die anderen über dein Wort entscheiden." };
  }

  switch (move.type) {
    case "wort_anfragen": {
      const check = checkPlay(state.board, move.placements, { dictionary, extraWords: state.extraWords, rack: player.rack });
      if (check.ok) {
        return { ok: false, code: "ALLES_BEKANNT", message: "Alle Wörter stehen im Wörterbuch – du kannst den Zug direkt legen." };
      }
      if (check.code !== "UNBEKANNTE_WOERTER" || !check.evaluation) return check;
      const words = [...new Set(check.evaluation.words.filter((w) => !w.valid).map((w) => w.word))];
      return { ok: true, details: { type: "wort_anfragen", words } };
    }
    case "legen": {
      const check = checkPlay(state.board, move.placements, { dictionary, extraWords: state.extraWords, rack: player.rack });
      return check.ok ? { ok: true, details: { type: "legen", evaluation: check.evaluation } } : check;
    }
    case "tauschen": {
      if (move.tiles.length === 0) {
        return { ok: false, code: "NICHTS_GEWAEHLT", message: "Bitte wähle die Buchstaben aus, die du tauschen möchtest." };
      }
      if (state.bag.length < RACK_SIZE) {
        return { ok: false, code: "BEUTEL_LEER", message: "Im Beutel sind nicht mehr genug Buchstaben zum Tauschen." };
      }
      if (!move.tiles.every((t) => isLetter(t) || t === JOKER) || !removeFromRack(player.rack, move.tiles)) {
        return { ok: false, code: "NICHT_AUF_BANK", message: "Diese Buchstaben hast du nicht auf deiner Bank." };
      }
      return { ok: true, details: { type: "tauschen" } };
    }
    case "aussetzen":
      return { ok: true, details: { type: "aussetzen" } };
    default:
      return { ok: false, code: "UNBEKANNT", message: "Unbekannter Spielzug." };
  }
}

export function applyMove(state: WoerterState, playerId: PlayerId, move: WoerterMove, dictionary: Dictionary): WoerterState {
  const check = checkMove(state, playerId, move, dictionary);
  if (!check.ok) throw new InvalidMoveError(check.message, check.code);

  // JSON-Kopie statt structuredClone: läuft auf allen JavaScript-Engines (auch Hermes auf Android).
  const next: WoerterState = JSON.parse(JSON.stringify(state));
  const player = next.players[next.turn]!;
  next.moveCount += 1;

  // --- Wort-Abstimmung: ändert weder Brett noch Reihenfolge ---
  if (check.details.type === "wort_anfragen" && move.type === "wort_anfragen") {
    const votes: Record<PlayerId, boolean | null> = {};
    for (const p of next.players) if (p.id !== playerId) votes[p.id] = null;
    next.wordRequest = { playerId, placements: move.placements.map((p) => ({ ...p })), words: check.details.words, votes };
    next.history.push({ type: "anfrage", playerId, words: check.details.words });
    return next;
  }
  if (move.type === "anfrage_zurueckziehen") {
    next.wordRequest = null;
    return next;
  }
  if (move.type === "abstimmen") {
    const req = next.wordRequest!;
    next.history.push({ type: "abstimmung", playerId, accept: move.accept, words: req.words });
    if (!move.accept) {
      // Ein Nein genügt: Anfrage beendet, der Spieler ist weiter dran.
      next.wordRequest = null;
      return next;
    }
    req.votes[playerId] = true;
    if (Object.values(req.votes).every((v) => v === true)) {
      // Alle einverstanden: Wörter gelten in dieser Partie, der Zug wird gelegt.
      next.wordRequest = null;
      for (const w of req.words) if (!next.extraWords.includes(w)) next.extraWords.push(w);
      return applyMove(next, req.playerId, { type: "legen", placements: req.placements }, dictionary);
    }
    return next;
  }

  if (check.details.type === "legen" && move.type === "legen") {
    const { evaluation } = check.details;
    player.rack = removeFromRack(player.rack, tilesUsed(move.placements))!;
    player.rack.push(...draw(next.bag, RACK_SIZE - player.rack.length));
    player.score += evaluation.score;
    next.board = evaluation.board;
    next.scorelessTurns = evaluation.score > 0 ? 0 : next.scorelessTurns + 1;
    next.history.push({
      type: "legen",
      playerId,
      placements: move.placements.map((p) => ({ ...p })),
      words: evaluation.words.map((w) => ({ word: w.word, score: w.score })),
      score: evaluation.score,
    });
    if (player.rack.length === 0 && next.bag.length === 0) return finish(next, "ausgespielt", playerId);
  } else if (move.type === "tauschen") {
    const rest = removeFromRack(player.rack, move.tiles)!;
    const drawn = draw(next.bag, move.tiles.length);
    // Getauschte Steine zurück in den Beutel und neu mischen (reproduzierbar über seed + Zugnummer).
    next.bag = shuffled([...next.bag, ...move.tiles], createRandom(next.seed + next.moveCount * 7919));
    player.rack = [...rest, ...drawn];
    next.scorelessTurns += 1;
    next.history.push({ type: "tauschen", playerId, count: move.tiles.length });
  } else {
    next.scorelessTurns += 1;
    next.history.push({ type: "aussetzen", playerId });
  }

  if (next.scorelessTurns >= next.options.scorelessRoundsToEnd * next.players.length) {
    return finish(next, "keine_zuege", null);
  }

  next.turn = (next.turn + 1) % next.players.length;
  return next;
}

/** Ein Wort für diese Partie zusätzlich erlauben (wenn alle Mitspieler zugestimmt haben). */
export function allowWord(state: WoerterState, word: string): WoerterState {
  const w = word.toUpperCase();
  if (state.extraWords.includes(w)) return state;
  return { ...state, extraWords: [...state.extraWords, w] };
}

export function result(state: WoerterState): GameResult {
  return rankStandings(state.players.map((p) => ({ playerId: p.id, score: p.score })));
}

function draw(bag: string[], count: number): string[] {
  return count > 0 ? bag.splice(-Math.min(count, bag.length)).reverse() : [];
}

/**
 * Endabrechnung: Jeder verliert die Punkte seiner Reststeine.
 * Wer ausgespielt hat, bekommt die Reststeine aller anderen gutgeschrieben.
 */
function finish(state: WoerterState, reason: EndReason, finisher: PlayerId | null): WoerterState {
  const adjustments = state.players.map((p) => ({ playerId: p.id, points: -rackValue(p.rack) }));
  if (finisher) {
    const bonus = adjustments.reduce((s, a) => s - a.points, 0);
    const own = adjustments.find((a) => a.playerId === finisher)!;
    own.points += bonus;
  }
  for (const a of adjustments) state.players.find((p) => p.id === a.playerId)!.score += a.points;
  state.history.push({ type: "ende", reason, adjustments });
  state.status = "beendet";
  state.endReason = reason;
  return state;
}
