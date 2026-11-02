import { memo, type ComponentRef, type ReactNode, type Ref } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BOARD_SIZE, EMPTY, cellAt, isJokerCell, premiumAt, type Placement, type Premium } from "@spielestube/woerterei";
import { colors } from "../theme";
import { Tile } from "./Tile";

interface Props {
  board: string;
  pending: readonly Placement[];
  /** Felder des letzten Zuges (dezent hervorgehoben). */
  lastMove?: ReadonlySet<number>;
  size: number;
  onCellPress?: (row: number, col: number) => void;
  /** Feld, über dem gerade ein Stein gezogen wird (row * 15 + col). */
  hover?: number | null;
  /** Hülle für neu gelegte Steine (z. B. damit man sie ziehen kann). */
  wrapPending?: (p: Placement, tile: ReactNode) => ReactNode;
  ref?: Ref<ComponentRef<typeof View>>;
}

/** Maße des Bretts: Abstand zwischen Feldern, Feldgröße, Gesamtgröße. */
export function boardGeometry(size: number) {
  const gap = size >= 500 ? 2 : 1;
  const cell = Math.floor((size - gap * (BOARD_SIZE + 1)) / BOARD_SIZE);
  return { gap, cell, total: cell * BOARD_SIZE + gap * (BOARD_SIZE + 1) };
}

const PREMIUM_STYLE: Record<Premium, { bg: string; fg: string; short: string; long: string }> = {
  W3: { bg: colors.w3, fg: colors.w3Text, short: "3W", long: "3×\nWORT" },
  W2: { bg: colors.w2, fg: colors.w2Text, short: "2W", long: "2×\nWORT" },
  L3: { bg: colors.l3, fg: colors.l3Text, short: "3B", long: "3×\nBUCHST." },
  L2: { bg: colors.l2, fg: colors.l2Text, short: "2B", long: "2×\nBUCHST." },
  START: { bg: colors.w2, fg: colors.w2Text, short: "★", long: "★" },
};

export const Board = memo(function Board({ board, pending, lastMove, size, onCellPress, hover, wrapPending, ref }: Props) {
  const { gap, cell, total } = boardGeometry(size);
  const pendingMap = new Map(pending.map((p) => [p.row * BOARD_SIZE + p.col, p]));
  const rows = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    const cells = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = r * BOARD_SIZE + c;
      const ch = cellAt(board, r, c);
      const p = pendingMap.get(key);
      let content;
      let label = "";
      if (p) {
        const tile = <Tile letter={p.letter} joker={p.joker} size={cell} fresh />;
        content = wrapPending ? wrapPending(p, tile) : tile;
        label = `${p.letter}, neu gelegt, antippen zum Zurücknehmen`;
      } else if (ch !== EMPTY) {
        const joker = isJokerCell(ch);
        content = (
          <View style={lastMove?.has(key) ? styles.last : undefined}>
            <Tile letter={ch.toUpperCase()} joker={joker} size={cell} />
          </View>
        );
        label = ch.toUpperCase();
      } else {
        const prem = premiumAt(r, c);
        const st = prem ? PREMIUM_STYLE[prem] : null;
        const text = st ? (cell >= 44 && prem !== "START" ? st.long : st.short) : "";
        content = (
          <View
            style={[
              styles.empty,
              { width: cell, height: cell, backgroundColor: st?.bg ?? colors.cell, borderRadius: Math.max(2, cell * 0.08) },
              hover === key && { borderWidth: Math.max(2, Math.round(cell * 0.1)), borderColor: colors.primary },
            ]}
          >
            {st ? (
              <Text
                allowFontScaling={false}
                style={{
                  color: st.fg,
                  fontWeight: "800",
                  textAlign: "center",
                  fontSize: prem === "START" ? cell * 0.6 : cell >= 44 ? cell * 0.2 : cell * 0.36,
                  lineHeight: prem === "START" ? cell * 0.8 : cell >= 44 ? cell * 0.24 : cell * 0.44,
                }}
              >
                {text}
              </Text>
            ) : null}
          </View>
        );
        label = prem ? `leeres Feld, ${prem === "START" ? "Startfeld" : st!.long.replace("\n", " ")}` : "leeres Feld";
      }
      cells.push(
        <Pressable
          key={c}
          accessibilityLabel={`Zeile ${r + 1}, Spalte ${c + 1}: ${label}`}
          onPress={onCellPress ? () => onCellPress(r, c) : undefined}
          style={{ marginLeft: gap }}
        >
          {content}
        </Pressable>,
      );
    }
    rows.push(
      <View key={r} style={[styles.row, { marginTop: gap }]}>
        {cells}
      </View>,
    );
  }

  return (
    <View ref={ref} style={[styles.board, { width: total, height: total }]}>
      {rows}
    </View>
  );
});

const styles = StyleSheet.create({
  board: { backgroundColor: colors.gridLine, borderRadius: 6, overflow: "hidden", alignSelf: "center" },
  row: { flexDirection: "row" },
  empty: { alignItems: "center", justifyContent: "center" },
  last: { borderRadius: 4, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 2, elevation: 2 },
});

/** Kleine Legende unter dem Brett. */
export function BoardLegend() {
  const items: { p: Premium; text: string }[] = [
    { p: "W3", text: "3× Wort" },
    { p: "W2", text: "2× Wort" },
    { p: "L3", text: "3× Buchstabe" },
    { p: "L2", text: "2× Buchstabe" },
  ];
  return (
    <View style={legend.wrap} accessibilityElementsHidden>
      {items.map(({ p, text }) => (
        <View key={p} style={legend.item}>
          <View style={[legend.swatch, { backgroundColor: PREMIUM_STYLE[p].bg }]}>
            <Text style={[legend.short, { color: PREMIUM_STYLE[p].fg }]}>{PREMIUM_STYLE[p].short}</Text>
          </View>
          <Text style={legend.text}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const legend = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 6, gap: 10 },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 30, height: 26, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  short: { fontSize: 13, fontWeight: "800" },
  text: { fontSize: 16, color: colors.text },
});
