import { expect, test, type Page } from '@playwright/test';

import { DEMO_BUYERS } from '../../src/features/demo/services/demo-buyers';
import {
  demoCredentials,
  goViaAccountMenu,
  login,
  mainText,
  pagePayload,
  readDemoBuyersShown,
} from './support';

// Mission 131 — la présentation directe, sur l'URL d'essai, avec le compte de l'agence de
// démonstration (rien d'extérieur, rien de payant) et son dossier « Prêt, en présentation
// directe » : remis en Live interactif, le Live est mené sur les deux premiers concurrents, passé
// en présentation directe au 3e par « Réglages », puis conduit jusqu'à la conclusion. L'Étude de
// marché s'ouvre depuis le dossier (Avant le rendez-vous, Vue d'ensemble) et depuis le Live.
//
// Le passage remet d'abord la démo du compte à zéro : le dossier joué est neuf à chaque fois.

const PERCEIVED_PRICE = 985_500;
const GUESS = 870_500;
const COMMERCIALIZATION_PRICE = 952_500;
const DEMO_LISTING_HOST = 'annonces.demonstration.invalid';

const validate = (page: Page) => page.getByRole('button', { name: /Valider et continuer/ }).click();
const choose = (page: Page, label: string) =>
  page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .click();

async function freshDemo(page: Page): Promise<{ direct: string; ready: string }> {
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
  await expect(page.getByTestId('demo-dossier')).toHaveCount(5, { timeout: 180_000 });
  const idOf = async (stage: string) => {
    const href = await page
      .locator(`[data-testid="demo-dossier"][data-stage="${stage}"] a`)
      .first()
      .getAttribute('href');
    const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
    expect(id, `Le dossier de démo « ${stage} » est introuvable dans « Ma démo »`).toBeTruthy();
    return id as string;
  };
  return { direct: await idOf('direct'), ready: await idOf('ready') };
}

// Mission 133 — ce qui ne doit jamais apparaître devant le vendeur : le nom, le téléphone et
// l'e-mail d'un acquéreur de la démo.
const BUYER_SECRETS = DEMO_BUYERS.flatMap((buyer) =>
  [buyer.name, buyer.phone, buyer.email].filter((value): value is string => value != null),
);

async function expectMarketStudy(page: Page, from: string): Promise<void> {
  await expect(page, `L’Étude de marché ne s’ouvre pas depuis ${from}`).toHaveURL(
    /\/etude-de-marche$/,
  );
  await expect(page.getByText(/Étude de marché/).first()).toBeVisible();
  expect(await pagePayload(page), `Une adresse d’annonce dans l’Étude (${from})`).not.toContain(
    DEMO_LISTING_HOST,
  );
}

// Les deux premiers concurrents, en Live interactif : le sérieux, la devinette, la révélation,
// puis la durée quand elle est connue.
async function interactiveCompetitor(page: Page, position: number): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
  ).toBeVisible();
  await expect(page.getByText(new RegExp(`Concurrent ${position} sur 5 · Étape 1`))).toBeVisible();
  await choose(page, 'Oui, un concurrent sérieux');
  await validate(page);
  await expect(
    page.getByRole('heading', { name: 'À quel prix pensez-vous que ce bien est proposé ?' }),
  ).toBeVisible();
  await page.locator('input[name="seller_estimated_listing_price"]').fill(String(GUESS));
  await validate(page);
  await expect(
    page.getByRole('heading', { name: 'Ce prix vous paraît-il cohérent ?' }).first(),
  ).toBeVisible();
  await validate(page);
  const duration = page.getByRole('heading', { name: 'Pourquoi est-il toujours sur le marché ?' });
  const next = page.getByRole('heading', {
    name: 'Est-il un sérieux concurrent pour votre bien ?',
  });
  await expect(duration.or(next).first()).toBeVisible();
  if (await duration.isVisible()) {
    await page.locator('input[name="seller_estimated_days_on_market"]').fill('90');
    await page.getByRole('button', { name: /Révéler la durée/ }).click();
    await expect(page.getByText('Durée observée sur le marché')).toBeVisible();
    await validate(page);
  }
}

test('la présentation directe : passée au 3e concurrent, jusqu’à la conclusion', async ({
  page,
}) => {
  await login(page, demoCredentials());
  const { direct: projectId } = await freshDemo(page);

  await test.step('Avant le rendez-vous : la façon de présenter, et l’Étude de marché', async () => {
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    const modes = page.locator('[data-presentation-mode]');
    await expect(modes.locator('input[value="direct"]')).toBeChecked();
    // Pas de note de 1 à 10 en directe : le déroulé ne la compte pas.
    await expect(page.getByText('Question de 1 à 10')).toHaveCount(0);
    await page.getByTestId('market-study-link').click();
    await expectMarketStudy(page, 'Avant le rendez-vous');
    // Le Live commence en interactif : on y revient avant de lancer.
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    await modes.locator('label').filter({ hasText: 'Live interactif' }).click();
    await expect(modes.locator('input[value="interactive"]')).toBeChecked();
    // L'enregistrement est fini quand les choix se réactivent (ils sont désactivés pendant l'envoi).
    await expect(modes.locator('input[value="direct"]')).toBeEnabled();
    await expect(modes.locator('[role="alert"]')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-presentation-mode] input[value="interactive"]')).toBeChecked();
    // La Vue d'ensemble propose aussi l'Étude. Mission 133 — et les acquéreurs de l'agence pour ce
    // bien : 5 prêts (la maison a une piscine), M. Fontaine correspond sans être prêt.
    await page.goto(`/builder/${projectId}`);
    await expect(page.getByTestId('property-buyers-headline')).toHaveText(
      '5 prêts à visiter · 1 autre correspond',
    );
    await expect(page.getByTestId('property-buyer-ready')).toHaveCount(5);
    await page.getByTestId('market-study-link').click();
    await expectMarketStudy(page, 'la Vue d’ensemble');
  });

  await test.step('Le Live interactif, deux concurrents', async () => {
    await page.goto(`/live/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
    await page.getByTestId('launch-for-real').click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}$`));
    await page.getByRole('button', { name: 'Démarrer la présentation' }).click();
    await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
    // Mission 133 — le compteur caché : une pastille sans chiffre ni texte ; la bulle du conseiller,
    // puis « Montrer au vendeur » : 5 cartes anonymes ; le retour rend le même écran.
    const dot = page.getByTestId('live-buyers-dot');
    await expect(dot).toBeVisible();
    expect((await dot.innerText()).trim()).toBe('');
    const before = page.url();
    await dot.click();
    await expect(page.getByTestId('live-buyers-bubble')).toContainText('5 acquéreurs prêts');
    await page.getByRole('button', { name: 'Montrer au vendeur' }).click();
    const screen = page.getByTestId('live-buyers-screen');
    await expect(screen).toContainText(
      '5 familles cherchent un bien comme le vôtre et sont prêtes à visiter',
    );
    await expect(screen.getByTestId('live-buyer-card')).toHaveCount(5);
    await expect(screen.getByText('Financement validé')).toHaveCount(5);
    const payload = await pagePayload(page);
    for (const secret of BUYER_SECRETS) {
      expect(payload, `« ${secret} » devant le vendeur`).not.toContain(secret);
    }
    await page.getByTestId('live-buyers-back').click();
    await expect(screen).toHaveCount(0);
    expect(page.url()).toBe(before);
    await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
    // Le moment est noté sur le Live, avec le nombre montré (lu en base).
    await expect.poll(() => readDemoBuyersShown(projectId), { timeout: 20_000 }).toBe(5);
    await validate(page);
    await page
      .locator('input[name="seller_perceived_property_price"]')
      .fill(String(PERCEIVED_PRICE));
    await validate(page);
    await page.getByRole('button', { name: /Confirmer et continuer/ }).click();
    await interactiveCompetitor(page, 1);
    await interactiveCompetitor(page, 2);
  });

  await test.step('Au 3e concurrent : « Passer en présentation directe »', async () => {
    await expect(
      page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
    ).toBeVisible();
    await page.getByTestId('live-options').click();
    const study = page.getByRole('menuitem', { name: 'Télécharger l’Étude de marché' });
    await expect(study).toHaveAttribute('href', `/builder/${projectId}/etude-de-marche?vue=live`);
    // Ouverte devant le vendeur, dans un nouvel onglet : le document seul, rien du conseiller.
    const [popup] = await Promise.all([page.context().waitForEvent('page'), study.click()]);
    await popup.waitForLoadState();
    await expect(popup).toHaveURL(/\/etude-de-marche\?vue=live$/);
    await expect(popup.getByText(/Étude de marché/).first()).toBeVisible();
    await expect(popup.getByRole('link', { name: /Retour au dossier/ })).toHaveCount(0);
    await expect(popup.getByText(/Créer un lien/)).toHaveCount(0);
    expect(await pagePayload(popup)).not.toContain(DEMO_LISTING_HOST);
    await popup.close();
    await page.getByTestId('live-options').click();
    await page.getByRole('menuitem', { name: 'Passer en présentation directe' }).click();
    // Le même concurrent, son prix affiché d'emblée, sans question.
    await expect(
      page.getByRole('heading', { name: 'Un bien en vente près du vôtre' }),
    ).toBeVisible();
    await expect(page.getByText('Concurrent 3 sur 5', { exact: true })).toBeVisible();
    await expect(page.locator('[data-direct-price]')).toBeVisible();
    expect(await mainText(page)).toMatch(/prixaffichésurlemarché\d+€/i);
    await expect(page.locator('input')).toHaveCount(0);
    for (const position of [4, 5]) {
      await validate(page);
      await expect(page.getByText(`Concurrent ${position} sur 5`, { exact: true })).toBeVisible();
      await expect(page.locator('[data-direct-price]')).toBeVisible();
    }
    await validate(page);
  });

  await test.step('Le plus proche, proposé par le conseiller, puis l’analyse', async () => {
    const dpe = page.getByRole('heading', { name: 'Le DPE face au marché' });
    const closest = page.getByRole('heading', {
      name: 'Le concurrent le plus proche de votre bien',
    });
    await expect(dpe.or(closest).first()).toBeVisible();
    if (await dpe.isVisible()) await validate(page);
    await expect(closest).toBeVisible();
    await expect(page.getByText('Quel concurrent vous paraît le plus dangereux ?')).toHaveCount(0);
    const card = page.getByTestId('closest-competitor').first();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await validate(page);
    await expect(
      page.getByRole('heading', { name: 'Analyse des prix', exact: true }),
    ).toBeVisible();
    // Les deux devinés et les trois montrés en directe sont sur la bande.
    await expect(page.locator('[data-price-band] [data-band-dot]')).toHaveCount(5);
    await validate(page);
  });

  await test.step('La conclusion termine le rendez-vous, sans note de 1 à 10', async () => {
    await expect(page.getByRole('heading', { name: 'Conclusion', exact: true })).toBeVisible();
    await expect(page.getByText('Concurrent le plus proche de votre bien').first()).toBeVisible();
    await page
      .locator('input[name="commercialization_price"]')
      .fill(String(COMMERCIALIZATION_PRICE));
    await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
    await expect(page.getByText('Prix de commercialisation enregistré.')).toBeVisible();
    await page.getByRole('button', { name: /Terminer le rendez-vous/ }).click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}/merci$`));
  });

  await test.step('L’Étude de marché, depuis le lien du Live', async () => {
    await page.goto(`/builder/${projectId}/etude-de-marche`);
    await expectMarketStudy(page, 'le menu du Live');
  });
});

// Mission 133 — sous 5 acquéreurs prêts, rien : ni pastille, ni bulle, ni écran. La maison de
// Mme Garcia n'a pas de piscine, les Lambert la veulent (★) : il en reste 4.
test('la boucle : un dossier à 4 acquéreurs prêts n’a pas de pastille', async ({ page }) => {
  await login(page, demoCredentials());
  const { ready: garciaId } = await freshDemo(page);
  await page.goto(`/builder/${garciaId}`);
  await expect(page.getByTestId('property-buyers-headline')).toHaveText(
    '4 prêts à visiter · 1 autre correspond',
  );
  await page.goto(`/live/${garciaId}`);
  await expect(page).toHaveURL(new RegExp(`/builder/${garciaId}/lancer-le-live$`));
  await page.getByTestId('launch-for-real').click();
  await expect(page).toHaveURL(new RegExp(`/live/${garciaId}$`));
  await page.getByRole('button', { name: 'Démarrer la présentation' }).click();
  await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
  await expect(page.getByTestId('live-buyers-dot')).toHaveCount(0);
  expect(await pagePayload(page)).not.toContain('familles cherchent un bien');
});
