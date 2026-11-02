import AsyncStorage from "@react-native-async-storage/async-storage";
import { deviceKey } from "./deviceKey";
import type { AnyState, GameType } from "./games/registry";

/** Schlüssel je Spiel; „woerterei“ behält den bisherigen Schlüssel (alte Spielstände bleiben erhalten). */
const KEYS: Record<GameType, string> = {
  woerterei: "spielestube.woerterei.partie.v1",
  zahlenromme: "spielestube.zahlenromme.partie.v1",
};

/** Die laufende Partie am selben Gerät wird nach jedem Zug gespeichert. */
export async function saveGame(type: GameType, state: AnyState | null): Promise<void> {
  try {
    const key = deviceKey(KEYS[type]);
    if (state) await AsyncStorage.setItem(key, JSON.stringify(state));
    else await AsyncStorage.removeItem(key);
  } catch {
    // Speichern ist eine Bequemlichkeit – das Spiel läuft auch ohne weiter.
  }
}

export async function loadGame(type: GameType): Promise<AnyState | null> {
  try {
    const raw = await AsyncStorage.getItem(deviceKey(KEYS[type]));
    if (!raw) return null;
    const state = JSON.parse(raw) as AnyState;
    return state?.game === type && state.version === 1 ? state : null;
  } catch {
    return null;
  }
}
