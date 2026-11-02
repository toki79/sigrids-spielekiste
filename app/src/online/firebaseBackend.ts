/**
 * Online-Modus über Firebase (Spark-Tarif, kostenlos).
 *
 * Datenmodell in Firestore:
 *   families/{CODE}                 code, createdAt, uids[], members{ id: {name, lastSeen} }
 *   families/{CODE}/games/{id}      stateJson, playerIds[], turnId, status, moveCount, updatedAt
 *
 * Der Spielzustand wird als JSON-Text gespeichert: So bleibt er exakt so,
 * wie ihn die Spiellogik erzeugt (Firestore kennt z. B. keine Listen in Listen).
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { onAuthStateChanged, signInAnonymously, type Auth } from "firebase/auth";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { generateFamilyCode, normalizeFamilyCode } from "@spielestube/core";
import type { AnyState } from "../games/registry";
import { createAuth } from "./firebaseAuth";
import { firebaseConfig } from "./firebaseConfig";
import { gameFields, newId, type Family, type GameDraft, type OnlineBackend, type OnlineGame } from "./types";

function toFamily(code: string, data: DocumentData | undefined): Family | null {
  if (!data) return null;
  const members = Object.entries((data.members ?? {}) as Record<string, { name: string; lastSeen?: number }>).map(([id, m]) => ({
    id,
    name: m.name,
    lastSeen: typeof m.lastSeen === "number" ? m.lastSeen : null,
  }));
  members.sort((a, b) => a.name.localeCompare(b.name, "de"));
  return { code, members };
}

function toGame(code: string, id: string, data: DocumentData | undefined): OnlineGame | null {
  if (!data || typeof data.stateJson !== "string") return null;
  try {
    const state = JSON.parse(data.stateJson) as AnyState;
    return {
      id,
      familyCode: code,
      gameType: state.game ?? data.gameType ?? "woerterei",
      playerIds: data.playerIds ?? state.players.map((p) => p.id),
      turnId: data.turnId ?? null,
      status: data.status === "beendet" ? "beendet" : "laeuft",
      moveCount: data.moveCount ?? state.moveCount,
      updatedAt: data.updatedAt ?? 0,
      state,
      draft: typeof data.draftJson === "string" ? (JSON.parse(data.draftJson) as GameDraft) : null,
    };
  } catch {
    return null;
  }
}

export class FirebaseBackend implements OnlineBackend {
  readonly kind = "firebase" as const;
  private app: FirebaseApp;
  private auth: Auth;
  private db: Firestore;
  private uidPromise: Promise<string> | null = null;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.auth = createAuth(this.app);
    // Lange Abfragen statt Streaming, wo nötig – zuverlässiger in Mobilfunknetzen und auf Android.
    this.db = initializeFirestore(this.app, { experimentalAutoDetectLongPolling: true });
  }

  signIn(): Promise<string> {
    if (!this.uidPromise) {
      this.uidPromise = new Promise<string>((resolve, reject) => {
        const unsub = onAuthStateChanged(
          this.auth,
          (user) => {
            if (user) {
              unsub();
              resolve(user.uid);
            }
          },
          reject,
        );
        // Wenn nach dem Laden niemand angemeldet ist: anonym anmelden.
        void this.auth.authStateReady().then(() => {
          if (!this.auth.currentUser) signInAnonymously(this.auth).catch(reject);
        });
      }).catch((e) => {
        this.uidPromise = null;
        throw e;
      });
    }
    return this.uidPromise;
  }

  async createFamily(founderName: string): Promise<{ code: string; memberId: string }> {
    const uid = await this.signIn();
    const memberId = newId();
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateFamilyCode();
      const ref = doc(this.db, "families", code);
      const created = await runTransaction(this.db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) return false; // Code schon vergeben → neuer Versuch
        tx.set(ref, {
          code,
          createdAt: Date.now(),
          uids: [uid],
          members: { [memberId]: { name: founderName.trim(), lastSeen: Date.now() } },
        });
        return true;
      });
      if (created) return { code, memberId };
    }
    throw new Error("Es konnte kein freier Familiencode gefunden werden. Bitte versuche es noch einmal.");
  }

  async getFamily(code: string): Promise<Family | null> {
    await this.signIn();
    const c = normalizeFamilyCode(code);
    if (!c) return null;
    const snap = await getDoc(doc(this.db, "families", c));
    return toFamily(c, snap.data());
  }

  async joinFamily(code: string, as: { memberId: string } | { name: string }): Promise<string> {
    const uid = await this.signIn();
    const c = normalizeFamilyCode(code);
    const ref = doc(this.db, "families", c);
    if ("memberId" in as) {
      await updateDoc(ref, { uids: arrayUnion(uid), [`members.${as.memberId}.lastSeen`]: Date.now() });
      return as.memberId;
    }
    const memberId = newId();
    await updateDoc(ref, {
      uids: arrayUnion(uid),
      [`members.${memberId}`]: { name: as.name.trim(), lastSeen: Date.now() },
    });
    return memberId;
  }

  watchFamily(code: string, onChange: (family: Family | null) => void) {
    const c = normalizeFamilyCode(code);
    return onSnapshot(
      doc(this.db, "families", c),
      (snap) => onChange(toFamily(c, snap.data())),
      () => onChange(null),
    );
  }

  async touchPresence(code: string, memberId: string): Promise<void> {
    await updateDoc(doc(this.db, "families", normalizeFamilyCode(code)), { [`members.${memberId}.lastSeen`]: Date.now() });
  }

  async createGame(code: string, state: AnyState): Promise<string> {
    const id = newId();
    const now = Date.now();
    await setDoc(doc(this.db, "families", normalizeFamilyCode(code), "games", id), {
      ...gameFields(state),
      stateJson: JSON.stringify(state),
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  watchGames(code: string, memberId: string, onChange: (games: OnlineGame[]) => void) {
    const c = normalizeFamilyCode(code);
    const q = query(collection(this.db, "families", c, "games"), where("playerIds", "array-contains", memberId));
    return onSnapshot(
      q,
      (snap) => {
        const games = snap.docs.map((d) => toGame(c, d.id, d.data())).filter((g): g is OnlineGame => g !== null);
        games.sort((a, b) => b.updatedAt - a.updatedAt);
        onChange(games);
      },
      (e) => console.warn("Partien konnten nicht geladen werden", e),
    );
  }

  watchFamilyGames(code: string, onChange: (games: OnlineGame[]) => void) {
    const c = normalizeFamilyCode(code);
    return onSnapshot(
      collection(this.db, "families", c, "games"),
      (snap) => onChange(snap.docs.map((d) => toGame(c, d.id, d.data())).filter((g): g is OnlineGame => g !== null)),
      (e) => console.warn("Statistik konnte nicht geladen werden", e),
    );
  }

  watchGame(code: string, gameId: string, onChange: (game: OnlineGame | null) => void) {
    const c = normalizeFamilyCode(code);
    return onSnapshot(
      doc(this.db, "families", c, "games", gameId),
      (snap) => onChange(toGame(c, gameId, snap.data())),
      () => onChange(null),
    );
  }

  async submitMove(code: string, gameId: string, expectedMoveCount: number, next: AnyState) {
    const ref = doc(this.db, "families", normalizeFamilyCode(code), "games", gameId);
    return runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data().moveCount !== expectedMoveCount) return "conflict" as const;
      tx.update(ref, { ...gameFields(next), stateJson: JSON.stringify(next), draftJson: null, updatedAt: Date.now() });
      return "ok" as const;
    });
  }

  async updateDraft(code: string, gameId: string, draft: GameDraft | null): Promise<void> {
    // Nur das Entwurfsfeld – updatedAt bleibt, damit die Partienliste nicht ständig umsortiert wird.
    await updateDoc(doc(this.db, "families", normalizeFamilyCode(code), "games", gameId), {
      draftJson: draft ? JSON.stringify(draft) : null,
    });
  }

  async deleteGame(code: string, gameId: string): Promise<void> {
    await deleteDoc(doc(this.db, "families", normalizeFamilyCode(code), "games", gameId));
  }
}
