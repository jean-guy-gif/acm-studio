import { expect, test, type Page } from './test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectOneFilled,
  login,
  resetDemoByScreen,
  sideNav,
} from './support';

// La refonte, lot B (maquettes REFONTE-1, 4, 5 et 6) — Acquéreurs s'ouvre sur « à faire
// aujourd'hui » : une carte par personne, avec ce qu'il y a à faire et son bouton ; un seul bouton
// plein. Sur ordinateur et tablette, la liste à gauche et le détail de la personne choisie à
// droite, sans changer de page ; sur téléphone, une colonne de cartes. La liste entière est
// derrière « Tous mes acquéreurs ». Joué sur la démo, remise à zéro : rien n'est écrit.

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

test('Acquéreurs : à faire aujourd’hui, une carte par personne, aux trois tailles', async ({
  page,
}) => {
  test.setTimeout(6 * 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  await test.step('Ordinateur : la liste à gauche, le détail de la première personne à droite', async () => {
    await sideNav(page)
      .getByRole('link', { name: /^Acquéreurs/ })
      .click();
    await expect(page).toHaveURL(/\/acquereurs$/);
    const rows = page.getByTestId('person-row');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count, 'La démo a plusieurs acquéreurs à traiter aujourd’hui').toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId('buyers-today-count')).toHaveText(
      `${count} choses à faire aujourd’hui`,
    );
    // Une carte par personne : personne ne paraît deux fois.
    const names = await rows.getByTestId('person-name').allInnerTexts();
    expect(new Set(names).size).toBe(names.length);
    // Les cartes du téléphone sont là, cachées : la même liste.
    await expect(page.getByTestId('task-card')).toHaveCount(count);
    await expect(page.getByTestId('task-card').first()).toBeHidden();

    // La réponse du vendeur à l'offre des Keller est en tête (M138) ; elle est choisie d'emblée.
    await expect(rows.first().getByTestId('person-name')).toHaveText('Famille Keller');
    await expect(rows.first().getByTestId('person-task')).toHaveText(
      /^Offre acceptée par le vendeur le \d{2}\/\d{2}$/,
    );
    await expect(rows.first()).toHaveAttribute('aria-current', 'true');
    const detail = page.getByTestId('buyers-today-detail');
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
    await expect(detail.getByTestId('buyers-today-task')).toContainText('Offre acceptée');
    await expectOneFilled(page, 'Acquéreurs, à faire aujourd’hui (ordinateur)');
    await expectNoHorizontalScroll(page, 'Acquéreurs, à faire aujourd’hui (1440 × 900)');
  });

  await test.step('Choisir une autre personne ne quitte pas la page', async () => {
    const lambert = page.getByTestId('person-row').filter({ hasText: 'M. et Mme Lambert' });
    await expect(lambert.getByTestId('person-task')).toContainText(/^Sélection envoyée le /);
    await expect(lambert.getByTestId('task-late')).toContainText('en retard');
    await lambert.click();
    await expect(page).toHaveURL(/\/acquereurs\?personne=[0-9a-f-]{36}$/);
    await expect(lambert).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('person-row').first()).not.toHaveAttribute(
      'aria-current',
      'true',
    );
    const detail = page.getByTestId('buyers-today-detail');
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('M. et Mme Lambert');
    // Son geste est celui d'« Aujourd'hui » (la relance sur place, M135), en bouton plein : le seul.
    const relaunch = detail.getByTestId('buyer-relaunch-open');
    await expect(relaunch).toHaveText('Relancer');
    expect(await filledShown(page)).toEqual(['Relancer']);
    await relaunch.click();
    await expect(detail.getByTestId('buyer-relaunch-panel')).toBeVisible();
    // « Ouvrir sa fiche » y mène ; la fiche ramène à « Acquéreurs ».
    await detail.getByTestId('buyers-today-open').click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Lambert');
  });

  await test.step('La fiche : la prochaine étape, puis trois chiffres (REFONTE-4)', async () => {
    const next = page.getByTestId('buyer-next-step');
    await expect(next).toContainText('Prochaine étape');
    expect(await filledShown(page)).toEqual([
      (await page.getByTestId('buyer-next-button').innerText()).trim(),
    ]);
    // Les trois chiffres du suivi, côte à côte : visités, en attente, refusés.
    const tile = (group: string) =>
      page.locator(`[data-testid="buyer-follow-up-group"][data-group="${group}"]`);
    const tops = await Promise.all(
      ['visited', 'waiting', 'refused'].map(async (group) =>
        Math.round((await tile(group).boundingBox())!.y),
      ),
    );
    expect(new Set(tops).size, `Les trois tuiles ne sont pas sur une ligne : ${tops}`).toBe(1);
    for (const group of ['visited', 'waiting', 'refused']) {
      await expect(tile(group).getByTestId('buyer-follow-up-count')).toHaveText(/^\d+$/);
    }
    await page.getByRole('link', { name: '← Acquéreurs' }).click();
    await expect(page).toHaveURL(/\/acquereurs$/);
  });

  await test.step('« Tous mes acquéreurs » : la liste entière, et son retour', async () => {
    const all = page.getByTestId('buyers-all-link');
    await expect(all).toContainText('Tous mes acquéreurs');
    await all.click();
    await expect(page).toHaveURL(/\/acquereurs\?tous=1$/);
    await expect(page.getByTestId('buyer-row').first()).toBeVisible();
    await expect(page.getByTestId('buyer-view-mine')).toHaveAttribute('aria-pressed', 'true');
    await expectOneFilled(page, 'Tous mes acquéreurs');
    await page.getByTestId('buyers-back-to-today').click();
    await expect(page).toHaveURL(/\/acquereurs$/);
    await expect(page.getByTestId('person-row').first()).toBeVisible();
  });

  await test.step('Tablette : la colonne d’icônes, la liste, le détail', async () => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/acquereurs');
    await expect(sideNav(page).getByRole('link')).toHaveCount(5);
    await expect(page.getByTestId('person-row').first()).toBeVisible();
    await expect(page.getByTestId('buyers-today-detail')).toBeVisible();
    await expect(page.getByTestId('task-card').first()).toBeHidden();
    // La liste et le détail tiennent côte à côte.
    const list = (await page.getByTestId('person-row').first().boundingBox())!;
    const detail = (await page.getByTestId('buyers-today-detail').boundingBox())!;
    expect(detail.x).toBeGreaterThanOrEqual(list.x + list.width);
    await expectNoHorizontalScroll(page, 'Acquéreurs, à faire aujourd’hui (1024 × 768)');
  });

  await test.step('Téléphone : une colonne de cartes, un seul bouton plein, le menu en bas', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/acquereurs');
    const cards = page.getByTestId('task-card');
    await expect(cards.first()).toBeVisible();
    await expect(page.getByTestId('person-row').first()).toBeHidden();
    await expect(page.getByTestId('buyers-today-detail')).toBeHidden();
    await expect(sideNav(page).getByRole('link')).toHaveCount(4);
    // Un seul bouton plein : celui de la première carte qui n'a qu'un geste.
    expect(await filledShown(page)).toHaveLength(1);
    await expectNoHorizontalScroll(page, 'Acquéreurs, à faire aujourd’hui (390 × 844)');

    // La personne mène à sa fiche : une page intérieure, sans menu, avec son retour.
    await cards.filter({ hasText: 'M. et Mme Lambert' }).getByTestId('task-card-person').click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Lambert');
    await expect(page.getByTestId('shell-menu')).toBeHidden();
    await expectNoHorizontalScroll(page, 'Fiche acquéreur (390 × 844)');
    await page.getByRole('link', { name: '← Acquéreurs' }).click();
    await expect(page).toHaveURL(/\/acquereurs$/);

    // « + » : Nouvel acquéreur.
    await page.getByRole('link', { name: 'Nouvel acquéreur' }).click();
    await expect(page).toHaveURL(/\/acquereurs\/nouveau$/);
  });
});
