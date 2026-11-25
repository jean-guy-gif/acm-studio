import { expect, test, type Locator, type Page } from './test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectOneFilled,
  login,
  openSuiviLine,
  resetDemoByScreen,
} from './support';

// Mission 152 (partie B) — la fiche complète d'un bien, pour le conseiller seul (maquette M152-5),
// sur l'URL d'essai avec le compte de l'agence de démonstration (le marché y est simulé : rien de
// payant, aucune annonce réelle). Elle s'ouvre depuis les biens idéaux (un mandat de l'agence, une
// annonce du marché), la sélection d'une fiche acquéreur et « Proposer ce bien » ; « Retenir ce
// bien », le seul plein, sous le pouce ; rien ne déborde à 390 px ni sur tablette. Les annonces de
// démonstration ne mènent à aucun portail : « Voir l'annonce en ligne » n'y paraît pas (M114).

async function openBuyer(page: Page, name: RegExp): Promise<string> {
  await page.goto('/acquereurs?vue=agence');
  const link = page.getByRole('link', { name }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]+$/);
  return new URL(page.url()).pathname;
}

async function expectSheetOpen(page: Page): Promise<Locator> {
  const sheet = page.getByTestId('property-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('sheet-label')).toBeVisible({ timeout: 20_000 });
  return sheet;
}

async function expectThumbReachable(page: Page, testId: string): Promise<void> {
  const box = await page.getByTestId(testId).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, `${testId} visible`).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

test('la fiche complète d’un bien : biens idéaux, sélection, « Proposer ce bien »', async ({
  page,
}) => {
  test.setTimeout(10 * 60_000);
  await login(page, demoCredentials());
  await resetDemoByScreen(page);

  // Mission 155 — M. et Mme Roux, nouveaux, sans sélection : la famille Moreau a la sienne, pleine.
  let rouxUrl = '';
  await test.step('Un mandat de l’agence, depuis « Ce que l’agence a déjà »', async () => {
    rouxUrl = await openBuyer(page, /M\. et Mme Roux/);
    await page.goto(`${rouxUrl}/biens-ideaux`);
    const agencyHits = page.getByTestId('ideal-agency-hit');
    await expect(agencyHits.first()).toBeVisible();
    const mandate = agencyHits.filter({ hasText: 'Mes mandats' }).first();
    await mandate.getByTestId('open-property-sheet').click();
    const sheet = await expectSheetOpen(page);
    await expect(sheet.getByTestId('sheet-origin')).toHaveText('Dans l’agence');
    await expect(sheet.getByTestId('sheet-photo-count')).toHaveText(/^1 \/ \d+$/);
    await expect(sheet.getByTestId('sheet-characteristics')).toContainText('Surface');
    await expect(sheet.getByTestId('sheet-characteristics')).not.toContainText('—');
    // Un mandat de l'agence n'a pas de lien en ligne.
    await expect(sheet.getByTestId('sheet-online')).toHaveCount(0);
    await expect(sheet.getByTestId('sheet-retain')).toHaveText('Retenir ce bien');
    await expect(sheet.getByTestId('sheet-selection-count')).toContainText('Pour M. et Mme Roux');
    await expectOneFilled(page, 'Biens idéaux, fiche complète ouverte');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('property-sheet')).toHaveCount(0);
  });

  await test.step('Une annonce du marché : photos, texte, « Retenir ce bien » puis « Retirer »', async () => {
    await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
    await page
      .getByTestId('ideal-paid-confirm')
      .getByRole('button', { name: 'Lancer la recherche' })
      .click();
    await expect(page.getByTestId('ideal-market-summary')).toBeVisible({ timeout: 60_000 });
    const hit = page.getByTestId('ideal-market-hit').first();
    await expect(hit).toBeVisible();
    const before = await page.getByTestId('ideal-current-item').count();
    await hit.getByTestId('open-property-sheet').click();
    const sheet = await expectSheetOpen(page);
    await expect(sheet.getByTestId('sheet-origin')).toHaveText(/^Marché/);
    await expect(sheet.getByTestId('sheet-text')).toContainText('Le texte de l’annonce');
    await expect(sheet.getByTestId('sheet-rank')).toContainText(/critères? sur/);
    await expect(sheet.getByTestId('sheet-online')).toHaveCount(0);
    const count = sheet.getByTestId('sheet-photo-count');
    const total = Number((await count.innerText()).split('/')[1]);
    if (total > 1) {
      await sheet.getByRole('button', { name: 'Photo suivante' }).click();
      await expect(count).toHaveText(`2 / ${total}`);
      await page.keyboard.press('ArrowLeft');
      await expect(count).toHaveText(`1 / ${total}`);
    }
    await expectOneFilled(page, 'Fiche d’une annonce du marché');
    await sheet.getByTestId('sheet-retain').click();
    await expect(sheet.getByTestId('sheet-unretain')).toHaveText('Retenu ✓ · Retirer');
    await expect(sheet.getByTestId('sheet-selection-count')).toContainText(`${before + 1} bien`);
    await sheet.getByTestId('sheet-close').click();
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(before + 1);
    await expect(page.getByTestId('ideal-retain')).toBeEnabled();
    // Retirer depuis la fiche défait la coche, rien n'est enregistré.
    await page.getByTestId('ideal-current-item').last().getByTestId('open-property-sheet').click();
    await (await expectSheetOpen(page)).getByTestId('sheet-unretain').click();
    await page.getByTestId('sheet-close').click();
    await expect(page.getByTestId('ideal-current-item')).toHaveCount(before);
  });

  for (const viewport of [
    { width: 820, height: 1180, name: 'tablette' },
    { width: 390, height: 844, name: 'téléphone' },
  ]) {
    await test.step(`Plein écran sur ${viewport.name} : rien ne déborde, « Retenir » sous le pouce`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.getByTestId('ideal-market-hit').first().getByTestId('open-property-sheet').click();
      const sheet = await expectSheetOpen(page);
      const box = await sheet.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
      await expectNoHorizontalScroll(page, `Fiche complète, ${viewport.name}`);
      await expectThumbReachable(page, 'sheet-retain');
      await sheet.getByTestId('sheet-close').click();
    });
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  await test.step('La sélection d’une fiche acquéreur : la fiche se lit, sans bouton plein', async () => {
    const lambert = await openBuyer(page, /M\. et Mme Lambert/);
    await page.goto(lambert);
    // Lancement, mission 10 — leur sélection est envoyée : ses biens se lisent dans « Son suivi ».
    await expect(page.getByTestId('ideal-selection-item')).toHaveCount(0);
    // Mission 10 bis — sous « Envoyés, en attente », qu'un toucher ouvre.
    const waiting = await openSuiviLine(page, 'waiting');
    const item = waiting.getByTestId('buyer-follow-up-item').first();
    await expect(item).toBeVisible();
    await item.getByTestId('open-property-sheet').click();
    const sheet = await expectSheetOpen(page);
    await expect(sheet.getByTestId('sheet-footer')).toHaveCount(0);
    await expect(sheet.locator('.btn-filled')).toHaveCount(0);
    await sheet.getByTestId('sheet-close').click();
  });

  await test.step('« Proposer ce bien » : la fiche du mandat', async () => {
    await page.goto(rouxUrl);
    await page.getByRole('link', { name: 'Proposer ce bien' }).first().click();
    await expect(page.getByTestId('propose-title')).toBeVisible();
    await page.getByRole('button', { name: 'Voir la fiche du bien' }).click();
    const sheet = await expectSheetOpen(page);
    await expect(sheet.getByTestId('sheet-origin')).toHaveText('Dans l’agence');
    await expect(sheet.getByTestId('sheet-online')).toHaveCount(0);
    await expect(sheet.getByTestId('sheet-footer')).toHaveCount(0);
  });
});
