import type { StorageEnvelope } from '../catalog/types';
import { STORAGE_KEY, emptyEnvelope, migrate, MigrationError } from './envelope';

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Legge e valida l'envelope da storage. Nessun dato salvato → envelope vuota
 * (primo avvio, non è corruzione). Dato illeggibile o non valido → `ok:false`
 * con l'errore di migrazione e la stringa grezza originale (per il recupero, E5).
 */
export function loadEnvelope(
  storage: Pick<Storage, 'getItem'>,
): { ok: true; env: StorageEnvelope } | { ok: false; error: MigrationError; raw: string | null } {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return { ok: true, env: emptyEnvelope() };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: new MigrationError('invalid'), raw };
  }

  try {
    const env = migrate(parsed);
    return { ok: true, env };
  } catch (e) {
    const error = e instanceof MigrationError ? e : new MigrationError('invalid');
    return { ok: false, error, raw };
  }
}

function isQuotaExceededError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'QuotaExceededError';
}

/**
 * Scrittura immediata (write-through). Intercetta `QuotaExceededError` per
 * nome: la app continua in sola lettura dello stato in RAM (E6).
 */
export function saveNow(
  storage: Pick<Storage, 'setItem'>,
  env: StorageEnvelope,
): { ok: boolean; quotaExceeded?: boolean } {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(env));
    return { ok: true };
  } catch (e) {
    if (isQuotaExceededError(e)) {
      return { ok: false, quotaExceeded: true };
    }
    return { ok: false };
  }
}

/**
 * Debounce (default 300ms) per le scritture correnti. `flush()` salva subito
 * e annulla il timer pendente (usato prima di operazioni critiche/unload).
 */
export function makeDebouncedSave(
  saveFn: () => void,
  ms: number = DEFAULT_DEBOUNCE_MS,
): { schedule(): void; flush(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function schedule(): void {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      saveFn();
    }, ms);
  }

  function flush(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    saveFn();
  }

  return { schedule, flush };
}
