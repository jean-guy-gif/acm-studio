import { expect, test, type Page } from '@playwright/test';

import { expectNoHorizontalScroll, login } from './support';

// Mission 72 — le Live tient sur tablette, quoi qu'il arrive. Deux vérifications courtes,
// à part du parcours complet : la scène ne peut être décalée dans aucune taille (fenêtre et
// plein écran), et un nom d'agence long ne pousse jamais les boutons de l'en-tête.
//
// Le test réutilise l'agence de test et un seul dossier prêt, toujours le même : il le crée
// la première fois (déclaré prêt à la main, sans bien ni concurrent) et le retrouve ensuite
// dans la liste du Live.

const DOSSIER = 'TEST AUTOMATIQUE — Live tablette';
const LONG_NAME_LENGTH = 60;

const VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 1024 },
];

async function openLive(page: Page): Promise<void> {
  await login(page);
  await page.goto('/live');
  const launch = page
    .locator('li')
    .filter({ hasText: DOSSIER })
    .getByRole('link', { name: /Lancer le Live/ })
    .first();

  if ((await launch.count()) === 0) {
    await page.goto('/builder/new');
    await page.getByLabel('Nom du vendeur').fill(DOSSIER);
    await page.getByRole('button', { name: 'Créer le dossier' }).click();
    await expect(page).toHaveURL(/\/builder\/[0-9a-f-]{36}$/);
    const projectId = page.url().split('/').pop() ?? '';
    await page.goto('/builder');
    await page
      .locator('form')
      .filter({ has: page.locator(`input[name="projectId"][value="${projectId}"]`) })
      .getByRole('button', { name: 'Déclarer prêt' })
      .click();
    await page.goto('/live');
  }

  await expect(launch, `Le dossier « ${DOSSIER} » n'est pas dans la liste du Live`).toBeVisible();
  await launch.click();
  await expect(page).toHaveURL(/\/live\/[0-9a-f-]{36}/);
  await expect(page.locator('[data-stage] > header')).toBeVisible();
}

test('la scène du Live ne se décale dans aucune taille, plein écran compris', async ({ page }) => {
  await openLive(page);

  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width} × ${viewport.height}`;
    await page.setViewportSize(viewport);
    await expectNoHorizontalScroll(page, `Live en ${size}`);

    await page.getByRole('button', { name: 'Plein écran', exact: true }).click();
    const leave = page.getByRole('button', { name: 'Quitter le plein écran' });
    await expect(leave, `Le plein écran ne s'ouvre pas en ${size}`).toBeVisible();
    await expectNoHorizontalScroll(page, `Live en ${size}, plein écran`);
    await leave.click();
    await expect(page.getByRole('button', { name: 'Plein écran', exact: true })).toBeVisible();
  }
});

test('un nom d’agence de 60 caractères ne pousse pas les boutons (768 px)', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openLive(page);

  const header = page.locator('[data-stage] > header');
  // Le nom ne s'affiche en texte que si l'agence n'a pas déposé de logo.
  const name = header.locator('[title]').first();
  await expect(
    name,
    'L’en-tête du Live ne montre pas le nom de l’agence en texte : l’agence de test doit ' +
      'être sans logo.',
  ).toBeVisible();
  const fullName = (await name.getAttribute('title')) ?? '';
  expect(
    fullName.length,
    `L'agence de test s'appelle « ${fullName} » (${fullName.length} caractères) : ` +
      `renommez-la avec un nom d'au moins ${LONG_NAME_LENGTH} caractères.`,
  ).toBeGreaterThanOrEqual(LONG_NAME_LENGTH);

  // Tronqué avec des points de suspension, pas simplement rogné.
  const truncation = await name.locator('span').evaluate((element) => ({
    cut: element.scrollWidth > element.clientWidth,
    textOverflow: getComputedStyle(element).textOverflow,
  }));
  expect(truncation, 'Le nom d’agence long n’est pas tronqué').toEqual({
    cut: true,
    textOverflow: 'ellipsis',
  });

  // Les trois réglages restent entiers, dans la fenêtre, et cliquables.
  const controls = [
    header.getByRole('button', { name: /Passer en thème/ }),
    header.getByRole('button', { name: 'Plein écran', exact: true }),
    header.getByRole('link', { name: 'Quitter', exact: true }),
  ];
  for (const control of controls) {
    const label = (await control.innerText()).trim();
    const box = await control.boundingBox();
    expect(box, `Bouton « ${label} » introuvable`).not.toBeNull();
    if (!box) continue;
    expect(box.x, `« ${label} » sort à gauche`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `« ${label} » sort à droite`).toBeLessThanOrEqual(768);
    const entire = await control.evaluate(
      (element) =>
        element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight,
    );
    expect(entire, `« ${label} » est rogné ou passe à la ligne`).toBe(true);
    await control.click({ trial: true });
  }

  await expectNoHorizontalScroll(page, 'Live avec un nom d’agence long');

  // Le réglage répond vraiment : le thème bascule.
  const before = await page.locator('[data-stage]').getAttribute('data-stage');
  await controls[0].click();
  await expect(page.locator('[data-stage]')).not.toHaveAttribute('data-stage', before ?? '');
  await expectNoHorizontalScroll(page, 'Live avec un nom d’agence long, thème basculé');
});
