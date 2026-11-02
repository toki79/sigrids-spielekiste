import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatFamilyCode, isPlausibleFamilyCode, normalizeFamilyCode } from "@spielestube/core";
import { BigButton } from "../../components/BigButton";
import { getBackend } from "../../online/backend";
import { describeError } from "../../online/errors";
import type { Membership } from "../../online/session";
import type { Family } from "../../online/types";
import { colors, font, radius, space, touchMin } from "../../theme";

interface Props {
  /** Über einen Einladungslink geöffnet: Code ist schon bekannt. */
  invitedCode?: string | null;
  onDone: (m: Membership) => void;
  onBack: () => void;
}

type Step = "start" | "code" | "wer" | "neu" | "gruenden" | "fertig";

/** Einmalige Einrichtung: Familiencode eingeben (oder Familie gründen) und sagen, wer man ist. */
export function FamilySetupScreen({ invitedCode, onDone, onBack }: Props) {
  const [step, setStep] = useState<Step>(invitedCode ? "code" : "start");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [family, setFamily] = useState<Family | null>(null);
  const [created, setCreated] = useState<Membership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      console.warn(e);
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  const checkCode = (c: string = code) =>
    run(async () => {
      if (!isPlausibleFamilyCode(c)) {
        setError("Ein Familiencode sieht so aus: BLUME-27 (ein Wort und eine Zahl).");
        return;
      }
      const f = await getBackend().getFamily(c);
      if (!f) {
        setError(`Den Familiencode „${formatFamilyCode(c)}“ gibt es nicht. Bitte prüfe die Schreibweise.`);
        setStep("code");
        return;
      }
      setFamily(f);
      setStep("wer");
    });

  const joinAs = (memberId: string, memberName: string) =>
    run(async () => {
      const c = normalizeFamilyCode(code);
      await getBackend().joinFamily(c, { memberId });
      onDone({ code: c, memberId, name: memberName });
    });

  // Einladungslink: Code übernehmen und gleich nachschlagen
  useEffect(() => {
    if (invitedCode) {
      setCode(formatFamilyCode(invitedCode));
      void checkCode(invitedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitedCode]);

  const trimmed = name.trim();
  const nameTaken = !!family?.members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase());

  const joinNew = () =>
    run(async () => {
      const c = normalizeFamilyCode(code);
      const memberId = await getBackend().joinFamily(c, { name: trimmed });
      onDone({ code: c, memberId, name: trimmed });
    });

  const found = () =>
    run(async () => {
      const { code: c, memberId } = await getBackend().createFamily(trimmed);
      setCreated({ code: c, memberId, name: trimmed });
      setStep("fertig");
    });

  const nameInput = (
    <TextInput
      testID="eigener-name"
      value={name}
      onChangeText={setName}
      placeholder="Dein Vorname"
      placeholderTextColor="#8A8A8A"
      style={styles.input}
      autoCapitalize="words"
      autoCorrect={false}
      maxLength={16}
      accessibilityLabel="Dein Vorname"
    />
  );

  let body;
  switch (step) {
    case "start":
      body = (
        <>
          <Text style={styles.title} accessibilityRole="header">
            Online mit der Familie
          </Text>
          <Text style={styles.text}>
            So spielt jeder an seinem eigenen Handy oder Tablet. Dafür braucht eure Familie einen gemeinsamen Familiencode – das
            muss nur einmal eingerichtet werden.
          </Text>
          <BigButton label="Ich habe einen Familiencode" onPress={() => setStep("code")} testID="habe-code" />
          <BigButton label="Neue Familie gründen" variant="secondary" onPress={() => setStep("gruenden")} testID="gruenden" />
          <BigButton label="Zurück" variant="secondary" onPress={onBack} />
        </>
      );
      break;
    case "code":
      body = (
        <>
          <Text style={styles.title}>Familiencode eingeben</Text>
          <Text style={styles.text}>Den Code bekommst du von dem Familienmitglied, das die Familie gegründet hat.</Text>
          <TextInput
            testID="code"
            value={code}
            onChangeText={setCode}
            placeholder="z. B. BLUME-27"
            placeholderTextColor="#8A8A8A"
            style={[styles.input, styles.codeInput]}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            accessibilityLabel="Familiencode"
            onSubmitEditing={() => checkCode()}
          />
          <BigButton label={busy ? "Einen Moment …" : "Weiter"} disabled={busy || !code.trim()} onPress={() => checkCode()} testID="code-weiter" />
          <BigButton label="Zurück" variant="secondary" onPress={() => setStep("start")} />
        </>
      );
      break;
    case "wer":
      body = (
        <>
          {invitedCode && (
            <Text style={styles.invited}>Du wurdest in die Familie {formatFamilyCode(invitedCode)} eingeladen. Schön, dass du dabei bist!</Text>
          )}
          <Text style={styles.title}>Wer bist du?</Text>
          {family && family.members.length > 0 && (
            <>
              <Text style={styles.text}>
                Spielst du schon auf einem anderen Handy oder Tablet mit? Dann tippe auf deinen Namen – du siehst hier dieselben Partien.
              </Text>
              {family.members.map((m) => (
                <BigButton key={m.id} label={`Ich bin ${m.name}`} variant="secondary" disabled={busy} onPress={() => joinAs(m.id, m.name)} />
              ))}
            </>
          )}
          <BigButton label="Ich bin neu dabei" disabled={busy} onPress={() => setStep("neu")} testID="neu-dabei" />
        </>
      );
      break;
    case "neu":
      body = (
        <>
          <Text style={styles.title}>Wie heißt du?</Text>
          <Text style={styles.text}>So sehen dich die anderen in der Familie.</Text>
          {nameInput}
          {nameTaken && <Text style={styles.warn}>Diesen Namen gibt es schon. Bist du das? Dann gehe zurück und tippe auf deinen Namen.</Text>}
          <BigButton label={busy ? "Einen Moment …" : "Weiter"} disabled={busy || !trimmed || nameTaken} onPress={joinNew} testID="name-weiter" />
          <BigButton label="Zurück" variant="secondary" onPress={() => setStep("wer")} />
        </>
      );
      break;
    case "gruenden":
      body = (
        <>
          <Text style={styles.title}>Neue Familie gründen</Text>
          <Text style={styles.text}>Wie heißt du? Danach bekommst du einen Familiencode, den du an deine Familie weitergibst.</Text>
          {nameInput}
          <BigButton label={busy ? "Einen Moment …" : "Familie gründen"} disabled={busy || !trimmed} onPress={found} testID="gruenden-ok" />
          <BigButton label="Zurück" variant="secondary" onPress={() => setStep("start")} />
        </>
      );
      break;
    case "fertig":
      body = created && (
        <>
          <Text style={styles.title}>Geschafft!</Text>
          <Text style={styles.text}>Euer Familiencode lautet:</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeBig} testID="neuer-code" selectable>
              {formatFamilyCode(created.code)}
            </Text>
          </View>
          <Text style={styles.text}>
            Gib diesen Code an deine Familie weiter – zum Beispiel am Telefon. Sie tippen ihn beim ersten Start unter „Ich habe einen
            Familiencode“ ein. Du findest ihn später auch unter „Meine Partien“.
          </Text>
          <BigButton label="Weiter" onPress={() => onDone(created)} testID="fertig-weiter" />
        </>
      );
      break;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        {body}
        {error && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.l, maxWidth: 640, width: "100%", alignSelf: "center" },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  text: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  input: {
    minHeight: touchMin,
    fontSize: font.large,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: space.m,
  },
  codeInput: { fontSize: font.title, letterSpacing: 2, textAlign: "center" },
  codeBox: { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 3, borderRadius: radius, padding: space.l },
  codeBig: { fontSize: 44, fontWeight: "800", color: colors.primary, textAlign: "center", letterSpacing: 3 },
  invited: { fontSize: font.large, color: colors.success, fontWeight: "700", lineHeight: font.large * 1.35 },
  warn: { fontSize: font.body, color: colors.danger, fontWeight: "600" },
  errorBox: { backgroundColor: colors.errorBg, borderColor: "#E79A93", borderWidth: 2, borderRadius: radius, padding: space.m },
  errorText: { fontSize: font.body, color: colors.text, fontWeight: "600", lineHeight: font.body * 1.35 },
});
