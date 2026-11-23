import { expect, test, type Page } from './test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Mission 147 (partie A) — Academia à la place du dossier d'adresse et du « Vivre ici » d'ACM, sur
// l'URL d'essai, avec le compte de l'agence de démonstration (remise à zéro d'abord) :
//   1. Bien vendeur et « Avant le rendez-vous » : la démo a l'accès à l'API (sa clé d'essai) ; depuis
//      les correctifs 161, ni « Dossier d'adresse ↗ » ni « Ventes réelles dans Academia ↗ » : tout
//      est dans ACM ; plus de dossier d'adresse construit par ACM ;
//   2. le lien client « Vivre ici » du mandat de Mougins, créé en un clic (le champ à coller n'est
//      plus que le repli quand Academia ne répond pas) ; il s'affiche sous le bien sur le lien des
//      Keller, ouvert sur un téléphone ; puis il est retiré (la démo ne sème aucun lien, M114) ;
//      Academia muette : la suite est sautée, « Academia ne répond pas » (décision du 18/11) ;
//   3. « La vente » des Keller : Dossier d'adresse et Vivre ici ;
//   4. « Confirmer la visite » (M142) des Wilson, sur une annonce : la sélection seule, en anglais.
// Le message avec le lien Academia est prouvé par les tests unitaires (aucune visite à confirmer sur
// un mandat dans la démo).

const ACADEMIA = 'https://app.myacademia.ai';
const ACADEMIA_DOWN = 'Academia ne répond pas';

async function resetDemo(page: Page): Promise<void> {
  await resetDemoByScreen(page);
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

  await test.step('Bien vendeur : « Le bien dans Academia », tout dans ACM', async () => {
    await page.goto(`/builder/${garcia}/property`);
    const card = page.getByTestId('academia-card');
    await expect(card).toContainText('Le bien dans Academia');
    await expect(card).toContainText('Pour vous seul.');
    await expect(card.getByTestId('academia-address')).toHaveCount(0);
    await expect(card.getByTestId('academia-living')).toHaveCount(0);
    // Jamais l'adresse inventée du scénario à copier.
    await expect(card).not.toContainText('Adresse copiée en un toucher');
    // Le dossier d'adresse d'ACM n'existe plus.
    await expect(page.getByTestId('address-dossier')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Construire le dossier d’adresse');
    await expectOneFilled(page, 'Bien vendeur');
  });

  await test.step('Avant le rendez-vous : plus de « Ventes réelles dans Academia ↗ »', async () => {
    await page.goto(`/builder/${garcia}/avant-rendez-vous`);
    await expect(page.getByTestId('academia-sales')).toHaveCount(0);
    await expect(page.getByTestId('real-sales-line')).toHaveCount(0);
    await expect(page.getByTestId('real-sales-missing')).toHaveCount(0);
    await expectOneFilled(page, 'Avant le rendez-vous');
  });

  try {
    let created = '';
    await test.step('Le lien « Vivre ici » du mandat de Mougins, créé en un clic', async () => {
      await page.goto(`/builder/${mougins}/property`);
      const card = page.getByTestId('academia-card');
      await card.getByTestId('living-here-create').click();
      const open = card.getByRole('link', { name: 'Ouvrir ↗' });
      let outcome = 'waiting' as 'ready' | 'failed' | 'waiting';
      try {
        await expect
          .poll(
            async () => {
              if ((await open.count()) > 0) outcome = 'ready';
              else if ((await card.getByTestId('living-here-failed').count()) > 0)
                outcome = 'failed';
              return outcome;
            },
            { timeout: 150_000, intervals: [1_000, 2_000, 5_000] },
          )
          .not.toBe('waiting');
      } catch {
        // Le délai est dépassé : Academia n'a pas répondu.
      }
      if (outcome !== 'ready') {
        // Academia muette ou en échec : le repli, et lui seul, est proposé (correctifs 161) ; seule
        // l'étape du lien des Keller est sautée, la suite ne dépend pas d'Academia.
        if (outcome === 'failed') {
          await expect(card.getByTestId('living-here-fallback')).toBeVisible();
        }
        test
          .info()
          .annotations.push({ type: 'skip', description: `${ACADEMIA_DOWN} (${outcome})` });
        return;
      }
      created = (await open.getAttribute('href')) ?? '';
      expect(created).toMatch(/^https:\/\/app\.myacademia\.ai\/l\//);
      await expect(card.getByTestId('living-here-fallback')).toHaveCount(0);
      await expectOneFilled(page, 'Bien vendeur (lien créé)');
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
      if (!created) return;
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
        await expect(living.first()).toHaveAttribute('href', created);
        await expect(living.first()).toHaveAttribute('target', '_blank');
        await expect(living.first()).toContainText('Vivre ici');
        await expect(living.first()).toContainText('Le quartier, les écoles, les commerces');
        // Ni l'adresse du bien, ni l'ancienne fiche d'ACM.
        await expect(visitor.locator('body')).not.toContainText('traverse des Terrasses Fleuries');
        await expect(visitor.locator('body')).not.toContainText('Distances depuis');
      } finally {
        await phone.close();
      }
    });
  } finally {
    // Le lien de l'e2e est retiré : la démo ne garde aucun lien Academia inventé.
    await page.goto(`/builder/${mougins}/property`);
    const remove = page.getByTestId('living-here-remove');
    if ((await remove.count()) > 0) {
      await remove.click();
      await expect(page.getByTestId('living-here-remove')).toHaveCount(0);
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
