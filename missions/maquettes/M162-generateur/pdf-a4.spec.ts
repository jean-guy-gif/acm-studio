import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { demoCredentials, login, resetDemoByScreen } from '../../../tests/e2e/support';

// Mission 162 — les vrais PDF A4 de l'Étude de marché et de la synthèse au vendeur, pour le dossier
// de démo de Mme Garcia avec tous les blocs du quartier cochés et les 37 ventes du dossier de
// démonstration d'Academia, Live mené jusqu'au bout. Démo remise à zéro avant et après, par l'écran.
// Sortie : `M162_OUT` (par défaut missions/maquettes/M162-avant). Pages en images :
// `node missions/maquettes/M162-generateur/rendre-pages.mjs <dossier>`.
const OUT = process.env.M162_OUT ?? path.resolve('missions/maquettes/M162-avant');
// `M162_ID` : un dossier déjà mené, seulement imprimé (pour rendre l'avant et l'après sur les mêmes
// données) ; `M162_KEEP=1` : garder le dossier mené (son identifiant dans `dossier.txt`).
const ONLY_ID = process.env.M162_ID;
const KEEP = process.env.M162_KEEP === '1';

async function waitAcademia(page: Page, done: () => Promise<boolean>, failed: string) {
  await expect
    .poll(
      async () =>
        (await done()) ? 'ok' : (await page.getByTestId(failed).count()) > 0 ? 'ko' : '',
      { timeout: 150_000, intervals: [1_000, 2_000, 5_000] },
    )
    .toBe('ok');
}

async function printPdf(page: Page, url: string, testId: string, file: string) {
  await page.goto(url);
  await expect(page.getByTestId(testId)).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_000);
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = 'eager';
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
      ),
    );
    await document.fonts.ready;
  });
  await page.pdf({ path: file, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
}

test('les PDF A4 de l’Étude de marché et de la synthèse', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  page.on('dialog', (dialog) => void dialog.accept());
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  if (ONLY_ID) {
    await printPdf(page, `/builder/${ONLY_ID}/etude-de-marche`, 'market-study', path.join(OUT, 'etude.pdf'));
    await printPdf(page, `/builder/${ONLY_ID}/synthese`, 'seller-synthesis', path.join(OUT, 'synthese.pdf'));
    return;
  }
  await resetDemoByScreen(page);
  const href = await page
    .locator('[data-testid="demo-dossier"][data-stage="ready"] a')
    .first()
    .getAttribute('href');
  const id = /\/builder\/([^/]+)\//.exec(href ?? '')![1];
  try {
    await page.goto(`/builder/${id}/property`);
    await page.getByTestId('living-here-create').click();
    await waitAcademia(
      page,
      async () => (await page.getByTestId('living-here-create').count()) === 0,
      'living-here-failed',
    );

    await page.goto(`/builder/${id}/avant-rendez-vous`);
    const panel = page.getByTestId('neighbourhood-choice');
    await waitAcademia(page, async () => (await panel.count()) > 0, 'neighbourhood-choice-failed');
    const boxes = panel.locator('input[type="checkbox"]');
    const count = await boxes.count();
    for (let i = 0; i < count; i += 1) await boxes.nth(i).check();
    await panel.getByRole('button', { name: 'Enregistrer le choix' }).click();
    await expect(panel.getByRole('status')).toContainText('Choix enregistré', { timeout: 60_000 });

    // Le Live, mené jusqu'à « Terminer le rendez-vous ».
    await page.setViewportSize({ width: 1024, height: 700 });
    await page.goto(`/live/${id}`);
    await page.getByTestId('launch-for-real').click();
    const start = page.locator('main button.btn-filled').first();
    await expect(start).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('[data-photos-preloaded="true"]')).toHaveCount(1, {
      timeout: 120_000,
    });
    await start.click();
    const main = page.locator('main');
    await expect(main).not.toHaveAttribute('data-live-page', 'intro', { timeout: 30_000 });
    const radio = async (field: string, value?: string) => {
      const input = main.locator(`input[name="${field}"]${value ? `[value="${value}"]` : ''}`);
      if ((await input.count()) === 0 || (await input.first().isChecked())) return;
      await input.first().locator('xpath=ancestor::label[1]').click();
    };
    const scale = page.getByRole('group', { name: 'Votre note, de 1 à 10' });
    for (let step = 0; step < 80; step += 1) {
      if ((await scale.count()) > 0) break;
      const type = (await main.getAttribute('data-live-page')) ?? '';
      await radio('seller_property_confirmed', 'yes');
      await radio('seller_serious_competitor', 'yes');
      await radio('seller_most_dangerous_comparable_id');
      for (const price of await main.locator('input[data-price-for]').all()) {
        if ((await price.isVisible()) && (await price.inputValue()) === '') {
          await price.fill('745000');
        }
      }
      const days = main.locator('input[name="seller_estimated_days_on_market"]').first();
      if (
        (await days.count()) > 0 &&
        (await days.isVisible()) &&
        (await days.isEditable()) &&
        (await days.inputValue()) === ''
      ) {
        await days.fill('60');
      }
      const button = page.getByTestId('live-validate');
      const next =
        (await button.count()) > 0
          ? button
          : page.getByRole('button', { name: /Valider et continuer/ }).last();
      await expect(next).toBeEnabled({ timeout: 30_000 });
      const before = `${type}|${await main.textContent()}`;
      await next.click();
      await expect
        .poll(
          async () => `${await main.getAttribute('data-live-page')}|${await main.textContent()}`,
          { timeout: 60_000 },
        )
        .not.toBe(before);
    }
    await scale.getByRole('button', { name: '10', exact: true }).click();
    await expect(page.getByText('Note enregistrée')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('link', { name: /Terminer le rendez-vous/ }).click();
    await page.waitForTimeout(3_000);

    await page.setViewportSize({ width: 1280, height: 900 });
    await printPdf(page, `/builder/${id}/etude-de-marche`, 'market-study', path.join(OUT, 'etude.pdf'));
    await printPdf(page, `/builder/${id}/synthese`, 'seller-synthesis', path.join(OUT, 'synthese.pdf'));
    if (KEEP) writeFileSync(path.join(OUT, 'dossier.txt'), id);
  } finally {
    if (!KEEP) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/builder');
      await resetDemoByScreen(page);
    }
  }
});
