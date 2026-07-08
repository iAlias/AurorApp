import { expect, type Page } from '@playwright/test';

/**
 * Percorre il wizard con i valori di default (stesso schema di
 * `completeWizardFlow` in `e2e/wizard.spec.ts`), cosi' da avere un profilo
 * e le impostazioni pasto di default (`lunchMinutes`/`dinnerMinutes` = 60)
 * pronte in fretta per gli scenari che partono da "wizard già fatto".
 * Estratta da `e2e/timer.spec.ts` (Task 14) per essere condivisa anche da
 * `e2e/today.spec.ts`.
 */
export async function completeWizardFast(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /iniziamo/i }).click();

  await page.getByLabel(/nome/i).fill('Aurora');
  await page.getByText('🦊').click();
  await page.getByRole('button', { name: /avanti/i }).click();

  await page.getByRole('button', { name: /avanti/i }).click(); // Date (default)
  await page.getByRole('button', { name: /avanti/i }).click(); // Routine (default)

  await page.getByRole('button', { name: /animali/i }).click();
  await page.getByRole('button', { name: /casa/i }).click();
  await page.getByRole('button', { name: /avanti/i }).click();

  await page.getByRole('button', { name: /crea la nostra estate/i }).click();
  await expect(page).toHaveURL(/oggi/);
}
