import AsyncStorage from "@react-native-async-storage/async-storage";
import { deviceKey } from "../deviceKey";

/** Auf diesem Gerät gemerkte Familienzugehörigkeit. */
export interface Membership {
  code: string;
  memberId: string;
  name: string;
}

const KEY = deviceKey("spielestube.familie.v1");

export async function loadMembership(): Promise<Membership | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const m = raw ? (JSON.parse(raw) as Membership) : null;
    return m?.code && m.memberId ? m : null;
  } catch {
    return null;
  }
}

export async function saveMembership(m: Membership | null): Promise<void> {
  try {
    if (m) await AsyncStorage.setItem(KEY, JSON.stringify(m));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // ignorieren
  }
}
