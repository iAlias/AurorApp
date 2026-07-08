import { test, expect } from '@playwright/test';
import { completeWizardFast } from './helpers';

// Solo la sidebar desktop (`lg:flex`, viewport di default 390x844 e' mobile
// e la nasconde del tutto) e' interessata da questa regressione: il chrome
// persistente dell'app deve restare visibile mentre si scrolla il contenuto
// di una pagina lunga come Impostazioni (profilo + pasti + suoni + reduced
// motion + backup + I tuoi progressi con griglia badge).
//
// Le misure usano `page.evaluate(getBoundingClientRect)` invece di
// `locator.boundingBox()`: quest'ultimo esegue un suo scroll-into-view
// automatico prima di misurare, che puo' urtare contro l'overflow interno
// dell'aside (`lg:overflow-y-auto`) e introdurre un offset spurio, non
// legato allo sticky reale (verificato: con misura diretta via JS il valore
// resta identico bit-per-bit prima/dopo lo scroll).
test.describe('Layout — sidebar fissa su desktop', () => {
  test.use({ viewport: { width: 1280, height: 700 } });

  test('la sidebar resta in vista (stessa posizione) durante lo scroll di /impostazioni', async ({ page }) => {
    await completeWizardFast(page);
    await page.goto('/impostazioni');

    await expect(page.locator('aside').getByText('AurorApp', { exact: false })).toBeVisible();
    // Aspetta che l'ultima sezione della pagina (dentro `ProgressCard`, in
    // fondo a Impostazioni) sia montata: senza questo, `document.body.
    // scrollHeight` letto troppo presto potrebbe catturare un'altezza
    // ancora parziale (prima che React finisca di renderizzare badge/recap),
    // dando uno scroll incompleto e un falso "si e' mosso" non legato allo
    // sticky reale.
    await expect(page.getByTestId('weekly-recap')).toBeVisible();

    function measureBrandTop() {
      return page.evaluate(() => {
        const aside = document.querySelector('aside');
        const brand = aside
          ? Array.from(aside.querySelectorAll('span')).find((s) => s.textContent?.includes('AurorApp'))
          : null;
        return brand ? brand.getBoundingClientRect().top : null;
      });
    }

    const before = await measureBrandTop();
    expect(before).not.toBeNull();

    // Scrolla quasi fino in fondo (bodyScrollHeight - viewport, con un
    // margine di sicurezza di 100px): la pagina e' abbondantemente piu' alta
    // della viewport di test (700px). Se l'aside non fosse sticky,
    // scorrerebbe via insieme al resto e il brand uscirebbe dal viewport.
    // NB: si evita deliberatamente `scrollTo(0, bodyScrollHeight)` letterale
    // — `document.body.scrollHeight` include qualche px extra rispetto al
    // box che contiene davvero l'aside (margine di default del browser fuori
    // da `<div class="lg:flex">`), e scrollare fin li' fa uscire l'aside dal
    // SUO contenitore di sticky per un attimo: comportamento CSS corretto e
    // atteso (l'elemento sticky non puo' mai sporgere oltre il proprio
    // contenitore), non una regressione — irrilevante in pratica perche' un
    // utente reale non nota ne' insegue quegli ultimi ~8px di scroll.
    await page.evaluate(() => {
      const target = Math.max(0, document.body.scrollHeight - window.innerHeight - 100);
      window.scrollTo(0, target);
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

    const after = await measureBrandTop();
    expect(after).toBe(before);

    // Anche una voce di navigazione della sidebar resta cliccabile/in vista.
    await expect(page.locator('aside').getByRole('link', { name: /timer/i })).toBeInViewport();
  });
});
