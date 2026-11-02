import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BigButton } from "../components/BigButton";
import { gameOf, type AnyState } from "../games/registry";
import { colors, font, radius, space } from "../theme";

interface Props {
  state: AnyState;
  onReveal: () => void;
  onMenu: () => void;
}

/**
 * Übergabe am selben Gerät: Die eigenen Steine bleiben verdeckt,
 * bis der nächste Spieler das Tablet in der Hand hat.
 */
export function HandoverScreen({ state, onReveal, onMenu }: Props) {
  const info = gameOf(state);
  const player = state.players[state.turn]!;
  const last = info.describeLast(state);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.game}>
        {info.icon} {info.title}
      </Text>
      {last ? (
        <View style={styles.last}>
          <Text style={styles.lastText}>{last}</Text>
        </View>
      ) : (
        <Text style={styles.first}>Die Partie beginnt!</Text>
      )}

      <Text style={styles.turn} accessibilityRole="header">
        {player.name} ist dran.
      </Text>
      <Text style={styles.text}>Bitte gib das Tablet an {player.name} weiter.</Text>

      <BigButton label={`Ich bin ${player.name} – Steine zeigen`} onPress={onReveal} testID="zeigen" />

      <View style={styles.scores}>
        {state.players.map((p, i) => (
          <View key={p.id} style={[styles.row, i === state.turn && styles.rowActive]}>
            <Text style={[styles.name, i === state.turn && styles.active]}>
              {i === state.turn ? "▶ " : ""}
              {p.name}
            </Text>
            <Text style={[styles.value, i === state.turn && styles.active]}>{info.playerLine(state, p.id)}</Text>
          </View>
        ))}
      </View>

      <BigButton label="Zum Hauptmenü" variant="secondary" onPress={onMenu} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.l, maxWidth: 640, width: "100%", alignSelf: "center" },
  game: { fontSize: font.body, color: colors.textMuted, textAlign: "center", fontWeight: "700" },
  last: { backgroundColor: colors.okBg, borderRadius: radius, padding: space.l, borderWidth: 2, borderColor: "#A7D7B8" },
  lastText: { fontSize: font.large, color: colors.text, fontWeight: "600", lineHeight: font.large * 1.35 },
  first: { fontSize: font.large, color: colors.textMuted, textAlign: "center" },
  turn: { fontSize: font.huge, fontWeight: "800", color: colors.primary, textAlign: "center", marginTop: space.l },
  text: { fontSize: font.body, color: colors.text, textAlign: "center" },
  scores: { gap: space.s },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: "#E8F0FB" },
  name: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  value: { fontSize: font.body, color: colors.text, fontWeight: "800" },
  active: { color: colors.primary },
});
