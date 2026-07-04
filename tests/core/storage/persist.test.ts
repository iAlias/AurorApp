import type { StorageEnvelope } from '../../../src/core/catalog/types';
import { DEFAULT_SETTINGS } from '../../../src/core/catalog/types';
import { STORAGE_KEY, emptyEnvelope, MigrationError } from '../../../src/core/storage/envelope';
import { loadEnvelope, saveNow, makeDebouncedSave } from '../../../src/core/storage/persist';

function validEnvelope(): StorageEnvelope {
  return {
    schemaVersion: 1,
    savedAt: '2026-07-04T10:00:00.000Z',
    profile: null,
    settings: DEFAULT_SETTINGS,
    plans: {},
    progress: {
      streak: 0,
      lastStreakDate: null,
      badges: {},
      doneByCategory: {
        MOT: 0, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0,
      },
      mealTimersCompleted: 0,
    },
    timer: null,
  };
}

function fakeGetItemStorage(value: string | null): Pick<Storage, 'getItem'> {
  return { getItem: () => value };
}

describe('loadEnvelope', () => {
  test('nessun dato salvato → ok true con envelope vuota', () => {
    const result = loadEnvelope(fakeGetItemStorage(null));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env.profile).toBeNull();
      expect(result.env.schemaVersion).toBe(1);
    }
  });

  test('dato valido salvato → ok true con envelope corrispondente', () => {
    const env = validEnvelope();
    const result = loadEnvelope(fakeGetItemStorage(JSON.stringify(env)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.env).toEqual(env);
    }
  });

  test('JSON corrotto → ok false, error MigrationError invalid, raw = stringa originale', () => {
    const raw = '{{{ non è json';
    const result = loadEnvelope(fakeGetItemStorage(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(MigrationError);
      expect(result.error.kind).toBe('invalid');
      expect(result.raw).toBe(raw);
    }
  });

  test('schemaVersion più recente → ok false, error newer', () => {
    const raw = JSON.stringify({ ...validEnvelope(), schemaVersion: 42 });
    const result = loadEnvelope(fakeGetItemStorage(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('newer');
      expect(result.raw).toBe(raw);
    }
  });

  test('oggetto valido ma con campi mancanti → ok false, error invalid', () => {
    const raw = JSON.stringify({ schemaVersion: 1, foo: 'bar' });
    const result = loadEnvelope(fakeGetItemStorage(raw));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid');
    }
  });
});

describe('saveNow', () => {
  test('scrittura riuscita → { ok: true }, setItem chiamato con la chiave giusta', () => {
    const setItem = vi.fn();
    const env = emptyEnvelope();
    const result = saveNow({ setItem }, env);
    expect(result).toEqual({ ok: true });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(env));
  });

  test('quota piena (mock setItem che lancia QuotaExceededError) → { ok:false, quotaExceeded:true }', () => {
    const setItem = vi.fn(() => {
      const err = new Error('quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const result = saveNow({ setItem }, emptyEnvelope());
    expect(result).toEqual({ ok: false, quotaExceeded: true });
  });

  test('errore generico (non quota) → { ok:false } senza quotaExceeded', () => {
    const setItem = vi.fn(() => {
      throw new Error('boom');
    });
    const result = saveNow({ setItem }, emptyEnvelope());
    expect(result.ok).toBe(false);
    expect(result.quotaExceeded).toBeFalsy();
  });
});

describe('makeDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('chiamate ravvicinate → un solo save dopo 300ms (default)', () => {
    const saveFn = vi.fn();
    const debounced = makeDebouncedSave(saveFn);

    debounced.schedule();
    vi.advanceTimersByTime(100);
    debounced.schedule();
    vi.advanceTimersByTime(100);
    debounced.schedule();
    expect(saveFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  test('flush() salva subito e annulla il timer pendente', () => {
    const saveFn = vi.fn();
    const debounced = makeDebouncedSave(saveFn);

    debounced.schedule();
    vi.advanceTimersByTime(50);
    debounced.flush();
    expect(saveFn).toHaveBeenCalledTimes(1);

    // il timer pendente non deve scattare di nuovo
    vi.advanceTimersByTime(300);
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  test('rispetta un ms personalizzato', () => {
    const saveFn = vi.fn();
    const debounced = makeDebouncedSave(saveFn, 1000);

    debounced.schedule();
    vi.advanceTimersByTime(300);
    expect(saveFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(700);
    expect(saveFn).toHaveBeenCalledTimes(1);
  });
});
