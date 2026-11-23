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
// `quartier-au-vendeur`, qui compte alors les pages.
// Mission 163 C — seul le prix de commercialisation CONVENU classe le bien : Mme Garcia (prête, pas
// conclue) n'a pas de chapitre « Où se place votre prix », et son analyse de valeur n'est nulle
// part ; M. Lefebvre (mandat signé, Mougins) est classé au prix retenu ensemble.

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

// Le montant de « Votre analyse de valeur » d'un dossier, lu sur « Avant le rendez-vous », en
// chiffres seuls (pour le chercher sous toutes ses écritures).
async function advisorAnalysis(page: Page, projectId: string): Promise<string> {
  await page.goto(`/builder/${projectId}/avant-rendez-vous`);
  const value = await page
    .locator('label')
    .filter({ hasText: 'Votre analyse de valeur' })
    .locator('input')
    .first()
    .inputValue({ timeout: 60_000 });
  const digits = value.replace(/\D/g, '');
  expect(digits, 'L’analyse de valeur du dossier est vide').not.toBe('');
  return digits;
}

// Les nombres d'un texte, groupes de milliers recollés (« 745 000 » → « 745000 »).
const digitsOf = (text: string): string[] =>
  text
    .replace(/[^\d]/g, ' ')
    .replace(/(\d) (?=\d{3}\b)/g, '$1')
    .split(/\s+/)
    .filter(Boolean);

// L'analyse de valeur n'apparaît pas dans l'Étude. Un concurrent peut afficher le même montant
// (740 000 € chez Mme Garcia, 1 690 000 € chez M. Lefebvre) : on la cherche hors des pages qui
// listent les prix des concurrents (leurs fiches, le classement). Que la charge ne la reçoive
// jamais est prouvé par le test unitaire, avec un montant piège.
async function expectNoAnalysis(page: Page, analysis: string): Promise<void> {
  const texts = await page
    .locator(
      '[data-study-page]:not([data-study-page="competitors"]):not([data-study-page="ranking"])',
    )
    .allInnerTexts();
  expect(texts.length).toBeGreaterThan(1);
  expect(digitsOf(texts.join('\n'))).not.toContain(analysis);
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
  const lefebvreHref = await page
    .locator('[data-testid="demo-dossier"][data-stage="signed"]')
    .filter({ hasText: 'M. Lefebvre' })
    .locator('a')
    .first()
    .getAttribute('href');
  // Un mandat signé mène à sa Vue d'ensemble (`/builder/<id>`), sans chemin après l'identifiant.
  const lefebvre = /\/builder\/([^/?#]+)/.exec(lefebvreHref ?? '')?.[1] as string;
  expect(lefebvre, 'Le mandat de M. Lefebvre est introuvable dans « Ma démo »').toBeTruthy();

  await test.step('Mme Garcia, sans prix convenu : pas de classement, ni son analyse', async () => {
    const analysis = await advisorAnalysis(page, garcia);
    await page.goto(`/builder/${garcia}/etude-de-marche`);
    const study = page.getByTestId('market-study');
    await expect(study).toBeVisible({ timeout: 60_000 });
    const pages = await studyPages(page);
    // Sans quartier coché : ni ventes, ni « Ce que votre acheteur demandera » ; sans prix convenu,
    // ni « Où se place votre prix ».
    expect(pages[0]).toBe('cover');
    expect(pages[1]).toBe('summary');
    expect(pages.at(-1)).toBe('next');
    expect(pages).toContain('competitors');
    expect(pages).not.toContain('sales');
    expect(pages).not.toContain('quartier');
    expect(pages).not.toContain('ranking');
    await expect(page.getByTestId('study-cover-title')).toHaveText(
      'Votre maison à Vence face au marché',
    );
    const cover = study.locator('[data-study-page="cover"]');
    await expect(cover.locator('[data-tier]')).toHaveCount(0);
    const summary = study.getByTestId('study-summary');
    await expect(summary.locator('li').first()).toHaveAttribute('data-chapter', 'competitors');
    await expect(summary.locator('li[data-chapter="ranking"]')).toHaveCount(0);
    await expect(study.getByTestId('market-study-verdict')).toHaveCount(0);
    await expect(study.locator('[data-study-page="summary"]')).toContainText(
      'Le prix, nous le fixerons ensemble.',
    );
    await expect(
      study.locator('[data-study-page="competitors"]').first().getByTestId('study-chapter-title'),
    ).toContainText(/maisons? comme la vôtre (est|sont) en vente/);
    await expect(study.getByTestId('study-avis').first()).toContainText('L’avis de');
    const text = await study.innerText();
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).not.toContain('que je vous propose');
    await expectNoAnalysis(page, analysis);
  });

  // Correctifs 163 — une page de PDF par page imprimée décidée par le code (`etude-imprimee`
  // vérifie qu'elles sont pleines, numérotées, et que les renvois du résumé tombent juste).
  await test.step('Mme Garcia : imprimée, une page A4 par page, aucune fiche coupée', async () => {
    expect(await studyPrintedPages(page)).toBe(await page.locator('[data-print-page]').count());
  });

  await test.step('Mme Garcia : le lien public, sur téléphone', async () => {
    await openStudyLinkOnPhone(page);
  });

  await test.step('M. Lefebvre, mandat signé : classé au prix retenu ensemble', async () => {
    const analysis = await advisorAnalysis(page, lefebvre);
    await page.goto(`/builder/${lefebvre}/etude-de-marche`);
    const study = page.getByTestId('market-study');
    await expect(study).toBeVisible({ timeout: 60_000 });
    const pages = await studyPages(page);
    expect(pages).toContain('ranking');
    const summary = study.getByTestId('study-summary');
    await expect(summary.locator('li').first()).toHaveAttribute('data-chapter', 'ranking');
    await expect(summary.locator('li').first()).toHaveAttribute('data-tier', /green|orange|red/);
    await expect(study.locator('[data-study-page="summary"]')).toContainText(
      'nous l’avons retenu ensemble',
    );
    const title = study.locator('[data-study-page="ranking"]').getByTestId('study-chapter-title');
    await expect(title).toContainText(/^À [\d\s  ]+€, /);
    await expect(study.locator('[data-subject="true"]')).toContainText('prix retenu ensemble');
    const text = await study.innerText();
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).not.toContain('que je vous propose');
    // Le prix du classement est le prix convenu ; l'analyse n'apparaît que si elle lui est égale.
    const agreed = ((await title.innerText()).match(/À ([\d\s  ]+)€/)?.[1] ?? '').replace(
      /\D/g,
      '',
    );
    expect(agreed).not.toBe('');
    if (analysis !== agreed) {
      await expectNoAnalysis(page, analysis);
    }
    expect(await studyPrintedPages(page)).toBe(await page.locator('[data-print-page]').count());
  });

  // Jean-Guy, 23/11 — une conclusion « À relancer » avec un prix : l'Étude le classe au « prix
  // proposé », comme le Suivi ; « le prix retenu ensemble » reste pour un mandat signé.
  await test.step('M. et Mme Lambert-Duval, à relancer : classés au prix proposé', async () => {
    await page.goto('/suivi');
    const href = await page
      .getByTestId('suivi-row')
      .filter({ hasText: 'Lambert-Duval' })
      .getByTestId('suivi-open-project')
      .first()
      .getAttribute('href', { timeout: 60_000 });
    const followUp = /\/builder\/([^/?#]+)/.exec(href ?? '')?.[1];
    expect(followUp, 'Le dossier de M. et Mme Lambert-Duval est introuvable au Suivi').toBeTruthy();
    await page.goto(`/builder/${followUp}/etude-de-marche`);
    const study = page.getByTestId('market-study');
    await expect(study).toBeVisible({ timeout: 60_000 });
    const summary = study.getByTestId('study-summary');
    await expect(summary.locator('li').first()).toHaveAttribute('data-chapter', 'ranking');
    await expect(study.locator('[data-study-page="summary"]')).toContainText('Le prix proposé :');
    await expect(study.locator('[data-subject="true"]')).toContainText('prix proposé');
    const text = await study.innerText();
    expect(text).not.toContain('retenu ensemble');
    expect(text).not.toMatch(FORBIDDEN);
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
    await expect(
      study.locator('[data-study-page="competitors"]').first().getByTestId('study-chapter-title'),
    ).toContainText(/houses? like yours (is|are) for sale today/);
    const text = await study.innerText();
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).not.toMatch(/Quatre choses|comme la vôtre|L’avis de/);
    expect(await studyPrintedPages(page)).toBe(await page.locator('[data-print-page]').count());
    await openStudyLinkOnPhone(page);
  });
});
