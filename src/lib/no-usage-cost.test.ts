import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Lancement, mission 5 (Jean-Guy, 23/11) — plus aucun coût en euros devant le conseiller : ni pour
// chercher des concurrents, ni pour une sélection d'acquéreur, ni pour le suivi et la veille, ni
// pour l'IA. Les prix des biens restent ; les coûts et les plafonds restent visibles pour
// l'opérateur seul (`/erreurs`). Le test parcourt tous les écrans par l'arbre de TypeScript, comme
// `no-internal-references.test.ts` : il ne garde que ce qui peut s'afficher (texte JSX, chaînes),
// et refuse tout montant ou tout mot de coût lié à l'usage.
const SRC = join(process.cwd(), 'src');

// Un coût d'usage : un montant à centimes (« 0,60 € » — un prix de bien n'en a pas), un montant
// « par recherche » ou « par mois », et les mots qui annoncent une dépense.
// « facturé », « payé » : sans borne de mot après « é », que les expressions régulières ne tiennent
// pas pour une lettre. « Gratuit » est le miroir de « payant » : ce qui ne compte pas dans le
// forfait se dit ainsi.
const USAGE_COST =
  /\d,\d{2}\s*€|€\s+par\s+(recherche|mois)|payant|\bpayer\b|\bpayé|\bfacturé|\bcoûts?\b|\bcoûté|\bgratuit|budget de (recherche|lecture)|budget du mois|plafond du mois/i;
// Ce qui affiche un coût par un calcul : ces fonctions ne servent qu'à l'opérateur ; un écran
// (`.tsx`) ne lit jamais un montant d'usage en centimes (`spentCents`, `capCents`…) ; et nulle
// part un montant d'usage n'est mis en euros (`formatEuro(budget.spentCents / 100)`,
// `formatEuro(found.billed * 0.01)`).
const COST_HELPERS = /^(euroCost|budgetUsageLabel|watchUsageLabel)$/;
const CENTS = /Cents$/;
const USAGE_AMOUNT = /Cents\b|\bbilled\b|\badverts\b|PER_ADVERT|millicents/i;
const NOT_SHOWN = new Set(['className', 'd', 'href', 'viewBox', 'data-testid']);

// Réservé à l'opérateur : il voit les coûts et règle les plafonds.
const OPERATOR_ONLY = [/^app\/\(protected\)\/erreurs\//, /^features\/operations\//];
// Hors des écrans du conseiller, avec la raison.
const NOT_ADVISOR_SCREENS = [
  // Textes validés par la juriste : on n'y touche pas (ils parlent du budget de l'agence, des
  // honoraires, du prix payé à l'acte).
  /^app\/confidentialite\//,
  /^features\/purchase-offer\//,
  /^features\/visit-voucher\//,
  /^features\/legal-translation\//,
  // Les données inventées de la démo et les jeux des tests.
  /^features\/demo\/data\//,
  /^test-fixtures\//,
];

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__fixtures__' ? [] : files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

function usageCosts(name: string, source: string): string[] {
  const file = ts.createSourceFile(
    name,
    source,
    ts.ScriptTarget.Latest,
    true,
    name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const at = (node: ts.Node) => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isJsxAttribute(node) && NOT_SHOWN.has(node.name.getText(file))) return;
    // Un montant LU dans un écran ; le passer tel quel à un garde du serveur (`agencyCapCents: …`)
    // n'affiche rien.
    const passedOn =
      node.parent != null && ts.isPropertyAssignment(node.parent) && node.parent.name === node;
    if (
      ts.isIdentifier(node) &&
      (COST_HELPERS.test(node.text) ||
        (name.endsWith('.tsx') && CENTS.test(node.text) && !passedOn))
    ) {
      found.push(`${name}:${at(node)} ${node.text}`);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'formatEuro' &&
      node.arguments.length > 0 &&
      USAGE_AMOUNT.test(node.arguments[0]!.getText(file))
    ) {
      found.push(`${name}:${at(node)} formatEuro(${node.arguments[0]!.getText(file)})`);
    }
    const text =
      ts.isJsxText(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
        ? node.text
        : null;
    if (text && USAGE_COST.test(text)) {
      found.push(`${name}:${at(node)} « ${text.trim().replace(/\s+/g, ' ').slice(0, 90)} »`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

describe('aucun coût en euros devant le conseiller', () => {
  it('le lecteur trouve un coût d’usage dans un texte, jamais dans un commentaire ni un prix de bien', () => {
    const sample = `// 0,60 € dans un commentaire
      export const Hint = () => (
        <p className="payant">Coût maximal : 0,60 € par recherche {'Lancer et payer'} {euroCost(3)}</p>
      );`;
    expect(usageCosts('sample.tsx', sample)).toHaveLength(3);
    expect(
      usageCosts('sample.tsx', 'export const A = () => <p>{budget.spentCents / 100}</p>;'),
    ).toEqual(['sample.tsx:1 spentCents']);
    expect(
      usageCosts('sample.tsx', 'export const ok = "Prix affiché : 779 000 € · 5 564 €/m²";'),
    ).toEqual([]);
    // Le masculin singulier, et un montant d'usage mis en euros dans un service.
    expect(
      usageCosts('sample.ts', 'export const a = "Rien n’est facturé."; const b = "Déjà payé";'),
    ).toHaveLength(2);
    expect(
      usageCosts('sample.ts', 'export const c = (n: number) => formatEuro(found.billed * 0.01);'),
    ).toEqual(['sample.ts:1 formatEuro(found.billed * 0.01)']);
    expect(
      usageCosts('sample.ts', 'export const d = formatEuro(budget.capCents / 100);'),
    ).toHaveLength(1);
    expect(
      usageCosts('sample.ts', 'export const m = "Votre forfait du mois est atteint";'),
    ).toEqual([]);
  });

  it('aucun écran du conseiller ne dit un coût d’usage', () => {
    const found = files(SRC)
      .map((path) => ({ path, name: relative(SRC, path) }))
      .filter(
        ({ name }) =>
          !OPERATOR_ONLY.some((rule) => rule.test(name)) &&
          !NOT_ADVISOR_SCREENS.some((rule) => rule.test(name)),
      )
      .flatMap(({ path, name }) => usageCosts(name, readFileSync(path, 'utf8')));
    expect(found).toEqual([]);
  });
});
