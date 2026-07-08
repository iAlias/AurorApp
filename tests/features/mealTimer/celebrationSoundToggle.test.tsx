import { render, screen } from '@testing-library/react';
import { useApp } from '../../../src/app/store';
import { Celebration } from '../../../src/features/mealTimer/Celebration';
import { audioManager } from '../../../src/ui/audio';
import type { TimerSession } from '../../../src/core/catalog/types';

// jsdom non implementa il canvas (HTMLCanvasElement.getContext): canvas-confetti
// pianifica il suo rendering via requestAnimationFrame e fallisce in modo
// asincrono e non catturabile dal try/catch di burst(). Non riguarda il
// comportamento sotto test (il toggle audio), quindi mockiamo burst().
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

function sessionFixture(overrides: Partial<TimerSession> = {}): TimerSession {
  return {
    meal: 'pranzo',
    dateISO: '2026-07-04',
    startedAt: 0,
    durationMs: 60 * 60_000,
    pausedAt: null,
    pausedTotalMs: 0,
    status: 'celebrating',
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// Stessa guardia gia' applicata in TimerRun per 'arc'/'almost' (§FR-6): il
// suono di festa non deve suonare se l'adulto ha disattivato "Suoni" nelle
// impostazioni, dato che audioManager non si auto-sincronizza con lo store.
describe('Celebration — il suono "party" rispetta meals.soundsOn', () => {
  test('soundsOn: false → audioManager.play non viene mai chiamato', () => {
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: false } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    render(<Celebration session={sessionFixture()} onDone={() => {}} />);

    expect(playSpy).not.toHaveBeenCalled();
  });

  test('soundsOn: true → audioManager.play("party") viene chiamato una volta all\'ingresso', () => {
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: true } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    render(<Celebration session={sessionFixture()} onDone={() => {}} />);

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(playSpy).toHaveBeenCalledWith('party');
  });
});

describe('Celebration — messaggio finale per kind (Task 1: preset vestirsi/riordino/libero)', () => {
  test('kind "vestirsi" mostra il messaggio dedicato "Tutta vestita, che brava! 👕"', () => {
    vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    render(<Celebration session={sessionFixture({ meal: 'vestirsi' })} onDone={() => {}} />);

    expect(screen.getByText('Tutta vestita, che brava! 👕')).toBeInTheDocument();
  });

  test('kind "pranzo" continua a mostrare "Pranzo delizioso! 🍝" (comportamento invariato)', () => {
    vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    render(<Celebration session={sessionFixture({ meal: 'pranzo' })} onDone={() => {}} />);

    expect(screen.getByText('Pranzo delizioso! 🍝')).toBeInTheDocument();
  });
});
