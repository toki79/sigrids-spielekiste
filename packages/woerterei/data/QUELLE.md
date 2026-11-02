# Wortliste

`woerter.txt` enthält rund 300.000 deutsche Wörter in allen gebeugten Formen,
in Großbuchstaben, ß als SS, ein Wort pro Zeile, sortiert.

**Quelle:** igerman98 von Björn Jacke (https://www.j3e.de/ispell/igerman98/),
bezogen über das Debian/Ubuntu-Paket `wngerman` (`/usr/share/dict/ngerman`).

**Lizenz:** GNU General Public License Version 2 oder neuer
(siehe `LIZENZ-WORTLISTE-GPL-2.txt`). Copyright (C) 1999–2016 Björn Jacke.

Erzeugt mit `scripts/build_wordlist.py` (Aufbereitung dort beschrieben).

Bekannte Grenzen:
- Eigennamen (Städte, Vornamen) sind enthalten, weil sie sich in der Quelle
  nicht von Hauptwörtern unterscheiden lassen.
- Seltene Zusammensetzungen fehlen. Dafür gibt es im Spiel „Wort trotzdem
  erlauben“, wenn alle Mitspieler zustimmen.
