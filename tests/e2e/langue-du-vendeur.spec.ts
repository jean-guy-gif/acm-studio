import { expect, test, type Browser, type Page } from './test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Mission 140 — le client dans sa langue, côté vendeur, sur l'URL d'essai, avec le compte de
// l'agence de démonstration (rien d'extérieur, rien de payant) : « Mr and Mrs Bernard » préfèrent
// l'anglais. Leur Live (présentation directe) s'ouvre en anglais, passe en français par
// « Réglages » au premier concurrent, revient en anglais, va jusqu'à la conclusion ; le mandat se
// signe (l'écran du conseiller reste en français) ; la synthèse et le Point marché sont en anglais,
// les mentions légales de l'agence en français. La démo est remise à zéro d'abord.

const COMMERCIALIZATION_PRICE = 952_500;

const next = (page: Page) => page.getByRole('button', { name: /Confirm and continue/ }).click();

async function freshDirectDemo(page: Page): Promise<string> {
  await resetDemoByScreen(page);
  const href = await page
    .locator('[data-testid="demo-dossier"][data-stage="direct"] a')
    .first()
    .getAttribute('href');
  const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
  expect(id, 'Le dossier de démo « direct » est introuvable dans « Ma démo »').toBeTruthy();
  return id as string;
}

// Le lien public, sans compte, dans un navigateur neuf.
async function openAsVisitor(browser: Browser, link: string, testId: string): Promise<string> {
  const bypass = process.env.E2E_VERCEL_BYPASS;
  const stranger = await browser.newContext(
    bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {},
  );
  try {
    const visitor = await stranger.newPage();
    await visitor.goto(link);
    await expect(visitor.getByTestId(testId)).toBeVisible();
    return await visitor.locator('body').innerText();
  } finally {
    await stranger.close();
  }
}

async function switchLanguage(page: Page, to: 'fr' | 'en'): Promise<void> {
  await page.getByTestId('live-options').click();
  await page
    .getByTestId('live-language')
    .filter({
      hasText: to === 'fr' ? 'Passer les écrans en français' : 'Passer les écrans en anglais',
    })
    .click();
}

test('la langue du vendeur : un Live en anglais, passé en français et revenu, puis ses documents', async ({
  page,
}) => {
  await login(page, demoCredentials());
  const projectId = await freshDirectDemo(page);

  await test.step('Avant le rendez-vous : la langue du vendeur est l’anglais', async () => {
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    await expect(page.locator('[data-client-language] input[value="en"]')).toBeChecked();
    // L'écran du conseiller reste en français.
    await expect(page.getByText('Langue du vendeur')).toBeVisible();
    await expectOneFilled(page, 'Avant le rendez-vous, vendeur anglophone');
  });

  await test.step('Le Live s’ouvre en anglais', async () => {
    await page.goto(`/live/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
    await page.getByTestId('launch-for-real').click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}$`));
    await expect(
      page.getByText('Let’s look together at the properties competing with yours.'),
    ).toBeVisible();
    await expectOneFilled(page, 'Accueil du Live, en anglais');
    await page.getByRole('button', { name: 'Start the presentation' }).click();
    await expect(page.getByRole('heading', { name: 'Your property', exact: true })).toBeVisible();
    await next(page);
    await expect(
      page.getByRole('heading', { name: 'A property for sale near yours' }),
    ).toBeVisible();
    await expect(page.getByText('Competing property 1 of 5', { exact: true })).toBeVisible();
    // Les montants à l'anglaise : l'euro devant, la virgule des milliers.
    await expect(page.locator('[data-direct-price]')).toContainText(/€\d{1,3}(,\d{3})+/);
  });

  await test.step('« Réglages » : en français, puis de nouveau en anglais, sur le même écran', async () => {
    await switchLanguage(page, 'fr');
    await expect(
      page.getByRole('heading', { name: 'Un bien en vente près du vôtre' }),
    ).toBeVisible();
    await expect(page.getByText('Concurrent 1 sur 5', { exact: true })).toBeVisible();
    await expect(page.locator('[data-direct-price]')).toContainText(/\d{1,3}(\s\d{3})+\s€/);
    // Le choix est enregistré sur le dossier : un rechargement le garde.
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Un bien en vente près du vôtre' }),
    ).toBeVisible();
    await switchLanguage(page, 'en');
    await expect(
      page.getByRole('heading', { name: 'A property for sale near yours' }),
    ).toBeVisible();
    await expect(page.getByText('Competing property 1 of 5', { exact: true })).toBeVisible();
  });

  await test.step('Les concurrents, le plus proche, l’analyse, en anglais', async () => {
    for (const position of [2, 3, 4, 5]) {
      await next(page);
      await expect(
        page.getByText(`Competing property ${position} of 5`, { exact: true }),
      ).toBeVisible();
    }
    await next(page);
    const dpe = page.getByRole('heading', { name: 'Your EPC against the market' });
    const closest = page.getByRole('heading', { name: 'The competing property closest to yours' });
    await expect(dpe.or(closest).first()).toBeVisible();
    if (await dpe.isVisible()) await next(page);
    await expect(closest).toBeVisible();
    const card = page.getByTestId('closest-competitor').first();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await next(page);
    await expect(page.getByRole('heading', { name: 'Price analysis', exact: true })).toBeVisible();
    await expect(page.locator('[data-price-band]')).toContainText(
      'The asking prices of the properties you have seen',
    );
    await next(page);
  });

  await test.step('La conclusion en anglais, puis « Thank you »', async () => {
    await expect(page.getByRole('heading', { name: 'Conclusion', exact: true })).toBeVisible();
    await expect(page.getByText('What price shall we go with?')).toBeVisible();
    await page
      .locator('input[data-price-for="commercialization_price"]')
      .fill(String(COMMERCIALIZATION_PRICE));
    await expect(page.locator('[data-price-position]')).toContainText(
      /^At €952,500, your property would be/,
    );
    await page.getByRole('button', { name: 'Save the price' }).click();
    await expect(page.getByText('Your listing price is saved.')).toBeVisible();
    await page.getByRole('button', { name: /End the meeting/ }).click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}/merci$`));
    await expect(page.getByRole('heading', { name: 'Thank you for your time' })).toBeVisible();
  });

  await test.step('Le mandat se signe, l’écran du conseiller en français', async () => {
    await page.getByRole('link', { name: 'Accès conseiller' }).click();
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/conclusion$`));
    await page
      .locator('label')
      .filter({ hasText: /^Mandat signé$/ })
      .click();
    await page
      .locator('label')
      .filter({ hasText: /^Exclusif$/ })
      .click();
    await page.getByRole('button', { name: 'Conclure le rendez-vous' }).click();
    await expect(page).toHaveURL(/\/suivi/);
  });

  await test.step('La synthèse en anglais, les mentions légales en français', async () => {
    await page.goto(`/builder/${projectId}/synthese`);
    const synthesis = page.getByTestId('seller-synthesis');
    await expect(synthesis).toBeVisible();
    for (const title of [
      'Your property',
      'The properties we looked at together',
      'The price analysis',
      'How your price evolved',
    ]) {
      await expect(synthesis.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    await expect(synthesis.getByRole('heading', { level: 1 })).toContainText('Our meeting');
    await expect(synthesis).toContainText('€952,500');
    for (const french of [
      'Notre rendez-vous',
      'Les biens que nous avons regardés ensemble',
      'Le chemin de votre prix',
      'Votre conseiller',
    ]) {
      await expect(synthesis.getByText(french)).toHaveCount(0);
    }
    await expect(synthesis).toContainText('Ne peut recevoir aucun fonds');
    // Le lien public : la même synthèse, en anglais.
    await page.getByRole('button', { name: /Créer un lien pour le vendeur/ }).click();
    const link = (await page.getByTestId('synthesis-link').innerText()).trim();
    expect(link).toMatch(/\/synthese\/[A-Za-z0-9_-]{43}$/);
    const text = await openAsVisitor(page.context().browser()!, link, 'seller-synthesis');
    expect(text).toContain('How your price evolved');
    expect(text).not.toContain('Le chemin de votre prix');
    await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
    await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
  });

  await test.step('Le Point marché en anglais', async () => {
    await page.goto('/suivi');
    const row = page.getByTestId('suivi-row').filter({ hasText: 'Mr and Mrs Bernard' });
    await expect(row).toBeVisible();
    await row.getByTestId('suivi-link-point').click();
    await row.getByTestId('refresh-prices').click();
    await expect(row.getByTestId('market-update-recorded')).toBeVisible({ timeout: 60_000 });
    await row.getByTestId('open-market-update').click();
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/point-marche`));
    const document = page.getByTestId('market-update');
    await expect(document).toBeVisible();
    await expect(document.getByRole('heading', { level: 1 })).toContainText('Market update');
    await expect(
      document.getByRole('heading', { name: 'Where your price stands', exact: true }),
    ).toBeVisible();
    await expect(document.getByTestId('ranking-verdict')).toContainText(/: you are \d+/);
    await expect(document.getByText('Où en est votre prix')).toHaveCount(0);
    // Le lien public et son message, en anglais ; le bouton du conseiller reste en français.
    await page.getByRole('button', { name: /Créer un lien pour le vendeur/ }).click();
    await expect(page.getByTestId('market-update-link-message')).toContainText(
      'Hello, here is the market update',
    );
    const link = (await page.getByTestId('market-update-link').innerText()).trim();
    expect(link).toMatch(/\/point-marche\/[A-Za-z0-9_-]{43}$/);
    const text = await openAsVisitor(page.context().browser()!, link, 'market-update');
    expect(text).toContain('Where your price stands');
    expect(text).toContain('Download as PDF');
    expect(text).not.toContain('Où en est votre prix');
    await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
    await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
  });
});
