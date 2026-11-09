import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, expectOneFilled, goViaAccountMenu, login } from './support';

// Mission 147 (partie A) — Academia à la place du dossier d'adresse et du « Vivre ici » d'ACM, sur
// l'URL d'essai, avec le compte de l'agence de démonstration (remise à zéro d'abord) :
//   1. Bien vendeur et « Avant le rendez-vous » : les liens vers Academia (la démo ouvre sa page de
//      présentation, sans copier l'adresse inventée) ; plus de dossier d'adresse ni de ligne des
//      ventes réelles d'ACM ;
//   2. le lien client « Vivre ici » collé sur le mandat de Mougins : un autre site refusé, un lien
//      d'Academia enregistré ; il s'affiche sous le bien sur le lien des Keller, ouvert sur un
//      téléphone ; puis il est retiré (la démo ne sème aucun lien, M114) ;
//   3. « La vente » des Keller : Dossier d'adresse et Vivre ici ;
//   4. « Confirmer la visite » (M142) des Wilson, sur une annonce : la sélection seule, en anglais.
// Le message avec le lien Academia est prouvé par les tests unitaires (aucune visite à confirmer sur
// un mandat dans la démo).

const ACADEMIA = 'https://app.myacademia.ai';
const E2E_LINK = 'https://app.myacademia.ai/l/e2e-acm.0147';

async function resetDemo(page: Page): Promise<void> {
  await goViaAccountMenu(page, 'Ma démo');
  await expect(page).toHaveURL(/\/ma-demo$/);
  const hrefs = () =>
    page
      .getByTestId('demo-dossier')
      .evaluateAll((items) => items.map((item) => item.querySelector('a')?.getAttribute('href')));
  const before = await hrefs();
  if (before.length === 0) {
    await page.getByRole('button', { name: 'Préparer ma démo' }).click();
  } else {
    await page.getByRole('button', { name: 'Remettre ma démo à zéro' }).click();
    await page
      .getByTestId('demo-reset-confirm')
      .getByRole('button', { name: 'Remettre à zéro' })
      .click();
    await expect.poll(async () => (await hrefs())[0], { timeout: 180_000 }).not.toBe(before[0]);
  }
  await expect(page.getByTestId('demo-dossier')).toHaveCount(6, { timeout: 180_000 });
}

async function dossierId(page: Page, stage: string, seller?: string): Promise<string> {
  await page.goto('/ma-demo');
  let rows = page.locator(`[data-testid="demo-dossier"][data-stage="${stage}"]`);
  if (seller) rows = rows.filter({ hasText: seller });
  const href = await rows.first().locator('a').getAttribute('href');
  const id = /\/builder\/([^/]+)/.exec(href ?? '')?.[1];
  expect(id, `Le dossier de démo « ${stage} » est introuvable`).toBeTruthy();
  return id as string;
}

// Demain, à Paris.
const tomorrow = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() + 86_400_000),
  );

test('Academia : les liens du conseiller, le lien « Vivre ici » collé, et « Confirmer la visite »', async ({
  page,
}) => {
  await login(page, demoCredentials());
  await resetDemo(page);
  const garcia = await dossierId(page, 'ready');
  const mougins = await dossierId(page, 'signed', 'M. Lefebvre');

  await test.step('Bien vendeur : « Le bien dans Academia », la présentation en démo', async () => {
    await page.goto(`/builder/${garcia}/property`);
    const card = page.getByTestId('academia-card');
    await expect(card).toContainText('Le bien dans Academia');
    await expect(card).toContainText('Pour vous seul.');
    await expect(card.getByTestId('academia-address')).toHaveAttribute('href', ACADEMIA);
    await expect(card.getByTestId('academia-address')).toHaveAttribute('target', '_blank');
    await expect(card.getByTestId('academia-living')).toHaveAttribute('href', ACADEMIA);
    await expect(card).toContainText('S’ouvre sur la présentation d’Academia.');
    // Jamais l'adresse inventée du scénario à copier.
    await expect(card).not.toContainText('Adresse copiée en un toucher');
    // Le dossier d'adresse d'ACM n'existe plus.
    await expect(page.getByTestId('address-dossier')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Construire le dossier d’adresse');
    await expectOneFilled(page, 'Bien vendeur');
  });

  await test.step('Avant le rendez-vous : « Ventes réelles dans Academia ↗ »', async () => {
    await page.goto(`/builder/${garcia}/avant-rendez-vous`);
    const sales = page.getByTestId('academia-sales');
    await expect(sales).toHaveText('Ventes réelles dans Academia ↗');
    await expect(sales).toHaveAttribute('href', ACADEMIA);
    await expect(page.getByTestId('real-sales-line')).toHaveCount(0);
    await expect(page.getByTestId('real-sales-missing')).toHaveCount(0);
    await expectOneFilled(page, 'Avant le rendez-vous');
  });

  try {
    await test.step('Le lien « Vivre ici » collé sur le mandat de Mougins', async () => {
      await page.goto(`/builder/${mougins}/property`);
      const field = page.getByTestId('academia-living-link');
      await expect(field).toContainText('Montré sur le lien de chaque acquéreur');
      await field
        .getByTestId('academia-living-input')
        .fill('https://www.seloger.com/annonces/1.htm');
      await field.getByTestId('academia-living-save').click();
      await expect(field.getByTestId('academia-living-error')).toHaveText(
        'Collez le lien « Vivre ici » donné par Academia : il commence par https://app.myacademia.ai/l/',
      );
      await field.getByTestId('academia-living-input').fill(E2E_LINK);
      await field.getByTestId('academia-living-save').click();
      await expect(field.getByTestId('academia-living-saved')).toHaveText('✓ Lien enregistré');
      await page.reload();
      await expect(page.getByTestId('academia-living-input')).toHaveValue(E2E_LINK);
      await expect(page.getByTestId('academia-living-remove')).toBeVisible();
      await expectOneFilled(page, 'Bien vendeur (lien collé)');
    });

    let kellerPath = '';
    await test.step('« La vente » des Keller : Dossier d’adresse et Vivre ici', async () => {
      await page.goto('/acquereurs?vue=agence');
      await page.getByRole('link', { name: 'Famille Keller', exact: true }).first().click();
      await expect(page.getByTestId('buyer-name')).toHaveText('Famille Keller');
      kellerPath = new URL(page.url()).pathname;
      const sale = page.getByTestId('buyer-sale');
      await expect(sale.getByTestId('academia-address')).toHaveText('Dossier d’adresse ↗');
      await expect(sale.getByTestId('academia-living')).toHaveText('Vivre ici ↗');
      await expect(sale.getByTestId('academia-address')).toHaveAttribute('href', ACADEMIA);
      await expect(sale).toContainText('S’ouvre sur la présentation d’Academia.');
      await expectOneFilled(page, 'Fiche acquéreur (la vente)');
    });

    await test.step('Le lien des Keller, sur un téléphone : « Vivre ici » sous le mandat', async () => {
      await page.goto(`${kellerPath}/dossier`);
      // « Créer un nouveau lien » si les Keller en ont déjà un (M122 B).
      await page
        .getByRole('button', { name: /Créer un (lien pour l’acquéreur|nouveau lien)/ })
        .first()
        .click();
      const link = (await page.getByTestId('dossier-link').innerText()).trim();
      const bypass = process.env.E2E_VERCEL_BYPASS;
      const phone = await page
        .context()
        .browser()!
        .newContext({
          viewport: { width: 390, height: 844 },
          ...(bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {}),
        });
      try {
        const visitor = await phone.newPage();
        await visitor.goto(link);
        const living = visitor.getByTestId('dossier-living-here');
        if ((await visitor.getByTestId('dossier-start').count()) > 0) {
          await visitor.getByTestId('dossier-start').click();
          await visitor.getByTestId('deck-open-item').first().click();
        }
        await expect(living.first()).toBeVisible();
        await expect(living.first()).toHaveAttribute('href', E2E_LINK);
        await expect(living.first()).toHaveAttribute('target', '_blank');
        await expect(living.first()).toContainText('Vivre ici');
        await expect(living.first()).toContainText('Le quartier, les écoles, les commerces');
        // Ni l'adresse du bien, ni l'ancienne fiche d'ACM.
        await expect(visitor.locator('body')).not.toContainText('traverse des Exemples');
        await expect(visitor.locator('body')).not.toContainText('Distances depuis');
      } finally {
        await phone.close();
      }
    });
  } finally {
    // Le lien de l'e2e est retiré : la démo ne garde aucun lien Academia inventé.
    await page.goto(`/builder/${mougins}/property`);
    const remove = page.getByTestId('academia-living-remove');
    if ((await remove.count()) > 0) {
      await remove.click();
      await expect(page.getByTestId('academia-living-remove')).toHaveCount(0);
    }
  }

  await test.step('« Confirmer la visite » des Wilson (une annonce) : la sélection seule', async () => {
    await page.goto('/visites');
    const line = page.getByTestId('visit-line').filter({ hasText: 'Antibes' }).first();
    await expect(line).toBeVisible();
    await expect(line.getByTestId('living-here-panel')).toHaveCount(0);
    await expect(line).not.toContainText('Vivre ici');
    await expectOneFilled(page, 'Visites');
    await line.getByTestId('visit-confirm-open').click();
    await line.getByTestId('visit-confirm-day').fill(tomorrow());
    await line.getByTestId('visit-confirm-time').fill('10:30');
    await line.getByTestId('visit-confirm-prepare').click();
    const message = line.getByTestId('visit-confirm-message');
    await expect(message).toContainText('Hello Mr and Mrs Wilson');
    await expect(message).toContainText('I am confirming the viewing of the flat in Antibes');
    await expect(message).toContainText(
      /Your selection: https?:\/\/\S+\/dossier\/[A-Za-z0-9_-]{43}/,
    );
    await expect(message).not.toContainText('Living here');
    await expect(message).not.toContainText('what is around it');
    await page.reload();
    await expect(
      page
        .getByTestId('visit-line')
        .filter({ hasText: 'Antibes' })
        .getByTestId('visit-scheduled')
        .first(),
    ).toContainText('Visite planifiée le');
  });
});
