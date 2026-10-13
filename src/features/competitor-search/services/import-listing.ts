// Mission 101 — aucun bien retenu perdu. L'import d'UNE annonce retenue, de bout en bout :
//   1. jusqu'à trois lectures de la page (après 2 s, puis 5 s ; la dernière dans une fenêtre
//      neuve) — sauf quand réessayer ne changerait rien (robots.txt, adresse invalide, page trop
//      lourde, annonce retirée) ;
//      Mission 103 — « annonce retirée » ne se dit que sur une preuve (redirection hors de
//      l'annonce, page 404, mention explicite du portail). Une page sans prix NI preuve — une page
//      captcha, un gabarit modifié — est un échec de lecture ordinaire : relue, puis créée
//      depuis la recherche, RETENUE ;
//   2. si la page reste illisible, le concurrent est créé depuis les données de la recherche ;
//   3. si cela aussi échoue (carte sans prix, serveur injoignable), le bien reste « en attente »,
//      enregistré côté serveur, visible et relançable.
// L'orchestration ne connaît ni l'extension ni le serveur : ils lui sont passés. Elle ne lève
// jamais, et rend toujours l'une des quatre issues — jamais « rien ».

export const IMPORT_ATTEMPTS = 3;
export const IMPORT_RETRY_DELAYS_MS = [2000, 5000] as const;
export const IMPORT_ATTEMPT_TIMEOUT_MS = 30_000;
// La borne de l'action d'import (4 Mo) : une page plus lourde n'est pas envoyée.
export const MAX_LISTING_HTML_BYTES = 4 * 1024 * 1024;

// Pourquoi la page n'a pas pu être lue — une clé stable, jamais un message ni une adresse.
export const READ_FAILURE_CAUSES = [
  'robots', // le robots.txt du portail refuse la lecture automatique
  'invalid', // l'adresse de l'annonce n'en est pas une
  'network', // l'extension n'a pas obtenu la page (réseau, fenêtre fermée)
  'timeout', // aucune réponse en 30 secondes
  'too_large', // la page dépasse ce que l'import accepte
  'withdrawn', // la page PROUVE que l'annonce n'est plus en ligne (redirection, 404, mention)
  'empty', // la page ne porte ni prix ni donnée, sans preuve de retrait (captcha, gabarit modifié)
  'server', // l'import a échoué côté serveur
] as const;
export type ReadFailureCause = (typeof READ_FAILURE_CAUSES)[number];

// Les causes que le temps ne répare pas : une seule lecture, puis les données de la recherche.
const PERMANENT: readonly ReadFailureCause[] = ['robots', 'invalid', 'too_large', 'withdrawn'];

export const READ_FAILURE_LABELS: Record<ReadFailureCause | 'no_price', string> = {
  robots: 'le site refuse la lecture automatique de cette annonce',
  invalid: 'l’adresse de l’annonce est invalide',
  network: 'la page de l’annonce n’a pas répondu',
  timeout: 'la page de l’annonce n’a pas répondu en 30 secondes',
  too_large: 'la page de l’annonce est trop lourde pour être lue',
  withdrawn: 'l’annonce n’est plus en ligne',
  empty: 'page sans données (captcha ?)',
  server: 'l’import a échoué côté serveur',
  no_price: 'la recherche ne donne pas le prix de ce bien',
};

export type PageRead =
  | { ok: true; html: string; finalUrl: string }
  // Le motif de la lecture par l'extension, tel qu'elle le donne : tout ce qui n'est ni le
  // robots.txt, ni une adresse invalide, ni un délai est une page qui n'a pas répondu.
  | { ok: false; reason: string };

export type PageImportResult =
  { ok: true } | { ok: false; code?: 'listing_empty' | 'listing_withdrawn' };

export type SearchImportResult = { ok: true } | { ok: false; code?: 'no_price' };

export type ImportListingOutcome =
  // La page a été lue : le concurrent porte tout ce que l'annonce publie.
  | { status: 'imported'; attempts: number }
  // La page est restée illisible : créé depuis les données de la recherche, retenu.
  | { status: 'imported_from_search'; cause: ReadFailureCause; attempts: number }
  // L'annonce n'est plus en ligne : créé depuis la recherche, NON retenu (le conseiller décide).
  | { status: 'imported_withdrawn'; attempts: number }
  // Rien n'a pu être créé : le bien reste « retenu, import en attente » côté serveur.
  | { status: 'pending'; cause: ReadFailureCause | 'no_price'; attempts: number };

export type ImportListingDeps = {
  // `freshWindow` : la dernière tentative se fait dans une fenêtre neuve.
  readPage: (url: string, options: { freshWindow: boolean }) => Promise<PageRead>;
  // La page lue n'est plus celle de l'annonce (renvoi vers une liste, l'accueil).
  isWithdrawn?: (requestedUrl: string, finalUrl: string) => boolean;
  importPage: (url: string, html: string) => Promise<PageImportResult>;
  createFromSearch: (url: string, options: { withdrawn: boolean }) => Promise<SearchImportResult>;
  // Chaque bien dont la page n'a pas pu être lue, avec sa cause et le nombre de tentatives.
  reportReadFailure?: (url: string, cause: ReadFailureCause, attempts: number) => Promise<void>;
  wait?: (ms: number) => Promise<void>;
  attemptTimeoutMs?: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const byteLength = (text: string): number => new TextEncoder().encode(text).length;

// Une promesse, ou « timeout » si elle ne répond pas à temps ; une promesse qui rejette rend
// `onError`. Ne lève jamais.
async function guarded<T, E>(
  run: () => Promise<T>,
  timeoutMs: number,
  onError: E,
): Promise<T | E | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  try {
    return await Promise.race([
      Promise.resolve()
        .then(run)
        .catch(() => onError),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Une tentative : la page est lue puis importée. `null` = le concurrent est créé.
async function attempt(
  url: string,
  freshWindow: boolean,
  deps: ImportListingDeps,
  timeoutMs: number,
): Promise<ReadFailureCause | null> {
  const read = await guarded(() => deps.readPage(url, { freshWindow }), timeoutMs, {
    ok: false,
    reason: 'network',
  } as PageRead);
  if (read === 'timeout') return 'timeout';
  if (!read.ok) {
    return read.reason === 'robots' || read.reason === 'invalid' || read.reason === 'timeout'
      ? read.reason
      : 'network';
  }
  if (deps.isWithdrawn?.(url, read.finalUrl)) return 'withdrawn';
  if (read.html.trim() === '') return 'network';
  if (byteLength(read.html) > MAX_LISTING_HTML_BYTES) return 'too_large';
  const imported = await guarded(() => deps.importPage(url, read.html), timeoutMs, {
    ok: false,
  } as PageImportResult);
  if (imported === 'timeout') return 'timeout';
  if (imported.ok) return null;
  // Une page sans prix ni donnée n'est une annonce retirée que si elle le prouve.
  if (imported.code === 'listing_withdrawn') return 'withdrawn';
  return imported.code === 'listing_empty' ? 'empty' : 'server';
}

export async function importListing(
  url: string,
  deps: ImportListingDeps,
): Promise<ImportListingOutcome> {
  const wait = deps.wait ?? sleep;
  const timeoutMs = deps.attemptTimeoutMs ?? IMPORT_ATTEMPT_TIMEOUT_MS;
  let cause: ReadFailureCause = 'network';
  let attempts = 0;
  for (let index = 0; index < IMPORT_ATTEMPTS; index += 1) {
    if (index > 0) await wait(IMPORT_RETRY_DELAYS_MS[index - 1]);
    attempts += 1;
    const failure = await attempt(url, index === IMPORT_ATTEMPTS - 1, deps, timeoutMs);
    if (failure == null) return { status: 'imported', attempts };
    cause = failure;
    if (PERMANENT.includes(failure)) break;
  }

  // La page est restée illisible : on le note (taux d'échec par portail), sans que ce
  // signalement puisse retenir la suite.
  await guarded(
    () => deps.reportReadFailure?.(url, cause, attempts) ?? Promise.resolve(),
    timeoutMs,
    undefined,
  );

  const withdrawn = cause === 'withdrawn';
  const created = await guarded(() => deps.createFromSearch(url, { withdrawn }), timeoutMs, {
    ok: false,
  } as SearchImportResult);
  if (created !== 'timeout' && created.ok) {
    return withdrawn
      ? { status: 'imported_withdrawn', attempts }
      : { status: 'imported_from_search', cause, attempts };
  }
  const noPrice = created !== 'timeout' && created.code === 'no_price';
  return { status: 'pending', cause: noPrice ? 'no_price' : cause, attempts };
}

// Le concurrent existe-t-il dans le dossier à l'issue de l'import ?
export function isImported(outcome: ImportListingOutcome): boolean {
  return outcome.status !== 'pending';
}

// Le bien entre-t-il comme RETENU (décision « retenue », compté dans le Live) ?
export function isRetained(outcome: ImportListingOutcome): boolean {
  return outcome.status === 'imported' || outcome.status === 'imported_from_search';
}
