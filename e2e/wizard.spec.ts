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

test('Indietro dal riepilogo (step 6) torna allo step 5', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /iniziamo/i }).click();
  await page.getByLabel(/nome/i).fill('Aurora');
  await page.getByText('🦊').click();
  await page.getByRole('button', { name: /avanti/i }).click();
  await page.getByRole('button', { name: /avanti/i }).click();
  await page.getByRole('button', { name: /avanti/i }).click();
  await page.getByRole('button', { name: /animali/i }).click();
  await page.getByRole('button', { name: /casa/i }).click();
  await page.getByRole('button', { name: /avanti/i }).click();

  // Ora siamo sul riepilogo (step 6): il CTA finale e' visibile.
  await expect(page.getByRole('button', { name: /crea la nostra estate/i })).toBeVisible();

  await page.getByRole('button', { name: /indietro/i }).click();

  // Torniamo allo step 5 (interessi/spazi): la sua intestazione riappare e
  // il CTA del riepilogo scompare.
  await expect(page.getByRole('heading', { name: /cosa le piace fare/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /crea la nostra estate/i })).toHaveCount(0);
});

test('rilancio parziale ?step=profilo apre sullo step Nome precompilato e conferma porta a Impostazioni (FR-8)', async ({
  page,
}) => {
  // Prima un giro completo del wizard per avere un profilo gia' persistito
  // (stesso stato di chi rilancia il wizard da Impostazioni).
  await completeWizardFlow(page);
  await expect(page).toHaveURL(/oggi/);

  // Rilancio parziale: naviga direttamente con ?step=profilo, come farebbe
  // il link "Modifica nome/avatar" da Impostazioni.
  await page.goto('/wizard?step=profilo');

  // Si apre direttamente sullo step Nome/avatar (niente Welcome), gia'
  // precompilato con i dati del profilo esistente.
  await expect(page.getByRole('heading', { name: /come si chiama/i })).toBeVisible();
  await expect(page.getByLabel(/nome/i)).toHaveValue('Aurora');

  // Non essendoci step precedenti raggiungibili (entryStep = 1), "Indietro"
  // non e' mostrato su questo step.
  await expect(page.getByRole('button', { name: /indietro/i })).toHaveCount(0);

  // Il resto del percorso e' precompilato e valido: si prosegue fino al
  // riepilogo e si conferma.
  await page.getByRole('button', { name: /avanti/i }).click(); // → Date
  await page.getByRole('button', { name: /avanti/i }).click(); // → Routine
  await page.getByRole('button', { name: /avanti/i }).click(); // → Interessi/spazi
  await page.getByRole('button', { name: /avanti/i }).click(); // → Riepilogo
  await page.getByRole('button', { name: /crea la nostra estate/i }).click();

  // Rilancio parziale: la conferma riporta a Impostazioni, non a Oggi.
  await expect(page).toHaveURL(/impostazioni/);
});

test('rilancio parziale ?step=interessi apre sullo step Interessi/spazi e conferma porta a Impostazioni (FR-8)', async ({
  page,
}) => {
  await completeWizardFlow(page);
  await expect(page).toHaveURL(/oggi/);

  await page.goto('/wizard?step=interessi');

  // Si apre direttamente sullo step Interessi/spazi (niente step precedenti).
  await expect(page.getByRole('heading', { name: /cosa le piace fare/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /indietro/i })).toHaveCount(0);

  await page.getByRole('button', { name: /avanti/i }).click(); // → Riepilogo
  await page.getByRole('button', { name: /crea la nostra estate/i }).click();

  await expect(page).toHaveURL(/impostazioni/);
});

test('step-gating: "Avanti" e\' disabilitato finche\' nome/avatar non sono validi', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /iniziamo/i }).click();

  // Step Nome/avatar appena entrato: nessun nome, nessun avatar → disabilitato.
  await expect(page.getByRole('button', { name: /avanti/i })).toBeDisabled();

  // Nome valido ma nessun avatar scelto: ancora disabilitato.
  await page.getByLabel(/nome/i).fill('Aurora');
  await expect(page.getByRole('button', { name: /avanti/i })).toBeDisabled();

  // Avatar scelto: ora entrambe le condizioni sono soddisfatte → abilitato.
  await page.getByText('🦊').click();
  await expect(page.getByRole('button', { name: /avanti/i })).toBeEnabled();
});
