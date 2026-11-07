// Mission 145 (partie A) — ce qui se propose à un acquéreur (décision de Jean-Guy, 07/11) : un bien
// sous MANDAT SIGNÉ, sans offre acceptée, et rien d'autre — ni un vendeur à relancer, ni un dossier
// sans mandat, ni un concurrent, un nouveau venu ou un bien démarché (corrige M134). Une offre
// acceptée ne tient que tant que son acquéreur est « Sous offre » ou « A acheté » : « L'offre est
// tombée » (M138) rend le mandat de nouveau proposable. Pur.

// Les statuts d'un acquéreur qui tiennent une offre acceptée.
const HOLDING_STATUSES: ReadonlySet<string> = new Set(['under_offer', 'purchased']);

export type OfferHold = { decision: 'accepted' | 'refused'; buyerStatus: string | null };

export function mandateUnderOffer(answers: readonly OfferHold[]): boolean {
  return answers.some(
    (answer) =>
      answer.decision === 'accepted' &&
      answer.buyerStatus != null &&
      HOLDING_STATUSES.has(answer.buyerStatus),
  );
}

export function proposableMandate(
  outcome: string | null | undefined,
  answers: readonly OfferHold[],
): boolean {
  return outcome === 'signed' && !mandateUnderOffer(answers);
}

// Les dossiers vendeurs sous offre acceptée, parmi des réponses lues pour plusieurs dossiers.
export function projectsUnderOffer(
  answers: readonly (OfferHold & { projectId: string })[],
): Set<string> {
  const held = new Set<string>();
  for (const answer of answers) {
    if (mandateUnderOffer([answer])) held.add(answer.projectId);
  }
  return held;
}
