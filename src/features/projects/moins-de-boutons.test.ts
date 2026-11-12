import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  MoreMenuEntries,
  isOutside,
  menuKeyIntent,
  menuShift,
  nextMenuIndex,
} from '@/components/ui/more-menu';
import { btnPrimary } from '@/components/ui/styles';
import {
  ComparableSelectionSummaryView,
  PRICE_SPREAD_LABEL,
  priceSpread,
} from '@/features/comparables/components/comparable-selection-summary';
import type { ComparableSelectionSummary } from '@/features/comparables/types/comparable-selection-summary';
import { LivePageIntro } from '@/features/live-seller/components/live-page-intro';
import { liveListOrder } from '@/features/live-seller/services/live-launch';
import { PreparationCardActions } from '@/features/projects/components/preparation-card-actions';
import { suiviLeadId } from '@/features/meeting-conclusion/components/suivi-lead';
import { missingForReady } from '@/features/projects/services/preparation-card';

// Mission 146, partie A — « Moins de boutons » : un seul bouton plein par écran (M143), les autres
// actions en contour ou dans « … », « Supprimer » jamais à côté d'une action principale.

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('le repère des boutons pleins', () => {
  it('btnPrimary porte `btn-filled`, que compte le contrôle e2e', () => {
    expect(btnPrimary.split(' ')).toContain('btn-filled');
  });
});

describe('le menu « … »', () => {
  it('flèches, Début et Fin parcourent les entrées, en boucle', () => {
    expect(nextMenuIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextMenuIndex('ArrowDown', 2, 3)).toBe(0);
    expect(nextMenuIndex('ArrowUp', 0, 3)).toBe(2);
    expect(nextMenuIndex('ArrowUp', -1, 3)).toBe(1);
    expect(nextMenuIndex('Home', 2, 3)).toBe(0);
    expect(nextMenuIndex('End', 0, 3)).toBe(2);
    expect(nextMenuIndex('a', 0, 3)).toBeNull();
    expect(nextMenuIndex('ArrowDown', 0, 0)).toBeNull();
  });

  it('Échap ferme, Tab quitte, les flèches déplacent ; un clic dehors ferme', () => {
    expect(menuKeyIntent('Escape')).toBe('close');
    expect(menuKeyIntent('Tab')).toBe('leave');
    expect(menuKeyIntent('ArrowDown')).toBe('move');
    expect(menuKeyIntent('Home')).toBe('move');
    expect(menuKeyIntent('a')).toBeNull();
    const menu = { contains: (node: Node) => node === inside };
    const inside = {} as Node;
    expect(isOutside(menu, inside)).toBe(false);
    expect(isOutside(menu, {} as Node)).toBe(true);
    expect(isOutside(null, inside)).toBe(true);
  });

  it('la confirmation dans l’écran met le focus sur « Annuler »', () => {
    const source = read('src/components/ui/confirm-dialog.tsx');
    // Mission 151 — le libellé se règle (« Rester » pour quitter) ; « Annuler » par défaut.
    expect(source).toMatch(
      /<button type="button" autoFocus className=\{btnSecondary\} onClick=\{onCancel\}>\s*\{cancelLabel\}/,
    );
    expect(source).toMatch(/cancelLabel = 'Annuler'/);
  });

  it('une entrée « danger » passe en bas, en rouge ; une précision suit le libellé', () => {
    const html = renderToStaticMarkup(
      createElement(MoreMenuEntries, {
        items: [
          { key: 'del', label: 'Supprimer…', danger: true },
          { key: 'ready', label: 'Déclarer prêt', hint: 'il manque : bien vendeur' },
        ],
        onPick: () => {},
      }),
    );
    expect(html.indexOf('Déclarer prêt')).toBeLessThan(html.indexOf('Supprimer…'));
    expect(html).toContain('· il manque : bien vendeur');
    expect(html).toMatch(/text-red-600[^>]*>.*Supprimer…/);
    expect(html.match(/role="menuitem"/g)).toHaveLength(2);
  });
});

describe('Préparation : « Déclarer prêt » dit ce qui manque (M52 gardée)', () => {
  const base = {
    hasProperty: true,
    exploitableCount: 5,
    hasPositioning: true,
    pendingImportCount: 0,
  };

  it('rien ne manque : pas de précision', () => {
    expect(missingForReady({ ...base, ready: true })).toBeNull();
  });

  it('nomme chaque manque, dans l’ordre de la préparation', () => {
    expect(
      missingForReady({
        hasProperty: false,
        exploitableCount: 1,
        hasPositioning: false,
        pendingImportCount: 2,
        ready: false,
      }),
    ).toBe(
      'il manque : bien vendeur, 3 concurrents (1 sur 3), décision de prix, 2 imports en attente',
    );
    expect(missingForReady({ ...base, hasPositioning: false, ready: false })).toBe(
      'il manque : décision de prix',
    );
  });

  it('la carte dit sa prochaine étape, en contour, et « … » ; aucun bouton plein', () => {
    const noop = async () => {};
    const html = renderToStaticMarkup(
      createElement(PreparationCardActions, {
        projectId: 'p1',
        projectName: 'M. et Mme Martin',
        ready: false,
        next: { label: 'Saisir le bien vendeur', href: '/builder/p1/property' },
        missing: 'il manque : bien vendeur',
        declareReady: noop,
        revertToPreparation: noop,
        archive: noop,
      }),
    );
    expect(html).toMatch(/href="\/builder\/p1\/property"[^>]*>Saisir le bien vendeur →/);
    expect(html).toContain('aria-label="Plus d’actions"');
    expect(html).not.toContain('btn-filled');
    expect(html).not.toContain('>Supprimer<');
  });

  it('la carte n’a plus « Déclarer prêt » ni « Supprimer » à côté de son étape', () => {
    const page = read('src/app/(protected)/builder/(liste)/page.tsx');
    expect(page).toContain('PreparationCardActions');
    expect(page).not.toContain('ArchiveProjectButton');
    expect(page).not.toContain('Ouvrir le dossier');
    const actions = read('src/features/projects/components/preparation-card-actions.tsx');
    expect(actions).toContain('Déclarer prêt');
    expect(actions).toContain('Supprimer le dossier…');
    expect(actions).not.toContain('btnPrimary');
  });
});

describe('Concurrents : la synthèse en trois chiffres', () => {
  const summary = {
    selectedCount: 5,
    averagePrice: 702200,
    medianPrice: 715000,
    minimumPrice: 598000,
    maximumPrice: 779000,
    averageSurfaceArea: 131.6,
    averagePricePerSquareMeter: 5343,
    medianPricePerSquareMeter: 5436,
    warnings: [],
  } as unknown as ComparableSelectionSummary;

  it('« Plage des prix des concurrents », le mot de la M105, jamais « fourchette »', () => {
    expect(PRICE_SPREAD_LABEL).toBe('Plage des prix des concurrents');
    expect(priceSpread(summary).replace(/\s/g, ' ')).toBe('598 000 € à 779 000 €');
    expect(priceSpread({ ...summary, maximumPrice: 598000 }).replace(/\s/g, ' ')).toBe('598 000 €');
    expect(priceSpread({ ...summary, minimumPrice: null })).toBe('—');
  });

  it('trois chiffres : la plage, le prix médian au m², la surface moyenne', () => {
    const html = renderToStaticMarkup(createElement(ComparableSelectionSummaryView, { summary }));
    expect(html).toContain(PRICE_SPREAD_LABEL);
    expect(html).toContain('Prix médian au m²');
    expect(html).toContain('Surface moyenne');
    for (const gone of ['Prix moyen', 'Prix minimum', 'Prix maximum', 'Prix moyen au m²']) {
      expect(html).not.toContain(`>${gone}<`);
    }
    expect(html.toLowerCase()).not.toContain('fourchette');
  });

  it('aucune boîte du navigateur pour supprimer un concurrent', () => {
    expect(read('src/features/comparables/components/comparable-card.tsx')).not.toMatch(
      /window\.confirm\(/,
    );
  });

  it('l’en-tête ne garde qu’un plein : ni « Avant le rendez-vous → » ni « Trouver » en plein', () => {
    const page = read('src/app/(protected)/builder/[projectId]/comparables/page.tsx');
    expect(page).not.toContain('Avant le rendez-vous →');
    expect(page).not.toContain('btnPrimary');
  });
});

describe('« Lancer le Live » une seule fois par écran', () => {
  it('la Vue d’ensemble : celui du bloc « Prochaine étape » seul ; Concurrents : celui de l’en-tête', () => {
    const overview = read('src/app/(protected)/builder/[projectId]/page.tsx');
    expect(overview.match(/<LiveLaunchActions/g) ?? []).toHaveLength(1);
    const competitors = read('src/app/(protected)/builder/[projectId]/comparables/page.tsx');
    expect(competitors).not.toContain('LiveLaunchActions');
    expect(competitors).not.toContain('Lancer le Live');
  });

  it('« Avant le rendez-vous » ne le répète plus dans « Ce que verra le vendeur »', () => {
    const page = read('src/app/(protected)/builder/[projectId]/avant-rendez-vous/page.tsx');
    expect(page).not.toContain('LiveLaunchActions');
    expect(page).not.toContain('btnPrimary');
  });

  it('avant la décision ou les concurrents : « Lancer le Live quand même », en lien discret', () => {
    const page = read('src/app/(protected)/builder/[projectId]/avant-rendez-vous/page.tsx');
    expect(page).toContain('Lancer le Live quand même');
    expect(page).toMatch(/nextKey === 'decision' \|\| nextKey === 'competitors'/);
    expect(page).toMatch(
      /href=\{launchLiveHref\(projectId\)\}\s*className=\{`\$\{link\} text-sm`\}/,
    );
  });
});

describe('La liste du Live', () => {
  const row = (id: string, updatedAt: string, competitorCount = 3, documentOnly = false) => ({
    id,
    updatedAt,
    competitorCount,
    documentOnly,
  });

  it('d’abord les dossiers prêts pour le Live, puis les autres ; du plus récemment modifié', () => {
    const ordered = liveListOrder([
      row('a', '2026-11-01T10:00:00Z'),
      row('b', '2026-11-05T10:00:00Z', 0),
      row('c', '2026-11-03T10:00:00Z'),
      row('d', '2026-11-07T10:00:00Z', 4, true),
    ]);
    expect(ordered.map(({ row: r }) => r.id)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('seul le premier dossier prêt garde le bouton plein', () => {
    const ordered = liveListOrder([
      row('a', '2026-11-01T10:00:00Z'),
      row('c', '2026-11-03T10:00:00Z'),
    ]);
    expect(ordered.map((entry) => entry.primary)).toEqual([true, false]);
  });

  it('aucun dossier prêt pour le Live : aucun plein', () => {
    const ordered = liveListOrder([row('b', '2026-11-05T10:00:00Z', 0)]);
    expect(ordered[0]?.primary).toBe(false);
  });
});

describe('Le Suivi : un seul plein', () => {
  it('la première carte due, sauf quand un panneau à bouton plein est ouvert', () => {
    expect(suiviLeadId(['a', 'c'], null)).toBe('a');
    expect(suiviLeadId(['a', 'c'], 'b')).toBe('b');
    expect(suiviLeadId([], null)).toBeNull();
  });

  // Mission 146 (partie B, 32 bis) — après « J'ai relancé », la carte due suivante reprend le
  // plein, sans rechargement.
  it('une carte relancée cède le plein à la carte due suivante', () => {
    expect(suiviLeadId(['a', 'c'], null, new Set(['a']))).toBe('c');
    expect(suiviLeadId(['a', 'c'], null, new Set(['a', 'c']))).toBeNull();
    expect(suiviLeadId(['a', 'c'], 'b', new Set(['a']))).toBe('b');
    const row = read('src/features/meeting-conclusion/components/suivi-row.tsx');
    expect(row).toMatch(/settle\(/);
  });

  it('la pastille de filtre choisie n’est plus pleine', () => {
    const page = read('src/app/(protected)/suivi/page.tsx');
    expect(page).not.toMatch(
      /chipActive = `\$\{chip\} border-brand-deep bg-brand-deep text-white`/,
    );
  });
});

describe('L’accueil du Live (C8)', () => {
  const intro = (logo: string | null) =>
    renderToStaticMarkup(
      createElement(LivePageIntro, {
        comparablesCount: 5,
        sellerName: 'Mme Garcia',
        address: 'Vence',
        onStart: () => {},
        logoLightUrl: logo,
        agencyName: 'Agence Horizon Côte d’Azur',
      }),
    );

  it('sans logo : le nom de l’agence en grand dans la carte, une fois', () => {
    const html = intro(null);
    expect(html).toContain('data-testid="live-intro-agency"');
    expect(html.split('Agence Horizon Côte d’Azur')).toHaveLength(2);
    expect(html).not.toContain('Rendez-vous vendeur');
  });

  it('avec un logo : le logo dans la carte, pas le nom', () => {
    const html = intro('https://exemple.test/logo.png');
    expect(html).toContain('src="https://exemple.test/logo.png"');
    expect(html).not.toContain('data-testid="live-intro-agency"');
  });

  it('la carte prend toute la hauteur', () => {
    expect(intro(null)).toMatch(/data-testid="live-intro-card"[^>]*flex-1/);
  });

  it('le bandeau ne répète pas le nom sur l’accueil d’une agence sans logo', () => {
    const shell = read('src/features/live-seller/components/live-comparative-shell.tsx');
    expect(shell).toContain('isIntro && !hasAgencyLogo ? null');
  });
});

describe('le menu « … » reste dans la fenêtre (Prospection sur téléphone, 12/11)', () => {
  it('sorti à gauche : décalé vers la droite, à 8 px du bord', () => {
    expect(menuShift({ left: -150, right: 90 }, 390)).toBe(158);
  });
  it('sorti à droite : décalé vers la gauche', () => {
    expect(menuShift({ left: 200, right: 420 }, 390)).toBe(-38);
  });
  it('dans la fenêtre : rien ne bouge', () => {
    expect(menuShift({ left: 20, right: 300 }, 390)).toBe(0);
  });
});
