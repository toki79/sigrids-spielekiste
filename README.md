# Sigrids Spielestube

Seniorengerechte Familienspiele für Android-Tablets und -Handys – am selben
Gerät oder online gegeneinander. Erstes Spiel: **Wörterei**, ein Wortlegespiel.

Das vollständige Konzept steht im claude.ai-Projekt „handygame“
(`konzept-sigrids-spielestube.md`).

## Aufbau

```
packages/
  core/        Gemeinsame Schnittstelle aller Spiele (GameModule), Zufall
  woerterei/   Wörterei: Brett, Steine, Zugprüfung, Wertung, Spielablauf
    data/      Wortliste (≈300.000 Wörter, igerman98, GPL)
scripts/       Werkzeuge, z. B. Aufbereitung der Wortliste
```

Später kommen dazu: `app/` (Expo/React Native) und weitere Spiele.

## Stand

- [x] Etappe 1: Spielregeln und Wortliste der Wörterei (getestet)
- [ ] Etappe 2: Modus „Am selben Gerät“ (erste spielbare App)
- [ ] Etappe 3: Seniorengerechte Oberfläche, Praxistest
- [ ] Etappe 4: Online-Modus (Firebase, Push über Expo)
- [ ] Etappe 5: Verteilung über Google Play (geschlossener Testkanal)

## Entwickeln

```bash
npm install
npm test          # alle Tests
npm run typecheck # TypeScript prüfen
```

## Wörterei – Regeln in Kürze

- 15 × 15 Felder mit der klassischen, vertrauten Anordnung der Bonusfelder
  (Doppel-/Dreifach-Buchstabe, Doppel-/Dreifach-Wort, Stern in der Mitte zählt doppelt)
- Optik: schlicht, hell, auf gute Lesbarkeit ausgelegt; eigener Name und eigene Farben
- 102 Steine (100 Buchstaben inkl. Ä, Ö, Ü + 2 Joker), kein ß – es wird als SS gelegt
- 7 Steine auf der Bank, 50 Bonuspunkte für alle sieben in einem Zug
- Erstes Wort über die Mitte, danach immer anschließend
- Legen, Tauschen (solange mindestens 7 Steine im Beutel sind) oder Aussetzen
- Ende, wenn ein Spieler ausgespielt hat und der Beutel leer ist, oder wenn
  alle Spieler zweimal hintereinander keine Punkte gemacht haben
- Reststeine werden abgezogen; wer ausspielt, bekommt die Reststeine der anderen
- Fehlt ein Wort im Wörterbuch, kann es mit Zustimmung aller für die Partie erlaubt werden

## Lizenzen

Die Wortliste stammt aus igerman98 (© Björn Jacke, GPL-2.0 oder neuer),
siehe `packages/woerterei/data/QUELLE.md`.
