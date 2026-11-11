// Mission 105 — « Mettre à jour les prix des concurrents », sur le Suivi d'un dossier : les
// annonces des concurrents retenus sont relues par l'extension, sans aucun appel payant. Pur.
//   • un prix lu qui change est enregistré, avec sa date (observation datée, M47), et devient le
//     prix du concurrent : « Ont baissé depuis le rendez-vous » se calcule dessus ;
//   • une annonce disparue est marquée « Retirée depuis le rendez-vous », sur preuve (M103) ;
//   • une page illisible ne change rien.

// Mission 152 — la relecture sert le Suivi (un dossier conclu) et « Avant le rendez-vous » (un
// dossier en préparation ou prêt, tant que son Live n'a pas commencé : au Live, le prix révélé se
// fige à la devinette, M96, et ce que voit le vendeur ne bouge plus, M110). Jamais un dossier
// archivé.
export function canRefreshListings(status: string, liveStarted: boolean): boolean {
  if (status === 'meeting_completed') return true;
  return (status === 'draft' || status === 'ready_for_meeting') && !liveStarted;
}

export const GONE_SINCE_MEETING_LABEL = 'Retirée depuis le rendez-vous';

export type PriceCheckOutcome =
  | { status: 'unchanged'; price: number }
  | { status: 'changed'; previous: number; price: number }
  | { status: 'gone' }
  | { status: 'unreadable' };

export function priceCheckOutcome(
  previous: number,
  read: { price: number } | { gone: true } | null,
): PriceCheckOutcome {
  if (read == null) return { status: 'unreadable' };
  if ('gone' in read) return { status: 'gone' };
  return Math.round(read.price) === Math.round(previous)
    ? { status: 'unchanged', price: read.price }
    : { status: 'changed', previous, price: read.price };
}

// « 5 annonces relues · 1 baisse de prix · 1 retirée depuis le rendez-vous · 1 illisible ».
export function priceRefreshSummary(outcomes: PriceCheckOutcome[]): string {
  if (outcomes.length === 0) {
    return 'Aucune annonce à relire : aucun concurrent retenu n’a d’annonce en ligne.';
  }
  const read = outcomes.filter((o) => o.status === 'unchanged' || o.status === 'changed').length;
  const drops = outcomes.filter((o) => o.status === 'changed' && o.price < o.previous).length;
  const rises = outcomes.filter((o) => o.status === 'changed' && o.price > o.previous).length;
  const gone = outcomes.filter((o) => o.status === 'gone').length;
  const unreadable = outcomes.filter((o) => o.status === 'unreadable').length;
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  return [
    plural(read, 'annonce relue', 'annonces relues'),
    drops > 0 ? plural(drops, 'baisse de prix', 'baisses de prix') : null,
    rises > 0 ? plural(rises, 'hausse de prix', 'hausses de prix') : null,
    gone > 0 ? `${gone} retirée${gone > 1 ? 's' : ''} depuis le rendez-vous` : null,
    unreadable > 0
      ? `${unreadable} illisible${unreadable > 1 ? 's' : ''}, inchangée${unreadable > 1 ? 's' : ''}`
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(' · ');
}
