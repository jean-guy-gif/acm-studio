import { clientTexts, type TextLanguage } from '@/lib/client-texts';
// Mission 127 — les jours de commercialisation d'un concurrent à une date donnée : depuis la date
// de publication quand elle est connue, sinon les jours lus à l'import plus les jours écoulés
// depuis l'import — alors « environ » (la date de publication n'est qu'une borne, M47). Pur.

export type DaysOnMarket = { days: number; approximate: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

const dayOf = (value: string | Date): number | null => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS,
  );
};

export function daysOnMarketAt(
  row: {
    listing_published_at: string | null;
    days_on_market: number | null;
    created_at: string;
  },
  at: string | Date,
): DaysOnMarket | null {
  const atDay = dayOf(at);
  if (atDay == null) return null;
  if (row.listing_published_at) {
    const published = dayOf(row.listing_published_at);
    if (published != null) return { days: Math.max(0, atDay - published), approximate: false };
  }
  if (row.days_on_market != null) {
    const created = dayOf(row.created_at) ?? atDay;
    return {
      days: Math.max(0, row.days_on_market + Math.max(0, atDay - created)),
      approximate: true,
    };
  }
  return null;
}

// « depuis 142 jours », « depuis environ 160 jours ». Mission 140 — dans la langue du vendeur.
export function daysLabel(value: DaysOnMarket, language: TextLanguage = 'fr'): string {
  return clientTexts(language).documents.marketUpdate.days(value.days, value.approximate);
}
