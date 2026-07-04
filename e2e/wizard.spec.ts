import { test, expect, type Page } from '@playwright/test';

/**
 * Percorre l'intero wizard con i valori di default (tranne nome/avatar e
 * interessi/spazi, che richiedono una scelta esplicita) e conferma alla
 * fine. Condiviso dai due scenari sotto (Task 9).
 */
async function completeWizardFlow(page: Page) {
  await page.goto('/');

  // Step 1 — Welcome
  await page.getByRole('button', { name: /iniziamo/i }).click();

  // Step 2 — Nome & avatar
  await page.getByLabel(/nome/i).fill('Aurora');
  await page.getByText('🦊').click();
  await page.getByRole('button', { name: /avanti/i }).click();

  // Step 3 — Date (default ok) → avanti
  await page.getByRole('button', { name: /avanti/i }).click();

  // Step 4 — Routine (default ok) → avanti
  await page.getByRole('button', { name: /avanti/i }).click();

  // Step 5 — Interessi & spazi
  await page.getByRole('button', { name: /animali/i }).click();
  await page.getByRole('button', { name: /casa/i }).click();
  await page.getByRole('button', { name: /avanti/i }).click();

  // Step 6 — Riepilogo
  await page.getByRole('button', { name: /crea la nostra estate/i }).click();
}

test('wizard completo porta a Oggi con il profilo creato', async ({ page }) => {
  await completeWizardFlow(page);

  await expect(page).toHaveURL(/oggi/);
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible();
});

test('refresh dopo wizard: profilo persistito', async ({ page }) => {
  await completeWizardFlow(page);
  await expect(page).toHaveURL(/oggi/);
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(/oggi/);
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible();
});
