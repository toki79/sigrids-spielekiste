import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { RommeState } from "@spielestube/zahlenromme";
import { loadDictionary } from "./src/dictionary";
import { getGame } from "./src/game";
import { GAMES, GAME_LIST, type AnyState, type GameType } from "./src/games/registry";
import { EndScreen } from "./src/screens/EndScreen";
import { GameScreen } from "./src/screens/GameScreen";
import { HandoverScreen } from "./src/screens/HandoverScreen";
import { RommeScreen } from "./src/screens/RommeScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import { StartScreen } from "./src/screens/StartScreen";
import { VoteScreen } from "./src/screens/VoteScreen";
import { loadGame, saveGame } from "./src/storage";
import { loadMembership, type Membership } from "./src/online/session";
import { clearInviteFromAddressBar, parseGameId, parseInvite } from "./src/online/invite";
import { OnlineArea } from "./src/screens/online/OnlineArea";
import { colors, font, space } from "./src/theme";

type Screen = "laden" | "start" | "online" | "spieler" | "uebergabe" | "spiel" | "abstimmung" | "ende";

export default function App() {
  const [screen, setScreen] = useState<Screen>("laden");
  /** Gespeicherte Partien am selben Gerät, je Spiel. */
  const [saved, setSaved] = useState<Partial<Record<GameType, AnyState | null>>>({});
  /** Welches Spiel läuft gerade am selben Gerät? */
  const [active, setActive] = useState<GameType>("woerterei");
  const [membership, setMembership] = useState<Membership | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  /** Partie aus einem Partie-Link, die direkt geöffnet werden soll. */
  const [openGame, setOpenGame] = useState<{ code: string; id: string } | null>(null);
  const game = saved[active] ?? null;

  useEffect(() => {
    // Erst den Ladebildschirm zeigen, dann Wörterbuch und gespeicherte Partien laden.
    const t = setTimeout(async () => {
      loadDictionary();
      const loaded: Partial<Record<GameType, AnyState | null>> = {};
      for (const g of GAME_LIST) loaded[g.type] = await loadGame(g.type);
      setSaved(loaded);
      const m = await loadMembership();
      setMembership(m);
      // Über einen Einladungslink geöffnet?
      const url = await Linking.getInitialURL().catch(() => null);
      const code = parseInvite(url);
      const gameId = parseGameId(url);
      clearInviteFromAddressBar();
      if (code && code !== m?.code) setInvite(code);
      if (code && gameId) setOpenGame({ code, id: gameId });
      setScreen(code ? "online" : "start");
    }, 50);
    return () => clearTimeout(t);
  }, []);

  // Einladungslink, während die App schon läuft (Android/iOS)
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      const code = parseInvite(url);
      const gameId = parseGameId(url);
      if (code) {
        setInvite(code);
        if (gameId) setOpenGame({ code, id: gameId });
        setScreen("online");
      }
    });
    return () => sub.remove();
  }, []);

  function update(type: GameType, next: AnyState | null) {
    setSaved((s) => ({ ...s, [type]: next }));
    void saveGame(type, next);
  }

  function startGame(names: string[]) {
    const players = names.map((name, i) => ({ id: `s${i + 1}`, name }));
    const seed = Math.floor(Math.random() * 2 ** 31);
    update(active, GAMES[active].create(players, seed));
    setScreen("uebergabe");
  }

  function afterMove(next: AnyState): Screen {
    if (next.status === "beendet") return "ende";
    if (next.game === "woerterei" && next.wordRequest) return "abstimmung";
    return "uebergabe";
  }

  function onMove(next: AnyState) {
    update(next.game, next);
    setScreen(afterMove(next));
  }

  let content;
  switch (screen) {
    case "laden":
      content = (
        <View style={styles.center}>
          <Text style={styles.loadingTitle}>Sigrids Spielestube</Text>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Die Spiele werden geladen …</Text>
        </View>
      );
      break;
    case "start":
      content = (
        <StartScreen
          onlineName={membership?.name ?? null}
          onOnline={() => setScreen("online")}
          saved={saved}
          onContinue={(type) => {
            const s = saved[type];
            if (!s) return;
            setActive(type);
            setScreen(afterMove(s));
          }}
          onNewGame={(type) => {
            setActive(type);
            setScreen("spieler");
          }}
        />
      );
      break;
    case "online":
      content = (
        <OnlineArea
          membership={membership}
          invitedCode={invite && invite !== membership?.code ? invite : null}
          onInviteHandled={() => setInvite(null)}
          openGame={openGame}
          onOpenGameHandled={() => setOpenGame(null)}
          onMembershipChange={setMembership}
          onExit={() => setScreen("start")}
        />
      );
      break;
    case "spieler":
      content = <SetupScreen gameTitle={GAMES[active].title} onStart={startGame} onBack={() => setScreen("start")} />;
      break;
    case "uebergabe":
      content = game && <HandoverScreen state={game} onReveal={() => setScreen("spiel")} onMenu={() => setScreen("start")} />;
      break;
    case "abstimmung": {
      const w = game?.game === "woerterei" ? game : null;
      const voterId = w?.wordRequest ? Object.entries(w.wordRequest.votes).find(([, v]) => v === null)?.[0] : undefined;
      content =
        w && voterId ? (
          <VoteScreen
            key={`${voterId}-${w.moveCount}`}
            state={w}
            voterId={voterId}
            handover
            onVote={(accept) => onMove(getGame().applyMove(w, voterId, { type: "abstimmen", accept }))}
            onMenu={() => setScreen("start")}
          />
        ) : null;
      break;
    }
    case "spiel":
      content = !game ? null : game.game === "zahlenromme" ? (
        <RommeScreen state={game as RommeState} onMove={onMove} onMenu={() => setScreen("start")} />
      ) : (
        <GameScreen state={game} onMove={onMove} onMenu={() => setScreen("start")} />
      );
      break;
    case "ende":
      content = game && (
        <EndScreen
          state={game}
          onNewGame={() => {
            update(active, null);
            setScreen("spieler");
          }}
          onMenu={() => {
            update(active, null);
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
