/**
 * Fehler vom Server in verständliche Sätze übersetzen.
 * Der technische Code wird klein mit angezeigt – damit lässt sich ein Problem
 * bei der Einrichtung schnell finden.
 */
export function describeError(e: unknown): string {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  const message = e instanceof Error ? e.message : String(e);
  const tech = code || message;

  let text: string;
  if (code === "permission-denied" || /insufficient permissions/i.test(message)) {
    text = "Der Server hat den Zugriff abgelehnt. Wahrscheinlich sind die Sicherheitsregeln in Firebase noch nicht veröffentlicht.";
  } else if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed") {
    text = "Die Anmeldung ist in Firebase noch nicht eingeschaltet (Authentication → Anmeldeanbieter → Anonym).";
  } else if (code === "auth/unauthorized-domain") {
    text = "Diese Internetadresse ist in Firebase nicht freigegeben (Authentication → Einstellungen → Autorisierte Domains).";
  } else if (code === "not-found" || /database .* does not exist/i.test(message)) {
    text = "Die Datenbank wurde in Firebase nicht gefunden (Firestore Database → Datenbank erstellen).";
  } else if (code === "auth/network-request-failed" || code === "unavailable" || /network|offline|fetch/i.test(message)) {
    text = "Keine Verbindung zum Server. Bitte prüfe die Internetverbindung und versuche es noch einmal.";
  } else if (code === "auth/api-key-not-valid" || /api-key/i.test(code)) {
    text = "Die Zugangsdaten zum Server stimmen nicht (Firebase-Konfiguration).";
  } else {
    text = "Das hat leider nicht geklappt. Bitte versuche es noch einmal.";
  }
  return tech ? `${text}\n\n(Technischer Hinweis: ${tech})` : text;
}
