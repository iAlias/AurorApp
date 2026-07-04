# AurorApp — Specifiche di progetto

| | |
|---|---|
| **Prodotto** | AurorApp — pianificatore estivo di attività per una bimba di 3 anni + timer pasti visuale |
| **Data** | 2026-07-04 |
| **Stato** | Approvato (design validato col committente il 2026-07-04) |
| **Piattaforma** | Web app PWA, mobile-first + desktop, 100% offline, un solo dispositivo |
| **Stack** | React 18 + TypeScript (strict) + Vite + Tailwind CSS + Framer Motion |
| **Documenti collegati** | `2026-07-04-aurorapp-catalogo-attivita.md` (catalogo delle 150 attività, parte integrante della spec) |

---

## 1. Visione e obiettivi

Tre mesi di vacanze estive, genitori che lavorano a turno: serve un piano giornaliero che renda ogni giornata **diversa, stimolante e senza noia** per una bimba di 3 anni, e che chiunque sia di turno possa aprire ed eseguire senza pensarci.

L'app è progettata **come la progetterebbe una maestra d'asilo**: ogni attività ha un obiettivo di sviluppo, la giornata alterna movimento e calma, la settimana bilancia i domini di crescita (linguaggio, motricità fine e grossa, sensorialità, autonomia, creatività, socialità).

**Obiettivi misurabili:**

- **O1** — Mai la stessa attività entro 14 giorni, su tutto il periodo vacanze (fino a 92+ giorni).
- **O2** — Ogni giornata feriale propone 4 attività principali + 1 momento calmo serale, con curva di energia corretta (alta al mattino, decrescente verso sera).
- **O3** — Il timer pasti è comprensibile da una bimba di 3 anni senza spiegazioni: guarda l'arcobaleno e il sole e capisce quanto manca.
- **O4** — Zero perdita di dati e zero crash negli scenari d'uso reali (telefono bloccato, app chiusa, batteria finita durante il timer).
- **O5** — Usabile con una mano, in cucina, in meno di 10 secondi dal tap sull'icona alla vista del piano di oggi.

**Non-obiettivi (esplicitamente fuori scope v1):**

- Multi-bimbo / multi-profilo.
- Sincronizzazione cloud, account, backend (dati su un solo dispositivo; il backup è l'export JSON).
- Notifiche push.
- Meteo automatico da API (il meteo si imposta a mano con un tap).
- Dark mode (app diurna, palette solare unica).
- Lingue diverse dall'italiano.
- Analytics o tracciamento di qualsiasi tipo (privacy totale: i dati della bimba non lasciano mai il dispositivo).
- Contenuti video/schermo per la bimba: l'app è uno strumento **per l'adulto**; l'unica schermata pensata per gli occhi della bimba è il timer pasti.

---

## 2. Utenti e momenti d'uso

Un solo tipo di utente: **il genitore di turno** (mamma o papà si alternano; chi configura è anche chi esegue). L'app vive su un dispositivo principale di casa.

| Momento | Quando | Cosa fa | Schermata |
|---|---|---|---|
| Setup | Prima apertura (una tantum) | Configura profilo, routine, interessi | Wizard |
| Mattina | ~9:00 | Apre il piano di oggi, imposta il meteo, prepara i materiali | Oggi |
| Durante il giorno | Continuo | Legge le istruzioni, segna le attività fatte, sostituisce se serve | Oggi / Dettaglio |
| Pranzo e cena | 13:00 / 19:30 | Avvia il timer arcobaleno a schermo intero | Timer Pasti |
| Sera | Dopo la nanna | Sbircia domani, marca giorni speciali, guarda i progressi | Calendario / Oggi |
| Occasionale | — | Cambia orari, durate pasti, esporta backup | Impostazioni |

**Navigazione:** tab bar inferiore su mobile, sidebar sinistra su desktop, con 4 voci: **Oggi · Calendario · Timer Pasti · Impostazioni**. Il wizard è fuori dalla navigazione (fullscreen, prima apertura o rilanciato dalle impostazioni).

---

## 3. Principi pedagogici (le regole della "maestra")

Questi principi sono vincolanti per il catalogo (appendice) e per il generatore (§7):

- **P1 · Alternanza attivo/calmo:** mai due attività ad alta energia consecutive; dopo il movimento, un'attività da tavolo o sensoriale.
- **P2 · Rotazione dei domini di sviluppo:** nella stessa settimana devono comparire tutte le categorie del catalogo; nessuna categoria due volte nello stesso giorno.
- **P3 · Autonomia guidata ("aiutami a fare da solo"):** ogni attività indica cosa può fare la bimba da sola e dove serve l'adulto. Piccoli incarichi veri (innaffiare, apparecchiare) valgono come attività.
- **P4 · Novità dentro la routine:** la struttura della giornata è sempre uguale (dà sicurezza), i contenuti cambiano sempre (danno stimolo).
- **P5 · Processo, non prodotto:** le istruzioni invitano a lodare l'impegno, non il risultato ("hai lavorato tanto!" invece di "che bel disegno").
- **P6 · Estate vera:** priorità ad acqua, natura e vita all'aperto nelle ore giuste (mattina presto e tardo pomeriggio); mai attività fisiche all'aperto nelle ore più calde se il meteo è 🥵.
- **P7 · Niente schermi:** nessuna attività del catalogo prevede TV, tablet o telefono per la bimba (eccezione: registrare e riascoltare la propria voce, MUS-14).
- **P8 · Sicurezza esplicita:** attività con piccoli oggetti, acqua o cucina riportano una nota di sicurezza; la supervisione è sempre implicita.

---

## 4. Requisiti funzionali

### FR-1 · Wizard di configurazione

Fullscreen, 6 step, progress bar animata a pallini, transizioni 3D tra step (slide con profondità). Si apre alla prima apertura (nessun profilo salvato) e da Impostazioni → "Rifai la configurazione". Ogni step ha pulsanti Avanti/Indietro; i dati si salvano solo alla conferma finale (step 6), tranne il rilancio parziale dalle impostazioni che precompila i campi.

| Step | Contenuto | Campi e validazioni |
|---|---|---|
| 1 | Benvenuto: illustrazione animata, claim "L'estate della tua bimba, un giorno alla volta", CTA "Iniziamo" | — |
| 2 | Nome e avatar | `name`: 1–20 caratteri, lettere/spazi/apostrofi/accenti; `avatarId`: scelta tra 8 personaggi illustrati (volpina, coniglietta, orsetta, gattina, dinosaura, unicorno, ranocchia, stellina). Niente upload foto (privacy) |
| 3 | Data di nascita e date vacanze | `birthdate`: date picker; mostra l'età calcolata ("3 anni e 2 mesi 🎈"); se età fuori 2–5 anni → warning non bloccante "le attività sono pensate per i 3 anni". `vacationStart` default oggi, `vacationEnd` default +92 giorni; vincoli: end > start, periodo ≤ 180 giorni |
| 4 | Routine oraria | Time picker per le ancore (default: sveglia 09:00, fine colazione 09:45, merenda 11:00–11:20, pranzo 13:00, riposino 14:00 per 120 min, fine merenda pomeriggio 16:30, cena 19:30, nanna 21:00). Validazione: ordine crescente; ogni slot derivato ≥ 20 min, altrimenti messaggio "questo orario lascia troppo poco tempo per giocare" |
| 5 | Interessi e spazi | `interests`: chip multi-selezione, minimo 1 — animali, disegno, musica, acqua, costruzioni, travestimenti, natura, libri, cucinare, movimento. `spaces`: multi-selezione, minimo 1 — casa, giardino, terrazzo, parco vicino |
| 6 | Riepilogo festoso | Card riassuntiva con avatar e nome, pulsante "Crea la nostra estate ✨" → animazione di generazione (2–3 s, coriandoli) → atterraggio su Oggi |

### FR-2 · Struttura della giornata

Le **ancore** (dalla routine) sono fisse; gli **slot attività** si derivano dalle ancore. Giornata feriale default:

| Orario | Blocco | Tipo |
|---|---|---|
| 09:00–09:45 | Sveglia e colazione | ancora |
| 09:45–11:00 | **Slot M1** — energia alta | slot |
| 11:00–11:20 | Merenda | ancora |
| 11:20–12:40 | **Slot M2** — energia media (creativa/sensoriale/cognitiva) | slot |
| 12:40–13:00 | "Prepariamo il pranzo insieme" | transizione fissa |
| 13:00–14:00 | **Pranzo** (timer arcobaleno, durata = impostazione pranzo) | ancora + timer |
| 14:00–16:00 | Riposino | ancora |
| 16:00–16:30 | Risveglio dolce e merenda | ancora |
| 16:30–17:45 | **Slot P1** — energia alta, all'aperto se possibile | slot |
| 17:45–19:00 | **Slot P2** — energia media/bassa | slot |
| 19:00–19:30 | Bagnetto e relax | transizione fissa |
| 19:30–20:30 | **Cena** (timer arcobaleno, durata = impostazione cena) | ancora + timer |
| 20:30–21:00 | **Slot SERA** — sempre categoria Calma (CAL) | slot |
| 21:00 | Nanna | ancora |

Derivazione degli slot: M1 = fine colazione → inizio merenda; M2 = fine merenda → (pranzo − 20 min); P1 = fine merenda pomeriggio → punto medio; P2 = punto medio → (cena − 30 min); SERA = fine cena → nanna. Se un'attività dura meno dello slot, la card mostra la nota "poi gioco libero: lascia che sia lei a guidare".

**Weekend (sabato e domenica):** `familyDay = true` → solo 2 slot (M1 e P1) con priorità alle attività taggate `famiglia` (gite, parco, mare, picnic); il resto della giornata è famiglia libera. Timer pasti invariato.

**Giorni speciali** (marcati dal calendario): `mare | nonni | viaggio | altro` con etichetta libera → il piano del giorno è sospeso e sostituito da una card dedicata ("Oggi: giornata al mare! 🏖"); lo streak non si interrompe.

### FR-3 · Catalogo attività

150 attività per bimbi di 3 anni, in 10 categorie da 15: **MOT** movimento · **CRE** creatività · **SEN** sensoriale · **COG** logica e scoperte · **MUS** musica e ritmo · **SIM** gioco simbolico · **ACQ** acqua · **NAT** natura · **CUC** cucina insieme · **CAL** calma e libri.

Il catalogo completo è nel documento appendice ed è **normativo**: in fase di sviluppo va trascritto 1:1 in `src/core/catalog/activities.ts` mantenendo gli ID. Ogni attività definisce: id, titolo, categoria, durata, energia, luogo, compatibilità meteo, livello sporco, materiali, passi per il genitore, obiettivo di sviluppo ("Sviluppa"), variante ("In più"), tag interessi, flag famiglia, eventuale nota sicurezza. Schema TypeScript in §6.

### FR-4 · Generatore di piani (anti-noia)

Regole vincolanti, in ordine di priorità (dettaglio algoritmico in §7):

- **R1 (hard)** — Nessuna attività ripetuta entro 14 giorni.
- **R2 (hard)** — Nessuna categoria ripetuta nello stesso giorno; SERA è sempre CAL (CAL non conta per il vincolo degli altri slot).
- **R3 (hard)** — Energia dell'attività compatibile con lo slot (M1/P1 alta o media; M2 media o bassa; P2 media o bassa; SERA bassa).
- **R4 (hard)** — Meteo del giorno rispettato: 🌧️ esclude `place: esterno` e le attività `requiresDry`; 🥵 esclude esterno in M2/P2 e privilegia `heatFriendly` (acqua/fresco) ovunque.
- **R5 (hard)** — Luogo compatibile con gli `spaces` del profilo; durata ≤ durata slot.
- **R6 (soft)** — Bonus alle attività che matchano gli interessi della bimba (ma almeno 1 slot al giorno **fuori** dai suoi interessi, per allargare gli orizzonti — regola della maestra).
- **R7 (soft)** — Bonus alle categorie meno usate negli ultimi 7 giorni (rotazione dei domini di sviluppo, P2 pedagogico).
- **R8 (soft)** — Malus alle attività `mess: 2` se già presente un'attività `mess: 2` oggi.
- **R9** — Determinismo: stesso profilo + stessa data + stesso meteo + stesso `regenNonce` ⇒ stesso piano. Rigenerare un giorno incrementa il suo `regenNonce`.

**Azioni dell'utente:** "Cambiala" su una singola attività (sostituisce solo quella, incrementa `swapCount` dello slot, rispetta R1–R5); "Rigenera il giorno" (solo slot non ancora `done`); cambio meteo del giorno → rigenera automaticamente i soli slot non `done` incompatibili col nuovo meteo.

### FR-5 · Vista Oggi

- **Header:** saluto contestuale ("Buongiorno! ☀️" / "Buon pomeriggio!"), nome e avatar della bimba, data, selettore meteo a 3 stati (☀️ default · 🌧️ · 🥵), streak corrente (🔥 n).
- **Timeline verticale** della giornata: ancore come pill compatte, slot come card grandi. La riga dell'ora corrente è evidenziata da un indicatore animato che si muove nel tempo; all'apertura la vista scrolla al blocco corrente.
- **Card attività:** emoji categoria, titolo, orario, durata, chip materiali (max 3 + "…"), pulsanti "Fatta! ⭐" e "Cambiala 🔄". Stati visivi: pianificata (piena), fatta (spunta verde + coriandoli brevi + suono opzionale), saltata (attenuata; si marca "saltata" da dettaglio).
- **Dettaglio attività** (modal con flip 3D): titolo, "Sviluppa:", materiali completi come checklist spuntabile, passi numerati per il genitore, "In più" (variante), eventuale nota sicurezza evidenziata, azioni Fatta/Saltata/Cambiala.
- **Blocchi pasto:** card pranzo/cena con CTA "Avvia il timer 🌈" → apre Timer Pasti precaricato su quel pasto.
- **Fine giornata:** se ≥ 2 attività `done`, card "Giornata piena! ⭐" con mini-recap; a mezzanotte con app aperta la vista passa al giorno nuovo senza ricaricare (tick ogni 30 s sulla data).
- **Domani in anteprima:** in fondo alla timeline, sezione compressa "Domani" espandibile (solo lettura + "Rigenera domani").

### FR-6 · Timer Pasti 🌈 (feature stella)

**Concetto per la bimba:** un arcobaleno grigio si colora arco dopo arco; un sole sorridente viaggia lungo l'arcobaleno; quando il sole raggiunge la nuvoletta e tutti e 7 gli archi sono colorati, il pasto è finito. Nessun numero, nessuna lancetta.

**Schermata di avvio (per l'adulto):** scelta Pranzo/Cena (preselezionata in base all'ora), durata mostrata con ritocco ±5 min (entro 15–90), toggle suoni, pulsante gigante "Si mangia! 🍝". Countdown giocoso 3-2-1 con numeri che ruotano in 3D, poi si parte.

**Durante (schermata per la bimba, fullscreen, niente navigazione):**

- 7 archi concentrici (esterno→interno: rosso, arancio, giallo, verde, azzurro, indaco, violetto), ciascuno = 1/7 della durata; l'arco corrente si riempie con uno sweep progressivo e fluido.
- Ogni arco completato: stellina che brilla + suono campanellina (se suoni attivi) + micro-rimbalzo del sole.
- Sole con faccia sorridente che percorre l'arco esterno da sinistra a destra; a destra, nuvoletta traguardo con bandierina.
- Ultimi 5 minuti: il sole fa un'animazione di incoraggiamento (saltella) e il bordo schermo pulsa dolcemente; nessun elemento ansiogeno (niente rosso lampeggiante, niente conto alla rovescia).
- Tocchi della bimba sullo schermo: innocui, generano stelline scintillanti nel punto toccato (delight, nessuna azione).
- **Child-lock:** Pausa ed Esci si attivano solo con pressione lunga 3 s (anello di progresso visibile attorno al dito); un tap semplice non fa nulla.
- Lo schermo resta acceso (Wake Lock, §8); layout ottimizzato anche in landscape (arcobaleno a tutto schermo).

**Fine:** l'ultimo arco si completa, il sole abbraccia la nuvoletta, pioggia di coriandoli e stelle, scritta grande "Bravissima, {nome}! 🎉", suono di festa; pulsante "Abbiamo finito!" riporta a Oggi e incrementa il contatore pasti sereni. Se il piatto finisce prima: il genitore tiene premuto "Abbiamo già finito!" (long-press 3 s) → salta direttamente alla celebrazione, il timer si chiude come completato.

**Robustezza (dettaglio in §8):** il timer è basato su timestamp assoluti; sopravvive a refresh, blocco schermo, chiusura browser, riavvio del telefono. Se alla riapertura il tempo è scaduto, mostra direttamente la celebrazione. Pausa: il sole si siede su una nuvola e l'avanzamento si congela.

### FR-7 · Calendario

- Vista mensile (swipe/frecce tra i mesi del periodo vacanze), settimana che inizia di lunedì.
- Ogni cella giorno mostra: numero, pallini di stato (● pianificato, ⭐ completato = ≥2 done, ◐ parziale = 1 done, 🏖 speciale, nessun pallino = oltre il periodo o passato senza piano).
- Tap su un giorno → sheet con il piano (stesse card compatte di Oggi, sola lettura per i giorni passati) e azioni: "Rigenera", "Marca come giorno speciale" (scelta tipo + etichetta), "Torna normale".
- Header con il conteggio "Giorno X di Y dell'estate" e barra di avanzamento del periodo.
- I piani si materializzano **in ordine cronologico** dal primo giorno mancante fino al giorno richiesto (§7), così la regola dei 14 giorni vale sempre.

### FR-8 · Impostazioni

Sezioni: **Profilo** (nome, avatar, interessi, spazi — riapre gli step 2/5 del wizard precompilati) · **Routine** (tutti gli orari ancora + durata riposino 30–180 min) · **Pasti** (durata pranzo 15–90, durata cena 15–90, suoni on/off, volume) · **Aspetto** (riduci animazioni: sistema/sì/no) · **Dati** (esporta backup JSON, importa backup con validazione, azzera tutto con doppia conferma digitando il nome della bimba) · **Info** (versione app, versione catalogo, crediti).

Il cambio della durata pasto **non** tocca un timer già in corso (vale dal prossimo avvio). Il cambio routine vale dal giorno corrente in poi: i giorni futuri già materializzati vengono rigenerati (i `done` di oggi restano).

### FR-9 · Progressi e badge

- **Streak:** giorni consecutivi con ≥ 2 attività `done`; i giorni speciali e i weekend non interrompono lo streak (contano come "jolly" se hanno < 2 done).
- **13 badge** con animazione di sblocco (card flip 3D + coriandoli): Prima Stella (1° giorno completato) · Tre di Fila (streak 3) · Settimana Arcobaleno (streak 7) · Mese Magico (streak 30) · Piccola Artista (10 CRE) · Esploratrice (10 NAT) · Sirenetta (10 ACQ) · Ballerina (10 MUS) · Chef Stellata (8 CUC) · Scienziata (10 COG) · Campionessa (15 MOT) · Attrice (10 SIM) · Buona Forchetta (10 timer pasti completati).
- **Recap settimanale:** la domenica sera (e in Impostazioni → Progressi) card con: attività fatte, categoria preferita della settimana, nuovi badge, streak. Nessun dato lascia il dispositivo.

### FR-10 · PWA e offline

- Installabile (manifest: nome "AurorApp", display `standalone`, orientamento `any`, theme color crema, icone 192/512 + maskable).
- Service worker con precache totale (app shell, font, suoni, catalogo): dopo la prima visita funziona per sempre offline.
- Splash/prima apertura < 2 s su telefono di fascia media; aggiornamenti SW con prompt discreto "Nuova versione disponibile — Aggiorna".

---

## 5. Requisiti non funzionali

| ID | Requisito |
|---|---|
| NFR-1 | **Performance:** bundle iniziale < 350 KB gzip (font inclusi, suoni lazy); TTI < 2 s su smartphone di fascia media; animazioni a 60 fps (solo `transform`/`opacity`, mai layout thrashing); timer con `requestAnimationFrame` |
| NFR-2 | **Robustezza:** nessuna perdita di dati in nessuno scenario di §11; scrittura storage write-through sulle azioni critiche (avvio timer, done, salvataggio wizard) |
| NFR-3 | **Accessibilità:** contrasti AA sui testi, touch target ≥ 48 px, focus visibile, label ARIA su controlli non testuali, `prefers-reduced-motion` rispettato (le animazioni diventano fade) |
| NFR-4 | **Privacy:** zero rete a runtime (a parte il fetch degli asset propri), zero analytics, zero cookie di terzi; dati del minore solo in localStorage del dispositivo |
| NFR-5 | **Compatibilità:** iOS Safari 16+, Chrome/Edge Android e desktop ultime 2 major; degradazione elegante dove Wake Lock non c'è (§8) |
| NFR-6 | **Localizzazione:** solo it-IT; date con `date-fns` e locale `it`; settimana da lunedì; tono di voce caldo e concreto (§9.5) |
| NFR-7 | **Qualità codice:** TypeScript strict, ESLint + Prettier, zero `any` non giustificati, moduli `core/*` puri e testati |
| NFR-8 | **Responsive:** mobile-first 360–430 px; breakpoint desktop ≥ 1024 px con layout a due colonne; niente scroll orizzontale, mai |

---

## 6. Architettura e modello dati

### 6.1 Struttura del progetto

```
aurorapp/
├── public/            # icone PWA, favicon
├── src/
│   ├── core/          # LOGICA PURA: zero React, zero DOM, 100% testata
│   │   ├── catalog/   # activities.ts (150 attività), categories.ts, types.ts
│   │   ├── planner/   # generator.ts, rng.ts, history.ts, slots.ts
│   │   ├── timer/     # timerMachine.ts (stato puro), progress.ts
│   │   ├── progress/  # streak.ts, badges.ts
│   │   └── storage/   # envelope.ts, migrations.ts, exportImport.ts (zod)
│   ├── features/      # SCHERMATE: wizard/, today/, mealTimer/, calendar/, settings/
│   ├── ui/            # DESIGN SYSTEM: Button, Card, Modal, Sheet, Chip,
│   │                  #   TimeField, Rainbow (SVG), Confetti, PageFlip3D, TiltCard
│   ├── app/           # router, layout (TabBar/Sidebar), providers, store.ts (zustand)
│   ├── assets/        # fonts/ (woff2 self-hosted), sounds/ (mp3), avatars/ (svg)
│   └── styles/        # tailwind.css, tokens.css
├── tests/e2e/         # Playwright
└── docs/              # queste specifiche
```

Regola architetturale: **`core/` non importa mai da `features/` o `ui/`**; le schermate chiamano funzioni pure di `core/` tramite lo store. Ogni funzione di `core/` è deterministica o riceve il tempo/random come parametro (testabilità totale).

**Dipendenze runtime:** react, react-dom, react-router-dom, zustand, framer-motion, date-fns, zod, canvas-confetti.
**Dipendenze dev:** typescript, vite, @vitejs/plugin-react, tailwindcss, vite-plugin-pwa, vitest, @testing-library/react, jsdom, playwright, eslint, prettier. Versioni pinnate a M0 (ultime stabili).

### 6.2 Modello dati (contratto TypeScript)

```ts
// ——— Catalogo ———
type CategoryId = 'MOT'|'CRE'|'SEN'|'COG'|'MUS'|'SIM'|'ACQ'|'NAT'|'CUC'|'CAL';
type Energy = 'alta'|'media'|'bassa';
type Place = 'casa'|'esterno'|'entrambi';
type Weather = 'sole'|'pioggia'|'caldo';
type InterestTag = 'animali'|'disegno'|'musica'|'acqua'|'costruzioni'
                 |'travestimenti'|'natura'|'libri'|'cucinare'|'movimento';
type SpaceTag = 'casa'|'giardino'|'terrazzo'|'parco';

interface Activity {
  id: string;                 // 'MOT-01' … 'CAL-15'
  category: CategoryId;
  title: string;
  emoji: string;              // per le card
  durationMin: number;        // 15–60
  energy: Energy;
  place: Place;
  requiresDry: boolean;       // serve esterno asciutto
  heatFriendly: boolean;      // ideale col caldo (acqua/ombra/fresco)
  mess: 0|1|2;                // 0 pulita, 1 media, 2 si sporca
  materials: string[];
  steps: string[];            // 2–4 passi, rivolti al genitore
  develops: string[];         // obiettivi di sviluppo, es. ['motricità fine','linguaggio']
  variation: string;          // "In più"
  interests: InterestTag[];
  family: boolean;            // adatta al weekend famiglia
  safety?: string;            // nota di sicurezza
}

// ——— Profilo e impostazioni ———
interface ChildProfile {
  id: string; name: string; avatarId: string;
  birthdate: string;          // ISO yyyy-MM-dd
  interests: InterestTag[];   // ≥1
  spaces: SpaceTag[];         // ≥1
  vacationStart: string; vacationEnd: string;  // ISO
  createdAt: string;          // ISO datetime — entra nel seed
}

interface RoutineSettings {
  wakeTime: string;           // 'HH:mm' — default '09:00'
  breakfastEnd: string;       //           default '09:45'
  morningSnackStart: string;  //           default '11:00'
  morningSnackEnd: string;    //           default '11:20'
  lunchStart: string;         //           default '13:00'
  napStart: string;           //           default '14:00'
  napMinutes: number;         // 30–180 —  default 120
  afternoonSnackEnd: string;  //           default '16:30'
  preDinnerMinutes: number;   // bagnetto — default 30
  dinnerStart: string;        //           default '19:30'
  bedTime: string;            //           default '21:00'
}

interface MealSettings { lunchMinutes: number; dinnerMinutes: number;  // 15–90, default 60
                         soundsOn: boolean; volume: number; }          // default true, 0.8
interface Settings { routine: RoutineSettings; meals: MealSettings;
                     reducedMotion: 'system'|'on'|'off'; }

// ——— Piani e stato ———
type SlotId = 'M1'|'M2'|'P1'|'P2'|'SERA';
type SlotStatus = 'planned'|'done'|'skipped';

interface PlannedSlot { slotId: SlotId; activityId: string;
                        status: SlotStatus; swapCount: number; }

interface DayPlan {
  date: string;               // ISO yyyy-MM-dd
  familyDay: boolean;         // sab/dom
  special?: { kind: 'mare'|'nonni'|'viaggio'|'altro'; label?: string };
  weather: Weather;           // default 'sole'
  regenNonce: number;         // incrementa a ogni "Rigenera giorno"
  slots: PlannedSlot[];       // 5 feriale, 2 weekend, 0 speciale
}

interface TimerSession {
  meal: 'pranzo'|'cena';
  dateISO: string;
  startedAt: number;          // epoch ms — fonte di verità
  durationMs: number;
  pausedAt: number | null;    // epoch ms se in pausa
  pausedTotalMs: number;      // pause accumulate
  status: 'running'|'paused'|'celebrating'|'done';
}

interface ProgressState {
  streak: number;
  lastStreakDate: string | null;
  badges: Partial<Record<BadgeId, string>>;   // id → ISO sblocco
  doneByCategory: Record<CategoryId, number>;
  mealTimersCompleted: number;
}

// ——— Persistenza ———
interface StorageEnvelope {
  schemaVersion: 1;
  savedAt: string;
  profile: ChildProfile | null;   // null = wizard da fare
  settings: Settings;
  plans: Record<string, DayPlan>; // chiave = date ISO
  progress: ProgressState;
  timer: TimerSession | null;
}
```

### 6.3 Persistenza

- Chiave unica localStorage: **`aurorapp.state.v1`**, contenuto = `StorageEnvelope` JSON.
- Scrittura: debounce 300 ms per le modifiche correnti; **write-through immediato** per: completamento wizard, avvio/pausa/fine timer, "Fatta", export.
- Lettura all'avvio con **zod**: se il parse fallisce → non crashare mai: mostra schermata di recupero ("I dati sembrano danneggiati") con opzioni "Scarica copia grezza" (dump del raw) e "Ricomincia".
- **Migrazioni:** `migrate(raw): StorageEnvelope` con `switch(schemaVersion)`; import di versioni più nuove → errore chiaro "Backup creato con una versione più recente".
- **Export:** file `aurorapp-backup-YYYY-MM-DD.json` via download. **Import:** file picker + validazione zod + anteprima ("Backup del … con il profilo di …, sostituirà i dati attuali") + conferma.
- Multi-tab: listener su `storage` event → re-hydrate dello store (caso raro, gestito).
- `QuotaExceededError`: intercettata; toast "Memoria piena: esporta un backup"; l'app continua in sola lettura dello stato in RAM.

---

## 7. Generatore di piani — algoritmo

### 7.1 Determinismo e casualità

```ts
// FNV-1a 32 bit su stringa → seed intero
hashSeed(s: string): number
// PRNG deterministico, restituisce () => number in [0,1)
mulberry32(seed: number): () => number

// Seed di un giorno:
seed = hashSeed(`${profile.createdAt}|${date}|${plan.regenNonce}|${weather}`)
```

Stesso input ⇒ stesso piano, per sempre (R9). Il seed include il meteo: cambiare meteo cambia (solo) gli slot rigenerati.

### 7.2 Materializzazione in ordine cronologico

`getOrCreatePlan(date)` non genera mai un giorno isolato: genera **in sequenza** tutti i giorni mancanti da `max(vacationStart, primo giorno non materializzato)` fino a `date` (≤ 92 iterazioni, sincrone, < 50 ms). Così la storia per R1/R7 è sempre completa e il risultato non dipende dall'ordine di navigazione.

### 7.3 Pipeline di selezione (per ogni slot, nell'ordine M1→M2→P1→P2→SERA)

```
1  pool ← tutte le attività del catalogo
2  FILTRI HARD (R1–R5):
     scarta se usata negli ultimi 14 giorni (storia = plans materializzati)
     scarta se categoria già usata oggi (eccezione: SERA pesca solo da CAL)
     scarta se energia non compatibile con lo slot
     scarta se meteo incompatibile (🌧️→ niente esterno/requiresDry;
       🥵 → niente esterno in M2/P2)
     scarta se place=esterno ma spaces=[casa] · scarta se durationMin > durata slot
3  RILASSAMENTO (solo se pool vuoto, in quest'ordine, mai oltre):
     finestra R1: 14→10→7→4 giorni · poi ammetti categoria ripetuta oggi
     (meteo, energia, luogo e durata non si rilassano MAI)
     se ancora vuoto → fallback: attività CAL più vecchia compatibile
4  SCORING SOFT (R6–R8):
     +3 se interests ∩ profilo ≠ ∅        (+R6)
     +2 se mai usata o usata > 30 gg fa
     +2 se categoria non apparsa negli ultimi 7 giorni   (+R7)
     +1 se 🥵 e heatFriendly · +1 se familyDay e family
     −2 se mess=2 e oggi c'è già una mess=2              (+R8)
     −1 se stessa categoria di ieri nello stesso slotId
5  PICK: ordina per score desc; prendi i primi 5; estrazione pesata
     (pesi 5,4,3,2,1) con rng del giorno
6  REGOLA MAESTRA (R6 bis): dopo aver riempito i 5 slot, se TUTTE le
     attività matchano gli interessi → sostituisci quella con score più
     basso con la migliore fuori-interessi (stessi vincoli hard)
```

"Cambiala": ri-esegue la pipeline per quel solo slot con `rng = mulberry32(seed + swapCount + 1)` ed esclude l'attività corrente. Dopo 10 swap sullo stesso slot, messaggio onesto: "Le ho provate quasi tutte! Questa è la mia preferita per oggi 😊".

### 7.4 Proprietà da garantire con i test

- P-GEN-1: su 92 giorni × 50 profili random, mai una ripetizione entro 14 giorni (salvo pool esaurito documentato dal rilassamento — asserire che il rilassamento scatta < 1% dei casi).
- P-GEN-2: mai categoria duplicata nello stesso giorno (fuori SERA).
- P-GEN-3: determinismo bit-a-bit su 1000 rigenerazioni.
- P-GEN-4: con 🌧️ nessuna attività `esterno`; con 🥵 nessuna `esterno` in M2/P2.
- P-GEN-5: ogni settimana feriale completa contiene ≥ 7 categorie distinte.

---

## 8. Timer pasti — dettaglio tecnico

### 8.1 Macchina a stati

```
idle ──(Si mangia!)──▶ countdown(3s) ──▶ running ──▶ celebrating ──▶ done
                                          │  ▲
                             (long-press) ▼  │ (long-press)
                                          paused
running ──(progress ≥ 1)──────────────────▶ celebrating
running ──(long-press "Abbiamo già finito!")─▶ celebrating
```

`timerMachine.ts` è puro: `next(session, event, now)` → nuova sessione. Il progresso **non è mai un contatore**:

```ts
elapsed  = now − startedAt − pausedTotalMs − (pausedAt ? now − pausedAt : 0)
progress = clamp(elapsed / durationMs, 0, 1)
```

Al mount dell'app: se `envelope.timer` esiste con status `running|paused` → riapri il timer al punto giusto; se `progress ≥ 1` → vai direttamente a `celebrating`. Refresh, blocco schermo, riavvio: il sole è sempre nel punto corretto.

### 8.2 Arcobaleno SVG

- `viewBox="0 0 1000 560"`, centro archi (500, 520), semicerchio 180°→0°.
- 7 archi concentrici: raggi 380→200 (passo 30), `strokeWidth 26`, `strokeLinecap="round"`, gap visivo 4 px.
- Colori (esterno→interno): `#FF5D5D #FF9A3D #FFD166 #7BC950 #4CC9F0 #5E7CE2 #9B5DE5`; stato "spento": `#E8E4DA` (grigio caldo) con opacità 0.6.
- Riempimento arco i (i = 0…6): `fillFraction(i) = clamp(progress*7 − i, 0, 1)`; reso con `stroke-dasharray = L` e `stroke-dashoffset = L * (1 − fillFraction)` dove L = lunghezza dell'arco; aggiornato in `requestAnimationFrame` (nessun timer React in render loop; 60 fps).
- Sole: gruppo SVG (cerchio + raggi + faccia) che percorre l'arco esterno: `angle = 180° − progress*180°`, posizione parametrica sul raggio 380+46; micro-oscillazione sinusoidale (vivo, non meccanico). Nuvoletta con bandierina a fine percorso (destra).
- Sotto l'arcobaleno, per l'adulto, testo discreto "termina alle 13:58" (utile, ignorato dalla bimba).

### 8.3 Schermo, audio, gesti

- **Wake Lock API** (`navigator.wakeLock.request('screen')`) acquisito su `running`, ri-acquisito su `visibilitychange`, rilasciato su `done/idle`. Fallback iOS < 16.4/browser senza supporto: video trasparente 1×1 in loop muto (tecnica standard) + hint una-tantum "tieni il telefono in carica".
- **Audio:** 6 file mp3 ≤ 50 KB l'uno in `assets/sounds/` — `pop` (tap/click UI), `arc` (arco completato), `almost` (ultimi 5 min), `party` (celebrazione), `done-day` (attività fatta), `badge` (sblocco badge). Sbloccati alla prima interazione (vincolo iOS: si crea l'`AudioContext` nel gesture handler del pulsante "Si mangia!"). Rispettano `soundsOn` e `volume`.
- **Long-press:** implementato con pointer events + timer 3000 ms + anello SVG di progresso attorno al punto; si annulla se il dito si sposta > 12 px (la bimba che striscia il dito non attiva nulla).
- **Stelline al tocco:** pool di 12 particelle riusate (no allocazioni in loop), spawn su `pointerdown` fuori dai controlli adulto.

---

## 9. Design system

### 9.1 Palette (token CSS/Tailwind)

| Token | Hex | Uso |
|---|---|---|
| `sun` | `#FFD166` | primario, CTA, accenti felici |
| `coral` | `#EF476F` | secondario, cuori, badge |
| `aqua` | `#06D6A0` | successo, "Fatta!", spunte |
| `sky` | `#4CC9F0` | info, acqua, link |
| `deep` | `#073B4C` | testo principale (mai nero puro) |
| `cream` | `#FFF8E7` | sfondo app |
| `card` | `#FFFFFF` | superfici |
| `stone` | `#8A857B` | testo secondario |
| Arcobaleno | v. §8.2 | solo timer e celebrazioni |

Gradiente firma (header, splash): `linear-gradient(135°, #FFD166 → #FF9A3D)`. Contrasto minimo AA verificato per ogni coppia testo/sfondo.

### 9.2 Tipografia e forme

- **Baloo 2** (700/800) per titoli e numeri grandi; **Nunito** (400/600/700) per testo. Self-hosted woff2 variabile in `assets/fonts/` (zero richieste esterne).
- Scala: 14 / 16 / 18 / 22 / 28 / 36 / 48. Corpo minimo 16 px.
- Radius: card 24 px, bottoni pill, modali 28 px. Ombre morbide a 2 livelli (`0 4px 16px rgba(7,59,76,.08)` e `.14`). Niente bordi duri: il mondo dell'app è rotondo.

### 9.3 Motion design (Framer Motion)

| Pattern | Dove | Specifica |
|---|---|---|
| **PageFlip3D** | cambio tab/route | contenitore con `perspective: 1200px`; pagina uscente `rotateY: −12°, opacity 0, x −40`; entrante da `rotateY: +12°, x 40`; 450 ms, ease `[0.32, 0.72, 0, 1]` |
| **TiltCard** | card attività su desktop | tilt al mouse max ±6° rotateX/Y + ombra dinamica; su touch: press scale 0.97 |
| **Stagger** | liste (timeline, chip, calendario) | children a cascata, delay 60 ms, spring `stiffness 300, damping 24` |
| **Flip badge** | sblocco badge, dettaglio attività | `rotateY 0→180°` con backface, 600 ms + coriandoli |
| **Countdown 3D** | avvio timer | numeri 3-2-1 `rotateX 90°→0°, scale 1.4→1`, 700 ms l'uno |
| **Sole** | timer | rAF, mai keyframe CSS (segue il progresso reale) |
| **Riduzione** | ovunque | `reducedMotion` attivo ⇒ tutte le transizioni diventano fade 150 ms; i coriandoli diventano una stella statica |

Regola: animare **solo** `transform` e `opacity`; `will-change` solo durante l'animazione; niente animazioni infinite fuori dal timer.

### 9.4 Suoni

Palette sonora dolce (xilofono/campanellina), volume default 0.8, mai suoni sopra 1 s tranne `party` (3 s). Tutti disattivabili con un tap dal timer e dalle impostazioni.

### 9.5 Tono di voce

Italiano, caldo, concreto, mai infantilizzato per l'adulto: le istruzioni parlano al genitore ("Prepara due ciotole…"), i messaggi celebrativi parlano alla bimba ("Bravissima, {nome}!"). Emoji sì, ma una per messaggio. Errori senza colpa: "Ops, qualcosa è andato storto. I tuoi dati sono al sicuro."

---

## 10. Schermate — wireframe di riferimento

### 10.1 Oggi (mobile)

```
┌──────────────────────────────┐
│ Buongiorno! ☀️        [🦊]   │  header: saluto, avatar
│ Ven 4 luglio · Giorno 12/92  │
│ Meteo oggi:  [☀️] [🌧️] [🥵]  │  selettore 3 stati
│ 🔥 Streak: 5 giorni          │
├──────────────────────────────┤
│ ◉ 9:00 Sveglia e colazione   │  ancora (pill)
│ ┌──────────────────────────┐ │
│ │ 🤸 9:45–11:00            │ │  card slot M1
│ │ Percorso a ostacoli      │ │
│ │ del salotto              │ │
│ │ 🧺 cuscini, sedie, nastro│ │
│ │ [ Fatta! ⭐ ] [ 🔄 ]     │ │
│ └──────────────────────────┘ │
│ ◉ 11:00 Merenda              │
│ │ … M2 …                   │ │
│ ┌──────────────────────────┐ │
│ │ 🍝 13:00 PRANZO          │ │  card pasto
│ │ [ Avvia il timer 🌈 ]    │ │
│ └──────────────────────────┘ │
│ ◉ 14:00–16:00 Riposino 😴    │
│ │ … P1, P2, cena, SERA …   │ │
│ ▸ Domani (anteprima)         │
├──────────────────────────────┤
│  Oggi   Calend.  🌈Timer  ⚙️ │  tab bar
└──────────────────────────────┘
```

### 10.2 Timer in esecuzione (fullscreen, portrait)

```
┌──────────────────────────────┐
│                    (⏸ = long │
│        ˚ ✦    ☁️🚩   press)  │
│     ██████████░░░░░          │
│   ████████████████░░   🌞    │  7 archi, sole in viaggio
│  ██████████████████████      │
│      (tap bimba → ✦ ✦)      │
│                              │
│   Pranzo · termina alle 13:58│  riga per l'adulto
│   [═ tieni premuto: finito ═]│  long-press 3 s
└──────────────────────────────┘
```

### 10.3 Wizard step 5 (interessi)

```
┌──────────────────────────────┐
│  ● ● ● ● ○ ○        (5 di 6) │
│  Cosa fa brillare gli occhi  │
│  a {nome}?                   │
│  (🐶 animali) (🎨 disegno)   │
│  (🎵 musica) (💧 acqua)      │
│  (🧱 costruzioni) (👗 trav.) │
│  (🌿 natura) (📚 libri)      │
│  (🍪 cucinare) (🏃 movim.)   │
│  Dove potete giocare?        │
│  (🏠 casa)(🌳 giardino)      │
│  (☀️ terrazzo)(🛝 parco)     │
│  [ Indietro ]   [ Avanti → ] │
└──────────────────────────────┘
```

### 10.4 Desktop (≥ 1024 px)

```
┌────────┬─────────────────────────────┬───────────────┐
│ 🌈     │  OGGI — timeline (col. 1)   │ Domani        │
│ Oggi   │  card grandi, TiltCard      │ (anteprima)   │
│ Calend.│                             │ Progressi     │
│ Timer  │                             │ 🔥5  ⭐12     │
│ Impost.│                             │ badge recenti │
└────────┴─────────────────────────────┴───────────────┘
sidebar     colonna principale max 720px   colonna destra 320px
```

Il timer su desktop resta fullscreen (esperienza identica). Il calendario su desktop mostra 2 mesi affiancati.

---

## 11. Errori ed edge case (comportamenti obbligatori)

| # | Scenario | Comportamento atteso |
|---|---|---|
| E1 | Telefono bloccato/riavviato con timer attivo | Alla riapertura il timer riprende dal punto reale (timestamp); se scaduto → celebrazione |
| E2 | Mezzanotte con app aperta | Vista Oggi passa al nuovo giorno (check data ogni 30 s); il timer di cena eventualmente attivo non viene toccato |
| E3 | Cambio durata pasto con timer in corso | Il timer attivo mantiene la durata di avvio; la nuova vale dal prossimo |
| E4 | Doppio tap su "Fatta!"/"Si mangia!" | Idempotente: guard sullo stato, nessun doppio incremento/avvio |
| E5 | localStorage corrotto | Schermata di recupero, mai crash; offerta dump + ricomincia |
| E6 | localStorage pieno | Toast chiaro, app continua in RAM, invito all'export |
| E7 | Import JSON invalido/versione futura | Messaggio specifico, stato attuale intatto |
| E8 | Rotazione schermo durante il timer | Layout si adatta (portrait/landscape), progresso invariato |
| E9 | "Cambiala" con pool esaurito | Messaggio onesto, attività migliore ripescata (§7.3) |
| E10 | Fine periodo vacanze raggiunta | Schermata "Che estate! 🎉" con recap totale + CTA "Prepara una nuova avventura" (wizard) |
| E11 | Data fuori periodo nel calendario | Celle disabilitate con tooltip "fuori dalle vacanze" |
| E12 | Orologio di sistema spostato indietro | Il timer usa epoch: se `now < startedAt`, chiudi la sessione con messaggio neutro (caso limite accettato) |
| E13 | `AudioContext` bloccato (iOS) | Suoni sbloccati al primo gesto; se falliscono, l'app resta silenziosa senza errori visibili |
| E14 | Wake Lock negato/non supportato | Fallback video muto + hint "tieni il telefono in carica" |

---

## 12. Testing e QA

- **Unit (Vitest) su `core/*`** — planner: P-GEN-1…5 di §7.4 come property test; timer: formula progresso con pause multiple, recovery da ogni stato, orologio indietro; storage: round-trip export/import, migrazioni, corruzione; streak/badge: tutte le soglie, jolly weekend.
- **Component (Testing Library)** — Rainbow renderizza correttamente a progress 0 / 0.5 / 6.999/7 / 1; long-press: attiva a 3 s, annulla su movimento; wizard: validazioni di ogni step.
- **E2E (Playwright)** — 1) wizard completo → Oggi popolata; 2) "Fatta" ×2 → streak +1 a fine giornata; 3) avvio timer → reload pagina → progresso coerente → celebrazione; 4) cambio meteo → slot esterni sostituiti; 5) export → reset → import → stato identico.
- **Checklist manuale su device reale (prima del "fine lavori")** — installazione PWA iOS e Android; offline totale (modalità aereo); suoni dopo lock/unlock; wake lock 10 min; landscape; luminosità/leggibilità in cucina; test con la bimba vera: capisce il sole? 😊
- Comando unico `npm run check` = typecheck + lint + unit + build: deve passare **sempre** prima di considerare chiusa una milestone.

---

## 13. Piano di sviluppo a milestone

Ogni milestone è una sessione di sviluppo autonoma con Claude Code, si chiude solo con `npm run check` verde + criteri soddisfatti.

| M | Contenuto | Criteri di accettazione |
|---|---|---|
| **M0** | Scaffold: Vite+React+TS strict, Tailwind, ESLint/Prettier, Vitest, Playwright, router, `npm run check` | Il comando check passa; pagina placeholder con gradiente firma animato |
| **M1** | Design system: token, font self-hosted, Button/Card/Modal/Sheet/Chip/TimeField, PageFlip3D, TiltCard, suoni+AudioManager, storage layer (envelope, zod, migrazioni, export/import) | Pagina demo `/dev/ui` mostra tutto; unit storage verdi |
| **M2** | Wizard 6 step completo + persistenza profilo | E2E wizard verde; validazioni testate; rilancio da impostazioni |
| **M3** | Catalogo 150 attività trascritto + planner completo | P-GEN-1…5 verdi; catalogo validato da zod (id unici, campi completi) |
| **M4** | Vista Oggi completa (timeline, dettaglio, done/skip/swap, meteo, anteprima domani) | E2E flusso giornata verde; mezzanotte simulata ok |
| **M5** | Timer pasti completo (arcobaleno, sole, suoni, wake lock, child-lock, recovery, celebrazione) | E2E timer verde; test manuale su telefono reale ok |
| **M6** | Calendario, giorni speciali, impostazioni complete, streak+badge+recap | E2E calendario e import/export verdi |
| **M7** | PWA (manifest, SW precache, update prompt), performance budget, polish animazioni, checklist QA manuale completa | Installabile e funzionante offline; Lighthouse PWA ok; checklist §12 firmata |

Prompt suggerito per ogni sessione: *"Leggi `docs/superpowers/specs/2026-07-04-aurorapp-design.md` (e il catalogo) e implementa la milestone Mx rispettando i criteri di accettazione. Esegui `npm run check` prima di dichiarare finito."*

---

## 14. Criteri di accettazione finali (Given/When/Then)

1. **Wizard** — Dato un primo avvio, quando completo i 6 step con dati validi, allora atterro su Oggi con 5 slot popolati e il profilo persistito (sopravvive al refresh).
2. **Anti-noia** — Dato un periodo di 92 giorni, quando genero tutti i piani, allora nessuna attività si ripete entro 14 giorni e nessun giorno ha categorie duplicate.
3. **Determinismo** — Dato lo stesso profilo, quando rigenero lo stesso giorno senza toccare nonce/meteo, allora ottengo lo stesso identico piano.
4. **Meteo** — Dato un giorno con slot all'esterno, quando imposto 🌧️, allora i soli slot non completati diventano attività da interno, subito.
5. **Timer felice** — Dato l'avvio del timer pranzo da 60 min, quando passano 60 minuti (anche con telefono bloccato nel mezzo), allora vedo l'arcobaleno completo, il sole alla nuvoletta e la celebrazione col nome.
6. **Timer robusto** — Dato un timer al 50%, quando chiudo il browser e riapro dopo 10 min, allora il progresso riflette il tempo reale trascorso.
7. **Child-lock** — Dato il timer attivo, quando la bimba tocca/striscia il dito ovunque, allora appaiono solo stelline e nulla si interrompe; una pressione lunga 3 s dell'adulto mette in pausa.
8. **Offline** — Data l'app installata e visitata una volta, quando attivo la modalità aereo e la riapro, allora tutto funziona identicamente.
9. **Backup** — Dato uno stato con 30 giorni di storia, quando esporto, azzero e importo, allora lo stato è bit-a-bit identico.
10. **Accessibilità** — Dato `prefers-reduced-motion`, quando navigo l'app, allora nessuna animazione 3D/coriandoli, solo fade.

---

## 15. Glossario

| Termine | Significato |
|---|---|
| **Ancora** | Momento fisso della routine (sveglia, pasti, riposino, nanna) da cui derivano gli slot |
| **Slot** | Finestra tra due ancore riempita dal generatore (M1, M2, P1, P2, SERA) |
| **Materializzare** | Generare e salvare il `DayPlan` di una data (sempre in ordine cronologico) |
| **Giorno speciale** | Giorno con piano sospeso (mare, nonni, viaggio) che non rompe lo streak |
| **Child-lock** | Pattern long-press 3 s che riserva i controlli all'adulto |
| **Jolly** | Giorno weekend/speciale con < 2 attività fatte che non interrompe lo streak |
| **Catalogo** | Le 150 attività normative dell'appendice |

*Fine specifiche. Il catalogo attività è nel documento `2026-07-04-aurorapp-catalogo-attivita.md`.*

