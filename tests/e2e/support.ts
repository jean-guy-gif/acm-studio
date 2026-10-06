import { expect, type Page } from '@playwright/test';

// Mission 66 — outils du parcours de bout en bout. Rien ici ne touche la base
// directement : tout passe par l'écran, comme le ferait le conseiller.

export function requireEnv(name: 'E2E_EMAIL' | 'E2E_PASSWORD'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant : renseignez-le dans .env.e2e.local (ignoré par git).`);
  }
  return value;
}

// « TEST AUTOMATIQUE 2026-10-06 20:20:15 » — heure de Paris, unique à la seconde : le
// test ne travaille que sur le dossier qu'il vient de créer.
export function uniqueDossierName(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `TEST AUTOMATIQUE ${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

// Les montants s'affichent « 291 500 € » (espaces insécables fines en fr-FR) et
// voyagent « 291500 » dans la charge de la page : on compare sans aucun espace.
export function withoutSpaces(text: string): string {
  return text.replace(/[\s  ]/g, '');
}

// Toute la page telle que le navigateur la tient : le DOM ET la charge serveur embarquée
// (scripts du rendu). Un montant absent d'ici n'a pas été livré au vendeur.
export async function pagePayload(page: Page): Promise<string> {
  return withoutSpaces(await page.content());
}

export async function mainText(page: Page): Promise<string> {
  return withoutSpaces(await page.locator('main').innerText());
}

// L'URL d'essai est protégée par Vercel (Deployment Protection). Le secret « Protection
// Bypass for Automation » (facultatif, E2E_VERCEL_BYPASS) se présente une fois : Vercel
// pose alors un cookie qui couvre toute la suite de la session du navigateur.
function loginPath(): string {
  const bypass = process.env.E2E_VERCEL_BYPASS;
  if (!bypass) return '/login';
  const query = new URLSearchParams({
    'x-vercel-protection-bypass': bypass,
    'x-vercel-set-bypass-cookie': 'true',
  });
  return `/login?${query.toString()}`;
}

export async function login(page: Page): Promise<void> {
  await page.goto(loginPath());
  await expect(
    page.getByRole('heading', { name: 'Connexion' }),
    'Page de connexion d’ACM introuvable — l’URL d’essai est-elle protégée par Vercel ? ' +
      'Renseignez E2E_VERCEL_BYPASS dans .env.e2e.local.',
  ).toBeVisible();
  await page.getByLabel('Adresse e-mail').fill(requireEnv('E2E_EMAIL'));
  await page.getByLabel('Mot de passe').fill(requireEnv('E2E_PASSWORD'));
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page, 'La connexion du compte de test a échoué').toHaveURL(/\/builder$/);
}

// Aucun défilement horizontal : la page ne défile pas de côté, et aucun contenu ne dépasse
// le bord de la fenêtre. La scène du Live masque son débordement, donc un contenu rogné
// ne se verrait pas au défilement : on mesure chaque élément. Sont ignorés le décor
// (aria-hidden, ex. le halo de scène) et ce qui vit dans un conteneur qui défile ou rogne
// de lui-même (galerie de photos).
//
// La mesure ne vaut que sur un écran STABLE : l'appelant a déjà attendu le titre de
// l'écran ; ici on attend la fin des animations (transition d'entrée, révélation), et la
// mesure est reprise (expect.poll) jusqu'à se stabiliser.
//
// Mission 72 — le halo vit dans sa propre couche rognée : la scène n'est plus large que la
// fenêtre, et rien ne peut la décaler de côté. On le prouve au lieu de le contourner : la
// scène n'est PAS remise à zéro avant la mesure (un décalage laissé par un focus ou un
// recentrage se verrait), puis on tente de la décaler par programme — `scrollLeft` doit
// rester à 0.
type OverflowMeasure = {
  animations: number;
  pageScroll: number;
  stageScroll: number;
  stageShift: number;
  forcedShift: number;
  offenders: string[];
};

async function measureOverflow(page: Page): Promise<OverflowMeasure> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const stage = document.querySelector<HTMLElement>('[data-stage]') ?? document.body;
    const width = doc.clientWidth;
    const stageShift = stage.scrollLeft;
    const offenders: string[] = [];
    for (const element of stage.querySelectorAll<HTMLElement>('*')) {
      if (element.closest('[aria-hidden="true"]')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= width + 1 && rect.left >= -1) continue;
      let clipped = false;
      for (let parent = element.parentElement; parent && parent !== stage;) {
        if (getComputedStyle(parent).overflowX !== 'visible') {
          clipped = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (clipped) continue;
      const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      offenders.push(`<${element.tagName.toLowerCase()}> « ${text} »`);
      if (offenders.length >= 3) break;
    }
    // Tentative de décalage : sur une scène saine, la valeur écrite est ignorée. On rend
    // ensuite à la scène sa position d'avant, quelle qu'elle soit.
    stage.scrollLeft = stageShift + 200;
    const forcedShift = stage.scrollLeft;
    stage.scrollLeft = stageShift;
    return {
      animations: document.getAnimations().filter((a) => a.playState === 'running').length,
      pageScroll: Math.max(0, doc.scrollWidth - doc.clientWidth),
      stageScroll: stage.scrollWidth - stage.clientWidth,
      stageShift,
      forcedShift,
      offenders,
    };
  });
}

export async function expectNoHorizontalScroll(page: Page, screen: string): Promise<void> {
  await expect
    .poll(() => measureOverflow(page), {
      message: `Défilement horizontal ou contenu hors de l'écran sur « ${screen} »`,
      timeout: 10_000,
    })
    .toEqual({
      animations: 0,
      pageScroll: 0,
      stageScroll: 0,
      stageShift: 0,
      forcedShift: 0,
      offenders: [],
    });
}
