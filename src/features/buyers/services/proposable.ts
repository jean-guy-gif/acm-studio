// Mission 145 (partie A) — ce qui se propose à un acquéreur (décision de Jean-Guy, 07/11) : un bien
// sous MANDAT SIGNÉ, sans offre acceptée, et rien d'autre — ni un vendeur à relancer, ni un dossier
// sans mandat, ni un concurrent, un nouveau venu ou un bien démarché (corrige M134).
// Une offre acceptée tient son mandat tant que son acquéreur est « Sous offre » ou « A acheté », et
// seulement si c'est SA plus récente offre acceptée (M143, « la plus récente offre signée compte ») :
// « L'offre est tombée » (M138) rend le mandat proposable ; une offre acceptée ensuite sur un autre
// bien, ou un achat ailleurs, libère le premier. Pur.

// Les statuts d'un acquéreur qui tiennent une offre acceptée. Lot C — « A acheté » s'écrit `bought`
// en base (`buyers/types.ts`) : `purchased`, écrit ici jusqu'au 28/11, n'y existait pas.
const HOLDING_STATUSES: ReadonlySet<string> = new Set(['under_offer', 'bought']);

export type OfferHold = {
  projectId: string;
  buyerId: string | null;
  decision: 'accepted' | 'refused';
  decidedAt: string;
  buyerStatus: string | null;
};

// Les dossiers vendeurs qu'une offre acceptée tient encore, parmi les offres de l'agence.
export function projectsUnderOffer(answers: readonly OfferHold[]): Set<string> {
  return new Set(heldOffers(answers).keys());
}

// Mission 145 (partie B) — l'offre acceptée qui tient chaque mandat (la même règle) : la carte du
// Suivi dit « Offre acceptée · famille Keller » et mène à leur fiche.
export function heldOffers<T extends OfferHold>(answers: readonly T[]): Map<string, T> {
  const latestAccepted = new Map<string, T>();
  for (const answer of answers) {
    if (answer.decision !== 'accepted' || answer.buyerId == null) continue;
    const known = latestAccepted.get(answer.buyerId);
    if (!known || answer.decidedAt > known.decidedAt) latestAccepted.set(answer.buyerId, answer);
  }
  const held = new Map<string, T>();
  for (const answer of latestAccepted.values()) {
    if (answer.buyerStatus != null && HOLDING_STATUSES.has(answer.buyerStatus)) {
      held.set(answer.projectId, answer);
    }
  }
  return held;
}

export function proposableMandate(
  outcome: string | null | undefined,
  projectId: string,
  underOffer: ReadonlySet<string>,
): boolean {
  return outcome === 'signed' && !underOffer.has(projectId);
}
