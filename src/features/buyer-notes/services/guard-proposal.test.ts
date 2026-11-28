import { describe, expect, it } from 'vitest';

import { DEMO_NOTES_OUTPUT } from '@/features/demo/data/notes-arnaud';
import {
  guardProposal,
  proposedFieldNames,
  saysFirm,
} from '@/features/buyer-notes/services/guard-proposal';
import {
  NOTE_OUTPUT_SCHEMA,
  NOTE_READING_INSTRUCTIONS,
} from '@/features/buyer-notes/model-request';
import { NOTE_STAR_CRITERIA, NOTE_STAR_LABELS } from '@/features/buyer-notes/note-stars';

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
  financing_mode: 'not_said',
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
    // Lot B — « accord banque OK » : un prêt, avec sa ligne d'origine.
    expect(proposal.financingMode).toBe('loan');
    expect(proposal.financingModeSource).toBe('accord banque OK');
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

  it('« comptant » : le mode « Comptant », jamais « Validé »', () => {
    const proposal = guardProposal({
      ...empty,
      financing_mode: 'cash',
      sources: [{ field: 'financing_mode', quote: 'cash (vente Stockholm), pas de prêt' }],
    });
    expect(proposal.financing).toBeNull();
    expect(proposal.financingMode).toBe('cash');
    // La source, seulement montrée à la validation, est tolérée (règle des deux comptes).
    expect(proposal.financingModeSource).toBe('cash (vente Stockholm), pas de prêt');
  });

  // Lot B (Jean-Guy, 27/11) — comment il finance n'est gardé qu'avec la ligne qui le dit, comme une
  // ★ : sans elle, ou quand elle dit autre chose, il tombe ; « pas de prêt » n'est jamais un prêt.
  it('comment il finance : gardé seulement avec sa ligne, qui le dit', () => {
    const mode = (financing_mode: string, quote?: string) =>
      guardProposal({
        ...empty,
        financing_mode,
        sources: quote ? [{ field: 'financing_mode', quote }] : [],
      }).financingMode;
    expect(mode('loan')).toBeNull();
    expect(mode('loan', 'pas de prêt, tout comptant')).toBeNull();
    expect(mode('cash', 'visites le samedi')).toBeNull();
    expect(mode('loan', 'accord banque OK')).toBe('loan');
    expect(mode('loan', 'Rendez-vous à la banque dans quinze jours')).toBe('loan');
    expect(mode('loan', 'crédit en cours chez le courtier')).toBe('loan');
    expect(mode('cash', 'achat COMPTANT')).toBe('cash');
    expect(mode('cash', 'sans emprunt')).toBe('cash');
    expect(mode('not_said', 'accord banque OK')).toBeNull();
    expect(mode('leasing', 'accord banque OK')).toBeNull();
    // Le mode ne pose jamais l'état du financement.
    expect(
      guardProposal({
        ...empty,
        financing_mode: 'loan',
        sources: [{ field: 'financing_mode', quote: 'accord banque OK' }],
      }).financing,
    ).toBeNull();
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
    // Lot B — le nom du champ du mode, jamais sa valeur.
    expect(names).toContain('financing_mode');
    expect(names.join(' ')).not.toMatch(/Arnaud|750|samedi|loan|banque/);
  });

  // Mission 151 — une seule liste d'indispensables pour la lecture : la consigne, le schéma de la
  // réponse, la garde et l'écran disent les sept mêmes, copropriété comprise (Jean-Guy, 12/11).
  it('la consigne, le schéma et la garde ont la même liste de ★, copropriété comprise', () => {
    expect([...NOTE_STAR_CRITERIA]).toEqual([
      'cities',
      'budget',
      'outdoor',
      'parking',
      'pool',
      'elevator',
      'condominium',
    ]);
    const properties = NOTE_OUTPUT_SCHEMA.properties as Record<
      string,
      { items?: { enum?: unknown } }
    >;
    expect(properties.must_have?.items?.enum).toEqual([...NOTE_STAR_CRITERIA]);
    expect(NOTE_READING_INSTRUCTIONS).toContain(`parmi : ${NOTE_STAR_CRITERIA.join(', ')}`);
    expect(Object.keys(NOTE_STAR_LABELS)).toEqual([...NOTE_STAR_CRITERIA]);
  });

  it('la ★ copropriété : sa ligne d’origine et un « non » gardé, deux ★ au plus', () => {
    const read = (over: Record<string, unknown>) =>
      guardProposal({
        ...empty,
        condominium_accepted: false,
        must_have: ['condominium'],
        sources: [
          { field: 'condominium_accepted', quote: 'PAS de copropriété' },
          { field: 'must_have:condominium', quote: 'PAS de copropriété' },
        ],
        ...over,
      });
    expect(read({}).mustHave).toEqual([{ key: 'condominium', source: 'PAS de copropriété' }]);
    // Sans sa ligne d'origine, elle tombe.
    expect(
      read({ sources: [{ field: 'condominium_accepted', quote: 'PAS de copropriété' }] }).mustHave,
    ).toEqual([]);
    // Un « non » qui tombe (aucune ligne qui le dise) emporte sa ★.
    expect(
      read({ sources: [{ field: 'must_have:condominium', quote: 'copro' }] }).mustHave,
    ).toEqual([]);
    expect(read({ condominium_accepted: null }).mustHave).toEqual([]);
    // Deux au plus, dans l'ordre lu.
    const three = read({
      pool: true,
      must_have: ['pool', 'outdoor', 'condominium'],
      outdoor: true,
      sources: [
        { field: 'condominium_accepted', quote: 'PAS de copropriété' },
        { field: 'must_have:condominium', quote: 'PAS de copropriété' },
        { field: 'must_have:pool', quote: 'piscine OBLIGATOIRE' },
        { field: 'must_have:outdoor', quote: 'jardin OBLIGATOIRE' },
      ],
    });
    expect(three.mustHave.map((star) => star.key)).toEqual(['pool', 'outdoor']);
  });

  // C5 du 12/11 : « Garage indispensable », la ★ lue et le champ laissé vide ; à la création, la
  // ★ écrivait « oui » sans carte à vérifier. La garde montre le champ, la ligne de la ★ pour source.
  it('une ★ sur un équipement met le champ à « oui », montré ; un « non » gardé la fait tomber', () => {
    const garage = guardProposal({
      ...empty,
      must_have: ['parking'],
      sources: [{ field: 'must_have:parking', quote: 'Garage indispensable.' }],
    });
    expect(garage.values.parking).toBe(true);
    expect(garage.sources.parking).toBe('Garage indispensable.');
    expect(garage.mustHave.map((star) => star.key)).toEqual(['parking']);
    const contradicted = guardProposal({
      ...empty,
      parking: false,
      must_have: ['parking'],
      sources: [
        { field: 'parking', quote: 'sans parking' },
        { field: 'must_have:parking', quote: 'parking OBLIGATOIRE' },
      ],
    });
    expect(contradicted.values.parking).toBe(false);
    expect(contradicted.mustHave).toEqual([]);
  });

  // N6 du 12/11 : « Mougins, Mouans-Sartoux, Pégomas » ne dit rien de ferme ; « gros travaux non,
  // cuisine à refaire OK » n'est pas un « non » aux travaux.
  it('une ★ sans ligne qui la dise ferme tombe ; un « non » nuancé aux travaux reste inconnu', () => {
    const cities = guardProposal({
      ...empty,
      cities: ['Mougins'],
      must_have: ['cities'],
      sources: [{ field: 'must_have:cities', quote: 'Mougins, Mouans-Sartoux, Pégomas' }],
    });
    expect(cities.mustHave).toEqual([]);
    expect(saysFirm('Garage indispensable.')).toBe(true);
    expect(saysFirm('Jardin +++')).toBe(true);
    expect(saysFirm('PAS de copropriété ni lotissement avec ASL')).toBe(true);
    expect(saysFirm('budget ferme, pas un euro de plus')).toBe(true);
    expect(saysFirm('RDC ok si jardinet')).toBe(false);
    expect(saysFirm('T3 à Antibes, DPE C max')).toBe(false);
    const works = (quote: string) =>
      guardProposal({
        ...empty,
        works_accepted: false,
        sources: [{ field: 'works_accepted', quote }],
      }).values.worksAccepted;
    expect(works('gros travaux non, cuisine à refaire OK')).toBeUndefined();
    expect(works('Pas de travaux — un coup de peinture ne le gêne pas')).toBeUndefined();
    expect(works('aucun travaux')).toBe(false);
  });

  // Jean-Guy, 12/11 : la liste des mots fermes s'élargit ; sans ligne ferme, pas de ★, mais le
  // « oui » reste proposé ; un « non » nuancé aux travaux laisse sa nuance dans Notes.
  it('les mots fermes, le « oui » gardé sans ★, la nuance des travaux dans Notes', () => {
    for (const line of [
      'terrasse impérative',
      'garage absolument',
      'piscine non négociable',
      'ascenseur exigé',
      'il faut un parking',
      'jardin nécessaire',
      'balcon essentiel',
    ]) {
      expect(saysFirm(line), line).toBe(true);
    }
    expect(saysFirm('un jardin si possible')).toBe(false);
    const wished = guardProposal({
      ...empty,
      must_have: ['pool'],
      sources: [{ field: 'must_have:pool', quote: 'piscine souhaitée' }],
    });
    expect(wished.mustHave).toEqual([]);
    expect(wished.values.pool).toBe(true);
    expect(wished.sources.pool).toBe('piscine souhaitée');
    const works = guardProposal({
      ...empty,
      works_accepted: false,
      notes: 'Visites le vendredi après-midi.',
      sources: [{ field: 'works_accepted', quote: 'gros travaux non, cuisine à refaire OK' }],
    });
    expect(works.values.worksAccepted).toBeUndefined();
    expect(works.values.notes).toBe(
      'Visites le vendredi après-midi. gros travaux non, cuisine à refaire OK (à vérifier)',
    );
    const alone = guardProposal({
      ...empty,
      works_accepted: false,
      sources: [{ field: 'works_accepted', quote: 'gros travaux non, cuisine à refaire OK' }],
    });
    expect(alone.values.notes).toBe('gros travaux non, cuisine à refaire OK (à vérifier)');
    expect(alone.sources.notes).toBe('gros travaux non, cuisine à refaire OK');
  });
});
