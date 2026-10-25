import type { BuyerDeck } from '@/features/buyer-deck/types';

// Un déroulé figé, relu de la base : écrit par le serveur seul (`finish_buyer_presentation`), il
// est repris tel quel ; une forme inattendue vaut « pas de déroulé figé ».
export function storedDeck(value: unknown): BuyerDeck | null {
  if (typeof value !== 'object' || value == null) return null;
  const deck = value as Partial<BuyerDeck>;
  return Array.isArray(deck.items) && Array.isArray(deck.criteria) && typeof deck.words === 'string'
    ? (deck as BuyerDeck)
    : null;
}

// Mission 122 (décisions de Jean-Guy, 25/10) — le déroulé que montre la présentation. Terminée,
// elle se relit TELLE QU'ELLE A ÉTÉ AFFICHÉE : rien ne se recalcule, sauf les photos d'un bien de
// l'agence, dont les liens sont signés pour une heure (M37) ; les photos d'une annonce ou d'un
// concurrent restent celles du déroulé figé. Une présentation terminée avant la mission n'a pas
// de déroulé figé : elle se recalcule, faute de mieux. Avant « Terminer », le calcul du moment.
export function deckForReading(input: {
  presentedAt: string | null;
  presentedDeck: unknown;
  computed: BuyerDeck;
}): BuyerDeck {
  const frozen = input.presentedAt ? storedDeck(input.presentedDeck) : null;
  if (!frozen) return input.computed;
  const fresh = new Map(input.computed.items.map((item) => [item.item.itemId, item]));
  return {
    ...frozen,
    presentedAt: input.presentedAt,
    items: frozen.items.map((item) => {
      const now = fresh.get(item.item.itemId);
      return item.item.source === 'project' && now
        ? { ...item, photos: now.photos, item: { ...item.item, photos: now.item.photos } }
        : item;
    }),
  };
}
