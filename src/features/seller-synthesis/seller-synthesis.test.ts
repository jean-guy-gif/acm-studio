import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { SellerSynthesisDocument } from '@/features/seller-synthesis/components/seller-synthesis-document';
import { loadSellerSynthesis } from '@/features/seller-synthesis/queries/load-seller-synthesis';
import {
  buildSellerSynthesis,
  guessGapSentence,
} from '@/features/seller-synthesis/services/build-seller-synthesis';
import {
  hashSynthesisToken,
  newSynthesisToken,
  SYNTHESIS_TOKEN_PATTERN,
} from '@/features/seller-synthesis/services/synthesis-token';
import { isPublicPath } from '@/lib/supabase/public-paths';

// Mission 110 — la synthèse laissée au vendeur ne contient JAMAIS d'adresse, de titre, de lien
// d'annonce ni de « Vendu par » : même quand la base les rend (titre piège de la M107).
const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';
const TRAP_URL = 'https://www.agence-dupont-immobilier.fr/annonce/vente-12-rue-des-lilas';
const competitor = (id: string, price: number) => ({
  id,
  price,
  property_type: 'apartment',
  rooms_count: 3,
  surface_area: 68,
  city: 'Antibes',
  district: null,
  is_selected: true,
  // Ce que la base pourrait rendre de plus : rien de cela ne doit sortir.
  title: TRAP_TITLE,
  listing_url: TRAP_URL,
  locator_address: '12 rue des Lilas, 06600 Antibes',
  address: '12 rue des Lilas',
  sold_by: 'agency',
  exclusivity: 'yes',
});

// Un client factice qui répond selon la TABLE de chaque lecture (lectures en parallèle), et note
// les colonnes demandées.
function tableClient(respond: (table: string) => { data: unknown }) {
  const selects: string[] = [];
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
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: 'https://x/logo.png' } }) }),
    },
  };
  return { client, selects };
}

function databaseWithTraps() {
  return tableClient((table) => {
    switch (table) {
      case 'projects':
        return {
          data: {
            id: 'p1',
            seller_name: 'M. Vendeur',
            advisor_id: 'u1',
            status: 'meeting_completed',
          },
        };
      case 'comparables':
        return {
          data: [competitor('c1', 300_000), competitor('c2', 330_000), competitor('c3', 360_000)],
        };
      case 'live_seller_responses':
        return {
          data: [
            {
              comparable_id: 'c1',
              seller_estimated_listing_price: 280_000,
              seller_serious_competitor: 'yes',
              revealed_listing_price: 300_000,
            },
            {
              comparable_id: 'c2',
              seller_estimated_listing_price: 300_000,
              seller_serious_competitor: 'yes',
              revealed_listing_price: 330_000,
            },
            // « Non » : n'entre pas dans le marché vu ensemble.
            {
              comparable_id: 'c3',
              seller_estimated_listing_price: 350_000,
              seller_serious_competitor: 'no',
              revealed_listing_price: 360_000,
            },
          ],
        };
      case 'live_seller_summary':
        return {
          data: {
            seller_perceived_property_price: 350_000,
            seller_revised_property_price: 325_000,
          },
        };
      case 'project_price_positionings':
        return {
          data: {
            advisor_price: 320_000,
            justification: 'Trois biens proches, le vôtre a un balcon.',
          },
        };
      case 'project_meeting_conclusions':
        return {
          data: { commercialization_price: 319_000, concluded_at: '2026-10-19T10:00:00.000Z' },
        };
      case 'agencies':
        return { data: { name: 'Agence Test' } };
      case 'agency_branding':
        return {
          data: {
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
          },
        };
      default:
        return { data: null };
    }
  });
}

describe('la synthèse au vendeur', () => {
  it('ne contient ni adresse, ni titre, ni lien d’annonce, ni « Vendu par »', async () => {
    const db = databaseWithTraps();
    const synthesis = await loadSellerSynthesis(db.client as never, 'p1', 'a1');
    expect(synthesis).not.toBeNull();
    const html = renderToStaticMarkup(
      createElement(SellerSynthesisDocument, { synthesis: synthesis! }),
    );
    const payload = JSON.stringify(synthesis) + html;
    for (const leak of [
      'EXCLUSIVITÉ',
      'Dupont',
      'Lilas',
      'agence-dupont',
      'Vendu par',
      'Exclusivité',
      'listing',
    ]) {
      expect(payload, leak).not.toContain(leak);
    }
    // Les colonnes lues sont une liste d'autorisation : aucune colonne d'annonce demandée.
    const comparableColumns = db.selects.filter((line) => line.startsWith('comparables:')).join();
    expect(comparableColumns).not.toMatch(/title|listing_url|locator_|address|sold_by|exclusivity/);
  });

  it('dit ce que le vendeur a dit, le marché vu ensemble, le prix et les mentions de l’agence', async () => {
    const synthesis = (await loadSellerSynthesis(databaseWithTraps().client as never, 'p1', 'a1'))!;
    expect(synthesis.sellerSaid).toEqual({
      perceivedPrice: 350_000,
      revisedPrice: 325_000,
      // (300 − 280)/280 = 7,1 % ; (330 − 300)/300 = 10 % ; moyenne 8,6 %.
      averageGuessGapPercent: 8.6,
    });
    expect(synthesis.market.competitors.map((item) => item.price)).toEqual([300_000, 330_000]);
    expect(synthesis.market.competitors[0].label).toMatch(
      /^Appartement · 3 pièces · 68\sm² · Antibes$/,
    );
    expect(synthesis.decision).toEqual({
      advisorPrice: 320_000,
      justification: 'Trois biens proches, le vôtre a un balcon.',
    });
    expect(synthesis.commercializationPrice).toBe(319_000);
    const html = renderToStaticMarkup(createElement(SellerSynthesisDocument, { synthesis }));
    expect(html).toContain('Carte professionnelle CPI 0601 délivrée par CCI Nice');
    expect(html).toContain('Ne peut recevoir aucun fonds');
    expect(html).not.toMatch(/[Ee]stimation/);
  });

  it('l’écart moyen des réponses se dit sans détail par concurrent', () => {
    expect(guessGapSentence(8.6)).toMatch(
      /^En moyenne, les prix affichés étaient 9\s%\sau-dessus de vos réponses\.$/,
    );
    expect(guessGapSentence(-4)).toMatch(/en dessous de vos réponses/);
    expect(guessGapSentence(0.4)).toBe(
      'En moyenne, vos réponses étaient très proches des prix affichés.',
    );
    expect(guessGapSentence(null)).toBeNull();
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
    expect(buildSellerSynthesis).toBeTypeOf('function');
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
