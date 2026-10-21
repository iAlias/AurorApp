import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrovaLaLettera } from '../../../src/features/games/TrovaLaLettera';
import { useApp } from '../../../src/app/store';
import { optionButtons } from './optionButtons';

// jsdom non implementa canvas (v. GameShell.test.tsx): si mocka burst() cosi'
// celebrateRound non fallisce in modo asincrono e non catturabile.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Smoke test: il generatore `makeLetterRound` è già coperto a fondo in
 * `tests/core/games/letterRound.test.ts` e il pattern round è identico a
 * `ToccaIlColore` — qui si verifica solo che il componente monti col pool
 * atteso (vocali + nome del profilo) e che una risposta giusta avanzi.
 */
describe('TrovaLaLettera (smoke)', () => {
  test('mostra il prompt "Trova la ..." e 3 opzioni-lettera', () => {
    const { container } = render(
      <MemoryRouter>
        <TrovaLaLettera />
      </MemoryRouter>,
    );

    expect(container.querySelector('p')?.textContent ?? '').toMatch(/^Trova la /);
    expect(optionButtons()).toHaveLength(3);
    expect(screen.getByLabelText('0 round su 5 completati')).toBeInTheDocument();
  });

  test('risposta giusta fa avanzare di una stella', () => {
    vi.useFakeTimers();
    const { container } = render(
      <MemoryRouter>
        <TrovaLaLettera />
      </MemoryRouter>,
    );

    const target = container.querySelector('p > span')?.textContent ?? '';
    fireEvent.click(screen.getByRole('button', { name: `Lettera ${target}` }));

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByLabelText('1 round su 5 completati')).toBeInTheDocument();
  });

  test('usa le lettere del nome del profilo oltre alle vocali', () => {
    useApp.setState({
      profile: {
        id: 'p1',
        name: 'Zoe',
        avatarId: 'avatar-1', gender: 'f',
        birthdate: '2023-01-01',
        interests: ['movimento'],
        spaces: ['casa'],
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <TrovaLaLettera />
      </MemoryRouter>,
    );

    expect(optionButtons()).toHaveLength(3);
  });
});
