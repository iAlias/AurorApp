import { test, expect } from '@playwright/test';
import { completeWizardFast } from './helpers';

// Mercoledì (giorno feriale, 5 slot: M1/M2/P1/P2/SERA) — congelare l'orologio
// PRIMA del wizard fa sì che `vacationStart` di default (oggi) e quindi tutta
// la generazione del piano di oggi/domani siano deterministici, invece di
// dipendere dal giorno della settimana in cui gira la CI.
const WEEKDAY = new Date('2026-07-08T08:00:00');

test.describe('Vista Oggi (FR-5)', () => {
  test('mostra 5 SlotCard in un giorno feriale', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    await expect(page.getByTestId('slot-card')).toHaveCount(5);
  });

  test('"Fatta!" segna la card e la spunta persiste dopo reload', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    const cards = page.getByTestId('slot-card');
    await cards.nth(0).getByRole('button', { name: /fatta/i }).click();
    await cards.nth(1).getByRole('button', { name: /fatta/i }).click();

    await expect(page.getByTestId('slot-done')).toHaveCount(2);

    await page.reload();

    await expect(page.getByTestId('slot-done')).toHaveCount(2);
  });

  test('"Cambiala" sostituisce l\'attività della card (titolo diverso)', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    const firstCard = page.getByTestId('slot-card').first();
    const titleBefore = await firstCard.getByTestId('slot-title').innerText();

    await firstCard.getByRole('button', { name: /cambiala/i }).click();

    await expect(page.getByTestId('slot-card').first().getByTestId('slot-title')).not.toHaveText(
      titleBefore,
    );
  });

  test('meteo pioggia: nessuna card mostra il badge "esterno"', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    await page.getByRole('button', { name: /pioggia/i }).click();

    await expect(page.getByTestId('badge-esterno')).toHaveCount(0);
  });

  test('la sezione "Domani" si espande e mostra il piano di domani', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    await page.getByRole('button', { name: /domani/i }).click();

    await expect(page.getByTestId('tomorrow-slot').first()).toBeVisible();
  });

  test('fine periodo: vacationEnd nel passato mostra "Che estate!" invece della timeline', async ({
    page,
  }) => {
    // Store precaricato (E10): un profilo la cui vacanza è finita da tempo,
    // scritto direttamente in localStorage prima che l'app parta, cosi' non
    // serve dipendere dalla data reale del giorno in cui gira il test.
    const envelope = {
      schemaVersion: 1,
      savedAt: '2026-02-01T09:00:00.000Z',
      profile: {
        id: 'child-1',
        name: 'Aurora',
        avatarId: 'volpina',
        birthdate: '2023-05-10',
        interests: ['animali'],
        spaces: ['casa'],
        vacationStart: '2026-01-01',
        vacationEnd: '2026-02-01',
        createdAt: '2026-01-01T09:00:00.000Z',
      },
      settings: {
        routine: {
          wakeTime: '09:00',
          breakfastEnd: '09:45',
          morningSnackStart: '11:00',
          morningSnackEnd: '11:20',
          lunchStart: '13:00',
          napStart: '14:00',
          napMinutes: 120,
          afternoonSnackEnd: '16:30',
          preDinnerMinutes: 30,
          dinnerStart: '19:30',
          bedTime: '21:00',
        },
        meals: { lunchMinutes: 60, dinnerMinutes: 60, soundsOn: true, volume: 0.8 },
        reducedMotion: 'system',
      },
      plans: {},
      progress: {
        streak: 0,
        lastStreakDate: null,
        badges: {},
        doneByCategory: { MOT: 0, CRE: 0, SEN: 0, COG: 0, MUS: 0, SIM: 0, ACQ: 0, NAT: 0, CUC: 0, CAL: 0 },
        mealTimersCompleted: 0,
      },
      timer: null,
    };

    // Stessa chiave di `STORAGE_KEY` in `src/core/storage/envelope.ts` — non
    // importata da `src/` per non dipendere dal bundler dei test e2e (che
    // gira fuori da Vite), duplicata qui deliberatamente.
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key as string, value as string);
      },
      ['aurorapp.state.v1', JSON.stringify(envelope)],
    );

    await page.goto('/oggi');

    await expect(page.getByText(/che estate/i)).toBeVisible();
    await expect(page.getByTestId('slot-card')).toHaveCount(0);
  });
});
