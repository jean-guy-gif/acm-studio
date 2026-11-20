import { expect, test, type Page } from '@playwright/test';

import {
  demoCredentials,
  login,
  openStudyLinkOnPhone,
  resetDemoByScreen,
  studyPrintedPages,
} from './support';

// Mission 163 A — l'Étude de marché en fil conducteur (maquette M163-fil-conducteur), sur la démo
// remise à zéro : le dossier de Mme Garcia (prêt, en français) et celui des Bernard (présentation
// directe, en anglais). Les pages dans l'ordre, une idée par page, le titre qui conclut ; imprimée,
// une page A4 par page de l'Étude (aucune fiche coupée, rien qui déborde) ; le lien public lisible
// sur téléphone, sans défilement de côté. Le quartier coché (Academia) est joué par
// `quartier-au-vendeur`, qui compte alors les 8 pages.

const FORBIDDEN = /[Ee]stimation|[Ee]stimate|[Vv]aleur indicative|[Aa]cademia|[Dd][eé]monstration/;

async function demoId(page: Page, stage: string): Promise<string> {
  const href = await page
    .locator(`[data-testid="demo-dossier"][data-stage="${stage}"] a`)
    .first()
    .getAttribute('href');
  const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
  expect(id, `Le dossier de démo « ${stage} » est introuvable dans « Ma démo »`).toBeTruthy();
  return id as string;
}

async function studyPages(page: Page): Promise<string[]> {
  return page
    .locator('[data-study-page]')
    .evaluateAll((pages) => pages.map((node) => node.getAttribute('data-study-page') ?? ''));
}

test('l’Étude de marché en fil conducteur, en français et en anglais', async ({ page }) => {
  test.setTimeout(9 * 60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const garcia = await demoId(page, 'ready');
  const bernard = await demoId(page, 'direct');

  await test.step('Mme Garcia : les pages dans l’ordre, leurs titres-conclusions', async () => {
    await page.goto(`/builder/${garcia}/etude-de-marche`);
    const study = page.getByTestId('market-study');
    await expect(study).toBeVisible({ timeout: 60_000 });
    const pages = await studyPages(page);
    // Sans quartier coché : ni ventes, ni « Ce que votre acheteur demandera ».
    expect(pages[0]).toBe('cover');
    expect(pages[1]).toBe('summary');
    expect(pages.at(-1)).toBe('next');
    expect(pages).toContain('competitors');
    expect(pages).not.toContain('sales');
    expect(pages).not.toContain('quartier');
    await expect(page.getByTestId('study-cover-title')).toHaveText(
      'Votre maison à Vence face au marché',
    );
    // La couverture n'a plus de verdict ; il est en tête du résumé, encadré.
    const cover = study.locator('[data-study-page="cover"]');
    await expect(cover.locator('[data-tier]')).toHaveCount(0);
    const summary = study.getByTestId('study-summary');
    await expect(summary.locator('li').first()).toHaveAttribute('data-chapter', 'ranking');
    await expect(summary.locator('li').first()).toHaveAttribute('data-tier', /green|orange|red/);
    const titles = study.getByTestId('study-chapter-title');
    await expect(titles.first()).toContainText(/maisons? comme la vôtre (est|sont) en vente/);
    await expect(
      study.locator('[data-study-page="ranking"]').getByTestId('study-chapter-title'),
    ).toContainText(/^À [\d   ]+€, /);
    await expect(study.getByTestId('study-avis').first()).toContainText('L’avis de');
    expect(await study.innerText()).not.toMatch(FORBIDDEN);
  });

  await test.step('Mme Garcia : imprimée, une page A4 par page, aucune fiche coupée', async () => {
    const pages = await studyPages(page);
    expect(await studyPrintedPages(page)).toBe(pages.length);
  });

  await test.step('Mme Garcia : le lien public, sur téléphone', async () => {
    await openStudyLinkOnPhone(page);
  });

  await test.step('Les Bernard, en anglais : les mêmes pages, ses mots', async () => {
    await page.goto(`/builder/${bernard}/etude-de-marche`);
    const study = page.getByTestId('market-study');
    await expect(study).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('study-cover-title')).toHaveText(
      /^Your house in .+ and the market$/,
    );
    await expect(study.locator('[data-study-page="summary"] h2')).toContainText(
      /this study tells you about your house/,
    );
    await expect(study.getByTestId('study-chapter-title').first()).toContainText(
      /houses? like yours (is|are) for sale today/,
    );
    const text = await study.innerText();
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).not.toMatch(/Quatre choses|comme la vôtre|L’avis de/);
    const pages = await studyPages(page);
    expect(await studyPrintedPages(page)).toBe(pages.length);
    await openStudyLinkOnPhone(page);
  });
});
