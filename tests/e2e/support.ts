import { execFileSync } from 'node:child_process';

import { expect, type Locator, type Page } from '@playwright/test';

// Mission 66 — outils du parcours de bout en bout. Rien ici ne touche la base
// directement : tout passe par l'écran, comme le ferait le conseiller. Exceptions, écrites
// avec leur raison : `removeTestOppositions` (mission 98) et `ageTestFollowUp` (mission 96)
// plus bas, et le nettoyage de fin de passage (mission 100, `global-teardown.ts`).

export function requireEnv(
  name: 'E2E_EMAIL' | 'E2E_PASSWORD' | 'E2E_DEMO_EMAIL' | 'E2E_DEMO_PASSWORD',
): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant : renseignez-le dans .env.e2e.local (ignoré par git).`);
  }
  return value;
}

// Mission 114 — le compte de l'agence de démonstration (`E2E_DEMO_EMAIL`, `E2E_DEMO_PASSWORD`),
// à part du compte de test : son agence porte le repère `is_demo`, et ses dossiers de test sont
// retirés par `removeDemoRunDossiers`. Le mot de passe ne vit que dans `.env.e2e.local`.
export type Credentials = { email: string; password: string };

export function demoCredentials(): Credentials {
  return { email: requireEnv('E2E_DEMO_EMAIL'), password: requireEnv('E2E_DEMO_PASSWORD') };
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

// Mission 145 (partie B) — « Aujourd'hui », la page d'arrivée : ouverte, chaque série dépliée,
// pour que toutes les tâches du jour se lisent (`today-task`), une par ligne ou dans sa série.
export async function openToday(page: Page, query = ''): Promise<Locator> {
  await page.goto(`/aujourdhui${query}`);
  await expect(page.getByTestId('today-page')).toBeVisible();
  const toggles = page.getByTestId('today-series-toggle');
  for (const toggle of await toggles.all()) {
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  }
  return page.getByTestId('today-page');
}

// Le menu de gauche (M145 : trois groupes, plus d'interrupteur).
export function sideNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Menu principal' });
}

// Mission 125 — Mon profil, Administration, Aide, Ma démo et Erreurs sont derrière la carte du
// conseiller, en bas du menu de gauche : on l'ouvre, puis on choisit l'entrée.
// Sous 768 px, la carte est derrière ☰ (barre compacte du haut) : on le déplie d'abord.
export async function openAccountMenu(page: Page): Promise<Locator> {
  const card = page.getByTestId('account-card');
  if (!(await card.isVisible())) {
    await page.getByTestId('mobile-menu-toggle').click();
  }
  await card.click();
  const menu = page.getByTestId('account-menu');
  await expect(menu).toBeVisible();
  return menu;
}

// Mission 146 — les actions rangées dans « … » (Supprimer, Déclarer prêt, Modifier…) : on ouvre le
// menu de la carte, puis on choisit l'entrée (son nom commence par le libellé, une précision peut
// suivre : « Déclarer prêt · il manque : … »).
export async function chooseInMoreMenu(scope: Locator, entry: string): Promise<void> {
  await scope.getByRole('button', { name: 'Plus d’actions' }).first().click();
  const escaped = entry.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
  await scope
    .page()
    .getByRole('menuitem', { name: new RegExp(`^${escaped}`) })
    .click();
}

// Mission 146 — glisser la poignée ⋮⋮ d'une carte de concurrent sur une autre. L'émulation de la
// souris de Playwright lance le glisser mais ne dépose jamais (mesuré le 08/11 sur l'essai : survol
// accepté, aucun « drop ») : on envoie donc les événements du glisser-déposer eux-mêmes, avec un
// même `DataTransfer`, comme le navigateur.
export async function dragCompetitor(from: Locator, to: Locator): Promise<void> {
  const transfer = await from.page().evaluateHandle(() => new DataTransfer());
  const handle = from.getByTestId('competitor-drag-handle');
  await handle.dispatchEvent('dragstart', { dataTransfer: transfer });
  await to.dispatchEvent('dragover', { dataTransfer: transfer });
  await to.dispatchEvent('drop', { dataTransfer: transfer });
  await handle.dispatchEvent('dragend', { dataTransfer: transfer });
}

// Lancement, mission 10 — un bloc replié de la fiche acquéreur (« Prêt à visiter ? », « Ce qui s'est
// passé ») : la spec l'ouvre, comme le conseiller, avant de lire ce qu'il contient — sinon elle
// lirait un texte que l'écran ne montre pas.
export async function openFold(page: Page, testId: string): Promise<void> {
  const fold = page.getByTestId(testId);
  await expect(fold).toHaveCount(1);
  if (!(await fold.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await fold.locator('summary').click();
  }
  await expect(fold).toHaveAttribute('open', '');
}

// Mission 146 — la règle de la 143 : au plus un bouton plein visible par écran. Les boutons pleins
// portent le repère `btn-filled` (le style `btnPrimary`).
export async function expectOneFilled(page: Page, screen: string): Promise<void> {
  const shown = await page.locator('.btn-filled').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        // Mission 146 (partie B) — le contenu d'un <details> fermé garde une taille dans Chromium
        // (content-visibility) : le navigateur dit lui-même s'il est visible.
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.visibility !== 'hidden' &&
          element.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })
        );
      })
      .map((element) => (element.textContent ?? '').trim()),
  );
  expect(
    shown.length,
    `${screen} : ${shown.length} boutons pleins (${shown.join(' · ')})`,
  ).toBeLessThanOrEqual(1);
}

// Mission 146 (partie B) — une carte (Prospection) range ses gestes secondaires dans « … » :
// l'ouvrir, puis choisir l'entrée.
export async function chooseInCardMenu(card: Locator, label: string): Promise<void> {
  await card.getByRole('button', { name: 'Plus d’actions' }).click();
  await card.getByRole('menuitem', { name: label, exact: true }).click();
}

export async function goViaAccountMenu(page: Page, label: string): Promise<void> {
  const menu = await openAccountMenu(page);
  await menu.getByRole('menuitem', { name: new RegExp(`^${label}`) }).click();
  await expect(menu).toHaveCount(0);
}

export async function login(page: Page, credentials?: Credentials): Promise<void> {
  await page.goto(loginPath());
  await expect(
    page.getByRole('heading', { name: 'Connexion' }),
    'Page de connexion d’ACM introuvable — l’URL d’essai est-elle protégée par Vercel ? ' +
      'Renseignez E2E_VERCEL_BYPASS dans .env.e2e.local.',
  ).toBeVisible();
  await page.getByLabel('Adresse e-mail').fill(credentials?.email ?? requireEnv('E2E_EMAIL'));
  await page.getByLabel('Mot de passe').fill(credentials?.password ?? requireEnv('E2E_PASSWORD'));
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Mission 100 — l'agence de test est vidée à la fin de chaque passage : un conseiller sans
  // dossier arrive sur « Bienvenue » (M97), avec des dossiers sur « Aujourd'hui » (M145). Les
  // parcours partent tous de la liste des dossiers.
  // 25/11 — juste après une remise à zéro de la démo, la base met dix à quinze secondes à répondre
  // (lu dans ses journaux) : la page d'arrivée attend, la connexion a pourtant réussi. 45 secondes,
  // pour qu'un tel moment ne fasse plus tomber la spec qui suit.
  await expect(page, 'La connexion du compte de test a échoué').toHaveURL(
    /\/(aujourdhui|bienvenue)$/,
    { timeout: 45_000 },
  );
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

// Lancement, mission 5 (Jean-Guy, 23/11) — plus aucun coût en euros devant le conseiller : ni un
// montant à centimes (« 0,60 € » ; un prix de bien n'en a pas), ni « par recherche », « par
// mois », ni un mot de dépense. Le test `no-usage-cost.test.ts` lit les textes du code ; celui-ci
// lit l'écran tel qu'il s'affiche.
const USAGE_COST =
  /\d,\d{2}\s*€|€\s+par\s+(recherche|mois)|payant|\bpayer\b|\bpayé|\bfacturé|\bcoûts?\b|\bcoûté|\bgratuit|budget de (recherche|lecture)|budget du mois|plafond du mois/i;
export async function expectNoUsageCost(page: Page, where: string): Promise<void> {
  const text = await page.locator('body').innerText();
  const found = USAGE_COST.exec(text);
  expect(
    found ? `« ${text.slice(Math.max(0, found.index - 40), found.index + 60)} »` : null,
    `${where} : un coût d’usage s’affiche devant le conseiller`,
  ).toBeNull();
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

// Mission 148 A — la frise des prix de la synthèse : à la largeur affichée, aucune étiquette (ou
// aucun rond numéroté) n'en touche une autre, aucun texte ne déborde de la sienne, et toutes
// restent dans la frise. Mesuré dans le
// navigateur, sur les seules frises visibles (la synthèse en calcule une par taille d'écran).
export async function expectReadableBands(page: Page, screen: string): Promise<void> {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const bands = [...document.querySelectorAll<HTMLElement>('[data-band]')].filter(
      (band) => band.getBoundingClientRect().height > 0,
    );
    if (bands.length === 0) out.push('aucune frise visible');
    bands.forEach((band, index) => {
      const area = band.querySelector('[data-band-area]')!.getBoundingClientRect();
      const labels = [...band.querySelectorAll<HTMLElement>('[data-band-label]')];
      // La boîte a une largeur fixe : un texte plus large qu'elle en déborderait sans la changer.
      labels.forEach((label, i) => {
        if (label.scrollWidth > label.clientWidth + 1) {
          out.push(`frise ${index + 1} : le texte de l'étiquette ${i + 1} déborde de sa boîte`);
        }
      });
      const boxes = labels.map((label) => label.getBoundingClientRect());
      boxes.forEach((box, i) => {
        if (box.left < area.left - 0.5 || box.right > area.right + 0.5) {
          out.push(`frise ${index + 1} : l'étiquette ${i + 1} sort de la frise`);
        }
        boxes.slice(i + 1).forEach((other, j) => {
          const touch =
            box.left < other.right &&
            other.left < box.right &&
            box.top < other.bottom &&
            other.top < box.bottom;
          if (touch)
            out.push(`frise ${index + 1} : les étiquettes ${i + 1} et ${i + j + 2} se touchent`);
        });
      });
    });
    return out;
  });
  expect(problems, `Frise illisible sur « ${screen} »`).toEqual([]);
}

// Mission 98 — la rue des adresses que le parcours inscrit sur la liste « Ne plus solliciter »,
// telle que la clé d'adresse la range (`addressKey`). Aucune vraie adresse ne lui ressemble.
// Mission 102 — la clé ne porte plus le code postal : le motif accepte les deux écritures.
export const TEST_OPPOSITION_STREET = 'rue du refus automatique';

// La CLI Supabase des e2e, épinglée comme celle de la sauvegarde (`scripts/sauvegarde-commun.mjs`,
// 05/11 : la CLI 3.0.0 remplace `--linked` par `--remote`) : sortie JSON, lecture seule sauf
// `write`, qui confirme d'avance l'écriture sur le projet lié (`--yes`).
const SUPABASE_CLI = ['--yes', 'supabase@3.0.0'];
function supabaseQueryArgs(sql: string, { write }: { write: boolean }): string[] {
  return [
    ...SUPABASE_CLI,
    'db',
    'query',
    '--remote',
    ...(write ? ['--yes'] : ['--read-only']),
    '--output-format',
    'json',
    '--agent',
    'no',
    sql,
  ];
}

// Mission 98 — EXCEPTION à « tout passe par l'écran » : une opposition ne se retire pas depuis
// l'écran (c'est voulu, et prouvé par supabase/tests/prospecting_oppositions.sql). Pour que la
// liste de l'agence de test ne grossisse pas d'une ligne par passage, le parcours retire les
// siennes par la CLI Supabase du poste (`supabase db query --remote`, dépôt lié au projet) :
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
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: true }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Les oppositions du test n’ont pas pu être retirées : `supabase db query --remote` a échoué (CLI absente, non connectée, ou dépôt non lié).',
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
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: false }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'La liste d’opposition du test n’a pas pu être lue : `supabase db query --remote` a échoué.',
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
    set contacted_at = contacted_at ${sign} interval '8 days 1 hour',
        -- Mission 105 — la date de prochaine relance recule de 40 jours (elle est à 1 mois quand
        -- le vendeur réfléchit au prix) : le dossier est dû ; « back » l'avance d'autant.
        next_follow_up_on = next_follow_up_on ${sign} 40
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
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: true }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Le dossier du test n’a pas pu être vieilli ou remis en état : `supabase db query --remote` a échoué (CLI absente, non connectée, ou dépôt non lié).',
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

// Mission 114 — EXCEPTION à « tout passe par l'écran », comme le nettoyage de l'agence de test
// (M100) : l'e2e `demo` conclut un dossier dans l'agence de DÉMONSTRATION, et rien de conclu ne
// se supprime depuis l'écran. Pour que l'agence partagée par les closers ne grossisse pas d'un
// dossier par passage, le parcours retire, par la CLI Supabase du poste :
//   • les dossiers « TEST AUTOMATIQUE … » de l'agence du compte de démo, avec tout ce qui en
//     dépend (concurrents, réponses, conclusions, relances, courriers, liens de synthèse…) ;
//   • les lignes « Ne plus solliciter » que ce passage a inscrites (depuis `since`).
// Le bloc REVÉRIFIE dans la base que l'agence porte le repère `is_demo` : ailleurs, rien n'est
// supprimé. Les photos du bien vendeur déposées dans le stockage ne sont pas retirées (comme pour
// l'agence de test). Rend le nombre de dossiers et d'oppositions retirés.
export function removeDemoRunDossiers(since: Date): { dossiers: number; oppositions: number } {
  const email = requireEnv('E2E_DEMO_EMAIL').replace(/'/g, "''");
  // Une seule instruction : chaque suppression est cadrée sur l'agence de DÉMONSTRATION du compte
  // (`is_demo` relu ici) et sur les dossiers « TEST AUTOMATIQUE … » ; hors d'une agence de démo,
  // la liste est vide et rien n'est supprimé.
  const sql = `with demo_agency as (
    select a.id from public.profiles p join public.agencies a on a.id = p.agency_id
    where lower(p.email) = lower('${email}') and a.is_demo
  ), run_dossiers as (
    select id from public.projects
    where agency_id in (select id from demo_agency) and seller_name like 'TEST AUTOMATIQUE %'
  ), run_properties as (
    select id from public.subject_properties where project_id in (select id from run_dossiers)
  ), d1 as (delete from public.live_reopenings where project_id in (select id from run_dossiers) returning 1),
  d2 as (delete from public.stream_estate_results where project_id in (select id from run_dossiers) returning 1),
  d3 as (delete from public.competitor_prospecting_files where project_id in (select id from run_dossiers) returning 1),
  d4 as (delete from public.live_seller_responses where project_id in (select id from run_dossiers) returning 1),
  d5 as (delete from public.live_seller_summary where project_id in (select id from run_dossiers) returning 1),
  d6 as (delete from public.follow_up_contacts where project_id in (select id from run_dossiers) returning 1),
  d7 as (delete from public.seller_synthesis_links where project_id in (select id from run_dossiers) returning 1),
  d8 as (delete from public.project_meeting_conclusions where project_id in (select id from run_dossiers) returning 1),
  d9 as (delete from public.project_price_positionings where project_id in (select id from run_dossiers) returning 1),
  d10 as (delete from public.pending_competitor_imports where project_id in (select id from run_dossiers) returning 1),
  d11 as (delete from public.competitor_decisions where project_id in (select id from run_dossiers) returning 1),
  d12 as (delete from public.comparables where project_id in (select id from run_dossiers) returning 1),
  d13 as (delete from public.subject_property_condominiums where subject_property_id in (select id from run_properties) returning 1),
  d14 as (delete from public.subject_property_diagnostics where subject_property_id in (select id from run_properties) returning 1),
  d15 as (delete from public.subject_properties where project_id in (select id from run_dossiers) returning 1),
  d16 as (delete from public.projects where id in (select id from run_dossiers) returning 1),
  d17 as (
    delete from public.prospecting_oppositions
    where agency_id in (select id from demo_agency)
      and created_at >= '${since.toISOString()}'::timestamptz
    returning 1
  )
  select (select count(*)::int from d16) as dossiers, (select count(*)::int from d17) as oppositions`;
  let output: string;
  try {
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: true }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
    throw new Error(
      `Les dossiers de démonstration du test n’ont pas pu être retirés : \`supabase db query --remote\` a échoué. ${detail.slice(0, 300)}`,
    );
  }
  const read = (name: string): number => {
    const count = new RegExp(`"${name}":\\s*(\\d+)`).exec(output)?.[1];
    if (count === undefined) {
      throw new Error('Réponse inattendue de `supabase db query` au retrait des dossiers de démo.');
    }
    return Number(count);
  };
  return { dossiers: read('dossiers'), oppositions: read('oppositions') };
}

// Mission 122 (partie B, essai de Jean-Guy, 25/10) — « le lien enregistre une réponse différente
// de celle touchée » : un message à l'écran ne prouve pas une ligne écrite (comme les oppositions,
// M103). Les réponses « depuis le lien » de la sélection la plus récente d'un acquéreur de l'agence
// de DÉMONSTRATION du compte de démo, lues EN BASE par la CLI Supabase du poste ; lecture seule.
export type LinkAnswerRow = { position: number; answer: string; reasons: string[] };

export function readDemoLinkAnswers(buyerName: string): LinkAnswerRow[] {
  const email = requireEnv('E2E_DEMO_EMAIL').replace(/'/g, "''");
  const name = buyerName.replace(/'/g, "''");
  const sql = `with demo_agency as (
    select a.id from public.profiles p join public.agencies a on a.id = p.agency_id
    where lower(p.email) = lower('${email}') and a.is_demo
  ), latest as (
    select s.id from public.buyer_selections s join public.buyers b on b.id = s.buyer_id
    where b.agency_id in (select id from demo_agency) and b.name = '${name}' and b.archived_at is null
    order by s.created_at desc limit 1
  )
  select coalesce(json_agg(json_build_object('position', i.position, 'answer', r.answer,
    'reasons', r.reasons) order by i.position), '[]'::json)::text as reponses
  from public.buyer_item_responses r
  join public.buyer_selection_items i on i.id = r.selection_item_id
  where i.selection_id in (select id from latest) and r.answered_during = 'dossier'`;
  let output: string;
  try {
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: false }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Les réponses du lien n’ont pas pu être lues : `supabase db query --remote` a échoué.',
    );
  }
  const rows = /"reponses":\s*"((?:[^"\\]|\\.)*)"/.exec(output)?.[1];
  if (rows === undefined) {
    throw new Error('Réponse inattendue de `supabase db query` à la lecture des réponses du lien.');
  }
  return JSON.parse(JSON.parse(`"${rows}"`)) as LinkAnswerRow[];
}

// Mission 132 — EXCEPTION à « tout passe par l'écran », comme les relances (M96) : « À recontacter »
// n'arrive qu'après 30 jours sans échange. Le parcours vieillit SA fiche acquéreur par la CLI
// Supabase du poste — création et statut reculés de 40 jours, dernier contact effacé — seulement
// la fiche nommée « Acquéreur TEST AUTOMATIQUE … » de l'agence du compte de test. Rend le nombre
// de fiches touchées (0 ou 1).
export function ageTestBuyer(buyerId: string): number {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(buyerId)) {
    throw new Error('Identifiant de fiche inattendu : la base n’est pas touchée.');
  }
  const email = requireEnv('E2E_EMAIL').replace(/'/g, "''");
  const sql = `with aged as (
    update public.buyers
    set created_at = now() - interval '40 days',
        status_changed_at = now() - interval '40 days',
        contacted_at = null
    where id = '${buyerId}'
      and agency_id = (select agency_id from public.profiles where email = '${email}')
      and name like 'Acquéreur TEST AUTOMATIQUE %'
    returning 1
  ) select count(*)::int as fiches from aged`;
  let output: string;
  try {
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: true }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'La fiche acquéreur du test n’a pas pu être vieillie : `supabase db query --remote` a échoué.',
    );
  }
  const count = /"fiches":\s*(\d+)/.exec(output)?.[1];
  if (count === undefined) {
    throw new Error('Réponse inattendue de `supabase db query` au vieillissement de la fiche.');
  }
  return Number(count);
}

// Mission 133 — un message à l'écran ne prouve pas une ligne écrite (M103) : le moment où les
// acquéreurs ont été montrés au vendeur se relit EN BASE, en lecture seule, sur un dossier de
// l'agence de démonstration du compte de démo. Rend le nombre noté, ou null.
export function readDemoBuyersShown(projectId: string): number | null {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('Identifiant de dossier inattendu : la base n’est pas lue.');
  }
  const email = requireEnv('E2E_DEMO_EMAIL').replace(/'/g, "''");
  const sql = `select coalesce((select s.buyers_shown_count from public.live_seller_summary s
    join public.agencies a on a.id = s.agency_id
    where s.project_id = '${projectId}' and a.is_demo
      and s.agency_id = (select agency_id from public.profiles where lower(email) = lower('${email}'))
      and s.buyers_shown_at is not null), -1)::int as montres`;
  let output: string;
  try {
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: false }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error('Les acquéreurs montrés n’ont pas pu être lus : `supabase db query` a échoué.');
  }
  const count = /"montres":\s*(-?\d+)/.exec(output)?.[1];
  if (count === undefined) {
    throw new Error(
      'Réponse inattendue de `supabase db query` à la lecture des acquéreurs montrés.',
    );
  }
  return Number(count) < 0 ? null : Number(count);
}

// Mission 155 — « Veille active » restée à l'écran alors que la base tenait 0 € (13/11) : un état
// à l'écran ne prouve pas un plafond écrit (M103). Le plafond de la veille de l'agence de
// démonstration du compte de démo, en centimes, lu EN BASE ; lecture seule.
export function readDemoWatchCap(): number {
  const email = requireEnv('E2E_DEMO_EMAIL').replace(/'/g, "''");
  const sql = `select coalesce((select a.buyer_watch_cap_cents from public.agencies a
    join public.profiles p on p.agency_id = a.id
    where lower(p.email) = lower('${email}') and a.is_demo), -1)::int as plafond`;
  let output: string;
  try {
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: false }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error('Le plafond de la veille n’a pas pu être lu : `supabase db query` a échoué.');
  }
  const cap = /"plafond":\s*(-?\d+)/.exec(output)?.[1];
  if (cap === undefined || Number(cap) < 0) {
    throw new Error('Réponse inattendue de `supabase db query` à la lecture du plafond.');
  }
  return Number(cap);
}

// Mission 155 — EXCEPTION à « tout passe par l'écran » (décision de Jean-Guy, 13/11) : le test de
// la veille remet TOUJOURS l'agence à son plafond de départ, même quand l'écran a échoué. Écrit
// seulement le plafond de l'agence de DÉMONSTRATION du compte e2e de démo ; rend le nombre
// d'agences touchées (0 ou 1).
export function restoreDemoWatchCap(cents: number): number {
  if (!Number.isInteger(cents) || cents < 0 || cents > 100_000) {
    throw new Error('Plafond inattendu : la base n’est pas touchée.');
  }
  const email = requireEnv('E2E_DEMO_EMAIL').replace(/'/g, "''");
  const sql = `with restored as (
    update public.agencies set buyer_watch_cap_cents = ${cents}
    where is_demo and id = (select agency_id from public.profiles where lower(email) = lower('${email}'))
    returning 1
  ) select count(*)::int as agences from restored`;
  let output: string;
  try {
    output = execFileSync('npx', supabaseQueryArgs(sql, { write: true }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Le plafond de la veille n’a pas pu être remis : `supabase db query` a échoué.',
    );
  }
  const count = /"agences":\s*(\d+)/.exec(output)?.[1];
  if (count === undefined) {
    throw new Error('Réponse inattendue de `supabase db query` à la remise du plafond.');
  }
  return Number(count);
}

// Mission 148 — le commentaire facultatif du Live s'ouvre par « + Ajouter un commentaire ».
export async function fillLiveComment(page: Page, name: string, text: string): Promise<void> {
  const area = page.locator(`textarea[name="${name}"]`);
  if ((await area.count()) === 0) {
    await page.locator('main [data-add-comment]').click();
  }
  await area.fill(text);
}

// Mission 148 — aucun écran du Live ne défile : ni la page, ni la fiche (qui défilerait elle-même
// sur une fenêtre trop basse), et aucun contenu ne passe sous la barre du bas. Mesuré dans le
// navigateur, à la taille de fenêtre courante.
type VerticalMeasure = { pageScroll: number; mainScroll: number; underBar: number; what: string };
async function measureVertical(page: Page): Promise<VerticalMeasure> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector<HTMLElement>('main');
    const bar = document.querySelector<HTMLElement>('[data-live-bar]');
    const limit = bar ? bar.getBoundingClientRect().top : window.innerHeight;
    let bottom = 0;
    let what = '';
    if (main) {
      for (const element of main.querySelectorAll<HTMLElement>('*')) {
        // Une visionneuse ou « Revoir », ouverts par-dessus, ne comptent pas.
        if (element.closest('[role="dialog"]')) continue;
        if (element.closest('[aria-hidden="true"]')) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom > bottom) {
          bottom = rect.bottom;
          what = `<${element.tagName.toLowerCase()}> « ${(element.textContent ?? '')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 40)} »`;
        }
      }
    }
    const underBar = Math.max(0, Math.round(bottom - limit));
    return {
      pageScroll: Math.max(0, doc.scrollHeight - doc.clientHeight),
      mainScroll: main ? Math.max(0, main.scrollHeight - main.clientHeight - 1) : 0,
      underBar,
      what: underBar > 0 ? what : '',
    };
  });
}

export async function expectNoVerticalScroll(page: Page, screen: string): Promise<void> {
  await expect
    .poll(() => measureVertical(page), {
      message: `L'écran « ${screen} » défile ou passe sous la barre du bas`,
      timeout: 10_000,
    })
    .toEqual({ pageScroll: 0, mainScroll: 0, underBar: 0, what: '' });
}

// Mission 147 (partie B) — la démo remise à neuf par l'écran : « Préparer ma démo » s'il n'y a rien,
// sinon « Remettre ma démo à zéro » et sa confirmation ; la barre des étapes, puis « Votre démo est
// prête » (la base relue : six dossiers, neuf acquéreurs), jamais un message d'échec.
export async function resetDemoByScreen(page: Page): Promise<void> {
  await goViaAccountMenu(page, 'Ma démo');
  await expect(page).toHaveURL(/\/ma-demo$/);
  await expect(page.getByTestId('demo-dossiers')).toBeVisible();
  const hrefs = () =>
    page
      .getByTestId('demo-dossier')
      .evaluateAll((items) => items.map((item) => item.querySelector('a')?.getAttribute('href')));
  const before = await hrefs();
  if (before.length === 0) {
    await page.getByRole('button', { name: 'Préparer ma démo' }).click();
  } else {
    await page.getByRole('button', { name: 'Remettre ma démo à zéro' }).click();
    await page
      .getByTestId('demo-reset-confirm')
      .getByRole('button', { name: 'Remettre à zéro' })
      .click();
  }
  // Pendant ce temps, la barre des étapes et aucun bouton.
  await expect(page.getByTestId('demo-setup-progress')).toBeVisible();
  await expect(
    page.getByTestId('demo-ready').or(page.getByTestId('demo-setup-failed')),
  ).toBeVisible({ timeout: 180_000 });
  await expect(page.getByTestId('demo-setup-failed')).toHaveCount(0);
  // La liste est relue après « prête » : les nouveaux dossiers, jamais les anciens.
  await expect
    .poll(
      async () => {
        // « À relancer » mène au Suivi (la même adresse d'une démo à l'autre) : seules les
        // adresses de dossiers se comparent.
        const after = await hrefs();
        const dossiers = after.filter((href) => href?.startsWith('/builder/'));
        return (
          // Mission 155 — douze dossiers, dont onze ouvrent leur page (« À relancer » mène au Suivi).
          after.length === 12 &&
          dossiers.length === 11 &&
          dossiers.every((href) => !before.includes(href))
        );
      },
      { timeout: 30_000, message: 'La liste n’a pas montré les douze nouveaux dossiers' },
    )
    .toBe(true);
}

// Mission 147 (partie B) — chaque photo d'un écran se charge : aucune image cassée, aucun cadre
// « Pas de photo » ou « Photo indisponible », et au moins `atLeast` photos chargées. Les images
// paresseuses sont demandées tout de suite (`loading = eager`), sans faire défiler l'écran.
export async function expectPhotosLoaded(
  scope: Locator,
  screen: string,
  atLeast: number,
): Promise<void> {
  await expect(scope.getByText(/^Pas de photo$/), `${screen} : un cadre sans photo`).toHaveCount(0);
  await expect(
    scope.locator('[role="img"][aria-label*="Photo indisponible"]'),
    `${screen} : une photo indisponible`,
  ).toHaveCount(0);
  const states = () =>
    scope.locator('img').evaluateAll((images) =>
      (images as HTMLImageElement[]).map((image) => {
        if (image.loading === 'lazy') image.loading = 'eager';
        return image.complete ? (image.naturalWidth > 0 ? 'ok' : 'broken') : 'pending';
      }),
    );
  await expect
    .poll(async () => (await states()).includes('pending'), {
      timeout: 30_000,
      message: `${screen} : des photos ne finissent pas de charger`,
    })
    .toBe(false);
  const final = await states();
  expect(
    final.filter((state) => state === 'broken'),
    `${screen} : une photo cassée`,
  ).toEqual([]);
  expect(
    final.filter((state) => state === 'ok').length,
    `${screen} : trop peu de photos chargées`,
  ).toBeGreaterThanOrEqual(atLeast);
}

// Mission 151 — EXCEPTION à « tout passe par l'écran », en LECTURE SEULE (modèle de la M103) : un
// message à l'écran ne prouve pas qu'une ligne des notes n'est PAS écrite. Rend, en un texte, la
// fiche créée depuis les notes, les lectures de l'agence de démonstration et les erreurs du
// journal de la dernière heure : le parcours y cherche chaque source montrée à la validation.
export function readNotesTraces(buyerId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(buyerId)) throw new Error('Identifiant de fiche inattendu.');
  const email = requireEnv('E2E_DEMO_EMAIL').replace(/'/g, "''");
  const sql = `with demo_agency as (
    select a.id from public.profiles p join public.agencies a on a.id = p.agency_id
    where lower(p.email) = lower('${email}') and a.is_demo
  )
  select concat_ws(' ',
    (select row_to_json(b)::text from public.buyers b
       where b.id = '${buyerId}' and b.agency_id in (select id from demo_agency)),
    (select coalesce(json_agg(u)::text, '') from public.ai_usage u
       where u.agency_id in (select id from demo_agency) and u.created_at > now() - interval '1 hour'),
    (select coalesce(json_agg(e.message)::text, '') from public.app_errors e
       where e.created_at > now() - interval '1 hour')
  ) as traces`;
  try {
    return execFileSync('npx', supabaseQueryArgs(sql, { write: false }), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error('Les traces n’ont pas pu être lues : `supabase db query --remote` a échoué.');
  }
}

// Mission 163 A — le nombre de pages A4 de l'Étude imprimée par le navigateur (Chromium), images
// et polices chargées : une par page de l'Étude quand rien ne déborde ni ne se coupe.
export async function studyPrintedPages(page: Page): Promise<number> {
  await page.emulateMedia({ media: 'print' });
  try {
    await page.evaluate(async () => {
      for (const img of document.images) img.loading = 'eager';
      await Promise.all(
        [...document.images].map((img) =>
          img.complete
            ? null
            : new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
              }),
        ),
      );
      await document.fonts.ready;
    });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  } finally {
    await page.emulateMedia({ media: 'screen' });
  }
}

// Mission 163 A — le lien public de l'Étude, créé depuis la page du conseiller, ouvert sans compte
// dans un navigateur neuf à la largeur d'un téléphone (390 px) : lisible, sans défilement de côté ;
// puis retiré.
export async function openStudyLinkOnPhone(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Créer un (nouveau )?lien/ }).click();
  const link = (await page.getByTestId('market-study-link').innerText()).trim();
  expect(link).toMatch(/\/etude-de-marche\/[A-Za-z0-9_-]{43}$/);
  const bypass = process.env.E2E_VERCEL_BYPASS;
  const stranger = await page
    .context()
    .browser()!
    .newContext({
      viewport: { width: 390, height: 844 },
      ...(bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {}),
    });
  try {
    const phone = await stranger.newPage();
    await phone.goto(link);
    await expect(phone.getByTestId('market-study')).toBeVisible({ timeout: 60_000 });
    await expect(phone.getByTestId('study-cover-title')).toBeVisible();
    await expectNoHorizontalScroll(phone, 'L’Étude de marché sur téléphone (390 px)');
  } finally {
    await stranger.close();
  }
  await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
  await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
}

// Correctifs 163 — le vrai PDF A4 d'une page imprimable, comme `studyPrintedPages`, rendu en texte
// page par page (pdf.js, en Node : aucun outil du poste) : pour lire sur la page N son numéro et le
// chapitre que le résumé y annonce.
export async function printedPdfTexts(page: Page): Promise<string[]> {
  await page.emulateMedia({ media: 'print' });
  let pdf: Buffer;
  try {
    await page.evaluate(async () => {
      for (const img of document.images) img.loading = 'eager';
      await Promise.all(
        [...document.images].map((img) =>
          img.complete
            ? null
            : new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
              }),
        ),
      );
      await document.fonts.ready;
    });
    pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.emulateMedia({ media: 'screen' });
  }
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise;
  const texts: string[] = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const content = await (await doc.getPage(n)).getTextContent();
    texts.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/[\s  ]+/g, ' '),
    );
  }
  return texts;
}

// Correctifs 163 — les pages imprimées de l'Étude de marché, telles que le code les décide
// (`study-print.ts`), mesurées en hauteurs réelles à l'impression (A4 à 96 points par pouce).
const PRINT_PX_PER_MM = 96 / 25.4;
// La tolérance du « n'y tenait pas » : les hauteurs du code sont estimées, un peu larges par prudence.
const PRINT_SLACK_MM = 12;

export type PrintedFrame = {
  number: number;
  room: number;
  used: number;
  firstGroup: number;
  units: string[];
  chapters: (string | null)[];
};

export async function printedStudyFrames(page: Page): Promise<PrintedFrame[]> {
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: 'print' });
  try {
    return await page.locator('[data-print-page]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const body = node.querySelector('[data-print-body]');
        const units = body ? [...body.querySelectorAll(':scope > [data-print-unit]')] : [];
        const boxes = units.map((unit) => unit.getBoundingClientRect());
        const used = boxes.length ? boxes.at(-1)!.bottom - boxes[0]!.top : 0;
        let firstGroup = 0;
        for (const unit of units) {
          firstGroup = unit.getBoundingClientRect().bottom - (boxes[0]?.top ?? 0);
          if (unit.getAttribute('data-keep-next') !== 'true') break;
        }
        return {
          number: Number(node.getAttribute('data-print-page')),
          room: body ? Number(body.getAttribute('data-room-px')) : 0,
          used,
          firstGroup,
          units: units.map((unit) => unit.getAttribute('data-print-unit') ?? ''),
          chapters: units.map((unit) => unit.getAttribute('data-chapter')),
        };
      }),
    );
  } finally {
    await page.emulateMedia({ media: 'screen' });
    if (viewport) await page.setViewportSize(viewport);
  }
}

// Les règles de l'Étude imprimée, sur la page ouverte (retours de Jean-Guy du 23/11) :
//  - des pages pleines : rien ne déborde d'une feuille, et une page ne passe à la suivante que si le
//    bloc suivant (un titre et ce qui le suit, ou l'avis d'un chapitre) n'y tenait pas ;
//  - le classement ne se coupe jamais jusqu'à 12 lignes ;
//  - l'avis reste avec son chapitre quand il y tient ; sinon il ouvre la page suivante, jamais
//    seul : ce qui suit (le chapitre suivant ou « La suite ») commence sur la même page ;
//  - « La suite » ne se coupe pas ;
//    (les deux règles rares du paginateur, pour qu'un avis ne soit jamais seul — « La suite »
//    coupée après les papiers sous un avis qui ouvre sa page, le dernier bloc qui descend avec son
//    avis devant un classement de 11 ou 12 lignes —, ne jouent sur aucune Étude de la démo : cette
//    aide passerait au rouge si l'une y tombait, et le dirait ; le banc `npm run banc:etude` et
//    les tests unitaires les prouvent) ;
//  - dans le vrai PDF, « N / T » écrit une fois sur la page N, et chaque renvoi du résumé tombe sur
//    la page où commence le chapitre annoncé.
export async function expectStudyPrintedWell(page: Page): Promise<PrintedFrame[]> {
  const printed = await printedStudyFrames(page);
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
      ).toBeGreaterThan(frame.room - PRINT_SLACK_MM * PRINT_PX_PER_MM);
    }
    frame.units.forEach((unit, at) => {
      if (unit !== 'avis') return;
      if (at === 0) {
        // En tête de page (il ne tenait pas avec son chapitre : la page d'avant est pleine, vérifié
        // plus haut) : jamais seul, ce qui suit commence sur la même page.
        expect(
          frame.units.length,
          `page ${frame.number} : l’avis de « ${frame.chapters[0]} » seul sur sa page`,
        ).toBeGreaterThan(1);
        expect(frame.chapters[1]).not.toBe(frame.chapters[0]);
      } else {
        // Sinon, derrière le dernier bloc de son chapitre.
        expect(
          frame.chapters[at - 1],
          `page ${frame.number} : l’avis de « ${frame.chapters[at]} » loin de son chapitre`,
        ).toBe(frame.chapters[at]);
      }
    });
  }

  const ranking = printed.filter((frame) =>
    frame.units.some((unit) => unit.startsWith('ranking-')),
  );
  if (ranking.length > 0) {
    const rows = await page.locator('[data-print-unit="ranking-row"] tbody tr').count();
    if (rows <= 12) {
      expect(ranking, 'le classement sur une seule page').toHaveLength(1);
      expect(ranking[0]!.units).toEqual(
        expect.arrayContaining(['band', 'ranking-head', 'ranking-row', 'ranking-legend']),
      );
    }
  }

  // « La suite » ne se coupe pas : ses étapes, les papiers, le conseiller, les sources et les
  // mentions sur une même page imprimée.
  const closing = printed.filter((frame) => frame.units.some((unit) => unit.startsWith('next-')));
  expect(closing, '« La suite » sur une seule page').toHaveLength(1);
  expect(closing[0]!.units).toEqual(
    expect.arrayContaining([
      'next-head',
      'next-papers',
      'next-contact',
      'next-is',
      'next-mentions',
    ]),
  );

  // Le vrai PDF : une page par page imprimée, son numéro écrit une fois, les renvois justes.
  const pdf = await printedPdfTexts(page);
  expect(pdf).toHaveLength(printed.length);
  const total = pdf.length;
  pdf.forEach((text, index) => {
    const numbers = text.match(new RegExp(`\\b\\d+ / ${total}\\b`, 'g')) ?? [];
    expect(numbers, `page ${index + 1}`).toEqual(index === 0 ? [] : [`${index + 1} / ${total}`]);
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
    // Le renvoi est le numéro de la page imprimée où commence le chapitre (son titre)…
    const at = await page
      .locator(
        `[data-print-page]:has(> [data-print-body] > [data-print-unit="band"][data-chapter="${item.chapter}"])`,
      )
      .getAttribute('data-print-page');
    expect(Number(at), `« page ${item.page} » pour ${item.chapter}`).toBe(item.page);
    // … et dans le vrai PDF, cette page porte bien le titre du chapitre.
    const title = (
      await page
        .locator(`[data-print-unit="band"][data-chapter="${item.chapter}"] h2`)
        .first()
        .textContent()
    )
      ?.replace(/[\s\u00a0\u202f]+/g, ' ')
      .trim();
    expect(title, `le titre du chapitre ${item.chapter}`).toBeTruthy();
    expect(pdf[item.page - 1], `« page ${item.page} » pour ${item.chapter}`).toContain(
      title!.slice(0, 30),
    );
  }
  return printed;
}
