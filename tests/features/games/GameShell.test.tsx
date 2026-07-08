import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GameShell } from '../../../src/features/games/GameShell';
import { useApp } from '../../../src/app/store';
import { audioManager } from '../../../src/ui/audio';

// jsdom non implementa canvas, quindi canvas-confetti (import dinamico
// dentro burst()) fallirebbe in modo asincrono e non catturabile — non è
// il comportamento sotto test, si mocka come in celebrationSoundToggle.test.tsx.
vi.mock('../../../src/ui/confetti', () => ({ burst: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

function renderShell(props: Partial<React.ComponentProps<typeof GameShell>> = {}) {
  const onRestart = vi.fn();
  render(
    <MemoryRouter>
      <GameShell
        title="Gioco di prova"
        emoji="🐸"
        totalRounds={5}
        completedRounds={2}
        finished={false}
        onRestart={onRestart}
        {...props}
      >
        <p>Contenuto del round</p>
      </GameShell>
    </MemoryRouter>,
  );
  return { onRestart };
}

describe('GameShell — stelle di avanzamento', () => {
  test('mostra il numero corretto di round completati su totali', () => {
    renderShell({ totalRounds: 5, completedRounds: 2 });
    expect(screen.getByLabelText('2 round su 5 completati')).toBeInTheDocument();
  });

  test('totalRounds a 0 non mostra nessuna riga di stelle', () => {
    renderShell({ totalRounds: 0, completedRounds: 0 });
    expect(screen.queryByRole('img', { name: /round su/i })).not.toBeInTheDocument();
  });

  test('mostra i children quando il gioco non è finito', () => {
    renderShell({ finished: false });
    expect(screen.getByText('Contenuto del round')).toBeInTheDocument();
  });
});

describe('GameShell — schermata finale', () => {
  test('finished: true mostra "Bravissima!", tutte le stelle piene e nasconde i children', () => {
    renderShell({ finished: true, totalRounds: 4, completedRounds: 3 });

    expect(screen.getByText('Bravissima! 🎉')).toBeInTheDocument();
    expect(screen.getByLabelText('4 round su 4 completati')).toBeInTheDocument();
    expect(screen.queryByText('Contenuto del round')).not.toBeInTheDocument();
  });

  test('"Gioca ancora" chiama onRestart', async () => {
    const user = userEvent.setup();
    const { onRestart } = renderShell({ finished: true });

    await user.click(screen.getByRole('button', { name: /gioca ancora/i }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  test('"Altri giochi" è un link verso /giochi', () => {
    renderShell({ finished: true });
    expect(screen.getByRole('link', { name: /altri giochi/i })).toHaveAttribute('href', '/giochi');
  });

  test('celebrateGameEnd (burst+suono) scatta una sola volta all\'ingresso in finished', () => {
    useApp.setState((s) => ({
      settings: { ...s.settings, meals: { ...s.settings.meals, soundsOn: true } },
    }));
    const playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});

    const { rerender } = render(
      <MemoryRouter>
        <GameShell
          title="Gioco di prova"
          emoji="🐸"
          totalRounds={3}
          completedRounds={2}
          finished={false}
          onRestart={() => {}}
        >
          <p>Round</p>
        </GameShell>
      </MemoryRouter>,
    );
    expect(playSpy).not.toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <GameShell
          title="Gioco di prova"
          emoji="🐸"
          totalRounds={3}
          completedRounds={3}
          finished
          onRestart={() => {}}
        >
          <p>Round</p>
        </GameShell>
      </MemoryRouter>,
    );

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(playSpy).toHaveBeenCalledWith('party');
  });
});
