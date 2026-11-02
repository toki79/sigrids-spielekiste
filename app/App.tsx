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
import { VoteScreen } from "./src/screens/VoteScreen";
import { loadGame, saveGame } from "./src/storage";
import { loadMembership, type Membership } from "./src/online/session";
import { OnlineArea } from "./src/screens/online/OnlineArea";
import { colors, font, space } from "./src/theme";

type Screen = "laden" | "start" | "online" | "spieler" | "uebergabe" | "spiel" | "abstimmung" | "ende";

export default function App() {
  const [screen, setScreen] = useState<Screen>("laden");
  const [game, setGame] = useState<WoerterState | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  useEffect(() => {
    // Erst den Ladebildschirm zeigen, dann Wörterbuch und gespeicherte Partie laden.
    const t = setTimeout(async () => {
      loadDictionary();
      setGame(await loadGame());
      setMembership(await loadMembership());
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

  function afterMove(next: WoerterState): Screen {
    if (next.status === "beendet") return "ende";
    if (next.wordRequest) return "abstimmung";
    return "uebergabe";
  }

  function onMove(next: WoerterState) {
    update(next);
    setScreen(afterMove(next));
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
          onlineName={membership?.name ?? null}
          onOnline={() => setScreen("online")}
          savedGame={game}
          onContinue={() => game && setScreen(afterMove(game))}
          onNewGame={() => setScreen("spieler")}
        />
      );
      break;
    case "online":
      content = <OnlineArea membership={membership} onMembershipChange={setMembership} onExit={() => setScreen("start")} />;
      break;
    case "spieler":
      content = <SetupScreen onStart={startGame} onBack={() => setScreen("start")} />;
      break;
    case "uebergabe":
      content = game && <HandoverScreen state={game} onReveal={() => setScreen("spiel")} onMenu={() => setScreen("start")} />;
      break;
    case "abstimmung": {
      const voterId = game?.wordRequest ? Object.entries(game.wordRequest.votes).find(([, v]) => v === null)?.[0] : undefined;
      content =
        game && voterId ? (
          <VoteScreen
            key={`${voterId}-${game.moveCount}`}
            state={game}
            voterId={voterId}
            handover
            onVote={(accept) => onMove(getGame().applyMove(game, voterId, { type: "abstimmen", accept }))}
            onMenu={() => setScreen("start")}
          />
        ) : null;
      break;
    }
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
