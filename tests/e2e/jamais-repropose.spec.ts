import { expect, test } from './test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Lancement, mission 3 (24/11) — « un bien déjà envoyé, visité ou refusé n'est jamais reproposé ».
// Joué sur la démo remise à zéro :
// - les Keller ont refusé deux maisons de Mougins (« Le prix », sélection présentée il y a 21
//   jours) : leurs biens idéaux ne les ramènent plus, ni de l'agence ni du marché, et l'écran dit
//   combien de biens ne leur sont pas reproposés, et pourquoi ;
// - la famille Moreau a dit « Pas pour moi » au troisième bien de sa sélection présentée : dans
//   « Sélection actuelle », il n'est plus coché, ne se recoche pas, et l'écran le dit ;
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
    .getByRole('button', { name: 'Lancer et payer' })
    .click();
  await expect(page.getByTestId('ideal-market-summary')).toBeVisible({ timeout: 60_000 });
  const lines = page.locator(
    '[data-testid="ideal-agency-seen"], [data-testid="ideal-market-seen"]',
  );
  await expect(lines.first()).toBeVisible();
  const said = (await lines.allInnerTexts()).join(' ');
  expect(said).toMatch(/ne lui (est|sont) pas reproposés?/);
  expect(said).toMatch(/refusés?/);
  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await lines.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'missions/maquettes/L3-biens-ideaux-non-reproposes.png' });
  }

  // La famille Moreau : le bien refusé de sa sélection actuelle n'est plus coché.
  await page.goto('/acquereurs?vue=agence&q=moreau');
  await page.getByRole('link', { name: 'Famille Moreau', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('Famille Moreau');
  await page.goto(`${page.url().replace(/[?#].*$/, '')}/biens-ideaux`);
  await expect(page.getByTestId('ideal-title')).toHaveText('Les biens idéaux de Famille Moreau');
  const currentItem = (letter: string) =>
    page.locator(`[data-testid="ideal-current-item"][data-letter="${letter}"]`);
  await expect(page.getByTestId('ideal-current-item')).toHaveCount(3);
  await expect(page.getByTestId('ideal-current-seen')).toHaveCount(1);
  await expect(currentItem('C').getByTestId('ideal-current-seen')).toHaveText(
    'Refusé par lui : il ne sera pas repris dans sa prochaine sélection.',
  );
  await expect(currentItem('A').getByRole('checkbox')).toBeChecked();
  await expect(currentItem('B').getByRole('checkbox')).toBeChecked();
  await expect(currentItem('C').getByRole('checkbox')).not.toBeChecked();
  await expect(currentItem('C').getByRole('checkbox')).toBeDisabled();
  // La prochaine sélection ne le reprend pas : « Retenir » propose les deux autres.
  await expect(page.getByTestId('ideal-retain')).toHaveText('Retenir la sélection (2/3)');
  await expect(page.getByTestId('ideal-retain')).toBeEnabled();
  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await page.screenshot({ path: 'missions/maquettes/L3-selection-actuelle-refuse.png' });
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
