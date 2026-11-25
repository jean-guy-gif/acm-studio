// La taille de la base de la production (`missions/BASE_JEUDI_MATIN.md`, geste 1) : la sonde.
// Pendant que Jean-Guy change la taille dans Supabase, elle demande « select 1 » à la base toutes
// les cinq secondes, en LECTURE SEULE, et dit la durée réelle de l'indisponibilité.
//
//   npm run base:sonde                 jusqu'à Ctrl-C, ou vingt minutes
//   npm run base:sonde -- --minutes 5
//
// Elle ne vise que le projet lié au dépôt (la production) et n'écrit rien.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { downtime } from './base-sonde-regle.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const at = process.argv.indexOf('--minutes');
const minutes = at > 0 ? Number(process.argv[at + 1]) : 20;
const until = Date.now() + (Number.isFinite(minutes) && minutes > 0 ? minutes : 20) * 60_000;
const hour = (time) =>
  new Date(time).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour12: false });

function answers() {
  const asked = spawnSync(
    'npx',
    [
      '--yes',
      'supabase@3.0.0',
      'db',
      'query',
      '--remote',
      '--read-only',
      '--output-format',
      'json',
      '--agent',
      'no',
      'select 1 as ok',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8', timeout: 15_000 },
  );
  return asked.status === 0 && /"ok"\s*:\s*1/.test(asked.stdout ?? '');
}

const samples = [];
let last = null;
const report = () => {
  const result = downtime(samples);
  console.log(
    result.outages.length === 0
      ? `\n✔ La base a répondu à chaque fois (${samples.length} demandes).\n`
      : `\nIndisponible ${result.outages
          .map(
            (outage) =>
              `de ${hour(outage.from)} à ${outage.to ? hour(outage.to) : '… (pas revenue)'}`,
          )
          .join(', ')} : ${Math.round(result.seconds)} secondes en tout, à cinq secondes près.\n`,
  );
};
process.on('SIGINT', () => {
  report();
  process.exit(0);
});

console.log(
  `\nLa sonde : « select 1 » toutes les cinq secondes, en lecture seule (Ctrl-C pour finir).`,
);
while (Date.now() < until) {
  const started = Date.now();
  const ok = answers();
  samples.push({ at: started, ok });
  if (ok !== last)
    console.log(`  ${hour(started)}  ${ok ? 'la base répond' : 'la base NE RÉPOND PAS'}`);
  last = ok;
  const wait = 5_000 - (Date.now() - started);
  if (wait > 0) await new Promise((done) => setTimeout(done, wait));
}
report();
