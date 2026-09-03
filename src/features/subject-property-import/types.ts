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

// Mission 42 — importing the seller's own commercial brochure (PDF). Unlike an
// online listing, a fiche also fills two diagnostics fields and the condominium
// header. Everything else routes to the same property prefill as Mission 38.

export type BrochureDiagnosticsPrefill = {
  energy_consumption: number | null;
  ges_emissions: number | null;
};

export type BrochureCondominiumPrefill = {
  is_condominium: boolean | null;
  total_lots: number | null;
  annual_charges: number | null;
};

// Information shown to the advisor, never written to a field. The read price is the
// advisor's OWN agency price here, so the no-estimate rule matters even more. The
// monthly/annual charges are the same figure expressed twice (annual = 12× monthly)
// — `chargesConsistent` flags a divergence to surface, never a value to average.
export type BrochureImportInfo = {
  readPrice: number | null;
  agencyReference: string | null;
  taxeFonciere: number | null;
  monthlyCharges: number | null;
  annualCharges: number | null;
  chargesConsistent: boolean | null;
};

export type BrochureImport = {
  property: SubjectPropertyImportPrefill;
  diagnostics: BrochureDiagnosticsPrefill;
  condominium: BrochureCondominiumPrefill;
  info: BrochureImportInfo;
  found: string[];
  missing: string[];
};
