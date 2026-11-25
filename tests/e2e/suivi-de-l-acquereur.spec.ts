import { expect, test } from './test';

import {
  demoCredentials,
  expectOneFilled,
  login,
  openFold,
  openSuiviLine,
  resetDemoByScreen,
  reveal,
} from './support';

// Lancement, mission 6 (24/11) — « un seul endroit par acquéreur avec les biens envoyés, refusés et
// pourquoi, visités avec leur compte rendu, pour faire le point avec lui ». Joué sur la démo remise
// à zéro :
// - M. et Mme Rossi : une sélection présentée il y a 10 jours — l'appartement de Juan-les-Pins
//   visité (un coup de cœur, une deuxième visite à organiser), un « Peut-être », un refus pour le
//   quartier. « Son suivi » le dit en un bloc, un bien par ligne, à la place des quatre blocs
//   d'avant ;
// - M. et Mme Lambert : six biens écartés pour eux par le conseiller, repliés dans « Tout le
//   dossier ».
// Mission 10 bis (25/11) — la même fiche, repliée : à l'ouverture, qui il est, la prochaine étape et
// « Son suivi » en lignes fermées avec leur nombre ; le reste sous « Tout le dossier ». Elle tient
// dans un écran de portable et montre au plus trois boutons.
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

  // Mission 10 bis — à l'ouverture, trois blocs. Le premier : qui il est et ce qu'il cherche — son
  // nom, son statut en simple badge, sa phrase, son téléphone ; ses critères repliés sur une ligne.
  const header = page.getByTestId('buyer-header');
  await expect(header.getByTestId('buyer-status-pill')).toHaveText('En visite');
  await expect(header.getByTestId('buyer-words')).toBeVisible();
  await expect(header.getByTestId('buyer-phone')).toBeVisible();
  await expect(page.getByTestId('buyer-search-fold')).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('buyer-search-line')).toHaveText(/^\d+ critères?/);
  await expect(page.getByTestId('buyer-criteria')).toBeHidden();
  // Le deuxième : la prochaine étape, le seul bouton plein.
  await expect(page.getByTestId('buyer-next-step')).toBeVisible();
  await expectOneFilled(page, 'Fiche acquéreur repliée, à l’ouverture');
  // Tout le reste est sous « Tout le dossier », replié : sa ligne dit ce qu'il contient.
  const all = page.getByTestId('buyer-all');
  await expect(all).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('buyer-all-line')).toContainText(
    'les cinq étapes · autres actions',
  );
  for (const folded of ['buyer-steps', 'buyer-other-actions', 'buyer-timeline', 'buyer-status']) {
    await expect(page.getByTestId(folded), folded).toBeHidden();
  }

  // Le troisième : « Son suivi », en lignes avec leur nombre.
  const suivi = page.getByTestId('buyer-follow-up');
  await expect(suivi).toBeVisible();
  await expect(suivi.getByRole('heading', { name: 'Son suivi' })).toBeVisible();
  await expect(page.getByTestId('buyer-follow-up-summary')).toHaveText(
    '3 biens envoyés · 1 visité · 1 visite à organiser · 1 refusé',
  );
  const group = (name: string) =>
    suivi.locator(`[data-testid="buyer-follow-up-group"][data-group="${name}"]`);
  const count = (name: string) => group(name).getByTestId('buyer-follow-up-count');
  await expect(suivi.getByTestId('buyer-follow-up-group')).toHaveCount(4);
  await expect(count('visited')).toHaveText('1');
  await expect(count('to_visit')).toHaveText('1');
  await expect(count('waiting')).toHaveText('1');
  await expect(count('refused')).toHaveText('1');
  // Fermées à l'ouverture : le détail d'une visite n'apparaît qu'une fois sa ligne ouverte. La
  // ligne fermée dit l'essentiel : sa dernière visite et sa suite, ce qu'il a dit de ce qui attend.
  await expect(group('visited')).not.toHaveAttribute('open', '');
  await expect(group('visited').locator('[data-testid="visit-line"]').first()).toBeHidden();
  await expect(group('visited').getByTestId('buyer-follow-up-gist')).toContainText(' · ');
  await expect(group('waiting')).not.toHaveAttribute('open', '');
  await expect(group('waiting').getByTestId('buyer-follow-up-gist')).toHaveText('1 peut-être');
  await expect(group('refused')).not.toHaveAttribute('open', '');
  await expect(group('refused').getByTestId('buyer-follow-up-item').first()).toBeHidden();
  // Seule la visite à organiser est ouverte d'elle-même : c'est là qu'on agit.
  await expect(group('to_visit')).toHaveAttribute('open', '');
  // Ce que le conseiller écarte pour lui ne se lit plus ici.
  await expect(suivi.locator('[data-group="dismissed"]')).toHaveCount(0);
  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await page.screenshot({ path: 'missions/maquettes/M10bis-fiche-repliee-rossi.png' });
  }

  // Visité : sa visite faite et son compte rendu ; la deuxième visite a sa ligne, à organiser.
  const visited = await openSuiviLine(page, 'visited');
  await expect(visited.getByTestId('buyer-follow-up-item')).toHaveCount(1);
  await expect(visited.locator('[data-testid="visit-line"]').first()).toBeVisible();
  await expect(visited).toContainText('en présentation');
  await expect(visited).toContainText('Veut le visiter');
  await expect(visited.locator('[data-testid="visit-line"][data-state="done"]')).toHaveCount(1);
  await expect(visited.getByTestId('visit-report')).toContainText('Coup de cœur');
  await expect(visited.locator('[data-testid="visit-line"][data-state="pending"]')).toHaveCount(0);
  const toVisit = group('to_visit');
  await expect(toVisit.getByTestId('buyer-follow-up-item')).toHaveCount(1);
  await expect(toVisit.locator('[data-testid="visit-line"][data-state="pending"]')).toHaveCount(1);

  // En attente de sa réponse, puis refusé, avec la raison.
  const waiting = await openSuiviLine(page, 'waiting');
  await expect(waiting.getByTestId('buyer-follow-up-pill')).toHaveText('Peut-être');
  const refused = await openSuiviLine(page, 'refused');
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

  // Mission 10 bis — « Tout le dossier » : un toucher l'ouvre, tout y est, rien n'est retiré. Leur
  // sélection est présentée : ses biens ne se lisent que dans « Son suivi », ses liens sont ici.
  await expect(page.getByTestId('ideal-selection')).toHaveCount(0);
  await openFold(page, 'buyer-all');
  await expect(page.getByTestId('buyer-steps')).toBeVisible();
  await expect(page.getByTestId('buyer-step')).toHaveCount(5);
  // « Autres actions » : des liens — jamais un second bouton plein.
  const others = page.getByTestId('buyer-other-actions');
  await expect(others).toContainText('Autres actions');
  await expect(others.getByRole('link', { name: 'Changer la sélection' })).toBeVisible();
  await expect(others.getByTestId('present-selection')).toHaveText('Revoir la présentation');
  await expect(others.getByTestId('buyer-dossier')).toBeVisible();
  await expect(others.getByTestId('buyer-matches-link')).toHaveText(/^Rapprocher · /);
  await expect(others.getByTestId('buyer-voucher-new')).toHaveText('Bon de visite');
  await expect(others.getByTestId('buyer-offer-new')).toHaveText('Offre d’achat');
  // Prêts à visiter : « Prêt à visiter ? » y est rangé, replié ; sa ligne dit l'essentiel, veille
  // comprise.
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
  // Son statut se change ici, plus en tête de fiche ; « Archiver » aussi.
  const status = page.getByTestId('buyer-status-block');
  await expect(status.getByTestId('buyer-status-badge')).toHaveText('En visite');
  await expect(status.getByRole('button', { name: 'Archiver' })).toBeVisible();
  // « Modifier sa recherche » n'apparaît qu'une fois sur la fiche : sous ses critères.
  await expect(page.getByText('Modifier sa recherche', { exact: true })).toHaveCount(1);
  await reveal(page.getByTestId('buyer-edit-search'));
  await expect(page.getByTestId('buyer-search-fold')).toHaveAttribute('open', '');
  await expect(page.getByTestId('buyer-criteria')).toBeVisible();
  await expect(page.getByTestId('buyer-edit-search')).toHaveText('Modifier sa recherche');
  await expect(page.getByTestId('buyer-form-details')).toHaveCount(0);
  await expectOneFilled(page, 'Fiche acquéreur repliée, tout ouvert');
  // Sur ordinateur, la prochaine étape est à droite de « qui il est », au-dessus de « Son suivi » ;
  // sur tablette et téléphone, les blocs se suivent : qui il est, la prochaine étape, son suivi,
  // « Tout le dossier ».
  const top = async (testId: string) => (await page.getByTestId(testId).boundingBox())!.y;
  const left = async (testId: string) => (await page.getByTestId(testId).boundingBox())!.x;
  expect(await left('buyer-next-step')).toBeGreaterThan(await left('buyer-header'));
  expect(await top('buyer-next-step')).toBeLessThan(await top('buyer-follow-up'));
  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(await top('buyer-header'), `qui il est, ${width} px`).toBeLessThan(
      await top('buyer-next-step'),
    );
    expect(await top('buyer-next-step'), `prochaine étape, ${width} px`).toBeLessThan(
      await top('buyer-follow-up'),
    );
    expect(await top('buyer-follow-up'), `son suivi, ${width} px`).toBeLessThan(
      await top('buyer-all'),
    );
    if (process.env.E2E_CAPTURES === '1') {
      await page.screenshot({
        path: `missions/maquettes/M10bis-fiche-repliee-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 1100 });
  if (process.env.E2E_CAPTURES === '1') {
    await page.screenshot({
      path: 'missions/maquettes/M10bis-fiche-repliee-tout-ouvert.png',
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
  // « Visités », ouverte plus haut par la spec, est refermée à la main : c'est la fiche qui la
  // rouvrira, pour les messages de la visite notée.
  await group('visited').locator('xpath=./summary').click();
  await expect(group('visited')).not.toHaveAttribute('open', '');
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
  // La ligne « Visités » s'est ouverte d'elle-même : ses messages y sont prêts.
  await expect(group('visited')).toHaveAttribute('open', '');
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

  // Mission 10 bis — le critère : à l'ouverture, sur un écran de portable, la fiche tient sans
  // défiler et montre au plus trois boutons. Ses visites sont faites : trois lignes, fermées.
  await page.setViewportSize({ width: 1512, height: 771 });
  await page.goto(new URL(page.url()).pathname);
  await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Rossi');
  await expect(suivi.getByTestId('buyer-follow-up-group')).toHaveCount(3);
  await expect(count('visited')).toHaveText('1');
  await expect(group('visited')).not.toHaveAttribute('open', '');
  await expect(group('visited').getByTestId('buyer-follow-up-gist')).toHaveText(
    'aujourd’hui · on continue à chercher',
  );
  await expect(all).not.toHaveAttribute('open', '');
  await expect(all).toBeInViewport({ ratio: 1 });
  const sizes = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    screen: window.innerHeight,
  }));
  expect(
    sizes.page,
    `la fiche fait ${sizes.page} px pour un écran de ${sizes.screen} px`,
  ).toBeLessThanOrEqual(sizes.screen);
  const buttons = await page
    .locator('main')
    .locator('button, a.btn-filled, a[data-testid="buyer-phone"]')
    .evaluateAll((elements) =>
      elements
        .filter((element) =>
          element.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }),
        )
        .map((element) => (element.textContent ?? '').trim()),
    );
  expect(buttons.length, `boutons à l’ouverture : ${buttons.join(' · ')}`).toBeLessThanOrEqual(3);
  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    await page.screenshot({ path: 'missions/maquettes/M10bis-fiche-repliee-portable.png' });
  }
  await page.setViewportSize({ width: 1280, height: 1100 });

  // M. et Mme Lambert : ce que le conseiller a écarté pour eux, dans « Tout le dossier », replié.
  await page.goto('/acquereurs?vue=agence&q=lambert');
  await page.getByRole('link', { name: 'M. et Mme Lambert', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Lambert');
  await expect(page.getByTestId('buyer-all-line')).toContainText('6 écartés pour lui');
  await expect(page.getByTestId('buyer-follow-up').locator('[data-group="dismissed"]')).toHaveCount(
    0,
  );
  await openFold(page, 'buyer-all');
  const dismissed = page.locator('[data-testid="buyer-follow-up-group"][data-group="dismissed"]');
  await expect(dismissed.locator('summary')).toContainText('Écartés pour lui, sans lui en parler');
  await expect(dismissed.locator('summary')).toContainText('6');
  await expect(dismissed.getByTestId('buyer-follow-up-item').first()).toBeHidden();
  await dismissed.locator('summary').click();
  await expect(dismissed.getByTestId('buyer-follow-up-item')).toHaveCount(6);
  await expect(dismissed).toContainText('Prix au-dessus du budget');
  await expect(dismissed.getByTestId('buyer-follow-up-pill').first()).toHaveText('Écarté pour lui');
});
