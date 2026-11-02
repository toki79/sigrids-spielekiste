import { Platform } from "react-native";
import type { OnlineBackend } from "./types";

let instance: OnlineBackend | null = null;

/**
 * Der Server für den Online-Modus. Standard ist Firebase.
 * In der Web-Version kann mit `?backend=local` ein Test-Server im Browser
 * genutzt werden (zwei Tabs = zwei Geräte).
 */
export function getBackend(): OnlineBackend {
  if (!instance) {
    const local =
      Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("backend") === "local";
    if (local) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LocalBackend } = require("./localBackend") as typeof import("./localBackend");
      instance = new LocalBackend();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FirebaseBackend } = require("./firebaseBackend") as typeof import("./firebaseBackend");
      instance = new FirebaseBackend();
    }
  }
  return instance;
}
