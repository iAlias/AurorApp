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

  test('"Scelgo io" permette di scegliere manualmente un\'attività per categoria', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    const firstCard = page.getByTestId('slot-card').first();
    const titleBefore = await firstCard.getByTestId('slot-title').innerText();

    await firstCard.getByRole('button', { name: /scelgo io/i }).click();

    // Cambia categoria (tab "Calma e libri" 🌙, quasi certamente diversa da
    // quella dello slot attuale) e sceglie una delle attività elencate lì.
    await page.getByRole('tab', { name: /calma e libri/i }).click();
    const items = page.getByTestId('activity-picker-item');
    await expect(items.first()).toBeVisible();
    // Esclude eventuali item con lo stesso titolo di prima, così l'attività
    // scelta è garantita diversa (evita un falso negativo se lo slot attuale
    // fosse già di categoria CAL).
    await items.filter({ hasNotText: titleBefore }).first().click();

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

  test('un salvataggio della vecchia versione "AurorApp" (vacanze) si apre sulla giornata di oggi', async ({
    page,
  }) => {
    // Store precaricato con la chiave e la forma della versione precedente:
    // date di vacanza ormai passate, niente genere né opzione nido/asilo.
    const envelope = {
      schemaVersion: 1,
      savedAt: '2026-02-01T09:00:00.000Z',
      profile: {
        id: 'child-1',
        name: 'Sofia',
        avatarId: 'volpina',
        birthdate: '2023-05-10',
        interests: ['animali'],
        spaces: ['casa'],
        vacationStart: '2026-06-15',
        vacationEnd: '2026-09-15',
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

    // Stessa chiave di `LEGACY_STORAGE_KEY` in `src/core/storage/envelope.ts` —
    // non importata da `src/` per non dipendere dal bundler dei test e2e (che
    // gira fuori da Vite), duplicata qui deliberatamente.
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key as string, value as string);
      },
      ['aurorapp.state.v1', JSON.stringify(envelope)],
    );

    await page.goto('/oggi');

    await expect(page.getByTestId('profile-name')).toHaveText('Sofia');
    await expect(page.getByTestId('slot-card').first()).toBeVisible();
  });
});
