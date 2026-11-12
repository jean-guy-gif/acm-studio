import { describe, expect, it } from 'vitest';

import { DEMO_NOTES_OUTPUT } from '@/features/demo/data/notes-arnaud';
import { guardProposal } from '@/features/buyer-notes/services/guard-proposal';
import { formatEuro } from '@/lib/format';
import {
  PROPOSAL_CARDS,
  cardSource,
  cardText,
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
      cities: ['Vence', 'Saint-Paul-de-Vence', 'Tourrettes-sur-Loup'],
      budget_max: '750000',
      budget_ideal: '700000',
      outdoor: 'yes',
      must_have: ['outdoor'],
      financing: 'validated',
      notes: 'Disponibles pour visiter le samedi.',
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

  it('sur une fiche existante, rien ne change sans coche ; ce qu’elle sait déjà reste', () => {
    const { fields, toVerify } = proposalForm(proposal, existing, {
      kept: new Set<NoteField>(['phone']),
      starsKept: false,
      softKept: false,
      cashValidated: false,
    });
    expect(fields).toMatchObject({
      name: 'M. et Mme Arnaud',
      email: 'arnaud@example.com',
      phone: '06 39 98 27 14',
      budget_max: '650000',
      surface_min: '120',
      must_have: ['pool'],
      deal_breakers: 'pas de lotissement',
      soft_criteria: JSON.stringify([{ key: 'vue', words: 'une vue' }]),
    });
    expect(toVerify).toEqual(['phone', 'financing']);
  });

  it('« Comptant, à vérifier » ne devient « Validé » que par le geste du conseiller', () => {
    const cash = guardProposal({
      ...DEMO_NOTES_OUTPUT,
      financing: 'cash_to_verify',
      sources: [...DEMO_NOTES_OUTPUT.sources],
    });
    const choices = { kept: allKept, starsKept: true, softKept: true };
    expect(
      proposalForm(cash, null, { ...choices, cashValidated: false }).fields.financing,
    ).toBeUndefined();
    expect(proposalForm(cash, null, { ...choices, cashValidated: true }).fields.financing).toBe(
      'validated',
    );
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
    expect(fields.cities).toBe('Vence');
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
