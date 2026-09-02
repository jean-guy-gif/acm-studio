// Mission 38 — importing the SUBJECT property from an online listing, reusing the
// competitor aspiration engine (comparable-import) without duplicating it.

// The fields an import may PRE-FILL on the seller-property form. Deliberately no
// price and no advisor range: CLAUDE.md forbids the tool from producing an
// estimate, and the advisor's range is his professional opinion, never a value
// read from a document.
export type SubjectPropertyImportPrefill = {
  surface_area: number | null;
  land_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  district: string | null;
  description: string | null;
  energy_rating: string | null;
  ges_rating: string | null;
  heating_type: string | null;
  exposure: string | null;
  construction_year: number | null;
  general_condition: string | null;
  outdoor_spaces: string[];
  parking_types: string[];
};

// What is shown to the advisor as INFORMATION only — it writes no field. The read
// price is displayed ("prix lu sur l'annonce : …") but never stored and never
// pre-fills the range.
export type SubjectPropertyImportInfo = {
  readPrice: number | null;
  readPortalPricePerSquareMeter: number | null;
  detectedPhotoCount: number;
};

export type SubjectPropertyImport = {
  prefill: SubjectPropertyImportPrefill;
  info: SubjectPropertyImportInfo;
};
