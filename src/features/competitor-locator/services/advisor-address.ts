// Mission 84 — le conseiller confirme lui-même l'adresse d'un concurrent, dans ACM : il valide
// celle que le Localisateur propose, ou il la saisit. Pur. Elle porte la provenance « vous »
// (déjà dans le vocabulaire du Localisateur, M75) et, une fois confirmée, aucune relecture du
// Localisateur ne la réécrit : une adresse confirmée ne se redemande plus (needsLocatorQuery).
// Précise M75, « le Localisateur décide de la certitude » : le conseiller peut aussi décider.

export const ADVISOR_SOURCE = 'vous';
export const ADVISOR_ACCEPTED_LABEL = 'Adresse confirmée par vous';
export const ADVISOR_TYPED_LABEL = 'Adresse saisie par vous';

export const ADDRESS_MIN_LENGTH = 5;
export const ADDRESS_MAX_LENGTH = 200;

export type AdvisorAddressInput = { mode: 'accept' } | { mode: 'typed'; address: unknown };

export type AddressRow = {
  locator_address: string | null;
  locator_confirmed: boolean | null;
  locator_source: string | null;
};

export type AdvisorAddressPatch = {
  locator_address: string;
  locator_confirmed: true;
  locator_source: typeof ADVISOR_SOURCE;
  locator_label_key: typeof ADVISOR_SOURCE;
  locator_label: string;
  locator_state: 'pret';
  // Une adresse saisie n'a pas de position : la distance ne se mesure plus (« même secteur »).
  locator_latitude?: null;
  locator_longitude?: null;
};

export type AdvisorAddressResult =
  { ok: true; patch: AdvisorAddressPatch } | { ok: false; error: string };

// L'adresse confirmée par le Localisateur lui-même ne se corrige pas ici ; celle que le
// conseiller a confirmée ou saisie, lui seul peut la corriger.
export function confirmedByAdvisor(row: AddressRow): boolean {
  return row.locator_confirmed === true && row.locator_source === ADVISOR_SOURCE;
}

export function canAdvisorSetAddress(row: AddressRow): boolean {
  return row.locator_confirmed !== true || confirmedByAdvisor(row);
}

// « C'est la bonne adresse » n'existe que si le Localisateur en propose une, non confirmée.
export function canAcceptProposedAddress(row: AddressRow): boolean {
  return row.locator_confirmed !== true && (row.locator_address?.trim() ?? '') !== '';
}

export function advisorAddressPatch(
  row: AddressRow,
  input: AdvisorAddressInput,
): AdvisorAddressResult {
  if (input.mode === 'accept') {
    if (!canAcceptProposedAddress(row)) {
      return { ok: false, error: 'Aucune adresse proposée à confirmer.' };
    }
    return {
      ok: true,
      patch: {
        locator_address: (row.locator_address ?? '').trim(),
        locator_confirmed: true,
        locator_source: ADVISOR_SOURCE,
        locator_label_key: ADVISOR_SOURCE,
        locator_label: ADVISOR_ACCEPTED_LABEL,
        locator_state: 'pret',
      },
    };
  }
  if (!canAdvisorSetAddress(row)) {
    return { ok: false, error: 'Cette adresse est déjà confirmée par le Localisateur.' };
  }
  const address =
    typeof input.address === 'string' ? input.address.replace(/\s+/g, ' ').trim() : '';
  if (address.length < ADDRESS_MIN_LENGTH || address.length > ADDRESS_MAX_LENGTH) {
    return { ok: false, error: 'Saisissez l’adresse complète : numéro, rue, code postal, ville.' };
  }
  return {
    ok: true,
    patch: {
      locator_address: address,
      locator_confirmed: true,
      locator_source: ADVISOR_SOURCE,
      locator_label_key: ADVISOR_SOURCE,
      locator_label: ADVISOR_TYPED_LABEL,
      locator_state: 'pret',
      locator_latitude: null,
      locator_longitude: null,
    },
  };
}
