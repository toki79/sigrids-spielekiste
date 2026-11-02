// Erzeugt aus data/woerter.txt ein JavaScript-Modul für die App:
// generated/woerter-bloecke.js  →  export default { "2": "ABAHAM…", "3": "…", … }
// Pro Wortlänge eine sortierte, aneinandergehängte Zeichenkette (Format von CompactDictionary.fromBlocks).
// Wird automatisch bei `npm install` ausgeführt (postinstall im Hauptverzeichnis).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const words = readFileSync(join(root, "data", "woerter.txt"), "utf-8").split("\n").filter(Boolean);

const groups = new Map();
for (const w of words) {
  if (!groups.has(w.length)) groups.set(w.length, []);
  groups.get(w.length).push(w);
}
const blocks = {};
for (const [len, list] of [...groups].sort((a, b) => a[0] - b[0])) {
  list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  blocks[len] = [...new Set(list)].join("");
}

mkdirSync(join(root, "generated"), { recursive: true });
const out = join(root, "generated", "woerter-bloecke.js");
writeFileSync(
  out,
  "// Automatisch erzeugt aus data/woerter.txt (igerman98, GPL-2.0+). Nicht von Hand bearbeiten.\n" +
    `export default ${JSON.stringify(blocks)};\n`,
);
writeFileSync(
  join(root, "generated", "woerter-bloecke.d.ts"),
  "declare const blocks: Readonly<Record<string, string>>;\nexport default blocks;\n",
);
console.log(`Wörterbuch-Modul geschrieben: ${words.length} Wörter → ${out}`);
