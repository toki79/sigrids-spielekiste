import { StyleSheet, Text, View } from "react-native";
import type { WoerterState } from "@spielestube/woerterei";
import { colors, font, radius, space } from "../theme";

interface Props {
  state: WoerterState;
  /** Nebeneinander (Handy-Hochformat) oder untereinander (Tablet-Seitenleiste). */
  horizontal?: boolean;
}

/** Punktestand aller Spieler; wer dran ist, ist hervorgehoben. */
export function Scoreboard({ state, horizontal }: Props) {
  return (
    <View style={[styles.wrap, horizontal && styles.horizontal]}>
      {state.players.map((p, i) => {
        const active = state.status === "laeuft" && i === state.turn;
        return (
          <View key={p.id} style={[styles.player, horizontal && styles.playerH, active && styles.active]}>
            <Text style={[styles.name, active && styles.activeText]} numberOfLines={1}>
              {active ? "▶ " : ""}
              {p.name}
            </Text>
            <Text style={[styles.score, active && styles.activeText]}>{p.score}</Text>
          </View>
        );
      })}
      {horizontal ? (
        <Text style={[styles.bagText, styles.bagLine]}>Noch {state.bag.length} Buchstaben im Beutel</Text>
      ) : (
        <View style={[styles.player, styles.bag]}>
          <Text style={styles.bagText}>Im Beutel</Text>
          <Text style={styles.bagText}>{state.bag.length}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s },
  horizontal: { flexDirection: "row", flexWrap: "wrap" },
  player: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    gap: space.m,
  },
  playerH: { flexGrow: 1, flexBasis: 130 },
  active: { borderColor: colors.primary, backgroundColor: "#E8F0FB" },
  name: { fontSize: font.body, color: colors.text, fontWeight: "600", flexShrink: 1 },
  score: { fontSize: font.large, color: colors.text, fontWeight: "800" },
  activeText: { color: colors.primary },
  bag: { backgroundColor: "transparent", borderStyle: "dashed" },
  bagText: { fontSize: font.small, color: colors.textMuted },
  bagLine: { flexBasis: "100%", textAlign: "center" },
});
