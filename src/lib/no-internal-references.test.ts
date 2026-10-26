import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Essai de Jean-Guy (26/10) — aucun texte interne à l'écran : ni numéro de mission (« M86 »), ni
// « règles du rapprochement ». Le test lit chaque fichier de `src` par l'arbre de TypeScript et
// ne garde que ce qui peut s'afficher — le texte JSX et les chaînes —, sans les commentaires, les
// imports ni les attributs de forme ou d'adresse (`className`, `d`, `href`, `viewBox`,
// `data-testid`). Tous les écrans sont couverts, ceux du conseiller compris.
const SRC = join(process.cwd(), 'src');
const INTERNAL = /\bM\d{2,3}\b|règles? du rapprochement/i;
const NOT_SHOWN = new Set(['className', 'd', 'href', 'viewBox', 'data-testid']);

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__fixtures__' ? [] : files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

function internalReferences(name: string, source: string): string[] {
  const file = ts.createSourceFile(
    name,
    source,
    ts.ScriptTarget.Latest,
    true,
    name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxAttribute(node) && NOT_SHOWN.has(node.name.getText(file))) return;
    const text =
      ts.isJsxText(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
        ? node.text
        : null;
    if (text && INTERNAL.test(text)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      found.push(`${name}:${line} « ${text.trim().slice(0, 80)} »`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

describe('aucun texte interne à l’écran', () => {
  it('le lecteur trouve un numéro de mission dans un texte, jamais dans un commentaire', () => {
    const sample = `// M86 dans un commentaire
      export const Hint = () => (
        <p className="M86">Les règles du rapprochement (M86) {'Voir M118'}</p>
      );`;
    expect(internalReferences('sample.tsx', sample)).toHaveLength(2);
    expect(internalReferences('sample.tsx', '/* M86 */ export const ok = "Mme Martin";')).toEqual(
      [],
    );
  });

  it('aucun écran ne dit « M86 » ni « règles du rapprochement »', () => {
    const found = files(SRC).flatMap((path) =>
      internalReferences(relative(SRC, path), readFileSync(path, 'utf8')),
    );
    expect(found).toEqual([]);
  });
});
