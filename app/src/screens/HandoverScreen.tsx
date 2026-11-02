import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { WoerterState } from "@spielestube/woerterei";
import { BigButton } from "../components/BigButton";
import { Scoreboard } from "../components/Scoreboard";
import { describeEntry, lastMoveEntry } from "../texts";
import { colors, font, radius, space } from "../theme";

interface Props {
  state: WoerterState;
  onReveal: () => void;
  onMenu: () => void;
}

/**
 * Übergabe am selben Gerät: Die Buchstaben bleiben verdeckt,
 * bis der nächste Spieler das Tablet in der Hand hat.
 */
export function HandoverScreen({ state, onReveal, onMenu }: Props) {
  const player = state.players[state.turn]!;
  const last = describeEntry(state, lastMoveEntry(state));
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
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

      <BigButton label={`Ich bin ${player.name} – Buchstaben zeigen`} onPress={onReveal} testID="zeigen" />

      <Scoreboard state={state} />

      <BigButton label="Zum Hauptmenü" variant="secondary" onPress={onMenu} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.l, maxWidth: 640, width: "100%", alignSelf: "center" },
  last: { backgroundColor: colors.okBg, borderRadius: radius, padding: space.l, borderWidth: 2, borderColor: "#A7D7B8" },
  lastText: { fontSize: font.large, color: colors.text, fontWeight: "600", lineHeight: font.large * 1.35 },
  first: { fontSize: font.large, color: colors.textMuted, textAlign: "center" },
  turn: { fontSize: font.huge, fontWeight: "800", color: colors.primary, textAlign: "center", marginTop: space.l },
  text: { fontSize: font.body, color: colors.text, textAlign: "center" },
});
