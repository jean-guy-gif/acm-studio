import { expect, test } from './test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Lancement, mission 2 (24/11) — « après trois visites, l'outil ne suppose plus une offre. Sans
// offre formulée, l'acquéreur reste en recherche et je continue à lui envoyer des biens. »
// Joué sur M. et Mme Rossi, de la démo : une visite faite (un coup de cœur, une deuxième visite à
// planifier), aucune offre. Leur fiche ne dit plus « Offre — à faire » : l'offre attend qu'ils en
// formulent une, et la prochaine étape n'est jamais l'offre. `E2E_CAPTURES=1` range une capture.

const HIDE_PREVIEW_TOOLBAR = 'vercel-live-feedback { display: none !important; }';

test('une visite faite ne suppose pas une offre', async ({ page }) => {
  test.setTimeout(6 * 60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  await page.goto('/acquereurs?vue=agence&q=rossi');
  await page.getByRole('link', { name: 'M. et Mme Rossi', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Rossi');

  const steps = page.getByTestId('buyer-step');
  await expect(steps).toHaveCount(5);
  // La visite est faite ; l'offre n'est ni faite, ni l'étape du jour, ni « à faire ».
  await expect(page.locator('[data-testid="buyer-step"][data-step="visit"]')).toHaveAttribute(
    'data-status',
    'done',
  );
  const offer = page.locator('[data-testid="buyer-step"][data-step="offer"]');
  await expect(offer).toHaveAttribute('data-status', 'later');
  await expect(offer).toContainText('quand il en formule une');
  await expect(offer).not.toContainText('à faire');
  await expect(page.locator('[data-testid="buyer-step"][data-step="compromise"]')).toHaveAttribute(
    'data-status',
    'later',
  );

  // La prochaine étape n'est pas l'offre : la recherche continue (ici, la deuxième visite).
  const next = page.getByTestId('buyer-next-step');
  await expect(next).toBeVisible();
  await expect(next).not.toContainText(/offre/i);

  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await page.screenshot({ path: 'missions/maquettes/L2-fiche-acquereur-sans-offre.png' });
  }
});
