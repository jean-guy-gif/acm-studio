import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { frenchSpacingFaults, NARROW_NBSP, NBSP } from '@/lib/typography/french-spacing';

// Lot A (Jean-Guy, 27/11) — aucun texte ne peut couper une ligne avant « : ; ? ! », ni à
// l'intérieur de « » : une seule règle pour tous les textes visibles et tous les documents
// imprimés. Le test lit chaque texte par l'arbre de TypeScript, comme `no-usage-cost.test.ts` : le
// texte JSX tel que React l'affiche (lignes jointes, entités décodées, ses voisins `{' '}`
// compris), les chaînes et les gabarits, et refuse toute espace où la ligne peut se couper.
const SRC = join(process.cwd(), 'src');

// Tout `src`, sauf ce qui ne s'affiche pas ou ne doit pas changer, avec la raison.
const OUTSIDE = [
  // Les textes figés de l'offre d'achat et du bon de visite (ce qui compose le texte signé), leur
  // traduction, et les deux documents signés qui les impriment : validés et signés tels quels
  // (Jean-Guy, 27/11). Leurs formulaires et leurs messages suivent la règle.
  /^features\/purchase-offer\/services\/(offer-text|amount-in-words)\.ts$/,
  /^features\/visit-voucher\/services\/(voucher-text|voucher-fields|outside-mandate|tour-voucher)\.ts$/,
  /^features\/legal-translation\//,
  /^features\/purchase-offer\/components\/offer-document\.tsx$/,
  /^features\/visit-voucher\/components\/voucher-document\.tsx$/,
  // Les consignes envoyées à l'IA : elles ne s'affichent pas, et elles ont été mesurées telles
  // quelles sur le vrai modèle (M151).
  /^features\/buyer-notes\/model-request\.ts$/,
  /^features\/soft-ranking\/ranking-request\.ts$/,
  /^features\/soft-ranking\/photo-request\.ts$/,
  // Les données et les aides des tests.
  /^test-fixtures\//,
];

// Ce qui ne s'affiche pas : la forme, les adresses, les repères des tests.
const NOT_SHOWN = new Set([
  'className',
  'd',
  'href',
  'src',
  'viewBox',
  'data-testid',
  'id',
  'key',
  'name',
  'type',
  'role',
  'rel',
  'target',
  'method',
  'htmlFor',
  'inputMode',
  'autoComplete',
  'pattern',
]);

// Un texte JSX tel que React l'affiche : chaque ligne perd ses espaces de bord, les lignes vides
// partent, les autres se joignent d'une espace (comme Babel et TypeScript).
function jsxTextValue(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  if (lines.length === 1) return decodeEntities(raw);
  const kept: string[] = [];
  lines.forEach((line, index) => {
    let text = line.replace(/\t/g, ' ');
    if (index !== 0) text = text.replace(/^ +/, '');
    if (index !== lines.length - 1) text = text.replace(/ +$/, '');
    if (text !== '') kept.push(text);
  });
  return decodeEntities(kept.join(' '));
}

const ENTITIES: Readonly<Record<string, string>> = {
  '&nbsp;': NBSP,
  '&#160;': NBSP,
  '&#xa0;': NBSP,
  '&#x202f;': NARROW_NBSP,
  '&#8239;': NARROW_NBSP,
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};
const decodeEntities = (text: string) =>
  text.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#160|#xa0|#x202f|#8239);/gi, (entity) => {
    return ENTITIES[entity.toLowerCase()] ?? entity;
  });

// Une expression JSX opaque (`{name}`) compte pour un mot : rien ne se coupe entre elle et ce qui
// la touche, mais une espace qui la suit peut se couper.
const OPAQUE = 'X';

type Found = { line: number; text: string };

export function spacingFaultsIn(name: string, source: string): string[] {
  const file = ts.createSourceFile(
    name,
    source,
    ts.ScriptTarget.Latest,
    true,
    name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: Found[] = [];
  const lineOf = (node: ts.Node) =>
    file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
  const check = (node: ts.Node, text: string) => {
    for (const fault of frenchSpacingFaults(text)) {
      found.push({
        line: lineOf(node),
        text: text
          .slice(Math.max(0, fault.start - 30), fault.end + 20)
          .replace(/\s+/g, ' ')
          .trim(),
      });
    }
  };
  // Les enfants d'un élément JSX, lus ensemble : `{label}{' '}` puis « : 3 » se coupent aussi.
  const childrenText = (children: ts.NodeArray<ts.JsxChild>): string =>
    children
      .map((child) => {
        if (ts.isJsxText(child)) return jsxTextValue(child.text);
        if (ts.isJsxExpression(child) && child.expression) {
          const expression = child.expression;
          if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
            return expression.text;
          }
          return OPAQUE;
        }
        return OPAQUE;
      })
      .join('');
  const inStyle = (node: ts.Node) =>
    ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'style';
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isTypeNode(node)) return;
    // Le CSS d'une balise `<style>` et les motifs d'une expression régulière ne s'affichent pas.
    if (inStyle(node)) return;
    if (
      (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'RegExp'
    ) {
      return;
    }
    if (ts.isJsxAttribute(node)) {
      if (NOT_SHOWN.has(node.name.getText(file))) return;
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        check(node, decodeEntities(node.initializer.text));
        return;
      }
    }
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      if (ts.isJsxElement(node)) visit(node.openingElement);
      check(node, childrenText(node.children));
      // Les enfants sont lus ensemble ; leurs propres éléments et expressions le sont ensuite.
      node.children.forEach((child) => {
        if (ts.isJsxText(child)) return;
        if (
          ts.isJsxExpression(child) &&
          child.expression &&
          (ts.isStringLiteral(child.expression) ||
            ts.isNoSubstitutionTemplateLiteral(child.expression))
        ) {
          return;
        }
        visit(child);
      });
      return;
    }
    // Le nom d'une propriété (`'Prix : 3': …`) ne s'affiche pas.
    const isName =
      node.parent != null &&
      (ts.isPropertyAssignment(node.parent) || ts.isPropertyDeclaration(node.parent)) &&
      node.parent.name === node;
    if (!isName && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
      check(node, node.text);
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      check(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found.map(({ line, text }) => `${name}:${line} « ${text} »`);
}

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__fixtures__' ? [] : files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

describe('la règle des espaces insécables', () => {
  it('refuse une espace où la ligne peut se couper, devant « : ; ? ! » et dans « »', () => {
    expect(frenchSpacingFaults('Prix : 3')).toHaveLength(1);
    expect(frenchSpacingFaults('Prêt ?')).toHaveLength(1);
    expect(frenchSpacingFaults('Oui ; non')).toHaveLength(1);
    expect(frenchSpacingFaults('Bravo !')).toHaveLength(1);
    expect(frenchSpacingFaults('« Oui »')).toHaveLength(2);
    // Plusieurs espaces de suite : la ligne peut se couper entre elles.
    expect(frenchSpacingFaults(`Prix ${NBSP}: 3`)).toHaveLength(1);
  });

  it('accepte l’espace insécable avant « : » et dans « », la fine avant « ; ? ! »', () => {
    expect(frenchSpacingFaults(`Prix${NBSP}: 3`)).toEqual([]);
    expect(frenchSpacingFaults(`Prêt${NARROW_NBSP}?`)).toEqual([]);
    expect(frenchSpacingFaults(`Oui${NARROW_NBSP}; non`)).toEqual([]);
    expect(frenchSpacingFaults(`«${NBSP}Oui${NBSP}»`)).toEqual([]);
    // Sans espace, rien ne se coupe ; une adresse, une heure non plus.
    expect(frenchSpacingFaults('https://exemple.fr/?a=1 · 12:30')).toEqual([]);
    // Après « · », un symbole : la légende de la grille.
    expect(frenchSpacingFaults('✗ non · ? à vérifier')).toEqual([]);
  });

  it('veut la bonne espace : la fine avant « ? », l’insécable avant « : »', () => {
    expect(frenchSpacingFaults(`Prêt${NBSP}?`)).toEqual([
      { start: 4, end: 5, mark: '?', expected: NARROW_NBSP },
    ]);
    expect(frenchSpacingFaults(`Prix${NARROW_NBSP}: 3`)).toHaveLength(1);
  });

  it('le lecteur lit le JSX comme React l’affiche, et laisse la forme et le CSS', () => {
    const sample = `export const A = ({ label }: { label: string }) => (
      <div className="a : b" title="Prix : 3">
        <p>
          Prix
          : 3
        </p>
        <p>{label}{' '}: suite</p>
        <p>{label}&nbsp;: bon</p>
        <p>Prêt&#x202f;?</p>
        <style>{'.a { color: red !important; }'}</style>
      </div>
    );
    export const B = 'Oui : non';
    export const C = \`\${label} : \${label}\`;
    export const D = new RegExp(' : ');
    export const E = { 'Clé : valeur': 1 };`;
    const found = spacingFaultsIn('sample.tsx', sample);
    expect(found.map((line) => line.replace(/ « .*/, ''))).toEqual([
      'sample.tsx:2',
      'sample.tsx:3',
      'sample.tsx:7',
      'sample.tsx:13',
      'sample.tsx:14',
    ]);
  });

  it('le guide de prise en main et les modèles d’e-mail suivent la même règle', () => {
    const pages = [
      'docs/guide/guide-de-prise-en-main.html',
      'supabase/templates/invite.html',
      'supabase/templates/recovery.html',
    ];
    const found = pages.flatMap((page) => {
      const text = decodeEntities(
        readFileSync(join(process.cwd(), page), 'utf8')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
          .replace(/<[^>]+>/g, ''),
      );
      return frenchSpacingFaults(text).map(
        (fault) =>
          `${page} « ${text.slice(Math.max(0, fault.start - 30), fault.end + 20).replace(/\s+/g, ' ')} »`,
      );
    });
    expect(found).toEqual([]);
  });

  it('aucun texte de l’application ne coupe une ligne devant la ponctuation', () => {
    const found = files(SRC)
      .map((path) => ({ path, name: relative(SRC, path) }))
      .filter(({ name }) => !OUTSIDE.some((rule) => rule.test(name)))
      .flatMap(({ path, name }) => spacingFaultsIn(name, readFileSync(path, 'utf8')));
    expect(
      found,
      'Espace ordinaire devant « : ; ? ! » ou dans « » : écrivez \\u00a0 (ou &nbsp; dans le JSX) avant « : » et dans « », \\u202f (ou &#x202f;) avant « ; ? ! ».',
    ).toEqual([]);
  });
});
