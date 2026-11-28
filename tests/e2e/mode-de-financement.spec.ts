import { expect, test } from './test';

import { demoCredentials, login, resetDemoByScreen, reveal } from './support';

// Lot B (Jean-Guy, 27/11) — « Comment finance-t-il ? » sur la fiche acquéreur, sous l'état du
// financement (planche missions/maquettes/lot-b/LB2-comment-finance-t-il.png). Joué sur la démo
// remise à zéro :
// - M. Fontaine : avec prêt, sans accord encore (apport 120 000 €, prêt 650 000 €) ; le prêt se
//   corrige et se garde ; repasser en « Comptant » efface le prêt, l'écran le demande d'abord ;
// - M. et Mme Rossi : « Pas encore dit », comme toutes les fiches d'avant le lot B.
// Lot B3 — l'offre d'achat selon comment il finance : les Rossi, la question d'abord, avant tout
// champ ; M. Fontaine, avec prêt, l'offre bloquée, le message de Jean-Guy mot pour mot ; la famille
// Keller, comptant, l'offre d'aujourd'hui.
// `E2E_CAPTURES=1` range les captures aux trois tailles dans `missions/maquettes/lot-b/`.

const HIDE_PREVIEW_TOOLBAR = 'vercel-live-feedback { display: none !important; }';
const SIZES = [
  { key: 'telephone', width: 390, height: 844 },
  { key: 'tablette', width: 820, height: 1180 },
  { key: 'ordinateur', width: 1512, height: 771 },
] as const;

test('comment il finance : le mode, le prêt, gardés sur la fiche', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  // M. Fontaine : pas encore prêt, « Prêt à visiter ? » est ouvert à l'arrivée.
  await page.goto('/acquereurs?vue=agence&q=fontaine');
  await page.getByRole('link', { name: 'M. Fontaine', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('M. Fontaine');
  const fontaine = page.url();
  const mode = page.getByTestId('buyer-financing-mode');
  await reveal(mode);
  const choice = (name: string) => mode.getByRole('button', { name, exact: true });
  const loan = page.getByTestId('buyer-loan');
  const contribution = page.getByTestId('buyer-loan-contribution');
  const amount = page.getByTestId('buyer-loan-amount');
  const agreement = (name: 'Oui' | 'Non') =>
    page.getByTestId('buyer-loan-agreement').getByRole('button', { name, exact: true });
  const save = page.getByTestId('buyer-loan-save');

  // Sous l'état du financement (En cours), la question et son prêt, tels que la démo les pose.
  await expect(
    page.getByTestId('buyer-financing').getByRole('button', { name: 'En cours' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(mode).toContainText('Comment finance-t-il');
  await expect(choice('Avec prêt')).toHaveAttribute('aria-pressed', 'true');
  await expect(loan).toBeVisible();
  await expect(contribution).toHaveValue(/^120\s000$/);
  await expect(amount).toHaveValue(/^650\s000$/);
  await expect(agreement('Non')).toHaveAttribute('aria-pressed', 'true');
  await expect(save).toHaveText('Prêt enregistré ✓');
  await expect(save).toBeDisabled();

  if (process.env.E2E_CAPTURES === '1') {
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page
        .getByTestId('buyer-readiness')
        .first()
        .screenshot({
          path: `missions/maquettes/lot-b/LB2-apres-${size.key}-avec-pret.png`,
        });
    }
    await page.setViewportSize({ width: 1280, height: 1100 });
  }

  // Le prêt se corrige, s'enregistre et se garde : le montant et l'accord, l'apport inchangé.
  await amount.fill('640000');
  await expect(amount).toHaveValue(/^640\s000$/);
  await agreement('Oui').click();
  await expect(save).toHaveText('Enregistrer le prêt');
  await save.click();
  await expect(save).toHaveText('Prêt enregistré ✓');
  await page.goto(fontaine);
  await reveal(mode);
  await expect(contribution).toHaveValue(/^120\s000$/);
  await expect(amount).toHaveValue(/^640\s000$/);
  await expect(agreement('Oui')).toHaveAttribute('aria-pressed', 'true');

  // Jean-Guy (28/11) — l'accord de principe noté, le financement encore « En cours » : une ligne le
  // propose, sans rien changer d'elle-même ; un toucher le passe en « Validé », et elle s'en va.
  const status = (name: string) =>
    page.getByTestId('buyer-financing').getByRole('button', { name, exact: true });
  const suggest = page.getByTestId('buyer-loan-suggest-validated');
  await expect(status('En cours')).toHaveAttribute('aria-pressed', 'true');
  await expect(suggest).toContainText('Accord de principe obtenu');
  await suggest.getByRole('button', { name: 'Passer en Validé' }).click();
  await expect(status('Validé')).toHaveAttribute('aria-pressed', 'true');
  await expect(suggest).toHaveCount(0);

  // Repasser en « Comptant » efface le prêt : l'écran le demande d'abord ; « Annuler » ne change
  // rien.
  await choice('Comptant').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Passer en « Comptant »');
  await expect(dialog).toContainText('seront effacés');
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(choice('Avec prêt')).toHaveAttribute('aria-pressed', 'true');
  await choice('Comptant').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Effacer le prêt' }).click();
  await expect(choice('Comptant')).toHaveAttribute('aria-pressed', 'true');
  await expect(loan).toHaveCount(0);
  await page.goto(fontaine);
  await reveal(mode);
  await expect(choice('Comptant')).toHaveAttribute('aria-pressed', 'true');
  await expect(loan).toHaveCount(0);

  // De nouveau avec un prêt : rien de l'ancien, tout est facultatif.
  await choice('Avec prêt').click();
  await expect(choice('Avec prêt')).toHaveAttribute('aria-pressed', 'true');
  await expect(contribution).toHaveValue('');
  await expect(amount).toHaveValue('');
  await expect(save).toBeDisabled();

  // M. et Mme Rossi : « Pas encore dit », comme toutes les fiches d'avant le lot B.
  await page.goto('/acquereurs?vue=agence&q=rossi');
  await page.getByRole('link', { name: 'M. et Mme Rossi', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('M. et Mme Rossi');
  const rossi = page.url();
  await reveal(mode);
  await expect(choice('Pas encore dit')).toHaveAttribute('aria-pressed', 'true');
  await expect(loan).toHaveCount(0);

  // Lot B3 — l'offre d'achat. Les Rossi, « Pas encore dit » : la question d'abord, avant tout
  // champ ; « Comptant » s'écrit sur leur fiche, et la question s'en va.
  const capture = async (name: string) => {
    if (process.env.E2E_CAPTURES !== '1') return;
    await page.addStyleTag({ content: HIDE_PREVIEW_TOOLBAR });
    for (const size of SIZES) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.screenshot({ path: `missions/maquettes/lot-b/LB3-${size.key}-${name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 1100 });
  };
  const ask = page.getByTestId('offer-ask-mode');
  const blocked = page.getByTestId('offer-loan-blocked');
  const deposit = page.getByTestId('offer-deposit');
  await page.goto(`${rossi}/offre`);
  await expect(ask).toContainText('Comment finance-t-il');
  await expect(ask).toContainText('Dites d’abord comment l’acquéreur finance son achat');
  await expect(deposit).toHaveCount(0);
  await capture('question');
  await ask.getByRole('button', { name: 'Comptant', exact: true }).click();
  await expect(ask).toHaveCount(0);
  await expect(blocked).toHaveCount(0);
  await page.goto(rossi);
  await reveal(mode);
  await expect(choice('Comptant')).toHaveAttribute('aria-pressed', 'true');

  // M. Fontaine, avec prêt : l'offre est bloquée, le message de Jean-Guy mot pour mot, aucun champ.
  await page.goto(`${fontaine}/offre`);
  await expect(blocked).toHaveText(
    'Cet acquéreur finance avec un prêt : l’offre avec prêt n’est pas encore disponible dans ACM. Utilisez le modèle de votre agence.',
  );
  await expect(ask).toHaveCount(0);
  await expect(deposit).toHaveCount(0);
  await capture('bloquee');

  // La famille Keller, comptant : l'offre d'aujourd'hui.
  await page.goto('/acquereurs?vue=agence&q=keller');
  await page.getByRole('link', { name: 'Famille Keller', exact: true }).first().click();
  await expect(page.getByTestId('buyer-name')).toHaveText('Famille Keller');
  await page.goto(`${page.url()}/offre`);
  await expect(deposit).toBeVisible();
  await expect(ask).toHaveCount(0);
  await expect(blocked).toHaveCount(0);
});
