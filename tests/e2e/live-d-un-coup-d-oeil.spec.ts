import { expect, test, type Page } from '@playwright/test';

import { DEMO_SCENARIOS } from '../../src/features/demo/data/scenarios';
import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectNoVerticalScroll,
  goViaAccountMenu,
  login,
} from './support';

// Mission 148 B — « Le Live d'un coup d'œil ». Les deux Lives de la démo, menés de bout en bout :
// le Live interactif de Mme Garcia (Vence, 5 concurrents, rythme accéléré : 4 écrans pour les
// trois premiers, 2 ensuite), en français, puis la présentation directe des Bernard, en anglais.
// À chaque écran traversé, aux trois fenêtres de Safari sur tablette (réponse 5 de Jean-Guy), rien
// ne défile : ni la page, ni la fiche, et rien ne passe sous la barre du bas. Les devinettes sont
// choisies pour faire paraître les trois couleurs de la réponse du vendeur (vert sous 5 %, orange
// de 5 à 10 %, rouge au-delà), lues à la révélation et sur l'écran du plus dangereux.
// La démo est remise à zéro avant et après : les Lives joués ici ne restent pas.

const TABLETS = [
  { width: 1024, height: 700 },
  { width: 1180, height: 750 },
  { width: 820, height: 1110 },
] as const;

// Le prix affiché de chaque concurrent de Vence, retrouvé par sa surface (unique dans le scénario).
const VENCE = DEMO_SCENARIOS.find((scenario) => scenario.id === 'vence')!;
const priceBySurface = new Map(
  VENCE.listings.map((listing) => [Math.round(listing.surfaceArea), listing.price]),
);
// Les écarts visés, un par concurrent, dans l'ordre du Live : vert, orange, rouge, puis encore.
const GAPS = [0.02, -0.07, 0.15, -0.03, -0.12];

async function freshDemo(page: Page): Promise<Record<string, string>> {
  await goViaAccountMenu(page, 'Ma démo');
  await expect(page).toHaveURL(/\/ma-demo$/);
  const hrefs = () =>
    page
      .getByTestId('demo-dossier')
      .evaluateAll((items) => items.map((item) => item.querySelector('a')?.getAttribute('href')));
  const before = await hrefs();
  if (before.length === 0) {
    await page.getByRole('button', { name: 'Préparer ma démo' }).click();
  } else {
    await page.getByRole('button', { name: 'Remettre ma démo à zéro' }).click();
    await page
      .getByTestId('demo-reset-confirm')
      .getByRole('button', { name: 'Remettre à zéro' })
      .click();
    await expect.poll(async () => (await hrefs())[0], { timeout: 180_000 }).not.toBe(before[0]);
  }
  await expect(page.getByTestId('demo-dossier')).toHaveCount(6, { timeout: 180_000 });
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

// L'écran courant, aux trois fenêtres ; on revient ensuite à la première pour jouer.
async function checkScreen(page: Page, label: string): Promise<void> {
  for (const size of TABLETS) {
    await page.setViewportSize(size);
    await expectNoVerticalScroll(page, `${label} (${size.width} × ${size.height})`);
    await expectNoHorizontalScroll(page, `${label} (${size.width} × ${size.height})`);
  }
  await page.setViewportSize(TABLETS[0]);
}

async function openLive(page: Page, projectId: string): Promise<void> {
  await page.goto(`/live/${projectId}`);
  await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
  await page.getByTestId('launch-for-real').click();
  const start = page.locator('main button.btn-filled').first();
  await expect(start).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('[data-photos-preloaded="true"]')).toHaveCount(1, {
    timeout: 120_000,
  });
  await start.click();
  await expect(page.locator('main')).not.toHaveAttribute('data-live-page', 'intro', {
    timeout: 30_000,
  });
}

const screenLabel = async (page: Page): Promise<string> => {
  const type = (await page.locator('main').getAttribute('data-live-page')) ?? '?';
  const step = ((await page.locator('[data-live-step]').textContent()) ?? '').trim();
  return `${type} · ${step}`;
};

test('le Live tient sur la tablette, et la réponse du vendeur se lit en couleur', async ({
  page,
}) => {
  test.setTimeout(20 * 60_000);
  // Quitter un Live dont un enregistrement de fond court encore demande confirmation (M89) : oui.
  page.on('dialog', (dialog) => void dialog.accept());
  await page.setViewportSize(TABLETS[0]);
  await login(page, demoCredentials());
  const ids = await freshDemo(page);

  try {
    // 1. Le Live interactif de Mme Garcia, en français.
    await openLive(page, ids.ready!);
    const main = page.locator('main');
    const radio = async (field: string, value?: string) => {
      const input = main.locator(`input[name="${field}"]${value ? `[value="${value}"]` : ''}`);
      if ((await input.count()) === 0 || (await input.first().isChecked())) return;
      await input.first().locator('xpath=ancestor::label[1]').click();
    };
    const tones = new Set<string>();
    let guessed = 0;
    for (let step = 0; step < 60; step += 1) {
      const type = (await main.getAttribute('data-live-page')) ?? '';
      if (type === 'closing_question') break;
      const label = await screenLabel(page);
      await checkScreen(page, label);
      if (['comparable_price_reveal', 'comparable_quick_reveal'].includes(type)) {
        const tone = await main.locator('[data-guess-gap]').first().getAttribute('data-guess-gap');
        expect(['green', 'orange', 'red'], `Réponse sans couleur — ${label}`).toContain(tone);
        tones.add(tone!);
      }
      if (type === 'dangerous_competitor') {
        // Chaque carte du plus dangereux porte la réponse du vendeur, en couleur.
        const cards = await main
          .locator('[data-guess-gap]')
          .evaluateAll((items) => items.map((item) => item.getAttribute('data-guess-gap')));
        expect(cards.length, 'Aucune réponse en couleur sur le plus dangereux').toBeGreaterThan(0);
        expect(cards.every((tone) => ['green', 'orange', 'red'].includes(tone ?? ''))).toBe(true);
      }
      await radio('seller_property_confirmed', 'yes');
      await radio('seller_serious_competitor', 'yes');
      await radio('seller_most_dangerous_comparable_id');
      const price = main.locator('input[data-price-for]').first();
      if (
        (await price.count()) > 0 &&
        (await price.isVisible()) &&
        (await price.inputValue()) === ''
      ) {
        const field = await price.getAttribute('data-price-for');
        if (field === 'seller_estimated_listing_price') {
          const heading = (await main.locator('h3').first().textContent()) ?? '';
          const surface = Number(/(\d+)\s*m²/.exec(heading)?.[1]);
          const listed = priceBySurface.get(surface);
          expect(listed, `Prix de démo introuvable pour « ${heading} »`).toBeTruthy();
          const gap = GAPS[guessed % GAPS.length]!;
          guessed += 1;
          await price.fill(String(Math.round((listed! * (1 + gap)) / 1000) * 1000));
        } else if (field === 'commercialization_price') {
          await price.fill('745000');
          await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
          await expect(page.getByText('Prix de commercialisation enregistré.')).toBeVisible();
        } else {
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
    await expect(main).toHaveAttribute('data-live-page', 'closing_question');
    await checkScreen(page, 'La note de 1 à 10');
    expect([...tones].sort(), 'Les trois couleurs de la réponse du vendeur').toEqual([
      'green',
      'orange',
      'red',
    ]);

    // 2. La présentation directe des Bernard, en anglais : aucune couleur, aucune devinette.
    await openLive(page, ids.direct!);
    for (let step = 0; step < 40; step += 1) {
      const type = (await main.getAttribute('data-live-page')) ?? '';
      const label = await screenLabel(page);
      await checkScreen(page, `Directe · ${label}`);
      await expect(main.locator('[data-guess-gap]:not([data-guess-gap="none"])')).toHaveCount(0);
      if (type === 'conclusion') break;
      const button = page.getByTestId('live-validate');
      await expect(button).toBeEnabled({ timeout: 30_000 });
      const before = `${type}|${await page.locator('[data-live-step]').textContent()}|${await main.textContent()}`;
      await button.click();
      await expect
        .poll(
          async () =>
            `${await main.getAttribute('data-live-page')}|${await page.locator('[data-live-step]').textContent()}|${await main.textContent()}`,
          { timeout: 60_000 },
        )
        .not.toBe(before);
    }
    await expect(main).toHaveAttribute('data-live-page', 'conclusion');
  } finally {
    // La démo reprend son état de départ.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/builder');
    await freshDemo(page);
  }
});
