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
  // Scoped al titolo (non a `page` intero): da quando /timer e' dentro
  // `Layout` la sidebar desktop contiene il testo "AurorApp", che altrimenti
  // farebbe fallire in strict mode un `getByText('Aurora')` non ancorato
  // (substring-match case-insensitive: "AurorApp" contiene "Aurora").
  await expect(page.getByRole('heading', { name: /bravissima/i })).toBeVisible(); // celebrazione col nome
  await expect(page.getByRole('heading', { name: /bravissima/i })).toContainText('Aurora');
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
