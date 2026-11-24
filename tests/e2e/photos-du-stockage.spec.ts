import { expect, test, type Page } from './test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Les navigateurs de l'e2e ne téléchargent plus les photos du stockage (Jean-Guy, 23/11, `test.ts`) :
// la fiche d'un bien de la démo affiche ses photos, et chacune est l'image minuscule servie par le
// navigateur de test, dans le contexte de la spec comme dans un contexte qu'elle ouvre elle-même.
// Si cette spec rougit, les photos repartent du stockage à chaque passage (125 Mo par suite).

const STORAGE_PHOTO = 'img[src*="/storage/v1/object/sign/project-photos/"]';

async function storagePhotoWidths(page: Page): Promise<number[]> {
  await expect(page.locator(STORAGE_PHOTO).first()).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(() =>
      page
        .locator(STORAGE_PHOTO)
        .evaluateAll((images) => (images as HTMLImageElement[]).every((image) => image.complete)),
    )
    .toBe(true);
  return page
    .locator(STORAGE_PHOTO)
    .evaluateAll((images) => (images as HTMLImageElement[]).map((image) => image.naturalWidth));
}

test('les photos du stockage sont remplacées par une image minuscule', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const href = await page
    .locator('[data-testid="demo-dossier"]', { hasText: 'Lefebvre' })
    .locator('a')
    .first()
    .getAttribute('href');
  const id = /\/builder\/([^/?#]+)/.exec(href ?? '')?.[1];
  expect(id, 'Le mandat de M. Lefebvre est introuvable dans « Ma démo »').toBeTruthy();

  await page.goto(`/builder/${id}/property`);
  const widths = await storagePhotoWidths(page);
  expect(widths.length).toBeGreaterThanOrEqual(3);
  expect(new Set(widths)).toEqual(new Set([4]));

  // Un contexte ouvert par la spec (un lien public, un téléphone) est servi de même.
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await login(second, demoCredentials());
    await second.goto(`/builder/${id}/property`);
    expect(new Set(await storagePhotoWidths(second))).toEqual(new Set([4]));
  } finally {
    await other.close();
  }
});
