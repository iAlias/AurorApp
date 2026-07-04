import { describe, test, expect } from 'vitest';
import {
  validateName,
  validateVacation,
  ageLabel,
  ageWarning,
  validateRoutine,
  AVATARS,
} from '../../../src/features/wizard/wizardLogic';
import { DEFAULT_ROUTINE, DEFAULT_MEALS } from '../../../src/core/catalog/types';

describe('wizardLogic', () => {
  describe('validateName', () => {
    test('accetta nomi validi: Aurora', () => {
      expect(validateName('Aurora')).toBeNull();
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
      expect(validateName('Aurora😀')).not.toBeNull();
    });

    test('accetta nome con accenti: Àlice', () => {
      expect(validateName('Àlice')).toBeNull();
    });

    test('accetta nome di esattamente 20 caratteri', () => {
      expect(validateName('A'.repeat(20))).toBeNull();
    });
  });

  describe('validateVacation', () => {
    test('accetta vacanza valida', () => {
      expect(validateVacation('2026-07-01', '2026-07-15')).toBeNull();
    });

    test('rifiuta vacanza con end < start', () => {
      expect(validateVacation('2026-07-15', '2026-07-01')).not.toBeNull();
    });

    test('rifiuta vacanza con end = start', () => {
      expect(validateVacation('2026-07-01', '2026-07-01')).not.toBeNull();
    });

    test('rifiuta vacanza > 180 giorni', () => {
      expect(validateVacation('2026-01-01', '2026-07-01')).not.toBeNull();
    });

    test('accetta vacanza di esattamente 180 giorni', () => {
      expect(validateVacation('2026-01-01', '2026-06-30')).toBeNull();
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

    test('0 mesi quando stesso mese e giorno', () => {
      const result = ageLabel('2025-07-04', '2026-07-04');
      expect(result).toBe('1 anno');
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
  });

  describe('AVATARS', () => {
    test('contiene 8 avatar', () => {
      expect(AVATARS).toHaveLength(8);
    });

    test('volpina ha emoji 🦊', () => {
      const volpina = AVATARS.find(a => a.id === 'volpina');
      expect(volpina?.emoji).toBe('🦊');
      expect(volpina?.label).toBe('volpina');
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
