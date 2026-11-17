import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Mission 140 — « aucun texte client en dur hors des fichiers de langue » (fiche, Preuves) : chaque
// écran du Live et chaque document remis au vendeur est lu par l'arbre de TypeScript ; un texte JSX
// ou une chaîne qui ressemble à du français n'y a pas sa place, sauf ce qui est écrit ici : ce que
// voit le conseiller (le menu « Réglages », la bulle des acquéreurs, le journal) et les mentions
// légales de l'agence, en français jusqu'à la décision du juriste (Jean-Guy, 06/11).
const ROOT = process.cwd();
const LIVE = 'src/features/live-seller/components';
const FILES = [
  ...readdirSync(join(ROOT, LIVE))
    .filter((file) =>
      /^live-(page-.*|comparative-shell|locked-answer|duration-reveal|feature-comparison|comparable-header|gallery|photo|competitor-review|buyers-badge|resume-link|neutral-screen)\.tsx$/.test(
        file,
      ),
    )
    .map((file) => `${LIVE}/${file}`),
  'src/features/meeting-conclusion/components/live-commercialization-price.tsx',
  'src/features/seller-synthesis/components/seller-synthesis-document.tsx',
  'src/features/market-update/components/market-update-document.tsx',
  'src/features/market-update/components/price-ranking.tsx',
  'src/features/market-study/components/market-study-document.tsx',
  'src/features/neighbourhood-link/components/neighbourhood-link-block.tsx',
  // Mission 159 — le quartier montré au vendeur : les dessins, leurs mots et le bloc imprimé.
  'src/features/neighbourhood-link/components/neighbourhood-drawings.tsx',
  'src/features/neighbourhood-link/components/neighbourhood-document.tsx',
  'src/features/neighbourhood-link/services/neighbourhood-view.ts',
  'src/features/live-seller/services/price-position.ts',
  'src/features/live-seller/services/market-reading.ts',
  'src/features/live-seller/services/pending-before-analysis.ts',
  'src/features/live-seller/services/live-buyers.ts',
  'src/features/market-update/services/price-ranking.ts',
  'src/features/market-study/services/build-market-study.ts',
  'src/features/seller-synthesis/services/build-seller-synthesis.ts',
  'src/features/live-seller/utils/neutral-comparable-label.ts',
  // Mission 140 B — ce que voit l'acquéreur : la présentation, le lien, le PDF, ses messages.
  'src/features/buyer-deck/components/deck-presentation.tsx',
  'src/features/buyer-deck/components/deck-marks.tsx',
  'src/features/buyer-deck/services/buyer-deck.ts',
  'src/features/buyer-deck/services/deck-navigation.ts',
  'src/features/buyer-dossier/components/dossier-phone-deck.tsx',
  'src/features/buyer-dossier/components/buyer-dossier-document.tsx',
  'src/features/buyer-dossier/services/dossier-share.ts',
];

const LEGAL = ['Carte professionnelle', 'délivrée par', 'Ne peut recevoir aucun fonds'];
const ADVISOR: Record<string, string[]> = {
  // La relecture d'une présentation terminée : la note du conseiller, qui mène à ses biens idéaux.
  'deck-presentation.tsx': [
    'Présentation terminée le',
    ': pour en refaire une,',
    'retenez une nouvelle sélection',
  ],
  'live-buyers-badge.tsx': ['Acquéreurs de l’agence', 'acquéreurs prêts', 'Montrer au vendeur'],
  'live-comparative-shell.tsx': [
    '[live] enregistrement échoué',
    'Enregistrement de fond échoué (',
    '[live] enregistrement injoignable',
    'Enregistrement de fond injoignable (',
    'Réseau indisponible.',
    'Le changement n’a pas pu être enregistré.',
    'Réponse non enregistrée. Relancez avant de continuer.',
    'Réglages',
    'Reprendre le Live interactif',
    'Passer en présentation directe',
    'Télécharger l’Étude de marché',
    'Passer les écrans en français',
    'Passer les écrans en anglais',
  ],
};

// `rel` et `target` (un lien qui s'ouvre dans un nouvel onglet, M157 B) ne se lisent pas à l'écran.
const NOT_SHOWN = new Set([
  'className',
  'd',
  'href',
  'viewBox',
  'name',
  'type',
  'role',
  'key',
  'rel',
  'target',
]);
const FRENCH = /[a-zà-ÿ’]{2,}[ \u00a0][a-zà-ÿ’]{2,}|[à-ÿ]/i;
const isClassList = (text: string): boolean => {
  const tokens = text.trim().split(/\s+/);
  return (
    tokens.every((token) => /^[!\w:/.[\]%&>*()-]+$/.test(token)) &&
    tokens.some((token) => /[-:[]/.test(token))
  );
};

function frenchTexts(path: string): string[] {
  const name = path.split('/').pop() as string;
  const allowed = new Set(['use client', ...LEGAL, ...(ADVISOR[name] ?? [])]);
  const file = ts.createSourceFile(
    name,
    readFileSync(join(ROOT, path), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxAttribute(node)) {
      const attribute = node.name.getText(file);
      if (NOT_SHOWN.has(attribute) || attribute.startsWith('data-')) return;
    }
    const text =
      ts.isJsxText(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
        ? node.text.trim()
        : null;
    if (text && FRENCH.test(text) && !isClassList(text) && !allowed.has(text)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      found.push(`${name}:${line} « ${text.slice(0, 80)} »`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

describe('aucun texte client en dur hors des fichiers de langue', () => {
  it('le lecteur trouve une phrase française dans le code, jamais dans un commentaire', () => {
    expect(FRENCH.test('Votre réponse')).toBe(true);
    expect(isClassList('flex flex-col gap-2 sm:flex-row')).toBe(true);
    expect(isClassList('Revoir les photos')).toBe(false);
  });

  it('les écrans du Live et les documents du vendeur lisent leurs mots dans les textes du client', () => {
    expect(FILES.flatMap(frenchTexts)).toEqual([]);
  });
});
