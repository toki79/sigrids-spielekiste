/**
 * Familiencodes: leicht vorzulesen und abzutippen, z. B. „BLUME-27“.
 * Gespeichert wird die Form ohne Bindestrich („BLUME27“).
 */

const WORDS = [
  "APFEL", "BIRNE", "BLUME", "TULPE", "ROSE", "SONNE", "MOND", "STERN", "WOLKE", "REGEN",
  "GARTEN", "WALD", "WIESE", "BACH", "INSEL", "HAFEN", "BERG", "TAL", "KUCHEN", "KAFFEE",
  "TEE", "HONIG", "BROT", "KIRSCHE", "PFLAUME", "LINDE", "EICHE", "TANNE", "AMSEL", "MEISE",
  "FINK", "IGEL", "HASE", "FUCHS", "REH", "BIENE", "HUMMEL", "LAMPE", "UHR", "GEIGE",
];

/** Neuer Code, z. B. „BLUME27“. `random` liefert Zahlen in [0, 1). */
export function generateFamilyCode(random: () => number = Math.random): string {
  const word = WORDS[Math.floor(random() * WORDS.length)]!;
  const number = 10 + Math.floor(random() * 90);
  return `${word}${number}`;
}

/** Eingabe vereinheitlichen: Groß, ohne Leerzeichen und Bindestriche, Umlaute erlaubt. */
export function normalizeFamilyCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/ß/g, "SS")
    .replace(/[^A-Z0-9ÄÖÜ]/g, "");
}

/** Anzeigeform mit Bindestrich vor den Ziffern: „BLUME27“ → „BLUME-27“. */
export function formatFamilyCode(code: string): string {
  const n = normalizeFamilyCode(code);
  const m = /^([A-ZÄÖÜ]+)(\d+)$/.exec(n);
  return m ? `${m[1]}-${m[2]}` : n;
}

export function isPlausibleFamilyCode(input: string): boolean {
  return /^[A-ZÄÖÜ]{2,12}\d{2,4}$/.test(normalizeFamilyCode(input));
}
