import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import type { Database } from '@/lib/supabase/database.types';

// Mission 120 — « J'ai un acquéreur pour votre bien » : quand un acquéreur veut visiter un bien qui
// n'est pas un mandat de l'agence, le conseiller prépare le bon courrier, et le retrouve dans la
// même Prospection que le mode vendeur.

export type BuyerProspectRecord = Database['public']['Tables']['buyer_prospects']['Row'];
export type BuyerProspectOriginRecord =
  Database['public']['Tables']['buyer_prospect_origins']['Row'];

// L'action qu'une visite demandée propose, selon l'origine du bien et son exclusivité :
//   - mandat signé de l'agence : aucune action nouvelle (« Proposer une visite », M86) ;
//   - vendeur à relancer : « Rappeler : j'ai un acquéreur » (M86, inchangé) ;
//   - concurrent à prospecter ou annonce du marché, sans exclusivité : le courrier au propriétaire ;
//   - en exclusivité : le dossier de collaboration au confrère ;
//   - exclusivité inconnue : le conseiller choisit, rien n'est supposé.
export type VisitAction =
  | { kind: 'propose_visit'; projectId: string }
  | { kind: 'call_seller'; projectId: string }
  | { kind: 'owner_letter' }
  | { kind: 'colleague_letter' }
  | { kind: 'choose' }
  | { kind: 'none' };

// Ce que l'annonce d'un bien démarché publie, relu par le serveur (liste d'autorisation). Le
// courrier n'en reprend que ce que la fiche acquéreur demande et que le bien a.
export type BuyerProspectFacts = {
  propertyType: string | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  landArea: number | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
  hasPool: boolean | null;
  energyRating: string | null;
  district: string | null;
  city: string | null;
  price: number | null;
  photoUrls: string[];
};

// « Recherche acquéreur : Famille Keller » — l'origine d'une carte de Prospection.
export type BuyerOriginLabel = {
  originId: string;
  buyerId: string;
  buyerName: string;
};

// Une carte de Prospection née d'une recherche acquéreur, sans concurrent : la même ligne que
// celle d'un concurrent (adresse, statut, à qui s'adresser), et ses origines.
export type BuyerProspectCard = {
  prospectId: string;
  row: ProspectingRow;
  origins: BuyerOriginLabel[];
};

// Où en est le courrier d'une visite, relu sur sa carte de Prospection.
export type VisitLetterState =
  | { kind: 'none' }
  | { kind: 'address'; label: string }
  | { kind: 'ready'; label: string }
  | { kind: 'handed'; label: string }
  | { kind: 'waiting'; label: string }
  | { kind: 'done'; label: string }
  | { kind: 'closed'; label: string };
