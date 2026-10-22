import { expect, test, type Page } from '@playwright/test';

import {
  expectNoHorizontalScroll,
  login,
  mainText,
  pagePayload,
  TEST_PRICE_DROP,
  ageTestFollowUp,
  readTestOppositions,
  removeTestOppositions,
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
  // Mission 95 — cinq concurrents : les deux derniers passent en rythme accéléré (2 écrans).
  { title: 'TEST concurrent D', surface: 63, price: 301_300, daysOnMarket: 60, guess: 295_000 },
  { title: 'TEST concurrent E', surface: 66, price: 305_900, daysOnMarket: 150, guess: 300_000 },
];

// La fourchette du conseiller : écran conseiller seulement, jamais devant le vendeur.
const FOURCHETTE = { min: 255_500, max: 345_500 };
// Mission 94 — le vendeur arrive à 350 000 €, puis reformule à 325 000 € après avoir vu le marché.
const PERCEIVED_PRICE = 350_000;
const REVISED_PRICE = 325_000;
const COMMERCIALIZATION_PRICE = 315_000;
const COMMENT = 'Réponse saisie par le test automatique';
const FOLLOW_UP_NOTE = 'Message laissé, d’après le test automatique';
const MISSING_FOR_TEN = 'Le délai, d’après le test automatique';
// Mission 98 — une adresse confirmée regroupe les concurrents qui la partagent, d'un dossier à
// l'autre : chaque passage a donc SES adresses, sinon la carte hériterait du statut « remis »
// laissé par le passage précédent.
const RUN_NUMBER = (Date.now() % 90_000) + 1_000;
const PROSPECTING_ADDRESS = `${RUN_NUMBER} avenue du Test Automatique, 06600 Antibes`;
const OPPOSED_ADDRESS = `${RUN_NUMBER} rue du Refus Automatique, 06600 Antibes`;
// 06530 couvre cinq communes : l'inscription à la main doit demander laquelle.
const CHOSEN_STREET = `${RUN_NUMBER + 2} rue du Refus Automatique`;
const CHOSEN_ADDRESS = `${CHOSEN_STREET}, 06530 Peymeinade`;
const TOUR_ADDRESS = `${RUN_NUMBER} boulevard de la Tournée, 06160 Juan-les-Pins`;

test('parcours complet : Préparation → Live → Suivi', async ({ page }) => {
  const dossierName = uniqueDossierName();
  let projectId = '';

  await test.step('Connexion', async () => {
    await login(page);
  });

  // Mission 93 — « Supprimer » demande confirmation dans l'écran, puis archive : le dossier
  // disparaît des listes et ne s'ouvre plus par son adresse.
  await test.step('Supprimer un dossier : confirmation, puis il disparaît', async () => {
    const doomed = `${uniqueDossierName()} à supprimer`;
    await page.goto('/builder/new');
    await page.getByLabel('Nom du vendeur').fill(doomed);
    await page.getByRole('button', { name: 'Créer le dossier' }).click();
    await expect(page).toHaveURL(/\/builder\/[0-9a-f-]{36}$/);
    const doomedUrl = page.url();

    await page.goto('/builder');
    const item = page.locator('li').filter({ hasText: doomed });
    await item.getByRole('button', { name: 'Supprimer' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(`Supprimer le dossier ${doomed}`)).toBeVisible();
    await expect(dialog.getByText('Il disparaîtra de vos listes.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(item, '« Annuler » a supprimé le dossier').toBeVisible();

    await item.getByRole('button', { name: 'Supprimer' }).click();
    await dialog.getByRole('button', { name: 'Supprimer' }).click();
    await expect(page).toHaveURL(/\/builder$/);
    await expect(page.getByText(doomed), 'Le dossier supprimé reste dans la liste').toHaveCount(0);
    await page.goto(doomedUrl);
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
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
    // Mission 99 — Paris, Lyon, Marseille : la fiche dit l'arrondissement lu dans le code postal.
    await field('Code postal').fill('75015');
    await field('Ville').fill('Paris');
    await expect(page.getByText('Arrondissement : Paris 15e')).toBeVisible();
    await field('Code postal').fill('06000');
    await field('Ville').fill('Nice');
    await expect(page.getByText(/^Arrondissement :/)).toHaveCount(0);
    await field('De').fill(String(FOURCHETTE.min));
    // Mission 77 — un seul bouton, dans la barre fixée, qui dit où en est la fiche.
    await expect(page.getByText('Modifications non enregistrées')).toBeVisible();

    // Mission 93 — quitter par le menu avec des modifications non enregistrées demande
    // confirmation ; refuser laisse sur la fiche, saisie intacte.
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('ne sont pas enregistrées');
      void dialog.dismiss();
    });
    await page.getByRole('link', { name: /^Suivi/ }).click();
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/property`));
    await expect(field('Surface')).toHaveValue('65');

    // Mission 93 — une seule borne : « Indiquez les deux montants ». Le reste s'enregistre.
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Indiquez les deux montants')).toBeVisible();
    await field('À').fill(String(FOURCHETTE.max));
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Enregistré', { exact: true })).toBeVisible();
    await expect(page.getByText('Indiquez les deux montants')).toHaveCount(0);
    // Mission 110 — une fiche courte : le reste est replié dans « Compléments (facultatif) ».
    await expect(page.getByTestId('essential-fields')).toBeVisible();
    await expect(field('Chambres')).toBeHidden();
    await expect(field('Terrain')).toBeHidden();
    // Fermés par défaut, résumés en une ligne.
    await expect(page.getByTestId('complements-summary')).toHaveText(/^Compléments : /);
  });

  // Mission 99 — les réglages de la recherche : affichés, enregistrés sur le dossier, remis par
  // défaut. « Chercher les concurrents » n'est JAMAIS cliqué ici : aucun appel payant.
  await test.step('Réglages de la recherche : défaut, « réglé par vous », remise par défaut', async () => {
    await page.goto(`/builder/${projectId}/comparables/find`);
    const block = page.locator('[data-search-settings]');
    const summary = block.locator('summary');
    await expect(summary).toContainText('Réglages de la recherche');
    // Replié : les valeurs que l'outil utiliserait seul, rien de réglé.
    await expect(summary).toContainText('3 pièces');
    await expect(summary).not.toContainText('réglé par vous');
    await expect(page.getByText('Coût maximal : 0,60 € par recherche')).toBeVisible();

    await summary.click();
    await block.getByLabel('Toute la commune', { exact: true }).check();
    await block.getByLabel('Pièces : de').fill('3');
    await block.getByLabel('Pièces : à').fill('4');
    await expect(block.getByText('Réglages non enregistrés')).toBeVisible();
    await block.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await expect(block.getByText('Réglages enregistrés sur ce dossier.')).toBeVisible();
    await expect(summary).toContainText('Toute la commune · ');
    await expect(summary).toContainText('3 à 4 pièces');
    await expect(summary).toContainText('réglé par vous');

    // Enregistrés sur le dossier : ils survivent à une actualisation.
    await page.reload();
    await expect(summary).toContainText('3 à 4 pièces · ');
    await expect(summary).toContainText('réglé par vous');
    await summary.click();
    await expect(block.locator('[data-setting-custom="true"]')).toHaveCount(2);

    // Une borne seule est refusée, rien n'est enregistré.
    await block.getByLabel('Pièces : à').fill('');
    await block.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await expect(block.getByRole('alert')).toContainText('indiquez les deux valeurs');

    // Remis par défaut : la mention disparaît.
    for (let left = 2; left > 0; left -= 1) {
      await block.getByRole('button', { name: 'Remettre par défaut' }).first().click();
    }
    await block.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await expect(block.getByText('Réglages enregistrés sur ce dossier.')).toBeVisible();
    await expect(summary).not.toContainText('réglé par vous');
    await expect(block.locator('[data-setting-custom="true"]')).toHaveCount(0);
  });

  // Mission 110 — des critères de plus, et une recherche nommée qui ne garde jamais le prix, les
  // pièces ni la surface. Toujours sans cliquer « Chercher les concurrents ».
  await test.step('Critères DPE et étage, recherche nommée enregistrée puis rappelée', async () => {
    const block = page.locator('[data-search-settings]');
    const summary = block.locator('summary');
    const dpe = block.getByTestId('search-filter-dpe');
    await dpe.getByLabel('C', { exact: true }).check();
    await dpe.getByLabel('D', { exact: true }).check();
    await block.getByLabel('Étage minimum').fill('2');
    await block.getByLabel('Pièces : de').fill('3');
    await block.getByLabel('Pièces : à').fill('4');
    await block.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await expect(block.getByText('Réglages enregistrés sur ce dossier.')).toBeVisible();
    await expect(summary).toContainText('DPE C, D');
    await expect(summary).toContainText('2e étage ou plus');

    const named = block.getByTestId('named-searches');
    await named.getByLabel('Nom de la recherche').fill(`Appartements Nice ${RUN_NUMBER}`);
    await named.getByRole('button', { name: 'Enregistrer cette recherche' }).click();
    const saved = named.locator('li').filter({ hasText: `Appartements Nice ${RUN_NUMBER}` });
    await expect(saved).toContainText('DPE C, D');
    await expect(saved).toContainText('2e étage ou plus');
    // Ni prix, ni pièces, ni surface dans ce qu'elle garde.
    await expect(saved).not.toContainText(/pièce|m²|€/);

    // Remis par défaut, puis rappelée : ses critères reviennent, pas les pièces du dossier.
    for (let left = 3; left > 0; left -= 1) {
      await block.getByRole('button', { name: 'Remettre par défaut' }).first().click();
    }
    await block.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await expect(summary).not.toContainText('réglé par vous');
    await saved.getByRole('button', { name: 'Appliquer à ce dossier' }).click();
    await expect(
      named.getByText('Recherche appliquée et enregistrée sur ce dossier.'),
    ).toBeVisible();
    await expect(summary).toContainText('DPE C, D');
    await expect(summary).toContainText('3 pièces');
    await expect(summary).not.toContainText('3 à 4 pièces');

    // Retirée, et les réglages remis par défaut pour la suite du parcours.
    await saved.getByRole('button', { name: 'Retirer' }).click();
    await expect(named.getByText('Recherche retirée.')).toBeVisible();
    await expect(saved).toHaveCount(0);
    for (let left = 2; left > 0; left -= 1) {
      await block.getByRole('button', { name: 'Remettre par défaut' }).first().click();
    }
    await block.getByRole('button', { name: 'Enregistrer les réglages' }).click();
    await expect(summary).not.toContainText('réglé par vous');
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
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    // Mission 95 — le rythme du Live : accéléré par défaut, les deux durées estimées côte à côte.
    const rhythmSetting = page.locator('[data-live-rhythm]');
    await expect(
      rhythmSetting.getByRole('radio', { name: 'Accéléré à partir du 4e concurrent' }),
    ).toBeChecked();
    await expect(
      rhythmSetting.getByRole('radio', { name: 'Complet pour tous les concurrents' }),
    ).toBeEnabled();
    await expect(rhythmSetting).toContainText(
      /Accéléré : environ \d+\smin · Complet : environ \d+\smin/,
    );
    // Mission 110 — avant la décision, pas d'« Étape suivante » ici : c'est cet écran qui l'est.
    await expect(page.getByTestId('next-step')).toHaveCount(0);
    await page.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await expect(page.getByText('Ce dossier est prêt')).toBeVisible();
    // Puis l'étape suivante dit quoi faire : lancer le Live.
    await page.goto(`/builder/${projectId}`);
    await expect(page.getByTestId('next-step')).toHaveText('Lancer le Live →');
    await page.goto('/builder?prets=1');
    await expect(page.getByText(dossierName)).toBeVisible();
  });

  // Mission 110 — le mode expert, allumé dans « Mon profil » puis éteint, quoi qu'il arrive.
  await test.step('Mode expert : rappels masqués, ordre du Live, export du comparatif', async () => {
    const toggle = async (on: boolean) => {
      await page.goto('/profil');
      const box = page.getByTestId('expert-mode').getByRole('checkbox');
      if ((await box.isChecked()) !== on) {
        await box.click();
        await expect(page.getByTestId('expert-mode').getByText('Enregistrement…')).toHaveCount(0);
      }
      await expect(box).toBeChecked({ checked: on });
    };
    await toggle(true);
    try {
      await page.goto(`/builder/${projectId}/avant-rendez-vous`);
      await expect(page.getByTestId('real-dossier-note')).toHaveCount(0);
      const order = page.getByTestId('live-order');
      const entries = order.getByTestId('live-order-entry');
      await expect(entries).toHaveCount(COMPETITORS.length);
      const labels = order.getByTestId('live-order-label');
      const before = await labels.allInnerTexts();
      await order
        .getByRole('button', { name: /^Descendre / })
        .first()
        .click();
      await expect(order.getByText('Ordre enregistré.')).toBeVisible();
      await page.reload();
      expect(await labels.allInnerTexts()).toEqual([before[1], before[0], ...before.slice(2)]);
      // Remis dans l'ordre d'origine : le Live du parcours compte sur lui.
      await order
        .getByRole('button', { name: /^Monter / })
        // Le premier ne monte pas ; celui descendu est désormais le deuxième.
        .nth(1)
        .click();
      await expect(order.getByText('Ordre enregistré.')).toBeVisible();
      await page.reload();
      expect(await labels.allInnerTexts()).toEqual(before);

      const href = await page.getByTestId('export-comparison').getAttribute('href');
      const response = await page.request.get(href!);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/csv');
      const csv = await response.text();
      expect(csv).toContain('Rang;Au Live;Type');
      expect(csv.trim().split('\r\n')).toHaveLength(COMPETITORS.length + 2);
      for (const competitor of COMPETITORS) expect(csv).not.toContain(competitor.title);
    } finally {
      await toggle(false);
    }
    // Hors mode expert : ni ordre, ni export, et le rappel revient.
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    await expect(page.getByTestId('live-order')).toHaveCount(0);
    await expect(page.getByTestId('export-comparison')).toHaveCount(0);
    await expect(page.getByTestId('real-dossier-note')).toBeVisible();
    expect((await page.request.get(`/builder/${projectId}/export-comparatif`)).status()).toBe(404);
  });

  await test.step('Live, chaque écran avec une réponse', async () => {
    await walkLive(page, projectId, { firstPass: true, tablet: false, dossierName });
  });

  // Mission 110 — une fois le Live commencé, l'ordre des concurrents est figé.
  await test.step('Après le Live : « Ordre figé », flèches désactivées', async () => {
    await page.goto(`/builder/${projectId}/comparables`);
    await expect(page.getByTestId('order-frozen')).toHaveText('Ordre figé : le Live a commencé');
    for (const name of ['↑ Monter', '↓ Descendre']) {
      const arrows = page.getByRole('button', { name, exact: true });
      await expect(arrows.first()).toBeDisabled();
      expect(
        await arrows.evaluateAll((buttons) =>
          buttons.every((b) => (b as HTMLButtonElement).disabled),
        ),
      ).toBe(true);
    }
  });

  await test.step('La liste du Live ne propose plus de recommencer', async () => {
    await page.goto('/live');
    const item = page.locator('li').filter({ hasText: dossierName });
    await expect(item.getByRole('link', { name: /Reprendre \(écran \d+ sur \d+\)/ })).toBeVisible();
    await expect(page.getByText(/Recommencer/)).toHaveCount(0);
  });

  await test.step('Live rejoué en tablette (768 × 1024)', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await walkLive(page, projectId, { firstPass: false, tablet: true, dossierName });
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  await test.step('Conclusion « à relancer » avec un motif', async () => {
    await page.getByRole('link', { name: /Terminer le rendez-vous/ }).click();
    // Mission 92 — la tablette est encore tournée vers le vendeur : un écran neutre d'abord.
    await expect(page, '« Terminer » ne mène pas à l’écran « Merci »').toHaveURL(
      new RegExp(`/live/${projectId}/merci$`),
    );
    await expect(page.getByRole('heading', { name: 'Merci pour cet échange' })).toBeVisible();
    const thanks = await page.locator('body').innerText();
    expect(thanks, 'L’écran « Merci » montre le nom du client').not.toContain(dossierName);
    expect(thanks, 'L’écran « Merci » montre un montant').not.toMatch(/\d{3}\s?€|€/);
    await page.getByRole('link', { name: 'Accès conseiller' }).click();
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/conclusion$`));
    await page
      .locator('label')
      .filter({ hasText: /^À relancer$/ })
      .click();
    await page.locator('textarea[name="follow_up_reason"]').fill(COMMENT);
    // Mission 96 — « à relancer » demande un motif : sans lui, rien ne s'enregistre.
    await page.getByRole('button', { name: 'Conclure le rendez-vous' }).click();
    await expect(page, 'Un « à relancer » s’est enregistré sans motif').toHaveURL(
      new RegExp(`/builder/${projectId}/conclusion$`),
    );
    // Mission 108 — la date de première relance est proposée dès la conclusion, et suit le motif.
    const firstFollowUp = page.getByTestId('first-follow-up-date');
    await expect(firstFollowUp).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    const weekLater = await firstFollowUp.inputValue();
    await page
      .locator('label')
      .filter({ hasText: /^Réfléchit au prix$/ })
      .click();
    await expect(
      firstFollowUp,
      'La date ne suit pas « Réfléchit au prix » (un mois)',
    ).not.toHaveValue(weekLater);
    // Mission 110 — ce qui freine le vendeur : deux objections cochées.
    const objections = page.getByTestId('objections');
    await objections.locator('label').filter({ hasText: 'Le prix' }).click();
    await objections.locator('label').filter({ hasText: 'Le délai' }).click();
    await page.getByRole('button', { name: 'Conclure le rendez-vous' }).click();
  });

  await test.step('Le dossier apparaît dans le Suivi', async () => {
    await expect(page).toHaveURL(/\/suivi/);
    // Mission 86 — une ligne courte par dossier : l'issue, la note, ce qui retient le vendeur.
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await expect(row, 'Le dossier conclu « à relancer » est absent du Suivi').toBeVisible();
    // Mission 110 — les objections cochées à la conclusion.
    await expect(row.getByTestId('objections-line')).toHaveText('Freins : Le prix · Le délai');
    await expect(row.getByText('À relancer', { exact: true })).toBeVisible();
    // Mission 95 — la durée mesurée du Live, du premier écran au « Terminer », pause comprise.
    await expect(row.getByText(/Durée du Live : \d+\smin/)).toBeVisible();
    await expect(
      row.getByText('7 → 10/10'),
      'La note du vendeur manque sur la ligne',
    ).toBeVisible();
    await expect(row.getByRole('link', { name: /Relancer/ })).toBeVisible();
    await expect(row.getByText(/Ce qui le retient/)).toContainText(MISSING_FOR_TEN);

    // Rien n'a disparu : le détail se déplie sous la ligne.
    await row.getByRole('button', { name: /Voir le détail des prix/ }).click();
    await expect(row.getByRole('link', { name: 'Ouvrir le dossier' })).toHaveAttribute(
      'href',
      `/builder/${projectId}`,
    );

    // Mission 82 — le chemin parcouru : prix du vendeur en début de rendez-vous, prix de
    // commercialisation, et l'écart entre les deux.
    const journey = row.getByText('Le chemin parcouru pendant le rendez-vous').locator('..');
    await expect(journey.getByText('Prix du vendeur en début de rendez-vous')).toBeVisible();
    const journeyText = withoutSpaces(await journey.innerText());
    expect(journeyText, 'Le prix du vendeur en début de rendez-vous manque au Suivi').toContain(
      String(PERCEIVED_PRICE),
    );
    await expect(journey.getByText('Prix du vendeur après avoir vu le marché')).toBeVisible();
    expect(journeyText, 'Le prix reformulé par le vendeur manque au Suivi').toContain(
      String(REVISED_PRICE),
    );
    expect(journeyText, 'Le prix de commercialisation manque au Suivi').toContain(
      String(COMMERCIALIZATION_PRICE),
    );
    expect(journeyText, 'L’écart début → commercialisation manque au Suivi').toContain(
      String(PERCEIVED_PRICE - COMMERCIALIZATION_PRICE),
    );

    // Mission 85 — la note donnée après le prix : la première, la dernière, et ce qui manquait.
    // (Mission 96 — le bloc « Ce que le vendeur a dit », au-dessus, la redit : on lit la dernière.)
    await expect(
      row.getByText('Prêt à lancer : 7/10 → 10/10').last(),
      'La note du vendeur manque au Suivi',
    ).toBeVisible();
    await expect(
      row.getByText(`Ce qui manquait pour être à 10 : ${MISSING_FOR_TEN}`),
      'Ce qui manquait pour être à 10 manque au Suivi',
    ).toBeVisible();
  });

  // Mission 96 — la relance : ce que le vendeur a dit, le motif, le dernier contact, une relance
  // consignée, et le message proposé (jamais envoyé, jamais enregistré).
  await test.step('La relance : motif, bloc, « Relancé aujourd’hui », message', async () => {
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await expect(row.getByTestId('follow-up-motive')).toHaveText('Réfléchit au prix');
    await expect(row.getByText('Dernier contact aujourd’hui')).toBeVisible();
    await expect(
      row.getByTestId('follow-up-due'),
      'La pastille « À relancer aujourd’hui » apparaît avant 7 jours',
    ).toHaveCount(0);

    // Le détail est resté ouvert : le bloc reprend le chemin des prix, les devinettes, le
    // concurrent le plus dangereux, la note et la durée.
    const said = row.getByTestId('seller-said');
    await expect(said, 'Le bloc « Ce que le vendeur a dit » manque').toBeVisible();
    const saidText = withoutSpaces(await said.innerText());
    for (const amount of [PERCEIVED_PRICE, REVISED_PRICE, COMMERCIALIZATION_PRICE]) {
      expect(saidText, `Le bloc ne reprend pas ${amount}`).toContain(String(amount));
    }
    await expect(
      said.getByText(/Il a (sous-estimé|surestimé|donné le prix affiché de) \d+/).first(),
    ).toBeVisible();
    await expect(said.getByText(/Le concurrent le plus dangereux, selon lui/)).toBeVisible();
    await expect(said.getByText('Prêt à lancer : 7/10 → 10/10')).toBeVisible();
    await expect(said.getByText(/Durée du Live : \d+\smin/)).toBeVisible();
    // Les prix viennent d'être révélés et figés : aucune comparaison « à aujourd'hui ».
    await expect(said.getByText(/face aux prix affichés aujourd’hui/)).toHaveCount(0);

    // Le filtre par motif ne montre que ce motif, et le dossier y est.
    await page
      .getByTestId('follow-up-motive-filter')
      .getByRole('link', { name: /Réfléchit au prix/ })
      .click();
    await expect(page).toHaveURL(/motif=thinking_price/);
    await expect(row).toBeVisible();
    for (const motive of await page.getByTestId('follow-up-motive').allInnerTexts()) {
      expect(motive, 'Le filtre par motif laisse passer un autre motif').toBe('Réfléchit au prix');
    }

    // « Relancé aujourd'hui », avec une note : l'historique la montre, datée et signée.
    await row.getByRole('button', { name: 'Relancé aujourd’hui' }).click();
    await row.getByLabel('Note de relance (facultative)').fill(FOLLOW_UP_NOTE);
    // Mission 105 — la date de prochaine relance est proposée selon le motif, et modifiable.
    await expect(row.getByLabel('Prochaine relance')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await row.getByRole('button', { name: 'Enregistrer la relance' }).click();
    await expect(row.getByRole('button', { name: 'Relancé aujourd’hui' })).toBeVisible();
    const details = row.getByRole('button', { name: /le détail des prix/ });
    if ((await details.getAttribute('aria-expanded')) !== 'true') {
      await details.click();
    }
    const history = row.getByTestId('follow-up-history');
    await expect(history, 'L’historique des relances manque').toContainText(FOLLOW_UP_NOTE);
    await expect(history).toContainText(/Prochaine relance le \d{2}\/\d{2}/);
    await expect(row.getByText('Dernier contact aujourd’hui')).toBeVisible();

    // « Préparer un message » : il reprend le prix dit par le vendeur, se modifie, se copie.
    await row.getByRole('button', { name: 'Préparer un message' }).click();
    const message = row.locator('textarea');
    const proposed = await message.inputValue();
    expect(withoutSpaces(proposed), 'Le message ne reprend pas le prix du vendeur').toContain(
      String(REVISED_PRICE),
    );
    expect(proposed, 'Le message nomme un concurrent').not.toMatch(/concurrent/i);
    for (const competitor of COMPETITORS) {
      expect(withoutSpaces(proposed), 'Le message contient le prix d’un concurrent').not.toContain(
        String(competitor.price),
      );
    }
    await message.fill(`${proposed}\nPS : test`);
    await expect(row.getByRole('button', { name: 'Copier' })).toBeVisible();
    await row.getByRole('button', { name: 'Fermer' }).click();
    await page.goto('/suivi');
  });

  // Mission 96 — huit jours plus tard, et un concurrent a baissé : le dossier du test est vieilli
  // en base (agence de test seulement), vérifié à l'écran, puis remis exactement comme il était.
  await test.step('Huit jours sans contact : pastille, compteur, baisse, « Copier »', async () => {
    const touched = { conclusions: 1, relances: 1, concurrents: 1 };
    expect(ageTestFollowUp(projectId, 'age'), 'Le dossier du test n’a pas été vieilli').toEqual(
      touched,
    );
    try {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto('/suivi');
      const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
      await expect(row.getByText('Dernier contact il y a 8 jours')).toBeVisible();
      await expect(
        row.getByTestId('follow-up-due'),
        'La pastille manque après 8 jours sans contact',
      ).toHaveText('À relancer aujourd’hui');
      await expect(
        page.getByTestId('follow-up-due-count'),
        'Le compteur « à relancer aujourd’hui » manque',
      ).toHaveText(/^\d+ vendeurs? à relancer aujourd’hui$/);

      await row.getByRole('button', { name: /Voir le détail des prix/ }).click();
      await expect(
        row.getByTestId('seller-said').getByText('1 concurrent a baissé son prix'),
        'La baisse de prix depuis le rendez-vous manque au bloc',
      ).toBeVisible();

      await row.getByRole('button', { name: 'Préparer un message' }).click();
      const message = row.locator('textarea');
      const proposed = await message.inputValue();
      expect(proposed, 'Le message ne dit pas la baisse').toContain(
        'Depuis notre rendez-vous, 1 des biens que nous avions vus a baissé son prix.',
      );
      for (const competitor of COMPETITORS) {
        for (const price of [competitor.price, competitor.price - TEST_PRICE_DROP]) {
          expect(
            withoutSpaces(proposed),
            'Le message contient le prix d’un concurrent',
          ).not.toContain(String(price));
        }
      }
      // Le texte modifié est celui qui est copié ; rien n'est envoyé ni enregistré.
      const edited = `${proposed}\nPS : test`;
      await message.fill(edited);
      await row.getByRole('button', { name: 'Copier' }).click();
      await expect(row.getByText('Message copié.')).toBeVisible();
      expect(
        await page.evaluate(() => navigator.clipboard.readText()),
        'Le presse-papiers ne porte pas le message modifié',
      ).toBe(edited);
    } finally {
      expect(ageTestFollowUp(projectId, 'back'), 'Le dossier du test n’a pas été remis').toEqual(
        touched,
      );
    }

    // Remis en état : le contact est de nouveau d'aujourd'hui, plus de pastille, plus de baisse.
    await page.goto('/suivi');
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await expect(row.getByText('Dernier contact aujourd’hui')).toBeVisible();
    await expect(row.getByTestId('follow-up-due')).toHaveCount(0);
    await row.getByRole('button', { name: /Voir le détail des prix/ }).click();
    await expect(row.getByTestId('seller-said')).toBeVisible();
    await expect(row.getByTestId('seller-said').getByText(/baissé/)).toHaveCount(0);
    await page.goto('/suivi');
  });

  // Mission 86 — Suivi → « Prospecter » → page Prospection filtrée sur le bien → « Marquer
  // remis » → la carte passe dans « Dossier remis ».
  await test.step('Le mandat se signe depuis la ligne du Suivi', async () => {
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await row.getByRole('button', { name: 'Changer l’issue' }).click();
    await row
      .locator('label')
      .filter({ hasText: /^Mandat signé$/ })
      .click();
    // Mission 90 — un mandat signé dit s'il est exclusif ou simple : sans ce choix, rien ne
    // s'enregistre. Le prix du Live est déjà là, affiché et modifiable.
    await expect(row.locator('input[name="commercialization_price"]')).toHaveValue(
      String(COMMERCIALIZATION_PRICE),
    );
    await row.getByRole('button', { name: 'Enregistrer l’issue' }).click();
    await expect(
      row.getByRole('link', { name: /Prospecter/ }),
      'Un mandat signé s’est enregistré sans exclusif ni simple',
    ).toHaveCount(0);
    await row
      .locator('label')
      .filter({ hasText: /^Exclusif$/ })
      .click();
    await row.getByRole('button', { name: 'Enregistrer l’issue' }).click();
    await expect(
      row.getByTestId('mandate-type-badge'),
      'Le badge du type de mandat manque sur la ligne',
    ).toHaveText('Exclusif');
    await expect(page.getByText(/dont \d+ exclusifs?/)).toBeVisible();
    await expect(
      row.getByRole('link', { name: `Prospecter · ${COMPETITORS.length} concurrents →` }),
      'Un mandat signé ne propose pas de prospecter ses concurrents',
    ).toBeVisible();
    await expect(row.getByRole('link', { name: /Relancer/ })).toHaveCount(0);
  });

  await test.step('Prospection filtrée sur le bien, jusqu’au dossier remis', async () => {
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await row.getByRole('link', { name: /Prospecter/ }).click();
    await expect(page).toHaveURL(new RegExp(`/prospection\\?bien=${projectId}$`));
    await expect(page.getByRole('heading', { name: 'Prospection', exact: true })).toBeVisible();

    // Filtrée : les seuls concurrents de ce bien, et chaque carte dit pour quel bien vendeur.
    const cards = page.getByTestId('prospecting-card');
    await expect(cards).toHaveCount(COMPETITORS.length);
    for (const card of await cards.all()) {
      await expect(card.getByText('Pour :')).toBeVisible();
      await expect(card.getByRole('link', { name: dossierName })).toBeVisible();
    }

    // Sans adresse, tout attend dans « Adresse à confirmer ».
    const toConfirm = page.getByTestId('prospecting-column-to_confirm');
    const ready = page.getByTestId('prospecting-column-ready');
    const handed = page.getByTestId('prospecting-column-handed');
    await expect(toConfirm.getByTestId('prospecting-card')).toHaveCount(COMPETITORS.length);

    const first = toConfirm.getByTestId('prospecting-card').first();
    await first.getByRole('button', { name: 'Saisir l’adresse' }).click();
    await first.getByLabel('Adresse du bien concurrent').fill(PROSPECTING_ADDRESS);
    await first.getByRole('button', { name: 'Confirmer l’adresse' }).click();

    const readyCard = ready
      .getByTestId('prospecting-card')
      .filter({ hasText: PROSPECTING_ADDRESS });
    await expect(readyCard, 'L’adresse confirmée ne rend pas le concurrent « prêt »').toBeVisible();
    await readyCard.getByRole('button', { name: 'Marquer remis' }).click();

    const handedCard = handed
      .getByTestId('prospecting-card')
      .filter({ hasText: PROSPECTING_ADDRESS });
    await expect(handedCard, 'La carte n’est pas passée dans « Dossier remis »').toBeVisible();
    await expect(handedCard.getByText(/Remis le \d{2}\/\d{2}/)).toBeVisible();
    await expect(ready.getByTestId('prospecting-card')).toHaveCount(0);

    // Le statut est en base : il tient au rechargement.
    await page.reload();
    await expect(
      page
        .getByTestId('prospecting-column-handed')
        .getByTestId('prospecting-card')
        .filter({ hasText: PROSPECTING_ADDRESS }),
    ).toBeVisible();
  });

  // Mission 98 — « Ne plus solliciter » bloque l'adresse pour toute l'agence ; « Préparer tous
  // les courriers » réunit les dossiers prêts d'un bien vendeur ; la tournée ne garde que les
  // portes où sonner.
  await test.step('Ne plus solliciter, courriers en une fois, tournée', async () => {
    const toConfirm = page.getByTestId('prospecting-column-to_confirm');
    const ready = page.getByTestId('prospecting-column-ready');
    const confirmAddress = async (address: string) => {
      const card = toConfirm.getByTestId('prospecting-card').first();
      await card.getByRole('button', { name: 'Saisir l’adresse' }).click();
      await card.getByLabel('Adresse du bien concurrent').fill(address);
      await card.getByRole('button', { name: 'Confirmer l’adresse' }).click();
      const moved = ready.getByTestId('prospecting-card').filter({ hasText: address });
      await expect(moved, `« ${address} » n’est pas passée dans « Prêt à envoyer »`).toBeVisible();
      return moved;
    };

    const refused = await confirmAddress(OPPOSED_ADDRESS);
    await refused.getByRole('button', { name: 'Ne plus solliciter', exact: true }).click();
    await refused.getByRole('button', { name: 'Confirmer : ne plus solliciter' }).click();
    // Mission 103 — la carte quitte le tableau, et la page le dit.
    await expect(
      page.getByTestId('opposition-notice'),
      'Rien ne confirme l’inscription « Ne plus solliciter »',
    ).toHaveText('Inscrit : plus aucun courrier pour cette adresse');
    await expect(
      ready.getByTestId('prospecting-card').filter({ hasText: OPPOSED_ADDRESS }),
      'Une adresse « Ne plus solliciter » est restée dans le tableau',
    ).toHaveCount(0);
    await page.getByText(/^Ne plus solliciter \(\d+\)$/).click();
    const opposed = page.getByTestId('prospecting-card').filter({ hasText: OPPOSED_ADDRESS });
    await expect(opposed.getByText(/Ne plus solliciter \(demandé le \d{2}\/\d{2}\)/)).toBeVisible();
    await expect(opposed.getByRole('link', { name: /Préparer le dossier/ })).toHaveCount(0);
    // Mission 102 — l'adresse d'un bien opposé ne se corrige plus : une autre écriture le
    // ferait revenir dans les courriers.
    await expect(
      opposed.getByRole('button', { name: 'Corriger l’adresse' }),
      'Une carte « Ne plus solliciter » propose encore de corriger son adresse',
    ).toHaveCount(0);

    // Mission 102 — une opposition s'inscrit aussi à la main, pour une adresse sans carte.
    // Mission 103 — sans commune, elle ne bloquerait rien : elle est refusée ; avec le seul code
    // postal, la commune est déduite, et l'écran montre l'adresse comprise avant d'inscrire.
    await page.getByText('Inscrire une adresse « Ne plus solliciter »').click();
    const manual = page.getByLabel('Adresse à ne plus solliciter');
    const submitManual = page.getByRole('button', { name: 'Ne plus solliciter cette adresse' });
    await manual.fill(`${RUN_NUMBER + 1} rue du Refus Automatique`);
    await submitManual.click();
    await expect(page.getByText(/^Ajoutez le code postal/)).toBeVisible();
    // Mission 104 — la commune est TAPÉE : le parcours ne dépend pas de geo.api.gouv.fr. Le
    // service répond, la commune officielle s'affiche (Juan-les-Pins = Antibes) ; il ne répond
    // pas, la commune tapée vaut, marquée « non vérifiée ». La clé est la même.
    await manual.fill(`${RUN_NUMBER + 1} rue du Refus Automatique · 2e étage, 06160 Juan-les-Pins`);
    await submitManual.click();
    await expect(page.getByTestId('manual-opposition-understood')).toHaveText(
      new RegExp(
        `^${RUN_NUMBER + 1} rue du Refus Automatique · 2e étage, (Antibes|Juan-les-Pins)$`,
      ),
    );
    await page.getByRole('button', { name: 'Inscrire', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Inscrit : plus aucun courrier' }).first(),
    ).toBeVisible();

    // Un dossier prêt : le bouton apparaît, et ouvre un seul document pour ce bien vendeur.
    await confirmAddress(TOUR_ADDRESS);
    const letters = page.getByRole('link', { name: 'Préparer tous les courriers' });
    await expect(letters).toHaveAttribute('href', `/prospection/courriers?bien=${projectId}`);
    await page.goto(`/prospection/courriers?bien=${projectId}`);
    await expect(page.getByRole('heading', { name: 'Courriers de prospection' })).toBeVisible();
    // Le concurrent du test n'est ni en exclusivité ni chez un particulier : ACM ne sait pas à
    // qui écrire. Il est listé en tête avec sa raison, et n'est pas imprimé.
    await expect(page.getByText(TOUR_ADDRESS)).toBeVisible();
    await expect(page.getByText(/À qui s’adresser \?/)).toBeVisible();
    // Mission 105 — l'adresse « Ne plus solliciter » est listée en tête avec sa raison, et jamais
    // imprimée.
    await expect(page.locator('li').filter({ hasText: OPPOSED_ADDRESS })).toContainText(
      'Ce propriétaire a demandé à ne plus être sollicité',
    );
    await expect(page.locator('.pf-doc').filter({ hasText: OPPOSED_ADDRESS })).toHaveCount(0);

    // La tournée de ce bien : la porte encore à voir et le dossier remis, jamais l'adresse
    // « Ne plus solliciter ».
    await page.goto(`/prospection/tournee?bien=${projectId}`);
    await expect(page.getByRole('heading', { name: 'Ma tournée de prospection' })).toBeVisible();
    await expect(page.getByText(TOUR_ADDRESS)).toBeVisible();
    await expect(page.getByText(PROSPECTING_ADDRESS)).toBeVisible();
    await expect(page.getByText(OPPOSED_ADDRESS)).toHaveCount(0);
    await expect(page.getByTestId('tour-commune').first()).toContainText('Antibes');

    await page.goto(`/prospection?bien=${projectId}`);
  });

  // Une opposition annoncée doit être une opposition ÉCRITE, et qui bloque. Le parcours inscrit
  // une adresse à la main, commune tapée (M104), pour un bien qui EST sur une carte : la base
  // doit porter la ligne de la carte opposée plus haut et celle-ci, le courrier doit être refusé,
  // et l'adresse sortir de la tournée.
  await test.step('Opposition à la main, commune tapée : en base, et elle bloque', async () => {
    const ready = page.getByTestId('prospecting-column-ready');
    const card = ready.getByTestId('prospecting-card').filter({ hasText: TOUR_ADDRESS });
    await card.getByRole('button', { name: 'Corriger l’adresse' }).click();
    await card.getByLabel('Adresse du bien concurrent').fill(CHOSEN_ADDRESS);
    await card.getByRole('button', { name: 'Confirmer l’adresse' }).click();
    const moved = ready.getByTestId('prospecting-card').filter({ hasText: CHOSEN_ADDRESS });
    await expect(moved).toBeVisible();
    const href = await moved
      .getByRole('link', { name: /Préparer le dossier/ })
      .first()
      .getAttribute('href');
    const letter = `${(href ?? '').split('?')[0]}?version=owner`;
    expect(letter, 'Le lien du courrier est introuvable').toMatch(/\/prospection\/[0-9a-f-]{36}\?/);
    await page.goto(`/prospection/tournee?bien=${projectId}`);
    await expect(page.getByText(CHOSEN_ADDRESS)).toBeVisible();
    await page.goto(`/prospection?bien=${projectId}`);

    const cardKey = `${RUN_NUMBER} rue du refus automatique antibes`;
    const chosenKey = `${RUN_NUMBER + 2} rue du refus automatique peymeinade`;
    const before = readTestOppositions();
    console.log(`Oppositions en base AVANT l’inscription à la main : ${before.length}`, before);
    expect(before, 'La ligne inscrite depuis la carte n’est pas en base').toContain(cardKey);
    expect(before).not.toContain(chosenKey);

    await page.getByText('Inscrire une adresse « Ne plus solliciter »').click();
    // Mission 104 — la commune est tapée (06530 en couvre cinq) : sans dépendre du service.
    await page
      .getByLabel('Adresse à ne plus solliciter')
      .fill(`${CHOSEN_STREET}, 06530 Peymeinade`);
    await page.getByRole('button', { name: 'Ne plus solliciter cette adresse' }).click();
    await expect(page.getByTestId('manual-opposition-understood')).toHaveText(
      `${CHOSEN_STREET}, Peymeinade`,
    );
    // Rien n'est écrit avant « Inscrire ».
    expect(readTestOppositions()).toEqual(before);
    await page.getByRole('button', { name: 'Inscrire', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Inscrit : plus aucun courrier' }).first(),
    ).toBeVisible();

    const during = readTestOppositions();
    console.log(`Oppositions en base APRÈS l’inscription à la main : ${during.length}`, during);
    expect(during, 'L’opposition à la main n’est pas en base').toContain(chosenKey);
    expect(during, 'La ligne de la carte a disparu').toContain(cardKey);
    expect(during).toHaveLength(before.length + 1);

    // Elle bloque : la carte quitte le tableau, son courrier est refusé, la tournée l'ignore.
    await expect(
      ready.getByTestId('prospecting-card').filter({ hasText: CHOSEN_ADDRESS }),
      'L’adresse inscrite à la main est restée « prête »',
    ).toHaveCount(0);
    await page.goto(letter);
    await expect(
      page.getByText('Ce propriétaire a demandé à ne plus être sollicité'),
      'Le courrier d’une adresse « Ne plus solliciter » n’est pas refusé',
    ).toBeVisible();
    await page.goto(`/prospection/courriers?bien=${projectId}`);
    await expect(page.getByRole('heading', { name: 'Courriers de prospection' })).toBeVisible();
    await expect(
      page.locator('.pf-doc').filter({ hasText: CHOSEN_ADDRESS }),
      'L’adresse « Ne plus solliciter » est restée dans les courriers à imprimer',
    ).toHaveCount(0);
    // Mission 105 — elle est listée en tête, avec sa raison.
    await expect(page.locator('li').filter({ hasText: CHOSEN_ADDRESS })).toContainText(
      'Ce propriétaire a demandé à ne plus être sollicité',
    );
    await page.goto(`/prospection/tournee?bien=${projectId}`);
    await expect(page.getByRole('heading', { name: 'Ma tournée de prospection' })).toBeVisible();
    await expect(page.getByText(PROSPECTING_ADDRESS)).toBeVisible();
    await expect(
      page.getByText(CHOSEN_ADDRESS),
      'L’adresse « Ne plus solliciter » est restée dans la tournée',
    ).toHaveCount(0);
    await page.goto(`/prospection?bien=${projectId}`);
  });

  // Mission 110 — la synthèse laissée au vendeur : jamais un titre ni une adresse de concurrent,
  // jamais « Vendu par » ; son lien s'ouvre sans compte.
  await test.step('La synthèse au vendeur, à imprimer ou par lien', async () => {
    await page.goto(`/builder/${projectId}/synthese`);
    const synthesis = page.getByTestId('seller-synthesis');
    await expect(synthesis.getByText('Ce que vous nous avez dit')).toBeVisible();
    await expect(synthesis.getByText('Le marché vu ensemble')).toBeVisible();
    const check = async (text: string, where: string) => {
      for (const competitor of COMPETITORS) {
        expect(text, `${where} : le titre « ${competitor.title} »`).not.toContain(competitor.title);
      }
      expect(text, `${where} : « Vendu par »`).not.toMatch(/Vendu par|Exclusivité|[Ee]stimation/);
      expect(text, `${where} : une adresse de prospection`).not.toContain(
        'boulevard de la Tournée',
      );
    };
    await check(await synthesis.innerText(), 'La synthèse');
    // Mission 111 — les prix du Live, sous leurs noms du Live.
    await expect(synthesis.getByText('Prix des concurrents', { exact: true })).toBeVisible();
    await expect(synthesis).not.toContainText(
      /que nous vous proposons|Prix retenu par votre conseiller/,
    );
    await page.getByRole('button', { name: /Créer un lien pour le vendeur/ }).click();
    const link = (await page.getByTestId('synthesis-link').innerText()).trim();
    expect(link).toMatch(/\/synthese\/[A-Za-z0-9_-]{43}$/);
    // Sans compte, dans un navigateur neuf : la synthèse s'ouvre, et n'est pas indexable.
    const bypass = process.env.E2E_VERCEL_BYPASS;
    const stranger = await page
      .context()
      .browser()!
      .newContext(bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {});
    try {
      const visitor = await stranger.newPage();
      const response = await visitor.goto(link);
      expect(response?.headers()['x-robots-tag']).toContain('noindex');
      await expect(visitor.getByTestId('seller-synthesis')).toBeVisible();
      await check(await visitor.getByTestId('seller-synthesis').innerText(), 'Le lien public');
      // « Retirer le lien » : il ne s'ouvre plus, tout de suite.
      await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
      await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
      const after = await visitor.goto(link);
      expect(after?.status(), 'Un lien retiré s’ouvre encore').toBe(404);
    } finally {
      await stranger.close();
    }
    // Mission 111 — le dossier est conclu : la décision de prix ne se modifie plus.
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    await expect(page.getByTestId('decision-locked')).toHaveText(
      'Rendez-vous conclu : la décision de prix ne se modifie plus.',
    );
    await expect(page.getByRole('button', { name: 'Enregistrer la décision' })).toBeDisabled();
    // L'étape suivante part de la Prospection filtrée sur le bien, comme avant cette étape.
    await page.goto(`/prospection?bien=${projectId}`);
  });

  await test.step('Suivi et Prospection tiennent sur tablette (768 × 1024)', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    await expect(page.getByTestId('prospecting-card').first()).toBeVisible();
    expect(await overflow(), 'La page Prospection déborde sur tablette').toBeLessThanOrEqual(0);
    await page.goto('/suivi');
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await expect(row.getByText('1 remis')).toBeVisible();
    expect(await overflow(), 'Le Suivi déborde sur tablette').toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // Mission 98 — une opposition ne se retire pas depuis l'écran : le parcours retire la sienne
  // (et celles qu'un passage interrompu aurait laissées) pour ne pas en accumuler sur l'agence
  // de test. L'adresse redevient alors démarchable, à l'écran aussi.
  await test.step('Le passage retire sa ligne « Ne plus solliciter »', async () => {
    expect(
      removeTestOppositions(),
      'La ligne d’opposition de ce passage n’a pas été retrouvée',
    ).toBeGreaterThanOrEqual(3);
    expect(removeTestOppositions(), 'Il reste des oppositions du test').toBe(0);
    const after = readTestOppositions();
    console.log(`Oppositions en base APRÈS le nettoyage : ${after.length}`, after);
    expect(after).toEqual([]);
    await page.goto(`/prospection?bien=${projectId}`);
    await expect(
      page
        .getByTestId('prospecting-column-ready')
        .getByTestId('prospecting-card')
        .filter({ hasText: OPPOSED_ADDRESS }),
      'L’adresse retirée de la liste n’est pas redevenue « prête »',
    ).toBeVisible();
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
  { firstPass, tablet, dossierName }: { firstPass: boolean; tablet: boolean; dossierName: string },
): Promise<void> {
  const onScreen = async (screen: string) => {
    await expectFourchetteHidden(page, screen);
    // Mission 107 — le titre d'une annonce n'est jamais livré à l'écran du vendeur.
    await expectNoListingTitle(page, screen);
    if (tablet) await expectNoHorizontalScroll(page, screen);
  };
  const validate = () => page.getByRole('button', { name: /Valider et continuer/ }).click();
  const choose = (label: string) =>
    page
      .locator('label')
      .filter({ hasText: new RegExp(`^${label}$`) })
      .click();

  // Mission 87 — le compte de test se voit dans l'espace conseiller…
  await page.goto('/builder');
  await expect(
    page.getByTestId('test-account-banner'),
    'Le bandeau du compte de test manque dans l’espace conseiller',
  ).toHaveText('Compte de test automatique — ne préparez pas de vrai dossier ici');

  if (firstPass) {
    // Mission 112 — un vrai dossier jamais lancé : son adresse renvoie vers la confirmation, que le
    // serveur garde avant d'ouvrir la scène.
    await page.goto(`/live/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
    await page.getByTestId('launch-for-real').click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}$`));
  } else {
    await page.goto(`/live/${projectId}`);
  }

  // Introduction
  await expect(page.getByRole('button', { name: 'Démarrer la présentation' })).toBeVisible();
  await onScreen('Introduction');
  // … et jamais dans le Live, que voit le vendeur.
  await expect(
    page.getByTestId('test-account-banner'),
    'Le bandeau du compte de test s’affiche devant le vendeur',
  ).toHaveCount(0);
  await expect(page.getByText('Compte de test automatique')).toHaveCount(0);
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
    page.locator('[data-price-band]'),
    'Le marché est révélé dès la valeur perçue',
  ).toHaveCount(0);
  await expect(page.getByText('Prix des concurrents')).toHaveCount(0);
  if (firstPass) {
    for (const competitor of COMPETITORS) {
      await expectPriceHidden(page, competitor, 'Votre valeur perçue');
    }
  }
  const perceivedInput = page.locator('input[name="seller_perceived_property_price"]');
  const lockedAnswer = page.locator('[data-locked-answer]');
  if (firstPass) {
    await perceivedInput.fill(String(PERCEIVED_PRICE));
    await validate();
    // Mission 92 — le montant est redit en grand avant d'être enregistré : une seule
    // confirmation, dans l'écran.
    const confirm = page.getByRole('button', { name: /Confirmer et continuer/ });
    await expect(confirm, 'La valeur perçue s’enregistre sans confirmation').toBeVisible();
    expect(
      withoutSpaces(await mainText(page)),
      'Le montant à confirmer n’est pas redit à l’écran',
    ).toContain(`${PERCEIVED_PRICE}€?`);
    await onScreen('Votre valeur perçue · confirmation');
    await confirm.click();
  } else {
    // Mission 92 — déjà donnée : elle se relit, sans champ de saisie.
    await expect(perceivedInput, 'La valeur perçue se corrige encore après coup').toHaveCount(0);
    await expect(lockedAnswer).toContainText('Votre réponse');
    expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(PERCEIVED_PRICE));
    await validate();
  }

  // Mission 82 — sauter les concurrents au clavier ne laisse pas « Analyse des prix » vide :
  // l'écran nomme ce qui reste à passer, sans aucun prix, et « Y aller » y mène.
  if (firstPass) {
    await expect(
      page.getByText(`Concurrent 1 sur ${COMPETITORS.length} · Étape 1 sur 4`),
    ).toBeVisible();
    const analysis = page.getByRole('heading', { name: 'Analyse des prix', exact: true });
    for (let press = 0; press < 40 && !(await analysis.isVisible()); press += 1) {
      await page.keyboard.press('ArrowRight');
    }
    await expect(analysis).toBeVisible();
    await expect(page.getByText('Il reste à passer :')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Y aller' })).toHaveCount(COMPETITORS.length);
    for (const competitor of COMPETITORS) {
      await expectPriceHidden(page, competitor, 'Analyse des prix · il reste à passer');
    }
    await onScreen('Analyse des prix · il reste à passer');
    await page.getByRole('button', { name: 'Y aller' }).first().click();
  }

  for (const [index, competitor] of COMPETITORS.entries()) {
    const label = `Concurrent ${index + 1} sur ${COMPETITORS.length}`;
    const others = COMPETITORS.filter((other) => other !== competitor);

    // Mission 95 — rythme accéléré, à partir du 4e concurrent : deux écrans au lieu de quatre.
    if (index >= 3) {
      // Écran 1 : la fiche, le sérieux et la devinette — toujours sans aucun prix.
      await expect(
        page.getByRole('heading', { name: 'Un sérieux concurrent ? Et à quel prix, selon vous ?' }),
      ).toBeVisible();
      await expect(page.getByText(`${label} · Étape 1 sur 2`)).toBeVisible();
      await onScreen(`${label} · accéléré, écran 1`);
      if (firstPass) await expectPriceHidden(page, competitor, 'rythme accéléré, écran 1');
      await expectAlone(page, others, `${label} · accéléré, écran 1`);
      await choose('Oui, un concurrent sérieux');
      const quickGuess = page.locator('input[name="seller_estimated_listing_price"]');
      if (firstPass) {
        if (index === 3) {
          // Sur tablette, la devinette reste à l'écran à côté de la fiche, sans défilement.
          await page.setViewportSize({ width: 768, height: 1024 });
          await expect(quickGuess, 'La devinette sort de l’écran sur tablette').toBeInViewport({
            ratio: 1,
          });
          await expectNoHorizontalScroll(page, `${label} · accéléré, écran 1`);
          await page.setViewportSize({ width: 1280, height: 720 });
        }
        await quickGuess.fill(String(competitor.guess));
      } else {
        await expect(quickGuess, 'La devinette se corrige encore après coup').toHaveCount(0);
        expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(competitor.guess));
      }
      await validate();

      // Écran 2 : le prix révélé, puis la durée devinée et révélée à sa place.
      const revealHeading = page.getByRole('heading', { name: 'Voici son prix.' });
      await expect(revealHeading).toBeVisible();
      await expect(page.getByText(`${label} · Étape 2 sur 2`)).toBeVisible();
      expect(
        await mainText(page),
        `Le prix de ${competitor.title} n'est pas révélé après la devinette`,
      ).toContain(String(competitor.price));
      await expectAlone(page, others, `${label} · accéléré, écran 2`);
      if (firstPass && index === 3) {
        // Après la révélation, « Précédent » montre la devinette en lecture seule.
        await page.getByRole('button', { name: /Précédent/ }).click();
        await expect(quickGuess, 'Après la révélation, la devinette reste modifiable').toHaveCount(
          0,
        );
        expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(competitor.guess));
        await validate();
        await expect(revealHeading).toBeVisible();
      }
      const quickDays = page.locator('input[name="seller_estimated_days_on_market"]');
      const observed = page.getByText('Durée observée sur le marché');
      if (firstPass) {
        // La durée observée n'est pas à l'écran avant sa devinette.
        await expect(observed, 'La durée est montrée avant sa devinette').toHaveCount(0);
        await quickDays.fill('90');
        await page.getByRole('button', { name: /Révéler la durée/ }).click();
      }
      await expect(observed).toBeVisible();
      await expect(quickDays, 'La durée devinée se corrige encore après coup').toHaveCount(0);
      await onScreen(`${label} · accéléré, écran 2`);
      await validate();
      continue;
    }

    // 1. Un sérieux concurrent ? — sans prix.
    await expect(
      page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
    ).toBeVisible();
    await expect(page.getByText(`${label} · Étape 1 sur 4`)).toBeVisible();

    // Mission 89 — rendez-vous interrompu au 2e concurrent : « Quitter » demande confirmation
    // dans l'écran, ouvre l'écran de pause (mission 92), et « Reprendre » rouvre ici.
    if (firstPass && index === 1) {
      await page.getByRole('button', { name: 'Quitter', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Quitter le rendez-vous ?')).toBeVisible();
      await dialog.getByRole('button', { name: 'Rester' }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByText(`${label} · Étape 1 sur 4`)).toBeVisible();

      await page.getByRole('button', { name: 'Quitter', exact: true }).click();
      await expect(dialog.getByText('Vos réponses sont enregistrées.')).toBeVisible();
      await dialog.getByRole('button', { name: 'Quitter', exact: true }).click();
      // Mission 92 — un écran neutre, « Rendez-vous en pause » : ni la liste des autres
      // clients, ni le nom de celui-ci, ni aucun prix.
      await expect(page, 'Quitter ne mène pas à l’écran de pause').toHaveURL(
        new RegExp(`/live/${projectId}/pause$`),
      );
      await expect(page.getByRole('heading', { name: 'Rendez-vous en pause' })).toBeVisible();
      expect(
        await page.locator('body').innerText(),
        'L’écran de pause montre le nom d’un client',
      ).not.toContain(dossierName);
      await expect(page.locator('li')).toHaveCount(0);
      for (const other of COMPETITORS) {
        await expectPriceHidden(page, other, '« Rendez-vous en pause »');
      }
      await expect(page.getByRole('link', { name: 'Accès conseiller' })).toHaveAttribute(
        'href',
        '/live',
      );
      // L'appareil a gardé l'écran où il s'est arrêté : « Reprendre » y ramène.
      const resume = page.getByRole('link', { name: /Reprendre/ });
      await expect(resume).toHaveAttribute('href', /fiche=\d+$/);
      await resume.click();
      await expect(page).toHaveURL(new RegExp(`/live/${projectId}\\?fiche=\\d+$`));
      await expect(
        page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
        '« Reprendre » ne rouvre pas au 2e concurrent',
      ).toBeVisible();
      await expect(page.getByText(`${label} · Étape 1 sur 4`)).toBeVisible();
    }
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
    const guessInput = page.locator('input[name="seller_estimated_listing_price"]');
    if (firstPass) {
      await guessInput.fill(String(competitor.guess));
    } else {
      // Mission 92 — la devinette du premier passage ne se corrige plus.
      await expect(guessInput, 'La devinette se corrige encore après coup').toHaveCount(0);
      expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(competitor.guess));
    }
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
    // Mission 92 — après la révélation, « Précédent » montre la devinette en lecture seule :
    // voir le prix ne permet plus de la corriger.
    if (firstPass && index === 0) {
      await page.getByRole('button', { name: /Précédent/ }).click();
      await expect(
        page.getByRole('heading', { name: 'À quel prix pensez-vous que ce bien est proposé ?' }),
      ).toBeVisible();
      await expect(guessInput, 'Après la révélation, la devinette reste modifiable').toHaveCount(0);
      await expect(lockedAnswer).toContainText('Votre réponse');
      expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(competitor.guess));
      await onScreen(`${label} · devinette en lecture seule`);
      await validate();
      await expect(
        page.getByRole('heading', { name: 'Ce prix vous paraît-il cohérent ?' }).first(),
      ).toBeVisible();
    }
    await choose('Oui, ce prix paraît cohérent');
    await page.locator('textarea[name="seller_price_coherence_comment"]').fill(COMMENT);
    await validate();

    // 4. Pourquoi toujours en vente ? — durée devinée, puis révélée.
    await expect(
      page.getByRole('heading', { name: 'Pourquoi est-il toujours sur le marché ?' }),
    ).toBeVisible();
    await onScreen(`${label} · Pourquoi toujours en vente ?`);
    await expectAlone(page, others, `${label} · Pourquoi toujours en vente ?`);
    const daysInput = page.locator('input[name="seller_estimated_days_on_market"]');
    if (firstPass) {
      await daysInput.fill('90');
      await page.getByRole('button', { name: /Révéler la durée/ }).click();
    } else {
      // Mission 92 — la durée devinée ne se corrige plus : elle se relit, déjà révélée.
      await expect(daysInput, 'La durée devinée se corrige encore après coup').toHaveCount(0);
      expect(withoutSpaces(await lockedAnswer.innerText())).toContain('90jours');
    }
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
  // Mission 113 — « Revoir » ouvre la fiche d'un concurrent en plein écran, sans rien écrire ni
  // changer d'écran : « Fermer » rend l'écran du plus dangereux tel qu'il était.
  const dangerousUrl = page.url();
  await page.getByTestId('review-competitor').first().click();
  const review = page.getByTestId('competitor-review');
  await expect(review).toBeVisible();
  await expect(review.getByText(neutralLabel(COMPETITORS[0]))).toBeVisible();
  await expect(review.getByText('Face à votre bien, critère par critère')).toBeVisible();
  expect(withoutSpaces(await review.getByTestId('competitor-review-price').innerText())).toContain(
    String(COMPETITORS[0].price),
  );
  expect(await review.innerText(), 'La fiche « Revoir » montre un titre d’annonce').not.toContain(
    COMPETITORS[0].title,
  );
  await onScreen('Le concurrent le plus dangereux · Revoir');
  await review.getByRole('button', { name: 'Fermer' }).click();
  await expect(review).toHaveCount(0);
  expect(page.url(), '« Revoir » a changé l’écran du Live').toBe(dangerousUrl);
  await expect(
    page.getByRole('heading', { name: 'Quel concurrent vous paraît le plus dangereux ?' }),
  ).toBeVisible();
  await page
    .locator('label')
    .filter({ has: page.locator('input[name="seller_most_dangerous_comparable_id"]') })
    .filter({ hasText: neutralLabel(COMPETITORS[0]) })
    .click();
  await choose('Meilleure localisation');
  await page.locator('textarea[name="seller_most_dangerous_comment"]').fill(COMMENT);
  await validate();

  // Mission 94 — Acte 5 : après avoir vu les biens, le vendeur reformule lui-même son prix,
  // avant que l'analyse ne s'affiche. L'écran ne révèle rien du marché.
  await expect(
    page.getByRole('heading', {
      name: 'Après avoir vu ces biens, à quel prix mettriez-vous votre bien en vente ?',
    }),
  ).toBeVisible();
  await onScreen('Votre prix après le marché');
  await expect(page.locator('[data-price-band]')).toHaveCount(0);
  await expect(page.getByText('Prix des concurrents')).toHaveCount(0);
  const revisedInput = page.locator('input[name="seller_revised_property_price"]');
  if (firstPass) {
    await expect(page.getByRole('button', { name: 'Passer', exact: true })).toBeVisible();
    await revisedInput.fill(String(REVISED_PRICE));
    await validate();
    const confirmRevised = page.getByRole('button', { name: /Confirmer et continuer/ });
    await expect(confirmRevised, 'Le prix reformulé s’enregistre sans rappel').toBeVisible();
    expect(withoutSpaces(await mainText(page))).toContain(`${REVISED_PRICE}€?`);
    await confirmRevised.click();
  } else {
    // Déjà donné : il se relit, sans champ de saisie, et « Passer » n'a plus lieu d'être.
    await expect(revisedInput, 'Le prix reformulé se corrige encore après coup').toHaveCount(0);
    expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(REVISED_PRICE));
    await expect(page.getByRole('button', { name: 'Passer', exact: true })).toHaveCount(0);
    await validate();
  }

  // Analyse des prix
  await expect(page.getByRole('heading', { name: 'Analyse des prix', exact: true })).toBeVisible();
  // Le marché se révèle ici, face au prix donné en début de rendez-vous.
  // Mission 94 — le chemin du vendeur : son prix du début, puis celui d'après le marché.
  expect(
    withoutSpaces(await page.locator('[data-seller-path]').innerText()),
    '« Analyse des prix » ne montre pas le chemin 350 000 → 325 000',
  ).toBe(`Audébut:${PERCEIVED_PRICE}€→Aprèsavoirvulemarché:${REVISED_PRICE}€`);
  // Le « Prix des concurrents » dit sur quoi il porte ; plus de « observé sur le marché ».
  // Mission 104 — le nombre dit les concurrents qui entrent dans le calcul.
  await expect(page.getByText(`Calculé sur ${COMPETITORS.length} concurrents`)).toBeVisible();
  await expect(page.getByText(/observé sur le marché/)).toHaveCount(0);
  // La bande : un point par concurrent révélé, et les deux repères du vendeur.
  const band = page.locator('[data-price-band]');
  await expect(band.locator('[data-band-dot]')).toHaveCount(COMPETITORS.length);
  // Mission 104 — et le « Prix des concurrents », placé sur la bande comme les prix du vendeur.
  await expect(band.locator('[data-band-marker]')).toHaveCount(3);
  await expect(band.locator('[data-band-marker="competitors"]')).toHaveCount(1);
  const analysisText = withoutSpaces(await mainText(page));
  for (const bound of [
    Math.min(...COMPETITORS.map((c) => c.price)),
    Math.max(...COMPETITORS.map((c) => c.price)),
  ]) {
    expect(analysisText, 'Les prix affichés du marché manquent').toContain(String(bound));
  }
  if (tablet) await expectNoHorizontalScroll(page, 'Analyse des prix');
  await onScreen('Analyse des prix');
  await validate();

  // Conclusion — « Sur quel prix partons-nous ? », champ vide à l'ouverture.
  await expect(page.getByRole('heading', { name: 'Conclusion', exact: true })).toBeVisible();
  await onScreen('Conclusion');
  // Le concurrent choisi deux écrans plus tôt se lit ici, sans attendre un rechargement — et
  // il s'y lit encore après un rechargement, cette fois depuis la base.
  // Mission 107 — par son libellé neutre, jamais par le titre de l'annonce.
  const dangerousLine = page.getByText(
    new RegExp(`${neutralLabel(COMPETITORS[0]).source} — Meilleure localisation`),
  );
  await expect(
    dangerousLine,
    'Le concurrent le plus dangereux choisi n’apparaît pas sur « Conclusion »',
  ).toBeVisible();
  await expect(page.getByText('Non sélectionné')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Conclusion', exact: true })).toBeVisible();
  await expect(
    dangerousLine,
    'Après rechargement, le concurrent le plus dangereux n’apparaît plus sur « Conclusion »',
  ).toBeVisible();
  const commercialization = page.locator('input[name="commercialization_price"]');
  await expect(commercialization, 'Le prix de commercialisation est pré-rempli').toHaveValue('');
  await commercialization.fill(String(COMMERCIALIZATION_PRICE));
  // Mission 94 — le prix saisi est situé parmi les biens révélés : un repère, sans conseil.
  await expect(page.locator('[data-price-position]')).toContainText(
    `votre bien serait le plus cher des ${COMPETITORS.length + 1} biens comparés`,
  );
  await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
  await expect(page.getByText('Prix de commercialisation enregistré.')).toBeVisible();
  await validate();

  // Mission 85 — après le prix, le vendeur se situe de 1 à 10. Rien n'est pré-sélectionné ;
  // sous 10 l'écran demande ce qui manque, à 10 il propose de lancer la vente.
  await expect(
    page.getByRole('heading', {
      name: 'Sur une échelle de 1 à 10, où en êtes-vous pour lancer la vente à ce prix ?',
    }),
  ).toBeVisible();
  await onScreen('Prêt à lancer ?');
  const scale = page.getByRole('group', { name: 'Votre note, de 1 à 10' });
  await expect(scale.getByRole('button')).toHaveCount(10);
  const score = (value: number) => scale.getByRole('button', { name: String(value), exact: true });
  const missingQuestion = page.getByRole('heading', {
    name: 'Qu’est-ce qui vous manquerait pour être à 10 ?',
  });
  const launchQuestion = page.getByRole('heading', { name: 'Alors, on lance la vente ?' });
  if (firstPass) {
    await expect(
      scale.locator('button[aria-pressed="true"]'),
      'Une note est pré-sélectionnée',
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: /Terminer le rendez-vous/ }),
      'Sans note, le rendez-vous ne peut pas se terminer',
    ).toBeVisible();
    await score(7).click();
    await expect(missingQuestion).toBeVisible();
    await expect(launchQuestion).toHaveCount(0);
    await page.locator('textarea[name="seller_launch_readiness_missing"]').fill(MISSING_FOR_TEN);
    await score(10).click();
    // La note part en fond : on attend qu'elle soit en base avant de quitter l'écran.
    await expect(page.getByText('Note enregistrée')).toBeVisible();
  } else {
    // Au second passage, la note enregistrée au premier est reprise.
    await expect(score(10), 'La note enregistrée n’est pas reprise').toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await expect(launchQuestion).toBeVisible();
  await expect(missingQuestion).toHaveCount(0);
  if (tablet) await expectNoHorizontalScroll(page, 'Prêt à lancer ? (note donnée)');
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

// Mission 107 — ni le titre d'une annonce (« EXCLUSIVITÉ », une agence, une rue…) ni son adresse
// ne passent côté vendeur : un concurrent s'y nomme par son libellé neutre.
async function expectNoListingTitle(page: Page, screen: string) {
  const payload = await pagePayload(page);
  for (const competitor of COMPETITORS) {
    expect(
      payload,
      `Le titre « ${competitor.title} » est dans la page vendeur « ${screen} »`,
    ).not.toContain(competitor.title);
  }
}

// Le libellé neutre d'un concurrent saisi à la main : pièces · surface · commune (M51).
const neutralLabel = (competitor: Competitor): RegExp =>
  new RegExp(`3 pièces · ${competitor.surface}\\s?m² · Nice`);

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
