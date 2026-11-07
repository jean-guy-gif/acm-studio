import { expect, test, type Page } from '@playwright/test';

import {
  ageTestBuyer,
  expectNoHorizontalScroll,
  goViaAccountMenu,
  login,
  mainText,
  openAccountMenu,
  pagePayload,
  TEST_PRICE_DROP,
  ageTestFollowUp,
  readTestOppositions,
  removeTestOppositions,
  uniqueDossierName,
  withoutSpaces,
  ensureSellerMode,
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
// Mission 116 — l'analyse du conseiller ; 315 000 € est à +5 % : « Proche du marché », orange.
const ADVISOR_ANALYSIS = 300_000;
const PRICE_ALIGNMENT_LABEL = 'Proche du marché';
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

// Budget du parcours : 8 minutes, comme la démo (décision de Jean-Guy, 25/10 ; 6 minutes avant).
test.setTimeout(8 * 60_000);

test('parcours complet : Préparation → Live → Suivi', async ({ page }) => {
  const dossierName = uniqueDossierName();
  let projectId = '';

  await test.step('Connexion', async () => {
    await login(page);
    await ensureSellerMode(page);
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
    // Mission 116 — l'analyse du conseiller : la référence de la couleur du prix convenu.
    await page
      .locator('label')
      .filter({ hasText: 'Votre analyse de valeur' })
      .locator('input')
      .fill(String(ADVISOR_ANALYSIS));
    await page.getByRole('button', { name: 'Enregistrer la décision' }).click();
    await expect(page.getByText('Ce dossier est prêt')).toBeVisible();
    // Puis l'étape suivante dit quoi faire : lancer le Live.
    await page.goto(`/builder/${projectId}`);
    // Mission 143 (B4) — sur la Vue d'ensemble, la prochaine étape vit dans son bloc, un seul
    // bouton plein ; l'en-tête ne la répète pas.
    const nextStep = page.getByTestId('overview-next-step');
    await expect(nextStep).toContainText('Faire le Live avec');
    await expect(nextStep.getByText(/^Lancer le Live/).first()).toBeVisible();
    await expect(page.getByTestId('next-step')).toHaveCount(0);
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
    // Mission 130 — une carte : le vendeur, son bien, le chemin du prix avec ses libellés, ce qui
    // le retient ; à droite, sa prochaine étape et UN bouton.
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await expect(row, 'Le dossier conclu « à relancer » est absent du Suivi').toBeVisible();
    await expect(row.getByTestId('outcome-badge')).toHaveText('À relancer');
    const path = row.getByTestId('suivi-price-path');
    for (const label of ['Il voulait', 'Après le marché', 'Prix proposé']) {
      await expect(path.getByText(label, { exact: true })).toBeVisible();
    }
    const pathText = withoutSpaces(await path.innerText());
    for (const amount of [PERCEIVED_PRICE, REVISED_PRICE, COMMERCIALIZATION_PRICE]) {
      expect(pathText, `Le chemin du prix ne dit pas ${amount}`).toContain(String(amount));
    }
    await expect(row.getByText(/Ce qui le retient/)).toContainText(MISSING_FOR_TEN);
    // La relance proposée est dans un mois (il réfléchit au prix) : le bouton est en contour.
    const step = row.getByTestId('suivi-next-step');
    await expect(step).toContainText(/Prochaine étape · le \d{2}\/\d{2}/i);
    await expect(row.getByTestId('suivi-step-button')).toHaveText(`Relancer ${dossierName}`);
    // Plus aucun lien vers la préparation depuis la relance.
    await expect(step.locator('a[href^="/builder"]')).toHaveCount(0);

    // Rien n'a disparu : le détail s'ouvre dans la carte.
    await row.getByTestId('suivi-link-details').click();
    await expect(row.getByRole('link', { name: 'Ouvrir le dossier' })).toHaveAttribute(
      'href',
      `/builder/${projectId}`,
    );
    // Mission 110 — les objections cochées à la conclusion.
    await expect(row.getByTestId('objections-line')).toHaveText(
      'Ce qui le freine : le prix, le délai',
    );

    // Mission 82 — le chemin parcouru : prix du vendeur en début de rendez-vous, prix de
    // commercialisation, et l'écart entre les deux.
    const journey = row.getByText('Son prix pendant le rendez-vous').locator('..');
    await expect(journey.getByText('Il voulait (début du rendez-vous)')).toBeVisible();
    const journeyText = withoutSpaces(await journey.innerText());
    expect(journeyText, 'Le prix du vendeur en début de rendez-vous manque au Suivi').toContain(
      String(PERCEIVED_PRICE),
    );
    await expect(journey.getByText('Après avoir vu le marché')).toBeVisible();
    expect(journeyText, 'Le prix reformulé par le vendeur manque au Suivi').toContain(
      String(REVISED_PRICE),
    );
    expect(journeyText, 'Le prix de commercialisation manque au Suivi').toContain(
      String(COMMERCIALIZATION_PRICE),
    );
    expect(journeyText, 'L’écart début → commercialisation manque au Suivi').toContain(
      String(PERCEIVED_PRICE - COMMERCIALIZATION_PRICE),
    );

    // Mission 85 — la note donnée après le prix : la première, la dernière, et ce qui manquait,
    // dans « Ce que le vendeur a dit » (M96), une seule fois.
    const said = row.getByTestId('seller-said');
    await expect(said.getByText('Prêt à lancer : 7/10 → 10/10'), 'La note manque').toBeVisible();
    await expect(
      row.getByText(`Ce qui lui manquait pour être à 10 : « ${MISSING_FOR_TEN} »`),
      'Ce qui manquait pour être à 10 manque au Suivi, ou s’y dit deux fois',
    ).toHaveCount(1);
  });

  // Mission 96 — la relance : ce que le vendeur a dit, le motif, une relance consignée, et le
  // message proposé (jamais envoyé, jamais enregistré). Mission 130 — tout se fait dans la carte.
  await test.step('La relance sur place : motif, bloc, message, « J’ai relancé »', async () => {
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await expect(row.getByTestId('follow-up-motive')).toHaveText('Réfléchit au prix');

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
    // Mission 95 — la durée mesurée du Live, du premier écran au « Terminer », pause comprise.
    await expect(said.getByText(/Durée du Live : \d+\smin/)).toBeVisible();
    // Les prix viennent d'être révélés et figés : aucune comparaison « à aujourd'hui ».
    await expect(said.getByText(/face aux prix affichés aujourd’hui/)).toHaveCount(0);

    // Le filtre par motif, sous « À relancer », ne montre que ce motif, et le dossier y est.
    await page
      .getByTestId('suivi-filters')
      .getByRole('link', { name: /^À relancer · \d+$/ })
      .click();
    await expect(page).toHaveURL(/issue=follow_up/);
    await page
      .getByTestId('follow-up-motive-filter')
      .getByRole('link', { name: /Réfléchit au prix/ })
      .click();
    await expect(page).toHaveURL(/motif=thinking_price/);
    await expect(row).toBeVisible();
    for (const motive of await page.getByTestId('follow-up-motive').allInnerTexts()) {
      expect(motive, 'Le filtre par motif laisse passer un autre motif').toBe('Réfléchit au prix');
    }

    // « Relancer » ouvre la relance dans la carte : le message reprend le prix dit par le vendeur,
    // ne nomme aucun concurrent, se modifie.
    await row.getByTestId('suivi-step-button').click();
    const panel = row.getByTestId('follow-up-panel');
    await expect(panel).toBeVisible();
    const message = panel.getByTestId('follow-up-message');
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
    for (const name of ['Copier', 'E-mail']) {
      await expect(panel.getByRole(name === 'Copier' ? 'button' : 'link', { name })).toBeVisible();
    }

    // Mission 130 — sans téléphone ni e-mail dans le dossier, on les ajoute sur place : le
    // numéro devient un lien, et SMS s'ouvre à ce numéro.
    const contact = panel.getByTestId('seller-contact-form');
    await contact.getByLabel('Ajouter son téléphone').fill('06 12 34 56 78');
    await contact.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(panel.getByRole('link', { name: '06 12 34 56 78' })).toHaveAttribute(
      'href',
      'tel:0612345678',
    );
    await expect(panel.getByRole('link', { name: 'SMS' })).toHaveAttribute(
      'href',
      /^sms:0612345678/,
    );

    // « J'ai relancé », avec une note : la carte le dit, l'historique la montre, datée et signée.
    await panel.getByLabel('Note (facultative)').fill(FOLLOW_UP_NOTE);
    // Mission 105 — la date de prochaine relance est proposée selon le motif, et modifiable.
    await expect(panel.getByLabel('Prochaine relance le')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    await panel.getByRole('button', { name: 'J’ai relancé' }).click();
    await expect(row.getByTestId('follow-up-recorded')).toHaveText(
      /^Relancé aujourd’hui\. Prochaine relance le \d{2}\/\d{2}\.$/,
    );
    await expect(row.getByTestId('follow-up-panel')).toHaveCount(0);
    // Sans rechargement, la carte relue en base dit la relance et sa note (leçon du correctif 128).
    await expect(row.getByTestId('suivi-next-step')).toContainText(FOLLOW_UP_NOTE);
    const details = row.getByTestId('suivi-link-details');
    if ((await details.getAttribute('aria-expanded')) !== 'true') {
      await details.click();
    }
    const history = row.getByTestId('follow-up-history');
    await expect(history, 'L’historique des relances manque').toContainText(FOLLOW_UP_NOTE);
    await expect(history).toContainText(/Prochaine relance le \d{2}\/\d{2}/);
    await page.goto('/suivi');
  });

  // Mission 96 — huit jours plus tard, et un concurrent a baissé : le dossier du test est vieilli
  // en base (agence de test seulement), vérifié à l'écran, puis remis exactement comme il était.
  // Mission 130 — la relance due est dans « À faire aujourd'hui » et dans le compteur du menu.
  await test.step('Une relance due : « À faire aujourd’hui », compteur, baisse, « Copier »', async () => {
    const touched = { conclusions: 1, relances: 1, concurrents: 1 };
    expect(ageTestFollowUp(projectId, 'age'), 'Le dossier du test n’a pas été vieilli').toEqual(
      touched,
    );
    try {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto('/suivi');
      const task = page
        .getByTestId('suivi-today')
        .getByTestId('suivi-task')
        .filter({ hasText: `Relancer ${dossierName}` });
      await expect(task, 'La relance due manque dans « À faire aujourd’hui »').toBeVisible();
      await expect(task).toContainText(/dernier contact il y a 8 jours/);
      await expect(task).toContainText(/en retard/);
      await expect(
        page.getByTestId('suivi-task-count'),
        'Le compteur du menu « Suivi » manque',
      ).toHaveText(/^\d+$/);

      // Le bouton de la tâche ramène à la carte, la relance ouverte.
      await task.getByRole('link', { name: 'Relancer' }).click();
      const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
      await expect(row.getByTestId('suivi-next-step')).toContainText(/en retard/i);
      const panel = row.getByTestId('follow-up-panel');
      await expect(panel).toBeVisible();
      const message = panel.getByTestId('follow-up-message');
      const proposed = await message.inputValue();
      expect(proposed, 'Le message ne dit pas la baisse').toContain(
        'Depuis notre rendez-vous, un des biens que nous avions vus a baissé son prix.',
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
      await panel.getByRole('button', { name: 'Copier' }).click();
      await expect(panel.getByText('Message copié.')).toBeVisible();
      expect(
        await page.evaluate(() => navigator.clipboard.readText()),
        'Le presse-papiers ne porte pas le message modifié',
      ).toBe(edited);
      await panel.getByRole('button', { name: 'Annuler' }).click();
      await expect(panel).toHaveCount(0);
      // Un second clic sur la tâche rouvre la relance.
      await task.getByRole('link', { name: 'Relancer' }).click();
      await expect(row.getByTestId('follow-up-panel')).toBeVisible();
      await row.getByTestId('follow-up-panel').getByRole('button', { name: 'Annuler' }).click();

      await row.getByTestId('suivi-link-details').click();
      await expect(
        row.getByTestId('seller-said').getByText('1 concurrent a baissé son prix'),
        'La baisse de prix depuis le rendez-vous manque au bloc',
      ).toBeVisible();
    } finally {
      expect(ageTestFollowUp(projectId, 'back'), 'Le dossier du test n’a pas été remis').toEqual(
        touched,
      );
    }

    // Remis en état : la relance n'est plus due, plus de baisse.
    await page.goto('/suivi');
    await expect(
      page.getByTestId('suivi-task').filter({ hasText: `Relancer ${dossierName}` }),
    ).toHaveCount(0);
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await row.getByTestId('suivi-link-details').click();
    await expect(row.getByTestId('seller-said')).toBeVisible();
    await expect(row.getByTestId('seller-said').getByText(/baissé/)).toHaveCount(0);
    await page.goto('/suivi');
  });

  // Mission 86 — Suivi → « Prospecter » → page Prospection filtrée sur le bien → « Marquer
  // remis » → la carte passe dans « Dossier remis ».
  await test.step('Le mandat se signe depuis la ligne du Suivi', async () => {
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    await row.getByTestId('suivi-link-issue').click();
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
      row.getByTestId('outcome-badge'),
      'Le type de mandat manque sur la carte',
    ).toHaveText('Mandat signé · exclusif');
    // Mission 130 — la frise du mandat, et sa prochaine étape : le Point marché, dans un mois.
    await expect(row.getByTestId('suivi-frieze')).toContainText('Mandat signé ✓');
    await expect(row.getByTestId('suivi-next-step')).not.toContainText(/Relancer/);
    await expect(
      row
        .getByRole('link', { name: 'Prospection' })
        .or(row.getByRole('link', { name: 'Prospecter' }))
        .first(),
      'Un mandat signé ne mène pas à la prospection de ses concurrents',
    ).toBeVisible();
  });

  // Mission 117 — la fiche acquéreur : créée, retrouvée dans la liste, « Rapprocher » pré-remplit
  // le rapprochement (Mission 130 : en mode Acquéreur ; il trouve le mandat signé de ce passage),
  // statut, archivage.
  await test.step('La fiche acquéreur : créer, retrouver, rapprocher, statut, archiver', async () => {
    const buyerName = `Acquéreur ${dossierName}`;
    // Mission 118 — l'interrupteur Vendeur | Acquéreur : le menu change, le mode est retenu après
    // un rechargement, et une page de l'autre mode ouverte par son adresse place l'interrupteur.
    const switcher = page.getByTestId('workspace-switch');
    const modeWord = page.getByTestId('workspace-mode-word');
    await expect(switcher).toHaveAttribute('data-mode', 'seller');
    await expect(modeWord).toHaveText('Mode Vendeur');
    await expect(page.getByRole('link', { name: /^Préparation/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Acquéreurs/ })).toHaveCount(0);
    await switcher.getByRole('button', { name: 'Acquéreur' }).click();
    await expect(page).toHaveURL(/\/acquereurs$/);
    await expect(switcher).toHaveAttribute('data-mode', 'buyer');
    await expect(modeWord).toHaveText('Mode Acquéreur');
    // Mission 130 B — « Biens idéaux » a quitté le menu.
    for (const label of ['Acquéreurs', 'Visites', 'Prospection']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    // Mission 125 — le menu de gauche n'a que les quatre espaces du mode ; le reste est derrière la
    // carte du conseiller, qui se ferme par Échap et par un clic dehors.
    const sideNav = page.locator('nav[data-mode]');
    await expect(sideNav.locator('a')).toHaveCount(3);
    await expect(
      sideNav.getByRole('link', { name: /^(Administration|Aide|Mon profil)/ }),
    ).toHaveCount(0);
    const accountMenu = await openAccountMenu(page);
    for (const label of ['Mon profil', 'Administration', 'Aide', 'Sombre', 'Déconnexion']) {
      await expect(
        accountMenu.getByRole('menuitem', { name: new RegExp(`^${label}`) }),
      ).toBeVisible();
    }
    await expect(accountMenu.getByRole('menuitem').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(accountMenu.getByRole('menuitem', { name: /^Administration/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(accountMenu).toHaveCount(0);
    await expect(page.getByTestId('account-card')).toBeFocused();
    await openAccountMenu(page);
    await page.getByRole('heading').first().click();
    await expect(accountMenu).toHaveCount(0);
    for (const label of ['Préparation', 'Live', 'Suivi']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}`) })).toHaveCount(0);
    }
    // Mémorisé : une page commune relit le mode enregistré.
    await page.goto('/prospection');
    await expect(switcher).toHaveAttribute('data-mode', 'buyer');
    // Une page du mode Vendeur ouverte par son adresse : l'interrupteur se place sur Vendeur, le
    // menu Vendeur s'affiche, le mode mémorisé ne change pas.
    await page.goto('/suivi');
    await expect(switcher).toHaveAttribute('data-mode', 'seller');
    await expect(page.getByRole('link', { name: /^Live/ })).toBeVisible();
    // Administration, par la carte : l'adresse ne change pas, aucun des quatre espaces n'est surligné.
    await goViaAccountMenu(page, 'Administration');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(switcher).toHaveAttribute('data-mode', 'buyer');
    await expect(sideNav.locator('[aria-current="page"]')).toHaveCount(0);
    // Mission 130 B — l'ancienne adresse « Biens idéaux » ramène aux acquéreurs.
    await page.goto('/biens-ideaux');
    await expect(page).toHaveURL(/\/acquereurs$/);
    // Mission 132 — « La fiche en 30 secondes » : la saisie rapide, au pouce, sur téléphone
    // (390 × 844), chronométrée du clic sur « Nouvel acquéreur » à la fiche affichée.
    await page.setViewportSize({ width: 390, height: 844 });
    const startedAt = Date.now();
    await page.getByRole('link', { name: 'Nouvel acquéreur' }).click();
    await expect(page).toHaveURL(/\/acquereurs\/nouveau$/);
    const quick = page.getByTestId('buyer-quick-form');
    await expectNoHorizontalScroll(page, 'Saisie rapide (390 × 844)');
    // Sous 768 px, le menu est une barre compacte : le champ Nom se voit sans défiler.
    await expect(page.getByTestId('mobile-menu-toggle')).toBeVisible();
    await expect(page.locator('nav[data-mode]')).toBeHidden();
    await expect(quick.locator('input[name="name"]')).toBeInViewport({ ratio: 1 });
    await quick.locator('input[name="name"]').fill(buyerName);
    await quick.locator('input[name="phone"]').fill('06 39 98 90 11');
    await quick.getByRole('button', { name: 'Appartement', exact: true }).click();
    // Nice, la commune du bien de ce passage ; une deuxième commune, dédoublonnée par sa clé.
    await quick.getByLabel('Autre commune').fill('Nice, nice, Cagnes-sur-Mer');
    await quick.getByRole('button', { name: 'Autre', exact: true }).click();
    await quick
      .getByLabel('Budget maximum, en euros')
      .fill(String(COMMERCIALIZATION_PRICE - 5_000));
    await quick.getByRole('button', { name: '★ Extérieur' }).click();
    await quick.getByRole('button', { name: '★ Budget' }).click();
    // Deux ★ au plus : la troisième ne se touche plus.
    await expect(quick.getByRole('button', { name: '★ Piscine' })).toBeDisabled();
    await quick.getByRole('button', { name: 'Enregistrer la fiche' }).click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}\?enregistre=1&rapide=1$/);
    await expect(page.getByTestId('buyer-name')).toHaveText(buyerName);
    const elapsed = (Date.now() - startedAt) / 1000;
    console.log(`Saisie rapide : ${Math.round(elapsed * 10) / 10} s`);
    expect(elapsed, 'La fiche rapide a pris plus de 30 secondes').toBeLessThan(30);
    // Ce que la saisie rapporte, tout de suite : les biens de l'agence qui correspondent.
    await expect(page.getByTestId('buyer-quick-matches')).toHaveText(
      /^[1-9]\d* biens? de l’agence correspond(ent)?$/,
    );
    await page.setViewportSize({ width: 1280, height: 720 });
    const buyerUrl = page.url().replace(/\?.*$/, '');
    const buyerId = buyerUrl.split('/').pop() as string;
    await expect(page.getByTestId('buyer-status-badge')).toHaveText('En recherche');
    // Pas encore prêt : son financement n'est pas posé. Validé : « Prêt à visiter ».
    await expect(page.getByTestId('buyer-ready')).toHaveCount(0);
    await page.getByTestId('buyer-financing').getByRole('button', { name: 'Validé' }).click();
    await expect(page.getByTestId('buyer-ready')).toHaveText('Prêt à visiter');
    // 40 jours sans échange (vieilli en base, M96) : « À recontacter », et la tâche du Suivi.
    expect(ageTestBuyer(buyerId), 'La fiche du test n’a pas été vieillie').toBe(1);
    await page.reload();
    await expect(page.getByTestId('buyer-recontact')).toHaveText('À recontacter');
    await page.goto('/suivi');
    await expect(page.getByTestId('suivi-today')).toContainText(
      `Reprendre contact avec ${buyerName}`,
    );
    // Sur téléphone, la première tâche du jour se voit sans défiler ; ☰ déplie le menu et la
    // carte du conseiller, un lien choisi le replie.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('suivi-task').first()).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalScroll(page, 'Suivi (390 × 844)');
    await page.getByTestId('mobile-menu-toggle').click();
    await expect(page.getByTestId('account-card')).toBeVisible();
    await page.locator('nav[data-mode]').getByRole('link', { name: /^Live/ }).click();
    await expect(page).toHaveURL(/\/live$/);
    await expect(page.locator('nav[data-mode]')).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 720 });
    // « J'ai eu l'acquéreur aujourd'hui » : il redevient prêt, la tâche s'en va.
    await page.goto(buyerUrl);
    await page.getByTestId('buyer-contacted').click();
    await expect(page.getByTestId('buyer-contacted')).toHaveText('Contact noté aujourd’hui ✓');
    await expect(page.getByTestId('buyer-ready')).toHaveText('Prêt à visiter');
    await page.goto('/suivi');
    await expect(page.getByTestId('suivi-today')).not.toContainText(
      `Reprendre contact avec ${buyerName}`,
    );
    await page.goto(buyerUrl);

    // « Compléter sa recherche » : le formulaire complet, où se règle le reste.
    const field = (label: string) =>
      page
        .locator('label')
        .filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) })
        .locator('input, select, textarea');
    const searchDetails = page.getByTestId('buyer-form-details');
    await expect(searchDetails).not.toHaveAttribute('open', '');
    await searchDetails.getByText('Modifier sa recherche').click();
    await expect(searchDetails).toHaveAttribute('open', '');
    // Les communes dédoublonnées, la fiche relue ; la ★ a mis l'extérieur à « oui ».
    await expect(field('Communes')).toHaveValue('Nice, Cagnes-sur-Mer');
    const typeBox = page.locator('input[name="property_types"][value="apartment"]');
    await expect(typeBox).toBeChecked();
    await expect(page.locator('input[name="must_have"][value="outdoor"]')).toBeChecked();
    await expect(field('Extérieur')).toHaveValue('yes');
    await field('Pièces \\(minimum\\)').fill('3');
    await field('Chambres \\(minimum\\)').fill('4');
    await field('Surface \\(m², minimum\\)').fill('60');
    await field('Budget idéal \\(€\\)').fill('300 000');
    // Plus de chambres que de pièces : refusé, sur le champ, rien n'est enregistré.
    await searchDetails.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByTestId('buyer-error-bedrooms_min')).toHaveText(
      'Pas plus de chambres que de pièces.',
    );
    // Mission 119 — les pièces restent libres : les concurrents de ce passage, sans nombre de
    // pièces connu, correspondent alors au rapprochement (M86) et à la sélection.
    await field('Pièces \\(minimum\\)').fill('');
    await field('Chambres \\(minimum\\)').fill('2');
    await searchDetails.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(searchDetails.getByText('Fiche enregistrée.')).toBeVisible();
    // Le financement n'est pas touché par le formulaire.
    await page.reload();
    await expect(page.getByTestId('buyer-ready')).toHaveText('Prêt à visiter');

    // La liste : la fiche, « Ma fiche », type, communes, budget, pièces ; la recherche par nom.
    await page.goto('/acquereurs');
    const row = page.getByTestId('buyer-row').filter({ hasText: buyerName });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Ma fiche');
    await expect(row).toContainText('Appartement · Nice · Cagnes-sur-Mer');
    await expect(row).not.toContainText('pièces ou plus');
    await page.getByLabel('Rechercher un acquéreur par nom').fill(dossierName.slice(-6));
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByTestId('buyer-row').filter({ hasText: buyerName })).toBeVisible();

    // « Rapprocher » : le rapprochement, pré-rempli, trouve le mandat signé d'Antibes…
    // ici celui de ce passage, à Nice (3 pièces, 65 m², 315 000 € convenus : sous le plafond + 5 %).
    await page.goto(buyerUrl);
    // Mission 130 B — « Rapprocher » est un bloc de la fiche : « Voir les correspondances · n ».
    await expect(page.getByTestId('buyer-matching')).toContainText(
      /Voir les correspondances · [1-9]/,
    );
    await page.getByRole('link', { name: /^Voir les correspondances/ }).click();
    await expect(page).toHaveURL(
      new RegExp(`/acquereurs/rapprochement\\?acquereur=${buyerUrl.split('/').pop()}`),
    );
    const panel = page.getByTestId('buyer-search');
    await expect(panel.getByRole('heading', { name: 'Rapprochement acquéreur' })).toBeVisible();
    await expect(panel).toContainText(buyerName);
    await expect(panel.locator('input[name="city"]')).toHaveValue('Nice, Cagnes-sur-Mer');
    await expect(panel.locator('input[name="roomsCount"]')).toHaveValue('');
    await expect(panel.locator('input[name="surfaceArea"]')).toHaveValue('60');
    await expect(panel.locator('input[name="budgetMax"]')).toHaveValue(
      String(COMMERCIALIZATION_PRICE - 5_000),
    );
    await expect(panel.locator('input[name="propertyType"]')).toHaveValue('Appartement');
    // Joué d'avance : le mandat signé de ce passage correspond.
    await expect(panel.getByText(/correspond(ent)? à cet acquéreur/)).toBeVisible();
    await expect(panel.getByText(dossierName).first()).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Enregistrer cette recherche' })).toHaveCount(0);
    await expect(page.getByText(/acheteur/i)).toHaveCount(0);

    // Sans fiche, le rapprochement propose d'enregistrer la recherche : vers une fiche pré-remplie.
    // Mission 130 — un ancien lien du Suivi y mène encore.
    await page.goto('/suivi?acquereur=inconnu');
    await expect(page).toHaveURL(/\/acquereurs\/rapprochement/);
    await page.goto('/acquereurs/rapprochement');
    const fresh = page.getByTestId('buyer-search');
    await fresh.locator('input[name="city"]').fill('Nice');
    await fresh.locator('input[name="roomsCount"]').fill('3');
    await fresh.getByRole('button', { name: 'Rapprocher' }).click();
    const save = fresh.getByRole('link', { name: 'Enregistrer cette recherche' });
    await expect(save).toHaveAttribute('href', /\/acquereurs\/nouveau\?.*communes=Nice/);
    await save.click();
    await expect(field('Communes')).toHaveValue('Nice');
    await expect(field('Pièces \\(minimum\\)')).toHaveValue('3');

    // Mission 118 (partie B) — « Trouver les biens idéaux » : l'agence d'abord (le mandat signé de
    // ce passage), puis le marché, payant : l'avertissement du coût s'affiche, la recherche n'est
    // PAS lancée (aucun appel payant dans les tests, M99 ; l'agence de test n'est pas de démo) ;
    // un bien retenu, retrouvé sur la fiche.
    await page.goto(buyerUrl);
    // Mission 130 B — la fiche : ses quatre étapes, UNE prochaine étape, ce qui s'est passé.
    // Mission 143 (B1) — cinq étapes : Sélection → Présentée → Visite → Offre → Compromis.
    await expect(page.getByTestId('buyer-step')).toHaveCount(5);
    // Mission 145 (partie A, I2) — prêt à visiter, il correspond au mandat signé de ce passage :
    // sa prochaine étape est de le lui proposer ; « Trouver d'autres biens » mène aux biens idéaux.
    await expect(page.getByTestId('buyer-next-step')).toContainText(
      `Lui proposer l’appartement de ${dossierName}`,
    );
    await expect(page.getByTestId('buyer-next-button')).toHaveAttribute(
      'href',
      /\/acquereurs\/proposer\?bien=project%3A/,
    );
    await expect(page.getByTestId('buyer-timeline')).toContainText('Fiche créée');
    await page.getByTestId('buyer-next-secondary').click();
    await expect(page).toHaveURL(new RegExp(`${buyerUrl}/biens-ideaux$`));
    await expect(page.getByTestId('ideal-title')).toContainText(buyerName);
    const agencyHits = page.getByTestId('ideal-agency-hit');
    // Le mandat de ce passage ; ses concurrents saisis à la main n'ont pas de type de bien, le
    // rapprochement les met à part (M54) : un seul bien se retient ici, la démo en retient trois.
    const mandateHit = agencyHits.filter({ hasText: 'Mes mandats' });
    await expect(mandateHit).toHaveCount(1);
    await expect(page.getByText(/disponible/i)).toHaveCount(0);
    await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
    const paid = page.getByTestId('ideal-paid-confirm');
    await expect(paid).toContainText('Recherche payante sur le marché : jusqu’à 0,60 €');
    await paid.getByRole('button', { name: 'Annuler' }).click();
    await expect(paid).toHaveCount(0);
    await expect(page.getByTestId('ideal-market-summary')).toHaveCount(0);
    await expect(page.getByTestId('ideal-retain')).toBeDisabled();
    // Coché, le mandat monte aussitôt dans le bandeau « Sélection actuelle », « À retenir ».
    await mandateHit.getByRole('checkbox').click();
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(1);
    await expect(page.getByTestId('ideal-current-item').first()).toContainText('À retenir');
    await expect(page.getByTestId('ideal-retain')).toHaveText('Retenir la sélection (1/3)');
    await page.getByTestId('ideal-retain').click();
    await expect(page.getByTestId('ideal-saved')).toContainText('Sélection retenue : 1 bien.');
    // Essai de Jean-Guy (26/10) : sans rechargement, la sélection n'apparaît qu'une fois, dans le
    // bandeau « Sélection actuelle : A » ; le mandat ne se répète plus dans « Ce que l'agence a
    // déjà » ; aucun texte interne à l'écran.
    await expect(page.getByTestId('ideal-current')).toContainText('Sélection actuelle : A');
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(1);
    await expect(page.getByTestId('ideal-current-item').first()).toContainText('Dans l’agence');
    await expect(
      page.getByTestId('ideal-current-item').first().getByRole('checkbox'),
    ).toBeChecked();
    await expect(mandateHit).toHaveCount(0);
    await expect(page.getByTestId('ideal-retain')).toBeDisabled();
    await expect(page.getByText(/\bM\d{2,3}\b|règles? du rapprochement/)).toHaveCount(0);
    await page.goto(buyerUrl);
    await expect(page.getByTestId('ideal-selection')).toContainText(
      'Appartement · 3 pièces · 65 m²',
    );

    // Mission 130 B — la prochaine étape devient « Lui présenter sa sélection ».
    await expect(page.getByTestId('buyer-next-step')).toContainText('Lui présenter sa sélection');
    await expect(page.getByTestId('buyer-next-secondary')).toHaveText('Envoyer le lien à la place');
    // Mission 122 — « Avant de présenter » (Mission 130 B : en tête de la présentation, pour le
    // conseiller seul) : ses mots et la phrase « Pourquoi » se relisent et se modifient ; puis la
    // présentation, tout part de sa recherche : ses mots, la grille, un bien par écran décrit par ses
    // critères, sa réponse ; « Terminer » fige ; la fiche montre ses réponses.
    await page.getByTestId('buyer-next-button').click();
    await expect(page).toHaveURL(new RegExp(`/presentation/${buyerUrl.split('/').pop()}$`));
    await expect(page.getByTestId('deck-prelude')).toBeVisible();
    const prepare = page.getByTestId('deck-prepare');
    await expect(prepare).toBeVisible();
    const words = prepare.getByTestId('deck-words-editor');
    await words
      .locator('textarea')
      .fill('Un 3 pièces à Nice ou Cagnes, avec un extérieur, au calme.');
    await words.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(words.getByText('Enregistré.')).toBeVisible();
    const pitch = prepare.getByTestId('deck-pitch-editor').first();
    await pitch.locator('input').fill('Il coche vos critères, avec la terrasse que vous vouliez.');
    await pitch.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(pitch.getByText('Enregistré.')).toBeVisible();

    await page.getByTestId('deck-start').click();
    const scene = page.getByTestId('buyer-presentation');
    await expect(scene).toHaveAttribute('data-screen', 'words');
    await expect(page.getByTestId('deck-words')).toContainText(
      'Un 3 pièces à Nice ou Cagnes, avec un extérieur, au calme.',
    );
    await expectNoListingTitle(page, 'Présentation — ses mots');
    await page.getByTestId('presentation-next').click();
    await expect(scene).toHaveAttribute('data-screen', 'grid');
    const rows = await page.getByTestId('deck-grid-row').count();
    expect(rows, 'la grille a une ligne par critère de la fiche').toBeGreaterThan(0);
    await expect(page.getByTestId('deck-grid-cell')).toHaveCount(rows);
    // L'étoile des indispensables, dessinée (essai de Jean-Guy, 25/10), dans la grille et la légende.
    await expect(
      page
        .locator('[data-testid="deck-grid-row"][data-must="true"]')
        .first()
        .getByTestId('must-star'),
    ).toBeVisible();
    await expect(page.getByTestId('grid-legend').getByTestId('must-star')).toBeVisible();
    await page.getByTestId('presentation-next').click();
    await expect(scene).toHaveAttribute('data-screen', 'item');
    await expect(page.getByTestId('deck-item-count')).toHaveText(/^\d+ critères? sur \d+$/);
    await expect(page.getByTestId('deck-pitch')).toContainText(
      'Il coche vos critères, avec la terrasse que vous vouliez.',
    );
    await expect(page.getByText(/disponible|estimation/i)).toHaveCount(0);
    await expectNoListingTitle(page, 'Présentation — bien A');
    await expectFourchetteHidden(page, 'Présentation — bien A');
    const answer = (value: string) =>
      page.locator(`[data-testid="deck-answer"][data-answer="${value}"]`);
    await answer('visit').click();
    await expect(answer('visit')).toHaveAttribute('aria-pressed', 'true');
    // Il change d'avis, puis revient : la dernière réponse touchée vaut.
    await answer('maybe').click();
    await expect(answer('maybe')).toHaveAttribute('aria-pressed', 'true');
    await answer('visit').click();
    await expect(answer('visit')).toHaveAttribute('aria-pressed', 'true');
    // Répondre n'avance pas ; sur le dernier bien, « Suivant » ne mène nulle part : « Sa réponse »
    // s'atteint par son propre bouton (essai de Jean-Guy, 25/10).
    await expect(scene).toHaveAttribute('data-screen', 'item');
    await expect(page.getByTestId('presentation-next')).toBeDisabled();
    await page.getByTestId('deck-go-answer').click();
    await expect(scene).toHaveAttribute('data-screen', 'answer');
    await expect(page.getByTestId('deck-response')).toContainText('Vous voulez visiter le bien A.');
    await page.getByTestId('deck-availability').filter({ hasText: 'Samedi matin' }).click();
    await expect(page.getByTestId('deck-next')).toContainText(
      'je vous confirme les visites sous 24 h',
    );
    // Tablette : la scène ne déborde pas.
    await page.setViewportSize({ width: 768, height: 1024 });
    await expectNoHorizontalScroll(page, 'Présentation — sa réponse (768 × 1024)');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByTestId('presentation-finish').click();
    await expect(page).toHaveURL(new RegExp(`${buyerUrl}$`));
    await expect(page.getByTestId('present-selection')).toHaveText('Revoir la présentation');
    await expect(page.getByTestId('deck-prepare')).toHaveCount(0);
    await expect(page.locator('[data-testid="buyer-step"][data-step="present"]')).toHaveAttribute(
      'data-status',
      'done',
    );
    await expect(page.getByTestId('buyer-timeline')).toContainText('Sélection présentée');
    await expect(page.getByTestId('buyer-timeline')).toContainText('Visite demandée');
    await expect(page.getByTestId('buyer-answers')).toContainText('Veut le visiter');
    // Relue en lecture seule : « Terminé le », plus de réponse possible.
    await page.getByTestId('present-selection').click();
    await expect(page.getByText(/^Terminé le \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
    await expect(page.getByTestId('presentation-finished')).toContainText(
      /^Présentation terminée le \d{2}\/\d{2}\/\d{4} : pour en refaire une, retenez une nouvelle sélection\.$/,
    );
    await expect(
      page
        .getByTestId('presentation-finished')
        .getByRole('link', { name: 'retenez une nouvelle sélection' }),
    ).toHaveAttribute('href', new RegExp(`/acquereurs/${buyerUrl.split('/').pop()}/biens-ideaux$`));
    await page.getByTestId('presentation-next').click();
    await page.getByTestId('presentation-next').click();
    await expect(answer('visit')).toBeDisabled();
    await expect(answer('visit')).toHaveAttribute('aria-pressed', 'true');
    // Visites : la demande à planifier, puis « Visite faite » avec un retour et une issue.
    await page.goto('/visites');
    const visitLine = page
      .getByTestId('visit-line')
      .filter({ hasText: buyerName.slice(-12) })
      .or(page.getByTestId('visits-pending').getByTestId('visit-line'));
    await expect(page.getByTestId('visits-pending')).toContainText(buyerName);
    await expect(page.getByTestId('visits-pending')).toContainText('pendant la présentation');
    await expect(page.getByTestId('visit-availability').first()).toContainText('Samedi matin');
    // Un bien de l'agence : pas de « Propriétaire ou confrère à contacter » (réservé aux
    // concurrents et aux exclusivités).
    await expect(page.getByTestId('visits-pending')).not.toContainText('confrère à contacter');
    // Mission 120 — un mandat signé de l'agence : « Proposer une visite » (M86), aucun courrier.
    await expect(
      page.getByTestId('visits-pending').getByTestId('visit-seller-action').first(),
    ).toHaveText('Proposer une visite');
    await expect(page.getByTestId('visit-prepare-owner-letter')).toHaveCount(0);
    await visitLine.first().getByRole('button', { name: 'Visite faite' }).click();
    // Mission 139 — le compte rendu en boutons ; « Pas pour moi » n'offre pas « Offre envisagée ».
    const doneForm = page.getByTestId('visit-done-form');
    await doneForm.getByTestId('visit-opinion-not_for_me').click();
    await expect(doneForm.getByTestId('visit-next-offer')).toHaveCount(0);
    await doneForm.getByTestId('visit-disliked-light').click();
    await doneForm.getByTestId('visit-note').fill('Trop sombre, d’après le test automatique');
    await doneForm.getByTestId('visit-next-keep_searching').click();
    await doneForm.getByTestId('visit-done-save').click();
    await expect(page).toHaveURL(/\/visites\?messages=[0-9a-f-]{36}/);
    await expect(page.getByTestId('visit-message-buyer-text')).toHaveValue(
      /Ce qui vous a gêné : la luminosité\./,
    );
    await expect(page.getByTestId('visits-done')).toContainText(
      'Trop sombre, d’après le test automatique',
    );
    await expect(page.getByTestId('visits-done')).toContainText('Pas pour lui');
    await expect(page.getByTestId('visits-pending')).toHaveCount(0);

    // Mission 122 (partie B) — le dossier : le PDF (couverture, grille, un bien par page, « Mes
    // choix ») ; la présentation terminée, son lien est « Ce que nous avons vu ensemble », en lecture
    // seule (décision de Jean-Guy, 25/10) ; le lien retiré ne s'ouvre plus.
    await page.goto(buyerUrl);
    await page.getByTestId('buyer-dossier').click();
    await expect(page).toHaveURL(new RegExp(`${buyerUrl}/dossier$`));
    const dossier = page.getByTestId('buyer-dossier');
    await expect(dossier).toBeVisible();
    await expect(dossier.getByTestId('dossier-cover')).toContainText('Votre sélection du');
    await expect(dossier.getByTestId('dossier-grid')).toBeVisible();
    await expect(dossier.getByTestId('dossier-item')).toHaveCount(1);
    await expect(dossier.getByTestId('dossier-choices')).toContainText('Mes choix');
    await expect(dossier.getByTestId('dossier-choice-row')).toHaveCount(1);
    await expect(dossier.getByTestId('dossier-choice-box')).toHaveCount(3 + 5);
    const dossierCheck = async (text: string, where: string) => {
      for (const competitor of COMPETITORS) {
        expect(text, `${where} : le titre « ${competitor.title} »`).not.toContain(competitor.title);
      }
      expect(text, `${where} : un mot interdit`).not.toMatch(
        /Vendu par|Exclusivité|[Ee]stimation|disponible/,
      );
      expect(text, `${where} : la fourchette`).not.toContain(String(FOURCHETTE.min));
    };
    await dossierCheck(await dossier.innerText(), 'Le dossier acquéreur');
    const dossierBypass = process.env.E2E_VERCEL_BYPASS;
    const stranger = await page
      .context()
      .browser()!
      .newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        ...(dossierBypass
          ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': dossierBypass } }
          : {}),
      });
    try {
      const visitor = await stranger.newPage();
      // La sélection présentée : « Ce que nous avons vu ensemble », sans formulaire.
      await page.getByRole('button', { name: /Créer un lien pour l’acquéreur/ }).click();
      const presentedLink = (await page.getByTestId('dossier-link').innerText()).trim();
      expect(presentedLink).toMatch(/\/dossier\/[A-Za-z0-9_-]{43}$/);
      const first = await visitor.goto(presentedLink);
      expect(first?.headers()['x-robots-tag']).toContain('noindex');
      const seen = visitor.getByTestId('dossier-seen-together');
      await expect(seen).toContainText('Ce que nous avons vu ensemble');
      await expect(seen).toContainText('Je veux le visiter');
      // Ses créneaux du rendez-vous, rangés à « Terminer » : la visite faite ne les efface pas.
      await expect(seen.getByTestId('dossier-recap-availability')).toHaveText(
        'Vos créneaux : Samedi matin',
      );
      await expect(visitor.getByTestId('dossier-download')).toHaveText('Télécharger en PDF');
      await expect(visitor.getByTestId('dossier-send')).toHaveCount(0);
      await dossierCheck(await visitor.locator('body').innerText(), 'Le lien — vu ensemble');
      await expectNoHorizontalScroll(visitor, 'Le lien — vu ensemble (390 × 844)');

      // Essai de Jean-Guy (26/10) : « Retenir » ne s'active que si la sélection cochée change ;
      // ce parcours n'a qu'un bien, sa sélection est déjà retenue : le lien répondu au téléphone
      // (390 × 844), la base relue, Visites et la fiche se prouvent sur la démo.
      await page.goto(`${buyerUrl}/biens-ideaux`);
      await expect(page.getByTestId('ideal-current')).toContainText('Sélection actuelle : A');
      await expect(page.getByTestId('ideal-retain')).toBeDisabled();
      const dossierLink = presentedLink;
      // « Retirer le lien » : il ne s'ouvre plus, tout de suite (le plus récent est en tête).
      await page.goto(`${buyerUrl}/dossier`);
      await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
      await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
      const after = await visitor.goto(dossierLink);
      expect(after?.status(), 'Un lien retiré s’ouvre encore').toBe(404);
    } finally {
      await stranger.close();
    }

    // Le statut, un cran à la fois ; puis « Archiver » : disparue de la liste et de son adresse.
    await page.goto(buyerUrl);
    await page.getByTestId('buyer-status').getByRole('button', { name: 'En visite' }).click();
    await expect(page.getByTestId('buyer-status-badge')).toHaveText('En visite');
    await expect(
      page.getByTestId('buyer-status').getByRole('button', { name: 'A acheté' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Archiver' }).click();
    const confirm = page.getByTestId('buyer-archive-confirm');
    await expect(confirm).toContainText(`Archiver la fiche de ${buyerName} ?`);
    await confirm.getByRole('button', { name: 'Annuler' }).click();
    await expect(confirm).toHaveCount(0);
    await page.getByRole('button', { name: 'Archiver' }).click();
    await confirm.getByRole('button', { name: 'Archiver' }).click();
    await expect(page).toHaveURL(/\/acquereurs\?archive=/);
    await expect(page.getByTestId('buyer-archived-notice')).toContainText(buyerName);
    await expect(page.getByTestId('buyer-row').filter({ hasText: buyerName })).toHaveCount(0);
    const gone = await page.goto(buyerUrl);
    expect(gone?.status()).toBe(404);
    // Retour au mode Vendeur, retenu : la suite du parcours repart du Suivi.
    await page.goto('/acquereurs');
    await switcher.getByRole('button', { name: 'Vendeur' }).click();
    await expect(page).toHaveURL(/\/builder$/);
    await expect(switcher).toHaveAttribute('data-mode', 'seller');
    await page.goto('/prospection');
    await expect(switcher).toHaveAttribute('data-mode', 'seller');
    await page.goto('/suivi');
  });

  await test.step('Prospection filtrée sur le bien, jusqu’au dossier remis', async () => {
    const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
    // Mission 130 — « Prospecter » quand des courriers sont prêts, sinon le lien « Prospection ».
    await row
      .getByRole('link', { name: /^(Prospecter|Prospection)$/ })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/prospection\\?bien=${projectId}$`));
    await expect(page.getByRole('heading', { name: 'Prospection', exact: true })).toBeVisible();

    // Filtrée : les seuls concurrents de ce bien, et chaque carte dit son origine, le bien
    // vendeur (mission 120 : « Dossier vendeur : … »).
    const cards = page.getByTestId('prospecting-card');
    await expect(cards).toHaveCount(COMPETITORS.length);
    for (const card of await cards.all()) {
      await expect(card.getByTestId('seller-origin')).toContainText('Dossier vendeur :');
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
    // Mission 113 — le rendez-vous, dans l'ordre du Live : une fiche par concurrent montré, plus
    // celle du plus dangereux.
    for (const title of [
      'Votre bien',
      'Les biens que nous avons regardés ensemble',
      'Le concurrent le plus dangereux, selon vous',
      'L’analyse des prix',
      'Le chemin de votre prix',
    ]) {
      await expect(synthesis.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }
    await expect(synthesis.getByTestId('synthesis-competitor')).toHaveCount(COMPETITORS.length + 1);
    await expect(synthesis.getByText('Pourquoi, selon vous').locator('..')).toContainText(
      'Meilleure localisation',
    );
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
    // Mission 113 — le libellé figure sur la bande des prix (M104) et sur sa carte.
    await expect(
      synthesis.getByText('Prix des concurrents', { exact: true }).first(),
    ).toBeVisible();
    // Mission 115 — la bande nomme le plus dangereux désigné pendant le Live.
    await expect(synthesis.getByText('Le plus dangereux selon vous').first()).toBeVisible();
    // Mission 116 — le prix convenu en couleur, sur les montants figés, libellé compris.
    await expect(synthesis.getByTestId('agreed-price')).toHaveAttribute('data-alignment', 'orange');
    await expect(synthesis.getByTestId('price-alignment')).toHaveText(PRICE_ALIGNMENT_LABEL);
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
    await expect(row.getByTestId('suivi-frieze')).toContainText(/Concurrents/);
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
    // Mission 144 — sans numéro d'écran, un Live commencé reprend à la borne de la base, jamais
    // à l'introduction ; le rejeu repart de l'introduction en la demandant.
    await page.goto(`/live/${projectId}`);
    await expect(page.locator('main[data-live-page]')).toHaveCount(1);
    await expect(page.locator('main[data-live-page="intro"]')).toHaveCount(0);
    await page.goto(`/live/${projectId}?fiche=0`);
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
  const perceivedInput = page.locator('input[data-price-for="seller_perceived_property_price"]');
  const lockedAnswer = page.locator('[data-locked-answer]');
  if (firstPass) {
    // Mission 143 (I6) — « Valider » est grisé tant que le prix est vide ; le prix se lit groupé
    // pendant la frappe (« 350 000 »), au clavier numérique.
    await expect(page.getByTestId('live-validate')).toBeDisabled();
    await expect(perceivedInput).toHaveAttribute('inputmode', 'numeric');
    await perceivedInput.fill(String(PERCEIVED_PRICE));
    await expect(perceivedInput).toHaveValue('350\u202f000');
    await expect(page.getByTestId('live-validate')).toBeEnabled();
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
      const quickGuess = page.locator('input[data-price-for="seller_estimated_listing_price"]');
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
    const guessInput = page.locator('input[data-price-for="seller_estimated_listing_price"]');
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
  const revisedInput = page.locator('input[data-price-for="seller_revised_property_price"]');
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
  // Mission 115 — et « Le plus dangereux selon vous », au prix du concurrent désigné deux écrans
  // plus tôt : quatre repères nommés.
  await expect(band.locator('[data-band-marker]')).toHaveCount(4);
  await expect(band.locator('[data-band-marker="competitors"]')).toHaveCount(1);
  await expect(band.locator('[data-band-marker="dangerous"]')).toHaveCount(1);
  await expect(band.getByText('Le plus dangereux selon vous').first()).toBeVisible();
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
  const commercialization = page.locator('input[data-price-for="commercialization_price"]');
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
  // Mission 116 — le prix de commercialisation en couleur, son libellé à côté du titre. Au second
  // passage (rechargement), le montant ne s'affiche plus (M85) : ni couleur, ni libellé.
  if (firstPass) {
    await expect(page.getByTestId('agreed-price')).toHaveAttribute('data-alignment', 'orange');
    await expect(page.getByTestId('price-alignment')).toHaveText(PRICE_ALIGNMENT_LABEL);
  }
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
