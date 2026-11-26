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
// La refonte, lot D (maquette REFONTE-2) — pour une fiche neuve, le même parcours a un nouvel
// écran : « Que cherche-t-il ? » (une phrase, « Dicter », « Photo de mes notes »), puis « Ce que
// j'ai compris » en pastilles à corriger, et « Trouver ses biens » à la place de « Créer la
// fiche ». Ce que la spec prouve ne change pas ; s'y ajoutent la correction d'une pastille et les
// trois tailles.

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

  await test.step('« Que cherche-t-il ? » : une phrase, « Dicter », « Photo de mes notes »', async () => {
    await page.goto('/acquereurs/nouveau');
    await expect(page.getByRole('heading', { name: 'Que cherche-t-il ?' })).toBeVisible();
    const flow = page.getByTestId('phrase-flow');
    await expect(
      page.getByText('Écrivez-le comme il vous l’a dit. Une phrase suffit.'),
    ).toBeVisible();
    await expect(flow.getByTestId('phrase-photo')).toContainText('Photo de mes notes');
    await expect(flow).toContainText('ou déposer un fichier');
    // L'avertissement validé de la lecture, avant tout envoi.
    await expect(flow.getByTestId('notes-warning')).toContainText(
      'l’outil ne la relève pas, mais elle serait envoyée.',
    );
    // Rien n'est compris avant la lecture ; un seul bouton plein.
    await expect(page.getByTestId('phrase-understood')).toHaveCount(0);
    await expect(flow.getByTestId('phrase-read')).toHaveText('Voir ce que j’ai compris');
    await expectOneFilled(page, 'Nouvel acquéreur');
    await expectNoHorizontalScroll(page, 'Nouvel acquéreur');
    // La saisie rapide (M132) reste, derrière « Saisir à la main ».
    await expect(page.getByTestId('buyer-quick-form')).toHaveCount(0);
    await flow.getByTestId('phrase-manual-open').click();
    await expect(page.getByTestId('buyer-quick-form')).toBeVisible();
    await expectOneFilled(page, 'La saisie rapide');
    await page.getByRole('button', { name: 'Revenir à la phrase' }).click();
    // « Dicter » : la dictée de l'appareil, dans la phrase.
    await flow.getByTestId('phrase-dictate').click();
    await expect(flow.getByTestId('phrase-dictate-hint')).toContainText(
      'la dictée est celle de votre appareil',
    );
    await expect(flow.getByTestId('phrase-text')).toBeFocused();
    // Les notes inventées, d'avance dans la phrase ; leur photo, à lire.
    await expect(flow.getByTestId('phrase-text')).not.toHaveValue('');
    const photo = page.getByTestId('notes-demo-photo');
    await expect(photo.getByRole('img')).toHaveJSProperty('complete', true);
    await photo.getByRole('button', { name: 'Lire cette photo' }).click();
    await expect(page.getByTestId('notes-reading')).toContainText('Lecture de vos notes…');
  });

  const understood = page.getByTestId('phrase-understood');
  const chip = (id: string) => understood.locator(`[data-testid="phrase-chip"][data-chip="${id}"]`);

  await test.step('« Ce que j’ai compris » : la fiche proposée, en pastilles à vérifier', async () => {
    await expect(understood).toBeVisible({ timeout: 20_000 });
    await expect(understood).toContainText('Ce que j’ai compris');
    await expect(understood).toContainText('Touchez pour corriger');
    await expect(page.getByTestId('notes-not-kept')).toHaveText(
      /Cette proposition n’est pas gardée : si vous quittez ou rechargez la page, elle sera perdue\./,
    );
    await expect(chip('name')).toHaveText('M. et Mme Arnaud');
    // Touchée, la pastille dit la ligne des notes d'où elle vient.
    await chip('name').click();
    const correction = page.getByTestId('chip-correction');
    await expect(correction.getByTestId('chip-input')).toHaveValue('M. et Mme Arnaud');
    await expect(correction.getByTestId('chip-source')).toHaveText(
      /^d’après : «\s*ARNAUD \(M\. et Mme\)\s*»$/,
    );
    await correction.getByRole('button', { name: 'Fermer' }).click();
    await expect(correction).toHaveCount(0);
    // L'indispensable en orange, ce qui compte pour eux en vert, le financement lu.
    await expect(chip('outdoor')).toHaveText('Indispensable : extérieur');
    await expect(chip('outdoor')).toHaveAttribute('data-tone', 'must');
    await expect(chip('financing')).toHaveText('Financement validé');
    await expect(chip('soft:calme')).toHaveText('Au calme');
    await expect(chip('soft:calme')).toHaveAttribute('data-tone', 'soft');
    await expect(page.getByTestId('proposal-skipped')).toHaveText(
      '2 mentions personnelles n’ont pas été relevées.',
    );
    // Les notes restent montrées dans la phrase ; aucune pastille ne reprend une mention personnelle.
    await expect(understood).not.toContainText(/enceinte|pressé|difficile/i);
    await expect(page.getByTestId('phrase-find')).toHaveText('Trouver ses biens');
    await expectOneFilled(page, 'Ce que j’ai compris');
    await expectNoHorizontalScroll(page, 'Ce que j’ai compris');
  });

  await test.step('Toucher pour corriger : un montant se retape, une pastille se retire', async () => {
    await chip('budgetMax').click();
    const correction = page.getByTestId('chip-correction');
    await expect(correction.getByTestId('chip-source')).toHaveText(/750 max \(idéal 700\)/);
    await correction.getByTestId('chip-input').fill('720000');
    await correction.getByTestId('chip-ok').click();
    await expect(chip('budgetMax')).toHaveText(/^Jusqu’à 720\s000\s€$/);
    await chip('soft:cachet').click();
    await page.getByTestId('chip-correction').getByTestId('chip-remove').click();
    await expect(chip('soft:cachet')).toHaveCount(0);
    // Un souhait devient indispensable, deux au plus : le second, puis plus de place.
    await chip('outdoor').click();
    await expect(page.getByTestId('chip-correction')).toContainText('Souhaité');
    await page.getByTestId('chip-correction').getByRole('button', { name: 'Fermer' }).click();
    await expectOneFilled(page, 'Ce que j’ai compris, corrigé');
  });

  await test.step('Aux trois tailles : une colonne, la phrase et les pastilles dans l’écran', async () => {
    for (const [name, viewport] of [
      ['téléphone', { width: 390, height: 844 }],
      ['tablette', { width: 1024, height: 768 }],
    ] as const) {
      await page.setViewportSize(viewport);
      await expect(understood).toBeVisible();
      await expect(chip('name')).toBeVisible();
      await expectNoHorizontalScroll(page, `Nouvel acquéreur (${name})`);
      await expectOneFilled(page, `Nouvel acquéreur (${name})`);
    }
    // Sur téléphone, une page intérieure : son retour, sans menu du bas.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('shell-menu')).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  await test.step('Quitter demande confirmation : un lien, puis « Annuler »', async () => {
    await page
      .getByTestId('new-buyer-phrase')
      .getByRole('link', { name: 'Acquéreurs', exact: true })
      .click();
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
    await expect(understood).toBeVisible();
    // Ce qui a été corrigé est toujours là.
    await expect(chip('budgetMax')).toHaveText(/^Jusqu’à 720\s000\s€$/);
  });

  let buyerId = '';
  await test.step('« Trouver ses biens » crée la fiche : « À vérifier » et « Ce qui compte pour eux »', async () => {
    await page.getByTestId('phrase-find').click();
    // La fiche est créée ; la suite est de trouver ses biens.
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}\/biens-ideaux$/, {
      timeout: 20_000,
    });
    buyerId = /\/acquereurs\/([0-9a-f-]{36})/.exec(page.url())![1];
    await expect(page.getByTestId('ideal-title')).toBeVisible();
    await page.goto(`/acquereurs/${buyerId}`);
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
    // Ce que le conseiller a corrigé est écrit tel quel ; ce qu'il a retiré n'y est pas.
    await expect(page.getByTestId('buyer-search-fold')).toContainText(/720\s000\s€/);
    await expect(page.getByTestId('buyer-soft-criteria')).not.toContainText('Du cachet');
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
