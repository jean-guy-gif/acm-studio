import { expect, test, type Page } from './test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Mission 151 (partie A) — la copropriété dans les biens idéaux et le rapprochement, sur l'URL
// d'essai avec le compte de l'agence de démonstration (le marché y est simulé : rien de payant).
// Les Lambert ne veulent pas de copropriété, sans ★ ; la maison des Lopez, sous mandat, est
// déclarée hors copropriété sur sa fiche ; aucune annonce ne dit la sienne. Une copropriété
// inconnue n'écarte jamais un bien : la carte dit « Copropriété : à vérifier », une seule écriture.

async function openBuyer(page: Page, name: RegExp): Promise<string> {
  await page.goto('/acquereurs?vue=agence');
  const link = page.getByRole('link', { name }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]+$/);
  return new URL(page.url()).pathname;
}

test('la copropriété : biens idéaux et rapprochement des Lambert', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  const lambertUrl = await openBuyer(page, /M\. et Mme Lambert$/);

  await test.step('Biens idéaux : le mandat hors copropriété ne dit rien, le marché « à vérifier »', async () => {
    await page.goto(`${lambertUrl}/biens-ideaux`);
    await expect(page.getByTestId('ideal-title')).toHaveText(
      'Les biens idéaux de M. et Mme Lambert',
    );
    // Les maisons sous mandat sont déclarées hors copropriété : aucune mention sur leur carte
    // (plusieurs depuis la M155). Leurs concurrents à prospecter ne disent pas la leur : « à
    // vérifier », sans être écartés.
    const agencyHits = page.getByTestId('ideal-agency-hit');
    const mandates = agencyHits.filter({ hasText: 'Mes mandats' });
    await expect(mandates.first()).toBeVisible();
    for (let index = 0; index < (await mandates.count()); index += 1) {
      await expect(mandates.nth(index)).not.toContainText('Copropriété');
    }
    const competitors = agencyHits.filter({ hasText: 'Concurrents à prospecter' });
    await expect(competitors.first()).toBeVisible();
    const competitorCount = await competitors.count();
    for (let index = 0; index < competitorCount; index += 1) {
      await expect(competitors.nth(index)).toContainText('Copropriété : à vérifier');
    }
    await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
    await page
      .getByTestId('ideal-paid-confirm')
      .getByRole('button', { name: 'Lancer la recherche' })
      .click();
    await expect(page.getByTestId('ideal-market-summary')).toBeVisible({ timeout: 60_000 });
    // Les annonces que la piscine (★) n'écarte pas sont les concurrents des Lopez, déjà montrés
    // plus haut une seule fois avec « Copropriété : à vérifier » ; aucune n'est écartée pour sa
    // copropriété, inconnue.
    const summary = page.getByTestId('ideal-market-summary');
    await expect(summary).toContainText('0 annonce comptée');
    await expect(summary).not.toContainText(/copropriété/i);
    const hits = page.getByTestId('ideal-market-hit');
    const hitCount = await hits.count();
    for (let index = 0; index < hitCount; index += 1) {
      await expect(hits.nth(index)).toContainText('Copropriété : à vérifier');
    }
    await expect(page.getByText(/À vérifier\s:/)).toHaveCount(0);
    // Aucune ligne d'écartés ne cite la copropriété. Ligne par ligne : une expression lue sur la page
    // entière attrapait le bloc « Le marché », qui porte à la fois « 9 écartés : pas de piscine (9) »
    // et, sur ses annonces, « Copropriété : à vérifier » (M155).
    const excludedLines = page.getByText(/\d+ écartés?\s:/);
    await expect(excludedLines.first()).toBeVisible();
    for (let index = 0; index < (await excludedLines.count()); index += 1) {
      await expect(excludedLines.nth(index)).not.toContainText(/copropriété/i);
    }
  });

  await test.step('Rapprochement : la copropriété de la fiche le suit, le mandat ne dit rien', async () => {
    await page.goto(`/acquereurs/rapprochement?acquereur=${lambertUrl.split('/').pop()}`);
    const panel = page.getByTestId('buyer-search');
    // Le mandat des Lopez (713 000 €) ne dit rien ; ses concurrents, « à vérifier ».
    const hits = panel.getByTestId('buyer-hit');
    const mandate = hits.filter({ hasText: /713\s000/ });
    await expect(mandate).toHaveCount(1);
    await expect(mandate).not.toContainText('Copropriété');
    await expect(hits.filter({ hasText: 'Copropriété : à vérifier' }).first()).toBeVisible();
    await expect(panel.getByText(/À vérifier\s:/)).toHaveCount(0);
  });
});
