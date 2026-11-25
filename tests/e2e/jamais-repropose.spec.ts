import { expect, test } from './test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Lancement, mission 3 (24/11) — « un bien déjà envoyé, visité ou refusé n'est jamais reproposé ».
// Joué sur la démo remise à zéro :
// - les Keller ont refusé deux maisons de Mougins (« Le prix », sélection présentée il y a 21
//   jours) : leurs biens idéaux ne les ramènent plus, ni de l'agence ni du marché, et l'écran dit
//   combien de biens ne leur sont pas reproposés, et pourquoi ;
// - la famille Moreau a dit « Pas pour moi » au troisième bien de sa sélection présentée. Suite
//   du 25/11 (Jean-Guy) : une sélection reçue n'est plus « actuelle » — rien n'est coché en
//   arrivant (0/3), ses trois biens sont à part, sous « Déjà vus avec lui », chacun avec sa
//   mention, sans case « Retenir » ;
// - M. et Mme Rossi ont visité l'appartement de Juan-les-Pins : « Proposer ce bien » le dit
//   (« déjà visité le … ») et ne les compte plus parmi les acquéreurs à qui l'envoyer.
// `E2E_CAPTURES=1` range trois captures dans `missions/maquettes/`.

const HIDE_PREVIEW_TOOLBAR = 'vercel-live-feedback { display: none !important; }';

test.use({ realPhotos: process.env.E2E_CAPTURES === '1' });

test('un bien refusé ou visité n’est pas reproposé', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  // Les Keller : leurs deux refus ne reviennent pas.
  await page.goto('/acquereurs?vue=agence&q=keller');
  await page.getByRole('link', { name: 'Famille Keller', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('Famille Keller');
  await page.goto(`${page.url().replace(/[?#].*$/, '')}/biens-ideaux`);
  await expect(page.getByTestId('ideal-title')).toHaveText('Les biens idéaux de Famille Keller');
  await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
  await page
    .getByTestId('ideal-paid-confirm')
    .getByRole('button', { name: 'Lancer la recherche' })
    .click();
  await expect(page.getByTestId('ideal-market-summary')).toBeVisible({ timeout: 60_000 });
  const lines = page.locator(
    '[data-testid="ideal-agency-seen"], [data-testid="ideal-market-seen"]',
  );
  await expect(lines.first()).toBeVisible();
  const said = (await lines.allInnerTexts()).join(' ');
  expect(said).toMatch(/retirés? parce que déjà vus? avec lui/);
  expect(said).toMatch(/refusés?/);
  // Sous le compteur de la recherche : les biens retirés parce qu'il les a déjà vus (25/11).
  const summaryBottom = (await page.getByTestId('ideal-market-summary').boundingBox())!.y;
  if ((await page.getByTestId('ideal-market-seen').count()) > 0) {
    expect((await page.getByTestId('ideal-market-seen').boundingBox())!.y).toBeGreaterThan(
      summaryBottom,
    );
  }
  // Leurs deux refus sont à part, avec leur raison.
  await expect(
    page
      .getByTestId('ideal-seen-mention')
      .filter({ hasText: /^Refusé : / })
      .first(),
  ).toBeVisible();
  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await lines.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'missions/maquettes/L3-biens-ideaux-non-reproposes.png' });
  }

  // La famille Moreau : sa sélection présentée n'est plus « actuelle ». Rien n'est coché.
  await page.goto('/acquereurs?vue=agence&q=moreau');
  await page.getByRole('link', { name: 'Famille Moreau', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('Famille Moreau');
  await page.goto(`${page.url().replace(/[?#].*$/, '')}/biens-ideaux`);
  await expect(page.getByTestId('ideal-title')).toHaveText('Les biens idéaux de Famille Moreau');
  await expect(page.getByTestId('ideal-current')).toHaveCount(0);
  await expect(page.getByTestId('ideal-retain')).toHaveText('Retenir la sélection (0/3)');
  await expect(page.getByTestId('ideal-retain')).toBeDisabled();
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);
  // « Déjà vus avec lui » : ses trois biens, chacun avec sa mention, sans case « Retenir ».
  const seenWithHim = page.getByTestId('ideal-seen');
  await expect(seenWithHim).toContainText('Déjà vus avec lui');
  await expect(seenWithHim.getByTestId('ideal-seen-item')).toHaveCount(3);
  await expect(seenWithHim.getByRole('checkbox')).toHaveCount(0);
  const mentions = await seenWithHim.getByTestId('ideal-seen-mention').allInnerTexts();
  expect(mentions.filter((mention) => /^Refusé/.test(mention))).toHaveLength(1);
  expect(mentions.filter((mention) => /^Présenté /.test(mention))).toHaveLength(2);
  // Aucun de ces trois biens ne revient dans « Ce que l'agence a déjà ».
  const seenLabels = await seenWithHim.getByTestId('open-property-sheet').allInnerTexts();
  for (const label of seenLabels) {
    await expect(page.getByTestId('ideal-agency-hit').filter({ hasText: label })).toHaveCount(0);
  }
  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await seenWithHim.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'missions/maquettes/L3b-deja-vus-avec-lui-ecran.png' });
  }

  // M. et Mme Rossi : l'appartement de Juan-les-Pins, déjà visité.
  await page.goto('/suivi');
  const href = await page
    .getByTestId('suivi-row')
    .filter({ hasText: 'Delmas' })
    .getByTestId('suivi-open-project')
    .first()
    .getAttribute('href', { timeout: 60_000 });
  const projectId = /\/builder\/([^/?#]+)/.exec(href ?? '')?.[1];
  expect(projectId, 'Le mandat de Juan-les-Pins est introuvable au Suivi').toBeTruthy();
  await page.goto(`/acquereurs/proposer?bien=${encodeURIComponent(`project:${projectId}`)}`);
  await expect(page.getByTestId('propose-title')).toBeVisible();
  const already = page.getByTestId('propose-already').filter({ hasText: 'M. et Mme Rossi' });
  await expect(already).toHaveCount(1);
  await expect(already).toContainText(/déjà visité le \d{2}\/\d{2}/);
  await expect(
    page.getByTestId('propose-candidate').filter({ hasText: 'M. et Mme Rossi' }),
  ).toHaveCount(0);
  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await page.screenshot({ path: 'missions/maquettes/L3-proposer-deja-visite.png' });
  }
});
