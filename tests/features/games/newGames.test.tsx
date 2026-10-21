import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { useApp } from '../../../src/app/store';
import { audioManager } from '../../../src/ui/audio';
import { speak } from '../../../src/ui/speech';
import { HABITATS, HABITAT_ANIMALS } from '../../../src/core/games/habitatRound';
import { EMOTIONS } from '../../../src/core/games/emotionRound';
import { DiChiELOmbra } from '../../../src/features/games/DiChiELOmbra';
import { ChiViveQui } from '../../../src/features/games/ChiViveQui';
import { ComeSiSente } from '../../../src/features/games/ComeSiSente';
import { ScoppiaLeBolle } from '../../../src/features/games/ScoppiaLeBolle';
import { IlTreninoDeiNumeri } from '../../../src/features/games/IlTreninoDeiNumeri';
import { SuonaLArcobaleno } from '../../../src/features/games/SuonaLArcobaleno';
import { optionButtons } from './optionButtons';

// jsdom non implementa canvas né la sintesi vocale.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));
vi.mock('../../../src/ui/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));

function renderGame(Game: ComponentType) {
  return render(
    <MemoryRouter>
      <Game />
    </MemoryRouter>,
  );
}

function nextRound() {
  act(() => {
    vi.advanceTimersByTime(900);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(speak).mockClear();
  useApp.setState((s) => ({ settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: true } } }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Di chi è l\'ombra?', () => {
  test('toccare la figura dell\'ombra fa avanzare il round, una sbagliata no', () => {
    renderGame(DiChiELOmbra);
    const shadow = screen.getByRole('img', { name: 'Ombra misteriosa' }).textContent;
    const options = optionButtons();
    expect(options).toHaveLength(3);

    fireEvent.click(options.find((b) => b.textContent !== shadow)!);
    nextRound();
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();

    fireEvent.click(options.find((b) => b.textContent === shadow)!);
    nextRound();
    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });
});

describe('Chi vive qui?', () => {
  test('la casa giusta dell\'animale fa avanzare il round', () => {
    renderGame(ChiViveQui);
    const animal = HABITAT_ANIMALS.find((a) => screen.queryByRole('img', { name: a.name }))!;
    const home = HABITATS.find((h) => h.id === animal.home)!;

    fireEvent.click(screen.getByRole('button', { name: home.label }));
    nextRound();
    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
    expect(speak).toHaveBeenCalledWith(`Dove vive ${animal.name}?`);
  });
});

describe('Come si sente?', () => {
  test('la faccia chiesta fa avanzare il round', () => {
    const { container } = renderGame(ComeSiSente);
    const prompt = container.querySelector('p')?.textContent ?? '';
    const target = EMOTIONS.find((e) => prompt.endsWith(e.label))!;

    fireEvent.click(screen.getByRole('button', { name: target.label }));
    nextRound();
    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });
});

describe('Scoppia le bolle', () => {
  test('scoppiate tutte le bolle, il round è fatto e la voce ha contato', () => {
    renderGame(ScoppiaLeBolle);
    const bubbles = screen.getAllByRole('button', { name: 'Bolla' });
    expect(bubbles.length).toBeGreaterThanOrEqual(3);

    for (const b of bubbles) fireEvent.pointerDown(b);
    nextRound();

    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
    expect(speak).toHaveBeenCalledWith(String(bubbles.length));
  });
});

describe('Il trenino dei numeri', () => {
  test('in ordine si agganciano i vagoni; un numero fuori ordine non conta', () => {
    renderGame(IlTreninoDeiNumeri);

    fireEvent.click(screen.getByRole('button', { name: 'Numero 2' }));
    expect(screen.getByRole('img', { name: '0 vagoni su 3 agganciati' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Numero 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Numero 2' }));
    expect(screen.getByRole('img', { name: '2 vagoni su 3 agganciati' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Numero 3' }));
    nextRound();
    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });
});

describe('Suona l\'arcobaleno', () => {
  test('ogni barra suona la sua nota, e con i suoni spenti tace e lo dice', () => {
    const tone = vi.spyOn(audioManager, 'tone').mockImplementation(() => {});
    renderGame(SuonaLArcobaleno);

    expect(screen.getAllByRole('button', { name: /^Nota / })).toHaveLength(8);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Nota DO' })[0]);
    expect(tone).toHaveBeenCalledWith(523.25);

    tone.mockClear();
    act(() => {
      useApp.setState((s) => ({ settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: false } } }));
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Nota MI' }));
    expect(tone).not.toHaveBeenCalled();
    expect(screen.getByText(/suoni sono spenti/i)).toBeInTheDocument();
    tone.mockRestore();
  });
});
