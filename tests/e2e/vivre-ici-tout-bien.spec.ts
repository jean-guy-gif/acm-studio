import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Mission 156 — « Vivre ici » sur tout bien d'une sélection acquéreur (planches A3-1 à A3-3), sur
// l'URL d'essai (l'interrupteur y est ouvert ; éteint en production tant que le texte A3 de
// `/confidentialite` n'est pas en ligne), avec le compte de l'agence de démonstration, remise à zéro
// d'abord. Les Wilson : un mandat signé à Antibes (A) et deux annonces du marché (B, C), une visite
// demandée sur B.
//   1. Leur fiche : « Ajouter « Vivre ici » » sous « Sa sélection », qui mène au bloc du dossier ;
//   2. le dossier acquéreur : « « Vivre ici » de chaque bien », la ligne d'information une seule fois
//      en tête, le mandat qui garde son lien, un autre site refusé, le lien d'Academia collé sur B ;
//   3. le partage du lien : la ligne d'information au-dessus des boutons ; sur un téléphone, le bloc
//      « Living here » sous B (les Wilson lisent l'anglais) ;
//   4. « Confirmer la visite » de B : le lien dans le message, la ligne d'information ;
// puis le lien est retiré (la démo n'en sème aucun ; la remise à zéro les efface aussi).

const E2E_LINK = 'https://app.myacademia.ai/l/e2e-acm.0156';

async function openWilson(page: Page): Promise<string> {
  await page.goto('/acquereurs?vue=agence');
  await page.getByRole('link', { name: 'Mr and Mrs Wilson', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('Mr and Mrs Wilson');
  return new URL(page.url()).pathname;
}

// Demain, à Paris.
const tomorrow = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() + 86_400_000),
  );

test('« Vivre ici » sur un bien hors mandat : coller, partager, confirmer la visite', async ({
  page,
}) => {
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const wilsonPath = await openWilson(page);

  try {
    await test.step('La fiche : « Ajouter « Vivre ici » » sous « Sa sélection »', async () => {
      const add = page.getByTestId('buyer-living-here-add');
      await expect(add).toHaveText('Ajouter « Vivre ici »');
      await expect(add).toHaveAttribute('href', `${wilsonPath}/dossier#vivre-ici`);
      // Un lien discret : jamais un bouton plein de plus.
      await expectOneFilled(page, 'Fiche acquéreur');
      await add.click();
      await expect(page).toHaveURL(new RegExp(`${wilsonPath}/dossier#vivre-ici$`));
    });

    const block = page.getByTestId('living-here-choices');
    const rows = block.getByTestId('living-here-row');
    await test.step('Le dossier acquéreur : le bloc, une ligne d’information, le mandat', async () => {
      await expect(block).toBeVisible();
      await expect(block).toContainText('« Vivre ici » de chaque bien');
      await expect(rows).toHaveCount(3);
      // La ligne d'information une fois, en tête du bloc, jamais sous chaque bien.
      await expect(block.getByTestId('living-here-info')).toHaveCount(1);
      await expect(block.getByTestId('living-here-info')).toHaveText(
        'iCe lien montre la rue (sans numéro) et un repère à environ 100 m.',
      );
      await expect(rows.nth(0)).toContainText('Mandat signé');
      await expect(rows.nth(0).getByTestId('living-here-mandate')).toContainText(
        'Le coller sur le bien vendeur',
      );
      await expect(rows.nth(0).getByTestId('living-here-field-input')).toHaveCount(0);
      await expect(rows.nth(1)).toContainText('Annonce du marché');
      // Démo : Academia s'ouvre sur sa présentation, sans rien copier.
      await expect(rows.nth(1).getByTestId('living-here-academia')).toContainText(
        'S’ouvre sur la présentation d’Academia.',
      );
    });

    await test.step('Coller le lien de B : un autre site refusé, puis le lien d’Academia', async () => {
      const row = rows.nth(1);
      await row
        .getByTestId('living-here-field-input')
        .fill('https://www.seloger.com/annonces/1.htm');
      await row.getByTestId('living-here-field-save').click();
      await expect(row.getByTestId('living-here-field-error')).toHaveText(
        'Collez le lien « Vivre ici » donné par Academia : il commence par https://app.myacademia.ai/l/',
      );
      await row.getByTestId('living-here-field-input').fill(E2E_LINK);
      await row.getByTestId('living-here-field-save').click();
      await expect(row.getByTestId('living-here-field-saved')).toHaveText('✓ Lien enregistré');
      await expect(row.getByTestId('living-here-field-age')).toHaveText('Collé aujourd’hui');
      await page.reload();
      await expect(rows.nth(1).getByTestId('living-here-field-input')).toHaveValue(E2E_LINK);
      await expect(rows.nth(1).getByTestId('living-here-field-open')).toHaveAttribute(
        'href',
        E2E_LINK,
      );
      // Toujours une seule ligne d'information.
      await expect(block.getByTestId('living-here-info')).toHaveCount(1);
    });

    await test.step('Partager le lien : la ligne d’information ; sur un téléphone, « Living here » sous B', async () => {
      await page
        .getByRole('button', { name: /Créer un (lien pour l’acquéreur|nouveau lien)/ })
        .first()
        .click();
      const share = page.getByTestId('dossier-link-share');
      await expect(share.getByTestId('living-here-info')).toHaveText(
        'i« Vivre ici » du bien B, sur ce lien : Ce lien montre la rue (sans numéro) et un repère à environ 100 m.',
      );
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
        if ((await visitor.getByTestId('dossier-start').count()) > 0) {
          await visitor.getByTestId('dossier-start').click();
          await visitor.getByTestId('deck-open-item').nth(1).click();
        }
        const living = visitor.getByTestId('dossier-living-here');
        await expect(living.first()).toBeVisible();
        await expect(living.first()).toHaveAttribute('href', E2E_LINK);
        await expect(living.first()).toContainText('Living here');
        // Ni la ligne d'information du conseiller, ni l'adresse de l'annonce.
        await expect(visitor.locator('body')).not.toContainText('repère à environ 100 m');
        await expect(visitor.locator('body')).not.toContainText('annonces.demonstration.invalid');
      } finally {
        await phone.close();
      }
    });

    await test.step('« Confirmer la visite » de B : le lien dans le message, la ligne d’information', async () => {
      await page.goto('/visites');
      const line = page.getByTestId('visit-line').filter({ hasText: 'Antibes' }).first();
      await line.getByTestId('visit-confirm-open').click();
      await line.getByTestId('visit-confirm-day').fill(tomorrow());
      await line.getByTestId('visit-confirm-time').fill('11:00');
      await line.getByTestId('visit-confirm-prepare').click();
      const message = line.getByTestId('visit-confirm-message');
      await expect(message).toContainText(`Living here, around the property: ${E2E_LINK}`);
      await expect(line.getByTestId('living-here-info')).toBeVisible();
      await expect(line.getByTestId('visit-confirm-living-missing')).toHaveCount(0);
    });
  } finally {
    // Le lien de l'e2e est retiré : la démo ne garde aucun lien Academia inventé.
    await page.goto(`${wilsonPath}/dossier`);
    const remove = page.getByTestId('living-here-field-remove');
    if ((await remove.count()) > 0) {
      await remove.first().click();
      await expect(page.getByTestId('living-here-field-remove')).toHaveCount(0);
    }
  }
});
