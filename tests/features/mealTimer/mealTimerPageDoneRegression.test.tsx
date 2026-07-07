import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const MIN = 60_000;

// Stesso pattern di timerStore.test.ts: import dinamico DOPO aver resettato i
// moduli, cosi' sia lo store sia MealTimerPage (che lo importa internamente)
// risolvono verso la stessa istanza fresca del modulo store — altrimenti
// condividerebbero stati diversi e il test non riprodurrebbe nulla.
async function freshMealTimerPage() {
  const [{ useApp }, { MealTimerPage }] = await Promise.all([
    import('../../../src/app/store'),
    import('../../../src/features/mealTimer/MealTimerPage'),
  ]);
  return { useApp, MealTimerPage };
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MealTimerPage — regressione: sessione "done" non deve bloccare /timer per il pasto seguente', () => {
  test('dopo CELEBRATION_DONE (pranzo), un mount successivo di MealTimerPage mostra TimerStart (pronta per la cena)', async () => {
    const { useApp, MealTimerPage } = await freshMealTimerPage();
    const nowSpy = vi.spyOn(Date, 'now');

    nowSpy.mockReturnValue(0);
    useApp
      .getState()
      .timerDispatch({ type: 'START', meal: 'pranzo', durationMs: 60 * MIN, dateISO: '2026-07-04' });

    nowSpy.mockReturnValue(61 * MIN);
    useApp.getState().timerDispatch({ type: 'TICK' }); // running -> celebrating

    useApp.getState().timerDispatch({ type: 'CELEBRATION_DONE' }); // celebrating -> done -> (store) null

    // Bug originale: senza il fix, lo stato "done" restava persistito e
    // questo secondo mount di MealTimerPage (es. per la cena, ore dopo)
    // faceva navigate('/oggi') invece di mostrare TimerStart, rendendo
    // impossibile avviare un nuovo timer.
    render(
      <MemoryRouter>
        <MealTimerPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /si mangia/i })).toBeInTheDocument();
    expect(useApp.getState().timer).toBeNull();
  });
});
