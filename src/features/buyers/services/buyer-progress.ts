// Les faits de l'avancement d'une fiche acquéreur, lus en base (`getBuyersProgress`). Mission 130 B
// — ses quatre étapes et sa prochaine étape se calculent dessus (`buyer-journey.ts`).
export type BuyerProgressFacts = {
  // La sélection la plus récente : son nombre de biens (retirés exclus), 0 sans sélection.
  selectionCount: number;
  presentedAt: string | null;
  // Un lien valable du dossier acquéreur pour cette sélection.
  linkCreated: boolean;
  // Sa réponse donnée depuis le lien, sur cette sélection.
  answeredOnLink: boolean;
  // Ses demandes de visite à organiser (ni annulées, ni faites), toutes sélections confondues.
  visitsToOrganize: number;
  // Mission 130 — les visites faites, et les dates des étapes (la fiche, la sélection, le lien,
  // sa réponse par le lien), pour le parcours, la prochaine étape et « Ce qui s'est passé ».
  visitsDone?: number;
  selectionAt?: string | null;
  linkAt?: string | null;
  answeredAt?: string | null;
  // Mission 132 — la plus récente visite demandée ou faite (un échange avec l'acquéreur).
  lastVisitAt?: string | null;
  // Mission 143 (B1) — la plus récente visite faite, un bon de visite signé, et son offre d'achat :
  // l'étape la plus avancée de son parcours.
  lastVisitDoneAt?: string | null;
  voucherSigned?: boolean;
  // Lancement, mission 2 — une visite faite dont la suite est « Offre envisagée » : l'acquéreur a
  // formulé une offre. Sans elle (et sans offre signée), l'offre n'est pas une étape à faire.
  offerConsidered?: boolean;
  offer?: BuyerOfferFacts | null;
  // La plus récente signée : elle vaut dès que la vente ne tient plus (« L'offre est tombée »).
  latestOffer?: BuyerOfferFacts | null;
  // Une lecture en échec : l'avancement n'est pas connu, la fiche le dit (M98).
  unread?: boolean;
};

// Son offre d'achat la plus avancée : la plus récente acceptée, sinon la plus récente signée (M138 :
// une offre refusée après une acceptée ne défait pas la vente). « Prévenu » : un lien vers sa copie
// créé APRÈS la réponse du vendeur (le geste « Prévenir l'acquéreur » en crée un) ; « notaire » : le
// lien du notaire existe. Rien d'autre n'est déduit (décision de Jean-Guy, 07/11).
export type BuyerOfferFacts = {
  documentId: string;
  signedAt: string;
  validUntil: string | null;
  price: number | null;
  projectId: string | null;
  visitId: string | null;
  decision: 'accepted' | 'refused' | null;
  decidedAt: string | null;
  buyerNotified: boolean;
  notaryLinked: boolean;
};

export const NO_PROGRESS: BuyerProgressFacts = {
  selectionCount: 0,
  presentedAt: null,
  linkCreated: false,
  answeredOnLink: false,
  visitsToOrganize: 0,
};

// Une ligne de `buyer_documents` lue avec sa réponse et ses liens (`getBuyersProgress`).
export type BuyerDocumentRow = {
  id: string;
  kind: string;
  signed_at: string;
  valid_until: string | null;
  fields: unknown;
  buyer_document_acceptances: unknown;
  buyer_document_links: unknown;
};

const asList = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : value ? [value as T] : [];

// Son offre la plus avancée parmi ses documents (pur) : la plus récente acceptée, sinon la plus
// récente signée ; null sans offre.
export function offerFactsOf(rows: readonly BuyerDocumentRow[]): BuyerOfferFacts | null {
  const offers = offersOf(rows);
  return offers.find((offer) => offer.decision === 'accepted') ?? offers[0] ?? null;
}

// La plus récente signée, quelle que soit la réponse du vendeur.
export function latestOfferOf(rows: readonly BuyerDocumentRow[]): BuyerOfferFacts | null {
  return offersOf(rows)[0] ?? null;
}

function offersOf(rows: readonly BuyerDocumentRow[]): BuyerOfferFacts[] {
  return rows
    .filter((row) => row.kind === 'purchase_offer')
    .map((row): BuyerOfferFacts => {
      const answer = asList<{ decision: string; decided_at: string }>(
        row.buyer_document_acceptances,
      )[0];
      const decision =
        answer?.decision === 'accepted' || answer?.decision === 'refused' ? answer.decision : null;
      const decidedAt = decision ? answer!.decided_at : null;
      const links = asList<{ audience: string; created_at: string }>(row.buyer_document_links);
      const fields = (row.fields ?? {}) as {
        price?: unknown;
        projectId?: unknown;
        visitId?: unknown;
      };
      return {
        documentId: row.id,
        signedAt: row.signed_at,
        validUntil: row.valid_until,
        price: typeof fields.price === 'number' ? fields.price : null,
        // Une offre hors mandat (Mission 153) garde un dossier vide : aucun dossier vendeur.
        projectId:
          typeof fields.projectId === 'string' && fields.projectId ? fields.projectId : null,
        visitId: typeof fields.visitId === 'string' ? fields.visitId : null,
        decision,
        decidedAt,
        // « Créer de nouveaux liens » écrit la copie des offrants ET le lien du vendeur ensemble,
        // à la même heure : ce n'est pas « Prévenir l'acquéreur », qui n'écrit que sa copie.
        buyerNotified:
          decidedAt != null &&
          links.some(
            (link) =>
              link.audience === 'visitor' &&
              link.created_at > decidedAt &&
              !links.some(
                (other) => other.audience === 'seller' && other.created_at === link.created_at,
              ),
          ),
        notaryLinked: links.some((link) => link.audience === 'notary'),
      };
    })
    .sort((a, b) => b.signedAt.localeCompare(a.signedAt));
}
