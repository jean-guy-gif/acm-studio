// Le banc de l'Étude imprimée : `npm run banc:etude`, après `npm run build`.
//
// Les pages de l'Étude sont décidées par le code (`study-print.ts`) sur des hauteurs estimées : si
// un bloc est estimé trop court, sa page sort de sa feuille, et les numéros de page comme les renvois
// du résumé deviennent faux. Le banc fabrique un millier d'Études (français et anglais, de 1 à 12
// concurrents, avec ou sans prix, chaque jeu de blocs du quartier, maison ou appartement, avec ou
// sans lien « Vivre ici »), les ouvre dans Chromium à l'impression, et mesure chaque bloc face à
// son estimation : avec Montserrat et Rajdhani, puis avec chaque police de charte, rendue comme sur
// le lien public (les titres seuls la prennent) et comme dans l'outil (tout le texte la prend).
//
// Il échoue si une page déborde de sa feuille, ou si un bloc est estimé trop court de plus de
// 0,6 mm. Il relit aussi, sur les pages réellement imprimées, les règles de l'avis (Jean-Guy,
// 23/11) : jamais un avis seul sur une page ; « La suite » d'un seul tenant, sauf sous un avis qui
// ouvre sa page et sous lequel elle ne tient pas entière — elle se coupe alors après « Les papiers
// à réunir », et nulle part ailleurs. L'e2e ne peut pas voir ces cas : il n'imprime que les
// dossiers de la démo.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const FONTS = ['montserrat', 'inter', 'poppins', 'source-sans', 'work-sans', 'nunito-sans'];
const WORKERS = 6;
// Un bloc estimé plus court que mesuré, au-delà de cette tolérance, fait échouer le banc.
const SHORT_MM = 0.6;
const OVERFLOW_MM = 0.3;

function generate(font) {
  const result = spawnSync('npx', ['vitest', 'run', '-c', 'tests/print/vitest.config.ts'], {
    env: {
      ...process.env,
      BANC_POLICE: font ?? '',
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'x',
    },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(
      `Les Études du banc n'ont pas pu être fabriquées (${font ?? 'police par défaut'}).`,
    );
  }
}

async function measure(browser, font, inApp) {
  const dir = path.resolve('tests/print/.banc', font ?? 'defaut');
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.html'))
    .sort();
  const pages = [];
  const worker = async (list) => {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.route(/^https?:/, (route) => route.abort());
    await page.emulateMedia({ media: 'print' });
    for (const file of list) {
      await page.goto(`file://${dir}/${file}`);
      // Dans l'outil, la charte est posée à la racine : tout le texte prend la police de l'agence.
      if (font && inApp)
        await page.addStyleTag({
          content: `:root{--font-sans:var(--font-${font}),sans-serif;--font-title:var(--font-${font}),sans-serif}`,
        });
      await page.evaluate(() => document.fonts.ready);
      const frames = await page.locator('[data-print-page]').evaluateAll((nodes) =>
        nodes.slice(1).map((node) => {
          const body = node.querySelector('[data-print-body]');
          const units = body ? [...body.querySelectorAll(':scope > [data-print-unit]')] : [];
          const boxes = units.map((unit) => unit.getBoundingClientRect());
          const mm = 25.4 / 96;
          return {
            number: Number(node.getAttribute('data-print-page')),
            over: boxes.length
              ? (boxes.at(-1).bottom - boxes[0].top - Number(body.getAttribute('data-room-px'))) *
                mm
              : 0,
            units: units.map((unit, index) => ({
              kind: unit.getAttribute('data-print-unit'),
              // L'estimation compte l'espace de 3 mm qui suit le bloc.
              short: boxes[index].height * mm + 3 - Number(unit.getAttribute('data-mm')),
            })),
          };
        }),
      );
      for (const frame of frames) pages.push({ file, ...frame });
    }
    await page.close();
  };
  await Promise.all(
    Array.from({ length: WORKERS }, (_, w) => worker(files.filter((_, i) => i % WORKERS === w))),
  );

  const overflow = pages.filter((page) => page.over > OVERFLOW_MM);
  const short = new Map();
  for (const page of pages)
    for (const unit of page.units) {
      const worst = short.get(unit.kind);
      if (unit.short > SHORT_MM && (!worst || unit.short > worst.short))
        short.set(unit.kind, { short: unit.short, file: page.file });
    }
  // Les règles de l'avis, sur les pages imprimées.
  const alone = pages.filter((page) => page.units.length === 1 && page.units[0].kind === 'avis');
  const byFile = new Map();
  for (const page of pages) byFile.set(page.file, [...(byFile.get(page.file) ?? []), page]);
  let cut = 0;
  const badCuts = [];
  for (const [file, list] of byFile) {
    const closing = list
      .sort((a, b) => a.number - b.number)
      .filter((page) => page.units.some((unit) => unit.kind.startsWith('next-')));
    if (closing.length < 2) continue;
    cut += 1;
    if (
      closing.length !== 2 ||
      closing[0].units[0].kind !== 'avis' ||
      closing[0].units.at(-1).kind !== 'next-papers'
    )
      badCuts.push(file);
  }
  const rules = alone.length === 0 && badCuts.length === 0;
  const label = font
    ? `${font}, ${inApp ? 'dans l’outil' : 'sur le lien public'}`
    : 'Montserrat et Rajdhani';
  console.log(
    `${overflow.length === 0 && short.size === 0 && rules ? '✔' : '✘'} ${label} : ${files.length} Études, ${pages.length} pages · ${overflow.length} page(s) qui débordent · ${short.size} bloc(s) estimés trop courts · ${alone.length} avis seul(s) sur sa page · « La suite » coupée sous un avis : ${cut} Étude(s), ${badCuts.length} coupée(s) ailleurs`,
  );
  for (const page of alone.slice(0, 5))
    console.log(`    un avis seul sur sa page : ${page.file}, page ${page.number}`);
  for (const file of badCuts.slice(0, 5))
    console.log(`    « La suite » coupée ailleurs que sous un avis, après les papiers : ${file}`);
  for (const page of overflow.sort((a, b) => b.over - a.over).slice(0, 5))
    console.log(
      `    déborde de ${page.over.toFixed(1)} mm : ${page.file}, page ${page.number} (${page.units.map((unit) => unit.kind).join(', ')})`,
    );
  for (const [kind, worst] of short)
    console.log(`    ${kind} : estimé ${worst.short.toFixed(1)} mm trop court (${worst.file})`);
  return overflow.length === 0 && short.size === 0 && rules;
}

const browser = await chromium.launch();
let ok = true;
try {
  generate(null);
  ok = (await measure(browser, null, false)) && ok;
  for (const font of FONTS) {
    generate(font);
    ok = (await measure(browser, font, false)) && ok;
    ok = (await measure(browser, font, true)) && ok;
  }
} finally {
  await browser.close();
}
if (!ok) {
  console.error(
    'Le banc de l’Étude imprimée a trouvé des pages ou des blocs faux : voir plus haut.',
  );
  process.exit(1);
}
console.log('Le banc de l’Étude imprimée est vert.');
