import { createWoerterei } from "@spielestube/woerterei";
import { loadDictionary } from "./dictionary";

let instance: ReturnType<typeof createWoerterei> | null = null;

/** Das Spielmodul „Wörterei“ mit geladenem Wörterbuch. */
export function getGame() {
  if (!instance) instance = createWoerterei(loadDictionary());
  return instance;
}
