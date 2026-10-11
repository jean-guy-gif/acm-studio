// Mission 95 — embarque dans le dépôt les polices que `next/font/google` téléchargeait à CHAQUE
// compilation (ce téléchargement a fait échouer trois déploiements). Lancé À LA MAIN, une fois,
// ou pour ajouter une famille : `node scripts/embed-google-fonts.mjs`. Jamais pendant un build.
//
// Il prend exactement ce que servait Google Fonts (mêmes fichiers woff2, mêmes plages
// d'alphabets) et les mêmes mesures de police de repli que next/font : le rendu ne change pas.
// Licence : SIL Open Font License 1.1 pour les six familles (OFL.txt copié à côté).
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const {
  getFallbackFontOverrideMetrics,
} = require('next/dist/compiled/@next/font/dist/google/get-fallback-font-override-metrics');

const ROOT = resolve(import.meta.dirname, '..', 'src', 'features', 'branding', 'fonts');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// slug (= dossier, = fin de la variable CSS), famille Google, graisses, dossier de la licence.
const FAMILIES = [
  { slug: 'montserrat', family: 'Montserrat', weights: [400, 500, 600, 700], ofl: 'montserrat' },
  { slug: 'rajdhani', family: 'Rajdhani', weights: [500, 600, 700], ofl: 'rajdhani' },
  { slug: 'poppins', family: 'Poppins', weights: [400, 500, 600, 700], ofl: 'poppins' },
  {
    slug: 'source-sans',
    family: 'Source Sans 3',
    weights: [400, 500, 600, 700],
    ofl: 'sourcesans3',
  },
  { slug: 'work-sans', family: 'Work Sans', weights: [400, 500, 600, 700], ofl: 'worksans' },
  { slug: 'nunito-sans', family: 'Nunito Sans', weights: [400, 500, 600, 700], ofl: 'nunitosans' },
];

async function get(url, as = 'text') {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return as === 'text' ? response.text() : Buffer.from(await response.arrayBuffer());
}

for (const { slug, family, weights, ofl } of FAMILIES) {
  const dir = join(ROOT, slug);
  mkdirSync(dir, { recursive: true });
  const css = await get(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${weights.join(';')}&display=swap`,
  );

  // Chaque bloc : /* alphabet */ @font-face { … src: url(https://fonts.gstatic.com/…woff2) … }
  const files = new Map(); // url distante → nom local
  const blocks = [];
  for (const match of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]*)\}/g)) {
    const [, subset, body] = match;
    const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(body)?.[1];
    const weight = /font-weight: ([\d ]+);/.exec(body)?.[1].trim();
    if (!url || !weight) {
      throw new Error(`Bloc illisible pour ${family} (${subset}).`);
    }
    if (!files.has(url)) {
      // Une police variable sert le même fichier pour toutes les graisses d'un alphabet.
      const shared = [...css.matchAll(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))]
        .length;
      files.set(url, shared > 1 ? `${slug}-${subset}.woff2` : `${slug}-${subset}-${weight}.woff2`);
    }
    blocks.push(
      `/* ${subset} */\n@font-face {${body.replace(`url(${url})`, `url('./${files.get(url)}')`)}}`,
    );
  }
  if (blocks.length === 0) {
    throw new Error(`Aucune police reçue pour ${family}.`);
  }
  for (const [url, name] of files) {
    writeFileSync(join(dir, name), await get(url, 'buffer'));
  }

  const fallback = getFallbackFontOverrideMetrics(family);
  const fallbackCss = fallback
    ? `/* La police de repli, ajustée aux mesures de ${family} comme le faisait next/font : pas de
   saut de mise en page pendant le chargement. */
@font-face {
  font-family: '${family} Fallback';
  src: local('${fallback.fallbackFont}');
  ascent-override: ${fallback.ascentOverride};
  descent-override: ${fallback.descentOverride};
  line-gap-override: ${fallback.lineGapOverride};
  size-adjust: ${fallback.sizeAdjust};
}

`
    : '';
  const stack = fallback ? `'${family}', '${family} Fallback'` : `'${family}'`;
  writeFileSync(
    join(dir, `${slug}.css`),
    `/* Mission 95 — la police ${family}, EMBARQUÉE dans le dépôt (licence SIL Open Font License
   1.1, voir OFL.txt). Ce sont les fichiers que Google Fonts servait, un par alphabet${
     [...files.values()].some((name) => /-\d+\.woff2$/.test(name)) ? ' et par graisse' : ''
   } : le
   rendu ne change pas. Ils ne sont plus téléchargés à chaque compilation. Le navigateur ne
   charge un fichier que si un texte affiché en a besoin (unicode-range), comme avant.
   Fichier produit par scripts/embed-google-fonts.mjs. */

${blocks.join('\n\n')}

${fallbackCss}/* La variable que lit la charte de l'agence (font-registry.ts). */
:root {
  --font-${slug}: ${stack};
}
`,
  );
  writeFileSync(
    join(dir, 'OFL.txt'),
    await get(`https://raw.githubusercontent.com/google/fonts/main/ofl/${ofl}/OFL.txt`),
  );
  console.log(`${family} : ${files.size} fichiers, ${blocks.length} blocs.`);
}
