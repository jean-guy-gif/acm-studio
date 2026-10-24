import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildBuyerPresentation,
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
  ...over,
});

const plain = (value: unknown): string => JSON.stringify(value).replace(/[  ]/g, ' ');

// Mission 119 — la présentation : un écran d'ouverture, un bien par écran, la fin ; le prix
// affiché toujours ; « Pourquoi » depuis les indispensables de la fiche ; « À savoir » = les écarts.
describe('la présentation de la sélection', () => {
  it('ouverture, un bien par écran dans l’ordre, fin', () => {
    const presentation = buildBuyerPresentation({
      buyerId: 'b',
      buyer,
      selectionId: 's',
      selectedAt: '2026-10-24T10:00:00Z',
      presentedAt: null,
      items: [item({ itemId: 'i2', position: 2 }), item()],
    });
    expect(presentation.screens.map((screen) => screen.type)).toEqual([
      'intro',
      'item',
      'item',
      'end',
    ]);
    const first = presentation.screens[1];
    if (first?.type !== 'item') throw new Error('attendu un bien');
    expect(first.item.itemId).toBe('i1');
    expect(first.pricePerSqm).toBe(7807);
    expect(first.seenOnLabel).toBe('affiché le 24/10/2026');
    expect(first.facts.map((fact) => fact.label)).toEqual([
      'Surface',
      'Pièces',
      'Chambres',
      'Extérieur',
      'Parking',
      'DPE',
    ]);
    expect(first.facts.find((fact) => fact.label === 'Extérieur')?.value).toBe('Terrasse, Jardin');
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

  it('un bien sans prix public n’a pas de prix au m² ; un bien de l’agence n’a pas « affiché le »', () => {
    const presentation = buildBuyerPresentation({
      buyerId: 'b',
      buyer,
      selectionId: 's',
      selectedAt: 'x',
      presentedAt: null,
      items: [item({ source: 'project', price: null, priceSeenOn: null })],
    });
    const screen = presentation.screens[1];
    if (screen?.type !== 'item') throw new Error('attendu un bien');
    expect(screen.pricePerSqm).toBeNull();
    expect(screen.seenOnLabel).toBeNull();
    expect(
      itemFacts(item({ outdoor: ['none'], parking: [] })).find((fact) => fact.label === 'Extérieur')
        ?.value,
    ).toBe('Aucun');
    expect(itemFacts(item({ outdoor: [], parking: [] })).map((fact) => fact.label)).not.toContain(
      'Parking',
    );
  });

  it('jamais côté acquéreur : ni notes ni critères éliminatoires de la fiche, ni rien hors de la liste d’autorisation', () => {
    const presentation = buildBuyerPresentation({
      buyerId: 'b',
      buyer,
      selectionId: 's',
      selectedAt: 'x',
      presentedAt: null,
      items: [item()],
    });
    const payload = JSON.stringify(presentation);
    for (const leak of [
      'NOTE-SECRETE',
      'Route passante',
      'dealBreakers',
      'notes',
      'phone',
      'email',
    ]) {
      expect(payload).not.toContain(leak);
    }
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
    const spiked = JSON.stringify(
      buildBuyerPresentation({
        buyerId: 'b',
        buyer,
        selectionId: 's',
        selectedAt: 'x',
        presentedAt: null,
        items: [trap],
      }),
    );
    // Le constructeur recopie l'entrée telle quelle dans l'écran : c'est la REQUÊTE
    // (load-presentation.ts) qui ne construit jamais ces champs, et le code de la scène ne les lit
    // pas — vérifié ci-dessous sur les fichiers. Le titre piège ne doit apparaître nulle part dans
    // ce que la scène AFFICHE.
    expect(spiked).toContain('Maison · 7 pièces');
  });

  it('le code de la présentation ne lit ni titre, ni adresse, ni lien, ni vendeur, ni exclusivité, ni fourchette, ni prix convenu, ni « estimation »', () => {
    const dir = join(process.cwd(), 'src', 'features', 'buyer-presentation');
    const files = (path: string): string[] =>
      readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? files(join(path, entry.name))
          : /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)
            ? [join(path, entry.name)]
            : [],
      );
    const scene = [
      ...files(join(dir, 'components')),
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
