import { test, expect } from '@playwright/test';
import { completeWizardFast } from './helpers';

// Mercoledì (giorno feriale): con `vacationStart` di default = oggi, domani
// (giovedì) è anch'esso feriale (5 slot: M1/M2/P1/P2/SERA) — stesso ancoraggio
// di orologio di e2e/today.spec.ts, così il piano di domani è deterministico
// indipendentemente dal giorno in cui gira la CI.
const WEEKDAY = new Date('2026-07-08T08:00:00');
const TODAY_ISO = '2026-07-08';
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

  test('"Giorno speciale…" su un giorno con attività fatte chiede conferma prima di perderle', async ({
    page,
  }) => {
    await page.clock.install({ time: WEEKDAY });
    await completeWizardFast(page);

    // Segna una attività di oggi come "Fatta!" nella vista Oggi, cosi' il
    // piano di oggi ha uno slot `done` prima di aprirlo dal Calendario.
    await page.getByTestId('slot-card').first().getByRole('button', { name: /fatta/i }).click();
    await expect(page.getByTestId('slot-done')).toHaveCount(1);

    await page.goto('/calendario');
    await page.getByTestId(`calendar-day-${TODAY_ISO}`).click();
    await expect(page.getByTestId('day-sheet-slot')).toHaveCount(5);

    // Annulla: il dialogo di avviso appare, ma alla cancellazione il piano
    // resta invariato (nessuna attività persa, giorno non diventa speciale).
    // I bottoni sono cercati dentro il `dialog` giusto (per nome accessibile,
    // dal `title` della Modal): durante l'animazione di uscita la modale
    // "Giorno speciale" precedente può restare montata un istante insieme a
    // quella di avviso, ed entrambe hanno un bottone "Annulla".
    const lossDialog = page.getByRole('dialog', { name: /diventare un giorno speciale/i });

    await page.getByRole('button', { name: /giorno speciale/i }).click();
    await page.getByRole('button', { name: /mare/i }).click();
    await page.getByRole('button', { name: /^conferma$/i }).click();

    await expect(lossDialog).toBeVisible();
    await expect(page.getByTestId('day-sheet-slot')).toHaveCount(5); // ancora non applicato

    await lossDialog.getByRole('button', { name: /^annulla$/i }).click();
    await expect(lossDialog).toBeHidden();
    await expect(page.getByTestId('day-sheet-slot')).toHaveCount(5); // invariato dopo l'annullamento

    // Conferma: solo ora il giorno diventa speciale (e le attività fatte
    // spariscono dal piano, come avvisato dal dialogo).
    await page.getByRole('button', { name: /giorno speciale/i }).click();
    await page.getByRole('button', { name: /mare/i }).click();
    await page.getByRole('button', { name: /^conferma$/i }).click();
    await expect(lossDialog).toBeVisible();
    await lossDialog.getByRole('button', { name: /rendi speciale/i }).click();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId(`calendar-day-${TODAY_ISO}`)).toContainText('🏖');
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
