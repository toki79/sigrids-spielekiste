import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from "react";
import { Animated, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  BOARD_SIZE,
  EMPTY,
  JOKER,
  LETTERS,
  RACK_SIZE,
  allowWord,
  cellAt,
  checkPlay,
  type Placement,
  type WoerterMove,
  type WoerterState,
} from "@spielestube/woerterei";
import { BigButton } from "../components/BigButton";
import { Board, BoardLegend, boardGeometry } from "../components/Board";
import { Draggable } from "../components/Draggable";
import { Dialog } from "../components/Dialog";
import { Scoreboard } from "../components/Scoreboard";
import { Tile } from "../components/Tile";
import { loadDictionary } from "../dictionary";
import { getGame } from "../game";
import { describeEntry, lastMoveEntry, points } from "../texts";
import { colors, font, radius, space } from "../theme";

interface Props {
  state: WoerterState;
  onMove: (next: WoerterState) => void;
  onMenu: () => void;
}

interface Pending {
  placement: Placement;
  rackIndex: number;
}

type Confirm = null | "aussetzen" | "menu" | "erlauben";

export function GameScreen({ state, onMove, onMenu }: Props) {
  const { width, height } = useWindowDimensions();
  const player = state.players[state.turn]!;

  const [rack, setRack] = useState<string[]>(player.rack);
  const [pending, setPending] = useState<Pending[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"legen" | "tauschen">("legen");
  const [exchange, setExchange] = useState<Set<number>>(new Set());
  const [jokerTarget, setJokerTarget] = useState<{ row: number; col: number; rackIndex: number } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [hint, setHint] = useState<string | null>(null);

  // Neuer Spieler oder neuer Zustand → Bank und Auswahl zurücksetzen
  useEffect(() => {
    setRack(player.rack);
    setPending([]);
    setSelected(null);
    setMode("legen");
    setExchange(new Set());
    setHint(null);
  }, [state.moveCount, player.id]);

  // Android-Zurück-Taste: nicht versehentlich die Partie verlassen
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setConfirm("menu");
      return true;
    });
    return () => sub.remove();
  }, []);

  const placements = pending.map((p) => p.placement);
  const usedIdx = new Set(pending.map((p) => p.rackIndex));

  // Live-Prüfung des geplanten Zuges (für Punktevorschau und verständliche Hinweise)
  const check = useMemo(
    () =>
      placements.length
        ? checkPlay(state.board, placements, { dictionary: loadDictionary(), extraWords: state.extraWords, rack: player.rack })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, player.id, JSON.stringify(placements)],
  );
  const evaluation = check?.evaluation;
  const unknownWords =
    check && !check.ok && check.code === "UNBEKANNTE_WOERTER" && check.evaluation
      ? [...new Set(check.evaluation.words.filter((w) => !w.valid).map((w) => w.word))]
      : [];

  const lastMoveCells = useMemo(() => {
    const e = lastMoveEntry(state);
    return new Set(e?.type === "legen" ? e.placements.map((p) => p.row * BOARD_SIZE + p.col) : []);
  }, [state]);

  // ---------- Bedienung ----------

  function onRackPress(i: number) {
    setHint(null);
    if (mode === "tauschen") {
      setExchange((prev) => {
        const next = new Set(prev);
        next.has(i) ? next.delete(i) : next.add(i);
        return next;
      });
      return;
    }
    setSelected((s) => (s === i ? null : i));
  }

  function onCellPress(row: number, col: number) {
    if (mode !== "legen") return;
    const existing = pending.findIndex((p) => p.placement.row === row && p.placement.col === col);
    if (existing >= 0) {
      // Eigenen, noch nicht bestätigten Stein zurück auf die Bank
      setPending((prev) => prev.filter((_, j) => j !== existing));
      setHint(null);
      return;
    }
    if (cellAt(state.board, row, col) !== EMPTY) {
      setHint("Auf diesem Feld liegt schon ein Buchstabe.");
      return;
    }
    if (selected === null) {
      setHint("Tippe zuerst unten einen Buchstaben auf deiner Bank an – dann das Feld. Oder ziehe den Buchstaben aufs Brett.");
      return;
    }
    placeFromRack(selected, row, col);
  }

  /** Stein von der Bank auf ein freies Feld legen (Joker: erst Buchstaben wählen). */
  function placeFromRack(rackIndex: number, row: number, col: number) {
    const tile = rack[rackIndex]!;
    setSelected(null);
    setHint(null);
    if (tile === JOKER) {
      setJokerTarget({ row, col, rackIndex });
      return;
    }
    setPending((prev) => [...prev, { placement: { row, col, letter: tile }, rackIndex }]);
  }

  // ---------- Ziehen (Drag & Drop) ----------

  type DragSource = { kind: "rack"; index: number } | { kind: "board"; row: number; col: number };
  interface Rect { x: number; y: number; w: number; h: number }

  type ViewRef = ComponentRef<typeof View>;
  const rootRef = useRef<ViewRef>(null);
  const boardRef = useRef<ViewRef>(null);
  const rackRef = useRef<ViewRef>(null);
  const rects = useRef<{ root?: Rect; board?: Rect; rack?: Rect }>({});
  const dragPos = useRef(new Animated.ValueXY()).current;
  const hoverRef = useRef<number | null>(null);
  const [drag, setDrag] = useState<{ source: DragSource; letter: string; joker: boolean } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  function measure(ref: RefObject<ViewRef | null>, key: "root" | "board" | "rack") {
    ref.current?.measureInWindow((x, y, w, h) => {
      rects.current[key] = { x, y, w, h };
    });
  }

  /** Welches Brettfeld liegt unter dem Finger? Nur freie Felder zählen. */
  function cellUnder(x: number, y: number, source: DragSource | null): number | null {
    const b = rects.current.board;
    if (!b) return null;
    const { gap, cell } = boardGeometry(boardSize);
    const col = Math.floor((x - b.x - gap / 2) / (cell + gap));
    const row = Math.floor((y - b.y - gap / 2) / (cell + gap));
    if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return null;
    if (cellAt(state.board, row, col) !== EMPTY) return null;
    const occupied = pending.some((p) => p.placement.row === row && p.placement.col === col);
    const ownCell = source?.kind === "board" && source.row === row && source.col === col;
    if (occupied && !ownCell) return null;
    return row * BOARD_SIZE + col;
  }

  function overRack(x: number, y: number): boolean {
    const r = rects.current.rack;
    return !!r && x >= r.x && x <= r.x + r.w && y >= r.y - 20 && y <= r.y + r.h + 20;
  }

  function setFloat(x: number, y: number) {
    const root = rects.current.root ?? { x: 0, y: 0 };
    dragPos.setValue({ x: x - root.x - rackTile / 2, y: y - root.y - rackTile * 0.9 });
  }

  function startDrag(source: DragSource, letter: string, joker: boolean, x: number, y: number) {
    measure(rootRef, "root");
    measure(boardRef, "board");
    measure(rackRef, "rack");
    setHint(null);
    setSelected(null);
    setFloat(x, y);
    setDrag({ source, letter, joker });
  }

  function moveDrag(x: number, y: number) {
    setFloat(x, y);
    const cell = cellUnder(x, y, drag?.source ?? null);
    if (cell !== hoverRef.current) {
      hoverRef.current = cell;
      setHover(cell);
    }
  }

  function endDrag(source: DragSource, x: number, y: number, completed: boolean) {
    hoverRef.current = null;
    setHover(null);
    setDrag(null);
    if (!completed) return;
    const target = cellUnder(x, y, source);
    if (target !== null) {
      const row = Math.floor(target / BOARD_SIZE);
      const col = target % BOARD_SIZE;
      if (source.kind === "rack") {
        placeFromRack(source.index, row, col);
      } else if (source.row !== row || source.col !== col) {
        // Neu gelegten Stein auf ein anderes Feld verschieben
        setPending((prev) =>
          prev.map((p) =>
            p.placement.row === source.row && p.placement.col === source.col ? { ...p, placement: { ...p.placement, row, col } } : p,
          ),
        );
      }
      return;
    }
    if (source.kind === "board" && overRack(x, y)) {
      // Zurück auf die Bank
      setPending((prev) => prev.filter((p) => !(p.placement.row === source.row && p.placement.col === source.col)));
    }
  }

  // Neu gelegte Steine auf dem Brett lassen sich ebenfalls ziehen
  const wrapPending = useCallback(
    (p: Placement, tile: ReactNode) => {
      const source: DragSource = { kind: "board", row: p.row, col: p.col };
      const dragging = drag?.source.kind === "board" && drag.source.row === p.row && drag.source.col === p.col;
      return (
        <Draggable
          onTap={() => {
            setPending((prev) => prev.filter((q) => !(q.placement.row === p.row && q.placement.col === p.col)));
            setHint(null);
          }}
          onStart={(x, y) => startDrag(source, p.letter, !!p.joker, x, y)}
          onMove={moveDrag}
          onEnd={(x, y, ok) => endDrag(source, x, y, ok)}
        >
          <View style={dragging ? styles.ghost : undefined}>{tile}</View>
        </Draggable>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drag, pending, state.board],
  );

  function chooseJokerLetter(letter: string) {
    if (!jokerTarget) return;
    const { row, col, rackIndex } = jokerTarget;
    setPending((prev) => [...prev, { placement: { row, col, letter, joker: true }, rackIndex }]);
    setJokerTarget(null);
    setSelected(null);
  }

  function takeBack() {
    setPending([]);
    setSelected(null);
    setHint(null);
  }

  function shuffleRack() {
    takeBack();
    setRack((r) => {
      const a = [...r];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    });
  }

  function commit(move: WoerterMove, base: WoerterState = state) {
    try {
      onMove(getGame().applyMove(base, player.id, move));
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Dieser Zug geht leider nicht.");
    }
  }

  function playAnyway() {
    let s = state;
    for (const w of unknownWords) s = allowWord(s, w);
    setConfirm(null);
    commit({ type: "legen", placements }, s);
  }

  // ---------- Darstellung ----------

  const landscape = width > height && width >= 700;
  const sidePanel = landscape ? Math.min(420, Math.max(320, width * 0.36)) : 0;
  const boardSize = landscape
    ? Math.min(height - 72, width - sidePanel - 36)
    : Math.min(width - 12, Math.max(300, height * 0.56));
  const panelWidth = landscape ? sidePanel : Math.min(width - 24, 640);
  const rackTile = Math.min(64, Math.floor((panelWidth - 6 * 8) / RACK_SIZE));

  let status: { text: string; kind: "info" | "ok" | "error" } | null = null;
  if (hint) status = { text: hint, kind: "error" };
  else if (mode === "tauschen") status = { text: "Tippe die Buchstaben an, die du zurück in den Beutel legen möchtest.", kind: "info" };
  else if (check?.ok && evaluation) {
    const words = evaluation.words.map((w) => `${w.word} (${w.score})`).join(", ");
    status = {
      text: `${words}${evaluation.allTilesBonus ? ` + ${evaluation.allTilesBonus} Bonus für alle Steine` : ""} = ${points(evaluation.score)}`,
      kind: "ok",
    };
  } else if (check && !check.ok) status = { text: check.message, kind: "error" };
  else {
    const last = describeEntry(state, lastMoveEntry(state));
    status = { text: last ?? "Lege das erste Wort über den Stern in der Mitte.", kind: "info" };
  }

  const panel = (
    <View style={[styles.panel, { width: panelWidth }]}>
      {landscape && <Text style={styles.turnTitle}>{player.name} ist dran</Text>}
      <Scoreboard state={state} horizontal={!landscape} />

      <View
        style={[styles.status, status.kind === "ok" && styles.statusOk, status.kind === "error" && styles.statusError]}
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.statusText}>{status.text}</Text>
      </View>

      <View ref={rackRef} style={styles.rack} accessibilityLabel="Deine Buchstaben">
        {rack.map((t, i) =>
          usedIdx.has(i) ? (
            <View key={i} style={[styles.rackGap, { width: rackTile, height: rackTile, borderRadius: rackTile * 0.12 }]} />
          ) : (
            <Draggable
              key={i}
              dragDisabled={mode !== "legen"}
              onTap={() => onRackPress(i)}
              onStart={(x, y) => startDrag({ kind: "rack", index: i }, t, t === JOKER, x, y)}
              onMove={moveDrag}
              onEnd={(x, y, ok) => endDrag({ kind: "rack", index: i }, x, y, ok)}
              accessibilityLabel={t === JOKER ? "Joker" : `Buchstabe ${t}`}
              selected={selected === i || exchange.has(i)}
            >
              <View
                style={[
                  (selected === i || exchange.has(i)) && styles.lifted,
                  drag?.source.kind === "rack" && drag.source.index === i && styles.ghost,
                ]}
              >
                <Tile letter={t} joker={t === JOKER} size={rackTile} selected={selected === i || exchange.has(i)} />
              </View>
            </Draggable>
          ),
        )}
      </View>

      {mode === "legen" ? (
        <View style={styles.buttons}>
          <BigButton
            testID="legen"
            label={check?.ok && evaluation ? `Zug legen – ${points(evaluation.score)}` : "Zug legen"}
            disabled={!check?.ok}
            onPress={() => commit({ type: "legen", placements })}
            style={styles.full}
          />
          {unknownWords.length > 0 && (
            <BigButton label="Wort trotzdem gelten lassen …" variant="secondary" compact onPress={() => setConfirm("erlauben")} style={styles.full} />
          )}
          {pending.length > 0 ? (
            <BigButton label="Steine zurücknehmen" variant="secondary" compact onPress={takeBack} style={styles.half} />
          ) : (
            <BigButton label="Mischen" variant="secondary" compact onPress={shuffleRack} style={styles.half} />
          )}
          <BigButton
            label="Tauschen"
            variant="secondary"
            compact
            disabled={state.bag.length < RACK_SIZE}
            onPress={() => {
              takeBack();
              setMode("tauschen");
            }}
            style={styles.half}
          />
          <BigButton label="Aussetzen" variant="secondary" compact onPress={() => setConfirm("aussetzen")} style={styles.half} />
          <BigButton label="Menü" variant="secondary" compact onPress={() => setConfirm("menu")} style={styles.half} />
        </View>
      ) : (
        <View style={styles.buttons}>
          <BigButton
            label={exchange.size ? `${exchange.size === 1 ? "1 Buchstaben" : `${exchange.size} Buchstaben`} tauschen` : "Buchstaben auswählen"}
            disabled={exchange.size === 0}
            onPress={() => commit({ type: "tauschen", tiles: [...exchange].map((i) => rack[i]!) })}
            style={styles.full}
          />
          <BigButton
            label="Abbrechen"
            variant="secondary"
            onPress={() => {
              setMode("legen");
              setExchange(new Set());
            }}
            style={styles.full}
          />
        </View>
      )}
    </View>
  );

  return (
    <>
      <View ref={rootRef} style={styles.root}>
      <ScrollView scrollEnabled={!drag} contentContainerStyle={[styles.wrap, landscape && styles.wrapLandscape]}>
        {!landscape && <Text style={styles.turnTitle}>{player.name} ist dran</Text>}
        <View>
          <Board
            ref={boardRef}
            board={state.board}
            pending={placements}
            lastMove={lastMoveCells}
            size={boardSize}
            onCellPress={onCellPress}
            hover={hover}
            wrapPending={wrapPending}
          />
          <BoardLegend />
        </View>
        {panel}
      </ScrollView>
      {drag && (
        <Animated.View pointerEvents="none" style={[styles.float, { transform: dragPos.getTranslateTransform() }]}>
          <Tile letter={drag.letter} joker={drag.joker} size={rackTile} fresh />
        </Animated.View>
      )}
      </View>

      <Dialog
        visible={jokerTarget !== null}
        title="Joker"
        message="Welchen Buchstaben soll der Joker darstellen? Er zählt 0 Punkte."
        onCancel={() => setJokerTarget(null)}
      >
        <View style={styles.letterGrid}>
          {[...LETTERS].map((l) => (
            <Pressable key={l} onPress={() => chooseJokerLetter(l)} accessibilityRole="button" accessibilityLabel={`Buchstabe ${l}`}>
              <Tile letter={l} joker size={52} />
            </Pressable>
          ))}
        </View>
      </Dialog>

      <Dialog
        visible={confirm === "aussetzen"}
        title="Aussetzen?"
        message={`${player.name} legt in dieser Runde nichts und gibt an den Nächsten weiter.`}
        confirmLabel="Ja, aussetzen"
        onConfirm={() => {
          setConfirm(null);
          commit({ type: "aussetzen" });
        }}
        onCancel={() => setConfirm(null)}
      />

      <Dialog
        visible={confirm === "menu"}
        title="Zum Hauptmenü?"
        message="Die Partie wird gespeichert. Ihr könnt sie später im Hauptmenü fortsetzen."
        confirmLabel="Zum Hauptmenü"
        onConfirm={() => {
          setConfirm(null);
          onMenu();
        }}
        onCancel={() => setConfirm(null)}
      />

      <Dialog
        visible={confirm === "erlauben"}
        title="Wort gelten lassen?"
        message={`${unknownWords.map((w) => `„${w}“`).join(", ")} steht nicht in unserem Wörterbuch. Sind alle Mitspieler einverstanden, dass es in dieser Partie gilt?`}
        confirmLabel="Ja, alle sind einverstanden"
        onConfirm={playAnyway}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  float: { position: "absolute", left: 0, top: 0, opacity: 0.92, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  ghost: { opacity: 0.25 },
  wrap: { padding: 6, paddingBottom: space.xl, gap: space.m, alignItems: "center" },
  wrapLandscape: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", padding: 12, gap: 18 },
  turnTitle: { fontSize: font.title, fontWeight: "800", color: colors.primary, textAlign: "center" },
  panel: { gap: space.m },
  status: {
    backgroundColor: colors.messageBg,
    borderColor: colors.messageBorder,
    borderWidth: 2,
    borderRadius: radius,
    padding: space.m,
    minHeight: 64,
    justifyContent: "center",
  },
  statusOk: { backgroundColor: colors.okBg, borderColor: "#7CC495" },
  statusError: { backgroundColor: colors.errorBg, borderColor: "#E79A93" },
  statusText: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.35, fontWeight: "600" },
  rack: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E4DED0",
    borderRadius: radius,
    paddingVertical: space.m,
    paddingHorizontal: space.s,
  },
  rackGap: { borderWidth: 2, borderColor: "#C9C1AE", borderStyle: "dashed" },
  lifted: { transform: [{ translateY: -6 }] },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: space.s },
  full: { flexBasis: "100%", flexGrow: 1 },
  half: { flexBasis: "45%", flexGrow: 1 },
  letterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
});
