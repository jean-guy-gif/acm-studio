import { describe, expect, it } from 'vitest';

import { DEMO_NOTES_OUTPUT } from '@/features/demo/data/notes-arnaud';
import { guardProposal, proposedFieldNames } from '@/features/buyer-notes/services/guard-proposal';

// Mission 151 — les gardes du serveur, sur les défauts mesurés le 12/11 (plan B, Sonnet 4.6).

const empty = {
  name: null,
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  language: null,
  property_types: [],
  cities: [],
  budget_ideal: null,
  budget_max: null,
  rooms_min: null,
  bedrooms_min: null,
  surface_min: null,
  outdoor: null,
  parking: null,
  pool: null,
  floor_min: null,
  elevator: null,
  energy_rating_max: null,
  works_accepted: null,
  condominium_accepted: null,
  must_have: [],
  financing: 'unknown',
  soft_criteria: [],
  unclassified_wishes: [],
  notes: null,
  sources: [],
  personal_mentions_skipped: 0,
};

describe('guardProposal', () => {
  it('lit la démo des Arnaud : ★ extérieur sourcé, financement validé, cinq critères doux', () => {
    const proposal = guardProposal(DEMO_NOTES_OUTPUT);
    expect(proposal.values).toMatchObject({
      name: 'M. et Mme Arnaud',
      phone: '06 39 98 27 14',
      propertyTypes: ['house'],
      budgetIdeal: 700000,
      budgetMax: 750000,
      roomsMin: 4,
      bedroomsMin: 3,
      outdoor: true,
      notes: 'Visites possibles le samedi.',
    });
    expect(proposal.values.purpose).toBeUndefined();
    expect(proposal.mustHave).toEqual([{ key: 'outdoor', source: 'Jardin +++' }]);
    expect(proposal.financing).toBe('validated');
    expect(proposal.softCriteria.map((soft) => soft.key)).toEqual([
      'calme',
      'sans_vis_a_vis',
      'cachet',
      'plain_pied',
      'pret_a_vivre',
    ]);
    expect(proposal.personalMentionsSkipped).toBe(2);
    expect(proposal.sources.budgetMax).toBe('750 max (idéal 700)');
  });

  it('un ★ sans sa ligne d’origine tombe ; deux au plus ; le budget ★ sans plafond tombe', () => {
    const proposal = guardProposal({
      ...empty,
      cities: ['Antibes'],
      must_have: ['cities', 'budget', 'outdoor', 'pool', 'property_types'],
      sources: [
        { field: 'must_have:budget', quote: 'budget ferme' },
        { field: 'must_have:outdoor', quote: 'balcon obligatoire' },
        { field: 'must_have:pool', quote: 'piscine OBLIGATOIRE' },
      ],
    });
    // La commune ★ n'a pas de source ; le budget ★ n'a pas de plafond ; le type n'est jamais un ★.
    expect(proposal.mustHave.map((star) => star.key)).toEqual(['outdoor', 'pool']);
  });

  it('un « non » sans ligne qui le dise en toutes lettres devient inconnu', () => {
    const proposal = guardProposal({
      ...empty,
      parking: false,
      condominium_accepted: false,
      outdoor: false,
      sources: [
        { field: 'parking', quote: '☐   Garage' },
        { field: 'condominium_accepted', quote: 'PAS de copropriété ni lotissement avec ASL' },
        { field: 'outdoor', quote: 'stationnement;non' },
      ],
    });
    expect(proposal.values.parking).toBeUndefined();
    expect(proposal.values.condominiumAccepted).toBe(false);
    expect(proposal.values.outdoor).toBe(false);
  });

  it('aucune valeur par défaut : motif, délai et langue sans source tombent', () => {
    const unsourced = guardProposal({
      ...empty,
      purpose: 'primary',
      timeline: 'three_months',
      language: 'en',
    });
    expect(unsourced.values).toEqual({});
    const sourced = guardProposal({
      ...empty,
      language: 'en',
      sources: [{ field: 'language', quote: 'parlent angl.' }],
    });
    expect(sourced.values.language).toBe('en');
  });

  it('« comptant » n’est qu’une suggestion, jamais « Validé »', () => {
    const proposal = guardProposal({
      ...empty,
      financing: 'cash_to_verify',
      sources: [{ field: 'financing', quote: 'cash (vente Stockholm), pas de prêt' }],
    });
    expect(proposal.financing).toBeNull();
    expect(proposal.cashSuggestion).toBe(true);
    // La source, seulement montrée à la validation, est tolérée (règle des deux comptes).
    expect(proposal.financingSource).toBe('cash (vente Stockholm), pas de prêt');
  });

  it('ce qui s’enregistre ne garde aucune mention refusée, et la compte', () => {
    const proposal = guardProposal({
      ...empty,
      notes: 'Visites le samedi ; Madame enceinte.',
      soft_criteria: [
        { key: 'calme', words: 'au calme, M. très pressé' },
        { key: 'lumineux', words: 'lumineux' },
        { key: 'inconnu', words: 'x' },
        { key: 'lumineux', words: 'en double' },
      ],
      personal_mentions_skipped: 1,
    });
    expect(proposal.values.notes).toBeUndefined();
    expect(proposal.softCriteria).toEqual([{ key: 'lumineux', words: 'lumineux', source: null }]);
    expect(proposal.personalMentionsSkipped).toBe(3);
  });

  it('une contrainte pratique « (à vérifier) » reste en Notes', () => {
    const proposal = guardProposal({
      ...empty,
      notes: 'Pas de voiture le week-end (à vérifier).',
    });
    expect(proposal.values.notes).toBe('Pas de voiture le week-end (à vérifier).');
  });

  it('un idéal au-dessus du plafond, plus de chambres que de pièces : la valeur douteuse tombe', () => {
    const proposal = guardProposal({
      ...empty,
      budget_ideal: 800000,
      budget_max: 750000,
      rooms_min: 2,
      bedrooms_min: 3,
      email: 'pas un e-mail',
    });
    expect(proposal.values).toEqual({ budgetMax: 750000, roomsMin: 2 });
  });

  it('une réponse qui n’est pas un objet ne propose rien', () => {
    expect(guardProposal('texte libre').values).toEqual({});
    expect(guardProposal(null).mustHave).toEqual([]);
  });

  it('la trace ne garde que des noms de champs', () => {
    const names = proposedFieldNames(guardProposal(DEMO_NOTES_OUTPUT));
    expect(names).toContain('budgetMax');
    expect(names).toContain('must_have:outdoor');
    expect(names).toContain('soft:calme');
    expect(names.join(' ')).not.toMatch(/Arnaud|750|samedi/);
  });
});
