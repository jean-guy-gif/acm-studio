import { expect, test, type Locator, type Page } from './test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  login,
  openFold,
  resetDemoByScreen,
} from './support';

// La refonte, lot C (maquettes REFONTE-3, 5 et 6) — « un bien à la fois » : les nouveaux biens
// trouvés pour un acquéreur se voient un par un, « Écarter » ou « Proposer », avec « Pourquoi
// celui-ci pour eux » et « N critères sur M », jamais un pourcentage. Sur ordinateur et tablette,
// dans le détail d'Acquéreurs ; sur téléphone, une page. Les mêmes gestes que les biens idéaux
// (retenir dans la sélection, écarter pour lui), la même sélection. Joué sur la démo, remise à
// zéro : la veille des Keller reprend quand leur offre tombe (M138), avec leurs deux nouveaux
// biens (M136).

// Les boutons pleins visibles de l'écran (le repère `btn-filled`).
const filledShown = (page: Page) =>
  page
    .locator('.btn-filled')
    .evaluateAll((elements) =>
      elements
        .filter((element) =>
          element.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }),
        )
        .map((element) => (element.textContent ?? '').trim()),
    );

const kellerRow = (page: Page) =>
  page.getByTestId('person-row').filter({ hasText: 'Famille Keller' });

const WATCH_TASK = /^(\d+) nouveaux? biens? trouvés? par la veille$/;

// Un bien qui vient d'arriver n'entend aucun geste pendant un court instant — un second toucher
// parti trop vite ne décide jamais du bien suivant. La spec attend, comme la main.
const ready = (deck: Locator) =>
  expect(deck.getByTestId('deck-card')).toHaveAttribute('data-ready', 'true');

// Le même endroit à l'écran, au pixel près.
const samePlace = (
  a: { x: number; y: number; width: number },
  b: { x: number; y: number; width: number },
) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && Math.abs(a.width - b.width) <= 1;

// La veille des Keller reprend (M136, M138) : leur offre tombe, ils reviennent « En visite ». Deux
// tâches passent avant celle de la veille, dans l'ordre d'« Aujourd'hui » : la réponse du vendeur à
// leur offre (« Fait » la range) et le mandat de l'agence qui leur correspond (« Un bien à
// proposer ») — écarté pour eux ici, par la liste des biens idéaux, comme le ferait le conseiller.
// Leur sélection en cours est complète (trois biens) : `freeSlots` en retire, par la liste, pour
// que de nouveaux biens puissent être retenus. Rend l'adresse de leur fiche et le nombre de biens
// trouvés par la veille.
async function wakeKellerWatch(
  page: Page,
  { freeSlots }: { freeSlots: 0 | 1 | 2 },
): Promise<{ fiche: string; found: number }> {
  await page.goto('/acquereurs?tous=1');
  await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
  await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}$/);
  const fiche = new URL(page.url()).pathname;
  await openFold(page, 'buyer-all');
  await page.getByRole('button', { name: 'L’offre est tombée : revenir en visite' }).click();
  await expect(page.getByTestId('buyer-status-badge')).toHaveText('En visite');

  await page.goto(`${fiche}/biens-ideaux`);
  await expect(page.getByTestId('ideal-watch-hit').first()).toBeVisible();
  const mandates = page.getByTestId('ideal-agency-hit').filter({ hasText: 'Mes mandats' });
  for (let left = await mandates.count(); left > 0; left -= 1) {
    await mandates.first().getByTestId('dismiss-open').click();
    await mandates.first().getByTestId('dismiss-reason-other').click();
    await expect(mandates).toHaveCount(left - 1, { timeout: 30_000 });
  }
  await expect(page.getByTestId('ideal-current-item')).toHaveCount(3);
  if (freeSlots > 0) {
    for (const letter of ['C', 'B'].slice(0, freeSlots)) {
      await page
        .locator(`[data-testid="ideal-current-item"][data-letter="${letter}"]`)
        .getByRole('checkbox')
        .uncheck();
    }
    await page.getByTestId('ideal-retain').click();
    await expect(page.getByTestId('ideal-saved')).toContainText(
      freeSlots === 2 ? 'Sélection retenue : 1 bien.' : 'Sélection retenue : 2 biens.',
      { timeout: 60_000 },
    );
  }

  await page.goto('/acquereurs');
  await kellerRow(page).click();
  const detail = page.getByTestId('buyers-today-detail');
  await expect(detail.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
  await detail.getByTestId('offer-answer-mark-done').click();
  const task = kellerRow(page).getByTestId('person-task');
  await expect(task).toHaveText(WATCH_TASK, { timeout: 30_000 });
  const found = Number(WATCH_TASK.exec(await task.innerText())?.[1]);
  expect(found, 'La veille de la démo a trouvé deux biens pour les Keller').toBe(2);
  return { fiche, found };
}

test('un bien à la fois, dans le détail : écarter, proposer, retenir, sans changer de page', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  const { found } =
    await test.step('La veille des Keller reprend : l’offre tombée, les tâches qui passent avant traitées', () =>
      wakeKellerWatch(page, { freeSlots: 2 }));

  const detail = page.getByTestId('buyers-today-detail');
  const deck = detail.getByTestId('ideal-deck');
  let first = '';

  await test.step('Ordinateur : le détail de la personne montre ses nouveaux biens, un à la fois', async () => {
    await kellerRow(page).click();
    await expect(deck).toBeVisible({ timeout: 30_000 });
    // L'adresse tient la personne sur ses biens.
    await expect(page).toHaveURL(/\/acquereurs\?personne=[0-9a-f-]{36}&biens=1$/);
    // Son nom et sa recherche restent en tête ; « Ouvrir sa fiche » y mène.
    await expect(deck.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
    await expect(deck.getByTestId('buyers-today-open')).toHaveAttribute(
      'href',
      /^\/acquereurs\/[0-9a-f-]{36}$/,
    );
    // La ligne dit « 2 nouveaux biens » : le parcours est celui de ces deux biens.
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 1 sur ${found}`);
    // Leur sélection en cours a un bien : il reste deux places, rien à enregistrer.
    await expect(deck.getByTestId('deck-retained')).toHaveText('1 retenu sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-note')).toHaveCount(0);
    await expect(deck.getByTestId('deck-segments').locator('span')).toHaveCount(found);
    await expect(deck.getByTestId('deck-segments').locator('[data-reached="true"]')).toHaveCount(1);

    // Le bien : sa photo, « N critères sur M », son prix et sa pastille, son libellé neutre.
    await expect(deck.getByTestId('deck-photo').locator('img')).toBeVisible();
    await expect(deck.getByTestId('deck-criteria')).toHaveText(/^\d+ critères? sur \d+$/);
    await expect(deck.getByTestId('deck-price')).toHaveText(/^[\d\s]+€$/);
    await expect(deck.getByTestId('deck-budget')).toHaveText(/budget/i);
    await expect(deck.getByTestId('deck-label')).toHaveText(/^Maison · /);
    await expect(deck.getByTestId('deck-origin')).toHaveText(/^affiché le \d{2}\/\d{2}\/\d{4}$/);
    first = await deck.getByTestId('deck-label').innerText();
    // « Pourquoi celui-ci pour eux », dans ses mots : leur indispensable d'abord.
    const why = deck.getByTestId('deck-why');
    await expect(why).toContainText('Pourquoi celui-ci pour eux');
    await expect(why.getByTestId('deck-why-pill').first()).toHaveAttribute('data-tone', 'must');
    await expect(why.getByTestId('deck-why-pill').filter({ hasText: /^Piscine$/ })).toHaveAttribute(
      'data-tone',
      'must',
    );
    // Jamais un pourcentage, ni « disponible », ni un titre ou un lien d'annonce.
    const text = await deck.innerText();
    expect(text).not.toMatch(/%|disponible|estimation|https?:/i);

    // Deux gestes, un seul bouton plein : « Proposer ». Ils tiennent dans l'écran.
    expect(await filledShown(page)).toEqual(['Proposer']);
    const propose = (await deck.getByTestId('deck-propose').boundingBox())!;
    expect(propose.y + propose.height).toBeLessThanOrEqual(900);
    await expect(deck.getByText('Au clavier : flèche gauche pour écarter')).toBeVisible();
    await expectNoHorizontalScroll(page, 'Un bien à la fois (1440 × 900)');
  });

  await test.step('« Voir l’annonce complète » ouvre sa fiche, à lire seulement', async () => {
    await deck.getByTestId('deck-open-sheet').locator('visible=true').click();
    const sheet = page.getByTestId('property-sheet');
    await expect(sheet).toBeVisible({ timeout: 30_000 });
    // C'est « Proposer » qui retient : la fiche n'a pas de second bouton plein.
    await expect(sheet.getByTestId('sheet-retain')).toHaveCount(0);
    await sheet.getByTestId('sheet-close').click();
    await expect(sheet).toHaveCount(0);
  });

  await test.step('« Écarter » demande sa raison ; un second toucher parti trop vite ne choisit rien', async () => {
    await ready(deck);
    const dismissAt = (await deck.getByTestId('deck-dismiss').boundingBox())!;
    // Deux touchers de suite sur « Écarter » : les raisons s'ouvrent, et restent ouvertes — le
    // second ne tombe ni sur une raison, ni sur « Garder », qui a pris sa place.
    await deck.getByTestId('deck-dismiss').dblclick();
    await expect(deck.getByTestId('deck-reasons')).toContainText('Pourquoi l’écarter ?');
    await page.waitForTimeout(600);
    await expect(deck.getByTestId('deck-reasons')).toBeVisible();
    await expect(deck.getByTestId('deck-label')).toHaveText(first);
    expect(samePlace(dismissAt, (await deck.getByTestId('deck-keep').boundingBox())!)).toBe(true);
    // Aucun bouton plein pendant le choix d'une raison.
    expect(await filledShown(page)).toEqual([]);
    await ready(deck);
    await deck.getByTestId('deck-keep').click();
    await expect(deck.getByTestId('deck-reasons')).toHaveCount(0);
    await expect(deck.getByTestId('deck-label')).toHaveText(first);

    // Au clavier : la flèche gauche ouvre les raisons.
    await ready(deck);
    await page.keyboard.press('ArrowLeft');
    await expect(deck.getByTestId('deck-reasons')).toBeVisible();
    await ready(deck);
    await deck.getByTestId('deck-reason-sector').click();
    // Le bien suivant ; l'écart se lit, et s'annule encore.
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 2 sur ${found}`, {
      timeout: 30_000,
    });
    await expect(deck.getByTestId('deck-label')).not.toHaveText(first);
    await expect(deck.getByTestId('deck-dismissed')).toContainText(`Écarté pour lui : ${first}`);
    // La liste suit : un bien de la veille en moins à voir pour eux.
    await expect(kellerRow(page).getByTestId('person-task')).toHaveText(
      '1 nouveau bien trouvé par la veille',
      { timeout: 30_000 },
    );
    // « Annuler » ramène le bien : on le regarde de nouveau.
    await deck.getByTestId('deck-undo').click();
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 1 sur ${found}`, {
      timeout: 30_000,
    });
    await expect(deck.getByTestId('deck-label')).toHaveText(first);
    await expect(deck.getByTestId('deck-dismissed')).toHaveCount(0);
    await expect(kellerRow(page).getByTestId('person-task')).toHaveText(
      `${found} nouveaux biens trouvés par la veille`,
      { timeout: 30_000 },
    );
  });

  await test.step('« Proposer » retient un bien, un seul ; rien de proposé ne se perd sans le dire', async () => {
    // Deux touchers de suite sur « Proposer » : un seul bien retenu, jamais le suivant avec lui.
    await ready(deck);
    await deck.getByTestId('deck-propose').dblclick();
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 2 sur ${found}`);
    await page.waitForTimeout(600);
    await expect(deck.getByTestId('deck-retained')).toHaveText('2 retenus sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 2 sur ${found}`);
    // Le bien proposé n'est pas encore enregistré : l'écran le dit, « Retenir la sélection » est là,
    // en contour — le seul bouton plein reste « Proposer ».
    await expect(deck.getByTestId('deck-unsaved')).toHaveText(
      '2 biens dans la sélection, pas encore enregistrée.',
    );
    await expect(deck.getByTestId('deck-retain-now')).toHaveText('Retenir la sélection (2/3)');
    expect(await filledShown(page)).toEqual(['Proposer']);
    const propose = (await deck.getByTestId('deck-propose').boundingBox())!;
    expect(propose.y + propose.height).toBeLessThanOrEqual(900);

    // Quitter par un lien le demande d'abord, dans l'écran : « Rester » garde tout.
    await deck.getByTestId('buyers-today-open').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Quitter sans retenir la sélection ?');
    await dialog.getByRole('button', { name: 'Rester' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/acquereurs\?personne=[0-9a-f-]{36}&biens=1$/);
    await expect(deck.getByTestId('deck-retained')).toHaveText('2 retenus sur 3', {
      useInnerText: true,
    });
    // Une autre personne : la même question ; « Quitter » y mène, et le bien proposé est perdu,
    // comme annoncé.
    const other = page.getByTestId('person-row').filter({ hasNotText: 'Famille Keller' }).first();
    const otherName = await other.getByTestId('person-name').innerText();
    await other.click();
    await expect(dialog).toContainText('ne sont pas encore enregistrés');
    await dialog.getByTestId('deck-leave').click();
    await expect(detail.getByTestId('buyers-today-name')).toHaveText(otherName, {
      timeout: 30_000,
    });
    await kellerRow(page).click();
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 1 sur ${found}`, {
      timeout: 30_000,
    });
    await expect(deck.getByTestId('deck-retained')).toHaveText('1 retenu sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-label')).toHaveText(first);

    // De nouveau proposé, puis retenu sans attendre la fin : la sélection est enregistrée, on reste
    // sur place.
    await ready(deck);
    await deck.getByTestId('deck-propose').click();
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 2 sur ${found}`);
    await deck.getByTestId('deck-retain-now').click();
    await expect(deck.getByTestId('deck-saved')).toContainText('Sélection retenue : 2 biens.', {
      timeout: 60_000,
    });
    await expect(deck.getByTestId('deck-note')).toHaveCount(0);
    await expect(page).toHaveURL(/\/acquereurs\?personne=[0-9a-f-]{36}&biens=1$/);
    await expect(kellerRow(page).getByTestId('person-task')).toHaveText(
      '1 nouveau bien trouvé par la veille',
      { timeout: 30_000 },
    );
  });

  await test.step('Le dernier bien de la veille écarté : le parcours reste, sous son nom, et s’annule encore', async () => {
    const last = await deck.getByTestId('deck-label').innerText();
    await ready(deck);
    await deck.getByTestId('deck-dismiss').click();
    await ready(deck);
    await deck.getByTestId('deck-reason-other').click();
    // La tâche de la veille quitte la liste ; le détail, lui, reste sur ses biens.
    await expect(
      kellerRow(page)
        .getByTestId('person-task')
        .filter({ hasText: /par la veille$/ }),
    ).toHaveCount(0, { timeout: 30_000 });
    await expect(deck).toBeVisible();
    await expect(deck.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
    await expect(page).toHaveURL(/\/acquereurs\?personne=[0-9a-f-]{36}&biens=1$/);
    const end = deck.getByTestId('deck-end');
    await expect(end.getByTestId('deck-end-kicker')).toHaveText('Tous les nouveaux biens sont vus');
    await expect(end.getByTestId('deck-end-title')).toHaveText(
      'Sélection de la famille Keller : 2 biens sur 3',
    );
    // Rien à enregistrer : la suite est de présenter. « Annuler » est toujours là.
    expect(await filledShown(page)).toEqual(['Présenter']);
    await expect(deck.getByTestId('deck-dismissed')).toContainText(`Écarté pour lui : ${last}`);
    await deck.getByTestId('deck-undo').click();
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 2 sur ${found}`, {
      timeout: 30_000,
    });
    await expect(deck.getByTestId('deck-label')).toHaveText(last);
    await expect(kellerRow(page).getByTestId('person-task')).toHaveText(
      '1 nouveau bien trouvé par la veille',
      { timeout: 30_000 },
    );

    // Au clavier : la flèche droite propose. La sélection est complète, le parcours fini.
    await ready(deck);
    await page.keyboard.press('ArrowRight');
    await expect(end.getByTestId('deck-end-title')).toHaveText(
      'Sélection de la famille Keller : 3 biens sur 3',
    );
    await expect(end.getByTestId('deck-end-item')).toHaveCount(3);
    await expect(end.getByTestId('deck-end-item').last()).toContainText(last);
    // Le seul bouton plein : « Retenir la sélection ».
    expect(await filledShown(page)).toEqual(['Retenir la sélection (3/3)']);
    await end.getByTestId('deck-retain').click();
    await expect(end.getByTestId('ideal-saved')).toContainText('Sélection retenue : 3 biens.', {
      timeout: 60_000,
    });
    // Sans changer de page : sous son nom, la suite est de la présenter, ou d'envoyer son lien.
    await expect(page).toHaveURL(/\/acquereurs\?personne=[0-9a-f-]{36}&biens=1$/);
    await expect(deck.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
    await expect(end.getByTestId('deck-present')).toHaveText('Présenter');
    await expect(end.getByTestId('deck-dossier')).toBeVisible();
    expect(await filledShown(page)).toEqual(['Présenter']);
  });

  await test.step('La liste entière dit la même chose : les biens retenus, plus rien de la veille', async () => {
    await deck.getByTestId('deck-all').click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}\/biens-ideaux$/);
    await expect(page.getByTestId('ideal-title')).toBeVisible();
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(3);
    await expect(page.getByTestId('ideal-watch-hit')).toHaveCount(0);
  });
});

test('un bien à la fois, sur tablette et sur téléphone', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  const { fiche, found } = await test.step('La veille des Keller reprend', () =>
    wakeKellerWatch(page, { freeSlots: 0 }));

  await test.step('Tablette : la liste, et le bien dans le détail, ses deux gestes en bas', async () => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/acquereurs');
    await kellerRow(page).click();
    const deck = page.getByTestId('buyers-today-detail').getByTestId('ideal-deck');
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 1 sur ${found}`, {
      timeout: 30_000,
    });
    // Sur 150 px : « 3 sur 3 ». Leur sélection est complète : le bien se voit quand même.
    await expect(deck.getByTestId('deck-retained')).toHaveText('3 sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-full')).toContainText(
      'Sélection complète : pour proposer ce bien, retirez-en un dans toute la liste.',
    );
    await expect(deck.getByTestId('deck-retain-now')).toHaveCount(0);
    await expect(deck.getByTestId('deck-propose')).toBeDisabled();
    await expect(deck.getByTestId('deck-criteria')).toHaveText(/^\d+ critères? sur \d+$/);
    await expect(deck.getByTestId('deck-why-pill').first()).toBeVisible();
    expect(await filledShown(page)).toEqual(['Proposer']);
    // « Écarter » et « Proposer », côte à côte, de la même taille.
    const dismiss = (await deck.getByTestId('deck-dismiss').boundingBox())!;
    const propose = (await deck.getByTestId('deck-propose').boundingBox())!;
    expect(Math.round(dismiss.y)).toBe(Math.round(propose.y));
    expect(Math.abs(dismiss.width - propose.width)).toBeLessThanOrEqual(1);
    expect(Math.round(propose.height)).toBe(58);
    // Ils tiennent dans l'écran, sans défiler — dans la fenêtre de Safari aussi (1024 × 700).
    expect(propose.y + propose.height).toBeLessThanOrEqual(768);
    await expectNoHorizontalScroll(page, 'Un bien à la fois (1024 × 768)');
    await page.setViewportSize({ width: 1024, height: 700 });
    const lower = (await deck.getByTestId('deck-propose').boundingBox())!;
    expect(lower.y + lower.height).toBeLessThanOrEqual(700);
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(deck.getByTestId('deck-propose')).toBeVisible();
    await expectNoHorizontalScroll(page, 'Un bien à la fois (768 × 1024)');
  });

  await test.step('Téléphone : la carte mène à ses nouveaux biens, un à la fois, sans menu', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/acquereurs');
    const card = page.getByTestId('task-card').filter({ hasText: 'Famille Keller' });
    await expect(card.getByTestId('person-task')).toHaveText(WATCH_TASK);
    await card.getByRole('link', { name: 'Voir les biens' }).click();
    await expect(page).toHaveURL(new RegExp(`${fiche}/biens-ideaux\\?un=veille$`));
    const deck = page.getByTestId('ideal-deck');
    await expect(deck).toBeVisible();
    // Une page intérieure : le retour vers sa fiche, sans menu du bas, sans le titre de la liste.
    await expect(page.getByTestId('shell-menu')).toBeHidden();
    await expect(page.getByTestId('ideal-title')).toHaveCount(0);
    await expect(deck.getByTestId('deck-back')).toHaveText('Keller');
    await expect(deck.getByTestId('deck-back')).toHaveAttribute('href', fiche);
    // « 2 nouveaux biens » : ces deux-là.
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 1 sur ${found}`);
    await expect(deck.getByTestId('deck-retained')).toHaveText('3 retenus sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-criteria')).toHaveText(/^\d+ critères? sur \d+$/);
    await expect(deck.getByTestId('deck-why')).toContainText('Pourquoi celui-ci pour eux');
    expect(await filledShown(page)).toEqual(['Proposer']);
    // Les deux gestes sont sous le pouce : au bas de l'écran, côte à côte.
    const dismiss = (await deck.getByTestId('deck-dismiss').boundingBox())!;
    const propose = (await deck.getByTestId('deck-propose').boundingBox())!;
    expect(Math.round(dismiss.y)).toBe(Math.round(propose.y));
    expect(propose.y + propose.height).toBeLessThanOrEqual(844);
    expect(propose.y).toBeGreaterThan(844 / 2);
    await expectNoHorizontalScroll(page, 'Un bien à la fois (390 × 844)');
    // Les raisons d'écarter tiennent dans l'écran ; « Garder », à la place d'« Écarter », revient
    // au bien.
    await ready(deck);
    await deck.getByTestId('deck-dismiss').click();
    await expect(deck.getByTestId('deck-reasons')).toBeVisible();
    await expectNoHorizontalScroll(page, 'Un bien à la fois, les raisons (390 × 844)');
    const keep = (await deck.getByTestId('deck-keep').boundingBox())!;
    expect(samePlace(dismiss, keep)).toBe(true);
    expect(keep.y + keep.height).toBeLessThanOrEqual(844);
    await ready(deck);
    await deck.getByTestId('deck-keep').click();
    await expect(deck.getByTestId('deck-reasons')).toHaveCount(0);
  });

  await test.step('« Toute la liste et le marché » : une place libérée, puis « Les voir un par un »', async () => {
    const deck = page.getByTestId('ideal-deck');
    await deck.getByTestId('deck-all').click();
    await expect(page).toHaveURL(new RegExp(`${fiche}/biens-ideaux$`));
    await expect(page.getByTestId('ideal-title')).toBeVisible();
    await expect(page.getByTestId('ideal-watch-hit').first()).toBeVisible();
    // La même sélection, dans la liste : un bien décoché libère une place (rien n'est enregistré).
    await page
      .locator('[data-testid="ideal-current-item"][data-letter="C"]')
      .getByRole('checkbox')
      .uncheck();
    // Depuis la liste : tous ses biens ouverts, ceux de la veille en tête.
    const opener = page.getByTestId('ideal-open-deck');
    await expect(opener).toHaveText(/^Les voir un par un · \d+$/);
    const all = Number(/(\d+)$/.exec(await opener.innerText())?.[1]);
    expect(all).toBeGreaterThanOrEqual(found);
    await opener.click();
    await expect(page).toHaveURL(new RegExp(`${fiche}/biens-ideaux\\?un=1$`));
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 1 sur ${all}`);
    await expect(deck.getByTestId('deck-retained')).toHaveText('2 retenus sur 3', {
      useInnerText: true,
    });
    // La sélection n'est plus celle qui est enregistrée : l'écran le dit déjà.
    await expect(deck.getByTestId('deck-unsaved')).toHaveText(
      '2 biens dans la sélection, pas encore enregistrée.',
    );
  });

  await test.step('« Proposer », puis « Retenir la sélection » sans attendre la fin', async () => {
    const deck = page.getByTestId('ideal-deck');
    const kept = await deck.getByTestId('deck-label').innerText();
    await ready(deck);
    await deck.getByTestId('deck-propose').click();
    await expect(deck.getByTestId('deck-retained')).toHaveText('3 retenus sur 3', {
      useInnerText: true,
    });
    const total = Number(
      /sur (\d+)$/.exec(await deck.getByTestId('deck-position').innerText())?.[1],
    );
    // Complète, pas encore enregistrée : la ligne le dit, avec « Retenir la sélection » — en
    // contour, les deux gestes toujours dans l'écran.
    await expect(deck.getByTestId('deck-full')).toHaveText(
      'Sélection complète, pas encore enregistrée.',
    );
    await expect(deck.getByTestId('deck-retain-now')).toHaveText('Retenir la sélection (3/3)');
    expect(await filledShown(page)).toEqual(['Proposer']);
    const propose = (await deck.getByTestId('deck-propose').boundingBox())!;
    expect(propose.y + propose.height).toBeLessThanOrEqual(844);
    await expectNoHorizontalScroll(page, 'Un bien à la fois, à enregistrer (390 × 844)');
    // Revenir à sa fiche le demande d'abord : « Rester ».
    await deck.getByTestId('deck-back').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Quitter sans retenir la sélection ?');
    await dialog.getByRole('button', { name: 'Rester' }).click();
    await expect(page).toHaveURL(new RegExp(`${fiche}/biens-ideaux\\?un=1$`));
    // Retenue sans attendre la fin du parcours.
    await deck.getByTestId('deck-retain-now').click();
    await expect(deck.getByTestId('deck-saved')).toContainText('Sélection retenue : 3 biens.', {
      timeout: 60_000,
    });
    await expect(deck.getByTestId('deck-retain-now')).toHaveCount(0);
    // Les biens suivants se passent, jusqu'à la fin.
    for (let seen = 2; seen <= total; seen += 1) {
      await expect(deck.getByTestId('deck-position')).toHaveText(`Bien ${seen} sur ${total}`);
      await expect(deck.getByTestId('deck-propose')).toBeDisabled();
      await ready(deck);
      await deck.getByTestId('deck-skip').click();
    }
    const end = deck.getByTestId('deck-end');
    await expect(end.getByTestId('deck-end-kicker')).toHaveText('Tous les biens sont vus');
    await expect(end.getByTestId('deck-end-title')).toHaveText(
      'Sélection de la famille Keller : 3 biens sur 3',
    );
    await expect(end.getByTestId('deck-end-item').last()).toContainText(kept);
    // Enregistrée : la suite est de la présenter, ou d'envoyer son lien.
    await expect(end.getByTestId('deck-present')).toHaveText('Présenter');
    await expect(end.getByTestId('deck-dossier')).toBeVisible();
    expect(await filledShown(page)).toEqual(['Présenter']);
    await expectNoHorizontalScroll(page, 'Un bien à la fois, la fin (390 × 844)');
    // L'adresse garde la vue : une actualisation rouvre « un bien à la fois ».
    await page.reload();
    await expect(page.getByTestId('ideal-deck')).toBeVisible();
    await expect(page.getByTestId('ideal-title')).toHaveCount(0);
  });
});
