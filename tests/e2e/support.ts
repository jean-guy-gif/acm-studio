import { execFileSync } from 'node:child_process';

import { expect, type Page } from '@playwright/test';

// Mission 66 — outils du parcours de bout en bout. Rien ici ne touche la base
// directement : tout passe par l'écran, comme le ferait le conseiller. Exceptions, écrites
// avec leur raison : `removeTestOppositions` (mission 98) et `ageTestFollowUp` (mission 96)
// plus bas, et le nettoyage de fin de passage (mission 100, `global-teardown.ts`).

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
  // Mission 100 — l'agence de test est vidée à la fin de chaque passage : un conseiller sans
  // dossier arrive sur « Bienvenue » (M97), avec des dossiers sur ses dossiers. Les parcours
  // partent tous de la liste des dossiers.
  await expect(page, 'La connexion du compte de test a échoué').toHaveURL(/\/(builder|bienvenue)$/);
  if (!/\/builder$/.test(page.url())) {
    await page.goto('/builder');
    await expect(page).toHaveURL(/\/builder$/);
  }
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

// Mission 98 — la rue des adresses que le parcours inscrit sur la liste « Ne plus solliciter »,
// telle que la clé d'adresse la range (`addressKey`). Aucune vraie adresse ne lui ressemble.
// Mission 102 — la clé ne porte plus le code postal : le motif accepte les deux écritures.
export const TEST_OPPOSITION_STREET = 'rue du refus automatique';

// Mission 98 — EXCEPTION à « tout passe par l'écran » : une opposition ne se retire pas depuis
// l'écran (c'est voulu, et prouvé par supabase/tests/prospecting_oppositions.sql). Pour que la
// liste de l'agence de test ne grossisse pas d'une ligne par passage, le parcours retire les
// siennes par la CLI Supabase du poste (`supabase db query --linked`, dépôt lié au projet) :
// seulement les lignes de l'agence du compte de test, seulement celles de la rue du test.
// Rend le nombre de lignes retirées ; échoue en le disant si la CLI ne répond pas.
export function removeTestOppositions(): number {
  const email = requireEnv('E2E_EMAIL').replace(/'/g, "''");
  const sql = `with retirees as (
    delete from public.prospecting_oppositions
    where agency_id = (select agency_id from public.profiles where email = '${email}')
      and address_key like '% ${TEST_OPPOSITION_STREET} %'
    returning 1
  ) select count(*)::int as retirees from retirees`;
  let output: string;
  try {
    output = execFileSync('supabase', ['db', 'query', '--linked', sql], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Les oppositions du test n’ont pas pu être retirées : `supabase db query --linked` a échoué (CLI absente, non connectée, ou dépôt non lié).',
    );
  }
  const count = /"retirees":\s*(\d+)/.exec(output)?.[1];
  if (count === undefined) {
    throw new Error(
      'Réponse inattendue de `supabase db query` au retrait des oppositions du test.',
    );
  }
  return Number(count);
}

// Ce que la liste « Ne plus solliciter » de l'agence de test contient VRAIMENT, lu en base par la
// même CLI : les clés d'adresse de la rue du test. Un message à l'écran ne prouve pas une ligne
// écrite — c'est la base qui le dit. Lecture seule.
export function readTestOppositions(): string[] {
  const email = requireEnv('E2E_EMAIL').replace(/'/g, "''");
  const sql = `select coalesce(json_agg(address_key order by address_key), '[]'::json)::text as cles
    from public.prospecting_oppositions
    where agency_id = (select agency_id from public.profiles where email = '${email}')
      and address_key like '% ${TEST_OPPOSITION_STREET} %'`;
  let output: string;
  try {
    output = execFileSync('supabase', ['db', 'query', '--linked', sql], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'La liste d’opposition du test n’a pas pu être lue : `supabase db query --linked` a échoué.',
    );
  }
  const keys = /"cles":\s*"((?:[^"\\]|\\.)*)"/.exec(output)?.[1];
  if (keys === undefined) {
    throw new Error('Réponse inattendue de `supabase db query` à la lecture des oppositions.');
  }
  return JSON.parse(JSON.parse(`"${keys}"`)) as string[];
}

// Mission 96 — EXCEPTION à « tout passe par l'écran », comme les oppositions (M98) : la pastille
// « À relancer aujourd'hui » n'apparaît qu'après 7 jours sans contact, et « ont baissé leur
// prix » qu'après une baisse postérieure au Live. Le parcours ne peut pas attendre huit jours :
// il vieillit SON dossier par la CLI Supabase du poste, puis remet tout comme c'était.
// Seulement le dossier nommé « TEST AUTOMATIQUE … » de l'agence du compte de test :
//   • le rendez-vous recule de 9 jours et sa relance de 8 jours et 1 heure ;
//   • le premier concurrent retenu baisse de 5 000 €.
// `back` défait exactement ces trois écritures. Rend le nombre de lignes touchées.
export const TEST_PRICE_DROP = 5_000;

export type AgedFollowUp = { conclusions: number; relances: number; concurrents: number };

export function ageTestFollowUp(projectId: string, direction: 'age' | 'back'): AgedFollowUp {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('Identifiant de dossier inattendu : la base n’est pas touchée.');
  }
  const email = requireEnv('E2E_EMAIL').replace(/'/g, "''");
  const sign = direction === 'age' ? '-' : '+';
  const sql = `with dossier as (
    select id from public.projects
    where id = '${projectId}'
      and agency_id = (select agency_id from public.profiles where email = '${email}')
      and seller_name like 'TEST AUTOMATIQUE %'
  ), conclusions as (
    update public.project_meeting_conclusions
    set concluded_at = concluded_at ${sign} interval '9 days'
    where project_id in (select id from dossier)
    returning 1
  ), relances as (
    update public.follow_up_contacts
    set contacted_at = contacted_at ${sign} interval '8 days 1 hour'
    where project_id in (select id from dossier)
    returning 1
  ), concurrents as (
    update public.comparables
    set price = price ${sign} ${TEST_PRICE_DROP}
    where id = (
      select id from public.comparables
      where project_id in (select id from dossier) and is_selected
      order by display_order, id
      limit 1
    )
    returning 1
  ) select (select count(*)::int from conclusions) as conclusions,
           (select count(*)::int from relances) as relances,
           (select count(*)::int from concurrents) as concurrents`;
  let output: string;
  try {
    output = execFileSync('supabase', ['db', 'query', '--linked', sql], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Le dossier du test n’a pas pu être vieilli ou remis en état : `supabase db query --linked` a échoué (CLI absente, non connectée, ou dépôt non lié).',
    );
  }
  const read = (name: string): number => {
    const count = new RegExp(`"${name}":\\s*(\\d+)`).exec(output)?.[1];
    if (count === undefined) {
      throw new Error('Réponse inattendue de `supabase db query` au vieillissement du dossier.');
    }
    return Number(count);
  };
  return {
    conclusions: read('conclusions'),
    relances: read('relances'),
    concurrents: read('concurrents'),
  };
}
