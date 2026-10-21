import { test, expect } from '@playwright/test';
import { completeWizardFast } from './helpers';

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
  // Scoped al titolo (non a `page` intero): il nome compare anche altrove.
  await expect(page.getByRole('heading', { name: /bravissima/i })).toBeVisible(); // celebrazione col nome
  await expect(page.getByRole('heading', { name: /bravissima/i })).toContainText('Sofia');
});

test('/timer mostra la navigazione principale (tab bar/sidebar di Layout)', async ({ page }) => {
  await completeWizardFast(page);

  await page.goto('/timer?pasto=pranzo');
  await expect(page.getByRole('navigation', { name: /navigazione principale/i })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: /navigazione principale/i })
      .getByRole('link', { name: /timer/i }),
  ).toBeVisible();
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

// Da quando /timer e' dentro `Layout` (commit f6a4079), la tab bar fissa in
// basso (z-40, `fixed inset-x-0 bottom-0`) e' visibile anche sopra le
// schermate del timer: verifica geometrica (bounding box reale, non solo
// "e' nel DOM") che il controllo interattivo piu' in basso di ciascuna
// schermata resti sopra il bordo superiore della tab bar su viewport
// mobile — altrimenti risulterebbe presente ma non cliccabile perche'
// coperto (regressione trovata in review: min-h-screen ridondante annidato
// dentro il pb-20 di Layout spingeva il contenuto oltre il bordo reale).
async function expectAboveTabBar(page: import('@playwright/test').Page, control: ReturnType<typeof page.getByRole>) {
  const nav = page.getByRole('navigation', { name: /navigazione principale/i });
  const navBox = await nav.boundingBox();
  const controlBox = await control.boundingBox();
  expect(navBox).not.toBeNull();
  expect(controlBox).not.toBeNull();
  expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(navBox!.y);
}

test('TimerStart: il bottone "Si mangia!" non e\' coperto dalla tab bar (mobile)', async ({ page }) => {
  await completeWizardFast(page);
  await page.goto('/timer?pasto=pranzo');

  await expectAboveTabBar(page, page.getByRole('button', { name: /si mangia/i }));
});

test('TimerRun: il bottone child-lock "abbiamo già finito" non e\' coperto dalla tab bar (mobile)', async ({
  page,
}) => {
  await page.clock.install();
  await completeWizardFast(page);

  await page.goto('/timer?pasto=pranzo');
  await page.getByRole('button', { name: /si mangia/i }).click();
  await page.clock.fastForward('00:05'); // solo il countdown 3-2-1
  await expect(page.getByText(/termina alle/i)).toBeVisible();

  await expectAboveTabBar(page, page.getByRole('button', { name: /abbiamo già finito/i }));
});

test('TimerStart: inserimento manuale della durata da tastiera (icona matita)', async ({ page }) => {
  await completeWizardFast(page);
  await page.goto('/timer?pasto=pranzo');

  await expect(page.getByText('60 min')).toBeVisible();

  await page.getByRole('button', { name: /modifica durata da tastiera/i }).click();
  const input = page.getByRole('spinbutton', { name: /durata in minuti/i });
  await expect(input).toHaveValue('60');
  await input.fill('1');
  await input.press('Enter');

  await expect(page.getByText(/^1 min$/)).toBeVisible();

  // Lo stepper "Riduci" da 1 min non deve andare sotto 1 (nuovo minimo,
  // prima era 15): resta clampato a 1.
  await page.getByRole('button', { name: /riduci durata/i }).click();
  await expect(page.getByText(/^1 min$/)).toBeVisible();
});

test('Celebration: il bottone "Abbiamo finito!" non e\' coperto dalla tab bar (mobile)', async ({ page }) => {
  await page.clock.install();
  await completeWizardFast(page);

  await page.goto('/timer?pasto=pranzo');
  await page.getByRole('button', { name: /si mangia/i }).click();
  await page.clock.fastForward('03:00');
  await expect(page.getByText(/termina alle/i)).toBeVisible();
  await page.clock.fastForward('01:05:00');
  await expect(page.getByRole('heading', { name: /bravissima/i })).toBeVisible();

  await expectAboveTabBar(page, page.getByRole('button', { name: /abbiamo finito/i }));
});
