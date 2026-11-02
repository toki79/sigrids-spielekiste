import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WoerterState } from "@spielestube/woerterei";

const KEY = "spielestube.woerterei.partie.v1";

/** Die laufende Partie am selben Gerät wird nach jedem Zug gespeichert. */
export async function saveGame(state: WoerterState | null): Promise<void> {
  try {
    if (state) await AsyncStorage.setItem(KEY, JSON.stringify(state));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Speichern ist eine Bequemlichkeit – das Spiel läuft auch ohne weiter.
  }
}

export async function loadGame(): Promise<WoerterState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as WoerterState;
    return state?.game === "woerterei" && state.version === 1 ? state : null;
  } catch {
    return null;
  }
}
