import { expect, test, type Page } from './test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectOneFilled,
  login,
  resetDemoByScreen,
  reveal,
  sideNav,
} from './support';

// La refonte, lot E (maquettes REFONTE-7 et 8) — Vendeurs s'ouvre sur « à faire aujourd'hui » :
// une carte par vendeur, avec ce qu'il y a à faire et son bouton ; un seul bouton plein. Sur
// ordinateur et tablette, la liste à gauche et, à droite, son dossier — sa prochaine étape, trois
// chiffres, « Son dossier », « Tout le dossier » — sans changer de page ; sur téléphone, une colonne
// de cartes, et le dossier est sa page. Les listes de Préparation, du Live et du Suivi sont derrière
// « Tous mes vendeurs ». Joué sur la démo, remise à zéro : la relance des Lambert-Duval et le
// premier Point marché de M. Lefebvre sont dus. Rien n'est écrit.

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

const row = (page: Page, name: string) => page.getByTestId('person-row').filter({ hasText: name });

test('Vendeurs : à faire aujourd’hui et le dossier, aux trois tailles', async ({ page }) => {
  test.setTimeout(6 * 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  let lambertId = '';
  await test.step('Ordinateur : la liste à gauche, le dossier du premier vendeur à droite', async () => {
    await sideNav(page)
      .getByRole('link', { name: /^Vendeurs/ })
      .click();
    await expect(page).toHaveURL(/\/vendeurs$/);
    await expect(page.getByRole('heading', { name: 'Vendeurs', level: 1 })).toBeVisible();
    const rows = page.getByTestId('person-row');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    // Une carte par vendeur : personne ne paraît deux fois ; le nombre dit toutes les choses à faire.
    const names = await rows.getByTestId('person-name').allInnerTexts();
    expect(new Set(names).size).toBe(names.length);
    const more = await page.getByTestId('task-card').getByTestId('sellers-today-other').count();
    await expect(page.getByTestId('sellers-today-count')).toHaveText(
      `${count + more} ${count + more > 1 ? 'choses' : 'chose'} à faire aujourd’hui`,
    );
    // La relance des Lambert-Duval, avec son argument (un acquéreur prêt, M145 B), et le premier
    // Point marché de M. Lefebvre (un mois après la signature, M130 A).
    await expect(row(page, 'M. et Mme Lambert-Duval').getByTestId('person-task')).toHaveText(
      /^À relancer : 1 acquéreur prêt correspond à l’appartement$/,
    );
    await expect(row(page, 'M. Lefebvre').getByTestId('person-task')).toHaveText(
      /^Mandat signé le \d{2}\/\d{2} · premier Point marché$/,
    );

    // Le premier vendeur est choisi d'emblée ; son dossier à droite.
    const first = rows.first();
    await expect(first).toHaveAttribute('aria-current', 'true');
    const firstName = await first.getByTestId('person-name').innerText();
    const detail = page.getByTestId('sellers-today-detail');
    await expect(detail.getByTestId('dossier-name')).toHaveText(firstName, { timeout: 30_000 });
    // Sa prochaine étape : la tâche du jour et son geste — le seul bouton plein de l'écran.
    await expect(detail.getByTestId('sellers-today-task-title')).toHaveText(
      await first.getByTestId('person-task').innerText(),
    );
    expect((await filledShown(page)).length).toBe(1);
    await expectOneFilled(page, 'Vendeurs, à faire aujourd’hui (ordinateur)');
    // Trois chiffres, puis « Son dossier » (cinq étapes), puis « Tout le dossier ».
    await expect(detail.getByTestId('dossier-tiles').locator(':scope > div')).toHaveCount(3);
    await expect(detail.getByTestId('dossier-tile-retained')).toContainText(
      /^\d+Concurrents? retenus?$/,
    );
    await expect(detail.getByTestId('overview-step')).toHaveCount(5);
    await expect(detail.getByTestId('overview-step')).toContainText([
      'Le bien',
      'Les concurrents',
      'Le prix',
      'Le rendez-vous',
      'Conclure',
    ]);
    const all = detail.getByTestId('dossier-all-link');
    await expect(all).toHaveAttribute('href', /^\/builder\/[0-9a-f-]{36}$/);
    // Jamais un pourcentage ni « estimation ».
    expect(await detail.innerText()).not.toMatch(/%|estimation/i);
    await expectNoHorizontalScroll(page, 'Vendeurs, à faire aujourd’hui (1440 × 900)');
  });

  await test.step('Un autre vendeur : un dossier neuf à droite, sans changer de page', async () => {
    const detail = page.getByTestId('sellers-today-detail');
    // Le détail d'avant, marqué : il ne doit pas survivre au changement de vendeur.
    await detail.evaluate((element) => element.setAttribute('data-probe', 'avant'));
    const lambert = row(page, 'M. et Mme Lambert-Duval');
    const lefebvre = row(page, 'M. Lefebvre');
    const target = (await lambert.getAttribute('aria-current')) === 'true' ? lefebvre : lambert;
    const name = await target.getByTestId('person-name').innerText();
    await target.click();
    await expect(page).toHaveURL(/\/vendeurs\?dossier=[0-9a-f-]{36}$/);
    await expect(target).toHaveAttribute('aria-current', 'true');
    await expect(detail.getByTestId('dossier-name')).toHaveText(name, { timeout: 30_000 });
    await expect(page.locator('[data-probe="avant"]')).toHaveCount(0);
    expect((await filledShown(page)).length).toBe(1);

    // Le dossier des Lambert-Duval : à relancer ; « Tout le dossier » mène à sa page.
    await lambert.click();
    await expect(detail.getByTestId('dossier-name')).toHaveText('M. et Mme Lambert-Duval', {
      timeout: 30_000,
    });
    await expect(detail.getByTestId('dossier-badge')).toHaveText('À relancer');
    await expect(detail.getByTestId('dossier-property')).toHaveText(/^Appartement · /);
    lambertId = new URL(page.url()).searchParams.get('dossier') ?? '';
    expect(lambertId).toMatch(/^[0-9a-f-]{36}$/);
    // Son geste : la carte du Suivi s'ouvre sur la relance (M130 A), comme sur « Aujourd'hui ».
    await expect(
      detail.getByTestId('sellers-today-task').getByRole('link', { name: 'Préparer la relance' }),
    ).toHaveAttribute('href', new RegExp(`/suivi\\?relancer=${lambertId}`));
  });

  await test.step('« Tous mes vendeurs » : Préparation, Live et Suivi, par leurs onglets', async () => {
    const link = page.getByTestId('sellers-all-link');
    await expect(link).toContainText('Tous mes vendeurs');
    await expect(link).toContainText(/\d+/);
    await link.click();
    await expect(page).toHaveURL(/\/builder$/);
    await expect(page.getByTestId('seller-tabs')).toBeVisible();
    await expect(sideNav(page).locator('[aria-current="page"]')).toHaveText(/^Vendeurs/);
  });

  await test.step('Le dossier : sa prochaine étape, trois chiffres, ses étapes, « Tout le dossier »', async () => {
    await page.goto(`/builder/${lambertId}`);
    await expect(page.getByTestId('dossier-name')).toHaveText('M. et Mme Lambert-Duval');
    await expect(page.getByTestId('dossier-badge')).toHaveText('À relancer');
    // La relance, avec son argument, est la prochaine étape (M145 B) : le seul bouton plein.
    const next = page.getByTestId('overview-next-step');
    await expect(next.getByRole('heading')).toHaveText('Relancer M. et Mme Lambert-Duval');
    await expectOneFilled(page, 'Le dossier d’un vendeur');
    await expect(page.getByTestId('dossier-tiles').locator(':scope > div')).toHaveCount(3);
    await expect(page.getByTestId('dossier-tile-buyers')).toContainText(
      /^1Acquéreur prêt à visiter$/,
    );
    await expect(page.getByTestId('overview-step')).toHaveCount(5);
    // Le reste du dossier est replié, rien n'est retiré.
    const fold = page.getByTestId('dossier-all');
    await expect(fold).not.toHaveAttribute('open', '');
    await reveal(page.getByTestId('property-buyers'));
    await expect(fold).toHaveAttribute('open', '');
    await expect(fold).toContainText('Autres actions');
    await expect(fold.getByTestId('market-study-link')).toBeVisible();
    // `?tout=1` l'ouvre d'office.
    await page.goto(`/builder/${lambertId}?tout=1`);
    await expect(page.getByTestId('dossier-all')).toHaveAttribute('open', '');
    await expectNoHorizontalScroll(page, 'Le dossier d’un vendeur (1440 × 900)');
  });

  await test.step('Tablette : la liste et le dossier, dans les deux sens', async () => {
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/vendeurs');
      const detail = page.getByTestId('sellers-today-detail');
      await expect(page.getByTestId('person-row').first()).toBeVisible();
      await expect(detail.getByTestId('dossier-tiles')).toBeVisible({ timeout: 30_000 });
      await expect(detail.getByTestId('overview-step')).toHaveCount(5);
      expect((await filledShown(page)).length).toBe(1);
      const label = `Vendeurs (${viewport.width} × ${viewport.height})`;
      await expectOneFilled(page, label);
      await expectNoHorizontalScroll(page, label);
    }
  });

  await test.step('Téléphone : une carte par vendeur ; le dossier est sa page, sans menu', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/vendeurs');
    const cards = page.getByTestId('task-card');
    await expect(cards.first()).toBeVisible();
    await expect(page.getByTestId('sellers-today-detail')).toBeHidden();
    // Le bouton plein est celui de la première carte ; les autres en contour.
    const buttons = await filledShown(page);
    expect(buttons).toHaveLength(1);
    await expect(cards.first().locator('.btn-filled')).toHaveCount(1);
    await expect(page.getByTestId('shell-menu')).toBeVisible();
    await expectNoHorizontalScroll(page, 'Vendeurs (390 × 844)');
    // Son nom mène à son dossier : une page intérieure, sans menu du bas.
    await cards.filter({ hasText: 'M. et Mme Lambert-Duval' }).getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`/builder/${lambertId}$`));
    await expect(page.getByTestId('dossier-tiles')).toBeVisible();
    await expect(page.getByTestId('shell-menu')).toBeHidden();
    await expectOneFilled(page, 'Le dossier d’un vendeur (390 × 844)');
    await expectNoHorizontalScroll(page, 'Le dossier d’un vendeur (390 × 844)');
  });
});
