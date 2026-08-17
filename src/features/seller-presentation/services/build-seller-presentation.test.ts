import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { calculateComparableAnalysis } from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';
import type { Project } from '@/features/projects/types';
import {
  buildSellerPresentation,
  type BuildSellerPresentationInput,
} from '@/features/seller-presentation/services/build-seller-presentation';
import { SELLER_PRESENTATION_VERSION } from '@/features/seller-presentation/types/seller-presentation';
import type { SubjectProperty } from '@/features/subject-property/types';

const AT = '2026-07-18T10:00:00.000Z';

function comp(id: string, ppsm: number, overrides: Partial<Comparable> = {}): Comparable {
  const surface = (overrides.surface_area as number | undefined) ?? 50;
  return makeComparable({ id, surface_area: surface, price: ppsm * surface, ...overrides });
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj',
    agency_id: 'ag',
    advisor_id: 'adv',
    seller_name: 'Dupont',
    seller_email: null,
    seller_phone: null,
    status: 'draft',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function makeProperty(overrides: Partial<SubjectProperty> = {}): SubjectProperty {
  return {
    id: 'sp',
    agency_id: 'ag',
    project_id: 'proj',
    address: '1 rue du Test',
    city: 'Antibes',
    postal_code: '06600',
    property_type: 'appartement',
    surface_area: 52,
    land_area: null,
    rooms_count: 3,
    bedrooms_count: 2,
    bathrooms_count: 1,
    energy_rating: 'C',
    description: null,
    strengths: ['Calme', 'Lumineux'],
    weaknesses: null,
    photo_urls: ['https://x/p1.jpg'],
    district: null,
    floor: null,
    building_floors: null,
    ges_rating: null,
    heating_type: null,
    exposure: null,
    construction_year: null,
    general_condition: null,
    outdoor_spaces: [],
    parking_types: [],
    monthly_charges: null,
    property_tax: null,
    watch_points: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function makeSaved(overrides: Partial<SavedPricePositioning> = {}): SavedPricePositioning {
  return {
    id: 'sv',
    projectId: 'proj',
    advisorPrice: 300000,
    sellerPrice: 320000,
    rangeLow: 270000,
    rangeCentral: 300000,
    rangeHigh: 330000,
    confidenceScore: 70,
    confidenceLevel: 'high',
    justification: null,
    snapshot: {
      engineVersion: 1,
      totalEligible: 3,
      usedCount: 3,
      outlierCount: 0,
      excludedOutlierCount: 0,
      outliersReintroduced: false,
      dispersion: 'high',
      widthPercentage: 10,
      confidenceScore: 70,
      confidenceLevel: 'high',
      influentialComparableIds: [],
      reasons: [],
    },
    validatedAt: '2026-01-03T00:00:00Z',
    validatedBy: 'adv',
    validatedByName: 'Alice Advisor',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
    ...overrides,
  };
}

const threeComps = () => [comp('a', 5000), comp('b', 6000), comp('c', 7000)];

// Builds a saved decision whose comparison key matches the current calculation
// for the given comparables → up_to_date.
function savedMatching(comparables: Comparable[], surface: number): SavedPricePositioning {
  const current = calculatePricePositioning({
    comparables,
    sellerProperty: { surfaceArea: surface },
  });
  const range = current.recommendedRange!;
  return makeSaved({
    rangeLow: range.low,
    rangeCentral: range.central,
    rangeHigh: range.high,
    confidenceScore: current.confidence.score,
    confidenceLevel: current.confidence.level,
    snapshot: {
      ...makeSaved().snapshot,
      usedCount: current.dataset.usedCount,
      influentialComparableIds: current.influentialComparables.map((c) => c.comparableId),
    },
  });
}

function input(
  overrides: Partial<BuildSellerPresentationInput> = {},
): BuildSellerPresentationInput {
  return {
    project: makeProject(),
    property: makeProperty(),
    diagnostics: null,
    condominium: null,
    comparables: threeComps(),
    savedPositioning: null,
    generatedAt: AT,
    ...overrides,
  };
}

describe('buildSellerPresentation — contract', () => {
  it('exposes the versioned contract and the generation date', () => {
    const result = buildSellerPresentation(input());
    expect(result.version).toBe(SELLER_PRESENTATION_VERSION);
    expect(result.version).toBe(2);
    expect(result.generatedAt).toBe(AT);
  });

  it('is ready with a property, 3 exploitable comparables, a ready positioning and a saved decision', () => {
    const comparables = threeComps();
    const result = buildSellerPresentation(
      input({ comparables, savedPositioning: savedMatching(comparables, 52) }),
    );
    expect(result.status).toBe('ready');
  });

  it('is incomplete when the decision is not saved', () => {
    expect(buildSellerPresentation(input({ savedPositioning: null })).status).toBe('incomplete');
  });

  it('is incomplete with fewer than 3 exploitable comparables', () => {
    const comparables = [comp('a', 5000), comp('b', 6000)];
    const result = buildSellerPresentation(
      input({ comparables, savedPositioning: savedMatching(comparables, 52) }),
    );
    expect(result.status).toBe('incomplete');
  });

  it('keeps a stable section order (1..7)', () => {
    const result = buildSellerPresentation(input());
    expect(result.sections.map((s) => s.key)).toEqual([
      'property',
      'comparables',
      'market_analysis',
      'price_positioning',
      'advisor_decision',
      'seller_price',
      'warnings',
    ]);
    expect(result.sections.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('never mutates its inputs', () => {
    const comparables = [
      comp('c', 7000, { display_order: 2 }),
      comp('a', 5000, { display_order: 0 }),
    ];
    const snapshot = JSON.stringify(comparables);
    buildSellerPresentation(input({ comparables }));
    expect(JSON.stringify(comparables)).toBe(snapshot); // order and content unchanged
  });
});

describe('buildSellerPresentation — property', () => {
  it('maps a complete property and keeps absent fields null / empty', () => {
    const result = buildSellerPresentation(input());
    expect(result.property).not.toBeNull();
    expect(result.property?.city).toBe('Antibes');
    expect(result.property?.surfaceArea).toBe(52);
    expect(result.property?.energyRating).toBe('C');
    expect(result.property?.features).toEqual(['Calme', 'Lumineux']);
    // Absent structured data is kept null / empty, never invented.
    expect(result.property?.district).toBeNull();
    expect(result.property?.gesRating).toBeNull();
    expect(result.property?.floor).toBeNull();
    expect(result.property?.outdoorSpaces).toEqual([]);
    expect(result.property?.parkingTypes).toEqual([]);
    expect(result.property?.watchPoints).toEqual([]);
  });

  it('exposes the new structured seller-property data when present', () => {
    const result = buildSellerPresentation(
      input({
        property: makeProperty({
          district: 'Estagnol',
          floor: 1,
          building_floors: 3,
          ges_rating: 'C',
          heating_type: 'individual_gas',
          exposure: 'south',
          construction_year: 1985,
          general_condition: 'good',
          outdoor_spaces: ['balcony', 'garden'],
          parking_types: ['garage'],
          monthly_charges: 120,
          property_tax: 1400,
          strengths: ['Calme'],
          watch_points: ['Étage sans ascenseur'],
        }),
      }),
    );
    expect(result.property).toMatchObject({
      district: 'Estagnol',
      floor: 1,
      buildingFloors: 3,
      gesRating: 'C',
      heatingType: 'individual_gas',
      exposure: 'south',
      constructionYear: 1985,
      generalCondition: 'good',
      outdoorSpaces: ['balcony', 'garden'],
      parkingTypes: ['garage'],
      monthlyCharges: 120,
      propertyTax: 1400,
      features: ['Calme'],
      watchPoints: ['Étage sans ascenseur'],
    });
  });

  it('returns a null property when none exists', () => {
    const result = buildSellerPresentation(input({ property: null }));
    expect(result.property).toBeNull();
    expect(result.sections.find((s) => s.key === 'property')?.status).toBe('unavailable');
  });

  it('exposes an empty photo list when the property has no photo', () => {
    const result = buildSellerPresentation(input({ property: makeProperty({ photo_urls: [] }) }));
    expect(result.property?.photoUrls).toEqual([]);
  });
});

describe('buildSellerPresentation — comparables', () => {
  it('includes only retained comparables, in display_order, with position', () => {
    const comparables = [
      comp('c', 7000, { display_order: 2 }),
      comp('rejected', 6000, { display_order: 1, is_selected: false }),
      comp('a', 5000, { display_order: 0 }),
    ];
    const result = buildSellerPresentation(input({ comparables }));
    expect(result.comparables.map((c) => c.id)).toEqual(['a', 'c']);
    expect(result.comparables.map((c) => c.position)).toEqual([1, 2]);
  });

  it('reuses the price/m² and the main photo', () => {
    const comparables = [
      comp('a', 5000, { surface_area: 50, photo_urls: ['https://x/1.jpg', 'https://x/2.jpg'] }),
    ];
    const result = buildSellerPresentation(input({ comparables }));
    expect(result.comparables[0].pricePerSquareMeter).toBe(5000);
    expect(result.comparables[0].photoUrl).toBe('https://x/1.jpg');
  });

  it('derives the source (manual vs url)', () => {
    const comparables = [
      comp('manual', 5000, { listing_url: null }),
      comp('imported', 6000, { listing_url: 'https://portal/x' }),
    ];
    const result = buildSellerPresentation(input({ comparables }));
    const byId = Object.fromEntries(result.comparables.map((c) => [c.id, c]));
    expect(byId.manual.source).toBe('manual');
    expect(byId.imported.source).toBe('url');
    expect(byId.imported.listingUrl).toBe('https://portal/x');
  });

  it('flags outliers and exposes an influence score when available', () => {
    // One clear outlier among enough comparables that it is excluded/flagged.
    const comparables = [comp('a', 5000), comp('b', 5050), comp('c', 5100), comp('x', 9000)];
    const result = buildSellerPresentation(input({ comparables }));
    const outlier = result.comparables.find((c) => c.id === 'x');
    expect(outlier?.isOutlier).toBe(true);
    // Influence scores exist for the official (non-outlier) set.
    expect(result.comparables.some((c) => c.influenceScore != null)).toBe(true);
  });
});

describe('buildSellerPresentation — reused engines', () => {
  it('reuses calculateComparableSummary without recomputing', () => {
    const comparables = threeComps();
    const result = buildSellerPresentation(input({ comparables }));
    expect(result.comparableSummary).toEqual(calculateComparableSummary(comparables));
  });

  it('reuses calculateComparableAnalysis without recomputing', () => {
    const comparables = threeComps();
    const result = buildSellerPresentation(input({ comparables }));
    expect(result.marketAnalysis).toEqual(calculateComparableAnalysis(comparables, 52));
  });

  it('nulls the summary and analysis when there is no exploitable comparable', () => {
    const result = buildSellerPresentation(input({ comparables: [] }));
    expect(result.comparableSummary).toBeNull();
    expect(result.marketAnalysis).toBeNull();
  });
});

describe('buildSellerPresentation — positioning and decision', () => {
  it('exposes a ready current positioning', () => {
    const result = buildSellerPresentation(input());
    expect(result.currentPositioning?.status).toBe('ready');
    expect(result.sections.find((s) => s.key === 'price_positioning')?.status).toBe('available');
  });

  it('marks the positioning section unavailable when insufficient data', () => {
    const result = buildSellerPresentation(
      input({ property: makeProperty({ surface_area: null }) }),
    );
    expect(result.currentPositioning?.status).toBe('insufficient_data');
    expect(result.sections.find((s) => s.key === 'price_positioning')?.status).toBe('unavailable');
  });

  it('is not_saved when no decision exists', () => {
    expect(buildSellerPresentation(input({ savedPositioning: null })).positioningStatus).toBe(
      'not_saved',
    );
  });

  it('is up_to_date when the saved decision matches the current calculation', () => {
    const comparables = threeComps();
    const result = buildSellerPresentation(
      input({ comparables, savedPositioning: savedMatching(comparables, 52) }),
    );
    expect(result.positioningStatus).toBe('up_to_date');
  });

  it('is outdated and never replaces the saved decision', () => {
    const saved = makeSaved({ rangeCentral: 999999 });
    const result = buildSellerPresentation(input({ savedPositioning: saved }));
    expect(result.positioningStatus).toBe('outdated');
    // The saved decision is echoed unchanged, never overwritten by the current calc.
    expect(result.savedPositioning).toBe(saved);
    expect(result.savedPositioning?.rangeCentral).toBe(999999);
  });
});

describe('buildSellerPresentation — section availability', () => {
  it('applies every availability rule', () => {
    const comparables = threeComps();
    const saved = savedMatching(comparables, 52);
    const sectionsOf = (i: BuildSellerPresentationInput) =>
      Object.fromEntries(buildSellerPresentation(i).sections.map((s) => [s.key, s.status]));

    const full = sectionsOf(input({ comparables, savedPositioning: saved }));
    expect(full).toMatchObject({
      property: 'available',
      comparables: 'available',
      market_analysis: 'available',
      price_positioning: 'available',
      advisor_decision: 'available',
      seller_price: 'available',
      warnings: 'available',
    });

    const noSeller = sectionsOf(
      input({ comparables, savedPositioning: makeSaved({ sellerPrice: null }) }),
    );
    expect(noSeller.seller_price).toBe('unavailable');
    expect(noSeller.advisor_decision).toBe('available');

    const empty = sectionsOf(input({ property: null, comparables: [], savedPositioning: null }));
    expect(empty).toMatchObject({
      property: 'unavailable',
      comparables: 'unavailable',
      market_analysis: 'unavailable',
      price_positioning: 'unavailable',
      advisor_decision: 'unavailable',
      seller_price: 'unavailable',
      warnings: 'available',
    });
  });
});

describe('buildSellerPresentation — warnings', () => {
  const codes = (i: BuildSellerPresentationInput) =>
    buildSellerPresentation(i).warnings.map((w) => w.code);

  it('raises blocking alerts for missing property / surface / comparable / positioning', () => {
    expect(codes(input({ property: null, comparables: [] }))).toEqual(
      expect.arrayContaining(['no_property', 'no_comparable', 'positioning_unavailable']),
    );
    expect(codes(input({ property: makeProperty({ surface_area: null }) }))).toContain(
      'no_seller_surface',
    );
  });

  it('raises vigilance alerts (few comparables, no decision, seller price missing)', () => {
    const c = codes(
      input({ comparables: [comp('a', 5000), comp('b', 6000)], savedPositioning: null }),
    );
    expect(c).toEqual(
      expect.arrayContaining(['few_comparables', 'decision_not_saved', 'seller_price_missing']),
    );
  });

  it('raises an outdated-decision alert', () => {
    expect(codes(input({ savedPositioning: makeSaved({ rangeCentral: 999999 }) }))).toContain(
      'decision_outdated',
    );
  });

  it('raises photo alerts when visuals are missing', () => {
    const c = codes(
      input({
        property: makeProperty({ photo_urls: [] }),
        comparables: [comp('a', 5000, { photo_urls: [] })],
      }),
    );
    expect(c).toEqual(expect.arrayContaining(['property_no_photo', 'comparables_no_photo']));
  });

  it('raises informative alerts (high dispersion) without duplicates and in stable order', () => {
    const result = buildSellerPresentation(input());
    const c = result.warnings.map((w) => w.code);
    expect(c).toContain('high_dispersion'); // ppsm 5000/6000/7000 → high dispersion
    // No duplicate codes.
    expect(c.length).toBe(new Set(c).size);
    // Severity order: blocking first, then warning, then info.
    const severities = result.warnings.map((w) => w.severity);
    const rank = { blocking: 0, warning: 1, info: 2 } as const;
    const ranks = severities.map((s) => rank[s]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});

function makeDiagnostics(
  overrides: Partial<
    import('@/features/subject-property-diagnostics/types').SubjectPropertyDiagnostics
  > = {},
): import('@/features/subject-property-diagnostics/types').SubjectPropertyDiagnostics {
  return {
    id: 'diag',
    subject_property_id: 'sp',
    agency_id: 'ag',
    dpe_date: '2025-01-15',
    energy_consumption: 180,
    ges_emissions: 25,
    asbestos_status: null,
    lead_status: null,
    electricity_status: null,
    gas_status: null,
    termites_status: null,
    erp_status: null,
    diagnostics_completed_at: '2025-01-15',
    diagnostics_valid_until: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCondominium(
  overrides: Partial<
    import('@/features/subject-property-condominium/types').SubjectPropertyCondominium
  > = {},
): import('@/features/subject-property-condominium/types').SubjectPropertyCondominium {
  return {
    id: 'condo',
    subject_property_id: 'sp',
    agency_id: 'ag',
    is_condominium: true,
    total_lots: 20,
    residential_lots: 15,
    annual_charges: 1200,
    works_fund: 5000,
    syndic_name: 'Cabinet X',
    ongoing_procedures: null,
    procedures_details: null,
    voted_works: null,
    voted_works_details: null,
    planned_works: null,
    planned_works_details: null,
    known_unpaid_charges: null,
    known_unpaid_charges_amount: null,
    last_general_assembly_date: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildSellerPresentation — diagnostics and condominium (Mission 22)', () => {
  it('exposes diagnostics and condominium when present', () => {
    const diagnostics = makeDiagnostics();
    const condominium = makeCondominium();
    const result = buildSellerPresentation(input({ diagnostics, condominium }));
    expect(result.diagnostics).toBe(diagnostics);
    expect(result.condominium).toBe(condominium);
  });

  it('keeps diagnostics and condominium null when absent (never invented)', () => {
    const result = buildSellerPresentation(input({ diagnostics: null, condominium: null }));
    expect(result.diagnostics).toBeNull();
    expect(result.condominium).toBeNull();
    const codes = result.warnings.map((w) => w.code);
    expect(codes).not.toContain('electricity_anomaly');
    expect(codes).not.toContain('condo_ongoing_procedures');
  });

  it('generates diagnostics vigilance alerts', () => {
    const result = buildSellerPresentation(
      input({
        diagnostics: makeDiagnostics({
          dpe_date: null,
          electricity_status: 'anomaly',
          erp_status: 'unknown',
        }),
      }),
    );
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toEqual(
      expect.arrayContaining(['dpe_not_done', 'electricity_anomaly', 'erp_unknown']),
    );
  });

  it('generates condominium vigilance alerts', () => {
    const result = buildSellerPresentation(
      input({
        condominium: makeCondominium({
          ongoing_procedures: true,
          known_unpaid_charges: true,
          annual_charges: null,
        }),
      }),
    );
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'condo_ongoing_procedures',
        'condo_unpaid_charges',
        'condo_missing_annual_charges',
      ]),
    );
  });
});

describe('buildSellerPresentation — Mission 24 live comparative core', () => {
  function response(overrides: Record<string, unknown> = {}) {
    return {
      id: 'r1',
      project_id: 'proj',
      comparable_id: 'a',
      agency_id: 'ag',
      seller_serious_competitor: 'yes',
      seller_serious_competitor_comment: null,
      seller_estimated_listing_price: 240000,
      seller_estimated_days_on_market: 30,
      seller_market_duration_reason: 'price_too_high',
      seller_market_duration_comment: null,
      created_at: AT,
      updated_at: AT,
      ...overrides,
    } as never;
  }

  it('exposes a live block with one entry per retained comparable', () => {
    const result = buildSellerPresentation(input());
    expect(result.live).not.toBeNull();
    expect(result.live?.comparables).toHaveLength(3);
    const first = result.live!.comparables[0];
    expect(first.featureComparison).toHaveLength(9);
    expect(first.priceReveal.currentPrice).toBe(250000); // 5000 * 50
    expect(first.marketDuration).toBeDefined();
    expect(first.priceHistory).toBeDefined();
  });

  it('attaches the seller response and computes the price gap from the estimate', () => {
    const result = buildSellerPresentation(input({ sellerResponses: [response()] }));
    const entry = result.live!.comparables.find((c) => c.id === 'a')!;
    expect(entry.response?.seller_serious_competitor).toBe('yes');
    expect(entry.priceReveal.sellerEstimate).toBe(240000);
    expect(entry.priceReveal.gapAmount).toBe(10000); // 250000 - 240000
    expect(entry.response?.seller_estimated_days_on_market).toBe(30);
    expect(entry.priceReveal.relativePosition).toEqual({ rank: 1, total: 3 });
  });

  it('computes final price gaps from the seller summary and observed market', () => {
    const comparables = threeComps();
    const result = buildSellerPresentation(
      input({
        comparables,
        savedPositioning: savedMatching(comparables, 52),
        sellerSummary: {
          id: 's1',
          project_id: 'proj',
          agency_id: 'ag',
          seller_most_dangerous_comparable_id: 'c',
          seller_most_dangerous_reason: 'more_attractive_price',
          seller_most_dangerous_comment: null,
          seller_perceived_property_price: 320000,
          advisor_comparative_market_price: 300000,
          created_at: AT,
          updated_at: AT,
        } as never,
      }),
    );
    const gaps = result.live!.priceGaps;
    expect(gaps.sellerPerceivedPrice).toBe(320000);
    expect(gaps.advisorComparativePrice).toBe(300000);
    expect(gaps.sellerVsAdvisor.amount).toBe(20000);
    expect(result.live!.advisorDecision?.advisorPrice).toBe(300000);
  });

  it('returns null live when there is no property', () => {
    expect(buildSellerPresentation(input({ property: null })).live).toBeNull();
  });

  it('exposes every photo of a comparable to Live (SellerPresentation carries all)', () => {
    const photos = Array.from({ length: 8 }, (_value, i) => `https://x/${i}.jpg`);
    const result = buildSellerPresentation(
      input({
        comparables: [comp('a', 5000, { photo_urls: photos }), comp('b', 6000), comp('c', 7000)],
      }),
    );
    const entry = result.live!.comparables.find((c) => c.id === 'a')!;
    expect(entry.photoUrls).toEqual(photos);
    expect(entry.photoUrl).toBe('https://x/0.jpg');
  });
});
