import type { CategoryId } from './types';

export const CATEGORIES: Record<CategoryId, { name: string; emoji: string }> = {
  MOT: { name: 'Movimento', emoji: '🤸' }, CRE: { name: 'Creatività', emoji: '🎨' },
  SEN: { name: 'Sensoriale', emoji: '🖐' }, COG: { name: 'Logica e scoperte', emoji: '🧩' },
  MUS: { name: 'Musica e ritmo', emoji: '🎵' }, SIM: { name: 'Gioco simbolico', emoji: '🎭' },
  ACQ: { name: 'Acqua', emoji: '💦' }, NAT: { name: 'Natura', emoji: '🌿' },
  CUC: { name: 'Cucina insieme', emoji: '🍪' }, CAL: { name: 'Calma e libri', emoji: '🌙' },
};
