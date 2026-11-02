import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BigButton } from "../components/BigButton";
import { colors, font, radius, space, touchMin } from "../theme";

interface Props {
  /** Name des Spiels, z. B. „Wörterei“. */
  gameTitle?: string;
  onStart: (names: string[]) => void;
  onBack: () => void;
}

/** Spieler eintragen: 2 bis 4 Namen. */
export function SetupScreen({ gameTitle, onStart, onBack }: Props) {
  const [names, setNames] = useState<string[]>(["", ""]);
  const filled = names.map((n) => n.trim()).filter(Boolean);
  const duplicate = new Set(filled.map((n) => n.toLowerCase())).size !== filled.length;
  const ready = filled.length >= 2 && filled.length === names.length && !duplicate;

  const update = (i: number, value: string) => setNames((prev) => prev.map((n, j) => (j === i ? value : n)));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          {gameTitle ? `${gameTitle}: Wer spielt mit?` : "Wer spielt mit?"}
        </Text>
        <Text style={styles.text}>Tragt eure Namen in der Reihenfolge ein, in der ihr am Tisch sitzt.</Text>

        {names.map((name, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.label}>Spieler {i + 1}</Text>
            <View style={styles.inputRow}>
              <TextInput
                testID={`name-${i}`}
                value={name}
                onChangeText={(v) => update(i, v)}
                placeholder="Name"
                placeholderTextColor="#8A8A8A"
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={16}
                returnKeyType="done"
                accessibilityLabel={`Name von Spieler ${i + 1}`}
              />
              {names.length > 2 && (
                <BigButton
                  label="Entfernen"
                  variant="secondary"
                  compact
                  onPress={() => setNames((prev) => prev.filter((_, j) => j !== i))}
                />
              )}
            </View>
          </View>
        ))}

        {names.length < 4 && (
          <BigButton label="Weiteren Spieler hinzufügen" variant="secondary" onPress={() => setNames((p) => [...p, ""])} />
        )}

        {duplicate && <Text style={styles.warn}>Jeder Name darf nur einmal vorkommen.</Text>}

        <View style={styles.actions}>
          <BigButton label="Zurück" variant="secondary" onPress={onBack} style={styles.action} />
          <BigButton label="Partie starten" disabled={!ready} onPress={() => onStart(filled)} style={styles.action} testID="start" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.l, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  text: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  row: { gap: space.xs },
  label: { fontSize: font.body, fontWeight: "700", color: colors.text },
  inputRow: { flexDirection: "row", gap: space.s, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: touchMin,
    fontSize: font.large,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.m,
  },
  warn: { fontSize: font.body, color: colors.danger, fontWeight: "600" },
  actions: { flexDirection: "row", gap: space.m, flexWrap: "wrap", marginTop: space.m },
  action: { flexGrow: 1, flexBasis: 200 },
});
