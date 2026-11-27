import type { FollowUpGroup } from '@/features/buyers/services/buyer-follow-up';
import type { BuyerFinancing } from '@/features/buyers/types';

// Lancement, mission 10 (Jean-Guy, 23/11 ; maquette `L10-fiche-acquereur-simplifiee.png`) — la fiche
// acquéreur simplifiée : UNE prochaine étape, juste sous les étapes à toutes les largeurs, comme
// sur la Vue d'ensemble d'un dossier vendeur (M143) ; « Son suivi » ; et ce qui ne sert pas à la
// prochaine étape se replie ou devient un lien d'« Autres actions ». Rien n'est retiré. Les règles
// de ce qui se montre vivent ici, pas dans la page. Pur.

// « Sa sélection » ne garde son bloc que tant qu'elle est à présenter : envoyée ou présentée, ses
// biens se lisent dans « Son suivi », une seule fois. Si le suivi n'a pas pu être lu, elle reste :
// rien ne disparaît sur une lecture en échec (M98). En pause pendant une vente (M143).
export function selectionShown(input: {
  hasSelection: boolean;
  sale: boolean;
  sent: boolean;
  followUpRead: boolean;
}): boolean {
  if (!input.hasSelection || input.sale) return false;
  return !input.sent || !input.followUpRead;
}

// « Prêt à visiter ? » est replié quand il l'est ; il s'ouvre seul quand il manque quelque chose
// (financement à confirmer, acquéreur à recontacter) à un acquéreur qui cherche encore : pour un
// acquéreur qui a acheté ou abandonné, rien ne manque, il reste replié.
export const readinessOpen = (state: 'ready' | 'recontact' | null, searching: boolean): boolean =>
  searching && state !== 'ready';

const FINANCING_WORDS: Record<BuyerFinancing, string> = {
  validated: 'financement validé',
  in_progress: 'financement en cours',
  unknown: 'financement à confirmer',
};

// La ligne du bloc replié : l'essentiel, sans l'ouvrir — son financement, le dernier échange, et
// la veille (M136 : « sur la fiche », donc lisible sans ouvrir le bloc).
export function readinessLine(input: {
  financing: BuyerFinancing;
  lastExchange: string | null;
  // « Veille : dernière recherche le 21/11, prochaine le 28/11 », telle que le bloc la dit.
  watch?: string | null;
}): string {
  const watch = input.watch ? input.watch.charAt(0).toLowerCase() + input.watch.slice(1) : null;
  return [FINANCING_WORDS[input.financing], input.lastExchange, watch].filter(Boolean).join(' · ');
}

// « 8 événements, le dernier aujourd'hui » ; `last` : la date du plus récent, déjà dite en mots.
export function timelineLine(events: number, last: string | null = null): string {
  if (events === 0) return 'rien pour l’instant';
  const count = `${events} événement${events > 1 ? 's' : ''}`;
  return last ? `${count}, le dernier ${last}` : count;
}

export type OtherAction = {
  key: 'matches' | 'voucher' | 'offer';
  label: string;
  href: string;
  // Une lecture en échec se dit, jamais « aucune » (M98).
  unread?: string;
};

// « Autres actions » : des liens discrets, jamais un bouton (M146) ; dans « Tout le dossier »
// depuis la mission 10 bis. Rapprocher est en pause pendant une vente (M143) ; le bon de visite et
// l'offre d'achat se préparent dès qu'il a une visite (M137). « Modifier sa recherche » n'y est
// plus : il n'apparaît qu'une fois sur la fiche, sous ses critères (`editSearchHref`).
export function otherActions(input: {
  buyerId: string;
  sale: boolean;
  // null : les correspondances n'ont pas pu être lues.
  matches: number | null;
  hasVisits: boolean;
}): OtherAction[] {
  const actions: OtherAction[] = [];
  if (!input.sale) {
    const href = `/acquereurs/rapprochement?acquereur=${input.buyerId}#rapprochement`;
    actions.push(
      input.matches == null
        ? {
            key: 'matches',
            label: 'Rapprocher',
            href,
            unread: 'Correspondances illisibles pour l’instant\u00a0: rechargez la page.',
          }
        : {
            key: 'matches',
            label: `Rapprocher · ${
              input.matches === 0
                ? 'aucune correspondance'
                : `${input.matches} correspondance${input.matches > 1 ? 's' : ''}`
            }`,
            href,
          },
    );
  }
  if (input.hasVisits) {
    actions.push(
      {
        key: 'voucher',
        label: 'Bon de visite',
        href: `/acquereurs/${input.buyerId}/bon-de-visite`,
      },
      { key: 'offer', label: 'Offre d’achat', href: `/acquereurs/${input.buyerId}/offre` },
    );
  }
  return actions;
}

// Mission 10 bis (Jean-Guy, 25/11 ; maquette `M10bis-fiche-acquereur-repliee.png`) — la même fiche,
// repliée, sur le modèle de la carte du Suivi vendeur : à l'ouverture, trois blocs — qui il est et
// ce qu'il cherche, la prochaine étape, « Son suivi » en lignes fermées — ; tout le reste sous un
// seul « Tout le dossier ». Affichage seulement : aucune fonction retirée, aucune règle changée.

// « Modifier sa recherche » : un seul lien sur la fiche ; il ouvre le formulaire, en bas.
export const editSearchHref = (buyerId: string): string =>
  `/acquereurs/${buyerId}?modifier=1#recherche`;

// Là où l'on change son statut : « Tout le dossier », ouvert sur « Son statut ».
export const statusHref = (buyerId: string): string => `/acquereurs/${buyerId}?tout=1#statut`;

// Les lignes de « Son suivi » : visités, envoyés en attente, refusés, toujours ; « Visites à
// organiser » seulement quand il y en a une. Ce que le conseiller a écarté pour lui passe dans
// « Tout le dossier ». La refonte, lot B — les trois chiffres d'abord, côte à côte ; « Visites à
// organiser », qui prend la ligne entière, vient dessous : l'ordre de la page est celui qu'on voit
// (un lecteur d'écran et la touche Tab le suivent). Remplace l'ordre du Lancement 6, où elle
// était la deuxième ligne.
export type SuiviLine = Exclude<FollowUpGroup, 'dismissed'>;

export function suiviLineGroups(toVisit: number): SuiviLine[] {
  return toVisit > 0
    ? ['visited', 'waiting', 'refused', 'to_visit']
    : ['visited', 'waiting', 'refused'];
}

// Une ligne est fermée à l'ouverture de la fiche. S'ouvrent seules celles où il faut agir : celle
// qui porte une visite à organiser (c'est là qu'on la confirme) — « Visites à organiser », mais
// aussi « Refusés » quand un bien refusé garde une visite demandée —, et celle de la visite dont on
// vient de noter le compte rendu (ses messages y sont prêts, Lancement 7). Pendant une vente, sa
// recherche est en pause (M143) : une visite à organiser n'ouvre plus sa ligne, qui garde son
// nombre — on y agit d'un toucher.
export const suiviLineOpen = (input: {
  // La ligne porte la visite dont on vient de noter le compte rendu (`?messages=`).
  messages: boolean;
  // La ligne porte une visite à organiser.
  pendingVisit: boolean;
  sale: boolean;
}): boolean => input.messages || (input.pendingVisit && !input.sale);

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

// Ce qu'il a dit des biens qui attendent, du plus engagé au moins engagé ; au pluriel, « veulent ».
const WAITING_WORDS: readonly (readonly [pill: string, one: string, many: string])[] = [
  ['Veut le visiter', 'veut le visiter', 'veulent le visiter'],
  ['Peut-être', 'peut-être', 'peut-être'],
  ['Sans réponse', 'sans réponse', 'sans réponse'],
];

// Ce qu'une ligne fermée dit sans l'ouvrir, à côté de son nombre : « le 13/11 · offre envisagée »
// pour ses visites, « 2 sans réponse » pour ce qui attend ; « aucun » à zéro ; null : le nombre
// suffit. `pills` : l'état de chaque bien de la ligne (`followUpPill`) ; `lastVisit` : sa visite
// faite la plus récente, le jour déjà dit en mots, et sa suite.
export function suiviLineGist(input: {
  group: SuiviLine;
  count: number;
  pills?: readonly string[];
  lastVisit?: { day: string; outcome: string } | null;
}): string | null {
  if (input.count === 0) return 'aucun';
  if (input.group === 'visited') {
    if (!input.lastVisit) return null;
    const day = input.count > 1 ? `la dernière ${input.lastVisit.day}` : input.lastVisit.day;
    return `${day} · ${lowerFirst(input.lastVisit.outcome)}`;
  }
  if (input.group === 'waiting') {
    const pills = input.pills ?? [];
    const parts = WAITING_WORDS.flatMap(([pill, one, many]) => {
      const count = pills.filter((text) => text === pill).length;
      return count > 0 ? [`${count} ${count > 1 ? many : one}`] : [];
    });
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  return null;
}

// La visite faite la plus récente parmi les biens de la ligne « Visités » : c'est elle que la
// ligne fermée dit. Une visite d'un bien refusé depuis, ou écarté pour lui, n'y compte pas.
export function suiviLastVisit<Visit extends { id: string; visitedAt: string | null }>(
  entries: readonly { group: FollowUpGroup; visitIds: readonly string[] }[],
  visits: readonly Visit[],
): Visit | null {
  const ids = new Set(
    entries.filter((entry) => entry.group === 'visited').flatMap((entry) => entry.visitIds),
  );
  return (
    visits
      .filter((visit) => visit.visitedAt != null && ids.has(visit.id))
      .sort((a, b) => (b.visitedAt as string).localeCompare(a.visitedAt as string))[0] ?? null
  );
}

// La ligne du pli « Ses critères et ce qui compte pour eux » : « 8 critères, dont 1 indispensable ·
// 5 souhaits ».
export function searchFoldLine(input: {
  criteria: number;
  mustHave: number;
  soft: number;
}): string {
  const s = (count: number) => (count > 1 ? 's' : '');
  const criteria =
    input.criteria === 0
      ? 'aucun critère'
      : `${input.criteria} critère${s(input.criteria)}${
          input.mustHave > 0 ? `, dont ${input.mustHave} indispensable${s(input.mustHave)}` : ''
        }`;
  return input.soft > 0 ? `${criteria} · ${input.soft} souhait${s(input.soft)}` : criteria;
}

// Le pli des critères est fermé à l'ouverture. Il s'ouvre seul sur une fiche née d'une lecture de
// notes, tant qu'il reste des champs « À vérifier » : c'est là qu'on les relit (M97, M151).
export const searchFoldOpen = (fieldsToVerify: number): boolean => fieldsToVerify > 0;

// La ligne de « Tout le dossier », replié : ce qu'il contient, dans l'ordre où on l'y trouve.
// `readiness` : « Prêt à visiter ? » y est rangé (il est prêt) ; quand il manque quelque chose, le
// bloc reste dehors, ouvert (Lancement 10).
export function everythingLine(input: {
  selection: boolean;
  vouchers: boolean;
  offers: boolean;
  dismissed: number;
  readiness: boolean;
}): string {
  return [
    'les cinq étapes',
    input.selection ? 'sa sélection' : null,
    'autres actions',
    input.vouchers ? 'bons de visite' : null,
    input.offers ? 'offres d’achat' : null,
    input.dismissed > 0
      ? `${input.dismissed} écarté${input.dismissed > 1 ? 's' : ''} pour lui`
      : null,
    input.readiness ? 'prêt à visiter\u202f?' : null,
    'ce qui s’est passé',
    'statut',
  ]
    .filter((part): part is string => part != null)
    .join(' · ');
}

// Replié à l'ouverture. Il s'ouvre quand on y mène (`?tout=1` : changer son statut), quand une
// lecture y a échoué — un échec se dit, il ne reste jamais sous un pli fermé (M98) —, ou quand il
// range une visite à organiser (celle d'un bien écarté pour lui).
export const everythingOpen = (input: {
  asked: boolean;
  unread: boolean;
  pendingVisit?: boolean;
}): boolean => input.asked || input.unread || input.pendingVisit === true;
