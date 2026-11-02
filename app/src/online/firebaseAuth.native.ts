// Android/iOS: Anmeldung im App-Speicher (AsyncStorage) behalten, damit man
// nach einem Neustart angemeldet bleibt.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FirebaseApp } from "firebase/app";
import { initializeAuth, type Auth, type Persistence } from "firebase/auth";

// getReactNativePersistence gibt es nur im React-Native-Build von Firebase;
// die allgemeinen TypeScript-Typen kennen es nicht.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require("firebase/auth") as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
