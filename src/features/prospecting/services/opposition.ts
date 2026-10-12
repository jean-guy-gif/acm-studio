import { addressKey } from '@/features/prospecting/services/address-key';
import { shortDate } from '@/features/prospecting/services/prospecting-status';

// Mission 98 — « Ne plus solliciter » : la liste d'opposition de l'agence, sur l'adresse
// normalisée. Elle vaut pour TOUS les dossiers, présents et futurs : une adresse de la liste ne
// reçoit plus de courrier et sort de la tournée. À ne pas confondre avec « Pas intéressé », qui
// dit « pas maintenant, pour ce bien » et ne bloque pas un contact futur. Pur.

// Mission 102 — l'opposition est rattachée au BIEN, pas à l'écriture de son adresse : la liste
// porte la clé de l'immeuble (`addressKey`) ET l'identité publiée de l'annonce (portail +
// numéro, M47). Corriger l'adresse d'un bien opposé, ou le retrouver dans un futur dossier par
// la même annonce, ne le fait pas revenir dans les courriers. Chaque table : clé → date.
export type Oppositions = {
  addresses: ReadonlyMap<string, string>;
  listings: ReadonlyMap<string, string>;
};

export const NO_OPPOSITIONS: Oppositions = { addresses: new Map(), listings: new Map() };

// Une ligne de la liste, telle que la base la garde : l'une des deux clés, jamais les deux.
export type OppositionRow = {
  address_key: string | null;
  listing_key: string | null;
  requested_at: string;
};

function earlier<T extends string | null>(a: string | null, b: T): string | T {
  return a == null || (b != null && Date.parse(b) < Date.parse(a)) ? b : a;
}

// Les clés d'adresse sont RELUES avec la normalisation courante : une ligne inscrite avant la
// mission 102 (étage ou nom d'usage de la commune dans la clé) vaut pour tout l'immeuble.
export function buildOppositions(rows: OppositionRow[]): Oppositions {
  const addresses = new Map<string, string>();
  const listings = new Map<string, string>();
  for (const row of rows) {
    const address = addressKey(row.address_key);
    if (address != null) {
      addresses.set(address, earlier(addresses.get(address) ?? null, row.requested_at));
    }
    if (row.listing_key != null) {
      listings.set(
        row.listing_key,
        earlier(listings.get(row.listing_key) ?? null, row.requested_at),
      );
    }
  }
  return { addresses, listings };
}

// La date de la demande si ce bien est sur la liste — par son adresse ou par son annonce —,
// sinon null. L'adresse compte dès qu'elle est connue, confirmée ou non : dans le doute, on ne
// sollicite pas.
export function opposedOn(
  property: { address: string | null | undefined; listingKey?: string | null },
  oppositions: Oppositions,
): string | null {
  const key = addressKey(property.address);
  const byAddress = key == null ? null : (oppositions.addresses.get(key) ?? null);
  const byListing =
    property.listingKey == null ? null : (oppositions.listings.get(property.listingKey) ?? null);
  return earlier(byAddress, byListing);
}

// « Ne plus solliciter (demandé le 11/10) »
export function oppositionBadge(requestedOn: string): string {
  const date = shortDate(requestedOn);
  return date ? `Ne plus solliciter (demandé le ${date})` : 'Ne plus solliciter';
}

export const OPPOSED_MESSAGE = 'Ce propriétaire a demandé à ne plus être sollicité';
