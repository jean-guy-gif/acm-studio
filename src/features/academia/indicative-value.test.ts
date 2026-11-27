import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import realView from '@/test-fixtures/academia-vue-bien.json';

// Mission 158 — la valeur indicative d'Academia : pour le conseiller seul, jamais enregistrée,
// jamais montrée au vendeur (CLAUDE.md ; les tests validés par Jean-Guy le 17/11).
vi.mock('@/features/subject-property/actions/save-advisor-range', () => ({
  saveAdvisorRange: async () => ({ ok: true, min: null, max: null }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) =>
    createElement('a', { href }, children as never),
}));
const { AddressViewPanel } = await import('@/features/academia/components/address-view-panel');
const { parsePropertyView } = await import('@/features/academia/services/property-view');

const SRC = join(process.cwd(), 'src');
const files = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return files(path);
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
      })
    : [];

// Tout ce que voit le vendeur : le Live, la présentation, la synthèse, l'Étude de marché, le Point
// marché, les pages publiques, le lien du quartier et les textes du client.
const SELLER_SIDE = [
  ['features', 'live-seller'],
  ['features', 'meeting-conclusion'],
  ['features', 'seller-presentation'],
  ['features', 'seller-synthesis'],
  ['features', 'market-update'],
  ['features', 'market-study'],
  ['features', 'buyer-deck'],
  ['features', 'neighbourhood-link'],
  ['lib', 'client-texts'],
  ['app', '(stage)'],
  ['app', '(print)'],
  ['app', 'synthese'],
  ['app', 'point-marche'],
  ['app', 'etude-de-marche'],
  ['app', 'dossier'],
  // Les documents et liens remis à l'acquéreur, au propriétaire, au confrère, au notaire.
  ['features', 'buyer-dossier'],
  ['features', 'buyer-presentation'],
  ['features', 'buyer-messages'],
  ['features', 'prospecting-file'],
  ['features', 'visit-voucher'],
  ['features', 'purchase-offer'],
  ['app', 'offre'],
  ['app', 'bon-de-visite'],
];

describe('la valeur indicative d’Academia ne peut pas atteindre le vendeur', () => {
  it('1. une seule porte : aucun fichier du côté vendeur ne la lit ni ne la nomme', () => {
    const scanned = SELLER_SIDE.flatMap((parts) => files(join(SRC, ...parts)));
    expect(scanned.length).toBeGreaterThan(50);
    const offenders = scanned
      .filter((path) =>
        /IndicativeValue|indicative|Valeur indicative|readAddressView|parsePropertyView|readAcademiaPropertyView|property-view/.test(
          readFileSync(path, 'utf8'),
        ),
      )
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });

  it('3. les documents du vendeur, rendus avec une valeur indicative piège, n’en montrent rien', async () => {
    const { buildMarketStudy } =
      await import('@/features/market-study/services/build-market-study');
    const { MarketStudyDocument } =
      await import('@/features/market-study/components/market-study-document');
    const trap = parsePropertyView(realView);
    const study = buildMarketStudy({
      language: 'fr',
      madeAt: '2026-11-17T10:00:00Z',
      sellerName: 'M. et Mme Lopez',
      property: null,
      coverPhotoUrl: null,
      competitors: [],
      commercializationPrice: null,
      advisorAnalysis: null,
      agency: {
        name: 'Agence',
        documentName: null,
        logoLightUrl: null,
        logoDarkUrl: null,
        legalLines: [],
        advisor: null,
        advisorQr: null,
      } as never,
      brandDeclarations: '',
      // Le piège : une entrée que le document ne connaît pas.
      ...({ indicative: trap?.indicative, academiaView: trap } as object),
    } as never);
    const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document: study }));
    for (const amount of ['980', '955', '1 060', '1 060', '7 263', '7 263']) {
      expect(html).not.toContain(amount);
    }
    expect(html).not.toMatch(/indicative|Academia|fiabilité/i);
  });

  it('5. « Votre fourchette » reste vide tant que le conseiller ne l’a ni saisie ni reprise', () => {
    const view = parsePropertyView(realView)!;
    const render = (min: number | null, max: number | null) =>
      renderToStaticMarkup(
        createElement(AddressViewPanel, {
          projectId: 'p1',
          state: { kind: 'ready', view, facts: { type: 'maison', rooms: 5, surface: 135 } },
          savedRange: { min, max },
          demo: false,
        }),
      );
    const empty = render(null, null);
    // La valeur indicative est montrée au conseiller, mais rien n'est recopié dans ses champs.
    expect(empty).toContain('Valeur indicative d’Academia');
    expect(empty).toContain('Jamais montrée au vendeur.');
    expect(empty).toContain('Reprendre comme point de départ de votre fourchette');
    expect(empty).toMatch(/data-testid="your-range-min"[^>]*value=""/);
    expect(empty).toMatch(/data-testid="your-range-max"[^>]*value=""/);
    expect(empty).toContain('Modifiable, c’est la seule enregistrée.');
    // Sa fourchette enregistrée s'affiche telle quelle, jamais remplacée par celle d'Academia,
    // écrite avec l'espace des milliers (Jean-Guy, 18/11).
    const saved = render(900000, 990000);
    expect(saved).toMatch(/data-testid="your-range-min"[^>]*value="900\u202f000"/);
    expect(saved).toMatch(/data-testid="your-range-max"[^>]*value="990\u202f000"/);
    // Un montant décimal s'arrondit à l'euro, jamais multiplié par dix au premier chiffre retouché.
    expect(render(689543.5, 990000)).toMatch(
      /data-testid="your-range-min"[^>]*value="689\u202f544"/,
    );
    // Les permis du dossier d'adresse disent leur état en français (Jean-Guy, 18/11).
    expect(saved).toContain('terminé, à 234');
    expect(saved).toContain('autorisé, à 128');
    expect(saved).not.toMatch(/\btermine\b|\bautorise\b/);
    // Jamais le mot interdit à l'écran (M105).
    expect(empty).not.toMatch(/estimation|estimateur/i);
  });

  it('dans la démo, le nom de la copropriété fictive n’est pas écrit', () => {
    const view = parsePropertyView(realView)!;
    const html = renderToStaticMarkup(
      createElement(AddressViewPanel, {
        projectId: 'p1',
        state: { kind: 'ready', view, facts: { type: 'maison', rooms: 5, surface: 135 } },
        savedRange: { min: null, max: null },
        demo: true,
      }),
    );
    expect(html).not.toMatch(/Démonstration/);
    expect(html).toContain('6 lots d’habitation');
  });
});

describe('le bloc quand la vue n’est pas là (maquette M158-1, « Quand il n’y est pas »)', () => {
  const render = (state: Parameters<typeof AddressViewPanel>[0]['state']) =>
    renderToStaticMarkup(
      createElement(AddressViewPanel, {
        projectId: 'p1',
        state,
        savedRange: { min: 900000, max: 990000 },
        demo: false,
      }),
    );

  it('sans accès (une vraie agence) : rien ; sinon une ligne, jamais un bloc vide ni la fourchette', () => {
    expect(render({ kind: 'closed' })).toBe('');
    expect(render({ kind: 'none' })).toContain('Créez le dossier d’adresse depuis Bien vendeur');
    // Mission 161 — l'attente se dit, et la page se relit toute seule (5 s, deux minutes au plus).
    expect(render({ kind: 'waiting' })).toContain(
      'Academia prépare le dossier d’adresse\u00a0: 20 à 60 secondes.',
    );
    expect(render({ kind: 'request_failed' })).toContain('Recréez le lien «\u00a0Vivre ici\u00a0»');
    expect(render({ kind: 'failed' })).toContain('n’a pas pu être lu');
    expect(render({ kind: 'missing_facts', missing: ['type', 'rooms', 'surface'] })).toContain(
      'le type (maison ou appartement), le nombre de pièces et la surface',
    );
    for (const kind of ['none', 'waiting', 'request_failed', 'failed'] as const) {
      expect(render({ kind })).not.toContain('your-range');
    }
  });

  it('la vue lue : la phrase de tête dit pour quel bien elle est calculée', () => {
    const view = parsePropertyView(realView)!;
    const html = render({ kind: 'ready', view, facts: { type: 'maison', rooms: 5, surface: 135 } });
    expect(html.replace(/<!-- -->/g, '')).toMatch(/calculé pour une maison de 5 pièces et 135/);
    // La note d'Academia sur les permis de démolir n'est pas dite deux fois.
    expect(html.match(/Permis de démolir non vérifiés/g)).toHaveLength(1);
    expect(html).toContain('zone 4, moyenne');
  });
});
