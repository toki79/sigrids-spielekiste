import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { checkPlay, type WoerterState } from "@spielestube/woerterei";
import { BigButton } from "../components/BigButton";
import { Board } from "../components/Board";
import { loadDictionary } from "../dictionary";
import { playerName, points, quoteWords } from "../texts";
import { colors, font, radius, space } from "../theme";

interface Props {
  state: WoerterState;
  /** Wer stimmt jetzt ab? */
  voterId: string;
  /** Am selben Gerät: erst „Gib das Tablet an …“ zeigen. */
  handover?: boolean;
  busy?: boolean;
  onVote: (accept: boolean) => void;
  onMenu: () => void;
  menuLabel?: string;
}

/** Ein Mitspieler entscheidet, ob ein Wort gilt, das nicht im Wörterbuch steht. */
export function VoteScreen({ state, voterId, handover, busy, onVote, onMenu, menuLabel = "Zum Hauptmenü" }: Props) {
  const { width, height } = useWindowDimensions();
  const [revealed, setRevealed] = useState(!handover);
  const req = state.wordRequest!;
  const voter = playerName(state, voterId);
  const asker = playerName(state, req.playerId);

  if (!revealed) {
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.big} accessibilityRole="header">
          {voter} soll entscheiden.
        </Text>
        <Text style={styles.text}>
          {asker} möchte ein Wort legen, das nicht in unserem Wörterbuch steht. Bitte gib das Tablet an {voter}.
        </Text>
        <BigButton label={`Ich bin ${voter}`} onPress={() => setRevealed(true)} testID="ich-stimme" />
      </ScrollView>
    );
  }

  // Punkte, die der Zug bringen würde, wenn das Wort gilt
  const preview = checkPlay(state.board, req.placements, {
    dictionary: loadDictionary(),
    extraWords: [...state.extraWords, ...req.words],
  });
  const boardSize = Math.min(width - 24, height * 0.45, 520);
  const one = req.words.length === 1;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        {one ? "Gilt dieses Wort?" : "Gelten diese Wörter?"}
      </Text>
      <Text style={styles.text}>
        {asker} möchte {quoteWords(req.words)} legen. {one ? "Es steht" : "Sie stehen"} nicht in unserem Wörterbuch.
        {preview.ok ? ` Der Zug würde ${points(preview.evaluation.score)} bringen.` : ""}
      </Text>
      <View style={styles.words}>
        {req.words.map((w) => (
          <Text key={w} style={styles.word}>
            {w}
          </Text>
        ))}
      </View>
      <Board board={state.board} pending={req.placements} size={boardSize} />
      <Text style={styles.hint}>
        {voter}, du entscheidest: Sagst du Ja, wird der Zug gelegt. Sagst du Nein, ist {asker} noch einmal dran.
      </Text>
      <View style={styles.buttons}>
        <BigButton label="Ja, das gilt" disabled={busy} onPress={() => onVote(true)} style={styles.button} testID="ja" />
        <BigButton label="Nein, das gilt nicht" variant="danger" disabled={busy} onPress={() => onVote(false)} style={styles.button} testID="nein" />
      </View>
      <BigButton label={menuLabel} variant="secondary" compact onPress={onMenu} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.l, gap: space.l, maxWidth: 640, width: "100%", alignSelf: "center" },
  big: { fontSize: font.huge, fontWeight: "800", color: colors.primary, textAlign: "center", marginTop: space.xl },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  text: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  hint: { fontSize: font.body, color: colors.textMuted, lineHeight: font.body * 1.4 },
  words: { flexDirection: "row", flexWrap: "wrap", gap: space.s, justifyContent: "center" },
  word: {
    fontSize: font.huge,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 2,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
  },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: space.m },
  button: { flexGrow: 1, flexBasis: 220 },
});
