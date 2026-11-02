import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { WoerterState } from "@spielestube/woerterei";
import { BigButton } from "../components/BigButton";
import { colors, font, radius, space } from "../theme";

interface Props {
  savedGame: WoerterState | null;
  onContinue: () => void;
  onNewGame: () => void;
}

export function StartScreen({ savedGame, onContinue, onNewGame }: Props) {
  const running = savedGame && savedGame.status === "laeuft";
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        Sigrids Spielestube
      </Text>
      <Text style={styles.subtitle}>Schön, dass du da bist!</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wörterei</Text>
        <Text style={styles.cardText}>Das Wortlegespiel für 2 bis 4 Spieler. Das Tablet wird reihum weitergegeben.</Text>
        {running ? (
          <>
            <Text style={styles.cardText}>
              Es läuft noch eine Partie mit {savedGame.players.map((p) => p.name).join(", ")}.
            </Text>
            <BigButton label="Partie fortsetzen" onPress={onContinue} testID="weiter" />
            <BigButton label="Neue Partie beginnen" variant="secondary" onPress={onNewGame} testID="neu" />
          </>
        ) : (
          <BigButton label="Neue Partie beginnen" onPress={onNewGame} testID="neu" />
        )}
      </View>

      <Text style={styles.hint}>Weitere Spiele folgen.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.l, alignItems: "stretch", maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: font.huge, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: space.xl },
  subtitle: { fontSize: font.large, color: colors.textMuted, textAlign: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 2, borderColor: colors.border, padding: space.xl, gap: space.m },
  cardTitle: { fontSize: font.title, fontWeight: "800", color: colors.text },
  cardText: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  hint: { fontSize: font.body, color: colors.textMuted, textAlign: "center" },
});
