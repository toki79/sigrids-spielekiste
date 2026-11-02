// Web: Anmeldung bleibt im Browser gespeichert (IndexedDB).
import type { FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export function createAuth(app: FirebaseApp): Auth {
  return getAuth(app);
}
