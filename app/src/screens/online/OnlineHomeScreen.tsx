import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatFamilyCode } from "@spielestube/core";
import { BigButton } from "../../components/BigButton";
import type { Membership } from "../../online/session";
import { isOnline, lastSeenText, type Family, type OnlineGame } from "../../online/types";
import { colors, font, radius, space } from "../../theme";

interface Props {
  membership: Membership;
  family: Family | null;
  games: OnlineGame[] | null;
  connectionProblem: string | false;
  onOpenGame: (id: string) => void;
  onNewGame: () => void;
  onBack: () => void;
  onLeave: () => void;
}

function opponents(game: OnlineGame, meId: string): string {
  const names = game.state.players.filter((p) => p.id !== meId).map((p) => p.name);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} und ${names.at(-1)}`;
}

function scoreLine(game: OnlineGame): string {
  return game.state.players.map((p) => `${p.name} ${p.score}`).join(" · ");
}

/** „Meine Partien“: wer ist dran, neue Partie, Familiencode. */
export function OnlineHomeScreen({ membership, family, games, connectionProblem, onOpenGame, onNewGame, onBack, onLeave }: Props) {
  const me = membership.memberId;
  const mine = (games ?? []).filter((g) => g.status === "laeuft" && g.turnId === me);
  const waiting = (games ?? []).filter((g) => g.status === "laeuft" && g.turnId !== me);
  const done = (games ?? []).filter((g) => g.status === "beendet").slice(0, 5);
  const others = (family?.members ?? []).filter((m) => m.id !== me);

  const row = (g: OnlineGame, kind: "mine" | "waiting" | "done") => {
    const turnName = g.state.players.find((p) => p.id === g.turnId)?.name;
    const winner = kind === "done" ? [...g.state.players].sort((a, b) => b.score - a.score)[0] : undefined;
    return (
      <Pressable
        key={g.id}
        onPress={() => onOpenGame(g.id)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.game, kind === "mine" && styles.gameMine, pressed && styles.pressed]}
        testID={`partie-${kind}`}
      >
        <Text style={styles.gameTitle}>Wörterei mit {opponents(g, me)}</Text>
        <Text style={[styles.gameState, kind === "mine" && styles.gameStateMine]}>
          {kind === "mine" ? "Du bist dran!" : kind === "waiting" ? `${turnName} ist dran` : `Beendet – ${winner?.name} hat gewonnen`}
        </Text>
        <Text style={styles.gameScore}>{scoreLine(g)}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        Hallo {membership.name}!
      </Text>

      {connectionProblem && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{connectionProblem}</Text>
        </View>
      )}

      <BigButton label="Neue Partie starten" onPress={onNewGame} disabled={others.length === 0} testID="neue-partie" />
      {family && others.length === 0 && (
        <Text style={styles.hint}>
          Noch ist niemand außer dir in der Familie. Gib den Familiencode {formatFamilyCode(membership.code)} weiter.
        </Text>
      )}

      {games === null ? (
        <Text style={styles.hint}>Partien werden geladen …</Text>
      ) : (
        <>
          {mine.length > 0 && <Text style={styles.section}>Du bist dran</Text>}
          {mine.map((g) => row(g, "mine"))}
          {waiting.length > 0 && <Text style={styles.section}>Warten auf die anderen</Text>}
          {waiting.map((g) => row(g, "waiting"))}
          {done.length > 0 && <Text style={styles.section}>Beendet</Text>}
          {done.map((g) => row(g, "done"))}
          {games.length === 0 && <Text style={styles.hint}>Noch keine Partien. Starte oben eine neue Partie.</Text>}
        </>
      )}

      {others.length > 0 && (
        <>
          <Text style={styles.section}>Familie</Text>
          <View style={styles.family}>
            {others.map((m) => (
              <View key={m.id} style={styles.member}>
                <View style={[styles.dot, isOnline(m) ? styles.dotOn : styles.dotOff]} />
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberSeen}>{lastSeenText(m)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Euer Familiencode</Text>
        <Text style={styles.code} selectable>
          {formatFamilyCode(membership.code)}
        </Text>
      </View>

      <BigButton label="Zum Hauptmenü" variant="secondary" onPress={onBack} />
      <BigButton label="Auf diesem Gerät abmelden" variant="secondary" compact onPress={onLeave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.m, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text, marginBottom: space.s },
  section: { fontSize: font.large, fontWeight: "800", color: colors.text, marginTop: space.l },
  hint: { fontSize: font.body, color: colors.textMuted, lineHeight: font.body * 1.4 },
  game: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 2, borderRadius: radius, padding: space.l, gap: 4 },
  gameMine: { borderColor: colors.primary, borderWidth: 3, backgroundColor: "#E8F0FB" },
  pressed: { opacity: 0.8 },
  gameTitle: { fontSize: font.large, fontWeight: "700", color: colors.text },
  gameState: { fontSize: font.body, color: colors.textMuted, fontWeight: "600" },
  gameStateMine: { color: colors.primary, fontWeight: "800" },
  gameScore: { fontSize: font.small, color: colors.textMuted },
  family: { backgroundColor: colors.surface, borderRadius: radius, borderWidth: 2, borderColor: colors.border, padding: space.m, gap: space.s },
  member: { flexDirection: "row", alignItems: "center", gap: space.s, flexWrap: "wrap" },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: "#C4C4C4" },
  memberName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  memberSeen: { fontSize: font.small, color: colors.textMuted },
  codeBox: { marginTop: space.l, borderRadius: radius, borderWidth: 2, borderColor: colors.border, padding: space.m, alignItems: "center", gap: 2 },
  codeLabel: { fontSize: font.small, color: colors.textMuted },
  code: { fontSize: font.title, fontWeight: "800", color: colors.primary, letterSpacing: 2 },
  errorBox: { backgroundColor: colors.errorBg, borderColor: "#E79A93", borderWidth: 2, borderRadius: radius, padding: space.m },
  errorText: { fontSize: font.body, color: colors.text, fontWeight: "600" },
});
