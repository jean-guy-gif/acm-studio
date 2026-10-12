// Correctif du 12/10 — rejoue ce que fait Next.js quand le navigateur appelle une action serveur :
// React ENCODE les arguments côté navigateur, puis les DÉCODE côté serveur. Lancé par
// `listing-payload.test.ts` dans un processus à part, avec `--conditions=react-server` (le
// décodeur de React l'exige). Écrit en JSON la longueur de la page reçue, ou l'erreur.
//
//   node --conditions=react-server decode-action-args.mjs <string|form> <caractères>
import { createRequire } from 'node:module';

// Les deux moitiés de React sont des modules CommonJS, chargés tels que Next.js les embarque.
const load = createRequire(import.meta.url);
globalThis.__webpack_require__ = () => ({});
globalThis.__webpack_chunk_load__ = () => Promise.resolve();

const base = 'next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-';
const client = load(`${base}client.browser.production.js`);
const server = load(`${base}server.node.production.js`);

const [mode, size] = process.argv.slice(2);
const html = 'é'.repeat(Number(size));

async function main() {
  let page = html;
  if (mode === 'form') {
    page = new FormData();
    page.set('html', html);
  }
  // Les arguments tels que l'action liée les reçoit : le dossier, puis ceux de l'appel.
  const args =
    mode === 'form'
      ? ['dossier', page]
      : ['dossier', 'https://www.exemple.test/annonce', page, 'apartment'];
  const body = await client.encodeReply(args);
  const decoded = await server.decodeReply(body, {});
  const received = mode === 'form' ? decoded[1].get('html') : decoded[2];
  return { ok: true, length: received.length };
}

main()
  .catch((error) => ({ ok: false, error: error.message }))
  .then((result) => process.stdout.write(JSON.stringify(result)));
