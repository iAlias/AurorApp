import { describe, test, expect } from 'vitest';
import {
  validateName,
  ageLabel,
  ageWarning,
  validateRoutine,
  AVATARS,
} from '../../../src/features/wizard/wizardLogic';
import { DEFAULT_ROUTINE, DEFAULT_MEALS } from '../../../src/core/catalog/types';

describe('wizardLogic', () => {
  describe('validateName', () => {
    test('accetta nomi validi: Sofia', () => {
      expect(validateName('Sofia')).toBeNull();
    });

    test('accetta nomi validi: Anna Lisa', () => {
      expect(validateName('Anna Lisa')).toBeNull();
    });

    test('accetta nomi validi: D\'Ambra', () => {
      expect(validateName("D'Ambra")).toBeNull();
    });

    test('rifiuta nome vuoto', () => {
      expect(validateName('')).not.toBeNull();
    });

    test('rifiuta nome con cifre: A1', () => {
      expect(validateName('A1')).not.toBeNull();
    });

    test('rifiuta nome > 20 caratteri', () => {
      expect(validateName('A'.repeat(21))).not.toBeNull();
    });

    test('rifiuta nome con emoji: 😀', () => {
      expect(validateName('Sofia😀')).not.toBeNull();
    });

    test('accetta nome con accenti: Àlice', () => {
      expect(validateName('Àlice')).toBeNull();
    });

    test('accetta nome di esattamente 20 caratteri', () => {
      expect(validateName('A'.repeat(20))).toBeNull();
    });
  });

  describe('ageLabel', () => {
    test('calcola età corretta: 3 anni e 1 mese', () => {
      const result = ageLabel('2023-05-10', '2026-07-04');
      expect(result).toBe('3 anni e 1 mese');
    });

    test('singolare per 1 anno', () => {
      const result = ageLabel('2025-07-04', '2026-07-04');
      expect(result).toBe('1 anno');
    });

    test('plurale per più anni', () => {
      const result = ageLabel('2023-07-04', '2026-07-04');
      expect(result).toBe('3 anni');
    });

    test('singolare per 1 mese', () => {
      const result = ageLabel('2026-06-04', '2026-07-04');
      expect(result).toBe('1 mese');
    });

    test('plurale per più mesi', () => {
      const result = ageLabel('2026-05-04', '2026-07-04');
      expect(result).toBe('2 mesi');
    });

    test('meno di 1 mese quando nato oggi (years===0, months===0)', () => {
      const result = ageLabel('2026-07-04', '2026-07-04');
      expect(result).toBe('meno di 1 mese');
    });

    test('3 mesi quando nato meno di 1 anno fa (years===0, months>0)', () => {
      const result = ageLabel('2026-04-04', '2026-07-04');
      expect(result).toBe('3 mesi');
    });

    test('conta correttamente con boundary di mese', () => {
      // Nato 2023-06-15, oggi 2026-07-04 -> 3 anni esatti perchè non abbiamo raggiunto
      // ancora il mese pieno successivo (siamo a luglio 4, non luglio 15)
      const result = ageLabel('2023-06-15', '2026-07-04');
      expect(result).toBe('3 anni');
    });
  });

  describe('ageWarning', () => {
    test('ritorna null per bambino in range 2-5 anni', () => {
      // Nato 2023-05-10, oggi 2026-07-04 = 3 anni e 1 mese (in range)
      expect(ageWarning('2023-05-10', '2026-07-04')).toBeNull();
    });

    test('ritorna warning per bambino < 2 anni', () => {
      // Nato 2024-10-01, oggi 2026-07-04 = ~1 anno e 9 mesi (< 2 anni)
      expect(ageWarning('2024-10-01', '2026-07-04')).not.toBeNull();
    });

    test('ritorna warning per bambino > 5 anni', () => {
      // Nato 2019-07-04, oggi 2026-07-04 = 7 anni (> 5 anni)
      expect(ageWarning('2019-07-04', '2026-07-04')).not.toBeNull();
    });

    test('ritorna null per bambino di esattamente 2 anni', () => {
      // Nato 2024-07-04, oggi 2026-07-04 = 2 anni
      expect(ageWarning('2024-07-04', '2026-07-04')).toBeNull();
    });

    test('ritorna null per bambino di esattamente 5 anni', () => {
      // Nato 2021-07-04, oggi 2026-07-04 = 5 anni
      expect(ageWarning('2021-07-04', '2026-07-04')).toBeNull();
    });
  });

  describe('validateRoutine', () => {
    test('accetta routine con ordine crescente corretto', () => {
      expect(validateRoutine(DEFAULT_ROUTINE, DEFAULT_MEALS)).toBeNull();
    });

    test('rifiuta quando napStart < lunchStart', () => {
      const invalid = {
        ...DEFAULT_ROUTINE,
        napStart: '12:00', // prima di lunchStart
        lunchStart: '13:00',
      };
      expect(validateRoutine(invalid, DEFAULT_MEALS)).not.toBeNull();
    });

    test('rifiuta quando breakfastEnd > morningSnackStart', () => {
      const invalid = {
        ...DEFAULT_ROUTINE,
        breakfastEnd: '11:15',
        morningSnackStart: '11:00',
      };
      expect(validateRoutine(invalid, DEFAULT_MEALS)).not.toBeNull();
    });

    test('rifiuta quando dinnerStart > bedTime', () => {
      const invalid = {
        ...DEFAULT_ROUTINE,
        dinnerStart: '21:30',
        bedTime: '21:00',
      };
      expect(validateRoutine(invalid, DEFAULT_MEALS)).not.toBeNull();
    });

    test('rifiuta quando tempi sono uguali', () => {
      // Tempi rigorosamente crescenti richiesti
      const sameTime = {
        ...DEFAULT_ROUTINE,
        breakfastEnd: '11:00',
        morningSnackStart: '11:00',
      };
      expect(validateRoutine(sameTime, DEFAULT_MEALS)).not.toBeNull();
    });

    test('errore contiene messaggio italiano appropriato', () => {
      const invalid = {
        ...DEFAULT_ROUTINE,
        napStart: '12:00',
        lunchStart: '13:00',
      };
      const error = validateRoutine(invalid, DEFAULT_MEALS);
      expect(error).toMatch(/orario/i);
    });

    // Task 20: vincolo rimandato dal Task 8 — ordine crescente valido ma uno
    // slot derivato (M2, fra merenda mattutina e pranzo) resta troppo corto.
    test('rifiuta ordine valido che lascia uno slot <20min (M2 troppo corto)', () => {
      const tooTight = {
        ...DEFAULT_ROUTINE,
        morningSnackEnd: '12:30', // lunchStart 13:00 → M2 dura 780-20-750=10min
      };
      // Precondizione: l'ordine resta valido (nessun errore di sequenza).
      expect(tooTight.morningSnackStart < tooTight.morningSnackEnd).toBe(true);
      expect(tooTight.morningSnackEnd < tooTight.lunchStart).toBe(true);

      const error = validateRoutine(tooTight, DEFAULT_MEALS);
      expect(error).not.toBeNull();
      expect(error).toMatch(/troppo poco tempo per giocare/i);
    });

    test('accetta la routine di default (tutti gli slot ≥20min)', () => {
      expect(validateRoutine(DEFAULT_ROUTINE, DEFAULT_MEALS)).toBeNull();
    });
  });

  describe('AVATARS', () => {
    test('contiene 8 avatar', () => {
      expect(AVATARS).toHaveLength(8);
    });

    test('volpina ha emoji 🦊', () => {
      const volpina = AVATARS.find(a => a.id === 'volpina');
      expect(volpina?.emoji).toBe('🦊');
      expect(volpina?.label).toBe('volpe');
    });

    test('coniglietta ha emoji 🐰', () => {
      const coniglietta = AVATARS.find(a => a.id === 'coniglietta');
      expect(coniglietta?.emoji).toBe('🐰');
    });

    test('orsetta ha emoji 🐻', () => {
      const orsetta = AVATARS.find(a => a.id === 'orsetta');
      expect(orsetta?.emoji).toBe('🐻');
    });

    test('gattina ha emoji 🐱', () => {
      const gattina = AVATARS.find(a => a.id === 'gattina');
      expect(gattina?.emoji).toBe('🐱');
    });

    test('dinosaura ha emoji 🦖', () => {
      const dinosaura = AVATARS.find(a => a.id === 'dinosaura');
      expect(dinosaura?.emoji).toBe('🦖');
    });

    test('unicorno ha emoji 🦄', () => {
      const unicorno = AVATARS.find(a => a.id === 'unicorno');
      expect(unicorno?.emoji).toBe('🦄');
    });

    test('ranocchia ha emoji 🐸', () => {
      const ranocchia = AVATARS.find(a => a.id === 'ranocchia');
      expect(ranocchia?.emoji).toBe('🐸');
    });

    test('stellina ha emoji ⭐', () => {
      const stellina = AVATARS.find(a => a.id === 'stellina');
      expect(stellina?.emoji).toBe('⭐');
    });

    test('tutti gli avatar hanno id, emoji, label', () => {
      AVATARS.forEach(avatar => {
        expect(avatar).toHaveProperty('id');
        expect(avatar).toHaveProperty('emoji');
        expect(avatar).toHaveProperty('label');
        expect(typeof avatar.id).toBe('string');
        expect(typeof avatar.emoji).toBe('string');
        expect(typeof avatar.label).toBe('string');
      });
    });
  });
});
