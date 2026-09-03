// Mission 42 — reads an agency commercial brochure's TEXT (already extracted by
// extract-pdf-text) into structured fields. Written in the order the brief imposes:
//
//   1. A GENERIC layout reader (`readBrochureLayout`) that knows nothing about real
//      estate — it only recognises "Libellé : valeur" pairs and section blocks,
//      whatever software produced the sheet.
//   2. A CORRESPONDENCE table (`parseAgencyBrochure`) that maps KNOWN labels to the
//      seller-property fields. An unknown label is ignored, never guessed.
//
// The PDF is DATA: nothing is executed, nothing is re-emitted as HTML. A price read
// here is information only — it never becomes a field and never pre-fills a range
// (CLAUDE.md; the temptation is highest here because it is the advisor's own price).

// ---------------------------------------------------------------------------
// 1. GENERIC READER — no domain knowledge
// ---------------------------------------------------------------------------

export type BrochurePair = { label: string; value: string };
export type BrochureSection = { name: string; items: string[] };

export type BrochureLayout = {
  pairs: BrochurePair[];
  lines: string[];
  fullText: string;
};

// Splits the pages into flat lines and extracts every "Libellé : valeur" pair,
// whatever the fields mean. Pure and deterministic.
export function readBrochureLayout(pages: string[]): BrochureLayout {
  const lines = pages
    .flatMap((page) => page.split('\n'))
    .map((line) => line.trim())
    .filter((line) => line !== '');

  const pairs: BrochurePair[] = [];
  for (const line of lines) {
    const match = /^(.{1,45}?)\s*:\s+(.+)$/.exec(line);
    if (match) {
      pairs.push({ label: match[1].trim(), value: match[2].trim() });
    }
  }

  return { pairs, lines, fullText: lines.join('\n') };
}

// The sheet's named sections. Collection of one section's items stops at the next
// KNOWN header — amenity tokens (Gardien, Concierge, Tennis…) look like headers to
// a purely generic detector, so we bound by this list instead.
const KNOWN_SECTIONS = [
  'Informations',
  'Diagnostics',
  'Prestations',
  'Surfaces',
  'Proximités',
  'Localisation',
] as const;

// Collects the item lines of a named section: everything after the header line up
// to the next known section header. Used for the "Surfaces"/"Prestations" blocks
// (room-by-room, amenities), which no online listing publishes.
export function sectionItems(layout: BrochureLayout, header: string): string[] {
  const { lines } = layout;
  const start = lines.findIndex((line) => line.toLowerCase() === header.toLowerCase());
  if (start === -1) {
    return [];
  }
  const boundary = new Set(KNOWN_SECTIONS.map((s) => s.toLowerCase()));
  const items: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (boundary.has(lines[i].toLowerCase())) {
      break;
    }
    items.push(lines[i]);
  }
  return items;
}

// ---------------------------------------------------------------------------
// 2. CORRESPONDENCE — known labels → seller-property vocabulary
// ---------------------------------------------------------------------------

export type BrochureFields = {
  // Seller-property form
  surfaceArea: number | null;
  bedroomsCount: number | null;
  postalCode: string | null;
  city: string | null;
  constructionYear: number | null;
  generalCondition: string | null;
  exposure: string | null;
  energyRating: string | null;
  gesRating: string | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
  // Diagnostics (Mission 22) — only these two are present on the sheet
  energyConsumption: number | null;
  gesEmissions: number | null;
  // Condominium (Mission 22) — read from the footer legal mention
  totalLots: number | null;
  annualCharges: number | null;
  isCondominium: boolean | null;
  // Information only (never written to a field)
  readPrice: number | null;
  agencyReference: string | null;
  taxeFonciere: number | null;
  monthlyCharges: number | null;
  // The footer's annual quote-part equals 12× the monthly charges on the detail
  // page — the same figure expressed twice, not two independent data points. True
  // when they agree, false when they diverge (a signal to flag, never averaged),
  // null when one side is missing.
  chargesConsistent: boolean | null;
};

// French number: thousands separated by (non-breaking) spaces, decimal comma.
function frNumber(raw: string | null | undefined): number | null {
  if (raw == null) {
    return null;
  }
  const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.');
  if (cleaned === '' || !/^\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

const EXPOSURE_MAP: Record<string, string> = {
  nord: 'north',
  'nord-est': 'north_east',
  est: 'east',
  'sud-est': 'south_east',
  sud: 'south',
  'sud-ouest': 'south_west',
  ouest: 'west',
  'nord-ouest': 'north_west',
  traversant: 'dual_aspect',
};

// General condition by keyword (order matters: "excellent" before "bon").
function mapCondition(value: string): string | null {
  const v = value.toLowerCase();
  if (v.includes('neuf')) return 'new';
  if (v.includes('excellent')) return 'excellent';
  if (v.includes('bon')) return 'good';
  if (v.includes('rafraîchir') || v.includes('rafraichir')) return 'to_refresh';
  if (v.includes('gros travaux') || v.includes('à rénover') || v.includes('a renover'))
    return 'to_renovate';
  return null;
}

// Pairs are looked up case-insensitively; only the FIRST value for a label wins.
function pairValue(layout: BrochureLayout, label: string): string | null {
  const found = layout.pairs.find((p) => p.label.toLowerCase() === label.toLowerCase());
  return found ? found.value : null;
}

export function parseAgencyBrochure(pages: string[]): BrochureFields {
  const layout = readBrochureLayout(pages);
  const text = layout.fullText;

  // --- Seller-property form fields (from labelled pairs) -------------------
  const surfaceArea = frNumber((pairValue(layout, '«Loi Carrez»') ?? '').replace(/m²/i, ''));

  const conditionRaw = pairValue(layout, 'État');
  const generalCondition = conditionRaw ? mapCondition(conditionRaw) : null;

  const exposureRaw = pairValue(layout, 'Exposition');
  const exposure = exposureRaw ? (EXPOSURE_MAP[exposureRaw.trim().toLowerCase()] ?? null) : null;

  const constructionYear = (() => {
    const raw = pairValue(layout, 'Construit en');
    const year = raw ? Number.parseInt(raw.replace(/\D/g, ''), 10) : NaN;
    return Number.isInteger(year) && year > 1700 && year < 2100 ? year : null;
  })();

  // --- Bedrooms: count the "Chambre, N m²" rooms in the Surfaces section ---
  const surfaces = sectionItems(layout, 'Surfaces');
  const bedroomsCount = surfaces.filter((line) => /^chambre\b/i.test(line)).length || null;

  // Outdoor spaces and private parking are listed either room-by-room (Surfaces)
  // or as amenities (Prestations) — scan both. "Parking public" is deliberately
  // NOT mapped: it is a nearby amenity, not a space owned with the property.
  const amenityLines = [...surfaces, ...sectionItems(layout, 'Prestations')];
  const outdoorSpaces: string[] = [];
  const addOutdoor = (space: string) => {
    if (!outdoorSpaces.includes(space)) outdoorSpaces.push(space);
  };
  const parkingTypes: string[] = [];
  const addParking = (kind: string) => {
    if (!parkingTypes.includes(kind)) parkingTypes.push(kind);
  };
  for (const line of amenityLines) {
    const name = line.toLowerCase();
    if (name.startsWith('terrasse')) addOutdoor('terrace');
    else if (name.startsWith('balcon')) addOutdoor('balcony');
    else if (name.startsWith('jardin')) addOutdoor('garden');
    else if (name.startsWith('loggia')) addOutdoor('loggia');
    else if (name.startsWith('véranda') || name.startsWith('veranda')) addOutdoor('veranda');
    else if (name.startsWith('garage')) addParking('garage');
    else if (name.startsWith('box')) addParking('closed_box');
  }

  // --- Diagnostics + DPE/GES letters (footer legal mention) ---------------
  const energyMatch = /Classe [ée]nergie\s+([\d\s ]+)\s*kWh\/m²\.?an\s*\(([A-G])\)/i.exec(text);
  const energyConsumption = energyMatch ? frNumber(energyMatch[1]) : null;
  const energyRating = energyMatch ? energyMatch[2].toUpperCase() : null;

  const climateMatch = /Classe climat\s+([\d\s ]+)\s*kg\s*CO2\/m²\.?an\s*\(([A-G])\)/i.exec(text);
  const gesEmissions = climateMatch ? frNumber(climateMatch[1]) : null;
  const gesRating = climateMatch ? climateMatch[2].toUpperCase() : null;

  // --- Condominium (footer legal mention) ---------------------------------
  const lotsMatch = /Nombre de lots dans la copropriété\s*:\s*([\d\s ]+)/i.exec(text);
  const totalLots = lotsMatch ? frNumber(lotsMatch[1]) : null;
  const isCondominium = totalLots != null ? true : null;

  const quotePartMatch = /quote-part de charges courantes\s+([\d\s .,]+?)\s*€\/an/i.exec(text);
  const annualCharges = quotePartMatch ? frNumber(quotePartMatch[1]) : null;

  // --- Information only ----------------------------------------------------
  const priceMatch = /([\d\s ]{4,})\s*€\s*Honoraires à la charge du vendeur/i.exec(text);
  const readPrice = priceMatch ? frNumber(priceMatch[1]) : null;

  const agencyReference = layout.lines.find((line) => /^\d{8}$/.test(line)) ?? null;

  // Property postal + city: exactly "NNNNN, City" (one comma). Excludes the agency
  // address "06160, Antibes, France" (two commas).
  const postalCityLine = layout.lines.find((line) => /^\d{5},\s*[^,]+$/.test(line));
  const postalCity = postalCityLine ? /^(\d{5}),\s*(.+)$/.exec(postalCityLine) : null;
  const postalCode = postalCity ? postalCity[1] : null;
  const city = postalCity ? postalCity[2].trim() : null;

  const taxeFonciere = frNumber((pairValue(layout, 'Taxe foncière') ?? '').replace(/€\/an/i, ''));
  const monthlyCharges = frNumber((pairValue(layout, 'Charges') ?? '').replace(/€\/mois/i, ''));

  // The footer annual quote-part should equal 12× the monthly charges. Compare, but
  // never average: a mismatch is a signal for the advisor.
  const chargesConsistent =
    monthlyCharges != null && annualCharges != null
      ? Math.abs(annualCharges - monthlyCharges * 12) < 1
      : null;

  return {
    surfaceArea,
    bedroomsCount,
    postalCode,
    city,
    constructionYear,
    generalCondition,
    exposure,
    energyRating,
    gesRating,
    outdoorSpaces,
    parkingTypes,
    energyConsumption,
    gesEmissions,
    totalLots,
    annualCharges,
    isCondominium,
    readPrice,
    agencyReference,
    taxeFonciere,
    monthlyCharges,
    chargesConsistent,
  };
}
