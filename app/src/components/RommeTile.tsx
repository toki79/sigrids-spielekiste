import { StyleSheet, Text, View } from "react-native";
import { COLOR_NAMES, tile, type TileId } from "@spielestube/zahlenromme";
import { colors } from "../theme";

/** Farben der Zahlen – kräftig und gut unterscheidbar; dazu ein Symbol für Menschen mit Farbschwäche. */
export const ROMME_COLORS = ["#C62828", "#1565C0", "#1B1B1B", "#D35400"] as const;
export const ROMME_SYMBOLS = ["●", "■", "▲", "◆"] as const;

interface Props {
  id: TileId;
  /** Breite des Steins; die Höhe ist etwas größer. */
  size: number;
  selected?: boolean;
  /** In diesem Zug neu auf den Tisch gelegt. */
  fresh?: boolean;
  /** Darf gerade nicht bewegt werden (z. B. vor dem ersten Auslegen). */
  locked?: boolean;
  /** Wert, den ein Joker in seiner Reihe darstellt. */
  jokerValue?: number;
}

export function RommeTile({ id, size, selected, fresh, locked, jokerValue }: Props) {
  const t = tile(id);
  const height = Math.round(size * 1.3);
  const color = t.joker ? ROMME_COLORS[0] : ROMME_COLORS[t.color as 0];
  return (
    <View
      accessibilityLabel={t.joker ? `Joker${jokerValue ? ` als ${jokerValue}` : ""}` : `${COLOR_NAMES[t.color as 0]} ${t.n}`}
      style={[
        styles.tile,
        { width: size, height, borderRadius: Math.max(4, size * 0.14), borderWidth: Math.max(1, Math.round(size * 0.05)) },
        fresh && styles.fresh,
        selected && styles.selected,
        locked && styles.locked,
      ]}
    >
      <Text allowFontScaling={false} style={[styles.number, { fontSize: size * (t.joker ? 0.6 : t.n >= 10 ? 0.52 : 0.62), lineHeight: size * 0.72, color }, selected && styles.selectedText]}>
        {t.joker ? "☺" : t.n}
      </Text>
      <Text allowFontScaling={false} style={[styles.symbol, { fontSize: size * 0.26, lineHeight: size * 0.32, color }, selected && styles.selectedText]}>
        {t.joker ? (jokerValue ? String(jokerValue) : "Joker") : ROMME_SYMBOLS[t.color as 0]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: "#FFF8E6", borderColor: "#C9B48A", alignItems: "center", justifyContent: "center" },
  fresh: { backgroundColor: colors.tileNew, borderColor: colors.tileNewBorder },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary, transform: [{ translateY: -4 }] },
  locked: { opacity: 0.85 },
  number: { fontWeight: "900", textAlign: "center" },
  symbol: { fontWeight: "700", textAlign: "center" },
  selectedText: { color: "#FFFFFF" },
});
