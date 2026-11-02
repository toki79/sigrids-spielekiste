import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { WoerterState } from "@spielestube/woerterei";
import { loadDictionary } from "./src/dictionary";
import { getGame } from "./src/game";
import { EndScreen } from "./src/screens/EndScreen";
import { GameScreen } from "./src/screens/GameScreen";
import { HandoverScreen } from "./src/screens/HandoverScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import { StartScreen } from "./src/screens/StartScreen";
import { loadGame, saveGame } from "./src/storage";
import { colors, font, space } from "./src/theme";

type Screen = "laden" | "start" | "spieler" | "uebergabe" | "spiel" | "ende";

export default function App() {
  const [screen, setScreen] = useState<Screen>("laden");
  const [game, setGame] = useState<WoerterState | null>(null);

  useEffect(() => {
    // Erst den Ladebildschirm zeigen, dann Wörterbuch und gespeicherte Partie laden.
    const t = setTimeout(async () => {
      loadDictionary();
      setGame(await loadGame());
      setScreen("start");
    }, 50);
    return () => clearTimeout(t);
  }, []);

  function update(next: WoerterState | null) {
    setGame(next);
    void saveGame(next);
  }

  function startGame(names: string[]) {
    const players = names.map((name, i) => ({ id: `s${i + 1}`, name }));
    const seed = Math.floor(Math.random() * 2 ** 31);
    update(getGame().createGame(players, seed));
    setScreen("uebergabe");
  }

  function onMove(next: WoerterState) {
    update(next);
    setScreen(next.status === "beendet" ? "ende" : "uebergabe");
  }

  let content;
  switch (screen) {
    case "laden":
      content = (
        <View style={styles.center}>
          <Text style={styles.loadingTitle}>Sigrids Spielestube</Text>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Das Wörterbuch wird geladen …</Text>
        </View>
      );
      break;
    case "start":
      content = (
        <StartScreen
          savedGame={game}
          onContinue={() => setScreen(game?.status === "beendet" ? "ende" : "uebergabe")}
          onNewGame={() => setScreen("spieler")}
        />
      );
      break;
    case "spieler":
      content = <SetupScreen onStart={startGame} onBack={() => setScreen("start")} />;
      break;
    case "uebergabe":
      content = game && <HandoverScreen state={game} onReveal={() => setScreen("spiel")} onMenu={() => setScreen("start")} />;
      break;
    case "spiel":
      content = game && <GameScreen state={game} onMove={onMove} onMenu={() => setScreen("start")} />;
      break;
    case "ende":
      content = game && (
        <EndScreen
          state={game}
          onNewGame={() => {
            update(null);
            setScreen("spieler");
          }}
          onMenu={() => {
            update(null);
            setScreen("start");
          }}
        />
      );
      break;
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? 28 : 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.l, padding: space.xl },
  loadingTitle: { fontSize: font.huge, fontWeight: "800", color: colors.text, textAlign: "center" },
  loadingText: { fontSize: font.large, color: colors.textMuted },
});
