import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Mission 153 — le bon de visite et l'offre d'achat hors mandat (planches M153-1 à 3), sur l'URL
// d'essai avec le compte de l'agence de démonstration. La visite des Keller sur l'annonce de
// Mouans-Sartoux (une annonce du marché, vendue par une agence, sans exclusivité) : le chemin court
// sur Visites ; le bon qui demande à quel titre l'Agence intervient, refuse de réunir un bien sous
// mandat, puis se signe au mandat de recherche avec les phrases validées ; l'offre qui reprend ce
// titre, rappelle la répartition des honoraires à l'écran seulement, et se signe.

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

  const visitC = () =>
    page
      .getByTestId('visits-pending')
      .getByTestId('visit-line')
      .filter({ hasText: 'Mouans-Sartoux' });

  await test.step('Visites : le chemin court et ce que le bon demandera', async () => {
    await page.goto('/visites');
    await expect(visitC()).toHaveCount(1);
    await expect(visitC().getByTestId('visit-actions')).toHaveAttribute('data-step', 'confirm');
    await expect(visitC().getByTestId('visit-track')).toContainText(
      /Confirmer la visite\s*→\s*Bon de visite\s*→\s*Visite faite/,
    );
    await expect(visitC().getByTestId('visit-prepare-owner-letter')).toHaveText(
      'Écrire au propriétaire',
    );
    await expect(visitC().getByTestId('visit-outside-mandate')).toHaveText(
      'Hors mandat de l’agence : le bon de visite et l’offre d’achat demandent votre mandat de recherche avec la famille Keller, ou la collaboration du confrère.',
    );
    await expectOneFilled(page, 'Visites — hors mandat');
  });

  let kellerUrl = '';
  await test.step('Le bon : à quel titre, jamais avec un bien sous mandat', async () => {
    await page.goto('/acquereurs?vue=agence');
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}$/);
    kellerUrl = new URL(page.url()).pathname;
    await page.goto(`${kellerUrl}/bon-de-visite`);
    const form = page.getByTestId('voucher-form');
    await expect(form).toBeVisible();
    // Le mandat de l'agence (Mougins) est la seule visite sous mandat : cochée d'office.
    const mandate = form
      .getByTestId('voucher-visit')
      .filter({ has: page.getByRole('checkbox', { checked: true }) });
    const outside = form.getByTestId('voucher-visit').filter({ hasText: 'Mouans-Sartoux' });
    // Le mandat de l'agence est coché d'office : l'annonce ne se coche pas avec lui.
    await expect(mandate).toHaveCount(1);
    await expect(outside.getByRole('checkbox')).toBeDisabled();
    await expect(outside.getByTestId('voucher-mixed')).toHaveText(
      'Un bien hors mandat se signe sur un bon à part.',
    );
    const mandateBox = mandate.getByRole('checkbox');
    const mandateLabel = (await mandate.locator('label').first().innerText()).trim();
    await mandateBox.uncheck();
    await outside.getByRole('checkbox').check();
    await expect(
      form.getByTestId('voucher-visit').filter({ hasText: mandateLabel }).getByRole('checkbox'),
    ).toBeDisabled();
    // Le titre est obligatoire : rien de coché, le bon ne se signe pas.
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
      await address.fill('8 allée des Cistes Blancs, 06370 Mouans-Sartoux');
    }
    await expect(form.getByTestId('voucher-outside-preview')).toContainText(
      /Mandat de recherche n° R-2026-031 du 04\/11\/2026 · Prix affiché : [\d\s\u202f]+ €/,
    );
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

  await test.step('Visites : la visite faite, « Offre envisagée »', async () => {
    await page.goto('/visites');
    // Le bon signé : la ligne grise ne s'affiche plus.
    await expect(visitC().getByTestId('visit-outside-mandate')).toHaveCount(0);
    await visitC().getByTestId('visit-done-open').click();
    const doneForm = page.getByTestId('visit-done-form');
    await doneForm.getByTestId('visit-opinion-love').click();
    await doneForm.getByTestId('visit-next-offer').click();
    await doneForm.getByTestId('visit-done-save').click();
    await expect(page).toHaveURL(/\/visites\?messages=[0-9a-f-]{36}/);
  });

  await test.step('L’offre : le titre repris du bon, le rappel des honoraires, la signature', async () => {
    const offerVisit = page
      .getByTestId('visits-done')
      .getByTestId('visit-line')
      .filter({ hasText: 'Mouans-Sartoux' });
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
      await address.fill('8 allée des Cistes Blancs, 06370 Mouans-Sartoux');
    }
    await form.getByTestId('offer-parcel-section-1').fill('AB');
    await form.getByTestId('offer-parcel-number-1').fill('214');
    await form.getByTestId('offer-parcel-area-1').fill('18 a 40 ca');
    await form.getByTestId('offer-total-area').fill('18 a 40 ca');
    await form.getByTestId('offer-fees').fill('60000');
    await form.getByTestId('offer-deposit').fill('80000');
    await form.getByTestId('offer-preview').locator('summary').click();
    const preview = form.getByTestId('offer-preview');
    await expect(preview).toContainText(
      "titulaire d'un mandat de recherche signé par l'OFFRANT le 04/11/2026, régulièrement inscrit sur son Registre des mandats sous le numéro R-2026-031",
    );
    await expect(preview).not.toContainText('Ce bien est commercialisé par une agence');
    await form.getByTestId('offer-approved').check();
    const offrants = await form.locator('[data-testid^="offer-signature-"]').count();
    for (let index = 1; index <= offrants; index += 1) {
      await draw(page, `offer-signature-${index}`);
    }
    await form.getByTestId('offer-sign').click();
    await expect(page.getByTestId('offer-signed')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('offer-link-seller')).toContainText(
      /\/offre\/[A-Za-z0-9_-]{43}$/,
    );
  });

  await resetDemoByScreen(page);
});
