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
// derrière « Tous mes acquéreurs ». Joué sur la démo, remise à zéro ; deux messages y sont préparés
// (un lien chacun), rien n'est noté ni envoyé.

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

  // La refonte, lot F (Jean-Guy, 26/11) — un même chiffre partout : le badge d'« Aujourd'hui » est
  // le nombre de tâches que liste la page ; « N choses à faire » d'Acquéreurs, sa part (l'Urgent,
  // les offres, et le bloc Acquéreurs), comptée pareil.
  let buyersShare = 0;
  await test.step('Un même chiffre partout : le badge, « Aujourd’hui » et Acquéreurs', async () => {
    await page.goto('/aujourdhui');
    const blocks = await page.getByTestId('today-block').evaluateAll((elements) =>
      elements.map((element) => ({
        key: element.getAttribute('data-block'),
        tasks: [...element.querySelectorAll('[data-testid="today-line"]')].reduce(
          (total, line) => total + Number(line.getAttribute('data-tasks') ?? 0),
          0,
        ),
      })),
    );
    const total = blocks.reduce((sum, block) => sum + block.tasks, 0);
    expect(total, 'La démo a des tâches aujourd’hui').toBeGreaterThan(1);
    await expect(page.getByTestId('today-summary')).toHaveText(
      `${total} choses à faire, la plus urgente en premier.`,
    );
    await expect(page.getByTestId('today-count')).toHaveText(String(total));
    buyersShare = blocks
      .filter((block) => block.key === 'urgent' || block.key === 'buyers')
      .reduce((sum, block) => sum + block.tasks, 0);
  });

  await test.step('Ordinateur : la liste à gauche, le détail de la première personne à droite', async () => {
    await sideNav(page)
      .getByRole('link', { name: /^Acquéreurs/ })
      .click();
    await expect(page).toHaveURL(/\/acquereurs$/);
    const rows = page.getByTestId('person-row');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count, 'La démo a plusieurs acquéreurs à traiter aujourd’hui').toBeGreaterThanOrEqual(4);
    // Une carte par personne : personne ne paraît deux fois.
    const names = await rows.getByTestId('person-name').allInnerTexts();
    expect(new Set(names).size).toBe(names.length);
    // Les cartes du téléphone sont là, cachées : la même liste.
    await expect(page.getByTestId('task-card')).toHaveCount(count);
    await expect(page.getByTestId('task-card').first()).toBeHidden();
    // Le nombre dit sa part des tâches d'« Aujourd'hui », comptée pareil (lot F) : une tâche qui
    // concerne deux acquéreurs a deux cartes, mais compte une fois.
    const more = await page.getByTestId('task-card').getByTestId('buyers-today-other').count();
    expect(more, 'Dans la démo, quelqu’un a plusieurs choses à faire').toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId('buyers-today-count')).toHaveText(
      `${buyersShare} choses à faire aujourd’hui`,
    );
    // Les initiales viennent des noms de famille (lot F) : jamais « M. », « Mme » ni « Famille ».
    const mark = (name: string) => rows.filter({ hasText: name }).getByTestId('person-mark');
    await expect(mark('Famille Keller')).toHaveText('K');
    await expect(mark('M. Girard et Mme Chevalier')).toHaveText('GC');
    await expect(mark('M. et Mme Rossi')).toHaveText('R');

    // La réponse du vendeur à l'offre des Keller est en tête (M138) ; elle est choisie d'emblée.
    await expect(rows.first().getByTestId('person-name')).toHaveText('Famille Keller');
    await expect(rows.first().getByTestId('person-task')).toHaveText(
      /^Offre acceptée par le vendeur le \d{2}\/\d{2}$/,
    );
    await expect(rows.first()).toHaveAttribute('aria-current', 'true');
    const detail = page.getByTestId('buyers-today-detail');
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
    await expect(detail.getByTestId('buyers-today-task')).toContainText('Offre acceptée');
    // Un seul bouton plein, et il y en a un : le premier geste de la personne choisie.
    expect(await filledShown(page)).toEqual(['Prévenir l’acquéreur']);
    // Pas de bien à voir (lot F) : sous ce qu'il y a à faire, sa prochaine étape et ses trois
    // chiffres, ceux de sa fiche repliée ; la prochaine étape ne prend pas le bouton plein.
    const next = detail.getByTestId('buyer-next-step');
    await expect(next).toContainText('Prochaine étape', { timeout: 30_000 });
    await expect(next.locator('h2')).toHaveText('Lancer le compromis');
    await expect(detail.getByTestId('buyer-today-tiles').locator(':scope > div')).toHaveCount(3);
    await expect(detail.getByTestId('buyer-today-tile-visited')).toContainText('Visités');
    await expect(detail.getByTestId('buyer-today-tile-waiting')).toContainText(
      'Envoyés, en attente',
    );
    await expect(detail.getByTestId('buyer-today-tile-refused')).toContainText('Refusés');
    expect(await filledShown(page)).toEqual(['Prévenir l’acquéreur']);
    await expectOneFilled(page, 'Acquéreurs, à faire aujourd’hui (ordinateur)');
    await expectNoHorizontalScroll(page, 'Acquéreurs, à faire aujourd’hui (1440 × 900)');

    // Une visite demandée sur un mandat et un bien à proposer font une carte par ACQUÉREUR : la
    // tâche du mandat porte ses acquéreurs, et dit le bien.
    const moreau = rows.filter({ hasText: 'Famille Moreau' });
    await expect(moreau.getByTestId('person-task')).toHaveText(
      /^Visite demandée : la maison de \p{Lu}/u,
    );
    const proposed = rows.getByTestId('person-task').filter({ hasText: /^Un bien à proposer/ });
    expect(await proposed.count()).toBeGreaterThanOrEqual(2);
    for (const text of await proposed.allInnerTexts()) {
      expect(text).toMatch(/^Un bien à proposer : la maison de .+ \(\d+\sm², [\d\s]+€\)$/);
    }
    // Rien de dû n'est caché derrière la première tâche : la ligne dit qu'il y en a d'autres.
    await expect(moreau.getByTestId('person-also')).toHaveText(/^\+ \d+ autres? choses? à faire$/);
  });

  await test.step('Choisir une autre personne ne quitte pas la page', async () => {
    const lambert = page.getByTestId('person-row').filter({ hasText: 'M. et Mme Lambert' });
    await expect(lambert.getByTestId('person-task')).toContainText(/^Sélection envoyée le /);
    await expect(lambert.getByTestId('task-late')).toContainText('en retard');
    // Le détail de la personne d'avant est marqué : il ne doit pas servir à la suivante.
    const before = page.getByTestId('buyers-today-detail');
    await before.evaluate((element) => element.setAttribute('data-probe', 'keller'));
    await lambert.click();
    await expect(page).toHaveURL(/\/acquereurs\?personne=[0-9a-f-]{36}$/);
    await expect(lambert).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('person-row').first()).not.toHaveAttribute(
      'aria-current',
      'true',
    );
    const detail = page.getByTestId('buyers-today-detail');
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('M. et Mme Lambert');
    // Un détail NEUF par personne (relecture du lot B) : sans cela, le geste ouvert pour l'une —
    // son message préparé, « J'ai relancé » — restait affiché sous le nom de la suivante.
    await expect(page.locator('[data-testid="buyers-today-detail"][data-probe]')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('personne')).toBe(
      await detail.getAttribute('data-person'),
    );
    // Son geste est celui d'« Aujourd'hui » (la relance sur place, M135), en bouton plein : le seul.
    const relaunch = detail.getByTestId('buyer-relaunch-open');
    await expect(relaunch).toHaveText('Relancer');
    expect(await filledShown(page)).toEqual(['Relancer']);
    await relaunch.click();
    await expect(detail.getByTestId('buyer-relaunch-panel')).toBeVisible();
    // Le geste ouvert prend la largeur de la carte : il ne tient pas dans la colonne du bouton.
    const card = (await detail.getByTestId('buyers-today-task').boundingBox())!;
    const panel = (await detail.getByTestId('buyer-relaunch-panel').boundingBox())!;
    expect(panel.width).toBeGreaterThan(card.width * 0.8);

    // Revenir à la première personne, puis à celle-ci : son geste est refermé, le détail est neuf.
    await page.getByTestId('person-row').first().click();
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('Famille Keller');
    await expect(detail.getByTestId('buyer-relaunch-panel')).toHaveCount(0);
    await lambert.click();
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('M. et Mme Lambert');
    await expect(detail.getByTestId('buyer-relaunch-open')).toBeVisible();

    // Une personne qui a deux choses à faire les a toutes les deux, la seconde en contour.
    const moreau = page.getByTestId('person-row').filter({ hasText: 'Famille Moreau' });
    await moreau.click();
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('Famille Moreau');
    const others = detail.getByTestId('buyers-today-other');
    const noted = Number(/\d+/.exec(await moreau.getByTestId('person-also').innerText())?.[0]);
    await expect(others).toHaveCount(noted);
    await expect(others.filter({ hasText: 'un point à proposer' })).toHaveCount(1);
    // Chacune a son geste, en contour : le seul bouton plein est celui de sa première tâche.
    for (const other of await others.all()) {
      await expect(other.locator('a, button').first()).toBeVisible();
    }
    expect(await filledShown(page)).toEqual(['Organiser la visite']);
    await lambert.click();
    await expect(detail.getByTestId('buyers-today-name')).toHaveText('M. et Mme Lambert');
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

  await test.step('La vue : « Mes fiches » ou « Toute l’agence », et ce que compte le lien', async () => {
    // Remarques de Jean-Guy (26/11) — le compte de démonstration est manager : il choisit sa vue,
    // comme sur « Aujourd'hui » ; le lien d'en bas dit ce qu'il compte et ouvre la liste dans la
    // même vue.
    const scope = page.getByTestId('buyers-scope');
    const all = page.getByTestId('buyers-all-link');
    await expect(scope.getByRole('link', { name: 'Mes fiches' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(all).toContainText(/^Tous mes acquéreurs\s*\d+/);
    const mine = Number((await all.innerText()).replace(/\D/g, ''));
    await scope.getByRole('link', { name: 'Toute l’agence' }).click();
    await expect(page).toHaveURL(/\/acquereurs\?agence=1$/);
    await expect(page.getByTestId('buyers-today')).toBeVisible();
    await expect(all).toContainText(/^Tous les acquéreurs de l’agence\s*\d+/);
    expect(Number((await all.innerText()).replace(/\D/g, ''))).toBeGreaterThanOrEqual(mine);
    await expect(page.getByTestId('person-row').first()).toHaveAttribute('href', /agence=1/);
    await expectOneFilled(page, 'Acquéreurs, toute l’agence');
    await all.click();
    await expect(page).toHaveURL(/\/acquereurs\?vue=agence$/);
    await expect(page.getByTestId('buyer-view-agency')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/acquereurs');
    await expect(scope.getByRole('link', { name: 'Mes fiches' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  await test.step('« Tous mes acquéreurs » : la liste entière, et son retour', async () => {
    const all = page.getByTestId('buyers-all-link');
    await expect(all).toContainText('Tous mes acquéreurs');
    await all.click();
    await expect(page).toHaveURL(/\/acquereurs\?tous=1$/);
    await expect(page.getByTestId('buyer-row').first()).toBeVisible();
    await expect(page.getByTestId('buyer-view-mine')).toHaveAttribute('aria-pressed', 'true');
    await expectOneFilled(page, 'Tous mes acquéreurs');
    // La liste garde son adresse (relecture du lot B) : un filtre posé puis retiré, la page
    // actualisée, c'est toujours la liste — pas « à faire aujourd'hui ».
    await page.getByTestId('buyer-filter-ready').click();
    await expect(page).toHaveURL(/etat=ready/);
    await page.getByTestId('buyer-filter-all').click();
    await expect(page).toHaveURL(/\/acquereurs\?tous=1$/);
    await page.reload();
    await expect(page.getByTestId('buyer-row').first()).toBeVisible();
    await expect(page.getByTestId('buyers-today')).toHaveCount(0);
    await page.getByTestId('buyers-back-to-today').click();
    await expect(page).toHaveURL(/\/acquereurs$/);
    await expect(page.getByTestId('person-row').first()).toBeVisible();
  });

  await test.step('Tablette, dans les deux sens : la colonne d’icônes, la liste, le détail', async () => {
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
    ]) {
      const size = `${viewport.width} × ${viewport.height}`;
      await page.setViewportSize(viewport);
      await page.goto('/acquereurs');
      await expect(sideNav(page).getByRole('link')).toHaveCount(5);
      await expect(page.getByTestId('person-row').first()).toBeVisible();
      await expect(page.getByTestId('buyers-today-detail')).toBeVisible();
      await expect(page.getByTestId('task-card').first()).toBeHidden();
      // La liste et le détail tiennent côte à côte.
      const list = (await page.getByTestId('person-row').first().boundingBox())!;
      const detail = (await page.getByTestId('buyers-today-detail').boundingBox())!;
      expect(detail.x, size).toBeGreaterThanOrEqual(list.x + list.width);
      expect(await filledShown(page), size).toEqual(['Prévenir l’acquéreur']);
      await expectNoHorizontalScroll(page, `Acquéreurs, à faire aujourd’hui (${size})`);
      // En portrait, le détail est étroit : « Ouvrir sa fiche » passe sous le nom et la recherche,
      // qui gardent la largeur ; en paysage, il reste à leur droite.
      const name = (await page.getByTestId('buyers-today-name').boundingBox())!;
      const open = (await page.getByTestId('buyers-today-open').boundingBox())!;
      if (viewport.width < 1024) expect(open.y, size).toBeGreaterThan(name.y + name.height);
      else expect(open.x, size).toBeGreaterThan(name.x + name.width);
    }
  });

  await test.step('Téléphone : une colonne de cartes, un seul bouton plein, le menu en bas', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/acquereurs');
    const cards = page.getByTestId('task-card');
    await expect(cards.first()).toBeVisible();
    await expect(page.getByTestId('person-row').first()).toBeHidden();
    await expect(page.getByTestId('buyers-today-detail')).toBeHidden();
    await expect(sideNav(page).getByRole('link')).toHaveCount(4);
    // Un seul bouton plein : le premier geste de la première carte.
    expect(await filledShown(page)).toEqual(['Prévenir l’acquéreur']);
    await expectNoHorizontalScroll(page, 'Acquéreurs, à faire aujourd’hui (390 × 844)');

    // Les mêmes blocs qu'à droite sur ordinateur : la seconde chose à faire d'une personne est
    // dans sa carte, avec son geste, en contour.
    const moreau = cards.filter({ hasText: 'Famille Moreau' });
    const others = moreau.getByTestId('buyers-today-other');
    expect(await others.count()).toBeGreaterThanOrEqual(1);
    await expect(others.filter({ hasText: 'un point à proposer' })).toHaveCount(1);
    for (const other of await others.all()) {
      await expect(other.locator('a, button').first()).toBeVisible();
    }

    // Un geste ouvert ne fait pas un second bouton plein (relecture du lot B). Le message de la
    // première carte, ouvert : son bouton reste le seul plein.
    const keller = cards.first();
    await keller.getByTestId('offer-answer-buyer').click();
    await expect(keller.getByTestId('offer-answer-message-buyer')).toBeVisible({ timeout: 30_000 });
    expect(await filledShown(page)).toEqual(['Prévenir l’acquéreur']);
    // La relance d'une autre carte, ouverte jusqu'à « J'ai relancé » : il reste en contour.
    const lambert = cards.filter({ hasText: 'M. et Mme Lambert' });
    await lambert.getByTestId('buyer-relaunch-open').click();
    await lambert.getByTestId('buyer-relaunch-prepare').click();
    await expect(lambert.getByTestId('buyer-relaunch-message')).toBeVisible({ timeout: 30_000 });
    await expect(lambert.getByTestId('buyer-relaunch-record')).toBeVisible();
    expect(await filledShown(page)).toEqual(['Prévenir l’acquéreur']);
    await expectNoHorizontalScroll(page, 'Acquéreurs, deux gestes ouverts (390 × 844)');

    // La personne mène à sa fiche : une page intérieure, sans menu, avec son retour.
    await lambert.getByTestId('task-card-person').click();
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
