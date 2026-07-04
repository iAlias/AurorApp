import { z } from 'zod';
import type { Activity, CategoryId } from './types';

const ID_RE = /^(MOT|CRE|SEN|COG|MUS|SIM|ACQ|NAT|CUC|CAL)-(0[1-9]|1[0-5])$/;

export const ActivitySchema = z.object({
  id: z.string().regex(ID_RE),
  category: z.enum(['MOT', 'CRE', 'SEN', 'COG', 'MUS', 'SIM', 'ACQ', 'NAT', 'CUC', 'CAL']),
  title: z.string().min(1),
  emoji: z.string().min(1),
  durationMin: z.number().int().min(1).max(60),
  energy: z.enum(['alta', 'media', 'bassa']),
  place: z.enum(['casa', 'esterno', 'entrambi']),
  requiresDry: z.boolean(),
  heatFriendly: z.boolean(),
  mess: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  materials: z.array(z.string()),
  steps: z.array(z.string()).min(2).max(4),
  develops: z.array(z.string()),
  variation: z.string(),
  interests: z
    .array(
      z.enum([
        'animali', 'disegno', 'musica', 'acqua', 'costruzioni',
        'travestimenti', 'natura', 'libri', 'cucinare', 'movimento',
      ]),
    )
    .min(1),
  family: z.boolean(),
  safety: z.string().optional(),
}) satisfies z.ZodType<Activity, z.ZodTypeDef, unknown>;

const CATEGORY_IDS: CategoryId[] = ['MOT', 'CRE', 'SEN', 'COG', 'MUS', 'SIM', 'ACQ', 'NAT', 'CUC', 'CAL'];

/** Valida il catalogo completo. Ritorna una lista di errori (vuota = catalogo valido). */
export function validateCatalog(list: Activity[]): string[] {
  const errors: string[] = [];

  for (const activity of list) {
    const parsed = ActivitySchema.safeParse(activity);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${activity.id ?? '(id mancante)'}: ${issue.path.join('.')} — ${issue.message}`);
      }
    }
  }

  if (list.length !== 150) {
    errors.push(`totale attività: atteso 150, trovato ${list.length}`);
  }

  for (const cat of CATEGORY_IDS) {
    const count = list.filter((a) => a.category === cat).length;
    if (count !== 15) {
      errors.push(`categoria ${cat}: atteso 15, trovato ${count}`);
    }
  }

  const idCounts = new Map<string, number>();
  for (const a of list) {
    idCounts.set(a.id, (idCounts.get(a.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`id duplicato: ${id} (${count} volte)`);
  }

  for (const a of list) {
    if (a.category === 'CAL') {
      if (a.energy !== 'bassa') {
        errors.push(`${a.id}: attività CAL deve avere energy 'bassa', trovato '${a.energy}'`);
      }
      if (a.durationMin > 30) {
        errors.push(`${a.id}: attività CAL deve avere durationMin <= 30, trovato ${a.durationMin}`);
      }
    }
    if (a.durationMin > 60) {
      errors.push(`${a.id}: durationMin deve essere <= 60, trovato ${a.durationMin}`);
    }
    if (a.steps.length < 2 || a.steps.length > 4) {
      errors.push(`${a.id}: steps.length deve essere tra 2 e 4, trovato ${a.steps.length}`);
    }
    if (a.interests.length < 1) {
      errors.push(`${a.id}: interests deve avere almeno 1 elemento`);
    }
    if (a.place === 'casa' && a.requiresDry) {
      errors.push(`${a.id}: place 'casa' non può avere requiresDry true`);
    }
  }

  return errors;
}
