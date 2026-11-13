import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Mission 153 — le bon de visite et l'offre d'achat hors mandat (planches M153-1 à 3), sur l'URL
// d'essai avec le compte de l'agence de démonstration. La visite de Mr and Mrs Wilson sur une
// annonce du marché d'Antibes (vendue par une agence, sans exclusivité) : le chemin court sur
// Visites ; le bon qui demande à quel titre l'Agence intervient, puis se signe au mandat de recherche
// avec les phrases validées ; l'offre qui reprend ce titre, rappelle la répartition des honoraires à
// l'écran seulement, et se signe. Le refus de réunir un bien sous mandat et un bien hors mandat est
// prouvé par les tests de l'action (la démo n'a pas de fiche avec les deux à visiter).

async function draw(page: Page, testId: string): Promise<void> {
  const canvas = page.getByTestId(testId);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(box.x + 30 + step * 15, box.y + box.height / 2 + (step % 2 ? 18 : -18));
  }
  await page.mouse.up();
}

test('hors mandat : le bon de visite et l’offre d’achat au titre du mandat de recherche', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  const pending = () =>
    page.getByTestId('visits-pending').getByTestId('visit-line').filter({ hasText: 'Antibes' });

  await test.step('Visites : le chemin court et ce que le bon demandera', async () => {
    await page.goto('/visites');
    await expect(pending()).toHaveCount(1);
    await expect(pending().getByTestId('visit-actions')).toHaveAttribute('data-step', 'confirm');
    await expect(pending().getByTestId('visit-track')).toContainText(
      /Confirmer la visite\s*→\s*Bon de visite\s*→\s*Visite faite/,
    );
    await expect(pending().getByTestId('visit-prepare-owner-letter')).toHaveText(
      'Écrire au propriétaire',
    );
    await expect(pending().getByTestId('visit-outside-mandate')).toHaveText(
      'Hors mandat de l’agence : le bon de visite et l’offre d’achat demandent votre mandat de recherche avec Mr and Mrs Wilson, ou la collaboration du confrère.',
    );
    await expectOneFilled(page, 'Visites — hors mandat');
  });

  let wilsonUrl = '';
  await test.step('Le bon : le titre est obligatoire, puis les phrases validées', async () => {
    await page.goto('/acquereurs?vue=agence');
    await page.getByRole('link', { name: 'Mr and Mrs Wilson', exact: true }).click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}$/);
    wilsonUrl = new URL(page.url()).pathname;
    await page.goto(`${wilsonUrl}/bon-de-visite`);
    const form = page.getByTestId('voucher-form');
    await expect(form).toBeVisible();
    const outside = form.getByTestId('voucher-visit').filter({ hasText: 'Antibes' });
    // La seule visite qui a droit au bon : cochée d'office.
    await expect(outside.getByRole('checkbox')).toBeChecked();
    await expect(outside).toContainText('Annonce du marché, hors mandat de l’agence');
    // Rien de coché d'avance : le bon ne se signe pas.
    const title = outside.getByTestId('outside-title');
    await expect(title).toHaveAttribute('data-kind', '');
    await expect(title.getByTestId('outside-title-missing')).toBeVisible();
    await expect(outside.getByTestId('voucher-mandate')).toHaveCount(0);
    await expect(outside).toContainText('Prix affiché (€)');
    await title.getByTestId('outside-title-search').check();
    await title.getByTestId('outside-search-number').fill('R-2026-031');
    await title.getByTestId('outside-search-date').fill('2026-11-04');
    await expect(title.getByTestId('outside-title-missing')).toHaveCount(0);
    const address = outside.getByTestId('voucher-bien-address');
    if ((await address.inputValue()).trim() === '') {
      await address.fill('3 rue du Vieux Pressoir, 06600 Antibes');
    }
    await expect(form.getByTestId('voucher-outside-preview')).toContainText(
      /Mandat de recherche n° R-2026-031 du 04\/11\/2026 · Prix affiché : [\d\s ]+ €/,
    );
    // Mission 154 — le nom de la fiche, suggéré d'un geste, jamais rempli d'office.
    await expect(form.getByTestId('voucher-visitor-last-1')).toHaveValue('');
    // « Mr and Mrs » n'est pas un nom : le bouton annonce et ne remplit que « Wilson » ; la civilité
    // et le prénom restent à compléter, et le bon ne se signe pas sans eux (Jean-Guy, 12/11).
    await expect(form.getByTestId('voucher-take-buyer-name')).toHaveText(
      'Reprendre « Mr and Mrs Wilson » : nom « Wilson », civilité et prénom à compléter',
    );
    await form.getByTestId('voucher-take-buyer-name').click();
    await expect(form.getByTestId('voucher-visitor-last-1')).toHaveValue('Wilson');
    await expect(form.getByTestId('voucher-visitor-first-1')).toHaveValue('');
    await expect(form.getByTestId('voucher-visitor-civility-1')).toHaveValue('');
    await expect(form.getByTestId('voucher-visitor-missing-1')).toHaveText(
      'La civilité et le prénom à compléter.',
    );
    await expect(form.getByTestId('voucher-take-buyer-name')).toHaveCount(0);
    await form.getByTestId('voucher-visitor-civility-1').selectOption('M.');
    await form.getByTestId('voucher-visitor-first-1').fill('John');
    await expect(form.getByTestId('voucher-visitor-missing-1')).toHaveCount(0);
    await form
      .getByTestId('voucher-visitor-address')
      .fill('12 chemin des Figurants, 06600 Antibes');
    await form.getByTestId('voucher-approved').check();
    await draw(page, 'voucher-signature-1');
    await form.getByTestId('voucher-sign').click();
    await expect(page.getByTestId('voucher-signed')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('link', { name: 'Voir et imprimer le bon' }).click();
    const document = page.getByTestId('voucher-document');
    await expect(document).toContainText(
      "que l'Agence me présente en vertu du titre indiqué pour chacun d'eux.",
    );
    await expect(document).toContainText(
      "Je reconnais avoir confié à l'Agence un mandat de recherche, et que ces biens m'ont été présentés dans le cadre de ce mandat.",
    );
    await expect(document).not.toContainText('Numéro du mandat');
    await expect(document).not.toContainText('précisés notamment dans le mandat de vente');
  });

  // Correctif du 13/11 (essai de Jean-Guy) — la visite notée « Intéressé · On continue à chercher »,
  // puis l'acquéreur veut faire une offre : la suite se change, et l'offre d'achat le propose elle-même.
  const done = () =>
    page
      .getByTestId('visits-done')
      .getByTestId('visit-line')
      .filter({ hasText: 'Antibes' })
      .filter({ hasText: /66\sm²/ });
  await test.step('Visites : la visite faite, « On continue à chercher »', async () => {
    await page.goto('/visites');
    // Le bon signé : la ligne grise ne s'affiche plus.
    await expect(pending().getByTestId('visit-outside-mandate')).toHaveCount(0);
    await pending().getByTestId('visit-done-open').click();
    const doneForm = page.getByTestId('visit-done-form');
    await doneForm.getByTestId('visit-opinion-interested').click();
    await doneForm.getByTestId('visit-next-keep_searching').click();
    await doneForm.getByTestId('visit-done-save').click();
    await expect(page).toHaveURL(/\/visites\?messages=[0-9a-f-]{36}/);
    await expect(done().getByTestId('visit-report')).toContainText(
      'Intéressé · On continue à chercher',
    );
    await expect(done().getByTestId('visit-actions')).toHaveAttribute('data-step', 'messages');
    // La suite se change sur place : les deux autres suites, sans la suite notée.
    await done().getByTestId('visit-change-open').click();
    const change = done().getByTestId('visit-next-step-form');
    await expect(change.getByTestId('visit-change-offer')).toBeVisible();
    await expect(change.getByTestId('visit-change-second_visit')).toBeVisible();
    await expect(change.getByTestId('visit-change-keep_searching')).toHaveCount(0);
    await expectOneFilled(page, 'Visites — changer la suite');
    await change.getByRole('button', { name: 'Annuler' }).click();
    await expect(done().getByTestId('visit-next-step-form')).toHaveCount(0);
  });

  await test.step('L’offre d’achat propose de passer la visite en « Offre envisagée »', async () => {
    await page.goto(`${wilsonUrl}/offre`);
    const none = page.getByTestId('offer-none');
    await expect(none).toContainText('Suite notée : « On continue à chercher ».');
    await expect(none).not.toContainText('Marquez d’abord');
    await expectOneFilled(page, 'Offre d’achat — visite à passer en offre');
    await none.getByTestId('offer-switch').click();
    await expect(page).toHaveURL(/\/offre\?visite=[0-9a-f-]{36}$/);
    await expect(page.getByTestId('offer-form')).toBeVisible();
    // La fiche acquéreur montre la visite faite, passée en « Offre envisagée ».
    await page.goto(wilsonUrl);
    const onBuyer = page
      .getByTestId('buyer-visits-done')
      .getByTestId('visit-line')
      .filter({ hasText: /66\sm²/ });
    await expect(onBuyer.getByTestId('visit-report')).toContainText('Intéressé · Offre envisagée');
    await expect(onBuyer.getByTestId('visit-actions')).toHaveAttribute('data-step', 'offer');
  });

  await test.step('L’offre : le titre repris du bon, le rappel des honoraires, la signature', async () => {
    await page.goto('/visites');
    const offerVisit = page
      .getByTestId('visits-done')
      .getByTestId('visit-line')
      .filter({ hasText: 'Antibes' });
    await expect(offerVisit.getByTestId('visit-actions')).toHaveAttribute('data-step', 'offer');
    await offerVisit.getByTestId('visit-offer-open').click();
    const form = page.getByTestId('offer-form');
    await expect(form).toBeVisible();
    await expect(form.getByTestId('offer-property')).toContainText('hors mandat de l’agence');
    const title = form.getByTestId('outside-title');
    await expect(title).toHaveAttribute('data-kind', 'search');
    await expect(title.getByTestId('outside-search-number')).toHaveValue('R-2026-031');
    await expect(form.getByTestId('offer-mandate')).toHaveCount(0);
    // Le bien est commercialisé par une agence : le rappel, à l'écran seulement.
    await expect(form.getByTestId('offer-fees-reminder')).toHaveText(
      'Ce bien est commercialisé par une agence : vérifiez avec elle la répartition des honoraires avant de faire signer.',
    );
    const address = form.getByTestId('offer-outside-address');
    if ((await address.count()) > 0) {
      await address.fill('3 rue du Vieux Pressoir, 06600 Antibes');
    }
    // Mission 154 — le visiteur du bon, repris d'un geste ; son adresse, d'office.
    await expect(form.getByTestId('offer-address')).toHaveValue(
      '12 chemin des Figurants, 06600 Antibes',
    );
    await expect(form.getByTestId('offer-lastname-1')).toHaveValue('');
    await form.getByTestId('offer-take-visitor-1').click();
    await expect(form.getByTestId('offer-lastname-1')).toHaveValue('Wilson');
    await expect(form.getByTestId('offer-firstnames-1')).toHaveValue('John');
    await form.getByTestId('offer-birthdate-1').fill('1975-03-02');
    await form.getByTestId('offer-birthplace-1').fill('Londres');
    await form.getByTestId('offer-profession-1').fill('architecte');
    await form.getByTestId('offer-parcel-section-1').fill('AB');
    await form.getByTestId('offer-parcel-number-1').fill('214');
    await form.getByTestId('offer-parcel-area-1').fill('18 a 40 ca');
    await form.getByTestId('offer-total-area').fill('18 a 40 ca');
    await form.getByTestId('offer-fees').fill('15000');
    await form.getByTestId('offer-deposit').fill('20000');
    await form.getByTestId('offer-preview').locator('summary').click();
    const preview = form.getByTestId('offer-preview');
    await expect(preview).toContainText(
      "titulaire d'un mandat de recherche signé par l'OFFRANT le 04/11/2026, régulièrement inscrit sur son Registre des mandats sous le numéro R-2026-031",
    );
    await expect(preview).not.toContainText('Ce bien est commercialisé par une agence');
    await form.getByTestId('offer-approved').check();
    await draw(page, 'offer-signature-1');
    await form.getByTestId('offer-sign').click();
    await expect(page.getByTestId('offer-signed')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('offer-link-seller')).toContainText(
      /\/offre\/[A-Za-z0-9_-]{43}$/,
    );
    // La couverture de l'offre signée dit le titre, jamais « Mandat n° » vide (relecteur).
    await page.getByRole('link', { name: 'Voir et imprimer l’offre' }).click();
    await expect(page.getByTestId('offer-cover-mandate')).toHaveText(
      'Mandat de recherche n° R-2026-031',
    );
    await expect(page.getByTestId('offer-document')).toContainText(
      "titulaire d'un mandat de recherche signé par l'OFFRANT le 04/11/2026",
    );
  });

  // La page de l'offre signée n'a pas le menu : la remise à zéro part d'une page de l'application.
  await page.goto('/aujourdhui');
  await resetDemoByScreen(page);
});
