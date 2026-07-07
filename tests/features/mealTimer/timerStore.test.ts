import { STORAGE_KEY } from '../../../src/core/storage/envelope';
import type { StorageEnvelope } from '../../../src/core/catalog/types';

const MIN = 60_000;

// Ogni test importa dinamicamente il modulo dopo aver pulito localStorage,
// cosi' lo store (creato una sola volta al primo import) riparte da
// un'envelope vuota (stesso pattern di tests/app/store.test.ts).
async function freshStore() {
  return import('../../../src/app/store');
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('timerDispatch — Step 17.1', () => {
  test('START scrive subito la sessione in localStorage (write-through)', async () => {
    const { useApp } = await freshStore();

    useApp
      .getState()
      .timerDispatch({ type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' });

    const state = useApp.getState();
    expect(state.timer).not.toBeNull();
    expect(state.timer?.status).toBe('running');
    expect(state.timer?.meal).toBe('pranzo');

    // Nessun debounce: la scrittura e' immediata, prima di qualunque timer.
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.timer?.status).toBe('running');
    expect(saved.timer?.meal).toBe('pranzo');
  });

  test('TICK oltre la durata porta a celebrating e incrementa mealTimersCompleted una sola volta', async () => {
    const { useApp } = await freshStore();
    const nowSpy = vi.spyOn(Date, 'now');

    nowSpy.mockReturnValue(0);
    useApp
      .getState()
      .timerDispatch({ type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' });
    expect(useApp.getState().progress.mealTimersCompleted).toBe(0);

    nowSpy.mockReturnValue(61 * MIN);
    useApp.getState().timerDispatch({ type: 'TICK' });

    expect(useApp.getState().timer?.status).toBe('celebrating');
    expect(useApp.getState().progress.mealTimersCompleted).toBe(1);

    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = JSON.parse(raw as string) as StorageEnvelope;
    expect(saved.progress.mealTimersCompleted).toBe(1);

    // Un secondo TICK (es. un altro frame del loop rAF prima dello switch di
    // schermata) e' un no-op sulla macchina a stati: nessun doppio incremento.
    useApp.getState().timerDispatch({ type: 'TICK' });
    expect(useApp.getState().progress.mealTimersCompleted).toBe(1);
  });
});

describe('restoreTimer — recovery E1', () => {
  test('sessione running scaduta nel frattempo (telefono bloccato/riavviato) salta a celebrating e conta il pasto', async () => {
    const { useApp } = await freshStore();
    const nowSpy = vi.spyOn(Date, 'now');

    nowSpy.mockReturnValue(0);
    useApp
      .getState()
      .timerDispatch({ type: 'START', meal: 'cena', durationMs: 60 * MIN, dateISO: '2026-07-04' });

    useApp.getState().restoreTimer(2 * 60 * MIN); // 2h dopo, ben oltre i 60 min

    const state = useApp.getState();
    expect(state.timer?.status).toBe('celebrating');
    expect(state.progress.mealTimersCompleted).toBe(1);
  });

  test('nessuna sessione: no-op silenzioso, nessuna scrittura', async () => {
    const { useApp } = await freshStore();

    useApp.getState().restoreTimer(Date.now());

    expect(useApp.getState().timer).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
