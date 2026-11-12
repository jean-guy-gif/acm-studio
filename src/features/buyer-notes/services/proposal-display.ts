import { BUYER_LANGUAGE_LABELS } from '@/features/buyer-messages/languages';
import {
  BUYER_PURPOSE_LABELS,
  BUYER_TIMELINE_LABELS,
  type BuyerPropertyType,
} from '@/features/buyers/types';
import type { NoteField, NoteProposal, NoteValues } from '@/features/buyer-notes/types';
import { formatEuro } from '@/lib/format';

// Mission 151 — les cartes de la fiche proposée (planche 2, validée le 10/11 puis le 12/11), dans
// l'ordre de la planche : « Qui », puis « Ce qu'ils cherchent ». Une carte peut porter deux champs
// (le budget idéal et le plafond ; les pièces et les chambres). Pur.

export type ProposalCard = {
  id: string;
  section: 'qui' | 'cherche';
  label: string;
  fields: NoteField[];
  // Toujours montrée, même vide (« — ») : les champs de base de la planche.
  always: boolean;
};

export const PROPOSAL_CARDS: ProposalCard[] = [
  { id: 'name', section: 'qui', label: 'Nom', fields: ['name'], always: true },
  { id: 'phone', section: 'qui', label: 'Téléphone', fields: ['phone'], always: true },
  { id: 'email', section: 'qui', label: 'E-mail', fields: ['email'], always: true },
  { id: 'purpose', section: 'qui', label: 'Projet', fields: ['purpose'], always: false },
  { id: 'timeline', section: 'qui', label: 'Délai', fields: ['timeline'], always: false },
  {
    id: 'language',
    section: 'qui',
    label: 'Langue de ses messages',
    fields: ['language'],
    always: false,
  },
  { id: 'types', section: 'cherche', label: 'Type', fields: ['propertyTypes'], always: true },
  { id: 'cities', section: 'cherche', label: 'Communes', fields: ['cities'], always: true },
  {
    id: 'budget',
    section: 'cherche',
    label: 'Budget',
    fields: ['budgetIdeal', 'budgetMax'],
    always: true,
  },
  {
    id: 'rooms',
    section: 'cherche',
    label: 'Pièces · chambres',
    fields: ['roomsMin', 'bedroomsMin'],
    always: true,
  },
  { id: 'surface', section: 'cherche', label: 'Surface', fields: ['surfaceMin'], always: false },
  { id: 'outdoor', section: 'cherche', label: 'Extérieur', fields: ['outdoor'], always: true },
  { id: 'parking', section: 'cherche', label: 'Parking', fields: ['parking'], always: false },
  { id: 'pool', section: 'cherche', label: 'Piscine', fields: ['pool'], always: true },
  { id: 'floor', section: 'cherche', label: 'Étage', fields: ['floorMin'], always: false },
  { id: 'elevator', section: 'cherche', label: 'Ascenseur', fields: ['elevator'], always: false },
  { id: 'energy', section: 'cherche', label: 'DPE', fields: ['energyRatingMax'], always: false },
  {
    id: 'works',
    section: 'cherche',
    label: 'Travaux acceptés',
    fields: ['worksAccepted'],
    always: false,
  },
  {
    id: 'condominium',
    section: 'cherche',
    label: 'Copropriété acceptée',
    fields: ['condominiumAccepted'],
    always: true,
  },
  { id: 'notes', section: 'cherche', label: 'Notes', fields: ['notes'], always: true },
];

const TYPE_WORDS: Record<BuyerPropertyType, string> = { apartment: 'Appartement', house: 'Maison' };

function fieldText(field: NoteField, value: NoteValues[NoteField]): string {
  switch (field) {
    case 'purpose':
      return BUYER_PURPOSE_LABELS[value as NoteValues['purpose']];
    case 'timeline':
      return BUYER_TIMELINE_LABELS[value as NoteValues['timeline']];
    case 'language':
      return BUYER_LANGUAGE_LABELS[value as NoteValues['language']];
    case 'propertyTypes':
      return (value as BuyerPropertyType[]).map((type) => TYPE_WORDS[type]).join(' ou ');
    case 'cities':
      return (value as string[]).join(' · ');
    case 'surfaceMin':
      return `${value} m² au moins`;
    case 'floorMin':
      return value === 0 ? 'Rez-de-chaussée accepté' : `${value}e étage au moins`;
    case 'energyRatingMax':
      return `${value} ou mieux`;
    default:
      if (value === true) return 'Oui';
      if (value === false) return 'Non';
      return String(value);
  }
}

// Le texte d'une carte, ou null si rien n'est proposé pour elle.
export function cardText(card: ProposalCard, values: Partial<NoteValues>): string | null {
  if (card.id === 'budget') {
    const ideal = values.budgetIdeal;
    const max = values.budgetMax;
    if (ideal == null && max == null) return null;
    return [
      ideal != null ? `idéal ${formatEuro(ideal)}` : null,
      max != null ? `plafond ${formatEuro(max)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (card.id === 'rooms') {
    const rooms = values.roomsMin;
    const bedrooms = values.bedroomsMin;
    if (rooms == null && bedrooms == null) return null;
    return [
      rooms != null ? `${rooms} pièce${rooms > 1 ? 's' : ''}` : null,
      bedrooms != null ? `${bedrooms} chambre${bedrooms > 1 ? 's' : ''} au moins` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  const [field] = card.fields;
  const value = values[field];
  return value === undefined ? null : fieldText(field, value);
}

// La ligne des notes d'où vient la carte : la première de ses champs.
export function cardSource(
  card: ProposalCard,
  proposal: Pick<NoteProposal, 'sources'>,
): string | null {
  for (const field of card.fields) {
    const line = proposal.sources[field];
    if (line) return line;
  }
  return null;
}

// Le texte d'une valeur de la fiche d'avant, pour « 650 000 € → 750 000 € » (complément).
export function beforeText(card: ProposalCard, before: Partial<NoteValues>): string | null {
  return cardText(card, before);
}
