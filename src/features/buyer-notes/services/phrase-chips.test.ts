import { describe, expect, it } from 'vitest';

import { guardProposal } from '@/features/buyer-notes/services/guard-proposal';
import {
  draftForm,
  draftFromProposal,
  draftMissing,
  editDraft,
  phraseChips,
  type PhraseChip,
} from '@/features/buyer-notes/services/phrase-chips';
import type { CommuneCheck, NoteProposal } from '@/features/buyer-notes/types';
import {
  DEMO_NOTES_OUTPUT,
  DEMO_NOTES_TEXT,
  DEMO_PHRASE_OUTPUT,
  DEMO_PHRASE_TEXT,
  demoNotesOutput,
} from '@/features/demo/data/notes-arnaud';

// La refonte, lot D (maquette REFONTE-2) — « Ce que j'ai compris », en pastilles à corriger.

// Les montants s'écrivent avec des espaces insécables (M74) : on compare sans en tenir compte.
const plain = (text: string) => text.replace(/[  ]/g, ' ');

// La proposition de la démo, passée par les gardes de la vraie lecture ; ses communes vérifiées.
const guarded = guardProposal(DEMO_NOTES_OUTPUT);
const official: CommuneCheck[] = (guarded.values.cities ?? []).map((name) => ({
  read: name,
  status: 'official',
  name,
}));
const arnaud: NoteProposal = { ...guarded, communes: official };
const labels = (chips: PhraseChip[]) => chips.map((chip) => plain(chip.label));
const chip = (chips: PhraseChip[], id: string) => chips.find((item) => item.id === id)!;

const empty: NoteProposal = {
  values: {},
  sources: {},
  mustHave: [],
  financing: null,
  financingSource: null,
  financingMode: null,
  financingModeSource: null,
  softCriteria: [],
  communes: [],
  personalMentionsSkipped: 0,
};

describe('ce que j’ai compris : les pastilles', () => {
  const draft = draftFromProposal(arnaud);
  const chips = phraseChips(draft, arnaud);

  it('qui, ce qu’il cherche, ce qui compte pour eux, ses communes, ses indispensables, le reste', () => {
    expect(labels(chips)).toEqual([
      'M. et Mme Arnaud',
      'Maison',
      'Jusqu’à 750 000 €',
      'Idéal : 700 000 €',
      '4 pièces et plus',
      '3 chambres et plus',
      'Au calme',
      'Sans vis-à-vis',
      'Du cachet, de caractère',
      'De plain-pied',
      'Prêt à vivre, sans travaux',
      'Vence, Saint-Paul-de-Vence, Tourrettes-sur-Loup',
      'Indispensable : extérieur',
      'Financement validé',
      // Lot B — « accord banque OK » : comment ils financent.
      'Avec prêt',
      '06 39 98 27 14',
      'Note : Visites possibles le samedi.',
    ]);
  });

  it('la teinte dit la sorte : ce qui compte pour eux en vert, l’indispensable en orange', () => {
    expect(chip(chips, 'soft:calme').tone).toBe('soft');
    expect(chip(chips, 'outdoor').tone).toBe('must');
    expect(chip(chips, 'name').tone).toBe('plain');
    expect(chips.filter((item) => item.tone === 'missing')).toEqual([]);
  });

  it('chaque pastille garde la ligne des notes d’où elle vient, pour sa correction', () => {
    expect(chip(chips, 'name').source).toBe('ARNAUD (M. et Mme)');
    expect(chip(chips, 'budgetMax').source).toBe('750 max (idéal 700)');
    expect(chip(chips, 'outdoor').source).toBe('Jardin +++');
    expect(chip(chips, 'financing').source).toBe('accord banque OK');
    expect(chip(chips, 'soft:calme').source).toBe('AU CALME — pas de route');
  });

  it('rien de personnel n’entre dans une pastille : les gardes de la lecture restent', () => {
    const text = JSON.stringify(chips);
    expect(text).not.toMatch(/enceinte|pressé|difficile/i);
    expect(arnaud.personalMentionsSkipped).toBe(2);
  });

  it('jamais un pourcentage, jamais « estimation »', () => {
    expect(JSON.stringify(chips)).not.toMatch(/%|estimation/i);
  });

  it('sans nom ni commune : deux pastilles orange tiennent leur place', () => {
    const bare = draftFromProposal(empty);
    const bareChips = phraseChips(bare, empty);
    expect(labels(bareChips)).toEqual(['Son nom ?', 'Sa commune ?']);
    expect(bareChips.every((item) => item.tone === 'missing')).toBe(true);
    expect(draftMissing(bare)).toEqual(['son nom', 'une commune']);
    expect(draftMissing(draft)).toEqual([]);
  });

  it('une commune lue mais non reconnue se dit, et se précise', () => {
    const proposal: NoteProposal = {
      ...arnaud,
      values: { ...arnaud.values, cities: ['Vence'] },
      communes: [
        { read: 'Vence', status: 'official', name: 'Vence' },
        { read: 'Tourettes', status: 'unknown', name: null },
      ],
    };
    const unsure = draftFromProposal(proposal);
    const unsureChips = phraseChips(unsure, proposal);
    const unknown = chip(unsureChips, 'cities:unknown');
    expect(unknown.tone).toBe('missing');
    expect(unknown.label).toBe('Commune à préciser\u00a0: Tourettes');
    expect(unknown.hint).toContain('«\u00a0Tourettes\u00a0»');
    // Les communes corrigées par le conseiller : plus rien à préciser.
    const fixed = editDraft(unsure, {
      type: 'text',
      field: 'cities',
      value: 'Vence, Tourrettes-sur-Loup',
    });
    expect(phraseChips(fixed, proposal).some((item) => item.id === 'cities:unknown')).toBe(false);
    expect(fixed.values.cities).toEqual(['Vence', 'Tourrettes-sur-Loup']);
  });

  it('« Achat comptant » : le mode, et le geste « Financement validé » tant qu’il n’est pas dit', () => {
    const proposal: NoteProposal = {
      ...empty,
      financingMode: 'cash',
      financingModeSource: 'cash',
    };
    const draftCash = draftFromProposal(proposal);
    const cash = chip(phraseChips(draftCash, proposal), 'mode');
    expect(cash.label).toBe('Achat comptant');
    expect(cash.source).toBe('cash');
    expect(cash.editor.kind).toBe('cash');
    const validated = editDraft(draftCash, { type: 'cash' });
    expect(validated.financing).toBe('validated');
    expect(validated.mode).toBe('cash');
    expect(labels(phraseChips(validated, proposal))).toContain('Financement validé');
    // Le mode part « À vérifier » ; l'état du financement, seulement par son geste.
    expect(draftForm(draftCash).fields.financing).toBeUndefined();
    expect(draftForm(draftCash).fields.financing_mode).toBe('cash');
    expect(draftForm(draftCash).toVerify).toContain('financing_mode');
    expect(draftForm(validated).fields.financing).toBe('validated');
    // Retiré, il ne part pas.
    expect(
      draftForm(editDraft(draftCash, { type: 'remove', id: 'mode' })).fields.financing_mode,
    ).toBeUndefined();
  });
});

describe('toucher pour corriger', () => {
  const draft = draftFromProposal(arnaud);

  it('un texte, un nombre, le type : la valeur change, la pastille suit', () => {
    const named = editDraft(draft, { type: 'text', field: 'name', value: '  Famille Arnaud ' });
    expect(named.values.name).toBe('Famille Arnaud');
    const cheaper = editDraft(named, { type: 'number', field: 'budgetMax', value: 720_000 });
    expect(plain(chip(phraseChips(cheaper, arnaud), 'budgetMax').label)).toBe('Jusqu’à 720 000 €');
    const both = editDraft(cheaper, { type: 'types', value: ['apartment', 'house'] });
    expect(chip(phraseChips(both, arnaud), 'types').label).toBe('Appartement ou maison');
    // Le brouillon d'origine n'a pas bougé.
    expect(draft.values.name).toBe('M. et Mme Arnaud');
    expect(draft.values.budgetMax).toBe(750_000);
  });

  it('un champ vidé perd sa pastille ; le nom vidé redevient une question', () => {
    const noBudget = editDraft(draft, { type: 'number', field: 'budgetIdeal', value: null });
    expect(phraseChips(noBudget, arnaud).some((item) => item.id === 'budgetIdeal')).toBe(false);
    const noName = editDraft(draft, { type: 'text', field: 'name', value: '   ' });
    expect(chip(phraseChips(noName, arnaud), 'name').label).toBe('Son nom\u202f?');
    expect(draftMissing(noName)).toEqual(['son nom']);
    const noCity = editDraft(draft, { type: 'text', field: 'cities', value: '' });
    expect(draftMissing(noCity)).toEqual(['une commune']);
  });

  it('un équipement souhaité se dit indispensable, deux au plus ; et se retire', () => {
    const withPool = { ...draft, values: { ...draft.values, pool: true, parking: true } };
    const before = phraseChips(withPool, arnaud);
    expect(chip(before, 'pool').label).toBe('Piscine');
    expect(chip(before, 'pool').editor).toEqual({
      kind: 'wish',
      field: 'pool',
      starred: false,
      canStar: true,
    });
    const starred = editDraft(withPool, { type: 'star', star: 'pool', on: true });
    expect(starred.stars).toEqual(['outdoor', 'pool']);
    expect(chip(phraseChips(starred, arnaud), 'pool').label).toBe('Indispensable\u00a0: piscine');
    // Deux indispensables : un troisième ne s'ajoute pas, et l'écran ne l'offre pas.
    const third = editDraft(starred, { type: 'star', star: 'parking', on: true });
    expect(third.stars).toEqual(['outdoor', 'pool']);
    expect(chip(phraseChips(starred, arnaud), 'parking').editor).toMatchObject({ canStar: false });
    // Redevenu un simple souhait ; puis retiré : ni pastille, ni indispensable.
    const wish = editDraft(starred, { type: 'star', star: 'pool', on: false });
    expect(chip(phraseChips(wish, arnaud), 'pool').label).toBe('Piscine');
    const gone = editDraft(starred, { type: 'remove', id: 'pool' });
    expect(gone.values.pool).toBeUndefined();
    expect(gone.stars).toEqual(['outdoor']);
  });

  it('ce qui compte pour eux, le financement, un indispensable : « Retirer »', () => {
    const calm = editDraft(draft, { type: 'remove', id: 'soft:calme' });
    expect(calm.soft.map((soft) => soft.key)).not.toContain('calme');
    expect(editDraft(draft, { type: 'remove', id: 'financing' }).financing).toBeNull();
    const starred = { ...draft, stars: [...draft.stars, 'budget' as const] };
    expect(chip(phraseChips(starred, arnaud), 'star:budget').label).toBe(
      'Indispensable\u00a0: budget',
    );
    expect(editDraft(starred, { type: 'remove', id: 'star:budget' }).stars).toEqual(['outdoor']);
    // Une pastille inconnue ne change rien.
    expect(editDraft(draft, { type: 'remove', id: 'inconnue' })).toBe(draft);
  });
});

describe('« Trouver ses biens » : le formulaire de « Créer la fiche »', () => {
  const draft = draftFromProposal(arnaud);

  it('ce que la lecture a proposé part tel quel, chaque champ « À vérifier »', () => {
    const { fields, toVerify } = draftForm(draft);
    expect(fields.name).toBe('M. et Mme Arnaud');
    expect(fields.cities).toBe('Vence, Saint-Paul-de-Vence, Tourrettes-sur-Loup');
    expect(fields.budget_max).toBe('750000');
    expect(fields.property_types).toEqual(['house']);
    expect(fields.outdoor).toBe('yes');
    expect(fields.must_have).toEqual(['outdoor']);
    expect(fields.financing).toBe('validated');
    expect(JSON.parse(fields.soft_criteria as string)).toContainEqual({
      key: 'calme',
      words: 'AU CALME — pas de route',
    });
    expect(toVerify).toEqual(
      expect.arrayContaining(['name', 'cities', 'budget_max', 'must_have', 'soft_criteria']),
    );
  });

  it('aucune ligne des notes dans le formulaire (principe 2 de la M151)', () => {
    const text = JSON.stringify(draftForm(draft));
    for (const source of ['ARNAUD (M. et Mme)', '750 max', 'Jardin +++', 'accord banque OK']) {
      expect(text).not.toContain(source);
    }
  });

  it('un champ corrigé par le conseiller ne porte plus « À vérifier » ; les autres, si', () => {
    const edited = editDraft(
      editDraft(draft, { type: 'number', field: 'budgetMax', value: 720_000 }),
      { type: 'star', star: 'outdoor', on: false },
    );
    const { fields, toVerify } = draftForm(edited);
    expect(fields.budget_max).toBe('720000');
    expect(toVerify).not.toContain('budget_max');
    expect(toVerify).not.toContain('must_have');
    expect(fields.must_have).toBeUndefined();
    // L'extérieur reste un souhait.
    expect(fields.outdoor).toBe('yes');
    expect(toVerify).toEqual(expect.arrayContaining(['name', 'cities', 'budget_ideal']));
  });

  it('un champ retiré ne part pas', () => {
    const { fields, toVerify } = draftForm(editDraft(draft, { type: 'remove', id: 'phone' }));
    expect(fields.phone).toBeUndefined();
    expect(toVerify).not.toContain('phone');
  });
});

// La démo est le miroir du produit : une phrase d'avance dans l'écran, et sa lecture simulée.
describe('la phrase de la démo, et ce que sa lecture simulée en comprend', () => {
  const guarded = guardProposal(DEMO_PHRASE_OUTPUT);
  const proposal: NoteProposal = {
    ...guarded,
    communes: (guarded.values.cities ?? []).map((name) => ({
      read: name,
      status: 'official',
      name,
    })),
  };

  it('passe les gardes de la vraie lecture : l’indispensable est dit ferme dans la phrase', () => {
    expect(guarded.mustHave.map((star) => star.key)).toEqual(['outdoor']);
    expect(guarded.values.outdoor).toBe(true);
    expect(guarded.personalMentionsSkipped).toBe(0);
  });

  it('chaque ligne d’origine est dans la phrase, mot pour mot', () => {
    for (const { quote } of DEMO_PHRASE_OUTPUT.sources) {
      expect(DEMO_PHRASE_TEXT, quote).toContain(quote);
    }
    for (const soft of DEMO_PHRASE_OUTPUT.soft_criteria) {
      expect(DEMO_PHRASE_TEXT, soft.words).toContain(soft.words);
    }
  });

  it('ses pastilles, comme sur la maquette', () => {
    expect(labels(phraseChips(draftFromProposal(proposal), proposal))).toEqual([
      'M. et Mme Arnaud',
      'Maison',
      'Jusqu’à 750 000 €',
      '4 pièces et plus',
      '3 chambres et plus',
      'Au calme',
      'Sans vis-à-vis',
      'Vence, Saint-Paul-de-Vence, Tourrettes-sur-Loup',
      'Indispensable : extérieur',
    ]);
  });

  it('une phrase rend sa lecture ; les notes inventées et leur photo gardent la leur', () => {
    expect(demoNotesOutput('text', DEMO_PHRASE_TEXT)).toEqual(DEMO_PHRASE_OUTPUT);
    expect(demoNotesOutput('text', DEMO_NOTES_TEXT)).toEqual(DEMO_NOTES_OUTPUT);
    expect(demoNotesOutput('photo', null)).toBe(DEMO_NOTES_OUTPUT);
    expect(demoNotesOutput('file', null)).toBe(DEMO_NOTES_OUTPUT);
  });

  // Relecture du lot D — « d'après » ne cite jamais un mot absent de ce qui a été tapé.
  it('un autre texte : aucune ligne d’origine inventée, et donc aucun indispensable', () => {
    const other = demoNotesOutput('text', 'Une autre phrase, sans rien de particulier.');
    expect(other.sources).toEqual([]);
    expect(other.soft_criteria).toEqual([]);
    const guardedOther = guardProposal(other);
    expect(guardedOther.mustHave).toEqual([]);
    expect(guardedOther.sources).toEqual({});
  });

  it('rien d’elle ne dit « démo », aucun téléphone, aucune adresse', () => {
    expect(DEMO_PHRASE_TEXT).not.toMatch(/d[ée]mo|\d{2} \d{2} \d{2}|rue|avenue|chemin/i);
  });
});

// Relecture du lot D — ce que la lecture des notes disait des communes (M151) et des ★ (M132)
// tient sur les pastilles ; « À vérifier » ne tombe que sur un champ retapé.
describe('relecture du lot D', () => {
  const draft = draftFromProposal(arnaud);

  it('une commune non vérifiée se dit, en pointillé ; une commune corrigée dit ce qui a été lu', () => {
    const proposal: NoteProposal = {
      ...arnaud,
      values: { ...arnaud.values, cities: ['Vence', 'Tourrettes-sur-Loup'] },
      communes: [
        { read: 'Vence', status: 'unverified', name: 'Vence' },
        { read: 'Tourettes', status: 'corrected', name: 'Tourrettes-sur-Loup' },
      ],
    };
    const cities = chip(phraseChips(draftFromProposal(proposal), proposal), 'cities');
    expect(cities.tone).toBe('missing');
    expect(cities.label).toBe('Vence, Tourrettes-sur-Loup\u00a0: à vérifier');
    expect(cities.hint).toContain('Tourrettes-sur-Loup\u00a0: lu «\u00a0Tourettes\u00a0»');
    expect(cities.hint).toContain('«\u00a0Vence\u00a0»\u00a0: commune non vérifiée');
    // Retapées par le conseiller : plus rien à dire.
    const fixed = editDraft(draftFromProposal(proposal), {
      type: 'text',
      field: 'cities',
      value: 'Vence, Tourrettes-sur-Loup',
    });
    const after = chip(phraseChips(fixed, proposal), 'cities');
    expect(after.tone).toBe('plain');
    expect(after.hint).toBeUndefined();
  });

  it('le plafond retiré ou vidé emporte la ★ du budget (M132) ; les communes vidées, la leur', () => {
    const starred = { ...draft, stars: ['budget', 'cities'] as typeof draft.stars };
    expect(editDraft(starred, { type: 'remove', id: 'budgetMax' }).stars).toEqual(['cities']);
    expect(editDraft(starred, { type: 'number', field: 'budgetMax', value: null }).stars).toEqual([
      'cities',
    ]);
    expect(
      editDraft(starred, { type: 'number', field: 'budgetMax', value: 700_000 }).stars,
    ).toEqual(['budget', 'cities']);
    expect(editDraft(starred, { type: 'text', field: 'cities', value: ' ' }).stars).toEqual([
      'budget',
    ]);
    // Jamais une ★ sur le budget sans plafond dans le formulaire.
    const { fields } = draftForm(editDraft(starred, { type: 'remove', id: 'budgetMax' }));
    expect(fields.budget_max).toBeUndefined();
    expect(fields.must_have).toEqual(['cities']);
  });

  it('dire ou retirer une ★, retirer un souhait : ce que la lecture a proposé reste « À vérifier »', () => {
    const withPool = { ...draft, values: { ...draft.values, pool: true } };
    const starred = editDraft(withPool, { type: 'star', star: 'pool', on: true });
    expect(draftForm(starred).toVerify).toContain('must_have');
    const lessSoft = editDraft(draft, { type: 'remove', id: 'soft:calme' });
    expect(draftForm(lessSoft).toVerify).toContain('soft_criteria');
    // « Commune à préciser » ne se retire pas : rien ne change.
    expect(editDraft(draft, { type: 'remove', id: 'cities:unknown' })).toBe(draft);
  });

  it('la trace compte les champs gardés, corrigés compris', () => {
    const edited = editDraft(draft, { type: 'number', field: 'budgetMax', value: 720_000 });
    const { toVerify, kept } = draftForm(edited);
    expect(toVerify).not.toContain('budget_max');
    expect(kept).toContain('budget_max');
    expect(kept).toEqual(expect.arrayContaining(toVerify));
  });

  it('« 1er étage », une surface comme partout ailleurs (M74)', () => {
    const values = { ...draft.values, floorMin: 1, surfaceMin: 120 };
    const chips = phraseChips({ ...draft, values }, arnaud);
    expect(chip(chips, 'floorMin').label).toBe('1er étage et plus');
    expect(plain(chip(chips, 'surfaceMin').label)).toBe('120 m² et plus');
  });
});
