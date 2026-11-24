import { expect, test } from './test';

import { demoCredentials, expectOneFilled, login, openFold, resetDemoByScreen } from './support';

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

  // Lancement, mission 10 — la fiche simplifiée : leur sélection est présentée, ses biens ne se
  // lisent plus que dans « Son suivi », qui porte ses liens ; le reste est replié ou en liens.
  await expect(page.getByTestId('ideal-selection')).toHaveCount(0);
  const selectionLinks = page.getByTestId('buyer-follow-up-links');
  await expect(selectionLinks.getByRole('link', { name: 'Changer la sélection' })).toBeVisible();
  await expect(selectionLinks.getByTestId('present-selection')).toHaveText(
    'Revoir la présentation',
  );
  await expect(selectionLinks.getByTestId('buyer-dossier')).toBeVisible();
  // Prêts à visiter : « Prêt à visiter ? » est replié, sa ligne dit l'essentiel, veille comprise.
  const readinessFold = page.getByTestId('buyer-readiness');
  await expect(readinessFold).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('buyer-readiness-line')).toContainText('financement validé');
  await expect(page.getByTestId('buyer-readiness-line')).toContainText('veille :');
  // Un toucher l'ouvre : le financement et « J'ai eu l'acquéreur aujourd'hui » sont dedans.
  await openFold(page, 'buyer-readiness');
  await expect(readinessFold.getByRole('button', { name: 'Validé' })).toBeVisible();
  // « Ce qui s'est passé » : replié, il dit combien d'événements et de quand date le dernier.
  await expect(page.getByTestId('buyer-timeline')).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('buyer-timeline-line')).toHaveText(
    /· \d+ événements?, le dernier /,
  );
  // « Autres actions » : des liens, sous la prochaine étape — jamais un second bouton plein.
  const others = page.getByTestId('buyer-other-actions');
  await expect(others).toContainText('Autres actions :');
  await expect(others.getByTestId('buyer-matches-link')).toHaveText(/^Rapprocher · /);
  await expect(others.getByTestId('buyer-voucher-new')).toHaveText('Bon de visite');
  await expect(others.getByTestId('buyer-offer-new')).toHaveText('Offre d’achat');
  await expect(others.getByTestId('buyer-edit-search')).toHaveText('Modifier sa recherche');
  await expectOneFilled(page, 'Fiche acquéreur simplifiée');
  // La prochaine étape juste sous les étapes, à toutes les largeurs : à droite sur ordinateur,
  // au-dessus de « Son suivi » sur tablette et téléphone (elle était tout en bas de la fiche).
  const top = async (testId: string) => (await page.getByTestId(testId).boundingBox())!.y;
  const left = async (testId: string) => (await page.getByTestId(testId).boundingBox())!.x;
  expect(await left('buyer-next-step')).toBeGreaterThan(await left('buyer-follow-up'));
  expect(await top('buyer-other-actions')).toBeLessThan((await top('buyer-next-step')) + 400);
  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(await top('buyer-steps'), `étapes, ${width} px`).toBeLessThan(
      await top('buyer-next-step'),
    );
    expect(await top('buyer-next-step'), `prochaine étape, ${width} px`).toBeLessThan(
      await top('buyer-follow-up'),
    );
    expect(await top('buyer-follow-up'), `autres actions, ${width} px`).toBeLessThan(
      await top('buyer-other-actions'),
    );
    if (process.env.E2E_CAPTURES === '1') {
      await page.screenshot({
        path: `missions/maquettes/L10-fiche-simplifiee-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 1100 });
  if (process.env.E2E_CAPTURES === '1') {
    await page.screenshot({
      path: 'missions/maquettes/L10-fiche-simplifiee-1280.png',
      fullPage: true,
    });
  }

  // Un toucher sur un bien ouvre sa fiche complète ; rien n'est écrit.
  await refused.getByTestId('open-property-sheet').click();
  await expect(page.getByTestId('property-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('property-sheet')).toHaveCount(0);

  // Lancement, mission 7 — le compte rendu en trente secondes, sans quitter la fiche : la deuxième
  // visite, « Visite faite », son avis, la suite, « Enregistrer » — trois touchers ; ses messages
  // s'ouvrent sur place, et « Son suivi » la range aussitôt sous « Visités ».
  await toVisit.getByRole('button', { name: 'Visite faite' }).first().click();
  const doneForm = page.getByTestId('visit-done-form');
  await expect(doneForm.getByTestId('visit-liked-light')).toHaveCount(0);
  await expect(doneForm.getByTestId('visit-done-save')).toBeDisabled();
  await doneForm.getByTestId('visit-opinion-interested').click();
  await doneForm.getByTestId('visit-next-keep_searching').click();
  // Sur la fiche, la prochaine étape reste le seul bouton plein : « Enregistrer » est en contour.
  await expect(doneForm.getByTestId('visit-done-save')).toBeEnabled();
  await expectOneFilled(page, 'Fiche acquéreur, compte rendu ouvert');
  if (process.env.E2E_CAPTURES === '1') {
    // Le fondu des couleurs fini, pour une capture nette.
    await page.waitForTimeout(400);
    await doneForm.screenshot({ path: 'missions/maquettes/L7-compte-rendu-deux-touchers.png' });
  }
  await doneForm.getByTestId('visit-done-save').click();
  await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}\?messages=[0-9a-f-]{36}/);
  await expect(page.getByTestId('visit-messages')).toBeVisible();
  if (process.env.E2E_CAPTURES === '1') {
    await expect(page.getByTestId('visit-messages')).not.toContainText('Préparation des messages');
    await page
      .locator('[data-testid="visit-line"]', { has: page.getByTestId('visit-messages') })
      .first()
      .screenshot({ path: 'missions/maquettes/L7-compte-rendu-messages-ouverts.png' });
  }
  await expect(visited.locator('[data-testid="visit-line"][data-state="done"]')).toHaveCount(2);
  await expect(group('to_visit')).toHaveCount(0);
  await expect(page.getByTestId('buyer-follow-up-summary')).toHaveText(
    '3 biens envoyés · 1 visité · 1 refusé',
  );

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
