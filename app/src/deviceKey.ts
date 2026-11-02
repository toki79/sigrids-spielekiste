import { Platform } from "react-native";

/**
 * Nur für Tests im Browser: Mit `?geraet=2` bekommt ein Tab einen eigenen
 * Speicherbereich und verhält sich wie ein zweites Gerät.
 */
export function deviceKey(key: string): string {
  if (Platform.OS !== "web" || typeof window === "undefined") return key;
  const d = new URLSearchParams(window.location.search).get("geraet");
  return d ? `${key}.geraet-${d}` : key;
}
