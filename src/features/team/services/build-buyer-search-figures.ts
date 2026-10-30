// Mission 120 B — le bloc « Recherches acquéreur » du tableau du manager (maquette M120B-4) : les
// courriers au propriétaire et les dossiers au confrère nés d'une recherche acquéreur, et leurs
// suites. Des faits déclarés, cumulés comme ceux de Prospection (M86) : un mandat rentré compte
// aussi comme rendez-vous et comme remise, une collaboration obtenue comme un contact. Chaque bien
// est compté une fois, au conseiller qui a préparé son premier courrier ; un bien démarché aussi
// pour un mandat signé compte ici et dans la prise de mandat. Dans l'agence seulement (M59). Pur.

export type BuyerSearchCard = {
  // Le conseiller qui a préparé le premier courrier de ce bien (null : compte supprimé).
  advisorId: string | null;
  handedAt: string | null;
  meetingAt: string | null;
  mandateAt: string | null;
  collaborationAt: string | null;
};

export type BuyerSearchCounts = {
  prepared: number;
  handed: number;
  meetings: number;
  mandates: number;
  collaborations: number;
};

export type BuyerSearchFigures = {
  agency: BuyerSearchCounts;
  advisors: ({ advisorId: string; name: string } & BuyerSearchCounts)[];
};

function counts(cards: BuyerSearchCard[]): BuyerSearchCounts {
  const mandate = (card: BuyerSearchCard) => card.mandateAt != null;
  const meeting = (card: BuyerSearchCard) => card.meetingAt != null || mandate(card);
  const handed = (card: BuyerSearchCard) =>
    card.handedAt != null || meeting(card) || card.collaborationAt != null;
  return {
    prepared: cards.length,
    handed: cards.filter(handed).length,
    meetings: cards.filter(meeting).length,
    mandates: cards.filter(mandate).length,
    collaborations: cards.filter((card) => card.collaborationAt != null).length,
  };
}

export function buildBuyerSearchFigures(
  cards: BuyerSearchCard[],
  advisors: { id: string; name: string }[],
): BuyerSearchFigures {
  return {
    agency: counts(cards),
    advisors: advisors
      .map((advisor) => ({
        advisorId: advisor.id,
        name: advisor.name,
        ...counts(cards.filter((card) => card.advisorId === advisor.id)),
      }))
      .filter((advisor) => advisor.prepared > 0)
      .sort((a, b) => b.prepared - a.prepared || a.name.localeCompare(b.name)),
  };
}
