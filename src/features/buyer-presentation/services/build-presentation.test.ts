import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  allowedItem,
  criteriaLines,
  itemFacts,
  whyItMatches,
} from '@/features/buyer-presentation/services/build-presentation';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import type { BuyerInput } from '@/features/buyers/types';

const buyer: BuyerInput = {
  name: 'Famille Keller',
  phone: null,
  email: null,
  purpose: 'secondary',
  timeline: 'now',
  notes: 'NOTE-SECRETE du conseiller',
  propertyTypes: ['house'],
  cities: ['Mougins', 'Valbonne'],
  budgetIdeal: 1_500_000,
  budgetMax: 1_650_000,
  roomsMin: 6,
  bedroomsMin: 4,
  surfaceMin: 180,
  outdoor: true,
  parking: true,
  pool: true,
  floorMin: null,
  elevator: null,
  energyRatingMax: 'D',
  worksAccepted: false,
  mustHave: ['pool', 'cities', 'budget'],
  dealBreakers: 'Route passante',
};

const item = (over: Partial<PresentedItemInput> = {}): PresentedItemInput => ({
  itemId: 'i1',
  position: 1,
  source: 'listing',
  category: 'compromise',
  label: 'Maison · 7 pièces · 210 m² · Mougins',
  city: 'Mougins',
  district: 'Les Bréguières',
  price: 1_639_500,
  priceSeenOn: '2026-10-24',
  surfaceArea: 210,
  roomsCount: 7,
  bedroomsCount: 4,
  outdoor: ['terrace', 'garden'],
  parking: ['garage'],
  energyRating: 'C',
  photos: ['https://photos.example/1.jpg'],
  gaps: ['Pas de piscine'],
  propertyType: 'house',
  floor: null,
  hasPool: false,
  hasElevator: null,
  condition: null,
  listedSince: null,
  priceDrop: null,
  ...over,
});

const plain = (value: unknown): string => JSON.stringify(value).replace(/[  ]/g, ' ');

// Mission 119 — ce que la présentation (M122 : le déroulé) et le dossier (M119 B) partagent : les
// mots de la fiche, « Pourquoi » depuis ses indispensables, les faits d'un bien, et la liste
// d'autorisation appliquée.
describe('les biens présentés à l’acquéreur', () => {
  it('les faits d’un bien, dans l’ordre', () => {
    const facts = itemFacts(item());
    expect(facts.map((fact) => fact.label)).toEqual([
      'Surface',
      'Pièces',
      'Chambres',
      'Extérieur',
      'Parking',
      'DPE',
    ]);
    expect(facts.find((fact) => fact.label === 'Extérieur')?.value).toBe('Terrasse, Jardin');
    expect(
      itemFacts(item({ outdoor: ['none'], parking: [] })).find((fact) => fact.label === 'Extérieur')
        ?.value,
    ).toBe('Aucun');
    expect(itemFacts(item({ outdoor: [], parking: [] })).map((fact) => fact.label)).not.toContain(
      'Parking',
    );
  });

  it('« Votre recherche » reprend les mots de la fiche ; « Pourquoi » ne garde que les indispensables non contredits', () => {
    expect(plain(criteriaLines(buyer))).toContain('Communes : Mougins, Valbonne');
    expect(plain(criteriaLines(buyer))).toContain('Budget : jusqu’à 1 650 000 €');
    expect(criteriaLines(buyer)).toContain('Une piscine');
    expect(criteriaLines(buyer)).toContain('Sans travaux');
    // La piscine est un écart (« Pas de piscine ») : elle ne figure pas dans « Pourquoi ».
    const why = whyItMatches(buyer, item());
    expect(plain(why)).toContain('Communes : Mougins, Valbonne');
    expect(plain(why)).toContain('Budget : jusqu’à 1 650 000 €');
    expect(why.some((line) => /piscine/i.test(line))).toBe(false);
    // Un « À vérifier : Piscine » (bien à explorer) l'écarte aussi de « Pourquoi ».
    expect(
      whyItMatches(buyer, item({ gaps: ['À vérifier : Piscine'] })).some((line) =>
        /piscine/i.test(line),
      ),
    ).toBe(false);
  });

  it('la liste d’autorisation est appliquée : un titre piège, une adresse, un lien, un vendeur ne sortent pas', () => {
    // Le type d'entrée n'a pas de place pour un titre, une adresse, un lien, un vendeur : un
    // appelant qui les passerait quand même ne les verrait pas sortir.
    const trap = {
      ...item(),
      title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
      listingUrl: 'https://www.seloger.com/annonces/piege.htm',
      address: '12 rue des Lilas',
      soldBy: 'agency',
      exclusivity: 'yes',
      advisorPriceMin: 1,
      commercializationPrice: 2,
    } as unknown as PresentedItemInput;
    const spiked = JSON.stringify(allowedItem(trap));
    expect(spiked).toContain('Maison · 7 pièces');
    for (const leak of [
      'EXCLUSIVITÉ Agence Dupont',
      'rue des Lilas',
      'piege.htm',
      'soldBy',
      'exclusivity',
      'advisorPriceMin',
      'commercializationPrice',
      'title',
      'listingUrl',
      'address',
    ]) {
      expect(spiked).not.toContain(leak);
    }
  });

  it('le code de la présentation ne lit ni titre, ni adresse, ni lien, ni vendeur, ni exclusivité, ni fourchette, ni prix convenu, ni « estimation », ni « disponible »', () => {
    const dir = join(process.cwd(), 'src', 'features', 'buyer-presentation');
    const deck = join(process.cwd(), 'src', 'features', 'buyer-deck');
    const files = (path: string): string[] =>
      readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? files(join(path, entry.name))
          : /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)
            ? [join(path, entry.name)]
            : [],
      );
    // Mission 122 — la scène est désormais le déroulé : ses composants et ses services.
    const scene = [
      ...files(join(deck, 'components')),
      ...files(join(deck, 'services')),
      join(dir, 'services', 'build-presentation.ts'),
      join(process.cwd(), 'src', 'app', '(stage)', 'presentation', '[buyerId]', 'page.tsx'),
    ]
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    for (const forbidden of [
      /\.title\b/,
      /listingUrl/,
      /listing_url/,
      /\.address\b/,
      /locator_address/,
      /soldBy|sold_by/,
      /exclusivity/,
      /advisor_price|advisorPrice/,
      /commercialization/i,
      /estimation/i,
      /disponible/i,
    ]) {
      expect(scene).not.toMatch(forbidden);
    }
    // La requête ne lit que des colonnes autorisées.
    const query = readFileSync(join(dir, 'queries', 'load-presentation.ts'), 'utf8');
    for (const forbidden of [
      'title',
      'listing_url',
      'address',
      'sold_by',
      'exclusivity',
      'advisor_price',
      'commercialization',
    ]) {
      expect(query).not.toMatch(new RegExp(`select\\([^)]*${forbidden}`));
    }
  });
});
