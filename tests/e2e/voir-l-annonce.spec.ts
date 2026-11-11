import { expect, test, type Page } from '@playwright/test';

import { DEMO_SCENARIOS } from '../../src/features/demo/data/scenarios';
import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Mission 152 (partie A) — prouver. Sur la démo, remise à zéro avant et après :
//   1. « Avant le rendez-vous » de Mme Garcia (Vence, prête) : « Depuis la préparation » dit que
//      les annonces n'ont pas été vérifiées ; « Vérifier les annonces » les relit (démo : sans
//      extension, M114) et la baisse du scénario apparaît, ancien → nouveau prix ;
//   2. « Lancer le Live » des Bernard, jamais vérifiés, le rappelle, sans bloquer ;
//   3. au Live de Mme Garcia, « Voir l'annonce » n'existe pas avant la révélation du prix, puis
//      ouvre la copie enregistrée (dans la démo, aucune annonce ne mène à un portail réel) : le
//      prix et ses dates, les photos, les caractéristiques — jamais le titre, ni l'adresse de
//      l'annonce ; « Fermer » rend l'écran tel quel.

const VENCE = DEMO_SCENARIOS.find((scenario) => scenario.id === 'vence')!;
const TITLES = VENCE.listings.map((listing) => listing.title).filter(Boolean);

async function demoIds(page: Page): Promise<Record<string, string>> {
  await resetDemoByScreen(page);
  const ids: Record<string, string> = {};
  for (const stage of ['ready', 'direct']) {
    const href = await page
      .locator(`[data-testid="demo-dossier"][data-stage="${stage}"] a`)
      .first()
      .getAttribute('href');
    const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
    expect(id, `Le dossier de démo « ${stage} » est introuvable`).toBeTruthy();
    ids[stage] = id!;
  }
  return ids;
}

test('vérifier les annonces avant le rendez-vous, puis voir l’annonce au Live', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, demoCredentials());
  const ids = await demoIds(page);

  try {
    // 1. Depuis la préparation.
    await page.goto(`/builder/${ids.ready}/avant-rendez-vous`);
    const block = page.getByTestId('since-preparation');
    await expect(block).toBeVisible();
    await expect(page.getByTestId('since-preparation-status')).toContainText(
      'pas encore vérifiées',
    );
    await expectOneFilled(page, 'Avant le rendez-vous, avant la vérification');
    await page.getByTestId('check-listings').click();
    await expect(page.getByTestId('since-preparation-status')).toContainText('revérifiées', {
      timeout: 60_000,
    });
    await expect(page.getByTestId('since-preparation-status')).toContainText(/(\d+) sur \1 lues/);
    const drop = block.getByTestId('since-preparation-price').first();
    await expect(drop).toContainText('Prix baissé');
    await expect(drop).toContainText('→');
    await expect(drop).toContainText('constaté aujourd’hui');
    await expectOneFilled(page, 'Avant le rendez-vous, après la vérification');

    // 2. Le rappel au lancement, sans bloquer : les Bernard n'ont jamais été vérifiés.
    await page.goto(`/builder/${ids.direct}/lancer-le-live`);
    await expect(page.getByTestId('launch-listings-check')).toBeVisible();
    await expect(page.getByTestId('launch-for-real')).toBeEnabled();

    // 3. Au Live de Mme Garcia.
    await page.goto(`/live/${ids.ready}`);
    await expect(page).toHaveURL(new RegExp(`/builder/${ids.ready}/lancer-le-live$`));
    await expect(page.getByTestId('launch-listings-check')).toHaveCount(0);
    await page.getByTestId('launch-for-real').click();
    const start = page.locator('main button.btn-filled').first();
    await expect(start).toBeVisible({ timeout: 90_000 });
    await start.click();
    const main = page.locator('main');
    await expect(main).not.toHaveAttribute('data-live-page', 'intro', { timeout: 30_000 });

    let seen = false;
    for (let step = 0; step < 15 && !seen; step += 1) {
      const type = (await main.getAttribute('data-live-page')) ?? '';
      if (type === 'comparable_price_reveal') {
        const open = page.getByTestId('live-listing-open');
        await expect(open).toBeVisible();
        const url = page.url();
        await open.click();
        const copy = page.getByTestId('live-listing-copy');
        await expect(copy).toBeVisible({ timeout: 30_000 });
        await expect(copy.getByTestId('live-listing-price')).toContainText('€');
        await expect(copy).toContainText('Relevé le');
        const text = (await copy.textContent()) ?? '';
        for (const title of TITLES) expect(text).not.toContain(title);
        expect(text).not.toContain('demonstration.invalid');
        await copy.getByRole('button', { name: 'Fermer' }).click();
        await expect(copy).toHaveCount(0);
        expect(page.url()).toBe(url);
        await expect(main).toHaveAttribute('data-live-page', 'comparable_price_reveal');
        seen = true;
        break;
      }
      // Avant la révélation, le bouton n'existe pas.
      await expect(page.getByTestId('live-listing-open')).toHaveCount(0);
      const yes = main.locator('input[name="seller_property_confirmed"][value="yes"]');
      if ((await yes.count()) > 0) await yes.locator('xpath=ancestor::label[1]').click();
      const serious = main.locator('input[name="seller_serious_competitor"][value="yes"]');
      if ((await serious.count()) > 0) await serious.locator('xpath=ancestor::label[1]').click();
      const price = main.locator('input[data-price-for]').first();
      if (
        (await price.count()) > 0 &&
        (await price.isVisible()) &&
        (await price.inputValue()) === ''
      )
        await price.fill('700000');
      const next = page.getByTestId('live-validate');
      await expect(next).toBeEnabled({ timeout: 30_000 });
      // La valeur perçue se redit avant d'être confirmée (M92) : le même écran change de texte.
      const before = `${type}|${await page.locator('[data-live-step]').textContent()}|${await main.textContent()}`;
      await next.click();
      await expect
        .poll(
          async () =>
            `${await main.getAttribute('data-live-page')}|${await page.locator('[data-live-step]').textContent()}|${await main.textContent()}`,
          { timeout: 60_000 },
        )
        .not.toBe(before);
    }
    expect(seen, 'La révélation du prix n’a pas été atteinte').toBe(true);
  } finally {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/builder');
    await demoIds(page);
  }
});
