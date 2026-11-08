import { readFileSync } from 'node:fs';
import { createElement } from 'react';

import { frenchLeaks } from '@/test-fixtures/french-leaks';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { SellerSynthesisDocument } from '@/features/seller-synthesis/components/seller-synthesis-document';
import { loadSellerSynthesis } from '@/features/seller-synthesis/queries/load-seller-synthesis';
import {
  buildSellerSynthesis,
  type SynthesisInput,
} from '@/features/seller-synthesis/services/build-seller-synthesis';
import {
  hashSynthesisToken,
  newSynthesisToken,
  SYNTHESIS_TOKEN_PATTERN,
} from '@/features/seller-synthesis/services/synthesis-token';
import { formatEuro } from '@/lib/format';
import { isPublicPath } from '@/lib/supabase/public-paths';

// Mission 110 — la synthèse laissée au vendeur ne contient JAMAIS d'adresse, de titre, de lien
// d'annonce ni de « Vendu par » : même quand la base les rend (titre piège de la M107).
// Mission 113 — elle raconte le rendez-vous dans l'ordre du Live, fidèle aux réponses figées.
const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';
const TRAP_URL = 'https://www.agence-dupont-immobilier.fr/annonce/vente-12-rue-des-lilas';
const PHOTO = (id: string) => `https://cdn.portail.test/${id}.jpg`;

const competitor = (
  id: string,
  order: number,
  price: number,
  over: Record<string, unknown> = {},
) => ({
  id,
  price,
  property_type: 'apartment',
  rooms_count: 3,
  bedrooms_count: 2,
  surface_area: 68,
  city: 'Antibes',
  district: null,
  is_selected: true,
  excluded_from_live: false,
  display_order: order,
  created_at: '2026-10-01T00:00:00.000Z',
  energy_rating: 'D',
  ges_rating: null,
  general_condition: null,
  outdoor_spaces: [],
  parking_types: [],
  exposure: null,
  photo_urls: [PHOTO(id)],
  price_drop_amount: null,
  price_drop_percentage: null,
  days_on_market: null,
  listing_published_at: null,
  synthesis_hide_photo: false,
  // Ce que la base pourrait rendre de plus : rien de cela ne doit sortir.
  title: TRAP_TITLE,
  listing_url: TRAP_URL,
  locator_address: '12 rue des Lilas, 06600 Antibes',
  address: '12 rue des Lilas',
  sold_by: 'agency',
  exclusivity: 'yes',
  ...over,
});

// Un client factice qui répond selon la TABLE de chaque lecture (lectures en parallèle), note les
// colonnes demandées et signe les photos du stockage.
function tableClient(respond: (table: string) => { data: unknown }) {
  const selects: string[] = [];
  const signed: string[] = [];
  const chain = (table: string): unknown =>
    new Proxy(() => undefined, {
      get(_target, property) {
        if (property === 'then') {
          return (resolve: (value: unknown) => unknown) =>
            resolve({ error: null, ...respond(table) });
        }
        return (...args: unknown[]) => {
          if (property === 'select') selects.push(`${table}: ${String(args[0])}`);
          return chain(table);
        };
      },
    });
  const client = {
    from: (table: string) => chain(table),
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: 'https://x/logo.png' } }),
        createSignedUrls: async (paths: string[]) => {
          signed.push(...paths);
          return {
            data: paths.map((path) => ({ path, signedUrl: `https://signed.test/${path}?t=1` })),
            error: null,
          };
        },
      }),
    },
  };
  return { client, selects, signed };
}

function databaseWithTraps(language = 'fr') {
  return tableClient((table) => {
    switch (table) {
      case 'projects':
        return {
          data: {
            id: 'p1',
            seller_name: 'M. Vendeur',
            advisor_id: 'u1',
            status: 'meeting_completed',
            live_started_at: '2026-10-19T09:00:00.000Z',
            language,
          },
        };
      case 'subject_properties':
        return {
          data: {
            property_type: 'Appartement',
            city: 'Antibes',
            district: null,
            surface_area: 70,
            land_area: null,
            rooms_count: 3,
            bedrooms_count: 2,
            floor: 2,
            building_floors: 4,
            energy_rating: 'D',
            ges_rating: null,
            general_condition: null,
            outdoor_spaces: ['balcony'],
            parking_types: [],
            exposure: null,
            strengths: ['Vue dégagée'],
            // Une photo d'un autre dossier n'est jamais signée.
            photo_urls: ['a1/p1/property/1.jpg', 'a2/autre/property/x.jpg'],
            watch_points: ['Travaux de toiture'],
            advisor_price_min: 280_000,
          },
        };
      case 'comparables':
        return {
          data: [
            // Dans le désordre : la synthèse suit l'ordre du Live (display_order).
            competitor('c3', 2, 330_000, {
              surface_area: 72,
              synthesis_hide_photo: true,
              listing_published_at: '2026-07-21T00:00:00.000Z',
              price_drop_amount: 10_000,
              price_drop_percentage: 2.9,
            }),
            competitor('c1', 0, 300_000),
            competitor('c2', 1, 360_000, { surface_area: 75, energy_rating: 'C' }),
            // Hors Live (M110) : retenu, jamais montré, absent de la synthèse.
            competitor('c4', 3, 410_000, { surface_area: 99, excluded_from_live: true }),
          ],
        };
      case 'live_seller_responses':
        return {
          data: [
            {
              comparable_id: 'c1',
              seller_estimated_listing_price: 280_000,
              seller_serious_competitor: 'yes',
              revealed_listing_price: 300_000,
              seller_estimated_days_on_market: null,
            },
            // « Non » dit après la révélation : ni prix ni durée dans la synthèse (M108).
            {
              comparable_id: 'c2',
              seller_estimated_listing_price: 350_000,
              seller_serious_competitor: 'no',
              revealed_listing_price: 360_000,
              seller_estimated_days_on_market: 40,
            },
            {
              comparable_id: 'c3',
              seller_estimated_listing_price: 300_000,
              seller_serious_competitor: 'unsure',
              revealed_listing_price: 330_000,
              seller_estimated_days_on_market: 60,
            },
          ],
        };
      case 'live_seller_summary':
        return {
          data: {
            seller_perceived_property_price: 350_000,
            seller_revised_property_price: 325_000,
            seller_most_dangerous_comparable_id: 'c3',
            seller_most_dangerous_reason: 'better_surface',
            seller_most_dangerous_comment: 'COMMENTAIRE PRIVÉ',
          },
        };
      // Mission 111 — la décision en cours a changé APRÈS le rendez-vous : la synthèse d'un
      // dossier conclu dit les montants figés à la conclusion, pas ceux-ci.
      case 'project_price_positionings':
        return {
          data: {
            advisor_price: 999_000,
            advisor_comparative_market_price: 998_000,
            justification: 'Trois biens proches, le vôtre a un balcon.',
            range_central: 997_000,
            calculation_snapshot: { usedCount: 4, excludedOutlierCount: 0 },
          },
        };
      case 'project_meeting_conclusions':
        return {
          data: {
            commercialization_price: 319_000,
            concluded_at: '2026-10-19T10:00:00.000Z',
            outcome: 'signed',
            frozen_advisor_price: 320_000,
            frozen_advisor_analysis: 330_000,
            frozen_market_computed: 320_000,
          },
        };
      case 'agencies':
        return { data: { name: 'Agence Test' } };
      case 'agency_branding':
        return {
          data: {
            brand: '#123456',
            brand_deep: 'url(javascript:alert(1))',
            brand_soft: null,
            brand_darker: null,
            brand_darkest: null,
            on_brand_text: null,
            font_family: null,
            validated_at: '2026-10-01T00:00:00.000Z',
            logo_light_path: null,
            postal_address: '1 place du Marché, 06600 Antibes',
            professional_card: 'CPI 0601',
            professional_card_issuer: 'CCI Nice',
            financial_guarantee: null,
            document_name: null,
          },
        };
      case 'profiles':
        return {
          data: {
            first_name: 'Jeanne',
            last_name: 'Conseil',
            phone: '06 00 00 00 00',
            email: 'j@agence.fr',
            photo_path: 'a1/u1/profile.jpg',
          },
        };
      default:
        return { data: null };
    }
  });
}

const load = async (language = 'fr') => {
  const db = databaseWithTraps(language);
  const synthesis = (await loadSellerSynthesis(db.client as never, 'p1', 'a1'))!;
  const html = renderToStaticMarkup(createElement(SellerSynthesisDocument, { synthesis }));
  return { db, synthesis, html };
};

// Mission 140 — la synthèse d'un vendeur anglophone : tout en anglais, les montants à l'anglaise,
// les mentions légales de l'agence en français (décision de Jean-Guy, 06/11).
describe('la synthèse dans la langue du vendeur', () => {
  it('en anglais, rien ne reste du français hors des mentions légales et des noms propres', async () => {
    const { synthesis, html } = await load('en');
    expect(synthesis.language).toBe('en');
    expect(html).toContain('Our meeting');
    expect(html).toContain('The properties we looked at together');
    expect(html).toMatch(/€\d{1,3}(,\d{3})+/);
    // La justification est le texte du conseiller, écrit par lui : elle n'est pas traduite.
    expect(
      frenchLeaks(html, [
        'M. Vendeur',
        '1 place du Marché, 06600 Antibes',
        'Antibes',
        'Trois biens proches, le vôtre a un balcon.',
      ]),
    ).toEqual([]);
  });

  it('en français, le document ne change pas', async () => {
    const { synthesis, html } = await load();
    expect(synthesis.language).toBe('fr');
    expect(html).toContain('Notre rendez-vous');
  });
});

describe('la synthèse au vendeur', () => {
  it('ne contient ni adresse, ni titre, ni lien d’annonce, ni « Vendu par », sur aucune page', async () => {
    const { db, synthesis, html } = await load();
    const payload = JSON.stringify(synthesis) + html;
    for (const leak of [
      'EXCLUSIVITÉ',
      'Dupont',
      'Lilas',
      'agence-dupont',
      'Vendu par',
      'Exclusivité',
      'listing',
      'COMMENTAIRE PRIVÉ',
      'Travaux de toiture',
    ]) {
      expect(payload, leak).not.toContain(leak);
    }
    expect(html).not.toMatch(/[Ee]stimation|[Ff]ourchette|Prêt à lancer|Freins/);
    // Les colonnes lues sont une liste d'autorisation : aucune colonne d'annonce demandée.
    const read = (table: string) =>
      db.selects.filter((line) => line.startsWith(`${table}:`)).join();
    expect(read('comparables')).not.toMatch(
      /title|listing_url|locator_|address|sold_by|exclusivity/,
    );
    expect(read('subject_properties')).not.toMatch(
      /address|watch_points|weaknesses|advisor_price|description/,
    );
    expect(read('live_seller_summary')).not.toContain('comment');
  });

  it('suit l’ordre du Live, sans le concurrent hors Live', async () => {
    const { synthesis, html } = await load();
    expect(synthesis.competitors.map((item) => item.id)).toEqual(['c1', 'c2', 'c3']);
    expect(synthesis.competitors.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(html).not.toMatch(/99\sm²/);
    const order = [
      'Votre bien',
      'Les biens que nous avons regardés ensemble',
      'Le DPE face au marché',
      'Le concurrent le plus dangereux, selon vous',
      'L’analyse des prix',
      'Le chemin de votre prix',
    ].map((title) => html.indexOf(title));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html.match(/data-testid="synthesis-competitor"/g)).toHaveLength(4); // 3 fiches + le plus dangereux
  });

  it('reprend les réponses figées du vendeur ; un « Non » n’a ni prix ni durée', async () => {
    const { synthesis, html } = await load();
    const [c1, c2, c3] = synthesis.competitors;
    expect(c1.serious).toBe('yes');
    expect(c1.revealed).toMatchObject({ guess: 280_000, price: 300_000, gapPercent: 7.1 });
    expect(c1.revealed?.duration).toBeNull();
    expect(c2.serious).toBe('no');
    expect(c2.revealed).toBeNull();
    expect(html).not.toMatch(/360\s000|350\s000\s€\s*<\/span><\/div><div[^>]*>Affiché/);
    expect(html).toContain('Pas un concurrent pour vous');
    expect(c3.revealed).toMatchObject({
      guess: 300_000,
      price: 330_000,
      duration: { guessDays: 60, days: 90 },
      priceDrop: { amount: 10_000, percent: 2.9 },
    });
    expect(html).toMatch(/\+7,1\s%\spar rapport à votre réponse/);
    expect(synthesis.guessLines).toEqual([
      expect.stringMatching(/^Vous avez sous-estimé 2 concurrents sur 2, de 8,\d\s% en moyenne$/),
    ]);
    expect(synthesis.dangerous).toEqual({ competitorId: 'c3', reason: 'Plus grande surface' });
    expect(html).toContain('Pourquoi, selon vous');
  });

  it('« Sans photo » retire la photo du document et de ce que reçoit la page', async () => {
    const { synthesis, html } = await load();
    const c3 = synthesis.competitors[2];
    expect(c3).toMatchObject({ photoUrl: null, hasPhoto: true, photoHidden: true });
    expect(JSON.stringify(synthesis) + html).not.toContain(PHOTO('c3'));
    expect(html).toContain(PHOTO('c1'));
  });

  it('les photos du bien vendeur et du conseiller passent par des liens signés', async () => {
    const { db, synthesis } = await load();
    // Mission 127 — la photo du conseiller est signée par le bloc agence partagé : l'ordre des
    // signatures n'importe pas.
    expect([...db.signed].sort()).toEqual(['a1/p1/property/1.jpg', 'a1/u1/profile.jpg']);
    expect(synthesis.property?.photos).toEqual(['https://signed.test/a1/p1/property/1.jpg?t=1']);
    expect(synthesis.agency.advisorPhotoUrl).toBe('https://signed.test/a1/u1/profile.jpg?t=1');
  });

  it('dit les prix du rendez-vous, figés à la conclusion, et les mentions de l’agence', async () => {
    const { synthesis, html } = await load();
    expect(synthesis.decision).toEqual({
      competitorPrice: 320_000,
      basisLabel: 'Calculé sur 4 concurrents, dont 3 vus ensemble',
      advisorAnalysis: 330_000,
      justification: 'Trois biens proches, le vôtre a un balcon.',
    });
    expect(synthesis.commercializationPrice).toBe(319_000);
    expect(synthesis.positionSentence).toMatch(/^À 319\s000\s€, votre bien serait/);
    for (const label of [
      'Prix des concurrents',
      'Analyse du conseiller',
      'Le point à retenir',
      'Prix de commercialisation convenu ensemble',
      'Les prix cités sont ceux des annonces, pas des prix de vente.',
    ]) {
      expect(html).toContain(label);
    }
    expect(html).not.toMatch(/999|998|997/);
    expect(html).toContain('Carte professionnelle CPI 0601 délivrée par CCI Nice');
    expect(html).toContain('Ne peut recevoir aucun fonds');
    // Une couleur hors #RRGGBB n'entre pas dans la feuille de style (M55).
    expect(synthesis.brandDeclarations).toBe('--color-brand: #123456;');
    expect(html).not.toContain('javascript');
  });

  it('une fiche sans photo passe en pleine largeur, sans colonne grise', async () => {
    const { html } = await load();
    const cards = html.split('data-testid="synthesis-competitor"').slice(1);
    // c1 a sa photo ; c3 l'a retirée (« Sans photo ») : pas de colonne de photo.
    expect(cards[0]).toContain('sm:grid-cols-[52mm_1fr]');
    expect(cards[2]).not.toContain('sm:grid-cols-[52mm_1fr]');
    expect(cards[2].slice(0, cards[2].indexOf('Concurrent 3'))).not.toContain('bg-zinc-200');
  });

  it('la bande, les deux prix et le point à retenir forment un seul bloc insécable', async () => {
    const { html } = await load();
    const start = html.indexOf('L’analyse des prix');
    const block = html.slice(
      html.lastIndexOf('break-inside-avoid', start),
      html.indexOf('Prix médian'),
    );
    for (const part of [
      'Prix affichés, du moins cher au plus cher',
      'Prix des concurrents',
      'Analyse du conseiller',
      'Le point à retenir',
    ]) {
      expect(block, part).toContain(part);
    }
  });

  it('une donnée absente n’a pas de case, jamais « — »', async () => {
    const { html } = await load();
    expect(html).not.toContain('—');
    // Aucune baisse connue sur un concurrent révélé sans durée : pas de ligne.
    expect(html).not.toMatch(/Baisse de prix connue : 0/);
  });

  it('sans Live mené, pas de synthèse', async () => {
    const db = tableClient((table) =>
      table === 'projects'
        ? { data: { id: 'p1', seller_name: 'x', advisor_id: null, status: 'draft' } }
        : table === 'comparables' || table === 'live_seller_responses'
          ? { data: [] }
          : { data: null },
    );
    expect(await loadSellerSynthesis(db.client as never, 'p1', 'a1')).toBeNull();
  });
});

describe('le lien de la synthèse', () => {
  it('un jeton de 43 caractères, dont seul le condensat est gardé', () => {
    const token = newSynthesisToken();
    expect(token).toMatch(SYNTHESIS_TOKEN_PATTERN);
    expect(hashSynthesisToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSynthesisToken(token)).not.toContain(token);
  });

  it('seule la forme exacte du lien s’ouvre sans compte', () => {
    expect(isPublicPath(`/synthese/${'a'.repeat(43)}`)).toBe(true);
    expect(isPublicPath('/synthese/court')).toBe(false);
    expect(isPublicPath(`/synthese/${'a'.repeat(43)}/plus`)).toBe(false);
    expect(isPublicPath('/synthese')).toBe(false);
  });

  it('n’est jamais indexé, 30 jours au plus', () => {
    const config = readFileSync('next.config.ts', 'utf8');
    expect(config).toContain("source: '/synthese/:token'");
    expect(config).toContain('noindex, nofollow, noarchive');
    const page = readFileSync('src/app/synthese/[token]/page.tsx', 'utf8');
    expect(page).toContain('robots: { index: false');
    expect(page).toContain(".gt('expires_at'");
    const migration = readFileSync(
      'supabase/migrations/20261029090000_prise_de_mandat.sql',
      'utf8',
    );
    expect(migration).toContain("default (now() + interval '30 days')");
  });
});

// Mission 111 — avant la conclusion, la synthèse lit la décision en cours ; un montant absent n'a
// pas de ligne. Mission 109 — sans décision, aucun prix final.
describe('les prix de la synthèse (mission 111)', () => {
  const base: SynthesisInput = {
    sellerName: 'M. Vendeur',
    meetingDate: null,
    liveStartedAt: null,
    property: null,
    propertyPhotoUrls: [],
    competitors: [],
    responses: [],
    summary: {
      seller_perceived_property_price: 350_000,
      seller_revised_property_price: null,
      seller_most_dangerous_comparable_id: null,
      seller_most_dangerous_reason: null,
    },
    decision: null,
    frozen: null,
    commercializationPrice: null,
    agency: {
      name: 'Agence',
      logoUrl: null,
      postalAddress: null,
      professionalCard: null,
      professionalCardIssuer: null,
      financialGuarantee: null,
      advisorName: null,
      advisorPhone: null,
      advisorEmail: null,
      advisorPhotoUrl: null,
      advisorQr: null,
    },
    brandDeclarations: '',
  };

  it('avant la conclusion : la décision en cours, dite comme au Live', () => {
    const synthesis = buildSellerSynthesis({
      ...base,
      decision: {
        advisor_price: 310_000,
        advisor_comparative_market_price: null,
        justification: null,
        range_central: 300_000,
        calculation_snapshot: { usedCount: 5, excludedOutlierCount: 1 },
      },
    });
    expect(synthesis.decision).toEqual({
      competitorPrice: 310_000,
      // Un autre montant que le calcul : les mots du Live (M94, M104).
      basisLabel: 'Prix retenu par votre conseiller à partir de 5 concurrents',
      advisorAnalysis: null,
      justification: null,
    });
    const html = renderToStaticMarkup(createElement(SellerSynthesisDocument, { synthesis }));
    expect(html).toContain('Prix des concurrents');
    expect(html).not.toContain('Analyse du conseiller');
  });

  it('après la conclusion : les montants figés, même sans décision en cours', () => {
    const synthesis = buildSellerSynthesis({
      ...base,
      frozen: { advisor_price: 300_000, advisor_analysis: 305_000, market_computed: 300_000 },
    });
    expect(synthesis.decision).toEqual({
      competitorPrice: 300_000,
      basisLabel: null,
      advisorAnalysis: 305_000,
      justification: null,
    });
  });

  it('sans décision ni conclusion : aucun prix final', () => {
    const synthesis = buildSellerSynthesis(base);
    expect(synthesis.decision).toBeNull();
    const html = renderToStaticMarkup(createElement(SellerSynthesisDocument, { synthesis }));
    expect(html).not.toContain('Prix des concurrents');
  });

  // Mission 116 — le prix convenu en couleur face à l'analyse du conseiller, sur les montants
  // figés à la conclusion (M111) ; sans analyse, la carte reste telle quelle.
  it('le prix convenu prend la couleur de son écart à l’analyse figée, avec son libellé', () => {
    const colour = (commercializationPrice: number, analysis: number | null) =>
      renderToStaticMarkup(
        createElement(SellerSynthesisDocument, {
          synthesis: buildSellerSynthesis({
            ...base,
            commercializationPrice,
            frozen:
              analysis == null
                ? null
                : { advisor_price: analysis, advisor_analysis: analysis, market_computed: 300_000 },
          }),
        }),
      );
    expect(colour(419_000, 400_000)).toContain('data-alignment="green"');
    expect(colour(419_000, 400_000)).toContain('Prix aligné sur le marché');
    expect(colour(420_000, 400_000)).toContain('Proche du marché');
    expect(colour(440_000, 400_000)).toContain('data-alignment="red"');
    expect(colour(440_000, 400_000)).toContain('Éloigné du marché');
    const plain = colour(440_000, null);
    expect(plain).toContain('data-alignment=""');
    expect(plain).not.toContain('data-testid="price-alignment"');
    expect(plain).toContain('Convenu ensemble');
  });

  // Mission 115 — sans désignation, la bande ne nomme pas de plus dangereux.
  it('la bande ne nomme pas de plus dangereux sans désignation', () => {
    const synthesis = buildSellerSynthesis(base);
    const html = renderToStaticMarkup(createElement(SellerSynthesisDocument, { synthesis }));
    expect(synthesis.dangerous).toBeNull();
    expect(html).not.toContain('Le plus dangereux selon vous');
  });
});

// Mission 115 — la bande de « L'analyse des prix » nomme « Le plus dangereux selon vous », au prix
// affiché du concurrent désigné, figé au Live ; absent sans désignation.
describe('« Le plus dangereux selon vous » sur la bande de la synthèse', () => {
  it('nommé, au prix révélé du concurrent désigné', async () => {
    const { html, synthesis } = await load();
    expect(synthesis.dangerous?.competitorId).toBe('c3');
    expect(html).toMatch(/Le plus dangereux selon vous<\/span><b>330\s000\s€/);
    expect(html).toMatch(/Au début<\/span><b>/);
  });
});

// Mission 148 A — la frise de « L'analyse des prix » : ses bornes écrites couvrent tout ce qu'elle
// montre (le dossier 868af175 de l'essai écrivait « 129 900 € … 149 000 € » sous deux repères à
// 127 992 et 129 000 €), et elle est calculée pour les trois largeurs de l'écran.
describe('la frise de la synthèse (mission 148 A)', () => {
  it('ses bornes sont le plus petit et le plus grand des prix ET des repères', async () => {
    const { html, synthesis } = await load();
    const values = [
      ...synthesis.analysis!.prices,
      synthesis.perceivedPrice,
      synthesis.revisedPrice,
      synthesis.competitors.find((item) => item.id === synthesis.dangerous?.competitorId)?.revealed
        ?.price ?? null,
      synthesis.decision?.competitorPrice ?? null,
    ].filter((value): value is number => value != null);
    const euro = (value: number) => formatEuro(value);
    const start = html.indexOf('data-band');
    const ends =
      /<div class="flex justify-between text-xs text-zinc-500"><span>([^<]+)<\/span><span>([^<]+)<\/span>/.exec(
        html.slice(start),
      );
    expect(ends?.[1]).toBe(euro(Math.min(...values)));
    expect(ends?.[2]).toBe(euro(Math.max(...values)));
  });

  it('chaque frise est mise en page pour le téléphone, la tablette et l’écran large ou le PDF', async () => {
    const { html } = await load();
    const bands = html.match(/data-band-mode="(labels|numbered)"/g) ?? [];
    // Deux frises (« L'analyse des prix » et « Le chemin de votre prix »), trois largeurs chacune.
    expect(bands.length % 3).toBe(0);
    expect(bands.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('class="sm:hidden" data-band');
    expect(html).toContain('class="hidden md:block" data-band');
  });
});
