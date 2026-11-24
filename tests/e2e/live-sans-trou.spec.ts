import { expect, test, type Page } from './test';

import { demoCredentials, login, resetDemoByScreen } from './support';

// Cette spec mesure le préchargement des photos du Live : elle garde les vraies photos du stockage
// (`test.ts`).
test.use({ realPhotos: true });

// Mission 144 — « Le Live sans trou », chronométré. Le dossier de démo « Prêt pour le Live »
// (5 concurrents, rythme accéléré), mené de l'introduction à la note de 1 à 10, en tablette
// (1024 × 768), processeur ralenti ×4, en 4G rapide puis en 4G lente (profils de Chrome). Chaque
// image affichée est relevée : écran courant, opacité, texte, première photo chargée.
//   • hors révélation, l'écran suivant est lisible moins de 300 ms après « Valider » ;
//   • aucune image sans contenu lisible au-delà de 150 ms ;
//   • une fois les photos préchargées (pendant l'introduction), plus aucun cadre photo vide.
// La démo est remise à zéro avant et après : le Live joué ici ne reste pas.

const PROFILES = {
  'la 4G rapide': {
    latency: 165,
    downloadThroughput: (9_000_000 / 8) * 0.9,
    uploadThroughput: (1_500_000 / 8) * 0.9,
  },
  'la 4G lente': {
    latency: 562.5,
    downloadThroughput: (1_600_000 / 8) * 0.9,
    uploadThroughput: (750_000 / 8) * 0.9,
  },
} as const;

const NEXT_SCREEN_MS = 300;
const EMPTY_MS = 150;
const PHOTO_MS = 150;

type Frame = {
  t: number;
  id: number;
  type: string;
  op: number;
  tl: number;
  imgs: number;
  first: number;
  btn: string;
};

// Relevé de chaque image, posé avant le chargement de la page.
const INSTRUMENT = () => {
  const w = window as unknown as { __frames: Frame[] };
  w.__frames = [];
  const ids = new WeakMap<Element, number>();
  let next = 1;
  const loop = () => {
    const m = document.querySelector('main');
    let id = 0;
    let op = -1;
    let tl = 0;
    let imgs = 0;
    let first = -1;
    let type = '';
    if (m) {
      if (!ids.has(m)) ids.set(m, next++);
      id = ids.get(m)!;
      type = m.getAttribute('data-live-page') ?? '';
      op = parseFloat(getComputedStyle(m).opacity);
      tl = (m.textContent ?? '').trim().length;
      const list = [...m.querySelectorAll('img')].filter(
        (image) => image.getBoundingClientRect().height > 0,
      );
      imgs = list.length;
      const firstImage = list[0];
      first = firstImage ? (firstImage.complete && firstImage.naturalWidth > 0 ? 1 : 0) : -1;
    }
    const button = document.querySelector('[data-testid="live-validate"]');
    const btn = button
      ? `${button.getAttribute('aria-busy') === 'true' ? 'B' : 'L'}:${(button.textContent ?? '').trim()}`
      : '';
    w.__frames.push({ t: Date.now(), id, type, op, tl, imgs, first, btn });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

async function freshDemo(page: Page): Promise<string> {
  await resetDemoByScreen(page);
  const href = await page
    .locator('[data-testid="demo-dossier"][data-stage="ready"] a')
    .first()
    .getAttribute('href');
  const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
  expect(id, 'Le dossier de démo « Prêt pour le Live » est introuvable').toBeTruthy();
  return id!;
}

const frames = (page: Page) =>
  page.evaluate(() => (window as unknown as { __frames: Frame[] }).__frames.slice());

for (const [name, network] of Object.entries(PROFILES)) {
  test(`le Live sans trou, en tablette sur ${name}`, async ({ page, context }) => {
    test.setTimeout(15 * 60_000);
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page, demoCredentials());
    const projectId = await freshDemo(page);

    await page.addInitScript(INSTRUMENT);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...network });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    try {
      await page.goto(`/live/${projectId}`);
      await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
      await page.getByTestId('launch-for-real').click();
      const start = page.getByRole('button', { name: 'Démarrer la présentation' });
      await expect(start).toBeVisible({ timeout: 90_000 });
      // Les photos du Live se chargent pendant l'introduction.
      await expect(page.locator('[data-photos-preloaded="true"]')).toHaveCount(1, {
        timeout: 120_000,
      });

      const main = page.locator('main');
      const radio = async (field: string, value?: string) => {
        const input = main
          .locator(`input[name="${field}"]${value ? `[value="${value}"]` : ''}`)
          .first();
        if ((await input.count()) === 0 || (await input.isChecked())) return;
        await input.locator('xpath=ancestor::label[1]').click();
      };

      const report: string[] = [];
      const measure = async (label: string, act: () => Promise<void>) => {
        await page.evaluate(() => {
          (window as unknown as { __frames: Frame[] }).__frames.length = 0;
        });
        await page.waitForTimeout(80);
        const before = (await frames(page)).at(-1)!;
        const reveal =
          before.btn.includes('Révéler') ||
          ['comparable_price', 'comparable_quick_guess'].includes(before.type) ||
          (before.type === 'seller_revised_price' && before.btn.includes('Confirmer'));
        const clicked = Date.now();
        await act();
        // Un vrai changement, puis un écran immobile et prêt pendant 400 ms.
        await expect
          .poll(
            async () => {
              const all = await frames(page);
              const last = all.at(-1);
              if (!last || !all.some((f) => f.id !== before.id || f.btn !== before.btn)) return 0;
              let still = 0;
              for (let i = all.length - 1; i >= 0; i -= 1) {
                const f = all[i]!;
                const ready =
                  f.id === last.id &&
                  f.op >= 0.99 &&
                  f.tl > 0 &&
                  f.first !== 0 &&
                  f.btn === last.btn;
                if (!ready) break;
                still = last.t - f.t;
              }
              return still;
            },
            { timeout: 60_000, intervals: [100] },
          )
          .toBeGreaterThanOrEqual(400);
        const after = (await frames(page)).filter((f) => f.t >= clicked);
        const change = after.find((f) => f.id !== before.id);
        const from = change?.t ?? clicked;
        const readable = after.find((f) => f.t >= from && f.op >= 0.5 && f.tl > 0);
        let empty = 0;
        for (let i = 1; i < after.length; i += 1) {
          const f = after[i - 1]!;
          if (f.id === 0 || f.op < 0.5 || f.tl === 0) empty += after[i]!.t - f.t;
        }
        const screenFrames = change ? after.filter((f) => f.id === change.id) : [];
        const photoShown = screenFrames.find((f) => f.first === 1);
        const hasPhoto = screenFrames.some((f) => f.imgs > 0);
        const line = `${label} → ${change?.type ?? before.type} : lisible ${readable ? readable.t - clicked : '—'} ms, vide ${empty} ms${hasPhoto ? `, photo ${photoShown ? photoShown.t - change!.t : 'absente'} ms` : ''}${reveal ? ' (révélation)' : ''}`;
        report.push(line);

        expect(empty, `Écran sans contenu lisible trop long — ${line}`).toBeLessThanOrEqual(
          EMPTY_MS,
        );
        if (!reveal && change) {
          expect(readable, `Écran suivant jamais lisible — ${line}`).toBeTruthy();
          expect(readable!.t - clicked, `Écran suivant trop lent — ${line}`).toBeLessThanOrEqual(
            NEXT_SCREEN_MS,
          );
        }
        if (change && hasPhoto) {
          expect(photoShown, `Cadre photo resté vide — ${line}`).toBeTruthy();
          expect(
            photoShown!.t - change.t,
            `Cadre photo vide à l’arrivée — ${line}`,
          ).toBeLessThanOrEqual(PHOTO_MS);
        }
      };

      await measure('Introduction', () => start.click());
      for (let step = 0; step < 60; step += 1) {
        const text = (await main.textContent()) ?? '';
        if (/échelle de 1 à 10/i.test(text)) break;
        await radio('seller_property_confirmed', 'yes');
        await radio('seller_serious_competitor', 'yes');
        await radio('seller_most_dangerous_comparable_id');
        const price = main.locator('input[data-price-for]').first();
        if (
          (await price.count()) > 0 &&
          (await price.isVisible()) &&
          (await price.inputValue()) === ''
        ) {
          const field = await price.getAttribute('data-price-for');
          await price.fill(field === 'commercialization_price' ? '760000' : '745000');
          if (field === 'commercialization_price') {
            await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
            await expect(page.getByText('Prix de commercialisation enregistré.')).toBeVisible();
          }
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
        const byId = page.getByTestId('live-validate');
        const button =
          (await byId.count()) > 0
            ? byId
            : page.getByRole('button', { name: /Valider et continuer/ }).last();
        await expect(button).toBeEnabled({ timeout: 30_000 });
        await measure(`${step + 1}. ${(await button.textContent())?.trim()}`, () => button.click());
      }
      await expect(main).toContainText(/échelle de 1 à 10/i);
      test.info().annotations.push({ type: 'mesure', description: report.join('\n') });
      console.log(`Le Live sur ${name} :\n${report.join('\n')}`);
    } finally {
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.goto('/builder');
      await freshDemo(page);
    }
  });
}
