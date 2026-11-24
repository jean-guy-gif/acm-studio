import { expect, test } from './test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Lancement, mission 6 (24/11) — « un seul endroit par acquéreur avec les biens envoyés, refusés et
// pourquoi, visités avec leur compte rendu, pour faire le point avec lui ». Joué sur la démo remise
// à zéro :
// - M. et Mme Rossi : une sélection présentée il y a 10 jours — l'appartement de Juan-les-Pins
//   visité (un coup de cœur, une deuxième visite à organiser), un « Peut-être », un refus pour le
//   quartier. « Son suivi » le dit en un bloc, un bien par ligne, à la place des quatre blocs
//   d'avant ;
// - M. et Mme Lambert : six biens écartés pour eux par le conseiller, repliés en fin de suivi.
// `E2E_CAPTURES=1` range une capture dans `missions/maquettes/`.

const HIDE_PREVIEW_TOOLBAR = 'vercel-live-feedback { display: none !important; }';

test.use({ realPhotos: process.env.E2E_CAPTURES === '1' });

test('son suivi : un bien par ligne, ce qu’il en a dit, ses visites', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  await page.goto('/acquereurs?vue=agence&q=rossi');
  await page.getByRole('link', { name: 'M. et Mme Rossi', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Rossi');
  const suivi = page.getByTestId('buyer-follow-up');
  await expect(suivi).toBeVisible();
  await expect(suivi.getByRole('heading', { name: 'Son suivi' })).toBeVisible();
  await expect(page.getByTestId('buyer-follow-up-summary')).toHaveText(
    '3 biens envoyés · 1 visité · 1 visite à organiser · 1 refusé',
  );
  const group = (name: string) =>
    suivi.locator(`[data-testid="buyer-follow-up-group"][data-group="${name}"]`);

  // Visité : sa visite faite et son compte rendu ; la deuxième visite a sa ligne, à organiser.
  const visited = group('visited');
  await expect(visited.getByTestId('buyer-follow-up-item')).toHaveCount(1);
  await expect(visited).toContainText('en présentation');
  await expect(visited).toContainText('Veut le visiter');
  await expect(visited.locator('[data-testid="visit-line"][data-state="done"]')).toHaveCount(1);
  await expect(visited.getByTestId('visit-report')).toContainText('Coup de cœur');
  await expect(visited.locator('[data-testid="visit-line"][data-state="pending"]')).toHaveCount(0);
  const toVisit = group('to_visit');
  await expect(toVisit.getByTestId('buyer-follow-up-item')).toHaveCount(1);
  await expect(toVisit.locator('[data-testid="visit-line"][data-state="pending"]')).toHaveCount(1);

  // En attente de sa réponse, puis refusé, avec la raison.
  await expect(group('waiting').getByTestId('buyer-follow-up-pill')).toHaveText('Peut-être');
  const refused = group('refused');
  await expect(refused.getByTestId('buyer-follow-up-item')).toHaveCount(1);
  await expect(refused).toContainText('Pas pour lui : Le quartier');
  await expect(refused.getByTestId('buyer-follow-up-pill')).toHaveText('Refusé');

  // Les quatre blocs d'avant ne se répètent pas.
  for (const old of ['buyer-answers', 'buyer-proposals', 'buyer-visits-done']) {
    await expect(page.getByTestId(old), old).toHaveCount(0);
  }
  await expect(page.getByText(/disponible|estimation/i)).toHaveCount(0);

  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await suivi.scrollIntoViewIfNeeded();
    await suivi.screenshot({ path: 'missions/maquettes/L6-son-suivi-rossi.png' });
  }

  // Un toucher sur un bien ouvre sa fiche complète ; rien n'est écrit.
  await refused.getByTestId('open-property-sheet').click();
  await expect(page.getByTestId('property-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('property-sheet')).toHaveCount(0);

  // M. et Mme Lambert : ce que le conseiller a écarté pour eux, replié en fin de suivi.
  await page.goto('/acquereurs?vue=agence&q=lambert');
  await page.getByRole('link', { name: 'M. et Mme Lambert', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Lambert');
  const dismissed = page.locator('[data-testid="buyer-follow-up-group"][data-group="dismissed"]');
  await expect(dismissed.locator('summary')).toContainText('Écartés pour lui, sans lui en parler');
  await expect(dismissed.locator('summary')).toContainText('6');
  await expect(dismissed.getByTestId('buyer-follow-up-item').first()).toBeHidden();
  await dismissed.locator('summary').click();
  await expect(dismissed.getByTestId('buyer-follow-up-item')).toHaveCount(6);
  await expect(dismissed).toContainText('Prix au-dessus du budget');
  await expect(dismissed.getByTestId('buyer-follow-up-pill').first()).toHaveText('Écarté pour lui');
});
