import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { closingQuestion } from '@/features/live-seller/components/live-page-closing';
import { NO_COMPETITOR_REASON } from '@/features/live-seller/components/live-launch-actions';

const DIR = join(process.cwd(), 'src', 'features', 'live-seller', 'components');
// Ce qui s'affiche : le code sans ses commentaires.
const shown = (file: string): string =>
  readFileSync(join(DIR, file), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
// Les écrans tournés vers le vendeur (la liste du Live, elle, est un écran conseiller).
const SELLER_SCREENS = readdirSync(DIR).filter((file) =>
  /^live-(page-.*|comparative-shell)\.tsx$/.test(file),
);

describe('le Live parle au vendeur, à la 2e personne (mission 89)', () => {
  it('ne parle plus du vendeur à la 3e personne sur son propre écran', () => {
    const offenders = SELLER_SCREENS.filter((file) =>
      /(du|le|par le|au|un) vendeur\b|vendeur a en tête/i.test(
        // « Rendez-vous vendeur » est le nom du rendez-vous, pas une adresse au vendeur.
        shown(file).replace(/Rendez-vous vendeur/g, ''),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('dit « vous » là où il disait « le vendeur »', () => {
    expect(shown('live-page-competition.tsx')).toContain('Votre réponse');
    expect(shown('live-page-price.tsx')).toContain('Le prix que vous imaginez');
    expect(shown('live-page-price-reveal-pilot.tsx')).toContain('Selon vous, ce prix est…');
    expect(shown('live-page-duration.tsx')).toContain('Selon vous, pourquoi ?');
    expect(shown('live-page-duration.tsx')).toContain('La durée que vous imaginez');
    expect(shown('live-page-perceived.tsx')).toContain('Votre valeur perçue');
  });

  it('ne donne aucune consigne au conseiller devant le vendeur', () => {
    const offenders = SELLER_SCREENS.filter((file) =>
      /préparez le dossier|dans la Préparation|Aucun bien concurrent retenu/i.test(shown(file)),
    );
    expect(offenders).toEqual([]);
  });

  it('appelle le prix calculé « Prix des concurrents », plus jamais « Prix conseillé »', () => {
    expect(shown('live-page-conclusion.tsx')).toContain('Prix des concurrents');
    expect(SELLER_SCREENS.filter((file) => /Prix conseillé/i.test(shown(file)))).toEqual([]);
  });

  it('ne montre qu’un prix calculé au vendeur : jamais « Marché calculé »', () => {
    expect(
      SELLER_SCREENS.filter((file) => /Marché calculé|marché calculé/.test(shown(file))),
    ).toEqual([]);
    expect(shown('live-page-analysis.tsx')).toContain('Prix des concurrents');
  });

  it('« Quitter » ne mène plus à la page de préparation', () => {
    const shell = shown('live-comparative-shell.tsx');
    expect(shell).not.toMatch(/\/presentation/);
    expect(shell).toContain("router.push('/live')");
    expect(shell).toContain('Quitter le rendez-vous');
    expect(shell).not.toMatch(/window\.confirm|confirm\(/);
  });
});

describe('la question de 1 à 10', () => {
  it('dit « à ce prix » seulement si un prix de commercialisation est enregistré', () => {
    expect(closingQuestion(true)).toContain('pour lancer la vente à ce prix');
    expect(closingQuestion(false)).toContain('pour lancer la vente');
    expect(closingQuestion(false)).not.toContain('à ce prix');
  });
});

describe('la liste du Live (écran conseiller)', () => {
  it('dit pourquoi un dossier sans concurrent ne se lance pas', () => {
    expect(NO_COMPETITOR_REASON).toMatch(/^Aucun concurrent retenu/);
    const actions = shown('live-launch-actions.tsx');
    expect(actions).toContain('disabled');
    expect(actions).toContain('Recommencer depuis le début');
  });
});
