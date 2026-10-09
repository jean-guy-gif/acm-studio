import { expect, test, type Page } from '@playwright/test';

import {
  expectNoHorizontalScroll,
  login,
  mainText,
  pagePayload,
  uniqueDossierName,
  withoutSpaces,
} from './support';

// Mission 66 — un dossier de bout en bout, sans portail : Préparation → Live → Suivi.
// Le dossier créé porte un nom unique daté ; il reste ensuite dans le Suivi de l'agence
// de test (un dossier conclu ne se supprime pas aujourd'hui — docs/IDEES.md).

type Competitor = {
  title: string;
  surface: number;
  price: number;
  daysOnMarket: number;
  guess: number;
};

// Des montants volontairement non ronds : un seul chiffre ne peut pas apparaître par
// hasard ailleurs dans la page.
const COMPETITORS: Competitor[] = [
  { title: 'TEST concurrent A', surface: 62, price: 291_500, daysOnMarket: 45, guess: 280_000 },
  { title: 'TEST concurrent B', surface: 64, price: 298_700, daysOnMarket: 120, guess: 290_000 },
  { title: 'TEST concurrent C', surface: 67, price: 312_400, daysOnMarket: 200, guess: 305_000 },
];

// La fourchette du conseiller : écran conseiller seulement, jamais devant le vendeur.
const FOURCHETTE = { min: 255_500, max: 345_500 };
const PERCEIVED_PRICE = 330_000;
const COMMERCIALIZATION_PRICE = 315_000;
const COMMENT = 'Réponse saisie par le test automatique';

test('parcours complet : Préparation → Live → Suivi', async ({ page }) => {
  const dossierName = uniqueDossierName();
  let projectId = '';

  await test.step('Connexion', async () => {
    await login(page);
  });

  await test.step('Nouveau dossier', async () => {
    await page.goto('/builder/new');
    await page.getByLabel('Nom du vendeur').fill(dossierName);
    await page.getByRole('button', { name: 'Créer le dossier' }).click();
    await expect(page).toHaveURL(/\/builder\/[0-9a-f-]{36}$/);
    projectId = page.url().split('/').pop() ?? '';
    await expect(page.getByRole('heading', { name: dossierName })).toBeVisible();
  });

  await test.step('Bien vendeur saisi à la main, puis la fourchette', async () => {
    await page.goto(`/builder/${projectId}/property`);
    // Le nom accessible d'un champ inclut son suffixe (« Surface m² ») : on cible le
    // champ par le texte exact de son libellé.
    const field = (label: string) =>
      page
        .locator('label')
        .filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) })
        .locator('input');
    // Mission 77 — le type se choisit dans une liste.
    await page
      .locator('label')
      .filter({ has: page.locator('span', { hasText: /^Type de bien$/ }) })
      .locator('select')
      .selectOption('Appartement');
    await field('Surface').fill('65');
    await field('Pièces').fill('3');
    await field('Code postal').fill('06000');
    await field('Ville').fill('Nice');
    await field('De').fill(String(FOURCHETTE.min));
    await field('À').fill(String(FOURCHETTE.max));
    // Mission 77 — un seul bouton, dans la barre fixée, qui dit où en est la fiche.
    await expect(page.getByText('Modifications non enregistrées')).toBeVisible();
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Enregistré', { exact: true })).toBeVisible();
  });

  await test.step('Trois concurrents saisis à la main', async () => {
    for (const competitor of COMPETITORS) {
      await page.goto(`/builder/${projectId}/comparables/new`);
      const form = page
        .locator('form')
        .filter({ has: page.getByRole('button', { name: 'Enregistrer le bien concurrent' }) });
      await form.locator('input[name="title"]').fill(competitor.title);
      await form.locator('input[name="postal_code"]').fill('06000');
      await form.locator('input[name="city"]').fill('Nice');
      await form.locator('input[name="surface_area"]').fill(String(competitor.surface));
      await form.locator('input[name="rooms_count"]').fill('3');
      await form.locator('input[name="price"]').fill(String(competitor.price));
      await form.locator('input[name="days_on_market"]').fill(String(competitor.daysOnMarket));
      await form.getByRole('button', { name: 'Enregistrer le bien concurrent' }).click();
      await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/comparables(\\?.*)?$`));
    }
  });

  await test.step('Fourchette validée : le dossier passe en « prêt »', async () => {
    await page.goto(`/builder/${projectId}/comparables/positioning`);
    await page.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await expect(page.getByText('Ce dossier est prêt')).toBeVisible();
    await page.goto('/builder?prets=1');
    await expect(page.getByText(dossierName)).toBeVisible();
  });

  await test.step('Live, chaque écran avec une réponse', async () => {
    await walkLive(page, projectId, { firstPass: true, tablet: false });
  });

  await test.step('Live rejoué en tablette (768 × 1024)', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await walkLive(page, projectId, { firstPass: false, tablet: true });
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  await test.step('Conclusion « à relancer » avec un motif', async () => {
    await page.getByRole('link', { name: /Terminer le rendez-vous/ }).click();
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/conclusion$`));
    await page
      .locator('label')
      .filter({ hasText: /^À relancer$/ })
      .click();
    await page.locator('textarea[name="follow_up_reason"]').fill(COMMENT);
    await page.getByRole('button', { name: 'Conclure le rendez-vous' }).click();
  });

  await test.step('Le dossier apparaît dans le Suivi', async () => {
    await expect(page).toHaveURL(/\/suivi/);
    const card = page
      .locator('li, article, div')
      .filter({ has: page.locator(`a[href="/builder/${projectId}"]`) })
      .filter({ hasText: dossierName })
      .filter({ hasText: 'À relancer' })
      .last();
    await expect(card, 'Le dossier conclu « à relancer » est absent du Suivi').toBeVisible();

    // Mission 82 — le chemin parcouru : prix du vendeur en début de rendez-vous, prix de
    // commercialisation, et l'écart entre les deux.
    const journey = page
      .locator('li')
      .filter({ has: page.locator(`a[href="/builder/${projectId}"]`) })
      .getByText('Le chemin parcouru pendant le rendez-vous')
      .locator('..');
    await expect(journey.getByText('Prix du vendeur en début de rendez-vous')).toBeVisible();
    const journeyText = withoutSpaces(await journey.innerText());
    expect(journeyText, 'Le prix du vendeur en début de rendez-vous manque au Suivi').toContain(
      String(PERCEIVED_PRICE),
    );
    expect(journeyText, 'Le prix de commercialisation manque au Suivi').toContain(
      String(COMMERCIALIZATION_PRICE),
    );
    expect(journeyText, 'L’écart début → commercialisation manque au Suivi').toContain(
      String(PERCEIVED_PRICE - COMMERCIALIZATION_PRICE),
    );
  });
});

// ---------------------------------------------------------------------------------------
// Le Live, écran par écran, dans l'ordre de build-live-pages.ts. Au premier passage, les
// règles absolues sont vérifiées sur chaque écran ; au second (tablette), les réponses
// déjà enregistrées sont reprises et l'on vérifie l'absence de défilement horizontal.
// ---------------------------------------------------------------------------------------

async function walkLive(
  page: Page,
  projectId: string,
  { firstPass, tablet }: { firstPass: boolean; tablet: boolean },
): Promise<void> {
  const onScreen = async (screen: string) => {
    await expectFourchetteHidden(page, screen);
    if (tablet) await expectNoHorizontalScroll(page, screen);
  };
  const validate = () => page.getByRole('button', { name: /Valider et continuer/ }).click();
  const choose = (label: string) =>
    page
      .locator('label')
      .filter({ hasText: new RegExp(`^${label}$`) })
      .click();

  await page.goto(`/live/${projectId}`);

  // Introduction
  await expect(page.getByRole('button', { name: 'Démarrer la présentation' })).toBeVisible();
  await onScreen('Introduction');
  await page.getByRole('button', { name: 'Démarrer la présentation' }).click();

  // Votre bien
  await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
  await onScreen('Votre bien');
  await choose('Oui, c’est bien mon bien');
  await page.locator('textarea[name="seller_property_comment"]').fill(COMMENT);
  await validate();

  // Votre valeur perçue — mission 82 : en début de rendez-vous, avant tout concurrent, et
  // sans rien révéler (ni marché, ni prix de concurrent, ni fourchette).
  await expect(
    page.getByRole('heading', { name: 'À quel prix positionneriez-vous aujourd’hui votre bien ?' }),
  ).toBeVisible();
  await onScreen('Votre valeur perçue');
  await expect(
    page.getByText('Positionnement observé sur le marché concurrentiel'),
    'Le marché est révélé dès la valeur perçue',
  ).toHaveCount(0);
  if (firstPass) {
    for (const competitor of COMPETITORS) {
      await expectPriceHidden(page, competitor, 'Votre valeur perçue');
    }
  }
  await page.locator('input[name="seller_perceived_property_price"]').fill(String(PERCEIVED_PRICE));
  await validate();

  for (const [index, competitor] of COMPETITORS.entries()) {
    const label = `Concurrent ${index + 1} sur ${COMPETITORS.length}`;
    const others = COMPETITORS.filter((other) => other !== competitor);

    // 1. Un sérieux concurrent ? — sans prix.
    await expect(
      page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
    ).toBeVisible();
    await expect(page.getByText(`${label} · Étape 1 sur 4`)).toBeVisible();
    await onScreen(`${label} · Un sérieux concurrent ?`);
    if (firstPass) await expectPriceHidden(page, competitor, 'Un sérieux concurrent ?');
    await expectAlone(page, others, `${label} · Un sérieux concurrent ?`);
    await choose('Oui, un concurrent sérieux');
    await page.locator('textarea[name="seller_serious_competitor_comment"]').fill(COMMENT);
    await validate();

    // 2. À quel prix ? — le vendeur devine, toujours sans prix.
    await expect(
      page.getByRole('heading', { name: 'À quel prix pensez-vous que ce bien est proposé ?' }),
    ).toBeVisible();
    await onScreen(`${label} · À quel prix ?`);
    if (firstPass) await expectPriceHidden(page, competitor, 'À quel prix ?');
    await expectAlone(page, others, `${label} · À quel prix ?`);
    await page
      .locator('input[name="seller_estimated_listing_price"]')
      .fill(String(competitor.guess));
    await validate();

    // 3. Révélation.
    await expect(
      page.getByRole('heading', { name: 'Ce prix vous paraît-il cohérent ?' }).first(),
    ).toBeVisible();
    await onScreen(`${label} · Ce prix vous paraît-il cohérent ?`);
    expect(
      await mainText(page),
      `Le prix de ${competitor.title} n'est pas révélé après la devinette`,
    ).toContain(String(competitor.price));
    await expectAlone(page, others, `${label} · Ce prix vous paraît-il cohérent ?`);
    await choose('Oui, ce prix paraît cohérent');
    await page.locator('textarea[name="seller_price_coherence_comment"]').fill(COMMENT);
    await validate();

    // 4. Pourquoi toujours en vente ? — durée devinée, puis révélée.
    await expect(
      page.getByRole('heading', { name: 'Pourquoi est-il toujours sur le marché ?' }),
    ).toBeVisible();
    await onScreen(`${label} · Pourquoi toujours en vente ?`);
    await expectAlone(page, others, `${label} · Pourquoi toujours en vente ?`);
    await page.locator('input[name="seller_estimated_days_on_market"]').fill('90');
    const reveal = page.getByRole('button', { name: /Révéler la durée/ });
    if (await reveal.isVisible()) await reveal.click();
    await expect(page.getByText('Durée observée sur le marché')).toBeVisible();
    await onScreen(`${label} · durée révélée`);
    await choose('Prix trop élevé');
    await page.locator('textarea[name="seller_market_duration_comment"]').fill(COMMENT);
    await validate();
  }

  // Le concurrent le plus dangereux
  await expect(
    page.getByRole('heading', { name: 'Quel concurrent vous paraît le plus dangereux ?' }),
  ).toBeVisible();
  await onScreen('Le concurrent le plus dangereux');
  await page
    .locator('label')
    .filter({ has: page.locator('input[name="seller_most_dangerous_comparable_id"]') })
    .filter({ hasText: COMPETITORS[0].title })
    .click();
  await choose('Meilleure localisation');
  await page.locator('textarea[name="seller_most_dangerous_comment"]').fill(COMMENT);
  await validate();

  // Analyse des prix
  await expect(page.getByRole('heading', { name: 'Analyse des prix', exact: true })).toBeVisible();
  // Le marché se révèle ici, face au prix donné en début de rendez-vous.
  await expect(
    page.getByText('Positionnement observé sur le marché concurrentiel', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Votre prix en début de rendez-vous')).toBeVisible();
  expect(
    await mainText(page),
    'Le prix du vendeur en début de rendez-vous n’est pas rappelé sur « Analyse des prix »',
  ).toContain(String(PERCEIVED_PRICE));
  await onScreen('Analyse des prix');
  await validate();

  // Conclusion — « Sur quel prix partons-nous ? », champ vide à l'ouverture.
  await expect(page.getByRole('heading', { name: 'Conclusion', exact: true })).toBeVisible();
  await onScreen('Conclusion');
  const commercialization = page.locator('input[name="commercialization_price"]');
  await expect(commercialization, 'Le prix de commercialisation est pré-rempli').toHaveValue('');
  await commercialization.fill(String(COMMERCIALIZATION_PRICE));
  await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
  await expect(page.getByText('Prix de commercialisation enregistré.')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Terminer le rendez-vous/ }),
    'Le dernier écran du Live ne mène plus à la conclusion',
  ).toBeVisible();
}

// Règle absolue : jamais le prix d'un concurrent avant la devinette — ni à l'écran, ni dans
// la charge livrée au navigateur.
async function expectPriceHidden(page: Page, competitor: Competitor, screen: string) {
  expect(
    await pagePayload(page),
    `Le prix de ${competitor.title} est dans la page avant la devinette (« ${screen} »)`,
  ).not.toContain(String(competitor.price));
}

// Règle absolue : un seul concurrent par écran du Live.
async function expectAlone(page: Page, others: Competitor[], screen: string) {
  const text = await mainText(page);
  for (const other of others) {
    expect(text, `${other.title} apparaît sur l'écran « ${screen} »`).not.toContain(
      other.title.replace(/\s/g, ''),
    );
    expect(text, `Le prix de ${other.title} apparaît sur l'écran « ${screen} »`).not.toContain(
      String(other.price),
    );
  }
}

// Règle absolue : la fourchette du conseiller n'est jamais montrée côté vendeur.
async function expectFourchetteHidden(page: Page, screen: string) {
  const payload = await pagePayload(page);
  for (const bound of [FOURCHETTE.min, FOURCHETTE.max]) {
    expect(
      payload,
      `La fourchette du conseiller (${bound}) est dans la page vendeur « ${screen} »`,
    ).not.toContain(String(bound));
  }
}
