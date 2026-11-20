import { expect, test, type Page } from '@playwright/test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  expectNoVerticalScroll,
  expectOneFilled,
  login,
  resetDemoByScreen,
  openStudyLinkOnPhone,
  studyPrintedPages,
} from './support';

// Mission 159 — le quartier montré au vendeur, sur l'URL d'essai, avec le compte de l'agence de
// démonstration (remise à zéro avant et après ; « Préparer ma démo » ne sème rien) :
//   1. Bien vendeur : « Créer le lien « Vivre ici » » prépare le dossier d'adresse de démonstration ;
//   2. « Avant le rendez-vous » : rien coché d'avance ; on coche tous les blocs lus, le compteur suit,
//      « Enregistrer le choix », relu après rechargement ; le déroulé compte les écrans ;
//   3. l'Étude de marché : les blocs cochés, « telles qu'au … », jamais Academia ni la valeur
//      indicative ;
//   4. le Live de Mme Garcia : les blocs du quartier juste après « Votre valeur perçue », les ventes
//      réelles juste avant « Analyse des prix » ; chaque écran du quartier tient sans défiler aux trois
//      fenêtres de la tablette, en français et en anglais ;
//   5. le Live commencé : le choix ne se modifie plus.

const TABLETS = [
  { width: 1024, height: 700 },
  { width: 1180, height: 750 },
  { width: 820, height: 1110 },
] as const;
// Correctifs 161 — ni la rue inventée du dossier de démonstration d'Academia (« Avenue de la
// Demonstration »), ni le mot, devant le vendeur (M114).
const FORBIDDEN = /[Aa]cademia|[Ee]stimation|[Vv]aleur indicative|[Ff]iabilit|[Dd][eé]monstration/;

async function garciaId(page: Page): Promise<string> {
  const href = await page
    .locator('[data-testid="demo-dossier"][data-stage="ready"] a')
    .first()
    .getAttribute('href');
  const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
  expect(id, 'Le dossier de démo « ready » est introuvable').toBeTruthy();
  return id!;
}

// Academia ne répond pas (panne, délai) : la spec s'arrête proprement, notée « skipped » avec ce
// message, sans faire échouer le reste de la suite (Jean-Guy, 18/11). Un écran qui manquerait alors
// qu'Academia a répondu reste, lui, un échec.
const ACADEMIA_DOWN = 'Academia ne répond pas';
async function waitForAcademia(
  page: Page,
  answered: () => Promise<boolean>,
  failedTestId: string,
  timeout: number,
): Promise<void> {
  let outcome = 'waiting' as 'answered' | 'failed' | 'waiting';
  try {
    await expect
      .poll(
        async () => {
          if (await answered()) outcome = 'answered';
          else if ((await page.getByTestId(failedTestId).count()) > 0) outcome = 'failed';
          else outcome = 'waiting';
          return outcome;
        },
        { timeout, intervals: [1_000, 2_000, 5_000] },
      )
      .not.toBe('waiting');
  } catch {
    // Le délai est dépassé : Academia n'a pas répondu.
  }
  if (outcome !== 'answered') {
    const detail =
      outcome === 'failed'
        ? ((await page.getByTestId(failedTestId).first().textContent()) ?? '').trim()
        : `aucune réponse en ${Math.round(timeout / 1000)} s`;
    test.skip(true, `${ACADEMIA_DOWN} (${detail})`);
  }
}

async function switchLanguage(page: Page): Promise<void> {
  await page.getByTestId('live-options').click();
  await page.getByTestId('live-language').click();
  await expect(page.locator('[role="menu"]')).toHaveCount(0, { timeout: 30_000 });
}

async function checkScreen(page: Page, label: string): Promise<void> {
  for (const pass of ['', ' · autre langue']) {
    for (const size of TABLETS) {
      await page.setViewportSize(size);
      await expectNoVerticalScroll(page, `${label}${pass} (${size.width} × ${size.height})`);
      await expectNoHorizontalScroll(page, `${label}${pass} (${size.width} × ${size.height})`);
    }
    await page.setViewportSize(TABLETS[0]);
    expect(await page.locator('main').innerText(), label).not.toMatch(FORBIDDEN);
    await switchLanguage(page);
  }
}

test('le quartier coché bloc par bloc, au Live et dans l’Étude de marché', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const garcia = await garciaId(page);
  const checked: string[] = [];

  try {
    await test.step('Bien vendeur : le dossier d’adresse de démonstration', async () => {
      await page.goto(`/builder/${garcia}/property`);
      await page.getByTestId('living-here-create').click();
      await waitForAcademia(
        page,
        async () => (await page.getByTestId('living-here-create').count()) === 0,
        'living-here-failed',
        150_000,
      );
    });

    await test.step('Avant le rendez-vous : coché bloc par bloc, enregistré, relu', async () => {
      await page.goto(`/builder/${garcia}/avant-rendez-vous`);
      const panel = page.getByTestId('neighbourhood-choice');
      // Le dossier d'adresse lu (« Votre fourchette » s'affiche dès qu'il l'est), puis le quartier
      // (la vue « bien-client », un second appel) : Academia a répondu aux deux.
      await waitForAcademia(
        page,
        async () => (await page.getByTestId('your-range').count()) > 0,
        'address-view-failed',
        60_000,
      );
      await waitForAcademia(
        page,
        async () => (await panel.count()) > 0,
        'neighbourhood-choice-failed',
        60_000,
      );
      await expect(panel).toBeVisible({ timeout: 60_000 });
      // Côté conseiller non plus, la rue inventée du dossier de démonstration ne s'écrit pas (M114).
      expect(await page.getByTestId('address-view').innerText()).not.toMatch(/d[eé]monstration/i);
      await expect(panel).toContainText('Ce que verra le vendeur : le quartier');
      await expect(page.getByTestId('neighbourhood-choice-count')).toHaveText(
        'Aucun écran ajouté au Live',
      );
      const boxes = panel.locator('input[type="checkbox"]');
      const count = await boxes.count();
      expect(count, 'Aucun bloc lisible').toBeGreaterThan(1);
      for (let i = 0; i < count; i += 1) {
        await expect(boxes.nth(i)).not.toBeChecked();
        await boxes.nth(i).check();
        const id = (await boxes.nth(i).getAttribute('data-testid'))!.replace(
          'neighbourhood-choice-',
          '',
        );
        checked.push(id);
      }
      await expect(page.getByTestId('neighbourhood-choice-count')).toContainText(
        `${count} écrans ajoutés au Live · environ`,
      );
      await panel.getByRole('button', { name: 'Enregistrer le choix' }).click();
      await expect(panel.getByRole('status')).toHaveText(
        'Choix enregistré : le Live et les documents montreront ces blocs.',
        { timeout: 60_000 },
      );
      await page.reload();
      await expect(page.getByTestId('neighbourhood-choice')).toBeVisible({ timeout: 60_000 });
      for (const id of checked) {
        await expect(page.getByTestId(`neighbourhood-choice-${id}`)).toBeChecked();
      }
      await expect(page.locator('main')).toContainText('Votre quartier,');
      await expectOneFilled(page, 'Avant le rendez-vous (quartier)');
    });

    await test.step('L’Étude de marché : les blocs cochés, figés, sans Academia', async () => {
      await page.goto(`/builder/${garcia}/etude-de-marche`);
      const study = page.getByTestId('market-study');
      await expect(study).toBeVisible({ timeout: 60_000 });
      // Mission 163 A — le quartier sur une page, à la fin ; les ventes, leur propre chapitre.
      await expect(study.getByTestId('study-quartier')).toBeVisible();
      await expect(study).toContainText('Informations publiques telles qu’au');
      await expect(study.getByTestId('study-quartier')).toContainText(
        'Ce que votre acheteur demandera',
      );
      if (checked.includes('ventes')) await expect(study.getByTestId('study-sales')).toBeVisible();
      expect(await study.innerText()).not.toMatch(FORBIDDEN);
    });

    // Correctifs 161 — la règle de Laurent (19/11) : les ventes par type et surface, toutes pièces
    // confondues ; 37 sur le dossier de démonstration. Le titre dit le type et la fourchette de
    // surface ; la frise n'écrit jamais deux prix l'un sur l'autre ; imprimé, le bloc tient sur une
    // page A4.
    if (checked.includes('ventes')) {
      await test.step('Les ventes : par surface, lisibles, sur une page imprimée', async () => {
        const study = page.getByTestId('market-study');
        // Mission 163 A — la page des ventes : le titre-conclusion, la fourchette de surface dans
        // le chapeau, toutes les ventes sur la frise ; les prix écrits ne se chevauchent pas.
        const block = study.locator('[data-study-page="sales"]');
        await expect(block.getByTestId('study-chapter-title')).toContainText(
          /(maisons|appartements) comme (la|le) vôtre se sont vendu(e)?s autour de chez vous/,
        );
        await expect(block).toContainText(/de \d+ à \d[\d\u202f\u00a0]*\u00a0m²/);
        const sales = await block.evaluate((node) => {
          const texts = [...node.querySelectorAll('svg text[data-price-label]')].map((t) =>
            t.getBoundingClientRect(),
          );
          const overlaps = texts.some((a, i) =>
            texts.some(
              (b, j) =>
                j > i &&
                a.left < b.right &&
                b.left < a.right &&
                a.top < b.bottom &&
                b.top < a.bottom,
            ),
          );
          return { labels: texts.length, overlaps };
        });
        expect(sales.overlaps).toBe(false);
        expect(sales.labels).toBeGreaterThan(0);
        await page.emulateMedia({ media: 'print' });
        await page.setViewportSize({ width: 794, height: 1123 });
        // Une page A4 à 96 points par pouce, moins les marges de 10 et 16 mm : 1 025 px au plus.
        const height = await block.evaluate((node) => node.getBoundingClientRect().height);
        expect(height).toBeLessThan(1025);
        await page.emulateMedia({ media: 'screen' });
        await page.setViewportSize({ width: 1280, height: 900 });
      });
    }

    // Mission 163 A — tous les blocs cochés, ventes comprises : 8 pages, dans l'ordre de la maquette
    // M163-fil-conducteur, et imprimée, une page A4 par page.
    await test.step('L’Étude en fil conducteur : 8 pages dans l’ordre, imprimées sans débord', async () => {
      await page.goto(`/builder/${garcia}/etude-de-marche`);
      await expect(page.getByTestId('market-study')).toBeVisible({ timeout: 60_000 });
      const pages = await page
        .locator('[data-study-page]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-study-page')));
      if (checked.includes('ventes') && checked.length === 6) {
        expect(pages).toEqual([
          'cover',
          'summary',
          'competitors',
          'competitors',
          'sales',
          'ranking',
          'quartier',
          'next',
        ]);
      }
      expect(await studyPrintedPages(page)).toBe(pages.length);
      // Le lien public, ventes et quartier compris, sur téléphone.
      await openStudyLinkOnPhone(page);
    });

    await test.step('Le Live : à leur place, sans défiler, dans les deux langues', async () => {
      await page.setViewportSize(TABLETS[0]);
      await page.goto(`/live/${garcia}`);
      await expect(page).toHaveURL(new RegExp(`/builder/${garcia}/lancer-le-live$`));
      await page.getByTestId('launch-for-real').click();
      const start = page.locator('main button.btn-filled').first();
      await expect(start).toBeVisible({ timeout: 90_000 });
      // « Démarrer » attend la fin du préchargement des photos (M144), comme au rendez-vous.
      await expect(page.locator('[data-photos-preloaded="true"]')).toHaveCount(1, {
        timeout: 120_000,
      });
      await start.click();
      const main = page.locator('main');
      await expect(main).not.toHaveAttribute('data-live-page', 'intro', { timeout: 30_000 });

      const order: string[] = [];
      const radio = async (field: string, value?: string) => {
        const input = main.locator(`input[name="${field}"]${value ? `[value="${value}"]` : ''}`);
        if ((await input.count()) === 0 || (await input.first().isChecked())) return;
        await input.first().locator('xpath=ancestor::label[1]').click();
      };
      for (let step = 0; step < 60; step += 1) {
        const type = (await main.getAttribute('data-live-page')) ?? '';
        order.push(type);
        if (type === 'price_analysis') break;
        if (type === 'neighbourhood_block' || type === 'neighbourhood_sales') {
          await expect(main.locator('[data-testid^="live-neighbourhood-"]')).toBeVisible();
          await checkScreen(page, `quartier · ${order.length}`);
        }
        await radio('seller_property_confirmed', 'yes');
        await radio('seller_serious_competitor', 'yes');
        await radio('seller_most_dangerous_comparable_id');
        const price = main.locator('input[data-price-for]').first();
        if (
          (await price.count()) > 0 &&
          (await price.isVisible()) &&
          (await price.inputValue()) === ''
        ) {
          await price.fill('745000');
        }
        const days = main.locator('input[name="seller_estimated_days_on_market"]').first();
        if (
          (await days.count()) > 0 &&
          (await days.isVisible()) &&
          (await days.isEditable()) &&
          (await days.inputValue()) === ''
        ) {
          await days.fill('60');
        }
        const button = page.getByTestId('live-validate');
        const next =
          (await button.count()) > 0
            ? button
            : page.getByRole('button', { name: /Valider et continuer/ }).last();
        await expect(next).toBeEnabled({ timeout: 30_000 });
        const before = `${type}|${await main.textContent()}`;
        await next.click();
        await expect
          .poll(
            async () => `${await main.getAttribute('data-live-page')}|${await main.textContent()}`,
            {
              timeout: 60_000,
            },
          )
          .not.toBe(before);
      }
      // Les blocs du quartier juste après « Votre valeur perçue » (une fois confirmée) ; les ventes
      // juste avant « Analyse des prix ».
      const blocks = checked.filter((id) => id !== 'ventes').length;
      const first = order.indexOf('neighbourhood_block');
      expect(order[first - 1]).toBe('seller_perceived_price');
      expect(order.filter((type) => type === 'neighbourhood_block')).toHaveLength(blocks);
      if (checked.includes('ventes')) {
        expect(order.at(-2)).toBe('neighbourhood_sales');
      }
      expect(order.at(-1)).toBe('price_analysis');
    });

    await test.step('Le Live commencé : le choix ne se modifie plus', async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/builder/${garcia}/avant-rendez-vous`);
      const panel = page.getByTestId('neighbourhood-choice');
      await expect(panel).toContainText(
        'Le Live a commencé : le quartier montré au vendeur ne se modifie plus.',
        { timeout: 60_000 },
      );
      await expect(panel.locator('input[type="checkbox"]').first()).toBeDisabled();
      await expect(panel.getByRole('button', { name: 'Enregistrer le choix' })).toHaveCount(0);
    });
  } finally {
    // La remise à zéro part d'une page qui a le menu, jamais de la scène du Live.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/builder');
    await resetDemoByScreen(page);
  }
});
