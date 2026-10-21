import type { StorageEnvelope } from '../catalog/types';
import { migrate, MigrationError } from './envelope';

/** Serializza l'envelope in JSON leggibile (indentato), pronto per il download. */
export function exportJson(env: StorageEnvelope): string {
  return JSON.stringify(env, null, 2);
}

/**
 * Valida un file di backup importato: JSON illeggibile o struttura non
 * valida → `invalid`; backup creato con una versione più recente → `newer`.
 */
export function parseBackup(
  text: string,
): { ok: true; env: StorageEnvelope } | { ok: false; reason: 'invalid' | 'newer' } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  try {
    const env = migrate(raw);
    return { ok: true, env };
  } catch (e) {
    const reason = e instanceof MigrationError ? e.kind : 'invalid';
    return { ok: false, reason };
  }
}

/** Nome file di backup: `arcobimbi-backup-YYYY-MM-DD.json`. */
export function backupFilename(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `arcobimbi-backup-${year}-${month}-${day}.json`;
}
