import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BigButton } from "../components/BigButton";
import { GameIcon } from "../components/GameIcon";
import { GAME_LIST, type AnyState, type GameType } from "../games/registry";
import { colors, font, radius, space } from "../theme";

interface Props {
  /** Name, wenn dieses Gerät schon einer Familie beigetreten ist. */
  onlineName: string | null;
  onOnline: () => void;
  /** Laufende Partien am selben Gerät, je Spiel. */
  saved: Partial<Record<GameType, AnyState | null>>;
  onContinue: (type: GameType) => void;
  onNewGame: (type: GameType) => void;
}

export function StartScreen({ onlineName, onOnline, saved, onContinue, onNewGame }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        Sigrids Spielestube
      </Text>
      <Text style={styles.subtitle}>Schön, dass du da bist!</Text>

      <View style={styles.hero} accessibilityElementsHidden>
        {GAME_LIST.map((g) => (
          <View key={g.type} style={styles.heroItem}>
            <GameIcon type={g.type} size={120} />
            <Text style={styles.heroText}>{g.title}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Online mit der Familie</Text>
        <Text style={styles.cardText}>
          Jeder spielt an seinem eigenen Handy oder Tablet – {GAME_LIST.map((g) => g.title).join(" oder ")}. Die Züge der anderen
          erscheinen sofort.
        </Text>
        <BigButton
          label={onlineName ? `Meine Partien (${onlineName})` : "Online mit der Familie spielen"}
          onPress={onOnline}
          testID="online"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Am selben Gerät</Text>
        <Text style={styles.cardText}>Für 2 bis 4 Spieler an einem Tisch. Das Tablet wird reihum weitergegeben.</Text>
        {GAME_LIST.map((g) => {
          const running = saved[g.type];
          const active = running && running.status === "laeuft";
          return (
            <View key={g.type} style={styles.game}>
              <View style={styles.gameHead}>
                <GameIcon type={g.type} size={72} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.gameTitle}>{g.title}</Text>
                  <Text style={styles.gameText}>{g.description}</Text>
                </View>
              </View>
              {active && (
                <>
                  <Text style={styles.gameText}>Es läuft noch eine Partie mit {running.players.map((p) => p.name).join(", ")}.</Text>
                  <BigButton label="Partie fortsetzen" variant="secondary" onPress={() => onContinue(g.type)} testID={`weiter-${g.type}`} />
                </>
              )}
              <BigButton label="Neue Partie" variant="secondary" onPress={() => onNewGame(g.type)} testID={`neu-${g.type}`} />
            </View>
          );
        })}
      </View>
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
  hero: { flexDirection: "row", justifyContent: "center", gap: space.xl, flexWrap: "wrap" },
  heroItem: { alignItems: "center", gap: space.s },
  heroText: { fontSize: font.body, fontWeight: "800", color: colors.text },
  gameHead: { flexDirection: "row", gap: space.m, alignItems: "center" },
  game: { gap: space.s, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.m },
  gameTitle: { fontSize: font.large, fontWeight: "800", color: colors.text },
  gameText: { fontSize: font.body, color: colors.textMuted, lineHeight: font.body * 1.35 },
});
