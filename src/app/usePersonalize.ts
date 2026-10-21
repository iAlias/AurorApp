import { useCallback, useMemo } from 'react';
import { ACTIVITIES } from '../core/catalog/activities';
import { personalize, personalizeActivity } from '../core/catalog/personalize';
import type { Who } from '../core/catalog/personalize';
import type { Activity } from '../core/catalog/types';
import { useApp } from './store';

function useWho(): Who {
  const gender = useApp((s) => s.profile?.gender ?? 'f');
  // Senza profilo (wizard non ancora fatto) `{nome}` resta comunque leggibile.
  const name = useApp((s) => s.profile?.name) ?? (gender === 'm' ? 'il bimbo' : 'la bimba');
  return useMemo(() => ({ name, gender }), [name, gender]);
}

/** `p(testo)` con nome e genere del profilo (vedi `personalize`). */
export function usePersonalize(): (text: string) => string {
  const who = useWho();
  return useCallback((text: string) => personalize(text, who), [who]);
}

/**
 * Il catalogo come lo vede l'utente: stessi id e ordine di `ACTIVITIES`, testi
 * personalizzati. Le schermate leggono da qui; planner e store restano sul
 * catalogo grezzo (lavorano su id e tag, mai sui testi).
 */
export function useCatalog(): Activity[] {
  const who = useWho();
  return useMemo(() => ACTIVITIES.map((a) => personalizeActivity(a, who)), [who]);
}
