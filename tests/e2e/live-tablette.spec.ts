import { expect, test, type Page } from '@playwright/test';

import { expectNoHorizontalScroll, login, ensureSellerMode, openAccountMenu } from './support';

// Mission 72 — le Live tient sur tablette, quoi qu'il arrive. Deux vérifications courtes,
// à part du parcours complet : la scène ne peut être décalée dans aucune taille (fenêtre et
// plein écran), et un nom d'agence long ne pousse jamais les boutons de l'en-tête.
//
// Le test crée dans l'agence de test un dossier prêt (déclaré prêt à la main, sans bien ni
// concurrent), que ses deux vérifications se partagent. Mission 104 — sans concurrent, le Live
// ne s'ouvre pas (écran de pause) : le test le vérifie, puis lui donne un bien et un concurrent. Mission 100 : il n'est plus permanent —
// le nettoyage de fin de passage le supprime, et le passage suivant le recrée.

const DOSSIER = 'TEST AUTOMATIQUE — Live tablette';
const LONG_NAME_LENGTH = 60;

const VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 1024 },
];

async function openLive(page: Page): Promise<void> {
  await login(page);
  await ensureSellerMode(page);
  await page.goto('/live');
  const item = () => page.locator('li').filter({ hasText: DOSSIER }).first();

  if ((await item().count()) === 0) {
    await page.goto('/builder/new');
    await page.getByLabel('Nom du vendeur').fill(DOSSIER);
    await page.getByRole('button', { name: 'Créer le dossier' }).click();
    await expect(page).toHaveURL(/\/builder\/[0-9a-f-]{36}$/);
    const projectId = page.url().split('/').pop() ?? '';
    await page.goto('/builder');
    const dossierForm = page
      .locator('form')
      .filter({ has: page.locator(`input[name="projectId"][value="${projectId}"]`) });
    await dossierForm.getByRole('button', { name: 'Déclarer prêt' }).click();
    // Mission 101 — le dossier est recréé à chaque passage (M100) : on attend que la déclaration
    // soit ENREGISTRÉE — l'onglet « Prêts » le montre avec « Remettre en préparation » — avant de
    // partir. Pendant l'envoi le bouton dit « … » : sa disparition ne prouve rien, et partir trop
    // tôt interrompait l'enregistrement.
    await expect(
      dossierForm.getByRole('button', { name: 'Remettre en préparation' }),
      'Le dossier n’a pas été déclaré prêt',
    ).toBeVisible();
    await page.goto('/live');
  }

  await expect(item(), `Le dossier « ${DOSSIER} » n'est pas dans la liste du Live`).toBeVisible();
  const href = await item()
    .getByRole('link', { name: 'Vérifier la préparation' })
    .getAttribute('href');
  const projectId = /\/builder\/([0-9a-f-]{36})\//.exec(href ?? '')?.[1];
  expect(projectId, 'Identifiant du dossier introuvable dans la liste du Live').toBeTruthy();

  if (
    await item()
      .getByRole('button', { name: /Lancer le Live/ })
      .isDisabled()
  ) {
    // Mission 89, 104 — sans concurrent retenu, la liste ne lance pas le Live : bouton
    // désactivé, la raison et le chemin vers les concurrents. Ouvert par son adresse, le vendeur
    // voit l'écran neutre de pause, jamais un message d'erreur.
    await expect(
      item().getByText(/Retenez au moins un concurrent pour lancer le Live/),
    ).toBeVisible();
    await expect(item().getByRole('link', { name: 'choisir les concurrents' })).toHaveAttribute(
      'href',
      `/builder/${projectId}/comparables`,
    );
    await page.goto(`/live/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}/pause$`));
    await expect(page.getByText('Rendez-vous en pause')).toBeVisible();
    await expect(page.getByText(/indisponible|erreur|introuvable/i)).toHaveCount(0);

    // Un bien vendeur et UN concurrent : de quoi ouvrir la scène.
    await page.goto(`/builder/${projectId}/property`);
    const field = (label: string) =>
      page
        .locator('label')
        .filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) })
        .locator('input');
    await page
      .locator('label')
      .filter({ has: page.locator('span', { hasText: /^Type de bien$/ }) })
      .locator('select')
      .selectOption('Appartement');
    await field('Surface').fill('65');
    await field('Ville').fill('Nice');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Enregistré', { exact: true })).toBeVisible();
    await page.goto(`/builder/${projectId}/comparables/new`);
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Enregistrer le bien concurrent' }) });
    await form.locator('input[name="title"]').fill('Concurrent tablette');
    await form.locator('input[name="city"]').fill('Nice');
    await form.locator('input[name="surface_area"]').fill('60');
    await form.locator('input[name="price"]').fill('300000');
    await form.getByRole('button', { name: 'Enregistrer le bien concurrent' }).click();
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/comparables(\\?.*)?$`));
    await page.goto('/live');
  }

  // Mission 104 — un vrai dossier, un seul concurrent : « Lancer le Live » le dit, puis demande
  // si l'on est devant le vendeur, avant d'ouvrir la scène.
  await item()
    .getByRole('button', { name: /Lancer le Live/ })
    .click();
  const confirm = item().getByTestId('live-launch-confirm');
  await expect(confirm).toContainText('Peu de concurrents : la lecture du marché sera fragile.');
  await expect(confirm).toContainText('Vous êtes devant le vendeur ?');
  await expect(confirm.getByRole('button', { name: 'Ouvrir le dossier d’exemple' })).toBeVisible();
  await confirm.getByRole('button', { name: 'Lancer devant le vendeur' }).click();
  await expect(page).toHaveURL(new RegExp(`/live/${projectId}$`));
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
    header.getByRole('button', { name: 'Quitter', exact: true }),
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

// Mission 125 — la carte du conseiller et son menu tiennent sur tablette, dans les deux sens (M72) :
// chaque entrée est dans la fenêtre, la page ne déborde pas, Échap referme.
test('la carte du conseiller et son menu tiennent sur tablette', async ({ page }) => {
  await login(page);
  await ensureSellerMode(page);
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    const size = `${viewport.width} × ${viewport.height}`;
    await page.setViewportSize(viewport);
    await page.goto('/builder');
    await expect(page.locator('nav[data-mode] a')).toHaveCount(4);
    const menu = await openAccountMenu(page);
    const entries = menu.getByRole('menuitem');
    expect(await entries.count(), `Menu de la carte vide en ${size}`).toBeGreaterThanOrEqual(5);
    for (const entry of await entries.all()) {
      const box = await entry.boundingBox();
      const label = (await entry.innerText()).trim();
      expect(box, `« ${label} » invisible en ${size}`).not.toBeNull();
      expect(box!.y, `« ${label} » sort par le haut en ${size}`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `« ${label} » sort à droite en ${size}`).toBeLessThanOrEqual(
        viewport.width,
      );
      expect(box!.y + box!.height, `« ${label} » sort par le bas en ${size}`).toBeLessThanOrEqual(
        viewport.height,
      );
    }
    await expectNoHorizontalScroll(page, `Menu de la carte en ${size}`);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
  }
});
