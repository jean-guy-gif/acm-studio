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
  key: 'matches' | 'voucher' | 'offer' | 'search';
  label: string;
  href: string;
  // Une lecture en échec se dit, jamais « aucune » (M98).
  unread?: string;
};

// « Autres actions » : des liens discrets sous la prochaine étape, jamais un bouton (M146).
// Rapprocher est en pause pendant une vente (M143) ; le bon de visite et l'offre d'achat se
// préparent dès qu'il a une visite (M137).
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
            unread: 'Correspondances illisibles pour l’instant : rechargez la page.',
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
  actions.push({
    key: 'search',
    label: 'Modifier sa recherche',
    href: `/acquereurs/${input.buyerId}?modifier=1#recherche`,
  });
  return actions;
}
