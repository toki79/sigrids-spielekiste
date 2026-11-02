import { StyleSheet, Text, View } from "react-native";
import { tileValue } from "@spielestube/woerterei";
import { colors } from "../theme";

interface Props {
  /** Angezeigter Buchstabe ("?" = Joker ohne Buchstabe). */
  letter: string;
  joker?: boolean;
  size: number;
  /** In diesem Zug neu gelegt (noch nicht bestätigt). */
  fresh?: boolean;
  selected?: boolean;
}

/** Ein Buchstabenstein: großer Buchstabe, kleiner Punktwert unten rechts. */
export function Tile({ letter, joker, size, fresh, selected }: Props) {
  const showValue = !joker && letter !== "?" && size >= 22;
  const value = joker ? 0 : tileValue(letter);
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.max(3, size * 0.12),
          borderWidth: Math.max(1, Math.round(size * 0.05)),
        },
        fresh && styles.fresh,
        selected && styles.selected,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          styles.letter,
          { fontSize: size * (letter.length > 1 ? 0.45 : 0.62), lineHeight: size * 0.9 },
          joker && styles.joker,
          selected && styles.selectedText,
        ]}
      >
        {letter === "?" ? "★" : letter}
      </Text>
      {showValue && (
        <Text allowFontScaling={false} style={[styles.value, { fontSize: size * 0.26, right: size * 0.06, bottom: size * 0.02 }, selected && styles.selectedText]}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.tile,
    borderColor: colors.tileBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  fresh: { backgroundColor: colors.tileNew, borderColor: colors.tileNewBorder },
  selected: { backgroundColor: colors.tileSelected, borderColor: colors.tileSelected },
  letter: { color: colors.tileText, fontWeight: "800", textAlign: "center" },
  joker: { color: colors.jokerText },
  value: { position: "absolute", color: colors.tileText, fontWeight: "700" },
  selectedText: { color: "#FFFFFF" },
});
