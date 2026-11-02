import { CompactDictionary, type Dictionary } from "@spielestube/woerterei";

let cached: Dictionary | null = null;

/**
 * Lädt das Wörterbuch (≈300.000 Wörter) beim ersten Aufruf.
 * Das `require` steht absichtlich in der Funktion, damit die App zuerst
 * ihren Startbildschirm zeigt und erst danach die große Wortliste einliest.
 */
export function loadDictionary(): Dictionary {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@spielestube/woerterei/woerter-bloecke");
    cached = CompactDictionary.fromBlocks(mod.default ?? mod);
  }
  return cached;
}
