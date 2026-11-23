import { test as base, type BrowserContext, type Page } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Browser, BrowserContext, Locator, Page } from '@playwright/test';

// Le `test` de toutes les specs (Jean-Guy, 23/11) : les navigateurs de l'e2e ne téléchargent plus les
// photos du stockage. Un passage complet en téléchargeait 125 Mo (642 photos, journaux de Supabase du
// 23/11), et ce trafic sortant a coupé Supabase le 22/11 (`docs/PASSAGE_PAYANT.md`). À leur place,
// le navigateur de test reçoit une image minuscule, au même rapport 4 × 3 que les photos de la démo.
//
// Une spec qui vérifie les photos elles-mêmes garde les vraies : `test.use({ realPhotos: true })`
// (`demo-photos`, `live-sans-trou`). `E2E_VRAIES_PHOTOS=1` les rend à toute la suite.
//
// Ne sont remplacées que les photos des biens, du conseiller et des courriers (le seau
// `project-photos`, par liens signés), demandées comme images. Les logos, les signatures et les
// photos de la démo servies par l'application ne changent pas.
//
// Pas de `page.route()` ici : dès qu'une route existe, Playwright coupe le cache du navigateur, et
// chaque page retéléchargerait ses scripts et les photos des concurrents. L'interception passe par
// le protocole de Chromium, limitée à ces adresses.
const STORAGE_PHOTOS = '*://*/storage/v1/object/sign/project-photos/*';
// PNG de 4 × 3 points, gris, 71 octets.
const TINY_PHOTO =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADklEQVR4nGPYggQYcHIA7c4ZUbARFxgAAAAASUVORK5CYII=';

const served = new WeakMap<Page, Promise<void>>();

function serveTinyPhotos(page: Page): Promise<void> {
  let ready = served.get(page);
  if (!ready) {
    ready = (async () => {
      const session = await page.context().newCDPSession(page);
      session.on('Fetch.requestPaused', (event) => {
        void session
          .send('Fetch.fulfillRequest', {
            requestId: event.requestId,
            responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'image/png' }],
            body: TINY_PHOTO,
          })
          // La page s'est fermée entre-temps.
          .catch(() => undefined);
      });
      await session.send('Fetch.enable', {
        patterns: [{ urlPattern: STORAGE_PHOTOS, resourceType: 'Image', requestStage: 'Request' }],
      });
    })().catch(() => undefined);
    served.set(page, ready);
  }
  return ready;
}

const watched = new WeakSet<BrowserContext>();

// Chaque page du contexte, ouverte par le test ou par un clic (nouvel onglet).
function watch(context: BrowserContext): void {
  if (watched.has(context)) return;
  watched.add(context);
  for (const page of context.pages()) void serveTinyPhotos(page);
  context.on('page', (page) => void serveTinyPhotos(page));
  // Une page ouverte par le test attend d'être branchée avant sa première adresse.
  const newPage = context.newPage.bind(context);
  context.newPage = async () => {
    const page = await newPage();
    await serveTinyPhotos(page);
    return page;
  };
}

export const test = base.extend<{ realPhotos: boolean; tinyPhotos: void }>({
  realPhotos: [false, { option: true }],
  // Les contextes que la spec ouvre elle-même (`browser.newContext()` : un lien public, un téléphone).
  tinyPhotos: [
    async ({ browser, browserName, realPhotos }, run) => {
      if (realPhotos || browserName !== 'chromium' || process.env.E2E_VRAIES_PHOTOS === '1') {
        await run();
        return;
      }
      const newContext = browser.newContext;
      browser.newContext = async function (...args) {
        const context = await newContext.apply(this, args);
        watch(context);
        return context;
      };
      try {
        await run();
      } finally {
        browser.newContext = newContext;
      }
    },
    { auto: true },
  ],
  // Le contexte de la spec.
  context: async ({ context, browserName, realPhotos }, run) => {
    if (!realPhotos && browserName === 'chromium' && process.env.E2E_VRAIES_PHOTOS !== '1')
      watch(context);
    await run(context);
  },
});
