# Arcobimbi 🌈

**Giornate piene di gioco per bambini dai 2 ai 5 anni.** Un'app per genitori e bambini che propone ogni
giorno le attività da fare insieme, tutto l'anno, con un timer arcobaleno per le routine e 16 minigiochi
con la voce che legge le consegne. Funziona anche senza rete, sul web e come app Android.

![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![PWA](https://img.shields.io/badge/PWA-offline-5a0fc8)
![Android](https://img.shields.io/badge/Android-Capacitor-3ddc84)

🌐 **Sito:** <https://ialias.github.io/AurorApp/> (il percorso segue il nome del repository)

## Cosa fa

- **Un piano al giorno, tutto l'anno**, mai la stessa attività entro 14 giorni: si adatta alla routine
  (anche a chi la mattina va al nido o all'asilo), al meteo e alla stagione.
- **150 attività in 10 categorie**, con la struttura pedagogica di una maestra d'asilo: istruzioni,
  materiali, obiettivo di sviluppo e note di sicurezza per ognuna.
- **Per bambine e bambini**: nel primo avvio si sceglie bambina o bambino e tutti i testi si accordano
  ("Bravissima/Bravissimo", "comanda lei/lui", badge, attività), con il nome del bambino dove serve.
- **Timer arcobaleno** per pranzo, cena, vestirsi, riordino o altro, leggibile da chi non sa ancora leggere.
- **16 minigiochi** (colori, numeri, lettere, forme, emozioni, ombre, animali, bolle, xilofono…) con la
  consegna letta ad alta voce dalla sintesi vocale del dispositivo.
- **Cento per cento locale**: nessun account, nessuna pubblicità, nessuna chiamata di rete, nessun dato che
  esce dal dispositivo ([informativa privacy](public/privacy.html)).

## Stack

React + TypeScript + Vite, React Router, Zustand, zod, Tailwind, Framer Motion, date-fns. PWA con service
worker per l'uso offline; app Android con Capacitor.

## Avvio in locale

```bash
npm install
npm run dev          # sviluppo su http://localhost:5173
npm run check        # typecheck + lint + test + build
npm run e2e          # Playwright
```

## App Android

Servono il JDK 21 e l'Android SDK (quello di Android Studio va benissimo).

```bash
npm run android:sync          # build web per Android + copia nel progetto android/
cd android
./gradlew assembleDebug       # APK di prova: app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease       # pacchetto per il Play Store: app/build/outputs/bundle/release/app-release.aab
```

- La versione dell'app (nome e `versionCode`) viene da `package.json`: per pubblicare un aggiornamento
  basta alzare `version`.
- La firma per il Play Store si legge da `android/keystore.properties` e dal file `.jks` che indica: sono
  esclusi da git, **conservane una copia di sicurezza**.
- Icone, splash e grafiche del Play Store (`store/`) nascono tutte da `node scripts/gen-icons.mjs`.

## Struttura

| Percorso | Cosa contiene |
|---|---|
| `src/core/` | logica pura e testata: generatore del piano, timer, giochi, salvataggio, testi personalizzati |
| `src/features/` | le schermate: Oggi, Timer, Catalogo, Giochi, Impostazioni, wizard |
| `src/app/`, `src/ui/` | shell, store, routing e design system (audio e voce compresi) |
| `android/` | progetto Android generato da Capacitor |
| `store/` | icona e immagine in evidenza per la scheda del Play Store |
| `docs/superpowers/` | specifiche originali e **catalogo normativo delle 150 attività** |

## Licenza

Codice pubblico su GitHub, **nessuna licenza d'uso concessa**: tutti i diritti riservati.
Puoi leggere e imparare, non usare o ridistribuire senza permesso.
