import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { parseComparableForm } from '@/features/comparables/utils/comparable-input';
import { buildProspectingRows } from '@/features/competitor-locator/services/build-prospecting-rows';
import {
  PROSPECTING_STEP_LABELS,
  advisorCorrection,
  importedMandateColumns,
  parseImportedMandateForm,
  prospectingStep,
} from '@/features/competitor-mandate/services/mandate-columns';

const form = (fields: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  return formData;
};

const UNKNOWN = {
  sold_by: null,
  sold_by_source: null,
  exclusivity: null,
  exclusivity_source: null,
};

describe('importedMandateColumns', () => {
  it('copie la lecture et sa provenance', () => {
    expect(
      importedMandateColumns({
        soldBy: 'agency',
        soldBySource: 'advertiser',
        exclusivity: 'yes',
        exclusivitySource: 'badge',
      }),
    ).toEqual({
      sold_by: 'agency',
      sold_by_source: 'advertiser',
      exclusivity: 'yes',
      exclusivity_source: 'badge',
    });
  });

  it('une valeur inconnue ne garde pas de provenance', () => {
    expect(
      importedMandateColumns({
        soldBy: null,
        soldBySource: 'badge',
        exclusivity: null,
        exclusivitySource: 'title',
      }),
    ).toEqual(UNKNOWN);
  });
});

describe('parseImportedMandateForm — champs cachés revalidés', () => {
  it('accepte une lecture complète', () => {
    expect(
      parseImportedMandateForm(
        form({
          sold_by: 'agency',
          sold_by_source: 'listing_data',
          exclusivity: 'no',
          exclusivity_source: 'listing_data',
        }),
      ),
    ).toEqual({
      sold_by: 'agency',
      sold_by_source: 'listing_data',
      exclusivity: 'no',
      exclusivity_source: 'listing_data',
    });
  });

  it('agence sans mention : « non », provenance « aucune mention »', () => {
    expect(
      parseImportedMandateForm(
        form({
          sold_by: 'agency',
          sold_by_source: 'advertiser',
          exclusivity: 'no',
          exclusivity_source: 'no_mention',
        }),
      ),
    ).toEqual({
      sold_by: 'agency',
      sold_by_source: 'advertiser',
      exclusivity: 'no',
      exclusivity_source: 'no_mention',
    });
  });

  it('une saisie à la main ne porte rien', () => {
    expect(parseImportedMandateForm(form({}))).toEqual(UNKNOWN);
  });

  it.each([
    [
      '« particulier » ne vient jamais d’une lecture',
      { sold_by: 'private', sold_by_source: 'badge' },
    ],
    ['valeur hors liste', { exclusivity: 'peut-être', exclusivity_source: 'badge' }],
    ['provenance hors liste', { exclusivity: 'yes', exclusivity_source: 'photo' }],
    ['provenance « conseiller » forgée', { sold_by: 'agency', sold_by_source: 'advisor' }],
    ['valeur sans provenance', { exclusivity: 'yes' }],
    ['« aucune mention » sans agence', { exclusivity: 'no', exclusivity_source: 'no_mention' }],
    [
      '« aucune mention » n’est pas une provenance de vendeur',
      { sold_by: 'agency', sold_by_source: 'no_mention' },
    ],
  ])('%s : ignoré', (_label, fields) => {
    expect(parseImportedMandateForm(form(fields))).toEqual(UNKNOWN);
  });

  it('« aucune mention » ne dit jamais « oui » : l’agence reste, l’exclusivité est ignorée', () => {
    expect(
      parseImportedMandateForm(
        form({
          sold_by: 'agency',
          sold_by_source: 'advertiser',
          exclusivity: 'yes',
          exclusivity_source: 'no_mention',
        }),
      ),
    ).toEqual({ ...UNKNOWN, sold_by: 'agency', sold_by_source: 'advertiser' });
  });
});

describe('advisorCorrection', () => {
  it('pose la valeur avec la provenance « conseiller »', () => {
    expect(advisorCorrection('sold_by', 'private')).toEqual({
      sold_by: 'private',
      sold_by_source: 'advisor',
    });
    expect(advisorCorrection('exclusivity', 'no')).toEqual({
      exclusivity: 'no',
      exclusivity_source: 'advisor',
    });
  });

  it('« inconnu » est aussi une réponse du conseiller', () => {
    expect(advisorCorrection('exclusivity', null)).toEqual({
      exclusivity: null,
      exclusivity_source: 'advisor',
    });
  });

  it('refuse une valeur hors liste, et ne touche jamais l’autre champ', () => {
    expect(advisorCorrection('sold_by', 'yes')).toBeUndefined();
    expect(advisorCorrection('exclusivity', 'agency')).toBeUndefined();
    expect(Object.keys(advisorCorrection('sold_by', 'agency') ?? {})).toEqual([
      'sold_by',
      'sold_by_source',
    ]);
  });

  it('le formulaire de modification ne porte pas ces colonnes : il ne peut pas l’écraser', () => {
    const parsed = parseComparableForm(
      form({ price: '300000', sold_by: 'agency', exclusivity: 'yes' }),
    );
    if (!parsed.ok) throw new Error('formulaire refusé');
    expect(Object.keys(parsed.input)).not.toEqual(
      expect.arrayContaining(['sold_by', 'exclusivity']),
    );
    expect(parsed.input).not.toHaveProperty('sold_by');
    expect(parsed.input).not.toHaveProperty('sold_by_source');
    expect(parsed.input).not.toHaveProperty('exclusivity');
    expect(parsed.input).not.toHaveProperty('exclusivity_source');
  });
});

describe('prospectingStep — la liste de tournée', () => {
  it.each([
    [{ sold_by: 'agency', exclusivity: 'yes' }, 'colleague'],
    [{ sold_by: null, exclusivity: 'yes' }, 'colleague'],
    [{ sold_by: 'agency', exclusivity: 'no' }, 'owner'],
    [{ sold_by: 'private', exclusivity: null }, 'owner'],
    [{ sold_by: 'private', exclusivity: 'yes' }, 'owner'],
    [{ sold_by: 'agency', exclusivity: null }, 'check'],
    [{ sold_by: null, exclusivity: null }, 'check'],
  ] as const)('%o → %s', (mandate, step) => {
    expect(prospectingStep(mandate)).toBe(step);
  });

  it('les trois libellés de la mission', () => {
    expect(PROSPECTING_STEP_LABELS).toEqual({
      colleague: 'Exclusivité · appeler le confrère',
      owner: 'Mandat simple / particulier · aller voir le propriétaire',
      check: 'À vérifier',
    });
  });

  it('chaque ligne de tournée porte son étape et ce que le conseiller peut corriger', () => {
    const rows = buildProspectingRows(
      [
        makeComparable({ id: 'c1', exclusivity: 'yes', exclusivity_source: 'badge' }),
        makeComparable({ id: 'c2', sold_by: 'private', sold_by_source: 'advisor' }),
        makeComparable({ id: 'c3' }),
      ],
      [],
    );
    expect(rows.map((row) => row.step)).toEqual(['colleague', 'owner', 'check']);
    expect(rows[1].mandate).toMatchObject({
      id: 'c2',
      sold_by: 'private',
      sold_by_source: 'advisor',
    });
  });
});
