# Sigrids Spielestube

Seniorengerechte Familienspiele für Android-Tablets und -Handys – am selben
Gerät oder online gegeneinander. Erstes Spiel: **Wörterei**, ein Wortlegespiel.

Das vollständige Konzept steht im claude.ai-Projekt „handygame“
(`konzept-sigrids-spielestube.md`).

## Aufbau

```
app/           Expo-App (Android, später iOS; im Browser testbar)
packages/
  core/        Gemeinsame Schnittstelle aller Spiele (GameModule), Zufall
  woerterei/   Wörterei: Brett, Steine, Zugprüfung, Wertung, Spielablauf
    data/      Wortliste (≈300.000 Wörter, igerman98, GPL)
scripts/       Werkzeuge, z. B. Aufbereitung der Wortliste
```

Später kommen weitere Spiele als eigene Pakete dazu.

## Stand

- [x] Etappe 1: Spielregeln und Wortliste der Wörterei (getestet)
- [x] Etappe 2: Modus „Am selben Gerät“ (erste spielbare App)
- [ ] Etappe 3: Seniorengerechte Oberfläche, Praxistest
- [x] Etappe 4a: Online-Modus (Familiencode, Live-Partien über Firebase)
- [ ] Etappe 4b: Push-Nachrichten „Du bist dran“ (mit der echten Android-App)
- [ ] Etappe 5: Verteilung über Google Play (geschlossener Testkanal)

## Entwickeln

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install       # erzeugt dabei auch das Wörterbuch-Modul für die App
npm test          # alle Tests
npm run typecheck # TypeScript prüfen
```

### App ausprobieren

**Am einfachsten – im Browser, ohne Installation:**
https://toki79.github.io/sigrids-spielekiste/ (wird bei jedem Push auf `main`
automatisch neu gebaut; auf dem iPhone in Safari über „Teilen → Zum Home-Bildschirm“
wie eine App ablegen).

**Auf dem Handy (Expo Go):**

1. App „Expo Go“ aus dem App Store bzw. Play Store installieren.
2. Am Rechner im Projektordner: `npm run app`
3. Den angezeigten QR-Code scannen – auf dem iPhone mit der Kamera-App,
   auf Android in Expo Go. Handy und Rechner müssen im selben WLAN sein.

**Im Browser:** `npm run app:web` und dann http://localhost:8081 öffnen.

### Online-Modus

- Server: Firebase-Projekt `sigrids-spielestube` (Spark-Tarif, kostenlos), Zugangsdaten in
  `app/src/online/firebaseConfig.ts`
- Anmeldung anonym; man tritt einmalig mit **Familiencode** und **Namen** bei
- Daten: `families/{CODE}` (Mitglieder, „gerade da“) und `families/{CODE}/games/{id}` (Partien)
- **Sicherheitsregeln** stehen in `firestore.rules`. Nach jeder Änderung in der
  Firebase-Konsole einfügen: Firestore Database → Regeln → Inhalt ersetzen → Veröffentlichen
  (oder `npx firebase-tools deploy --only firestore:rules`)
- Zum Testen ohne Server: Web-Version mit `?backend=local&geraet=1` und in einem zweiten
  Tab `?backend=local&geraet=2` öffnen – zwei simulierte Geräte

### Bedienung (Wörterei, am selben Gerät)

- Namen eintragen (2–4 Spieler), Partie starten
- Übergabe-Bildschirm: „Ich bin … – Buchstaben zeigen“ (die Bank bleibt bis dahin verdeckt)
- Buchstaben aufs Brett ziehen – oder antippen und dann das Feld antippen
- Neu gelegte Steine lassen sich verschieben, zurück auf die Bank ziehen oder durch Antippen zurücknehmen
- Vorschau zeigt Wörter und Punkte, Fehler werden verständlich erklärt
- Joker: Buchstaben im Auswahlfenster wählen
- Tauschen, Aussetzen, Mischen; unbekannte Wörter den Mitspielern zur Abstimmung vorlegen
- Die Partie wird nach jedem Zug gespeichert und kann im Hauptmenü fortgesetzt werden

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
- Fehlt ein Wort im Wörterbuch, kann der Spieler die anderen fragen: Stimmen alle zu, wird
  der Zug gelegt; sagt jemand Nein, ist der Spieler noch einmal dran
- Rangliste der Familie (Siege, Ø Punkte, Rekorde) – die Nummer 1 wird mit Krone und Konfetti gefeiert

## Lizenzen

Die Wortliste stammt aus igerman98 (© Björn Jacke, GPL-2.0 oder neuer),
siehe `packages/woerterei/data/QUELLE.md`.
