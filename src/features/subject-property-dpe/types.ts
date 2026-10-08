// MISSION 79 — ce que le DPE officiel (base publique de l'ADEME) propose pour la fiche du bien
// vendeur. Chaque champ porte la date du DPE dont il vient : l'écran dit « d'après le DPE du … ».
export const DPE_FIELDS = ['heating_type', 'energy_rating', 'ges_rating'] as const;
export type DpeField = (typeof DPE_FIELDS)[number];

export type DpeFieldReading = { value: string; date: string };
export type DpeReading = Partial<Record<DpeField, DpeFieldReading>>;

export type DpeRequest = {
  address: string;
  postal_code: string;
  city: string;
  property_type: string;
  surface_area: string;
};
