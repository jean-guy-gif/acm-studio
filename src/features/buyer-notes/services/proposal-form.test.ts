import { describe, expect, it } from 'vitest';

import { DEMO_NOTES_OUTPUT } from '@/features/demo/data/notes-arnaud';
import { guardProposal } from '@/features/buyer-notes/services/guard-proposal';
import { formatEuro } from '@/lib/format';
import {
  PROPOSAL_CARDS,
  cardSource,
  cardText,
  citiesCardUnchecked,
} from '@/features/buyer-notes/services/proposal-display';
import {
  proposalForm,
  proposalLines,
  type ExistingBuyer,
} from '@/features/buyer-notes/services/proposal-form';
import type { NoteField } from '@/features/buyer-notes/types';

const proposal = guardProposal(DEMO_NOTES_OUTPUT);
const allKept = new Set(Object.keys(proposal.values) as NoteField[]);

const existing: ExistingBuyer = {
  id: 'b-1',
  financingMode: 'not_said',
  name: 'M. et Mme Arnaud',
  phone: null,
  email: 'arnaud@example.com',
  purpose: null,
  timeline: null,
  language: 'fr',
  propertyTypes: ['house'],
  cities: ['Vence'],
  budgetIdeal: null,
  budgetMax: 650000,
  roomsMin: null,
  bedroomsMin: null,
  surfaceMin: 120,
  outdoor: null,
  parking: null,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  condominiumAccepted: null,
  notes: null,
  mustHave: ['pool'],
  dealBreakers: 'pas de lotissement',
  condominiumMustHave: false,
  softCriteria: [{ key: 'vue', words: 'une vue' }],
  financing: 'in_progress',
};

describe('la fiche proposée (planche 2)', () => {
  it('en création, tout ce qui est proposé part, avec les champs « À vérifier » ; jamais une source', () => {
    const { fields, toVerify } = proposalForm(proposal, null, {
      kept: allKept,
      starsKept: true,
      softKept: true,
      cashValidated: false,
    });
    expect(fields).toMatchObject({
      name: 'M. et Mme Arnaud',
      phone: '06 39 98 27 14',
      property_types: ['house'],
      cities: 'Vence, Saint-Paul-de-Vence, Tourrettes-sur-Loup',
      budget_max: '750000',
      budget_ideal: '700000',
      outdoor: 'yes',
      must_have: ['outdoor'],
      financing: 'validated',
      notes: 'Visites possibles le samedi.',
    });
    expect(
      JSON.parse(String(fields.soft_criteria)).map((soft: { key: string }) => soft.key),
    ).toEqual(['calme', 'sans_vis_a_vis', 'cachet', 'plain_pied', 'pret_a_vivre']);
    expect(toVerify).toEqual(
      expect.arrayContaining(['name', 'cities', 'must_have', 'soft_criteria', 'financing']),
    );
    // Aucune ligne des notes dans ce qui part.
    expect(JSON.stringify(fields)).not.toMatch(/ARNAUD \(M\. et Mme\)|750 max|Jardin \+\+\+/);
  });

  it('sur une fiche existante : une valeur différente est décochée, un champ vide coché', () => {
    const lines = proposalLines(proposal, existing);
    const line = (field: NoteField) => lines.find((item) => item.field === field);
    expect(line('budgetMax')).toMatchObject({
      before: 650000,
      changes: true,
      checkedByDefault: false,
    });
    expect(line('phone')).toMatchObject({ before: null, changes: true, checkedByDefault: true });
    expect(line('name')).toMatchObject({ changes: false, checkedByDefault: false });
  });

  it('sur une fiche existante, seuls les champs cochés partent ; rien de ce qu’elle sait déjà', () => {
    const { fields, toVerify } = proposalForm(proposal, existing, {
      kept: new Set<NoteField>(['phone']),
      starsKept: false,
      softKept: false,
      cashValidated: false,
    });
    expect(fields).toEqual({ phone: '06 39 98 27 14' });
    expect(toVerify).toEqual(['phone']);
  });

  it('sur une fiche existante, le financement lu ne remplace rien sans coche (A.8)', () => {
    const base = {
      kept: new Set<NoteField>(),
      starsKept: false,
      softKept: false,
      cashValidated: false,
    };
    expect(proposalForm(proposal, existing, base).fields.financing).toBeUndefined();
    expect(
      proposalForm(proposal, existing, { ...base, financingKept: true }).fields.financing,
    ).toBe('validated');
  });

  it('un ★ lu ne met pas « oui » un équipement que la fiche dit « non » sans coche de la carte', () => {
    const refusing = { ...existing, outdoor: false, mustHave: [] };
    const without = proposalForm(proposal, refusing, {
      kept: new Set<NoteField>(),
      starsKept: true,
      softKept: false,
      cashValidated: false,
    });
    expect(without.fields.outdoor).toBeUndefined();
    expect(without.fields.must_have).toBeUndefined();
    const withCard = proposalForm(proposal, refusing, {
      kept: new Set<NoteField>(['outdoor']),
      starsKept: true,
      softKept: false,
      cashValidated: false,
    });
    expect(withCard.fields.outdoor).toBe('yes');
    expect(withCard.fields.must_have).toEqual(['outdoor']);
  });

  it('sur une fiche existante, les mots lus ne partent qu’avec leur case', () => {
    const base = { kept: new Set<NoteField>(), starsKept: false, cashValidated: false };
    expect(
      proposalForm(proposal, existing, { ...base, softKept: false }).fields.soft_criteria,
    ).toBeUndefined();
    expect(
      JSON.parse(
        String(proposalForm(proposal, existing, { ...base, softKept: true }).fields.soft_criteria),
      ),
    ).toHaveLength(5);
  });

  it('une commune non reconnue, tapée par le conseiller, part à part : le serveur l’ajoute', () => {
    const { fields } = proposalForm(proposal, null, {
      kept: allKept,
      starsKept: true,
      softKept: true,
      cashValidated: false,
      typedCities: 'Cagnes-sur-Mer, Vence',
    });
    expect(fields.cities).toBe('Vence, Saint-Paul-de-Vence, Tourrettes-sur-Loup');
    expect(fields.cities_add).toEqual(['Cagnes-sur-Mer', 'Vence']);
  });

  it('fiche existante : une carte « Communes » décochée n’écrit pas la commune tapée dedans', () => {
    const before = { cities: ['Vence'] };
    // La lecture propose d'autres communes : la carte porte une case.
    expect(citiesCardUnchecked(proposal.values, before, new Set())).toBe(true);
    expect(citiesCardUnchecked(proposal.values, before, new Set(['cities']))).toBe(false);
    // Rien de lu, ou les mêmes communes : pas de case, la commune tapée part.
    expect(citiesCardUnchecked({}, before, new Set())).toBe(false);
    expect(citiesCardUnchecked({ cities: ['Vence'] }, before, new Set())).toBe(false);
    // Une fiche neuve n'a pas de case.
    expect(citiesCardUnchecked(proposal.values, null, new Set())).toBe(false);
  });

  it('la ★ copropriété écrit « non » et sa ★, à part des autres indispensables', () => {
    const condo = guardProposal({
      ...DEMO_NOTES_OUTPUT,
      condominium_accepted: false,
      must_have: ['condominium'],
      sources: [
        ...DEMO_NOTES_OUTPUT.sources,
        { field: 'condominium_accepted', quote: 'PAS de copropriété' },
        { field: 'must_have:condominium', quote: 'PAS de copropriété' },
      ],
    });
    const choices = { starsKept: true, softKept: true, cashValidated: false };
    const created = proposalForm(condo, null, {
      ...choices,
      kept: new Set(Object.keys(condo.values) as NoteField[]),
    });
    expect(created.fields).toMatchObject({
      condominium_accepted: 'no',
      condominium_must_have: 'yes',
    });
    expect(created.fields.must_have).toBeUndefined();
    expect(created.toVerify).toContain('condominium_must_have');
    // Une fiche qui accepte la copropriété, sa carte non cochée : la ★ ne s'ajoute pas.
    const accepting = { ...existing, condominiumAccepted: true };
    expect(
      proposalForm(condo, accepting, { ...choices, kept: new Set() }).fields.condominium_must_have,
    ).toBeUndefined();
    expect(
      proposalForm(condo, accepting, { ...choices, kept: new Set(['condominiumAccepted']) }).fields
        .condominium_must_have,
    ).toBe('yes');
  });

  it('« Comptant » ne devient « Validé » que par le geste du conseiller', () => {
    const cash = guardProposal({
      ...DEMO_NOTES_OUTPUT,
      financing: 'unknown',
      financing_mode: 'cash',
      sources: [
        ...DEMO_NOTES_OUTPUT.sources.filter((source) => !source.field.startsWith('financing')),
        { field: 'financing_mode', quote: 'achat comptant' },
      ],
    });
    const choices = { kept: allKept, starsKept: true, softKept: true };
    expect(
      proposalForm(cash, null, { ...choices, cashValidated: false }).fields.financing,
    ).toBeUndefined();
    expect(proposalForm(cash, null, { ...choices, cashValidated: true }).fields.financing).toBe(
      'validated',
    );
  });

  // Lot B — comment il finance, « À vérifier » jusqu'au toucher du conseiller (réponse 10) ; sur une
  // fiche qui le dit déjà autrement, rien sans sa coche (A.8).
  it('comment il finance : écrit et « À vérifier » ; sur une fiche existante, sa coche', () => {
    const choices = { kept: allKept, starsKept: true, softKept: true, cashValidated: false };
    const created = proposalForm(proposal, null, choices);
    expect(created.fields.financing_mode).toBe('loan');
    expect(created.toVerify).toContain('financing_mode');
    const borrower = { ...existing, financingMode: 'cash' as const };
    expect(proposalForm(proposal, borrower, choices).fields.financing_mode).toBeUndefined();
    expect(
      proposalForm(proposal, borrower, { ...choices, modeKept: true }).fields.financing_mode,
    ).toBe('loan');
  });

  it('le nom et les communes non lus se saisissent', () => {
    const empty = guardProposal({ ...DEMO_NOTES_OUTPUT, name: null, cities: [] });
    const { fields } = proposalForm(empty, null, {
      kept: new Set(Object.keys(empty.values) as NoteField[]),
      starsKept: true,
      softKept: true,
      cashValidated: false,
      typedName: ' Famille Test ',
      typedCities: 'Vence',
    });
    expect(fields.name).toBe('Famille Test');
    expect(fields.cities_add).toEqual(['Vence']);
  });

  it('les cartes suivent la planche : budget et pièces regroupés, la ligne des notes dessous', () => {
    const card = (id: string) => PROPOSAL_CARDS.find((item) => item.id === id)!;
    expect(cardText(card('budget'), proposal.values)).toBe(
      `idéal ${formatEuro(700000)} · plafond ${formatEuro(750000)}`,
    );
    expect(cardText(card('rooms'), proposal.values)).toBe('4 pièces · 3 chambres au moins');
    expect(cardText(card('email'), proposal.values)).toBeNull();
    expect(cardSource(card('budget'), proposal)).toBe('750 max (idéal 700)');
  });
});
