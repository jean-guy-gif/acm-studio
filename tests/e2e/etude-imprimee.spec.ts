import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, login, printedPdfTexts, resetDemoByScreen } from './support';

// Correctifs 163 — l'Étude de marché imprimée, sur les vrais PDF A4 de la démo remise à zéro (retours
// de Jean-Guy du 23/11 sur M. Lefebvre et Mme Garcia). Pour chaque dossier de démo qui a une Étude :
//  - des pages pleines : rien ne déborde d'une feuille, et une page ne passe à la suivante que si le
//    bloc suivant n'y tenait pas (mesuré en hauteurs réelles, à l'impression) ;
//  - un numéro « N / T » écrit dans chaque page après la couverture, une seule fois, sur la page N ;
//  - les renvois du résumé (« page 3 ») tombent sur la page où commence le chapitre annoncé.
// Le quartier coché (Academia) est joué par `quartier-au-vendeur` ; ici, les dossiers tels que la
// démo les prépare.

// Une page A4 à 96 points par pouce : 1 mm = 96 / 25,4 px.
const PX_PER_MM = 96 / 25.4;
// La tolérance du « n'y tenait pas » : les hauteurs du code sont estimées, un peu larges par prudence.
const SLACK_MM = 12;

type Frame = { number: number; room: number; used: number; firstGroup: number; units: string[] };

async function frames(page: Page): Promise<Frame[]> {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: 'print' });
  try {
    return await page.locator('[data-print-page]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const body = node.querySelector('[data-print-body]');
        const units = body ? [...body.querySelectorAll(':scope > [data-print-unit]')] : [];
        const tops = units.map((unit) => unit.getBoundingClientRect());
        const used = tops.length ? tops.at(-1)!.bottom - tops[0]!.top : 0;
        let firstGroup = 0;
        for (const unit of units) {
          firstGroup = unit.getBoundingClientRect().bottom - (tops[0]?.top ?? 0);
          if (unit.getAttribute('data-keep-next') !== 'true') break;
        }
        return {
          number: Number(node.getAttribute('data-print-page')),
          room: body ? Number(body.getAttribute('data-room-px')) : 0,
          used,
          firstGroup,
          units: units.map((unit) => unit.getAttribute('data-print-unit') ?? ''),
        };
      }),
    );
  } finally {
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
}

test('l’Étude imprimée : pages pleines, numérotées, renvois justes', async ({ page }) => {
  test.setTimeout(9 * 60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page, demoCredentials());
  await resetDemoByScreen(page);
  const ids = await page
    .locator('[data-testid="demo-dossier"]:not([data-stage="to_prepare"]) a')
    .evaluateAll((links) => [
      ...new Set(
        links
          .map((link) => /\/builder\/([^/?#]+)/.exec(link.getAttribute('href') ?? '')?.[1])
          .filter((id): id is string => Boolean(id)),
      ),
    ]);
  expect(ids.length).toBeGreaterThanOrEqual(10);

  for (const id of ids) {
    await test.step(`l’Étude ${id}`, async () => {
      await page.goto(`/builder/${id}/etude-de-marche`);
      await expect(page.getByTestId('market-study')).toBeVisible({ timeout: 60_000 });
      const printed = await frames(page);
      expect(printed.length, 'des pages imprimées, couverture comprise').toBeGreaterThan(2);
      expect(printed.map((frame) => frame.number)).toEqual(printed.map((_, i) => i + 1));
      for (const [index, frame] of printed.entries()) {
        if (index === 0) continue;
        expect(frame.room).toBeGreaterThan(0);
        // Rien ne déborde : la page imprimée garde son numéro.
        expect(frame.used, `page ${frame.number} : ${frame.units.join(', ')}`).toBeLessThanOrEqual(
          frame.room + 1,
        );
        const next = printed[index + 1];
        if (next) {
          expect(
            frame.used + next.firstGroup,
            `page ${frame.number} : « ${next.units[0]} » y tenait (${frame.units.join(', ')})`,
          ).toBeGreaterThan(frame.room - SLACK_MM * PX_PER_MM);
        }
      }

      // Le vrai PDF : une page par page imprimée, son numéro écrit une fois, les renvois justes.
      const pdf = await printedPdfTexts(page);
      expect(pdf).toHaveLength(printed.length);
      const total = pdf.length;
      pdf.forEach((text, index) => {
        const numbers = text.match(new RegExp(`\\b\\d+ / ${total}\\b`, 'g')) ?? [];
        expect(numbers, `page ${index + 1}`).toEqual(
          index === 0 ? [] : [`${index + 1} / ${total}`],
        );
      });
      const items = await page
        .locator('[data-print-unit="summary-items"] li[data-chapter]')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            chapter: node.getAttribute('data-chapter') ?? '',
            page: Number(
              /(\d+)\s*$/.exec(node.querySelector('[data-page-ref]')?.textContent ?? '')?.[1],
            ),
          })),
        );
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const title = (
          await page
            .locator(`[data-print-unit="band"][data-chapter="${item.chapter}"] h2`)
            .first()
            .textContent()
        )
          ?.replace(/[\s  ]+/g, ' ')
          .trim();
        expect(title, `le titre du chapitre ${item.chapter}`).toBeTruthy();
        expect(pdf[item.page - 1], `« page ${item.page} » pour ${item.chapter}`).toContain(
          title!.slice(0, 30),
        );
      }
    });
  }
});
