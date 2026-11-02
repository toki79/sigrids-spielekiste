import { Platform, Share } from "react-native";
import { formatFamilyCode, isPlausibleFamilyCode, normalizeFamilyCode } from "@spielestube/core";

/**
 * Einladungslinks: https://toki79.github.io/sigrids-spielekiste/?familie=BLUME27
 * - im Browser öffnet sich die Web-Version direkt bei „Wer bist du?“
 * - in der Android-App (Schema sigridsspielestube://familie/BLUME27) genauso
 */
export const INVITE_BASE = "https://toki79.github.io/sigrids-spielekiste/";
export const APP_SCHEME = "sigridsspielestube";

export function inviteLink(code: string): string {
  return `${INVITE_BASE}?familie=${normalizeFamilyCode(code)}`;
}

/** Familiencode aus einem Link lesen (Web-Adresse oder App-Schema). */
export function parseInvite(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /[?&]familie=([^&#]+)/i.exec(url) ?? new RegExp(`^${APP_SCHEME}://(?:familie/)?([^/?#]+)`, "i").exec(url);
  if (!m?.[1]) return null;
  const code = normalizeFamilyCode(decodeURIComponent(m[1]));
  return isPlausibleFamilyCode(code) ? code : null;
}

/** Im Browser den Einladungsparameter aus der Adresszeile entfernen (sonst fragt die Seite bei jedem Neuladen). */
export function clearInviteFromAddressBar(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("familie")) return;
  url.searchParams.delete("familie");
  window.history.replaceState(null, "", url.toString());
}

export function inviteMessage(code: string, fromName: string): string {
  return (
    `Hallo! ${fromName} lädt dich zu „Sigrids Spielestube“ ein – dort spielen wir Wörterei miteinander.\n\n` +
    `Einfach diesen Link öffnen:\n${inviteLink(code)}\n\n` +
    `Oder in der App „Ich habe einen Familiencode“ wählen und ${formatFamilyCode(code)} eingeben.`
  );
}

/**
 * Einladung teilen. Auf dem Handy öffnet sich das Teilen-Menü (WhatsApp, SMS, E-Mail …).
 * Im Browser ohne Teilen-Funktion wird der Text in die Zwischenablage kopiert.
 * Liefert „geteilt“, „kopiert“ oder „nichts“.
 */
export async function shareInvite(code: string, fromName: string): Promise<"geteilt" | "kopiert" | "nichts"> {
  const message = inviteMessage(code, fromName);
  if (Platform.OS === "web") {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: "Einladung zur Spielestube", text: message });
        return "geteilt";
      } catch {
        // abgebrochen oder nicht erlaubt → kopieren
      }
    }
    if (nav?.clipboard?.writeText) {
      try {
        await nav.clipboard.writeText(message);
        return "kopiert";
      } catch {
        return "nichts";
      }
    }
    return "nichts";
  }
  const res = await Share.share({ message, title: "Einladung zur Spielestube" });
  return res.action === Share.sharedAction ? "geteilt" : "nichts";
}
