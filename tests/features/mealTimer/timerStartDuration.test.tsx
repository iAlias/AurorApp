import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';

// Stesso pattern di timerStore.test.ts / mealTimerPageDoneRegression.test.tsx:
// import dinamico dopo il reset dei moduli, cosi' store e componente
// risolvono verso la stessa istanza fresca del modulo store.
async function freshTimerStart() {
  const [{ useApp }, { TimerStart }] = await Promise.all([
    import('../../../src/app/store'),
    import('../../../src/features/mealTimer/TimerStart'),
  ]);
  return { useApp, TimerStart };
}

function renderAtLunch(TimerStart: ComponentType) {
  render(
    <MemoryRouter initialEntries={['/timer?pasto=pranzo']}>
      <TimerStart />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TimerStart — durata minima 1 minuto + inserimento manuale da tastiera', () => {
  test('lo stepper "Riduci durata" puo\' arrivare fino a 1 minuto (non piu\' bloccato a 15)', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    const decrease = screen.getByRole('button', { name: /riduci durata/i });
    // Default 60 min, step 5: serve arrivare vicino a 1 (60 -> 5 dopo 11 tap,
    // poi un altro tap sotto 5 deve clampare a 1, non andare negativo).
    for (let i = 0; i < 12; i += 1) {
      await user.click(decrease);
    }

    expect(screen.getByText(/^1 min$/)).toBeInTheDocument();
  });

  test('l\'icona matita apre un campo numerico precompilato col valore corrente', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /modifica durata da tastiera/i }));

    const input = screen.getByRole('spinbutton', { name: /durata in minuti/i });
    expect(input).toHaveValue(60);
  });

  test('Invio conferma il valore digitato (passando per il clamp 1-90)', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /modifica durata da tastiera/i }));
    const input = screen.getByRole('spinbutton', { name: /durata in minuti/i });
    await user.clear(input);
    await user.type(input, '27');
    await user.keyboard('{Enter}');

    expect(screen.getByText(/^27 min$/)).toBeInTheDocument();
    // Il campo di modifica si chiude dopo la conferma.
    expect(screen.queryByRole('spinbutton', { name: /durata in minuti/i })).not.toBeInTheDocument();
  });

  test('un valore sopra 90 viene clampato a 90', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /modifica durata da tastiera/i }));
    const input = screen.getByRole('spinbutton', { name: /durata in minuti/i });
    await user.clear(input);
    await user.type(input, '999');
    await user.keyboard('{Enter}');

    expect(screen.getByText(/^90 min$/)).toBeInTheDocument();
  });

  test('un valore sotto 1 (es. 0) viene clampato a 1', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /modifica durata da tastiera/i }));
    const input = screen.getByRole('spinbutton', { name: /durata in minuti/i });
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');

    expect(screen.getByText(/^1 min$/)).toBeInTheDocument();
  });

  test('Esc annulla la modifica: il valore precedente resta invariato', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /modifica durata da tastiera/i }));
    const input = screen.getByRole('spinbutton', { name: /durata in minuti/i });
    await user.clear(input);
    await user.type(input, '5');
    await user.keyboard('{Escape}');

    expect(screen.getByText(/^60 min$/)).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: /durata in minuti/i })).not.toBeInTheDocument();
  });

  test('il bottone ✕ annulla la modifica senza applicare il valore digitato', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /modifica durata da tastiera/i }));
    const input = screen.getByRole('spinbutton', { name: /durata in minuti/i });
    await user.clear(input);
    await user.type(input, '42');
    await user.click(screen.getByRole('button', { name: /annulla modifica durata/i }));

    expect(screen.getByText(/^60 min$/)).toBeInTheDocument();
  });

  test('E3: l\'inserimento manuale non scrive mai in settings.meals (vive solo nella sessione)', async () => {
    const { useApp, TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /modifica durata da tastiera/i }));
    const input = screen.getByRole('spinbutton', { name: /durata in minuti/i });
    await user.clear(input);
    await user.type(input, '33');
    await user.keyboard('{Enter}');

    expect(screen.getByText(/^33 min$/)).toBeInTheDocument();
    expect(useApp.getState().settings.meals.lunchMinutes).toBe(60);
  });
});

describe('TimerStart — 5 preset (Task 1: vestirsi/riordino/campo libero)', () => {
  test('i 5 chip (Pranzo/Cena/Vestirsi/Riordino/Altro) sono tutti visibili', async () => {
    const { TimerStart } = await freshTimerStart();
    renderAtLunch(TimerStart);

    expect(screen.getByRole('button', { name: /pranzo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cena/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vestirsi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /riordino/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /altro/i })).toBeInTheDocument();
  });

  test('selezionare "Riordino" porta la durata al default di 5 min', async () => {
    const { TimerStart } = await freshTimerStart();
    const user = userEvent.setup();
    renderAtLunch(TimerStart);

    await user.click(screen.getByRole('button', { name: /riordino/i }));

    expect(screen.getByText(/^5 min$/)).toBeInTheDocument();
  });

  test('avviare con "Vestirsi" dispaccia START con meal: "vestirsi" e la durata scelta (dopo il countdown 3-2-1)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { useApp, TimerStart } = await freshTimerStart();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderAtLunch(TimerStart);

      await user.click(screen.getByRole('button', { name: /vestirsi/i }));
      await user.click(screen.getByRole('button', { name: /ci vestiamo/i }));

      // Countdown 3-2-1: 3 step da 700ms (§useCountdown), poi dispaccia START.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3 * 700);
      });

      expect(useApp.getState().timer?.meal).toBe('vestirsi');
      expect(useApp.getState().timer?.durationMs).toBe(10 * 60_000);
    } finally {
      vi.useRealTimers();
    }
  });

  test('?pasto=vestirsi preseleziona il chip "Vestirsi" e la durata a 10 min', async () => {
    const { TimerStart } = await freshTimerStart();
    render(
      <MemoryRouter initialEntries={['/timer?pasto=vestirsi']}>
        <TimerStart />
      </MemoryRouter>,
    );

    expect(screen.getByText(/^10 min$/)).toBeInTheDocument();
  });
});
