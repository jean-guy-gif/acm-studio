import { BUYER_FORM_FIELDS, type BuyerFormField } from '@/features/buyers/schemas/buyer-input';
import type { Buyer } from '@/features/buyers/types';

// Mission 151 — « Compléter » n'écrit que ce que le conseiller vient de valider (décision de
// Jean-Guy, 12/11) : la fiche lue EN BASE au moment d'enregistrer, et par-dessus les seuls champs
// envoyés. Une modification faite par un collègue pendant la vérification n'est pas écrasée. Pur.

// Une fiche relue comme le formulaire l'enverrait, pour revalider l'ensemble (budget idéal sous le
// plafond, pas plus de chambres que de pièces).
export function buyerFormValues(buyer: Buyer): Record<BuyerFormField, unknown> {
  const tri = (value: boolean | null) => (value === true ? 'yes' : value === false ? 'no' : '');
  const num = (value: number | null) => (value == null ? null : String(value));
  return {
    name: buyer.name,
    phone: buyer.phone,
    email: buyer.email,
    purpose: buyer.purpose,
    language: buyer.language,
    timeline: buyer.timeline,
    notes: buyer.notes,
    property_types: buyer.propertyTypes,
    cities: buyer.cities,
    budget_ideal: num(buyer.budgetIdeal),
    budget_max: num(buyer.budgetMax),
    rooms_min: num(buyer.roomsMin),
    bedrooms_min: num(buyer.bedroomsMin),
    surface_min: num(buyer.surfaceMin),
    outdoor: tri(buyer.outdoor),
    parking: tri(buyer.parking),
    pool: tri(buyer.pool),
    floor_min: num(buyer.floorMin),
    elevator: tri(buyer.elevator),
    energy_rating_max: buyer.energyRatingMax,
    works_accepted: tri(buyer.worksAccepted),
    must_have: buyer.mustHave,
    deal_breakers: buyer.dealBreakers,
    condominium_accepted: tri(buyer.condominiumAccepted),
    condominium_must_have: buyer.condominiumMustHave ? 'yes' : '',
    soft_criteria: buyer.softCriteria,
  };
}

// Les champs du formulaire que l'écran a réellement envoyés : les seuls à écrire.
export function submittedFields(formData: FormData): BuyerFormField[] {
  return BUYER_FORM_FIELDS.filter((field) => field !== 'soft_criteria' && formData.has(field));
}
