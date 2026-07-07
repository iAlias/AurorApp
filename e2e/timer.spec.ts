import { test, expect, type Page } from '@playwright/test';

/**
 * Percorre il wizard con i valori di default (stesso schema di
 * `completeWizardFlow` in `e2e/wizard.spec.ts`), cosi' da avere un profilo
 * e le impostazioni pasto di default (`lunchMinutes`/`dinnerMinutes` = 60)
 * pronte prima di aprire il timer.
 */
async function completeWizardFast(page: Page) {
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

test('timer 60min: avvio, blocco "telefono", ripresa, celebrazione', async ({ page }) => {
  await page.clock.install();
  await completeWizardFast(page);

  await page.goto('/timer?pasto=pranzo');
  await page.getByRole('button', { name: /si mangia/i }).click();

  // `fastForward` (a differenza di `runFor`) fa scattare al più una volta i
  // timer già in coda al momento della chiamata: il countdown 3-2-1 (un
  // hook che si ri-programma da solo via rAF) consuma di fatto l'intero
  // salto per completarsi e dispacciare START — la sessione parte quindi
  // in pratica alla FINE di questo salto, non a meta'. Verificato empiricamente.
  await page.clock.fastForward('03:00');
  await expect(page.getByText(/termina alle/i)).toBeVisible();

  await page.reload(); // simula "telefono bloccato e riaperto"
  await expect(page.getByText(/termina alle/i)).toBeVisible(); // recovery E1: si riprende da dove si era

  // Salto abbondantemente oltre i 60 minuti di durata (con margine sul fatto
  // che il primo salto sopra non ha lasciato "avanzo" di sessione corsa):
  // deve bastare a far scattare `TICK` → celebrating.
  await page.clock.fastForward('01:05:00');
  await expect(page.getByText(/bravissima/i)).toBeVisible(); // celebrazione col nome
  await expect(page.getByText('Aurora', { exact: false })).toBeVisible();
});

test('child-lock: tap semplice non mette in pausa', async ({ page }) => {
  await page.clock.install();
  await completeWizardFast(page);

  await page.goto('/timer?pasto=pranzo');
  await page.getByRole('button', { name: /si mangia/i }).click();
  await page.clock.fastForward('00:05'); // solo il countdown 3-2-1

  await expect(page.getByText(/termina alle/i)).toBeVisible();

  // Un tap semplice (non un long-press di 3s) sul bottone Pausa non deve
  // metterlo in pausa: child-lock (§8.3) — Pausa/Esci si attivano SOLO con
  // pressione lunga di 3s (`useLongPress`), un tap veloce e' un no-op.
  await page.getByRole('button', { name: /^pausa$/i }).click();

  await expect(page.getByText(/in pausa/i)).toHaveCount(0);
  await expect(page.getByText(/termina alle/i)).toBeVisible();
});
