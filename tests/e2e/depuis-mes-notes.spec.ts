import { expect, test } from './test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectOneFilled,
  login,
  openFold,
  readNotesTraces,
} from './support';

// Mission 151 (partie A) — « Depuis mes notes » (planches 1 et 2, validées par Jean-Guy les 10 et
// 12/11), sur l'URL d'essai avec le compte de l'agence de démonstration : la lecture y est simulée
// (M114), aucun appel au vrai modèle. De la photo inventée des notes à la fiche ; la confirmation avant de quitter, sur
// un lien et sur « Annuler » ; la fiche créée porte « À vérifier » et « Ce qui compte pour eux » ;
// aucune ligne des notes montrée à la validation n'est écrite en base (lu en lecture seule).

const SOURCES = [
  'ARNAUD (M. et Mme)',
  '750 max (idéal 700)',
  'Vence / St-Paul / Tourrettes',
  'accord banque OK',
  'Jardin +++',
  'AU CALME — pas de route, pas de vis-à-vis',
];

test('depuis mes notes : la lecture, la fiche proposée, la confirmation, la fiche créée', async ({
  page,
}) => {
  test.setTimeout(6 * 60_000);
  await login(page, demoCredentials());

  await test.step('Planche 1 : « Depuis mes notes » au-dessus de la saisie rapide', async () => {
    await page.goto('/acquereurs/nouveau');
    const intake = page.getByTestId('notes-intake');
    await expect(intake).toContainText('Depuis mes notes');
    await expect(intake).toContainText('Prendre une photo');
    await expect(intake).toContainText('Déposer un fichier');
    await expect(page.getByText('ou saisissez-le en 30 secondes')).toBeVisible();
    await expectOneFilled(page, 'Nouvel acquéreur');
    // La photo inventée des notes, en premier ; « Coller un texte », prérempli, en second.
    await intake.getByRole('button', { name: /Coller un texte/ }).click();
    await expect(page.getByTestId('notes-text')).not.toHaveValue('');
    const photo = page.getByTestId('notes-demo-photo');
    await expect(photo.getByRole('img')).toHaveJSProperty('complete', true);
    await photo.getByRole('button', { name: 'Lire cette photo' }).click();
    await expect(page.getByTestId('notes-reading')).toContainText('Lecture de vos notes…');
  });

  await test.step('Planche 2 : la fiche proposée, à vérifier', async () => {
    const proposal = page.getByTestId('notes-proposal');
    await expect(proposal).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('notes-not-kept')).toHaveText(
      /Cette proposition n’est pas gardée : si vous quittez ou rechargez la page, elle sera perdue\./,
    );
    await expect(page.getByTestId('proposal-name')).toContainText('M. et Mme Arnaud');
    await expect(page.getByTestId('proposal-name')).toContainText('À vérifier');
    await expect(page.getByTestId('proposal-name')).toContainText(
      'd’après : « ARNAUD (M. et Mme) »',
    );
    await expect(page.getByTestId('proposal-outdoor')).toContainText('★');
    await expect(page.getByTestId('proposal-financing')).toContainText('Validé');
    await expect(page.getByTestId('proposal-soft')).toContainText('Au calme');
    await expect(page.getByTestId('proposal-skipped')).toHaveText(
      '2 mentions personnelles n’ont pas été relevées.',
    );
    // Les notes collées restent montrées à gauche (planche 2) ; aucune carte proposée ne les reprend.
    const fieldSections = proposal.locator('section');
    for (let index = 0; index < (await fieldSections.count()); index += 1) {
      await expect(fieldSections.nth(index)).not.toContainText(/enceinte|pressé|difficile/i);
    }
    await expectOneFilled(page, 'La fiche proposée');
    await expectNoHorizontalScroll(page, 'La fiche proposée');
  });

  await test.step('Quitter demande confirmation : un lien, puis « Annuler »', async () => {
    await page.getByRole('link', { name: '← Acquéreurs' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Quitter sans créer la fiche ?');
    await expect(dialog.getByRole('button', { name: 'Rester' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Rester' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/acquereurs\/nouveau/);
    await page.getByTestId('notes-cancel').click();
    await expect(page.getByRole('dialog')).toContainText('Quitter sans créer la fiche ?');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByTestId('notes-proposal')).toBeVisible();
  });

  let buyerId = '';
  await test.step('« Créer la fiche » : « À vérifier » et « Ce qui compte pour eux »', async () => {
    await page.getByTestId('notes-save').click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}\?enregistre=1/, { timeout: 20_000 });
    buyerId = /\/acquereurs\/([0-9a-f-]{36})/.exec(page.url())![1];
    await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Arnaud');
    // Les trois communes des notes, vérifiées sur la liste officielle, sont toutes écrites.
    for (const city of ['Vence', 'Saint-Paul-de-Vence', 'Tourrettes-sur-Loup']) {
      await expect(page.getByText(city).first(), city).toBeVisible();
    }
    await expect(page.getByTestId('buyer-to-verify')).toContainText(/À vérifier · \d+/);
    // Mission 10 bis — ses critères sont repliés, sauf tant qu'il reste des champs « À vérifier » :
    // le pli s'ouvre seul, c'est là qu'on les relit.
    await expect(page.getByTestId('buyer-search-fold')).toHaveAttribute('open', '');
    await expect(page.getByTestId('buyer-soft-criteria')).toBeVisible();
    await expect(page.getByTestId('buyer-soft-criteria')).toContainText('Au calme');
    await expect(page.getByTestId('buyer-soft-criteria')).toContainText(
      '« AU CALME — pas de route »',
    );
    await openFold(page, 'buyer-timeline');
    await expect(page.getByTestId('buyer-timeline')).toContainText('Fiche créée');
  });

  await test.step('Aucune ligne des notes n’est gardée en base (lecture seule)', async () => {
    const traces = readNotesTraces(buyerId);
    expect(traces).toContain('M. et Mme Arnaud');
    for (const source of SOURCES) expect(traces, source).not.toContain(source);
  });

  await test.step('« Tout est juste » retire les pastilles ; la fiche s’archive', async () => {
    await page
      .getByTestId('buyer-to-verify')
      .getByRole('button', { name: 'Tout est juste' })
      .click();
    await expect(page.getByTestId('buyer-to-verify')).toBeHidden();
    // Plus rien à vérifier : ses critères se replient.
    await expect(page.getByTestId('buyer-search-fold')).not.toHaveAttribute('open', '');
    // La fiche est marquée démo : la remise à zéro la retirerait ; on l'archive ici, par l'écran
    // (« Archiver » est dans « Tout le dossier »).
    await openFold(page, 'buyer-all');
    await page.getByRole('button', { name: 'Archiver', exact: true }).first().click();
    await page
      .getByTestId('buyer-archive-confirm')
      .getByRole('button', { name: 'Archiver', exact: true })
      .click();
    await expect(page).toHaveURL(/\/acquereurs(\?|$)/, { timeout: 20_000 });
  });
});
