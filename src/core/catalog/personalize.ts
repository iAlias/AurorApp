import type { Activity, Gender } from './types';

export interface Who {
  name: string;
  gender: Gender;
}

const VARIANT = /\{([^{}|]*)\|([^{}|]*)\}/g;

/**
 * Testi rivolti al bambino: `{nome}` diventa il suo nome e le varianti di
 * genere scritte come `{femminile|maschile}` (es. "comanda {lei|lui}",
 * "sdraiat{a|o}") si risolvono sulla variante del profilo.
 */
export function personalize(text: string, who: Who): string {
  return text
    .replace(VARIANT, (_, f: string, m: string) => (who.gender === 'm' ? m : f))
    .replaceAll('{nome}', who.name);
}

/** Tutti i campi testuali di un'attività personalizzati (vedi `personalize`). */
export function personalizeActivity(a: Activity, who: Who): Activity {
  const p = (t: string) => personalize(t, who);
  return {
    ...a,
    title: p(a.title),
    materials: a.materials.map(p),
    steps: a.steps.map(p),
    develops: a.develops.map(p),
    variation: p(a.variation),
    safety: a.safety === undefined ? undefined : p(a.safety),
  };
}
