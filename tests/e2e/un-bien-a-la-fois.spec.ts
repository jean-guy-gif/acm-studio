import { expect, test, type Page } from './test';

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

// La veille des Keller reprend (M136, M138) : leur offre tombe, ils reviennent « En visite ». Deux
// tâches passent avant celle de la veille, dans l'ordre d'« Aujourd'hui » : la réponse du vendeur à
// leur offre (« Fait » la range) et le mandat de l'agence qui leur correspond (« Un bien à
// proposer ») — écarté pour eux ici, par la liste des biens idéaux, comme le ferait le conseiller.
// Leur sélection en cours est complète (trois biens) : `freeSlot` en retire un, par la liste, pour
// qu'un nouveau bien puisse être retenu. Rend l'adresse de leur fiche et le nombre de biens
// trouvés par la veille.
async function wakeKellerWatch(
  page: Page,
  { freeSlot }: { freeSlot: boolean },
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
  if (freeSlot) {
    await page
      .locator('[data-testid="ideal-current-item"][data-letter="C"]')
      .getByRole('checkbox')
      .uncheck();
    await page.getByTestId('ideal-retain').click();
    await expect(page.getByTestId('ideal-saved')).toContainText('Sélection retenue : 2 biens.', {
      timeout: 60_000,
    });
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

test('un bien à la fois : écarter ou proposer, aux trois tailles', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  const { found } =
    await test.step('La veille des Keller reprend : l’offre tombée, les tâches qui passent avant traitées', () =>
      wakeKellerWatch(page, { freeSlot: true }));

  let total = 0;

  await test.step('Ordinateur : le détail de la personne montre ses biens, un à la fois', async () => {
    await kellerRow(page).click();
    const detail = page.getByTestId('buyers-today-detail');
    const deck = detail.getByTestId('ideal-deck');
    await expect(deck).toBeVisible({ timeout: 30_000 });
    // Son nom et sa recherche restent en tête ; « Ouvrir sa fiche » y mène.
    await expect(deck.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
    await expect(deck.getByTestId('buyers-today-open')).toHaveAttribute(
      'href',
      /^\/acquereurs\/[0-9a-f-]{36}$/,
    );
    const position = await deck.getByTestId('deck-position').innerText();
    total = Number(/^Bien 1 sur (\d+)$/.exec(position)?.[1]);
    expect(total, `« ${position} »`).toBeGreaterThanOrEqual(2);
    // Leur sélection en cours a déjà deux biens : il reste une place.
    await expect(deck.getByTestId('deck-retained')).toHaveText('2 retenus sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-full')).toHaveCount(0);
    await expect(deck.getByTestId('deck-segments').locator('span')).toHaveCount(total);
    await expect(deck.getByTestId('deck-segments').locator('[data-reached="true"]')).toHaveCount(1);

    // Le bien : sa photo, « N critères sur M », son prix et sa pastille, son libellé neutre.
    await expect(deck.getByTestId('deck-photo').locator('img')).toBeVisible();
    await expect(deck.getByTestId('deck-criteria')).toHaveText(/^\d+ critères? sur \d+$/);
    await expect(deck.getByTestId('deck-price')).toHaveText(/^[\d\s]+€$/);
    await expect(deck.getByTestId('deck-budget')).toHaveText(/budget/i);
    await expect(deck.getByTestId('deck-label')).toHaveText(/^Maison · /);
    await expect(deck.getByTestId('deck-origin')).toHaveText(/^affiché le \d{2}\/\d{2}\/\d{4}$/);
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
    const deck = page.getByTestId('buyers-today-detail').getByTestId('ideal-deck');
    await deck.getByTestId('deck-open-sheet').locator('visible=true').click();
    const sheet = page.getByTestId('property-sheet');
    await expect(sheet).toBeVisible({ timeout: 30_000 });
    // C'est « Proposer » qui retient : la fiche n'a pas de second bouton plein.
    await expect(sheet.getByTestId('sheet-retain')).toHaveCount(0);
    await sheet.getByTestId('sheet-close').click();
    await expect(sheet).toHaveCount(0);
  });

  await test.step('« Écarter » demande sa raison, en un geste ; « Garder » revient au bien', async () => {
    const deck = page.getByTestId('buyers-today-detail').getByTestId('ideal-deck');
    const first = await deck.getByTestId('deck-label').innerText();
    await deck.getByTestId('deck-dismiss').click();
    await expect(deck.getByTestId('deck-reasons')).toContainText('Pourquoi l’écarter ?');
    await deck.getByTestId('deck-keep').click();
    await expect(deck.getByTestId('deck-reasons')).toHaveCount(0);
    await expect(deck.getByTestId('deck-label')).toHaveText(first);
    // Au clavier : la flèche gauche ouvre les raisons.
    await page.keyboard.press('ArrowLeft');
    await expect(deck.getByTestId('deck-reasons')).toBeVisible();
    await deck.getByTestId('deck-reason-sector').click();
    // Le bien suivant ; l'écart se lit, et s'annule encore.
    await expect(deck.getByTestId('deck-position')).toHaveText(`Bien 2 sur ${total}`, {
      timeout: 30_000,
    });
    await expect(deck.getByTestId('deck-label')).not.toHaveText(first);
    await expect(deck.getByTestId('deck-dismissed')).toContainText(`Écarté pour lui : ${first}`);
    await expect(deck.getByTestId('deck-undo')).toBeVisible();
    // La liste suit : un bien de la veille en moins à voir pour eux.
    await expect(kellerRow(page).getByTestId('person-task')).toHaveText(
      new RegExp(`^${found - 1} nouveaux? biens? trouvés? par la veille$`),
      { timeout: 30_000 },
    );
  });

  await test.step('« Proposer » le retient dans la sélection ; complète, les biens suivants se passent', async () => {
    const deck = page.getByTestId('buyers-today-detail').getByTestId('ideal-deck');
    const kept = await deck.getByTestId('deck-label').innerText();
    // Au clavier : la flèche droite propose.
    await page.keyboard.press('ArrowRight');
    await expect(deck.getByTestId('deck-retained')).toHaveText('3 retenus sur 3', {
      useInnerText: true,
    });
    // La sélection est complète : les biens restants se voient quand même, un par un — « Proposer »
    // attend une place, « Passer ce bien » mène au suivant.
    for (let seen = 3; seen <= total; seen += 1) {
      await expect(deck.getByTestId('deck-position')).toHaveText(`Bien ${seen} sur ${total}`);
      await expect(deck.getByTestId('deck-propose')).toBeDisabled();
      await expect(deck.getByTestId('deck-full')).toContainText('Sélection complète');
      // La flèche droite ne retient plus rien.
      await page.keyboard.press('ArrowRight');
      await expect(deck.getByTestId('deck-position')).toHaveText(`Bien ${seen} sur ${total}`);
      await deck.getByTestId('deck-skip').click();
    }
    const end = deck.getByTestId('deck-end');
    await expect(end).toContainText('Tous les biens sont vus', { timeout: 30_000 });
    await expect(end.getByTestId('deck-end-title')).toHaveText(
      'Sélection de la famille Keller : 3 biens sur 3',
    );
    await expect(end.getByTestId('deck-end-item')).toHaveCount(3);
    await expect(end.getByTestId('deck-end-item').last()).toContainText(kept);
    // Le seul bouton plein : « Retenir la sélection ».
    expect(await filledShown(page)).toEqual(['Retenir la sélection (3/3)']);
    await end.getByTestId('deck-retain').click();
    // La sélection retenue mène à sa fiche : sa prochaine étape est de la lui présenter.
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    await expect(page.getByTestId('buyer-name')).toHaveText('Famille Keller');
    await expect(page.getByTestId('buyer-next-step')).toContainText(/sélection/i);
  });

  await test.step('La liste entière dit la même chose : le bien retenu, les biens écartés', async () => {
    await page.goto(`${new URL(page.url()).pathname}/biens-ideaux`);
    await expect(page.getByTestId('ideal-title')).toBeVisible();
    // La sélection enregistrée, et plus rien de la veille à voir.
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(3);
    await expect(page.getByTestId('ideal-watch-hit')).toHaveCount(0);
  });
});

test('un bien à la fois, sur téléphone et sur tablette', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  const { fiche } = await test.step('La veille des Keller reprend', () =>
    wakeKellerWatch(page, { freeSlot: false }));

  await test.step('Tablette : la liste, et le bien dans le détail, ses deux gestes en bas', async () => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/acquereurs');
    await kellerRow(page).click();
    const deck = page.getByTestId('buyers-today-detail').getByTestId('ideal-deck');
    await expect(deck.getByTestId('deck-position')).toHaveText(/^Bien 1 sur \d+$/, {
      timeout: 30_000,
    });
    // Sur 150 px : « 3 sur 3 ». Leur sélection est complète : le bien se voit quand même.
    await expect(deck.getByTestId('deck-retained')).toHaveText('3 sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-full')).toContainText('Sélection complète');
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
    // Ils tiennent dans l'écran, sans défiler.
    expect(propose.y + propose.height).toBeLessThanOrEqual(768);
    await expectNoHorizontalScroll(page, 'Un bien à la fois (1024 × 768)');
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(deck.getByTestId('deck-propose')).toBeVisible();
    await expectNoHorizontalScroll(page, 'Un bien à la fois (768 × 1024)');
  });

  await test.step('Téléphone : la carte mène à la page, un bien à la fois, sans menu', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/acquereurs');
    const card = page.getByTestId('task-card').filter({ hasText: 'Famille Keller' });
    await expect(card.getByTestId('person-task')).toHaveText(
      /^\d+ nouveaux? biens? trouvés? par la veille$/,
    );
    await card.getByRole('link', { name: 'Voir les biens' }).click();
    await expect(page).toHaveURL(new RegExp(`${fiche}/biens-ideaux\\?un=1$`));
    const deck = page.getByTestId('ideal-deck');
    await expect(deck).toBeVisible();
    // Une page intérieure : le retour vers sa fiche, sans menu du bas, sans le titre de la liste.
    await expect(page.getByTestId('shell-menu')).toBeHidden();
    await expect(page.getByTestId('ideal-title')).toHaveCount(0);
    await expect(deck.getByTestId('deck-back')).toHaveText('Keller');
    await expect(deck.getByTestId('deck-back')).toHaveAttribute('href', fiche);
    await expect(deck.getByTestId('deck-position')).toHaveText(/^Bien 1 sur \d+$/);
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
    // Les raisons d'écarter tiennent dans l'écran ; « Garder » revient au bien.
    await deck.getByTestId('deck-dismiss').click();
    await expect(deck.getByTestId('deck-reasons')).toBeVisible();
    await expectNoHorizontalScroll(page, 'Un bien à la fois, les raisons (390 × 844)');
    await deck.getByTestId('deck-keep').click();
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
    const opener = page.getByTestId('ideal-open-deck');
    await expect(opener).toHaveText(/^Les voir un par un · \d+$/);
    await opener.click();
    await expect(page).toHaveURL(new RegExp(`${fiche}/biens-ideaux\\?un=1$`));
    await expect(deck.getByTestId('deck-position')).toHaveText(/^Bien 1 sur \d+$/);
    await expect(deck.getByTestId('deck-retained')).toHaveText('2 retenus sur 3', {
      useInnerText: true,
    });
    await expect(deck.getByTestId('deck-full')).toHaveCount(0);
  });

  await test.step('« Proposer », puis « Retenir la sélection » : la sélection est enregistrée', async () => {
    const deck = page.getByTestId('ideal-deck');
    const kept = await deck.getByTestId('deck-label').innerText();
    await deck.getByTestId('deck-propose').click();
    await expect(deck.getByTestId('deck-retained')).toHaveText('3 retenus sur 3', {
      useInnerText: true,
    });
    // Les biens suivants se passent, jusqu'à la fin.
    const total = Number(
      /sur (\d+)$/.exec(await deck.getByTestId('deck-position').innerText())?.[1],
    );
    for (let seen = 2; seen <= total; seen += 1) {
      await expect(deck.getByTestId('deck-position')).toHaveText(`Bien ${seen} sur ${total}`);
      await deck.getByTestId('deck-skip').click();
    }
    const end = deck.getByTestId('deck-end');
    await expect(end.getByTestId('deck-end-title')).toHaveText(
      'Sélection de la famille Keller : 3 biens sur 3',
    );
    await expect(end.getByTestId('deck-end-item').last()).toContainText(kept);
    expect(await filledShown(page)).toEqual(['Retenir la sélection (3/3)']);
    await expectNoHorizontalScroll(page, 'Un bien à la fois, la fin (390 × 844)');
    await end.getByTestId('deck-retain').click();
    await expect(end.getByTestId('ideal-saved')).toContainText('Sélection retenue : 3 biens.', {
      timeout: 60_000,
    });
    // Enregistrée : la suite est de la présenter, ou d'envoyer son lien.
    await expect(end.getByTestId('deck-present')).toHaveText('Présenter');
    await expect(end.getByTestId('deck-dossier')).toBeVisible();
    expect(await filledShown(page)).toEqual(['Présenter']);
    // L'adresse garde la vue : une actualisation rouvre « un bien à la fois ».
    await page.reload();
    await expect(page.getByTestId('ideal-deck')).toBeVisible();
    await expect(page.getByTestId('ideal-title')).toHaveCount(0);
  });
});
