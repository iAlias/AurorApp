import { differenceInCalendarDays, differenceInMonths, differenceInYears, parseISO } from 'date-fns';
import { RoutineSettings, MealSettings } from '../../core/catalog/types';
import { deriveSlots } from '../../core/planner/slots';

/**
 * Valida il nome del bambino.
 * Regole: trim, 1–20 caratteri, ammessi lettere unicode/spazi/apostrofi/accenti
 * Regex: /^[\p{L}][\p{L}' ]{0,19}$/u (inizia con lettera, seguito da 0–19 di lettere/spazi/apostrofi)
 */
export function validateName(name: string): string | null {
  const trimmed = name.trim();

  // Regex pattern: starts with unicode letter, followed by 0-19 of (unicode letters, spaces, or apostrophes)
  const nameRegex = /^[\p{L}][\p{L}' ]{0,19}$/u;

  if (!nameRegex.test(trimmed)) {
    return 'Il nome deve avere 1–20 caratteri e contenere solo lettere, spazi e apostrofi.';
  }

  return null;
}

/**
 * Valida le date di vacanza.
 * Regole: end > start, differenza <= 180 giorni
 */
export function validateVacation(startISO: string, endISO: string): string | null {
  const start = parseISO(startISO);
  const end = parseISO(endISO);

  // end must be after start
  if (end <= start) {
    return 'La data di fine vacanza deve essere successiva alla data di inizio.';
  }

  // Calculate difference in calendar days (DST-safe, unlike raw ms subtraction)
  const diffDays = differenceInCalendarDays(end, start);

  if (diffDays > 180) {
    return 'La vacanza non può durare più di 180 giorni.';
  }

  return null;
}

/**
 * Calcola l'etichetta dell'età del bambino in formato italiano.
 * Esempio: "3 anni e 1 mese"
 */
export function ageLabel(birthISO: string, todayISO: string): string {
  const birth = parseISO(birthISO);
  const today = parseISO(todayISO);

  const years = differenceInYears(today, birth);
  const months = differenceInMonths(today, birth) % 12;

  // Under 1 year old and no full months yet: no years/months part to report.
  if (years === 0 && months === 0) {
    return 'meno di 1 mese';
  }

  // Build the label
  let label = '';

  // Add years part
  if (years === 1) {
    label += '1 anno';
  } else if (years > 1) {
    label += `${years} anni`;
  }

  // Add months part
  if (months > 0) {
    if (label) {
      label += ' e ';
    }
    if (months === 1) {
      label += '1 mese';
    } else {
      label += `${months} mesi`;
    }
  }

  return label;
}

/**
 * Ritorna un messaggio di avvertimento se il bambino non è nel range 2–5 anni.
 * Altrimenti ritorna null (OK).
 */
export function ageWarning(birthISO: string, todayISO: string): string | null {
  const birth = parseISO(birthISO);
  const today = parseISO(todayISO);

  const years = differenceInYears(today, birth);

  if (years < 2) {
    return 'Aurora è pensata per bambini tra i 2 e i 5 anni. Questo bambino è troppo piccolo.';
  }

  if (years > 5) {
    return 'Aurora è pensata per bambini tra i 2 e i 5 anni. Questo bambino è troppo grande.';
  }

  return null;
}

/**
 * Converte un orario HH:mm in minuti da mezzanotte.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Valida la configurazione della routine.
 * Controlla che gli orari siano in ordine crescente (strettamente) e — Task 20,
 * vincolo rimandato dal Task 8 — che ogni slot attività feriale derivato
 * (`deriveSlots`, §7) lasci almeno 20 minuti per giocare. Un ordine
 * "tecnicamente" crescente può comunque comprimere uno slot a pochi minuti
 * (es. M2 di 5 minuti fra merenda e pranzo): questo secondo controllo evita
 * di salvare una routine formalmente valida ma inutilizzabile.
 */
export function validateRoutine(
  r: RoutineSettings,
  meals: MealSettings,
): string | null {
  const times = [
    { name: 'wakeTime', value: r.wakeTime },
    { name: 'breakfastEnd', value: r.breakfastEnd },
    { name: 'morningSnackStart', value: r.morningSnackStart },
    { name: 'morningSnackEnd', value: r.morningSnackEnd },
    { name: 'lunchStart', value: r.lunchStart },
    { name: 'napStart', value: r.napStart },
    { name: 'afternoonSnackEnd', value: r.afternoonSnackEnd },
    { name: 'dinnerStart', value: r.dinnerStart },
    { name: 'bedTime', value: r.bedTime },
  ];

  // Check that times are in strictly increasing order
  for (let i = 0; i < times.length - 1; i++) {
    const current = timeToMinutes(times[i].value);
    const next = timeToMinutes(times[i + 1].value);

    if (current >= next) {
      return 'Gli orari della routine devono essere in ordine crescente. Verifica che questo orario lascia troppo poco tempo per giocare.';
    }
  }

  // Ordine valido: verifica comunque che ogni slot feriale (M1/M2/P1/P2/SERA,
  // familyDay:false — il caso più stretto, il weekend ha solo M1/P1) lasci
  // almeno 20 minuti per giocare.
  const slots = deriveSlots(r, meals, false);
  if (slots.some((s) => s.durationMin < 20)) {
    return 'Questo orario lascia troppo poco tempo per giocare.';
  }

  return null;
}

/**
 * Avatar costanti
 */
export const AVATARS = [
  { id: 'volpina', emoji: '🦊', label: 'volpina' },
  { id: 'coniglietta', emoji: '🐰', label: 'coniglietta' },
  { id: 'orsetta', emoji: '🐻', label: 'orsetta' },
  { id: 'gattina', emoji: '🐱', label: 'gattina' },
  { id: 'dinosaura', emoji: '🦖', label: 'dinosaura' },
  { id: 'unicorno', emoji: '🦄', label: 'unicorno' },
  { id: 'ranocchia', emoji: '🐸', label: 'ranocchia' },
  { id: 'stellina', emoji: '⭐', label: 'stellina' },
];
