# Scheda Play Store — Arcobimbi

Testi e risposte da copiare in Play Console (app `it.digitstudio.arcobimbi`, lingua predefinita italiano).

## Scheda dello Store principale

**Nome dell'app** (max 30): Arcobimbi

**Descrizione breve** (max 80):
Attività per ogni giorno, timer arcobaleno e minigiochi per bimbi da 2 a 5 anni

**Descrizione completa:**

Arcobimbi aiuta mamme e papà a riempire le giornate dei bambini dai 2 ai 5 anni di gioco, scoperta e sorrisi.

🌈 UN PIANO DI ATTIVITÀ PER OGNI GIORNO
Ogni giorno Arcobimbi propone attività da fare insieme, scelte tra 150 idee in 10 categorie: movimento, creatività, gioco sensoriale, logica, musica, gioco simbolico, acqua, natura, cucina e momenti di calma. Ogni attività ha istruzioni semplici, materiali di casa, l'obiettivo di sviluppo e le note di sicurezza, con la cura di una maestra d'asilo.
Il piano si adatta alla vostra routine (anche se la mattina va al nido o all'asilo), al meteo e alla stagione, e non ripropone la stessa attività per due settimane. Non vi piace una proposta? Cambiatela con un tocco o sceglietene un'altra dal catalogo.

⏱️ IL TIMER ARCOBALENO
Per pranzo, cena, vestirsi, riordinare o qualsiasi altra routine: l'arcobaleno si colora man mano che il tempo passa, così anche chi non sa ancora leggere l'orologio capisce quanto manca. I comandi si attivano solo tenendo premuto, così le manine curiose non lo fermano per sbaglio.

🎲 16 MINIGIOCHI
Colori, numeri, lettere, forme, grande e piccolo, emozioni, ombre, animali e le loro case, memoria, bolle da scoppiare, uno xilofono arcobaleno, un trenino dei numeri e tanto altro. La consegna di ogni gioco viene letta ad alta voce, perché i più piccoli non sanno ancora leggere.

👧👦 PER BAMBINE E BAMBINI
Scegli bambina o bambino e il nome: tutti i testi si accordano ("Bravissima!", "Bravissimo!").

🏅 PICCOLI TRAGUARDI
Attività completate, giorni di fila e badge da collezionare per festeggiare insieme i progressi.

🔒 SICURA E RISPETTOSA
• Nessuna pubblicità e nessun acquisto
• Nessun account e nessun dato raccolto: tutto resta sul tuo telefono
• Funziona anche senza connessione
• Backup dei dati quando vuoi, dalle Impostazioni

Arcobimbi è pensata per essere usata da un adulto insieme al bambino: lo schermo è solo un punto di partenza, il gioco vero è quello che fate insieme.

**Icona:** `store/icon-512.png` — **Grafica in evidenza:** `store/feature-graphic.png`
**Screenshot telefono:** `store/screenshot-1-benvenuto.png` … `store/screenshot-6-catalogo.png` (1080×1920)

## Impostazioni dello Store

- Tipo: **App** — Categoria: **Istruzione** — Tag: Bambini, Genitori, Giochi educativi
- Email di contatto: quella dell'account sviluppatore
- Norme sulla privacy: https://ialias.github.io/AurorApp/privacy.html

## Contenuti dell'app (risposte)

- **Accesso all'app:** tutte le funzionalità sono disponibili senza restrizioni (nessun login).
- **Annunci:** l'app non contiene annunci.
- **Classificazione dei contenuti (IARC):** categoria "Tutte le altre tipologie di app"; a tutte le domande su violenza,
  paura, sesso, linguaggio, sostanze, gioco d'azzardo: **No**. Interazione tra utenti: No. Condivisione della posizione:
  No. Acquisti digitali: No.
- **Pubblico di destinazione:** fascia **Fino a 5 anni** (l'app è rivolta ai bambini, quindi si applicano le norme
  Famiglie: rispettate, perché non ci sono annunci, SDK di terze parti né raccolta di dati).
- **Sicurezza dei dati:** l'app raccoglie o condivide dati utente? **No**. Dati criptati in transito: non applicabile
  (nessuna trasmissione). Richiesta di eliminazione dati: non applicabile (nessun account; si cancella tutto con
  "Azzera tutto" o disinstallando).
- **App governative / funzionalità finanziarie / salute / app di notizie / tracciamento contatti:** No.

## Rilascio

1. Carica `android/app/build/outputs/bundle/release/app-release.aab` (si rigenera con `npm run android:sync` e
   `./gradlew bundleRelease` in `android/`) e accetta la **Firma dell'app di Google Play**.
2. Note di rilascio (it-IT): "Prima versione di Arcobimbi 🌈"
3. Account sviluppatore personale creato dopo il 13/11/2023: prima della produzione serve un **test chiuso con
   almeno 12 tester per 14 giorni consecutivi**. Account organizzazione: si può andare direttamente in produzione.
4. Per ogni aggiornamento successivo alza `version` in `package.json` prima di ricompilare.
