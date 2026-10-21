import { test, expect } from '@playwright/test';
import { completeWizardFast } from './helpers';

const LABELS = ['ROSSO', 'BLU', 'GIALLO', 'VERDE', 'ARANCIONE', 'VIOLA', 'ROSA', 'MARRONE'];

test.describe('Sezione Giochi', () => {
  test('la tab "Giochi" porta alla griglia con 16 card', async ({ page }) => {
    await completeWizardFast(page);

    await page
      .getByRole('navigation', { name: /navigazione principale/i })
      .getByRole('link', { name: /giochi/i })
      .click();

    await expect(page).toHaveURL(/\/giochi$/);
    await expect(page.getByTestId('game-item')).toHaveCount(16);
  });

  test('"Tocca il colore": rispondere giusto porta a "1 round su 5 completati", poi si torna alla griglia', async ({
    page,
  }) => {
    await completeWizardFast(page);

    // Si va diretti all'URL del gioco (caricamento pieno) invece di cliccare la
    // card dalla griglia: la navigazione SPA innescherebbe la transizione di
    // route PageFlip3D e lascerebbe i `motion.button` non ancora "stable" al
    // momento del click. Che la card porti al gioco è già coperto altrove.
    await page.goto('/giochi/tocca-il-colore');

    // Scoped al <p> del prompt (non all'`<h1>Tocca il colore</h1>` del titolo,
    // che matcherebbe la stessa regex in strict mode).
    const prompt = await page.locator('p', { hasText: /tocca (il|l')/i }).innerText();
    const match = prompt.match(/[Tt]occa (?:il |l')\s*(\w+)/);
    expect(match).not.toBeNull();
    const label = LABELS.find((l) => l.toLowerCase() === match![1].toLowerCase());
    expect(label).toBeDefined();

    await page.getByRole('button', { name: label!, exact: true }).click();

    await expect(page.getByRole('img', { name: '1 round su 5 completati' })).toBeVisible();

    await page.getByRole('link', { name: /← giochi/i }).click();
    await expect(page).toHaveURL(/\/giochi$/);
    await expect(page.getByTestId('game-item')).toHaveCount(16);
  });

  test('un gameId inesistente reindirizza alla griglia', async ({ page }) => {
    await completeWizardFast(page);

    await page.goto('/giochi/gioco-inesistente');

    await expect(page).toHaveURL(/\/giochi$/);
    await expect(page.getByTestId('game-item')).toHaveCount(16);
  });
});
