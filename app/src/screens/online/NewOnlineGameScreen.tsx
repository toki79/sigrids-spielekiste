import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BigButton } from "../../components/BigButton";
import type { Membership } from "../../online/session";
import { isOnline, lastSeenText, type Family } from "../../online/types";
import { colors, font, radius, space, touchMin } from "../../theme";

interface Props {
  membership: Membership;
  family: Family | null;
  busy: boolean;
  onStart: (memberIds: string[]) => void;
  onBack: () => void;
}

/** Mitspieler aus der Familie auswählen (1 bis 3). */
export function NewOnlineGameScreen({ membership, family, busy, onStart, onBack }: Props) {
  const [chosen, setChosen] = useState<string[]>([]);
  const others = (family?.members ?? []).filter((m) => m.id !== membership.memberId);

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]));

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        Mit wem möchtest du spielen?
      </Text>
      <Text style={styles.text}>Tippe auf einen oder mehrere Namen (bis zu drei).</Text>

      {others.map((m) => {
        const on = chosen.includes(m.id);
        return (
          <Pressable
            key={m.id}
            onPress={() => toggle(m.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${m.name}, ${lastSeenText(m)}`}
            style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.85 }]}
            testID={`mitspieler-${m.name}`}
          >
            <View style={[styles.check, on && styles.checkOn]}>{on && <Text style={styles.checkMark}>✓</Text>}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name}</Text>
              <View style={styles.seenRow}>
                <View style={[styles.dot, isOnline(m) ? styles.dotOn : styles.dotOff]} />
                <Text style={styles.seen}>{lastSeenText(m)}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.actions}>
        <BigButton label="Zurück" variant="secondary" onPress={onBack} style={styles.action} />
        <BigButton
          label={busy ? "Einen Moment …" : "Partie starten"}
          disabled={chosen.length === 0 || busy}
          onPress={() => onStart(chosen)}
          style={styles.action}
          testID="online-start"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.m, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  text: { fontSize: font.body, color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    minHeight: touchMin + 16,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.m,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: "#E8F0FB" },
  check: { width: 36, height: 36, borderRadius: 8, borderWidth: 3, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.primary },
  checkMark: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", lineHeight: 28 },
  name: { fontSize: font.large, fontWeight: "700", color: colors.text },
  seenRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: "#C4C4C4" },
  seen: { fontSize: font.small, color: colors.textMuted },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.m, marginTop: space.m },
  action: { flexGrow: 1, flexBasis: 200 },
});
