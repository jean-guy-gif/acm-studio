import { expect, test, type Page } from '@playwright/test';

import { goViaAccountMenu, login, ensureSellerMode } from './support';

// Mission 97 — le junior autonome : « Bienvenue », le dossier d'exemple, et le Live.
// Le compte de test a déjà des dossiers : il arrive donc sur la Préparation, et revient à
// « Bienvenue » par « Aide » (l'arrivée directe d'un conseiller sans dossier est prouvée par le
// test unitaire de `homeHref`). Le dossier d'exemple créé ici est archivé en fin de passage.
const EXAMPLE_NAME = 'Exemple — M. et Mme Démo';

async function archiveExamples(page: Page): Promise<void> {
  // Un exemple prêt repasse d'abord en préparation ; « Supprimer » l'archive ensuite (M93).
  // Après chaque geste, on attend que la ligne ait quitté la liste avant de regarder la suivante.
  await page.goto('/builder?prets=1');
  await expect(page.getByRole('heading', { name: 'Préparation' })).toBeVisible();
  const ready = page.locator('li').filter({ hasText: EXAMPLE_NAME });
  for (let left = await ready.count(); left > 0; left -= 1) {
    await ready.first().getByRole('button', { name: 'Remettre en préparation' }).click();
    await expect(ready).toHaveCount(left - 1);
  }
  await page.goto('/builder');
  await expect(page.getByRole('heading', { name: 'Préparation' })).toBeVisible();
  const drafts = page.locator('li').filter({ hasText: EXAMPLE_NAME });
  for (let left = await drafts.count(); left > 0; left -= 1) {
    await drafts.first().getByRole('button', { name: 'Supprimer' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(drafts).toHaveCount(left - 1);
  }
}

test('Bienvenue → dossier d’exemple → Live', async ({ page }) => {
  await login(page);
  await ensureSellerMode(page);
  // Un passage précédent interrompu aurait pu laisser un exemple : on repart propre.
  await archiveExamples(page);

  try {
    await test.step('« Aide », dans le menu de la carte, ouvre « Bienvenue »', async () => {
      await goViaAccountMenu(page, 'Aide');
      await expect(page).toHaveURL(/\/bienvenue$/);
      await expect(page.getByRole('heading', { name: /^Bienvenue/ })).toBeVisible();

      // Ce qu'il vous faut : Chrome est détecté ; l'extension et le téléphone ont un état connu.
      await expect(page.getByTestId('need-chrome')).toHaveAttribute('data-state', 'done');
      await expect(page.getByTestId('need-extension')).toHaveAttribute('data-state', /done|todo/);
      await expect(page.getByTestId('need-phone')).toHaveAttribute('data-state', /done|todo/);
      await expect(page.getByTestId('need-locator')).toContainText(
        'Facultatif : Localisateur Academia',
      );

      // Les 4 étapes.
      for (const step of [
        'Le bien du vendeur',
        'Les concurrents',
        'Avant le rendez-vous',
        'Le Live et le suivi',
      ]) {
        await expect(page.getByText(step, { exact: true })).toBeVisible();
      }
    });

    let projectUrl = '';
    await test.step('« Ouvrir le dossier d’exemple » : badge, barre d’étapes, prêt', async () => {
      await page.getByRole('button', { name: 'Ouvrir le dossier d’exemple' }).click();
      await expect(page).toHaveURL(/\/builder\/[0-9a-f-]{36}$/);
      projectUrl = page.url();
      await expect(page.getByRole('heading', { name: EXAMPLE_NAME, exact: true })).toBeVisible();
      await expect(page.getByTestId('example-badge').first()).toHaveText('Exemple');

      const steps = page.getByTestId('dossier-steps');
      await expect(steps.getByRole('link')).toHaveText([
        'Vue d’ensemble',
        'Bien vendeur',
        'Concurrents',
        'Avant le rendez-vous',
        'Live',
      ]);
      await expect(steps.getByRole('link', { name: 'Vue d’ensemble' })).toHaveAttribute(
        'aria-current',
        'page',
      );

      // Le rouvrir depuis « Bienvenue » ne crée pas un second exemple.
      await page.goto('/bienvenue');
      await page.getByRole('button', { name: 'Ouvrir le dossier d’exemple' }).click();
      await expect(page).toHaveURL(projectUrl);
    });

    await test.step('Dans les listes : badge « Exemple », et l’étape à faire', async () => {
      await page.goto('/builder?prets=1');
      const item = page.locator('li').filter({ hasText: EXAMPLE_NAME });
      await expect(item).toHaveCount(1);
      await expect(item.getByTestId('example-badge')).toBeVisible();
      // Complet : un clic mène à « Avant le rendez-vous », pas à une page d'étapes.
      await item.getByRole('link', { name: 'Ouvrir le dossier' }).click();
      await expect(page).toHaveURL(/\/avant-rendez-vous$/);
      await expect(
        page.getByTestId('dossier-steps').getByRole('link', { name: 'Avant le rendez-vous' }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('heading', { name: 'Votre décision de prix' })).toBeVisible();
      // Mission 110 — livré avec sa décision de prix d'exemple : prêt, et dans la liste du Live.
      await page.goto('/live');
      await expect(page.locator('li').filter({ hasText: EXAMPLE_NAME })).toHaveCount(1);

      // Ni la Prospection ni les compteurs du Suivi ne le connaissent.
      await page.goto('/prospection');
      await expect(page.getByText(EXAMPLE_NAME)).toHaveCount(0);
    });

    await test.step('Les concurrents fictifs : aucun mot banni, surfaces au m²', async () => {
      await page.getByRole('link', { name: /^Préparation/ }).click();
      await page.goto(`${projectUrl}/comparables`);
      await expect(page.getByRole('heading', { name: /Concurrents retenus \(5\)/ })).toBeVisible();
      const text = await page.locator('main').innerText();
      expect(text, 'Un mot banni reste à l’écran').not.toMatch(
        /comparables|apartment|\bcran\b|Biens retenus/i,
      );
      expect(text, 'Une surface garde des décimales').not.toMatch(/\d,\d+\s?m²/);
    });

    await test.step('Le mener jusqu’au Live', async () => {
      await page.goto(projectUrl);
      await page.getByTestId('dossier-steps').getByRole('link', { name: 'Live' }).click();
      // Mission 110 — le dossier d'exemple est livré avec sa décision de prix : rien à rappeler,
      // l'étape « Lancer le Live » ouvre la scène aussitôt (M107).
      await expect(page).toHaveURL(/\/live\/[0-9a-f-]{36}/);
      await page.getByRole('button', { name: 'Démarrer la présentation' }).click();
      await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
      // Devant le vendeur, le type se lit en français et la surface au m².
      await expect(page.getByText('Appartement', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/^68\sm²$/).first()).toBeVisible();
    });
  } finally {
    await archiveExamples(page);
  }

  await page.goto('/builder?prets=1');
  await expect(page.getByText(EXAMPLE_NAME), 'L’exemple du test n’a pas été archivé').toHaveCount(
    0,
  );
});
