import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Animated, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  INITIAL_MELD,
  analyzeSet,
  checkMove,
  createZahlenromme,
  sortByColor,
  sortByNumber,
  type RommeState,
  type TileId,
} from "@spielestube/zahlenromme";
import { BigButton } from "../components/BigButton";
import { Dialog } from "../components/Dialog";
import { Draggable } from "../components/Draggable";
import { RommeTile } from "../components/RommeTile";
import { gameOf } from "../games/registry";
import { colors, font, radius, space } from "../theme";

interface Props {
  state: RommeState;
  onMove: (next: RommeState) => void;
  onMenu: () => void;
  /** Online: wer schaut auf dieses Gerät? */
  viewerId?: string;
  onlineIds?: ReadonlySet<string>;
  busy?: boolean;
}

const spiel = createZahlenromme();
type ViewRef = ComponentRef<typeof View>;
interface Rect { x: number; y: number; w: number; h: number }
type DropTarget = { kind: "set"; index: number } | { kind: "neu" } | { kind: "bank" } | null;

/** Spielbildschirm Zahlen-Rommé: Tisch mit Reihen, eigene Bank, Antippen oder Ziehen. */
export function RommeScreen({ state, onMove, onMenu, viewerId, onlineIds, busy }: Props) {
  const { width, height } = useWindowDimensions();
  const current = state.players[state.turn]!;
  const me = (viewerId && state.players.find((p) => p.id === viewerId)) || current;
  const myTurn = state.status === "laeuft" && current.id === me.id;
  const online = !!viewerId;
  const info = gameOf(state);

  // Arbeitskopie des Zuges
  const [table, setTable] = useState<TileId[][]>(state.table);
  const [rack, setRack] = useState<TileId[]>(me.rack);
  const [selected, setSelected] = useState<Set<TileId>>(new Set());
  const [hint, setHint] = useState<string | null>(null);
  const [confirmMenu, setConfirmMenu] = useState(false);

  useEffect(() => {
    setTable(state.table.map((s) => [...s]));
    setRack(sortByColor(me.rack));
    setSelected(new Set());
    setHint(null);
  }, [state.moveCount, me.id]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (online) onMenu();
      else setConfirmMenu(true);
      return true;
    });
    return () => sub.remove();
  }, [online, onMenu]);

  const ownTiles = useMemo(() => new Set(me.rack), [me.rack]);
  const tableTiles = useMemo(() => new Set(table.flat()), [table]);
  const changed = table.flat().length !== state.table.flat().length || JSON.stringify(table) !== JSON.stringify(state.table);
  const playedNow = (id: TileId) => ownTiles.has(id) && tableTiles.has(id);
  /** Darf dieser Stein bewegt werden? Vor dem ersten Auslegen nur eigene Steine. */
  const movable = (id: TileId) => myTurn && (!tableTiles.has(id) || me.melded || playedNow(id));

  const check = useMemo(() => (changed && myTurn ? checkMove(state, me.id, { type: "legen", table }) : null), [state, me.id, table, changed, myTurn]);
  const meldValue = useMemo(() => {
    if (me.melded) return 0;
    const oldKeys = new Set(state.table.map((s) => [...s].sort((a, b) => a - b).join(",")));
    return table
      .filter((s) => !oldKeys.has([...s].sort((a, b) => a - b).join(",")))
      .reduce((sum, s) => {
        const a = analyzeSet(s);
        return sum + (a.valid ? a.value : 0);
      }, 0);
  }, [table, state.table, me.melded]);

  // ---------- Steine bewegen ----------

  function toggle(id: TileId) {
    if (!movable(id)) {
      setHint(
        !myTurn
          ? `Warte, bis ${current.name} fertig ist.`
          : "Vor deinem ersten Auslegen darfst du die Steine auf dem Tisch noch nicht verschieben.",
      );
      return;
    }
    setHint(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /** Steine aus Bank und Tisch entfernen und an ein Ziel legen. */
  function moveTiles(ids: TileId[], target: Exclude<DropTarget, null>) {
    const list = ids.filter(movable);
    if (list.length === 0) return;
    if (target.kind === "bank") {
      const back = list.filter((id) => ownTiles.has(id));
      if (back.length < list.length) setHint("Steine vom Tisch dürfen nicht auf deine Bank – lege sie in eine andere Reihe.");
      if (back.length === 0) return;
      setTable((t) => t.map((s) => s.filter((id) => !back.includes(id))).filter((s) => s.length > 0));
      setRack((r) => [...r.filter((id) => !back.includes(id)), ...back]);
      setSelected(new Set());
      return;
    }
    setTable((t) => {
      const targetSet = target.kind === "set" ? t[target.index] : undefined;
      let next = t.map((s) => s.filter((id) => !list.includes(id)));
      if (target.kind === "set" && targetSet) {
        const idx = next.findIndex((_, i) => i === target.index);
        next[idx] = [...next[idx]!, ...list];
      } else {
        next = [...next, list];
      }
      return next.filter((s) => s.length > 0);
    });
    setRack((r) => r.filter((id) => !list.includes(id)));
    setSelected(new Set());
    setHint(null);
  }

  function reset() {
    setTable(state.table.map((s) => [...s]));
    setRack(sortByColor(me.rack));
    setSelected(new Set());
    setHint(null);
  }

  function commit(move: { type: "legen"; table: TileId[][] } | { type: "ziehen" }) {
    try {
      onMove(spiel.applyMove(state, me.id, move));
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Dieser Zug geht leider nicht.");
    }
  }

  // ---------- Ziehen (Drag & Drop) ----------

  const rootRef = useRef<ViewRef>(null);
  const rackRef = useRef<ViewRef>(null);
  const newRef = useRef<ViewRef>(null);
  const setRefs = useRef(new Map<number, ViewRef | null>());
  const rects = useRef<{ root?: Rect; rack?: Rect; neu?: Rect; sets: Map<number, Rect> }>({ sets: new Map() });
  const dragPos = useRef(new Animated.ValueXY()).current;
  const [drag, setDrag] = useState<TileId[] | null>(null);
  const [hover, setHover] = useState<DropTarget>(null);
  const hoverKey = useRef("");

  const tileW = Math.max(34, Math.min(width < 500 ? 42 : 56, Math.floor((Math.min(width, 900) - 40) / 10)));
  const tableTileW = Math.max(30, Math.round(tileW * 0.85));

  function measureAll() {
    const m = (ref: ViewRef | null | undefined, set: (r: Rect) => void) => ref?.measureInWindow((x, y, w, h) => set({ x, y, w, h }));
    m(rootRef.current, (r) => (rects.current.root = r));
    m(rackRef.current, (r) => (rects.current.rack = r));
    m(newRef.current, (r) => (rects.current.neu = r));
    rects.current.sets = new Map();
    setRefs.current.forEach((ref, i) => m(ref, (r) => rects.current.sets.set(i, r)));
  }

  const inside = (r: Rect | undefined, x: number, y: number, pad = 8) => !!r && x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

  function targetAt(x: number, y: number): DropTarget {
    for (const [i, r] of rects.current.sets) if (inside(r, x, y)) return { kind: "set", index: i };
    if (inside(rects.current.neu, x, y, 16)) return { kind: "neu" };
    if (inside(rects.current.rack, x, y, 16)) return { kind: "bank" };
    return null;
  }

  function setFloat(x: number, y: number) {
    const root = rects.current.root ?? { x: 0, y: 0 };
    dragPos.setValue({ x: x - root.x - tileW / 2, y: y - root.y - tileW * 1.3 });
  }

  function startDrag(id: TileId, x: number, y: number) {
    if (!movable(id)) return;
    measureAll();
    const ids = selected.has(id) ? [...selected].filter(movable) : [id];
    setFloat(x, y);
    setDrag(ids);
    setHint(null);
  }

  function moveDrag(x: number, y: number) {
    setFloat(x, y);
    const t = targetAt(x, y);
    const k = JSON.stringify(t);
    if (k !== hoverKey.current) {
      hoverKey.current = k;
      setHover(t);
    }
  }

  function endDrag(x: number, y: number, ok: boolean) {
    const ids = drag;
    setDrag(null);
    setHover(null);
    hoverKey.current = "";
    if (!ok || !ids) return;
    const t = targetAt(x, y);
    if (t) moveTiles(ids, t);
  }

  const tileView = (id: TileId, opts: { size: number; inTable: boolean; jokerValue?: number }) => (
    <Draggable
      key={id}
      dragDisabled={!movable(id)}
      onTap={() => toggle(id)}
      onStart={(x, y) => startDrag(id, x, y)}
      onMove={moveDrag}
      onEnd={endDrag}
    >
      <View style={drag?.includes(id) ? styles.ghost : undefined}>
        <RommeTile
          id={id}
          size={opts.size}
          selected={selected.has(id)}
          fresh={opts.inTable && playedNow(id)}
          locked={opts.inTable && !movable(id)}
          jokerValue={opts.jokerValue}
        />
      </View>
    </Draggable>
  );

  // ---------- Anzeige ----------

  let status: { text: string; kind: "info" | "ok" | "error" };
  if (hint) status = { text: hint, kind: "error" };
  else if (!myTurn) {
    const last = info.describeLast(state);
    status = { text: `${last ? `${last}\n` : ""}Jetzt ist ${current.name} dran.`, kind: "info" };
  } else if (check && !check.ok) status = { text: check.message, kind: "error" };
  else if (check?.ok) status = { text: "Alles richtig gelegt. Tippe auf „Zug beenden“.", kind: "ok" };
  else if (selected.size > 0)
    status = { text: "Tippe auf „Hierher“ bei einer Reihe, auf „Neue Reihe“ – oder ziehe die Steine dorthin.", kind: "info" };
  else if (!me.melded)
    status = {
      text: `Erstes Auslegen: Lege Reihen mit zusammen mindestens ${INITIAL_MELD} Punkten. Tippe dazu Steine an oder ziehe sie auf den Tisch.`,
      kind: "info",
    };
  else status = { text: info.describeLast(state) ?? "Lege Steine an oder bilde neue Reihen.", kind: "info" };

  const title = online ? (myTurn ? "Du bist dran" : `${current.name} ist dran`) : `${current.name} ist dran`;
  const poolEmpty = state.pool.length === 0;
  const hasSelection = selected.size > 0;

  return (
    <View ref={rootRef} style={styles.root}>
      {/* Kopf: wer ist dran, Spieler, Vorrat */}
      <View style={styles.head}>
        <Text style={[styles.title, !myTurn && styles.waitTitle]}>{title}</Text>
        <View style={styles.players}>
          {state.players.map((p, i) => (
            <View key={p.id} style={[styles.player, i === state.turn && styles.playerActive]}>
              {onlineIds && <View style={[styles.dot, onlineIds.has(p.id) ? styles.dotOn : styles.dotOff]} />}
              <Text style={[styles.playerText, i === state.turn && styles.playerTextActive]}>
                {i === state.turn ? "▶ " : ""}
                {p.name}
                {viewerId === p.id ? " (du)" : ""}: {p.rack.length}
              </Text>
            </View>
          ))}
          <Text style={styles.pool}>Vorrat: {state.pool.length}</Text>
        </View>
      </View>

      {/* Tisch */}
      <ScrollView style={styles.tableScroll} contentContainerStyle={styles.table} scrollEnabled={!drag}>
        {table.length === 0 && <Text style={styles.empty}>Der Tisch ist noch leer.</Text>}
        {table.map((set, i) => {
          const a = analyzeSet(set);
          const jokerValues = new Map<TileId, number>();
          if (a.valid) a.ordered.forEach((id, k) => jokerValues.set(id, a.values[k]!));
          const isHover = hover?.kind === "set" && hover.index === i;
          return (
            <View
              key={i}
              ref={(r) => {
                setRefs.current.set(i, r);
              }}
              style={[styles.set, a.valid ? styles.setValid : styles.setInvalid, isHover && styles.setHover]}
            >
              <View style={styles.setTiles}>
                {a.ordered.map((id) => tileView(id, { size: tableTileW, inTable: true, jokerValue: jokerValues.get(id) }))}
              </View>
              {!a.valid && <Text style={styles.setError}>noch nicht gültig</Text>}
              {hasSelection && myTurn && (
                <Pressable
                  onPress={() => moveTiles([...selected], { kind: "set", index: i })}
                  style={({ pressed }) => [styles.here, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Ausgewählte Steine hierher legen"
                  testID={`hierher-${i}`}
                >
                  <Text style={styles.hereText}>＋ Hierher</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        {myTurn && (
          <Pressable
            ref={newRef}
            onPress={() => hasSelection && moveTiles([...selected], { kind: "neu" })}
            style={[styles.newSet, hasSelection && styles.newSetActive, hover?.kind === "neu" && styles.setHover]}
            accessibilityRole="button"
            testID="neue-reihe"
          >
            <Text style={[styles.newSetText, hasSelection && styles.newSetTextActive]}>
              {hasSelection ? "＋ Neue Reihe mit den ausgewählten Steinen" : "Neue Reihe: Steine hierher ziehen"}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Hinweis */}
      <View style={[styles.status, status.kind === "ok" && styles.statusOk, status.kind === "error" && styles.statusError]} accessibilityLiveRegion="polite">
        <Text style={styles.statusText}>{status.text}</Text>
        {myTurn && !me.melded && changed && (
          <Text style={styles.meld}>
            Erstes Auslegen: {meldValue} von {INITIAL_MELD} Punkten
          </Text>
        )}
      </View>

      {/* Bank */}
      <View ref={rackRef} style={[styles.rack, hover?.kind === "bank" && styles.setHover, { maxHeight: height * 0.3 }]} accessibilityLabel="Deine Steine">
        <ScrollView contentContainerStyle={styles.rackTiles} scrollEnabled={!drag}>
          {rack.filter((id) => !tableTiles.has(id)).map((id) => tileView(id, { size: tileW, inTable: false }))}
          {rack.filter((id) => !tableTiles.has(id)).length === 0 && <Text style={styles.empty}>Keine Steine mehr auf der Bank.</Text>}
        </ScrollView>
        {[...selected].some((id) => tableTiles.has(id) && ownTiles.has(id)) && (
          <Pressable
            onPress={() => moveTiles([...selected], { kind: "bank" })}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            testID="zur-bank"
          >
            <Text style={styles.hereText}>Ausgewählte Steine zurück auf die Bank</Text>
          </Pressable>
        )}
      </View>

      {/* Knöpfe */}
      <View style={styles.buttons}>
        {myTurn ? (
          <>
            <BigButton
              label="Zug beenden"
              disabled={!check?.ok || busy}
              onPress={() => commit({ type: "legen", table })}
              style={styles.main}
              testID="zug-beenden"
            />
            {changed ? (
              <BigButton label="Zurücksetzen" variant="secondary" compact onPress={reset} style={styles.side} testID="zuruecksetzen" />
            ) : (
              <BigButton
                label={poolEmpty ? "Aussetzen" : "Stein ziehen"}
                variant="secondary"
                compact
                disabled={busy}
                onPress={() => commit({ type: "ziehen" })}
                style={styles.side}
                testID="ziehen"
              />
            )}
          </>
        ) : null}
        <BigButton label="Nach Farbe" variant="secondary" compact onPress={() => setRack((r) => sortByColor(r))} style={styles.small} />
        <BigButton label="Nach Zahl" variant="secondary" compact onPress={() => setRack((r) => sortByNumber(r))} style={styles.small} />
        <BigButton
          label={online ? "Meine Partien" : "Menü"}
          variant="secondary"
          compact
          onPress={online ? onMenu : () => setConfirmMenu(true)}
          style={styles.small}
        />
      </View>

      {drag && (
        <Animated.View pointerEvents="none" style={[styles.float, { transform: dragPos.getTranslateTransform() }]}>
          <View style={styles.floatRow}>
            {drag.map((id) => (
              <RommeTile key={id} id={id} size={tileW} fresh />
            ))}
          </View>
        </Animated.View>
      )}

      <Dialog
        visible={confirmMenu}
        title="Zum Hauptmenü?"
        message="Die Partie wird gespeichert. Ihr könnt sie später im Hauptmenü fortsetzen."
        confirmLabel="Zum Hauptmenü"
        onConfirm={() => {
          setConfirmMenu(false);
          onMenu();
        }}
        onCancel={() => setConfirmMenu(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.s, gap: space.s, maxWidth: 1100, width: "100%", alignSelf: "center" },
  head: { gap: space.xs },
  title: { fontSize: font.title, fontWeight: "800", color: colors.primary, textAlign: "center" },
  waitTitle: { color: colors.textMuted },
  players: { flexDirection: "row", flexWrap: "wrap", gap: space.s, justifyContent: "center", alignItems: "center" },
  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.m,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  playerActive: { borderColor: colors.primary, backgroundColor: "#E8F0FB" },
  playerText: { fontSize: font.small, color: colors.text, fontWeight: "600" },
  playerTextActive: { color: colors.primary, fontWeight: "800" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: "#C4C4C4" },
  pool: { fontSize: font.small, color: colors.textMuted },
  tableScroll: { flex: 1, backgroundColor: "#E6EFE6", borderRadius: radius },
  table: { flexDirection: "row", flexWrap: "wrap", gap: space.s, padding: space.s, alignItems: "flex-start" },
  empty: { fontSize: font.body, color: colors.textMuted, padding: space.m },
  set: { padding: 6, borderRadius: radius, borderWidth: 2, backgroundColor: "rgba(255,255,255,0.6)", gap: 4 },
  setValid: { borderColor: "#9CC9A5" },
  setInvalid: { borderColor: colors.danger, borderStyle: "dashed", backgroundColor: "#FDECEA" },
  setHover: { borderColor: colors.primary, borderWidth: 3, backgroundColor: "#E8F0FB" },
  setTiles: { flexDirection: "row", gap: 3 },
  setError: { fontSize: 14, color: colors.danger, fontWeight: "700", textAlign: "center" },
  here: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, alignItems: "center" },
  hereText: { color: "#FFFFFF", fontSize: font.small, fontWeight: "800" },
  newSet: {
    minWidth: 200,
    minHeight: 64,
    flexGrow: 1,
    borderRadius: radius,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#9AA79A",
    alignItems: "center",
    justifyContent: "center",
    padding: space.s,
  },
  newSetActive: { borderColor: colors.primary, borderStyle: "solid", backgroundColor: colors.primary },
  newSetText: { fontSize: font.body, color: colors.textMuted, textAlign: "center" },
  newSetTextActive: { color: "#FFFFFF", fontWeight: "800" },
  status: { backgroundColor: colors.messageBg, borderColor: colors.messageBorder, borderWidth: 2, borderRadius: radius, padding: space.s, paddingHorizontal: space.m },
  statusOk: { backgroundColor: colors.okBg, borderColor: "#7CC495" },
  statusError: { backgroundColor: colors.errorBg, borderColor: "#E79A93" },
  statusText: { fontSize: font.body, color: colors.text, fontWeight: "600", lineHeight: font.body * 1.3 },
  meld: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  back: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, margin: space.s, marginTop: 0, alignItems: "center" },
  rack: { backgroundColor: "#E4DED0", borderRadius: radius, borderWidth: 2, borderColor: "transparent" },
  rackTiles: { flexDirection: "row", flexWrap: "wrap", gap: 5, padding: space.s, justifyContent: "center" },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: space.s },
  main: { flexGrow: 2, flexBasis: 220 },
  side: { flexGrow: 1, flexBasis: 150 },
  small: { flexGrow: 1, flexBasis: 110 },
  float: { position: "absolute", left: 0, top: 0, opacity: 0.95 },
  floatRow: { flexDirection: "row", gap: 3 },
  ghost: { opacity: 0.25 },
});
