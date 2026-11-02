import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BigButton } from "../../components/BigButton";
import { Confetti } from "../../components/Confetti";
import { GAME_LIST, GAMES, type GameStats, type GameType } from "../../games/registry";
import { colors, font, radius, space } from "../../theme";

interface Props {
  stats: Record<GameType, GameStats> | null;
  meId: string;
  onBack: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** Rangliste der Familie je Spiel – die Nummer 1 wird gefeiert. */
export function StatsScreen({ stats, meId, onBack }: Props) {
  // Mit dem Spiel beginnen, in dem schon am meisten gespielt wurde
  const [type, setType] = useState<GameType>(() =>
    stats ? [...GAME_LIST].sort((a, b) => (stats[b.type]?.finishedGames ?? 0) - (stats[a.type]?.finishedGames ?? 0))[0]!.type : "woerterei",
  );

  if (!stats) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Die Rangliste wird geladen …</Text>
      </View>
    );
  }

  const { ranking, records } = stats[type];
  const champions = ranking.filter((r) => r.rank === 1);
  const champ = champions[0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title} accessibilityRole="header">
          Rangliste der Familie
        </Text>

        <View style={styles.tabs}>
          {GAME_LIST.map((g) => (
            <Pressable
              key={g.type}
              onPress={() => setType(g.type)}
              accessibilityRole="tab"
              accessibilityState={{ selected: g.type === type }}
              style={[styles.tab, g.type === type && styles.tabActive]}
              testID={`tab-${g.type}`}
            >
              <Text style={[styles.tabText, g.type === type && styles.tabTextActive]}>
                {g.icon} {g.title}
              </Text>
            </Pressable>
          ))}
        </View>

        {!champ ? (
          <Text style={styles.text}>
            In {GAMES[type].title} ist noch keine Partie zu Ende gespielt. Sobald die erste Partie vorbei ist, erscheint hier die Rangliste.
          </Text>
        ) : (
          <>
            <View style={styles.champ} testID="champion">
              <Text style={styles.crown}>👑</Text>
              <Text style={styles.champLabel}>
                {champions.length > 1 ? "Unsere Champions" : "Unser Champion"} in {GAMES[type].title}
              </Text>
              <Text style={styles.champName}>{champions.map((c) => c.name).join(" & ")}</Text>
              <Text style={styles.champText}>
                {champ.wins} {champ.wins === 1 ? "Sieg" : "Siege"} aus {champ.games} {champ.games === 1 ? "Partie" : "Partien"}
              </Text>
              <Text style={styles.cheer}>Herzlichen Glückwunsch! 🎉</Text>
            </View>

            <View style={styles.table}>
              {ranking.map((r) => (
                <View key={r.id} style={[styles.row, r.rank === 1 && styles.rowFirst, r.id === meId && styles.rowMe]}>
                  <Text style={styles.rank}>{MEDALS[r.rank - 1] ?? `${r.rank}.`}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {r.name}
                      {r.id === meId ? " (du)" : ""}
                    </Text>
                    <Text style={styles.detail}>
                      {r.wins} von {r.games} gewonnen · Ø {r.avgPoints} Punkte
                    </Text>
                  </View>
                  <Text style={styles.wins}>{r.wins}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.section}>Rekorde</Text>
            <View style={styles.records}>
              {records.map((rec) => (
                <Text key={rec.label} style={styles.record}>
                  {rec.icon} {rec.label}: {rec.name ? <Text style={styles.bold}>{rec.name} </Text> : null}
                  {rec.text}
                </Text>
              ))}
            </View>
          </>
        )}

        <BigButton label="Zurück zu meinen Partien" variant="secondary" onPress={onBack} />
      </ScrollView>
      {champ && <Confetti key={type} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.m, maxWidth: 640, width: "100%", alignSelf: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  text: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  tabs: { flexDirection: "row", gap: space.s, flexWrap: "wrap" },
  tab: { flexGrow: 1, borderWidth: 2, borderColor: colors.primary, borderRadius: radius, paddingVertical: space.s, paddingHorizontal: space.m, alignItems: "center", minHeight: 52, justifyContent: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: font.body, fontWeight: "700", color: colors.primary },
  tabTextActive: { color: "#FFFFFF" },
  champ: { alignItems: "center", backgroundColor: "#FFF4D6", borderColor: "#E0B84D", borderWidth: 3, borderRadius: radius * 1.5, padding: space.xl, gap: 4 },
  crown: { fontSize: 64 },
  champLabel: { fontSize: font.body, color: colors.textMuted, fontWeight: "700", textAlign: "center" },
  champName: { fontSize: 40, fontWeight: "900", color: colors.text, textAlign: "center" },
  champText: { fontSize: font.body, color: colors.text, textAlign: "center" },
  cheer: { fontSize: font.large, fontWeight: "800", color: colors.success, marginTop: space.s },
  table: { gap: space.s, marginTop: space.m },
  row: { flexDirection: "row", alignItems: "center", gap: space.m, backgroundColor: colors.surface, borderRadius: radius, borderWidth: 2, borderColor: colors.border, padding: space.m },
  rowFirst: { borderColor: "#E0B84D", backgroundColor: "#FFFBEF" },
  rowMe: { borderWidth: 3 },
  rank: { fontSize: font.title, width: 44, textAlign: "center", fontWeight: "800", color: colors.text },
  name: { fontSize: font.large, fontWeight: "700", color: colors.text },
  detail: { fontSize: font.small, color: colors.textMuted },
  wins: { fontSize: font.title, fontWeight: "900", color: colors.primary },
  section: { fontSize: font.large, fontWeight: "800", color: colors.text, marginTop: space.l },
  records: { gap: space.s, backgroundColor: colors.surface, borderRadius: radius, borderWidth: 2, borderColor: colors.border, padding: space.m },
  record: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  bold: { fontWeight: "800" },
});
