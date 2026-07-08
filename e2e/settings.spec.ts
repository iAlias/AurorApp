import { test, expect } from '@playwright/test';
import { completeWizardFast } from './helpers';

test.describe('Impostazioni (FR-8) + progressi (FR-9)', () => {
  test('cambia durata pranzo a 45 → riflesso in TimerStart', async ({ page }) => {
    await completeWizardFast(page);
    await page.goto('/impostazioni');

    // Default 60 min, step 5: 3 tap su "Riduci" → 45.
    const decrease = page.getByRole('button', { name: /riduci durata pranzo/i });
    await decrease.click();
    await decrease.click();
    await decrease.click();
    await expect(page.getByTestId('pasti-pranzo-durata')).toHaveText('45 min');

    // Navigazione client-side (non `page.goto`, che ricaricherebbe la pagina
    // e dipenderebbe dal debounce di persistenza da 300ms): lo store in
    // memoria ha già il nuovo valore, il tab "Timer" lo riflette subito.
    await page.getByRole('link', { name: /timer/i }).first().click();
    await page.getByRole('button', { name: /pranzo/i }).click();
    await expect(page.getByText('45 min')).toBeVisible();
  });

  test('esporta backup: scarica un file aurorapp-backup-*.json', async ({ page }) => {
    await completeWizardFast(page);
    await page.goto('/impostazioni');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /esporta backup/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^aurorapp-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test('azzera tutto: la doppia conferma richiede il nome esatto, poi torna al wizard', async ({ page }) => {
    await completeWizardFast(page);
    await page.goto('/impostazioni');

    await page.getByRole('button', { name: /^azzera tutto$/i }).click();
    const confirmButton = page.getByRole('button', { name: /conferma azzeramento/i });
    await expect(confirmButton).toBeDisabled();

    await page.getByLabel(/scrivi il nome/i).fill('Nomesbagliato');
    await expect(confirmButton).toBeDisabled();

    // Case-insensitive/trim: "aurora " con spazio e minuscolo deve comunque abilitare.
    await page.getByLabel(/scrivi il nome/i).fill('aurora ');
    await expect(confirmButton).toBeEnabled();

    await confirmButton.click();
    await expect(page.getByRole('button', { name: /iniziamo/i })).toBeVisible();
  });

  test('esporta poi importa: lo stato torna con profilo e piani (AC-9 §14)', async ({ page }) => {
    await completeWizardFast(page);
    await page.goto('/impostazioni');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /esporta backup/i }).click(),
    ]);
    const savedPath = `${test.info().outputDir}/aurorapp-backup.json`;
    await download.saveAs(savedPath);

    // Azzera tutto (stessa doppia conferma della prova precedente).
    await page.getByRole('button', { name: /^azzera tutto$/i }).click();
    await page.getByLabel(/scrivi il nome/i).fill('Aurora');
    await page.getByRole('button', { name: /conferma azzeramento/i }).click();
    await expect(page.getByRole('button', { name: /iniziamo/i })).toBeVisible();

    // Importa il backup appena esportato.
    await page.goto('/impostazioni');
    await page.getByLabel(/importa backup/i).setInputFiles(savedPath);

    const preview = page.getByText(/backup del/i);
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Aurora');
    await page.getByRole('button', { name: /^conferma$/i }).click();

    // Stato ripristinato: profilo di nuovo presente, si atterra su Oggi.
    await expect(page).toHaveURL(/oggi/);
    await expect(page.getByTestId('profile-name')).toHaveText('Aurora');
  });
});
