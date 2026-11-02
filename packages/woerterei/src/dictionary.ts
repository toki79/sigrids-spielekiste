/**
 * Wörterbuch für die Wortprüfung.
 *
 * Speichersparend: Pro Wortlänge eine einzige, sortierte Zeichenkette aus
 * aneinandergehängten Wörtern gleicher Länge; gesucht wird binär.
 * 300.000 Wörter belegen so nur wenige MB – wichtig auf älteren Tablets.
 */

export interface Dictionary {
  has(word: string): boolean;
  readonly size: number;
}

export class CompactDictionary implements Dictionary {
  private readonly byLength = new Map<number, string>();
  readonly size: number;

  private constructor(words: Iterable<string>) {
    const groups = new Map<number, string[]>();
    let count = 0;
    for (const raw of words) {
      const w = raw.trim();
      if (!w) continue;
      let list = groups.get(w.length);
      if (!list) groups.set(w.length, (list = []));
      list.push(w);
    }
    for (const [len, list] of groups) {
      const unique = [...new Set(list)].sort(compare);
      count += unique.length;
      this.byLength.set(len, unique.join(""));
    }
    this.size = count;
  }

  /** Aus einer Liste mit einem Wort pro Zeile (Großbuchstaben). */
  static fromText(text: string): CompactDictionary {
    return new CompactDictionary(text.split("\n"));
  }

  static fromWords(words: Iterable<string>): CompactDictionary {
    return new CompactDictionary([...words].map((w) => w.toUpperCase()));
  }

  has(word: string): boolean {
    const w = word.toUpperCase();
    const len = w.length;
    const block = this.byLength.get(len);
    if (!block) return false;
    let lo = 0;
    let hi = block.length / len - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const candidate = block.substr(mid * len, len);
      if (candidate === w) return true;
      if (compare(candidate, w) < 0) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }
}

/** Reiner Zeichencode-Vergleich – auf allen Geräten identisch (anders als localeCompare). */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
