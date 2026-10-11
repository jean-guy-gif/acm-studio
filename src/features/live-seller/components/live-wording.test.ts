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

  it('« Quitter » ne mène ni à la préparation ni à la liste des autres clients', () => {
    const shell = shown('live-comparative-shell.tsx');
    expect(shell).not.toMatch(/\/presentation/);
    // Mission 92 — un écran neutre, « Rendez-vous en pause » ; jamais la liste `/live`.
    expect(shell).toContain('router.push(`/live/${projectId}/pause`)');
    expect(shell).not.toContain("router.push('/live')");
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
    // Mission 92 — les réponses sont figées : on ne « recommence » pas un rendez-vous.
    expect(actions).not.toMatch(/Recommencer/);
    expect(actions).toContain('resumeLabel');
  });
});

describe('le « prix souhaité vendeur » a quitté le Live (mission 91)', () => {
  it('ne se lit plus sur aucun écran du Live : la valeur perçue du début suffit (M82)', () => {
    const offenders = SELLER_SCREENS.filter((file) =>
      /souhaité|decision\??\.sellerPrice/.test(shown(file)),
    );
    expect(offenders).toEqual([]);
  });
});

describe('la fin du Live reste tournée vers le vendeur (mission 92)', () => {
  const SRC = join(process.cwd(), 'src');
  const read = (...parts: string[]): string => readFileSync(join(SRC, ...parts), 'utf8');
  // Les composants de `meeting-conclusion` que le Live affiche devant le vendeur : trouvés par
  // les imports des écrans du Live, pas par une liste tenue à la main.
  const borrowed = [
    ...new Set(
      SELLER_SCREENS.flatMap((file) =>
        [
          ...readFileSync(join(DIR, file), 'utf8').matchAll(
            /from '@\/features\/meeting-conclusion\/components\/([a-z-]+)'/g,
          ),
        ].map((match) => `${match[1]}.tsx`),
      ),
    ),
  ];
  const shownBorrowed = (file: string): string =>
    read('features', 'meeting-conclusion', 'components', file)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');

  it('couvre les composants de conclusion affichés dans le Live', () => {
    expect(borrowed).toContain('live-commercialization-price.tsx');
    const offenders = borrowed.filter((file) =>
      /(du|le|par le|au|un) vendeur\b|Prix conseillé|Marché calculé/i.test(shownBorrowed(file)),
    );
    expect(offenders).toEqual([]);
    expect(shownBorrowed('live-commercialization-price.tsx')).toContain(
      'Le prix que nous retenons ensemble. Rien n’est pré-rempli.',
    );
  });

  it('« Terminer le rendez-vous » ouvre l’écran neutre, jamais la conclusion du conseiller', () => {
    const shell = shown('live-comparative-shell.tsx');
    expect(shell).toContain('`/live/${projectId}/merci`');
    expect(shell).not.toMatch(/\/builder\/\$\{projectId\}\/conclusion/);
  });

  it('les écrans neutres ne reçoivent rien du dossier', () => {
    const screen = shown('live-neutral-screen.tsx');
    expect(screen).not.toMatch(/projectName|seller_name|sellerName|price|formatEuro/i);
    const context = read('features', 'live-seller', 'queries', 'get-neutral-screen-context.ts');
    const returned = context.slice(context.lastIndexOf('return {'));
    expect(returned).not.toMatch(/project\./);
    for (const route of ['merci', 'pause']) {
      const page = read('app', '(stage)', 'live', '[projectId]', route, 'page.tsx');
      expect(page).not.toMatch(/getProject\b|loadLivePresentation|seller_name|getSuiviDossiers/);
    }
  });

  it('une réponse déjà donnée se relit sans champ de saisie', () => {
    expect(shown('live-locked-answer.tsx')).toContain('Votre réponse');
    expect(shown('live-locked-answer.tsx')).not.toMatch(/<input|<textarea/);
    for (const file of [
      'live-page-price.tsx',
      'live-page-perceived.tsx',
      'live-page-duration.tsx',
    ]) {
      expect(shown(file)).toContain('LiveLockedAnswer');
    }
  });

  it('dit quand une réponse n’a pas pu être enregistrée, avec un bouton qui relance', () => {
    const shell = shown('live-comparative-shell.tsx');
    expect(shell).toContain('Une réponse n’a pas pu être enregistrée — touchez Réessayer');
    expect(shell).toMatch(/onClick=\{retryFailedSaves\}/);
  });
});
