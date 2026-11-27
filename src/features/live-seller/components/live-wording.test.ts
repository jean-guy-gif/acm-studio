import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { closingQuestion } from '@/features/live-seller/components/live-page-closing';
import { NO_COMPETITOR_REASON } from '@/features/live-seller/services/live-launch';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';

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
// Mission 140 — les mots des écrans vivent dans les textes du client : le français y est relu par
// les mêmes contrôles que le code des écrans (`shownTexts`), et chaque écran lit sa clé.
// Les textes vus par le vendeur : tout ce qui précède les textes de l'acquéreur (qui, eux, parlent
// du vendeur comme d'un tiers).
const shownTexts = (): string =>
  readFileSync(join(process.cwd(), 'src', 'lib', 'client-texts', 'fr.ts'), 'utf8')
    .split('\n  buyer: {')[0]!
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
const FR = FRENCH_TEXTS.live;

describe('le Live parle au vendeur, à la 2e personne (mission 89)', () => {
  it('ne parle plus du vendeur à la 3e personne sur son propre écran', () => {
    const offenders = SELLER_SCREENS.filter((file) =>
      /(du|le|par le|au|un) vendeur\b|vendeur a en tête/i.test(
        // « Rendez-vous vendeur » est le nom du rendez-vous, pas une adresse au vendeur.
        shown(file).replace(/Rendez-vous vendeur/g, ''),
      ),
    );
    expect(offenders).toEqual([]);
    expect(shownTexts()).not.toMatch(/(du|le|par le|au|un) vendeur\b|vendeur a en tête/i);
  });

  it('dit « vous » là où il disait « le vendeur »', () => {
    expect(FRENCH_TEXTS.common.yourAnswer).toBe('Votre réponse');
    expect(shown('live-page-competition.tsx')).toContain('texts.common.yourAnswer');
    expect(FR.price.label).toBe('Le prix que vous imaginez');
    expect(shown('live-page-price.tsx')).toContain('texts.live.price');
    expect(shown('live-page-price.tsx')).toContain('{t.label}');
    expect(FR.priceReveal.legend).toBe('Selon vous, ce prix est…');
    expect(shown('live-page-price-reveal-pilot.tsx')).toContain('{t.legend}');
    expect(FR.duration.why).toBe('Selon vous, pourquoi\u202f?');
    expect(FR.duration.label).toBe('La durée que vous imaginez');
    expect(shown('live-page-duration.tsx')).toContain('{t.why}');
    expect(shown('live-page-duration.tsx')).toContain('{t.label}');
    expect(FR.perceived.label).toBe('Votre valeur perçue');
    expect(shown('live-page-perceived.tsx')).toContain('{t.label}');
  });

  it('ne donne aucune consigne au conseiller devant le vendeur', () => {
    const offenders = SELLER_SCREENS.filter((file) =>
      /préparez le dossier|dans la Préparation|Aucun bien concurrent retenu/i.test(shown(file)),
    );
    expect(offenders).toEqual([]);
    expect(shownTexts()).not.toMatch(
      /préparez le dossier|dans la Préparation|Aucun bien concurrent retenu/i,
    );
  });

  it('appelle le prix calculé « Prix des concurrents », plus jamais « Prix conseillé »', () => {
    expect(FR.conclusion.competitorPrice).toBe('Prix des concurrents');
    expect(shown('live-page-conclusion.tsx')).toContain('{t.competitorPrice}');
    expect(SELLER_SCREENS.filter((file) => /Prix conseillé/i.test(shown(file)))).toEqual([]);
    expect(shownTexts()).not.toMatch(/Prix conseillé/i);
  });

  it('ne montre qu’un prix calculé au vendeur : jamais « Marché calculé »', () => {
    expect(
      SELLER_SCREENS.filter((file) => /Marché calculé|marché calculé/.test(shown(file))),
    ).toEqual([]);
    expect(shownTexts()).not.toMatch(/Marché calculé|marché calculé/);
    expect(FR.analysis.competitorPrice).toBe('Prix des concurrents');
    expect(shown('live-page-analysis.tsx')).toContain('label: t.competitorPrice');
  });

  it('« Quitter » ne mène ni à la préparation ni à la liste des autres clients', () => {
    const shell = shown('live-comparative-shell.tsx');
    expect(shell).not.toMatch(/\/presentation/);
    // Mission 92 — un écran neutre, « Rendez-vous en pause » ; jamais la liste `/live`.
    expect(shell).toContain('router.push(`/live/${projectId}/pause`)');
    expect(shell).not.toContain("router.push('/live')");
    expect(FR.shell.quitTitle).toContain('Quitter le rendez-vous');
    expect(shell).toContain('{t.quitTitle}');
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
    expect(NO_COMPETITOR_REASON).toBe('Retenez au moins un concurrent pour lancer le Live');
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
    expect(FR.conclusion.priceHint).toBe(
      'Le prix que nous retenons ensemble. Rien n’est pré-rempli.',
    );
    expect(shownBorrowed('live-commercialization-price.tsx')).toContain('{t.priceHint}');
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
    expect(shown('live-locked-answer.tsx')).toContain('texts.common.yourAnswer');
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
    expect(FR.shell.failedSave).toBe('Une réponse n’a pas pu être enregistrée — touchez Réessayer');
    expect(shell).toContain('t.failedSave');
    expect(shell).toMatch(/onClick=\{retryFailedSaves\}/);
  });
});

describe('le vendeur reformule son prix, puis lit le marché (mission 94)', () => {
  it('l’écran du prix reformulé ne révèle rien et ne se corrige plus', () => {
    const screen = shown('live-page-revised.tsx');
    expect(FR.revised.question).toBe(
      'Après avoir vu ces biens, à quel prix mettriez-vous votre bien en vente\u202f?',
    );
    expect(screen).toContain('{t.question}');
    expect(screen).toContain('LiveLockedAnswer');
    expect(screen).not.toMatch(/marketReading|priceGaps|competitiveMarketCentral|advisorRange/);
  });

  it('« Passer » n’envoie aucune réponse : un formulaire vide', () => {
    const shell = shown('live-comparative-shell.tsx');
    const skip = shell.slice(shell.indexOf('const skipRevisedPrice'));
    const body = skip.slice(0, skip.indexOf('\n  };'));
    expect(body).toContain('formData: new FormData()');
    expect(body).not.toMatch(/harvest\(|persistLiveSellerSummary|seller_revised_property_price/);
  });

  it('« Analyse des prix » dit le chemin du vendeur, et plus « observé sur le marché »', () => {
    const analysis = shown('live-page-analysis.tsx');
    expect(FR.analysis.pathStart('X')).toContain('Au début');
    expect(FR.analysis.pathAfter('X')).toContain('Après avoir vu le marché');
    expect(analysis).toContain('t.pathStart(');
    expect(analysis).toContain('t.pathAfter(');
    expect(analysis).not.toMatch(/observé sur le marché/);
    expect(JSON.stringify(FR.analysis)).not.toMatch(/observé sur le marché/);
    // La bande ne lit que la lecture venue du serveur (concurrents révélés), jamais la liste
    // des concurrents elle-même.
    expect(analysis).toContain('reading.prices');
    expect(analysis).not.toMatch(/comparables|SellerComparable/);
  });

  it('la phrase qui situe le prix ne lit que des prix déjà révélés', () => {
    expect(shown('live-page-conclusion.tsx')).toContain(
      'comparedPrices={advisorRange?.marketReading.prices ?? []}',
    );
  });

  // Décision de Laurent : on ne sait que les baisses CONNUES — le libellé le dit, côté vendeur
  // comme dans « Avant le rendez-vous », et la ligne disparaît quand aucune n'est connue.
  it('dit « Baisse de prix connue », jamais « Ont déjà baissé »', () => {
    const analysis = shown('live-page-analysis.tsx');
    const glance = readFileSync(
      join(
        process.cwd(),
        'src',
        'features',
        'before-meeting',
        'components',
        'market-glance-card.tsx',
      ),
      'utf8',
    );
    expect(glance).toContain("label: 'Baisse de prix connue'");
    expect(FR.analysis.dropped).toBe('Baisse de prix connue');
    expect(analysis).toContain('label: t.dropped');
    for (const source of [analysis, glance, shownTexts()]) {
      expect(source).not.toMatch(/Ont déjà baissé/);
    }
    // La ligne n'existe que si un nombre de baisses est connu.
    expect(glance).toMatch(
      /droppedCount\s!= null\) \{\s+figures\.push\(\{\s+label: 'Baisse de prix connue'/,
    );
    expect(analysis).toMatch(/droppedCount\s!= null\) \{\s+figures\.push\(\{\s+label: t\.dropped/);
  });
});

describe('le rythme accéléré parle au vendeur comme le reste du Live (mission 95)', () => {
  it('les deux nouveaux écrans sont couverts par le contrôle de vocabulaire', () => {
    expect(SELLER_SCREENS).toContain('live-page-quick-guess.tsx');
    expect(SELLER_SCREENS).toContain('live-page-quick-reveal.tsx');
    expect(shown('live-page-quick-guess.tsx')).toContain('texts.live.price.label');
    // Mission 148 — « Votre réponse », en couleur, vient du composant partagé de l'écart.
    expect(shown('live-page-quick-reveal.tsx')).toContain('<LiveGuessGap');
    expect(shown('live-guess-gap.tsx')).toContain('texts.common.yourAnswer');
    expect(shown('live-page-quick-reveal.tsx')).toContain('texts.live.duration.label');
  });

  it('l’écran 1 ne peut montrer aucun prix : il ne lit que la donnée projetée', () => {
    const guess = shown('live-page-quick-guess.tsx');
    expect(guess).toContain('entry: SellerComparable');
    expect(guess).not.toMatch(/AuthorizedSellerComparable|entry\.price|entry\.title|priceReveal/);
    expect(guess).toContain('neutralComparableLabel(entry, language)');
    expect(guess).toContain('LiveLockedAnswer');
  });

  it('l’écran 2 n’affiche la durée observée que si le serveur l’a livrée', () => {
    const reveal = shown('live-page-quick-reveal.tsx');
    expect(reveal).toContain('entry: AuthorizedSellerComparable');
    expect(reveal).toMatch(/durationRevealed && entry\.marketDuration \?/);
  });

  it('la durée du Live ne se montre jamais au vendeur', () => {
    const offenders = SELLER_SCREENS.filter((file) =>
      /liveDurationLabel|Durée du Live|live_started_at|live_ended_at/.test(shown(file)),
    );
    expect(offenders).toEqual([]);
  });
});
