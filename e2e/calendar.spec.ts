import { test, expect } from '@playwright/test';
import { completeWizardFast } from './helpers';

// Mercoledì (giorno feriale): con `vacationStart` di default = oggi, domani
// (giovedì) è anch'esso feriale (5 slot: M1/M2/P1/P2/SERA) — stesso ancoraggio
// di orologio di e2e/today.spec.ts, così il piano di domani è deterministico
// indipendentemente dal giorno in cui gira la CI.
const WEEKDAY = new Date('2026-07-08T08:00:00');
const TOMORROW_ISO = '2026-07-09';

test.describe('Calendario (FR-7)', () => {
  test('griglia visibile e tap su domani apre lo sheet con le 5 attività', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    await page.goto('/calendario');

    await expect(page.getByTestId('month-grid').first()).toBeVisible();

    await page.getByTestId(`calendar-day-${TOMORROW_ISO}`).click();

    await expect(page.getByTestId('day-sheet-slot')).toHaveCount(5);
  });

  test('"Giorno speciale…" marca mare (🏖) e "Torna normale" rigenera gli slot', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);
    await page.goto('/calendario');

    await page.getByTestId(`calendar-day-${TOMORROW_ISO}`).click();
    await page.getByRole('button', { name: /giorno speciale/i }).click();
    await page.getByRole('button', { name: /mare/i }).click();
    await page.getByRole('button', { name: /conferma/i }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId(`calendar-day-${TOMORROW_ISO}`)).toContainText('🏖');

    await page.getByTestId(`calendar-day-${TOMORROW_ISO}`).click();
    await page.getByRole('button', { name: /torna normale/i }).click();

    await expect(page.getByTestId('day-sheet-slot')).toHaveCount(5);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId(`calendar-day-${TOMORROW_ISO}`)).not.toContainText('🏖');
  });

  test('giorni fuori dal periodo vacanza sono disabilitati con tooltip (E11)', async ({ page }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);
    await page.goto('/calendario');

    // Il mese corrente inizia il 1° luglio: con vacationStart=8 luglio, i
    // giorni 1-7 sono fuori periodo e devono essere disabilitati.
    const outsideCell = page.getByTestId('calendar-day-2026-07-01');
    await expect(outsideCell).toBeDisabled();
    await expect(outsideCell).toHaveAttribute('title', /fuori dalle vacanze/i);
  });
});
