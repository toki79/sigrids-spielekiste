import { ScrollView, StyleSheet, Text, View } from "react-native";
import { result, type WoerterState } from "@spielestube/woerterei";
import { BigButton } from "../components/BigButton";
import { playerName, points } from "../texts";
import { colors, font, radius, space } from "../theme";

interface Props {
  state: WoerterState;
  onNewGame: () => void;
  onMenu: () => void;
}

export function EndScreen({ state, onNewGame, onMenu }: Props) {
  const res = result(state);
  const end = state.history.at(-1);
  const winners = res.winners.map((id) => playerName(state, id));
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        {winners.length === 1 ? `${winners[0]} hat gewonnen!` : `Unentschieden: ${winners.join(" und ")}!`}
      </Text>
      <Text style={styles.text}>
        {state.endReason === "ausgespielt"
          ? "Alle Buchstaben sind aufgebraucht."
          : "Keiner konnte mehr legen."}{" "}
        Die übrigen Buchstaben wurden verrechnet.
      </Text>

      <View style={styles.table}>
        {res.standings.map((s) => {
          const adj = end?.type === "ende" ? end.adjustments.find((a) => a.playerId === s.playerId)?.points ?? 0 : 0;
          return (
            <View key={s.playerId} style={[styles.row, s.rank === 1 && styles.winner]}>
              <Text style={styles.rank}>{s.rank}.</Text>
              <Text style={styles.name}>{playerName(state, s.playerId)}</Text>
              <View style={styles.scoreCol}>
                <Text style={styles.score}>{points(s.score)}</Text>
                {adj !== 0 && <Text style={styles.adj}>({adj > 0 ? "+" : ""}{points(adj)} Restbuchstaben)</Text>}
              </View>
            </View>
          );
        })}
      </View>

      <BigButton label="Neue Partie" onPress={onNewGame} />
      <BigButton label="Zum Hauptmenü" variant="secondary" onPress={onMenu} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.l, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: font.huge, fontWeight: "800", color: colors.primary, textAlign: "center", marginTop: space.l },
  text: { fontSize: font.body, color: colors.text, textAlign: "center", lineHeight: font.body * 1.4 },
  table: { gap: space.s },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.m,
  },
  winner: { borderColor: colors.success, backgroundColor: colors.okBg },
  rank: { fontSize: font.large, fontWeight: "800", color: colors.text, width: 36 },
  name: { fontSize: font.large, fontWeight: "700", color: colors.text, flex: 1 },
  scoreCol: { alignItems: "flex-end" },
  score: { fontSize: font.large, fontWeight: "800", color: colors.text },
  adj: { fontSize: font.small, color: colors.textMuted },
});
