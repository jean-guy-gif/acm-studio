import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Lancement, mission 3 (suite, 25/11) — chez M. et Mme Mercier, une maison présentée le 13/11
// ressortait 1re du marché sous une autre annonce. L'écran reconnaît une annonce de la recherche par
// sa clé, l'identifiant du bien chez le fournisseur et sa ressemblance (`candidateTarget`, prouvé à
// part) : il doit lui passer le candidat lui-même, jamais une forme réduite.
const panel = readFileSync(
  'src/features/ideal-properties/components/ideal-properties-panel.tsx',
  'utf8',
);
const page = readFileSync('src/app/(protected)/acquereurs/[buyerId]/biens-ideaux/page.tsx', 'utf8');
const loader = readFileSync('src/features/ideal-properties/queries/load-ideal-panel.ts', 'utf8');

describe('les biens idéaux : « Déjà vus avec lui »', () => {
  it('une annonce de la recherche se reconnaît avec tout son candidat', () => {
    expect(panel).toContain(
      'seenOf(candidateTarget(targetKey(item, entry.candidate.url), entry.candidate))',
    );
  });

  it('le marché et « Nouveau cette semaine » passent par la même reconnaissance', () => {
    expect(panel).toMatch(/const showMarket = [\s\S]{0,120}marketSeenReason\(entry\) == null/);
    expect(panel).toMatch(
      /const watchEntries = \(watch\?\.entries \?\? \[\]\)\.filter\(showMarket\)/,
    );
  });

  // La refonte, lot C — ce que la page lit est sorti dans `loadIdealPanel` (la même lecture sert
  // « un bien à la fois » dans le détail d'Acquéreurs) : la page en passe tout au panneau.
  it('la page passe aussi les biens écartés pour lui, et les marques de ses sélections', () => {
    expect(loader).toContain('seen: seenFacts ?? [],');
    expect(loader).toContain('seenMarks: seenRead ? seenRead.marks(buyer.id) : [],');
    expect(page).toContain('const panel = await loadIdealPanel(buyer, profile);');
    expect(page).toMatch(/<IdealPropertiesPanel\s+\{\.\.\.panel\}/);
  });

  it('« Déjà vus avec lui » n’a pas de case « Retenir »', () => {
    const section = panel.slice(
      panel.indexOf('data-testid="ideal-seen"'),
      panel.indexOf('data-testid="ideal-seen-mention"'),
    );
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toContain('checkbox(');
    expect(section).not.toContain('type="checkbox"');
  });
});
