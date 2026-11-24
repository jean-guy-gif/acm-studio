import { expect, test, type Locator, type Page } from './test';

import { demoCredentials, expectOneFilled, login, resetDemoByScreen } from './support';

// Mission 151 (partie B) — le classement par ce qui compte pour eux (planches 4 et 4 b), sur l'URL
// d'essai avec le compte de l'agence de démonstration : la lecture y est simulée (M114), aucun appel
// au vrai modèle. Les Lambert veulent le calme, une vue, le plain-pied : avant la recherche, le
// classement est simplifié ; pendant, un message d'attente ; après, les biens de l'agence sont
// rangés par ce qui compte pour eux, chacun avec « Pourquoi », et chaque citation se lit dans le
// texte de l'annonce.

async function openBuyer(page: Page, name: RegExp): Promise<string> {
  await page.goto('/acquereurs?vue=agence');
  const link = page.getByRole('link', { name }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]+$/);
  return new URL(page.url()).pathname;
}

const hitAt = (page: Page, price: RegExp): Locator =>
  page.getByTestId('ideal-agency-hit').filter({ hasText: price });

test('le classement par ce qui compte pour eux : les biens idéaux des Lambert', async ({
  page,
}) => {
  test.setTimeout(8 * 60_000);
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const lambertUrl = await openBuyer(page, /M\. et Mme Lambert$/);
  await page.goto(`${lambertUrl}/biens-ideaux`);

  await test.step('Avant la recherche : classement simplifié, les mots trouvés', async () => {
    await expect(page.getByTestId('soft-banner')).toContainText(
      'Classement simplifié jusqu’à la recherche du marché',
    );
    await expect(hitAt(page, /715\s000/).getByTestId('soft-why')).toContainText(
      'L’annonce mentionne « calme »',
    );
    await expect(page.getByText('Pourquoi 1er')).toHaveCount(0);
  });

  await test.step('La recherche : rangés par ce qui compte pour eux, avec leurs raisons', async () => {
    await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
    await page
      .getByTestId('ideal-paid-confirm')
      .getByRole('button', { name: 'Lancer la recherche' })
      .click();
    await expect(page.getByTestId('ideal-market-summary')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('soft-banner')).toContainText(
      'Rangés par ce qui compte pour eux — au calme, une vue, de plain-pied —',
    );
    await expect(page.getByTestId('soft-banner')).toContainText(
      'Aucun bien n’est écarté pour ces critères.',
    );
    const calm = hitAt(page, /715\s000/).getByTestId('soft-why');
    await expect(calm).toContainText('« Au calme absolu »');
    await expect(hitAt(page, /740\s000/).getByTestId('soft-why')).toContainText(
      'avec réserve : « Quartier résidentiel calme » mais « à deux pas de la route départementale »',
    );
    await expect(hitAt(page, /760\s000/).getByTestId('soft-why')).toContainText(
      '« Vue panoramique sur la mer et les collines »',
    );
    await expect(hitAt(page, /729\s000/).getByTestId('soft-why')).toContainText(
      'L’annonce ne dit rien de ce qui compte pour eux',
    );
    // Ce qui en dit quelque chose passe devant ce qui n'en dit rien ; la réserve après le clair.
    const order = await page.getByTestId('ideal-agency-hit').allInnerTexts();
    const at = (price: RegExp) => order.findIndex((text) => price.test(text));
    expect(at(/715\s000/)).toBeLessThan(at(/740\s000/));
    expect(at(/740\s000/)).toBeLessThan(at(/729\s000/));
    await expectOneFilled(page, 'Biens idéaux classés');
  });

  // Lancement, mission 9 — les photos des biens du marché les mieux classés (simulées dans la démo,
  // et sur l'essai seulement tant que la lecture est éteinte) : la raison dit des numéros de photos,
  // à vérifier par le conseiller, jamais un commentaire.
  await test.step('Les photos des mieux classés : des numéros de photos, à vérifier', async () => {
    const withPhotos = page.getByTestId('soft-why').filter({ hasText: /photos? \d/ });
    await expect(withPhotos.first()).toBeVisible();
    await expect(withPhotos.first()).toContainText(
      /se voit sur (la photo|les photos) \d|(le montre|le montrent), à vérifier/,
    );
    // Cinq biens au plus, et jamais un bien de l'agence : seules les annonces du marché.
    expect(await withPhotos.count()).toBeLessThanOrEqual(5);
    await expect(
      page
        .getByTestId('ideal-agency-hit')
        .getByTestId('soft-why')
        .filter({ hasText: /photos? \d/ }),
    ).toHaveCount(0);
    if (process.env.E2E_CAPTURES === '1') {
      await withPhotos.first().scrollIntoViewIfNeeded();
      await withPhotos.first().screenshot({ path: 'missions/maquettes/L9-raison-avec-photos.png' });
    }
  });

  await test.step('Chaque citation se lit dans le texte de l’annonce', async () => {
    await hitAt(page, /715\s000/)
      .getByTestId('open-property-sheet')
      .click();
    const sheet = page.getByTestId('property-sheet');
    await expect(sheet.getByTestId('sheet-text')).toContainText('Au calme absolu', {
      timeout: 20_000,
    });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('property-sheet')).toHaveCount(0);
  });
});
