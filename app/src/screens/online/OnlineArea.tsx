import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import type { WoerterState } from "@spielestube/woerterei";
import type { RommeState } from "@spielestube/zahlenromme";
import { GAME_LIST, GAMES, type AnyState, type GameStats, type GameType } from "../../games/registry";
import { BigButton } from "../../components/BigButton";
import { Dialog } from "../../components/Dialog";
import { getGame } from "../../game";
import { getBackend } from "../../online/backend";
import { describeError } from "../../online/errors";
import { gameMessage, shareInvite, shareText } from "../../online/invite";
import { formatFamilyCode } from "@spielestube/core";
import { saveMembership, type Membership } from "../../online/session";
import { isOnline, type Family, type OnlineGame } from "../../online/types";
import { colors, font, space } from "../../theme";
import { EndScreen } from "../EndScreen";
import { VoteScreen } from "../VoteScreen";
import { StatsScreen } from "./StatsScreen";
import { GameScreen } from "../GameScreen";
import { RommeScreen } from "../RommeScreen";
import { FamilySetupScreen } from "./FamilySetupScreen";
import { NewOnlineGameScreen } from "./NewOnlineGameScreen";
import { OnlineHomeScreen } from "./OnlineHomeScreen";

interface Props {
  membership: Membership | null;
  /** Familiencode aus einem Einladungslink (wird nach Verwendung verworfen). */
  invitedCode?: string | null;
  onInviteHandled?: () => void;
  /** Partie aus einem Partie-Link: nach dem Anmelden direkt öffnen. */
  openGame?: { code: string; id: string } | null;
  onOpenGameHandled?: () => void;
  onMembershipChange: (m: Membership | null) => void;
  onExit: () => void;
}

type View_ = { kind: "home" } | { kind: "new" } | { kind: "stats" } | { kind: "game"; id: string };

/** Online-Modus: Einrichtung, „Meine Partien“, neue Partie, laufende Partie. */
export function OnlineArea({ membership, invitedCode, onInviteHandled, openGame, onOpenGameHandled, onMembershipChange, onExit }: Props) {
  const [view, setView] = useState<View_>({ kind: "home" });
  const [family, setFamily] = useState<Family | null>(null);
  const [games, setGames] = useState<OnlineGame[] | null>(null);
  const [familyGames, setFamilyGames] = useState<OnlineGame[] | null>(null);
  const [problem, setProblem] = useState<string | false>(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Anmelden, Mitgliedschaft auf diesem Gerät bestätigen, Familie und Partien beobachten
  useEffect(() => {
    if (!membership) return;
    const backend = getBackend();
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    (async () => {
      try {
        await backend.signIn();
        // Stellt sicher, dass dieses Gerät (auch nach Neuinstallation) zur Familie gehört.
        await backend.joinFamily(membership.code, { memberId: membership.memberId });
        if (cancelled) return;
        setProblem(false);
        unsubs.push(backend.watchFamily(membership.code, setFamily));
        unsubs.push(backend.watchFamilyGames(membership.code, setFamilyGames));
        unsubs.push(
          backend.watchGames(membership.code, membership.memberId, (g) => {
            setGames(g);
            setProblem(false);
          }),
        );
      } catch (e) {
        console.warn(e);
        if (!cancelled) setProblem(describeError(e));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [membership?.code, membership?.memberId]);

  // Partie-Link: sobald dieses Gerät in der richtigen Familie ist, die Partie öffnen
  useEffect(() => {
    if (!openGame || !membership || !ready) return;
    if (openGame.code === membership.code) setView({ kind: "game", id: openGame.id });
    onOpenGameHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openGame?.id, membership?.code, ready]);

  // „Gerade da“: jede Minute melden, solange die App im Vordergrund ist
  useEffect(() => {
    if (!membership || !ready) return;
    const touch = () => void getBackend().touchPresence(membership.code, membership.memberId).catch((e) => setProblem(describeError(e)));
    touch();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") touch();
    }, 60_000);
    const sub = AppState.addEventListener("change", (s) => s === "active" && touch());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [membership?.code, membership?.memberId, ready]);

  // Laufende Partie live beobachten
  const [game, setGame] = useState<OnlineGame | null | undefined>(undefined);
  const gameId = view.kind === "game" ? view.id : null;
  useEffect(() => {
    if (!membership || !gameId) return;
    setGame(undefined);
    return getBackend().watchGame(membership.code, gameId, setGame);
  }, [membership?.code, gameId]);

  const stats = useMemo(() => {
    if (!familyGames) return null;
    const out = {} as Record<GameType, GameStats>;
    for (const g of GAME_LIST) out[g.type] = g.stats(familyGames.filter((x) => x.state.game === g.type).map((x) => x.state));
    return out;
  }, [familyGames]);

  // Eigene Rommé-Versuche gedrosselt übertragen (höchstens etwa alle 0,7 Sekunden)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftPending = useRef<{ table: number[][] | null; moveCount: number } | null>(null);
  const draftLastSent = useRef(0);
  const sendDraft = useCallback(
    (table: number[][] | null, moveCount: number) => {
      if (!membership || !gameId) return;
      draftPending.current = { table, moveCount };
      const flush = () => {
        draftTimer.current = null;
        const p = draftPending.current;
        if (!p) return;
        draftPending.current = null;
        draftLastSent.current = Date.now();
        void getBackend()
          .updateDraft(membership.code, gameId, p.table ? { by: membership.memberId, moveCount: p.moveCount, table: p.table } : null)
          .catch(() => {});
      };
      if (draftTimer.current) return;
      const wait = Math.max(0, 700 - (Date.now() - draftLastSent.current));
      draftTimer.current = setTimeout(flush, wait);
    },
    [membership?.code, membership?.memberId, gameId],
  );
  useEffect(() => () => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
  }, []);

  const onlineIds = useMemo(() => new Set((family?.members ?? []).filter((m) => isOnline(m)).map((m) => m.id)), [family]);

  if (!membership) {
    return (
      <FamilySetupScreen
        invitedCode={invitedCode}
        onDone={(m) => {
          onInviteHandled?.();
          void saveMembership(m);
          onMembershipChange(m);
          setView({ kind: "home" });
        }}
        onBack={onExit}
      />
    );
  }

  async function startGame(gameType: GameType, memberIds: string[]) {
    if (!membership) return;
    setBusy(true);
    try {
      const names = new Map((family?.members ?? []).map((m) => [m.id, m.name]));
      const players = [membership.memberId, ...memberIds].map((id) => ({ id, name: names.get(id) ?? membership.name }));
      const state = GAMES[gameType].create(players, Math.floor(Math.random() * 2 ** 31));
      const id = await getBackend().createGame(membership.code, state);
      setView({ kind: "game", id });
    } catch (e) {
      console.warn(e);
      setNotice(`Die Partie konnte nicht gestartet werden.\n\n${describeError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function shareGame(g: OnlineGame) {
    if (!membership) return;
    const next = g.state.status === "laeuft" ? (g.state.players[g.state.turn]?.name ?? null) : null;
    const res = await shareText(gameMessage(membership.code, g.id, membership.name, GAMES[g.state.game].title, next), "Link zur Partie");
    if (res === "kopiert") setNotice("Der Link zur Partie ist kopiert. Füge ihn z. B. in WhatsApp ein.");
  }

  async function submit(g: OnlineGame, next: AnyState) {
    if (!membership) return;
    setBusy(true);
    try {
      const res = await getBackend().submitMove(membership.code, g.id, g.moveCount, next);
      if (res === "conflict") setNotice("Die Partie hat sich inzwischen verändert. Bitte schau noch einmal aufs Brett und lege dann erneut.");
    } catch (e) {
      console.warn(e);
      setNotice(`Dein Zug konnte nicht gespeichert werden.\n\n${describeError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  let content;
  if (view.kind === "home") {
    content = (
      <OnlineHomeScreen
        membership={membership}
        family={family}
        games={games}
        connectionProblem={problem}
        onOpenGame={(id) => setView({ kind: "game", id })}
        onShareGame={(g) => void shareGame(g)}
        onNewGame={() => setView({ kind: "new" })}
        onStats={() => setView({ kind: "stats" })}
        onInvite={async () => {
          const res = await shareInvite(membership.code, membership.name);
          if (res === "kopiert") setNotice("Die Einladung ist kopiert. Füge sie z. B. in WhatsApp oder eine E-Mail ein.");
          else if (res === "nichts" && typeof navigator !== "undefined" && !navigator.share)
            setNotice("Bitte kopiere den Link unter dem Familiencode und schicke ihn weiter.");
        }}
        champions={
          stats
            ? GAME_LIST.filter((g) => stats[g.type].finishedGames > 0).map((g) => ({
                title: g.title,
                icon: g.icon,
                names: stats[g.type].ranking.filter((r) => r.rank === 1).map((r) => r.name),
              }))
            : []
        }
        onBack={onExit}
        onLeave={() => setConfirmLeave(true)}
      />
    );
  } else if (view.kind === "stats") {
    content = (
      <StatsScreen
        stats={stats}
        meId={membership.memberId}
        onBack={() => setView({ kind: "home" })}
      />
    );
  } else if (view.kind === "new") {
    content = (
      <NewOnlineGameScreen
        membership={membership}
        family={family}
        busy={busy}
        onStart={startGame}
        onBack={() => setView({ kind: "home" })}
      />
    );
  } else if (game === undefined) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Die Partie wird geladen …</Text>
      </View>
    );
  } else if (game === null) {
    content = (
      <View style={styles.center}>
        <Text style={styles.text}>Diese Partie gibt es nicht mehr.</Text>
        <BigButton label="Zu meinen Partien" onPress={() => setView({ kind: "home" })} />
      </View>
    );
  } else if (!game.playerIds.includes(membership.memberId)) {
    content = (
      <View style={styles.center}>
        <Text style={styles.text}>
          In dieser Partie spielen {game.state.players.map((p) => p.name).join(" und ")}. Du bist hier nicht dabei – starte doch eine eigene
          Partie!
        </Text>
        <BigButton label="Zu meinen Partien" onPress={() => setView({ kind: "home" })} />
      </View>
    );
  } else if (game.status === "beendet") {
    content = (
      <EndScreen
        state={game.state}
        newGameLabel="Neue Partie starten"
        menuLabel="Zu meinen Partien"
        onNewGame={() => setView({ kind: "new" })}
        onMenu={() => setView({ kind: "home" })}
      />
    );
  } else if (game.state.game === "zahlenromme") {
    content = (
      <RommeScreen
        state={game.state as RommeState}
        liveDraft={
          game.draft && game.draft.by === game.turnId && game.draft.moveCount === game.moveCount && game.draft.by !== membership.memberId
            ? game.draft.table
            : null
        }
        onDraftChange={(table) => sendDraft(table, game.moveCount)}
        onShare={() => void shareGame(game)}
        viewerId={membership.memberId}
        onlineIds={onlineIds}
        busy={busy}
        onMove={(next) => void submit(game, next)}
        onMenu={() => setView({ kind: "home" })}
      />
    );
  } else if (game.state.wordRequest && game.state.wordRequest.votes[membership.memberId] === null) {
    // Ich soll über ein Wort entscheiden
    content = (
      <VoteScreen
        state={game.state}
        voterId={membership.memberId}
        busy={busy}
        menuLabel="Zu meinen Partien"
        onVote={(accept) =>
          void submit(game, getGame().applyMove(game.state as WoerterState, membership.memberId, { type: "abstimmen", accept }))
        }
        onMenu={() => setView({ kind: "home" })}
      />
    );
  } else {
    content = (
      <GameScreen
        onShare={() => void shareGame(game)}
        state={game.state as WoerterState}
        viewerId={membership.memberId}
        onlineIds={onlineIds}
        busy={busy}
        onMove={(next) => void submit(game, next)}
        onMenu={() => setView({ kind: "home" })}
      />
    );
  }

  return (
    <>
      {content}
      <Dialog
        visible={!!invitedCode && invitedCode !== membership.code}
        title="Einladung in eine andere Familie"
        message={`Du wurdest in die Familie ${formatFamilyCode(invitedCode ?? "")} eingeladen. Auf diesem Gerät spielst du bisher in der Familie ${formatFamilyCode(membership.code)}. Möchtest du wechseln? Deine bisherigen Partien bleiben dort erhalten.`}
        confirmLabel="Ja, wechseln"
        onConfirm={() => {
          void saveMembership(null);
          setFamily(null);
          setGames(null);
          setFamilyGames(null);
          setView({ kind: "home" });
          onMembershipChange(null);
        }}
        onCancel={() => onInviteHandled?.()}
      />
      <Dialog visible={!!notice} title="Hinweis" message={notice ?? ""} cancelLabel="OK" onCancel={() => setNotice(null)} />
      <Dialog
        visible={confirmLeave}
        title="Auf diesem Gerät abmelden?"
        message="Deine Partien bleiben erhalten. Um wieder mitzuspielen, gibst du den Familiencode erneut ein und tippst auf deinen Namen."
        confirmLabel="Abmelden"
        danger
        onConfirm={() => {
          setConfirmLeave(false);
          void saveMembership(null);
          onMembershipChange(null);
          setFamily(null);
          setGames(null);
          onExit();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.l, padding: space.xl },
  text: { fontSize: font.large, color: colors.text, textAlign: "center" },
});
