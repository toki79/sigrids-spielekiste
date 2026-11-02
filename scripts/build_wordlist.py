#!/usr/bin/env python3
"""Erzeugt die Wortliste für Wörterei.

Quelle: Debian/Ubuntu-Paket „wngerman“ (/usr/share/dict/ngerman), das aus
igerman98 von Björn Jacke erzeugt wird (Lizenz: GPL-2.0 oder neuer).

    sudo apt-get install wngerman
    python3 scripts/build_wordlist.py /usr/share/dict/ngerman packages/woerterei/data/woerter.txt

Aufbereitung:
- alles in Großbuchstaben, ß wird zu SS (es gibt keinen ß-Stein)
- nur A–Z und Ä, Ö, Ü; Länge 2 bis 15
- keine Wörter mit Bindestrich, Punkt, Apostroph oder Leerzeichen
- keine Abkürzungen: komplett groß geschriebene Einträge (USA, EU),
  Binnenmajuskeln (BahnCard) und Einträge ohne Vokal (km, Nr, Dr)
- eine kleine Sperrliste weiterer Abkürzungen und eine Ergänzungsliste
  gebräuchlicher Ausrufe
"""
import re
import sys

ERLAUBT = re.compile(r"^[A-ZÄÖÜ]{2,15}$")
VOKALE = set("AEIOUÄÖÜY")

# Kurze Abkürzungen, die die Filter oben nicht erkennen.
SPERRLISTE = {"CA", "CO", "DE", "EO", "ET", "SA", "TU", "AD", "ABB", "ABS", "BZW", "USW", "EVTL", "INKL", "EXKL"}

# Gebräuchliche Ausrufe und Kurzwörter, die in der Quelle fehlen.
ERGAENZUNGEN = {"AH", "HA", "HM", "NA", "NU", "JO", "OHO", "AHA", "OJE", "HUI", "PST", "IGITT", "OKAY"}


def normalisiere(eintrag: str) -> str | None:
    w = eintrag.strip()
    if not w or any(z in w for z in "-.'/ \t"):
        return None
    if len(w) >= 2 and w.upper() == w and w.lower() != w:
        return None  # Abkürzung wie USA
    if any(z.isupper() for z in w[1:]):
        return None  # Binnenmajuskel wie BahnCard
    u = w.replace("ß", "SS").replace("ẞ", "SS").upper()
    if not ERLAUBT.match(u):
        return None
    if not (set(u) & VOKALE):
        return None  # km, Nr, Dr …
    if u in SPERRLISTE:
        return None
    return u


def main(quelle: str, ziel: str) -> None:
    woerter = set(ERGAENZUNGEN)
    with open(quelle, encoding="utf-8") as f:
        for zeile in f:
            n = normalisiere(zeile)
            if n:
                woerter.add(n)
    with open(ziel, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(sorted(woerter)) + "\n")
    print(f"{len(woerter)} Wörter nach {ziel} geschrieben")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
