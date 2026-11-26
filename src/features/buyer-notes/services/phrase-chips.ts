import { BUYER_LANGUAGE_LABELS } from '@/features/buyer-messages/languages';
import { NOTE_STAR_LABELS, NOTE_STARS_MAX } from '@/features/buyer-notes/note-stars';
import { NOTE_FORM_FIELDS, proposalForm } from '@/features/buyer-notes/services/proposal-form';
import type { NoteField, NoteProposal, NoteStar, NoteValues } from '@/features/buyer-notes/types';
import {
  BUYER_CRITERION_LABELS,
  BUYER_PURPOSE_LABELS,
  BUYER_SOFT_CRITERION_LABELS,
  BUYER_TIMELINE_LABELS,
  type BuyerPropertyType,
  type BuyerSoftCriterionKey,
} from '@/features/buyers/types';
import { formatEuro } from '@/lib/format';

// La refonte, lot D (maquette REFONTE-2) — « Nouvel acquéreur par une phrase » : ce que la lecture
// des notes a compris (M151, la même lecture, les mêmes gardes), en pastilles que le conseiller
// touche pour corriger. Ici, la proposition devient un brouillon, ses pastilles, ses corrections,
// puis le formulaire que « Trouver ses biens » envoie — celui de « Créer la fiche » (M151), relu au
// serveur comme toute fiche. Pur. Rien de lu n'est gardé : les lignes des notes ne servent qu'à
// l'écran.

export type PhraseDraft = {
  values: Partial<NoteValues>;
  // Ses indispensables (★), deux au plus.
  stars: NoteStar[];
  // « Ce qui compte pour eux », avec leurs mots.
  soft: { key: BuyerSoftCriterionKey; words: string }[];
  financing: 'validated' | 'in_progress' | null;
  // « Achat comptant : à vérifier » — proposé, pas encore tranché par le conseiller.
  cash: boolean;
  // Les champs du formulaire que le conseiller a corrigés lui-même : ils ne portent plus
  // « À vérifier » (M97).
  touched: string[];
};

const WISHES = ['outdoor', 'parking', 'pool', 'elevator'] as const;
export type WishField = (typeof WISHES)[number];
const isWish = (key: string): key is WishField => (WISHES as readonly string[]).includes(key);

export function draftFromProposal(
  proposal: Pick<
    NoteProposal,
    'values' | 'mustHave' | 'softCriteria' | 'financing' | 'cashSuggestion'
  >,
): PhraseDraft {
  return {
    values: { ...proposal.values },
    stars: proposal.mustHave.map((star) => star.key).slice(0, NOTE_STARS_MAX),
    soft: proposal.softCriteria.map((soft) => ({ key: soft.key, words: soft.words })),
    financing: proposal.financing,
    cash: proposal.cashSuggestion && proposal.financing == null,
    touched: [],
  };
}

// Comment une pastille se corrige.
export type ChipEditor =
  | { kind: 'text'; field: 'name' | 'phone' | 'email' | 'cities' | 'notes'; value: string }
  | {
      kind: 'number';
      field: 'budgetMax' | 'budgetIdeal' | 'roomsMin' | 'bedroomsMin' | 'surfaceMin' | 'floorMin';
      value: number | null;
      unit: string;
    }
  | { kind: 'types'; value: BuyerPropertyType[] }
  // Un équipement souhaité : le dire indispensable, ou le retirer.
  | { kind: 'wish'; field: WishField; starred: boolean; canStar: boolean }
  // Un indispensable qui n'est pas un équipement (les communes, le budget, pas de copropriété).
  | { kind: 'star'; star: NoteStar }
  | { kind: 'cash' }
  // Seulement « Retirer » : le reste se complète sur la fiche.
  | { kind: 'plain' };

export type ChipTone = 'plain' | 'soft' | 'must' | 'missing';

export type PhraseChip = {
  id: string;
  tone: ChipTone;
  label: string;
  // Ce que la pastille corrige, en un mot (le titre de sa correction).
  title: string;
  // La ligne des notes d'où elle vient : montrée à la correction, jamais gardée.
  source: string | null;
  editor: ChipEditor;
  // Ce qui est à dire avant de corriger (une commune non reconnue).
  hint?: string;
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

const TYPE_WORDS: Record<BuyerPropertyType, string> = { apartment: 'Appartement', house: 'Maison' };

const NO_WISH: Record<WishField, string> = {
  outdoor: 'Sans extérieur',
  parking: 'Sans parking',
  pool: 'Sans piscine',
  elevator: 'Sans ascenseur',
};

const shorten = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

// « Indispensable : piscine ».
const starLabel = (star: NoteStar): string =>
  `Indispensable : ${NOTE_STAR_LABELS[star].charAt(0).toLowerCase()}${NOTE_STAR_LABELS[star].slice(1)}`;

// Les pastilles, dans l'ordre de l'écran : qui, ce qu'il cherche, ce qui compte pour eux, ses
// communes, ses indispensables, puis le reste. Une pastille orange « Son nom ? », « Sa commune ? »
// tient la place de ce qui manque pour créer la fiche (M117).
export function phraseChips(
  draft: PhraseDraft,
  proposal: Pick<NoteProposal, 'sources' | 'mustHave' | 'softCriteria' | 'communes'> & {
    financingSource: string | null;
  },
): PhraseChip[] {
  const { values } = draft;
  const chips: PhraseChip[] = [];
  const sourceOf = (field: NoteField) => proposal.sources[field] ?? null;
  const starSource = (star: NoteStar) =>
    proposal.mustHave.find((item) => item.key === star)?.source || null;
  const canStar = draft.stars.length < NOTE_STARS_MAX;

  chips.push(
    values.name
      ? {
          id: 'name',
          tone: 'plain',
          label: values.name,
          title: 'Son nom',
          source: sourceOf('name'),
          editor: { kind: 'text', field: 'name', value: values.name },
        }
      : {
          id: 'name',
          tone: 'missing',
          label: 'Son nom ?',
          title: 'Son nom',
          source: null,
          editor: { kind: 'text', field: 'name', value: '' },
        },
  );
  if (values.propertyTypes && values.propertyTypes.length > 0) {
    chips.push({
      id: 'types',
      tone: 'plain',
      label: values.propertyTypes
        .map((type, index) => (index === 0 ? TYPE_WORDS[type] : TYPE_WORDS[type].toLowerCase()))
        .join(' ou '),
      title: BUYER_CRITERION_LABELS.property_types,
      source: sourceOf('propertyTypes'),
      editor: { kind: 'types', value: values.propertyTypes },
    });
  }
  const numberChip = (
    field: Extract<ChipEditor, { kind: 'number' }>['field'],
    label: string,
    title: string,
    unit: string,
  ) => {
    const value = values[field];
    if (value == null) return;
    chips.push({
      id: field,
      tone: 'plain',
      label,
      title,
      source: sourceOf(field),
      editor: { kind: 'number', field, value, unit },
    });
  };
  if (values.budgetMax != null) {
    numberChip('budgetMax', `Jusqu’à ${formatEuro(values.budgetMax)}`, 'Budget maximum', '€');
  }
  if (values.budgetIdeal != null) {
    numberChip('budgetIdeal', `Idéal : ${formatEuro(values.budgetIdeal)}`, 'Budget idéal', '€');
  }
  if (values.roomsMin != null) {
    numberChip(
      'roomsMin',
      `${plural(values.roomsMin, 'pièce', 'pièces')} et plus`,
      'Pièces, au moins',
      'pièces',
    );
  }
  if (values.bedroomsMin != null) {
    numberChip(
      'bedroomsMin',
      `${plural(values.bedroomsMin, 'chambre', 'chambres')} et plus`,
      'Chambres, au moins',
      'chambres',
    );
  }
  if (values.surfaceMin != null) {
    numberChip('surfaceMin', `${values.surfaceMin} m² et plus`, 'Surface, au moins', 'm²');
  }
  for (const soft of draft.soft) {
    chips.push({
      id: `soft:${soft.key}`,
      tone: 'soft',
      label: BUYER_SOFT_CRITERION_LABELS[soft.key],
      title: 'Ce qui compte pour eux',
      source: soft.words || null,
      editor: { kind: 'plain' },
    });
  }
  const unknown = proposal.communes.filter(
    (check) => check.status === 'unknown' || check.status === 'ambiguous',
  );
  const unknownHint =
    unknown.length > 0 && !draft.touched.includes('cities')
      ? `${unknown.map((check) => `« ${check.read} »`).join(', ')} : commune non reconnue. Saisissez-la.`
      : undefined;
  if (values.cities && values.cities.length > 0) {
    chips.push({
      id: 'cities',
      tone: 'plain',
      label: values.cities.join(', '),
      title: BUYER_CRITERION_LABELS.cities,
      source: sourceOf('cities'),
      editor: { kind: 'text', field: 'cities', value: values.cities.join(', ') },
      ...(unknownHint ? { hint: unknownHint } : {}),
    });
    if (unknownHint) {
      chips.push({
        id: 'cities:unknown',
        tone: 'missing',
        label: `Commune à préciser : ${unknown.map((check) => check.read).join(', ')}`,
        title: BUYER_CRITERION_LABELS.cities,
        source: sourceOf('cities'),
        editor: { kind: 'text', field: 'cities', value: values.cities.join(', ') },
        hint: unknownHint,
      });
    }
  } else {
    chips.push({
      id: 'cities',
      tone: 'missing',
      label: 'Sa commune ?',
      title: BUYER_CRITERION_LABELS.cities,
      source: sourceOf('cities'),
      editor: { kind: 'text', field: 'cities', value: '' },
      ...(unknownHint ? { hint: unknownHint } : {}),
    });
  }
  for (const field of WISHES) {
    const value = values[field];
    if (value == null) continue;
    const starred = value === true && draft.stars.includes(field);
    chips.push(
      value
        ? {
            id: field,
            tone: starred ? 'must' : 'plain',
            label: starred ? starLabel(field) : BUYER_CRITERION_LABELS[field],
            title: BUYER_CRITERION_LABELS[field],
            source: (starred ? starSource(field) : null) ?? sourceOf(field),
            editor: { kind: 'wish', field, starred, canStar: starred || canStar },
          }
        : {
            id: field,
            tone: 'plain',
            label: NO_WISH[field],
            title: BUYER_CRITERION_LABELS[field],
            source: sourceOf(field),
            editor: { kind: 'plain' },
          },
    );
  }
  for (const star of draft.stars) {
    if (isWish(star)) continue;
    chips.push({
      id: `star:${star}`,
      tone: 'must',
      label: starLabel(star),
      title: 'Indispensable',
      source: starSource(star),
      editor: { kind: 'star', star },
    });
  }
  if (values.floorMin != null) {
    numberChip(
      'floorMin',
      values.floorMin === 0 ? 'Rez-de-chaussée accepté' : `${values.floorMin}e étage et plus`,
      'Étage, au moins',
      'étage',
    );
  }
  const plainChip = (id: NoteField, label: string, title: string) =>
    chips.push({
      id,
      tone: 'plain',
      label,
      title,
      source: sourceOf(id),
      editor: { kind: 'plain' },
    });
  if (values.energyRatingMax) {
    plainChip('energyRatingMax', `DPE ${values.energyRatingMax} ou mieux`, 'DPE');
  }
  if (values.worksAccepted != null) {
    plainChip(
      'worksAccepted',
      values.worksAccepted ? 'Travaux acceptés' : 'Sans travaux',
      BUYER_CRITERION_LABELS.works,
    );
  }
  if (values.condominiumAccepted != null && !draft.stars.includes('condominium')) {
    plainChip(
      'condominiumAccepted',
      values.condominiumAccepted ? 'Copropriété acceptée' : 'Pas de copropriété',
      'Copropriété',
    );
  }
  if (draft.financing) {
    chips.push({
      id: 'financing',
      tone: 'plain',
      label: draft.financing === 'validated' ? 'Financement validé' : 'Financement en cours',
      title: 'Financement',
      source: proposal.financingSource,
      editor: { kind: 'plain' },
    });
  } else if (draft.cash) {
    chips.push({
      id: 'cash',
      tone: 'missing',
      label: 'Achat comptant : à vérifier',
      title: 'Financement',
      source: proposal.financingSource,
      editor: { kind: 'cash' },
    });
  }
  if (values.purpose) plainChip('purpose', BUYER_PURPOSE_LABELS[values.purpose], 'Projet');
  if (values.timeline) plainChip('timeline', BUYER_TIMELINE_LABELS[values.timeline], 'Délai');
  if (values.language) {
    plainChip(
      'language',
      `Messages : ${BUYER_LANGUAGE_LABELS[values.language].toLowerCase()}`,
      'Langue de ses messages',
    );
  }
  for (const field of ['phone', 'email', 'notes'] as const) {
    const value = values[field];
    if (!value) continue;
    chips.push({
      id: field,
      tone: 'plain',
      label: field === 'notes' ? `Note : ${shorten(value, 48)}` : value,
      title: field === 'phone' ? 'Téléphone' : field === 'email' ? 'E-mail' : 'Notes',
      source: sourceOf(field),
      editor: { kind: 'text', field, value },
    });
  }
  return chips;
}

export type PhraseEdit =
  | { type: 'text'; field: Extract<ChipEditor, { kind: 'text' }>['field']; value: string }
  | {
      type: 'number';
      field: Extract<ChipEditor, { kind: 'number' }>['field'];
      value: number | null;
    }
  | { type: 'types'; value: BuyerPropertyType[] }
  // Dire un équipement, les communes, le budget ou « pas de copropriété » indispensable, ou non.
  | { type: 'star'; star: NoteStar; on: boolean }
  // « Achat comptant » : noté « Financement validé » par le conseiller.
  | { type: 'cash' }
  // Retirer la pastille (son identifiant).
  | { type: 'remove'; id: string };

const touch = (draft: PhraseDraft, ...names: string[]): string[] => [
  ...new Set([...draft.touched, ...names]),
];

// Une correction du conseiller. Le brouillon rendu est neuf ; une correction sans objet le rend
// tel quel.
export function editDraft(draft: PhraseDraft, edit: PhraseEdit): PhraseDraft {
  const values = { ...draft.values };
  switch (edit.type) {
    case 'text': {
      const text = edit.value.trim();
      if (edit.field === 'cities') {
        const cities = [
          ...new Set(
            text
              .split(/[,;\n]/)
              .map((city) => city.trim())
              .filter(Boolean),
          ),
        ];
        if (cities.length > 0) values.cities = cities;
        else delete values.cities;
      } else if (text) values[edit.field] = text;
      else delete values[edit.field];
      return { ...draft, values, touched: touch(draft, NOTE_FORM_FIELDS[edit.field]) };
    }
    case 'number': {
      if (edit.value == null || !Number.isFinite(edit.value) || edit.value < 0) {
        delete values[edit.field];
      } else values[edit.field] = Math.round(edit.value);
      return { ...draft, values, touched: touch(draft, NOTE_FORM_FIELDS[edit.field]) };
    }
    case 'types': {
      const types = [...new Set(edit.value)];
      if (types.length > 0) values.propertyTypes = types;
      else delete values.propertyTypes;
      return { ...draft, values, touched: touch(draft, NOTE_FORM_FIELDS.propertyTypes) };
    }
    case 'star': {
      const has = draft.stars.includes(edit.star);
      if (edit.on === has) return draft;
      if (edit.on && draft.stars.length >= NOTE_STARS_MAX) return draft;
      // Un équipement indispensable est un équipement voulu (M132).
      if (edit.on && isWish(edit.star)) values[edit.star] = true;
      return {
        ...draft,
        values,
        stars: edit.on ? [...draft.stars, edit.star] : draft.stars.filter((s) => s !== edit.star),
        touched: touch(draft, 'must_have', 'condominium_must_have'),
      };
    }
    case 'cash':
      return { ...draft, financing: 'validated', cash: false, touched: touch(draft, 'financing') };
    case 'remove': {
      if (edit.id.startsWith('soft:')) {
        const key = edit.id.slice('soft:'.length);
        return {
          ...draft,
          soft: draft.soft.filter((soft) => soft.key !== key),
          touched: touch(draft, 'soft_criteria'),
        };
      }
      if (edit.id.startsWith('star:')) {
        const star = edit.id.slice('star:'.length);
        return {
          ...draft,
          stars: draft.stars.filter((item) => item !== star),
          touched: touch(draft, 'must_have', 'condominium_must_have'),
        };
      }
      if (edit.id === 'financing' || edit.id === 'cash') {
        return { ...draft, financing: null, cash: false };
      }
      if (edit.id === 'cities:unknown') return { ...draft, touched: touch(draft, 'cities') };
      if (!(edit.id in NOTE_FORM_FIELDS)) return draft;
      const field = edit.id as NoteField;
      delete values[field];
      return {
        ...draft,
        values,
        // Un équipement retiré n'est plus indispensable.
        stars: draft.stars.filter((star) => star !== field),
      };
    }
  }
}

// Ce qui manque pour créer la fiche (M117) : son nom, au moins une commune.
export function draftMissing(draft: PhraseDraft): string[] {
  return [
    draft.values.name?.trim() ? null : 'son nom',
    draft.values.cities && draft.values.cities.length > 0 ? null : 'une commune',
  ].filter((part): part is string => part != null);
}

// Le formulaire de « Trouver ses biens » : celui de « Créer la fiche » (M151), avec ce que le
// conseiller a gardé ou corrigé. Un champ qu'il a corrigé lui-même ne porte plus « À vérifier »
// (M97) ; les autres le portent, comme après toute lecture.
export function draftForm(draft: PhraseDraft): {
  fields: Record<string, string | string[]>;
  toVerify: string[];
} {
  const { fields, toVerify } = proposalForm(
    {
      values: draft.values,
      sources: {},
      mustHave: draft.stars.map((key) => ({ key, source: '' })),
      financing: draft.financing,
      cashSuggestion: false,
      financingSource: null,
      softCriteria: draft.soft.map((soft) => ({ ...soft, source: null })),
      personalMentionsSkipped: 0,
    },
    null,
    {
      kept: new Set(Object.keys(draft.values) as NoteField[]),
      starsKept: true,
      softKept: true,
      cashValidated: false,
    },
  );
  const touched = new Set(draft.touched);
  return { fields, toVerify: toVerify.filter((name) => !touched.has(name)) };
}
