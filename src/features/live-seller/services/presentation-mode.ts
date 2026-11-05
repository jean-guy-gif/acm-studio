// Mission 131 — la façon de présenter un dossier, choisie par le conseiller sur « Avant le
// rendez-vous » et mémorisée sur le dossier (`projects.live_presentation_mode`) :
//   • « interactive » : le Live d'aujourd'hui, qui demande au vendeur (défaut) ;
//   • « direct » : le même Live, sans aucun écran qui lui demande quelque chose — chaque concurrent
//     arrive avec son prix affiché ; le conseiller commente ;
//   • « document » : pas de Live, l'« Étude de marché » seule.
// Le conseiller ne dit jamais « vous ne voulez pas jouer » : c'est lui qui change de rythme, et rien
// à l'écran ne dit au vendeur qu'il a refusé quoi que ce soit. Pur.
export const LIVE_PRESENTATION_MODES = ['interactive', 'direct', 'document'] as const;
export type LivePresentationMode = (typeof LIVE_PRESENTATION_MODES)[number];
export const DEFAULT_LIVE_PRESENTATION_MODE: LivePresentationMode = 'interactive';

// Une valeur inconnue en base vaut le Live interactif, celui d'avant la mission.
export function livePresentationMode(value: string | null | undefined): LivePresentationMode {
  return (LIVE_PRESENTATION_MODES as readonly string[]).includes(value ?? '')
    ? (value as LivePresentationMode)
    : DEFAULT_LIVE_PRESENTATION_MODE;
}

export function isLivePresentationMode(value: unknown): value is LivePresentationMode {
  return (
    typeof value === 'string' && (LIVE_PRESENTATION_MODES as readonly string[]).includes(value)
  );
}

export const LIVE_PRESENTATION_MODE_LABELS: Record<LivePresentationMode, string> = {
  interactive: 'Live interactif',
  direct: 'Présentation directe',
  document: 'Document seul',
};

// Côté conseiller seulement (« Avant le rendez-vous ») : ce que chaque façon fait.
export const LIVE_PRESENTATION_MODE_HINTS: Record<LivePresentationMode, string> = {
  interactive: 'Le vendeur répond à chaque écran : son prix, ses devinettes, sa note.',
  direct:
    'Le même Live, sans rien lui demander : chaque concurrent arrive avec son prix affiché, vous commentez.',
  document: 'Pas de Live : vous remettez l’Étude de marché et concluez depuis le dossier.',
};

// Le prix d'un concurrent a-t-il été MONTRÉ au vendeur ? Deviné (M41), ou montré en directe
// (M131) : les deux faits sont en base, et c'est l'un ou l'autre qui autorise sa révélation.
export type ShownResponse = {
  seller_estimated_listing_price?: number | null;
  shown_directly_at?: string | null;
} | null;

export function priceShown(response: ShownResponse | undefined): boolean {
  return response?.seller_estimated_listing_price != null || response?.shown_directly_at != null;
}

export function shownDirectly(response: ShownResponse | undefined): boolean {
  return response?.shown_directly_at != null;
}

// Messages d'un changement refusé (côté conseiller).
export const PRESENTATION_MODE_CONCLUDED_MESSAGE =
  'Rendez-vous conclu : la façon de présenter ne change plus.';
export const PRESENTATION_MODE_STARTED_MESSAGE =
  'Le Live a commencé : il ne devient pas un document seul.';
