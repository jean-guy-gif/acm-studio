// Mission 110 — la synthèse laissée au vendeur après le Live. LISTE D'AUTORISATION : ce type ne
// porte que ce que le vendeur peut lire. Jamais l'adresse, le titre, le lien d'une annonce, ni
// « Vendu par » ou l'exclusivité d'un concurrent (M75, M83, M107) ; jamais la fourchette du
// conseiller (M38). Les concurrents sont désignés par leur libellé neutre.
export type SellerSynthesis = {
  sellerName: string;
  meetingDate: string | null;
  // Ce que le vendeur a dit : sa valeur perçue, son prix après avoir vu le marché, et l'écart
  // moyen entre ses réponses et les prix affichés (en %, signé : + = prix affichés au-dessus).
  sellerSaid: {
    perceivedPrice: number | null;
    revisedPrice: number | null;
    averageGuessGapPercent: number | null;
  };
  // Le marché vu ensemble : les biens dont le prix a été révélé pendant le Live.
  market: {
    competitors: { label: string; price: number }[];
    lowestPrice: number | null;
    highestPrice: number | null;
    medianPrice: number | null;
  };
  // Les prix du Live (M89) : « Prix des concurrents », « Analyse du conseiller » et ses
  // arguments ; le prix convenu au Live. Mission 111 — après la conclusion, les montants figés à
  // la conclusion : le lien déjà envoyé dit ce que le vendeur a vu, et ne change plus.
  decision: {
    competitorPrice: number | null;
    advisorAnalysis: number | null;
    justification: string | null;
  } | null;
  commercializationPrice: number | null;
  agency: {
    name: string;
    logoUrl: string | null;
    postalAddress: string | null;
    professionalCard: string | null;
    professionalCardIssuer: string | null;
    financialGuarantee: string | null;
    advisorName: string | null;
    advisorPhone: string | null;
    advisorEmail: string | null;
  };
};
