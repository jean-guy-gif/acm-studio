// Lot B, B2 (demande de Jean-Guy du 27/11) — planche : « Comment finance-t-il ? » sur la fiche
// acquéreur. La fiche réelle de M. Fontaine (démo, financement en cours : « Prêt à visiter ? » est
// ouvert à l'arrivée), sur l'essai, aux trois tailles : avant, puis après, la question insérée dans
// la page avec les classes mêmes de l'application (rien n'est écrit, la page n'est pas enregistrée).
//
//   set -a; . ./.env.e2e.local; set +a; node missions/maquettes/lot-b/LB2-generateur.mjs
//
// Écrit, à côté de ce fichier : les captures LB2-<taille>-<état>.png, puis la planche
// LB2-comment-finance-t-il.html et .png. Aucun identifiant n'est affiché.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../../src/features/branding/fonts')).href;
const BUYER = '1b9352b6-d1fb-49fe-868d-73d8ec68388b'; // M. Fontaine, agence de démonstration (essai)
const SIZES = [
  { key: 'telephone', label: 'Téléphone', width: 390, height: 844 },
  { key: 'tablette', label: 'Tablette', width: 820, height: 1180 },
  { key: 'ordinateur', label: 'Ordinateur', width: 1512, height: 771 },
];
const NB = ' ';
const NNB = ' ';

const need = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant : lancez le script avec .env.e2e.local chargé.`);
  return value;
};

// L'« après », inséré dans le pli « Prêt à visiter ? » : la question sous le statut, faite des
// éléments mêmes de la page (le libellé, les pastilles, l'indication), et les champs du prêt.
function insertMode(state) {
  const NBSP = ' ';
  const NARROW = ' ';
  document.querySelector('[data-maquette="mode"]')?.remove();
  const status = document.querySelector('[data-testid="buyer-financing"]');
  const block = status.parentElement;
  const label = block.querySelector('span');
  const on = status.querySelector('button[aria-pressed="true"]');
  const off = status.querySelector('button[aria-pressed="false"]');
  const hint = block.lastElementChild;
  const pill = (text, chosen) => {
    const b = (chosen ? on : off).cloneNode(false);
    b.textContent = text;
    b.setAttribute('aria-pressed', String(chosen));
    b.removeAttribute('disabled');
    return b;
  };
  const mode = document.createElement('div');
  mode.className = block.className;
  mode.dataset.maquette = 'mode';
  const head = document.createElement('div');
  head.className = 'flex flex-wrap items-center gap-2';
  const title = label.cloneNode(false);
  title.textContent = `Comment finance-t-il${NARROW}?`;
  head.append(title);
  if (state.toVerify) {
    const badge = document.createElement('span');
    badge.className =
      'inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800';
    badge.textContent = 'À vérifier · lu dans vos notes';
    head.append(badge);
  }
  const row = status.cloneNode(false);
  row.removeAttribute('data-testid');
  for (const [text, key] of [
    ['Comptant', 'cash'],
    ['Avec prêt', 'loan'],
    ['Pas encore dit', 'not_said'],
  ]) {
    row.append(pill(text, state.mode === key));
  }
  mode.append(head, row);
  if (state.toVerify) {
    const tip = hint.cloneNode(false);
    tip.textContent = `Un toucher sur le bon choix le confirme${NBSP}: l’offre d’achat le demande.`;
    mode.append(tip);
  }
  if (state.mode === 'loan') {
    const loan = document.createElement('div');
    loan.className = 'mt-1 flex flex-col gap-3 rounded-xl border border-zinc-200 p-3';
    const amounts = document.createElement('div');
    amounts.className = 'flex flex-wrap gap-4';
    const amount = (text, value) => {
      const field = document.createElement('label');
      field.className = 'flex flex-col gap-1.5';
      const name = label.cloneNode(false);
      name.textContent = text;
      const line = document.createElement('span');
      line.className = 'flex items-center gap-1.5 text-sm text-zinc-700';
      const input = document.createElement('input');
      input.className =
        'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 w-32 min-w-0 text-right tabular-nums';
      input.value = value;
      input.placeholder = '0';
      line.append(input, document.createTextNode('€'));
      field.append(name, line);
      return field;
    };
    amounts.append(amount('Apport', state.contribution), amount('Montant du prêt', state.loan));
    const agreement = document.createElement('div');
    agreement.className = 'flex flex-col gap-1.5';
    const agreementLabel = label.cloneNode(false);
    agreementLabel.textContent = 'Accord de principe de sa banque';
    const choices = status.cloneNode(false);
    choices.removeAttribute('data-testid');
    choices.append(pill('Oui', state.agreement === true), pill('Non', state.agreement === false));
    agreement.append(agreementLabel, choices);
    const save = document.querySelector('[data-testid="buyer-contacted"]').cloneNode(false);
    save.textContent = 'Enregistrer le prêt';
    save.className = save.className.replace(/\bw-full\b/, '').trim();
    save.removeAttribute('disabled');
    const saveRow = document.createElement('div');
    saveRow.className = 'flex flex-wrap items-center gap-3';
    const note = hint.cloneNode(false);
    note.textContent = `Facultatifs${NBSP}: à noter quand il les donne.`;
    saveRow.append(save, note);
    loan.append(amounts, agreement, saveRow);
    mode.append(loan);
  }
  block.after(mode);
}

const STATES = {
  avant: null,
  'pas-encore-dit': { mode: 'not_said' },
  'avec-pret': { mode: 'loan', contribution: `120${NB}000`, loan: `650${NB}000`, agreement: false },
  'lu-dans-les-notes': { mode: 'cash', toVerify: true },
};

const shots = {};
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ locale: 'fr-FR', deviceScaleFactor: 2 });
  const page = await context.newPage();
  const base = need('E2E_BASE_URL').replace(/\/$/, '');
  const query = new URLSearchParams({
    'x-vercel-protection-bypass': need('E2E_VERCEL_BYPASS'),
    'x-vercel-set-bypass-cookie': 'true',
  });
  await page.goto(`${base}/login?${query}`);
  await page.getByLabel('Adresse e-mail').fill(need('E2E_DEMO_EMAIL'));
  await page.getByLabel('Mot de passe').fill(need('E2E_DEMO_PASSWORD'));
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/(aujourdhui|bienvenue)$/, { timeout: 45_000 });

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto(`${base}/acquereurs/${BUYER}`);
    const fold = page.getByTestId('buyer-readiness').first();
    await fold.waitFor();
    if (!(await fold.evaluate((node) => node.open))) await fold.locator('summary').click();
    await page.getByTestId('buyer-financing').waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const [state, value] of Object.entries(STATES)) {
      if (state === 'lu-dans-les-notes' && size.key !== 'ordinateur') continue;
      if (value) await page.evaluate(insertMode, value);
      const file = `LB2-${size.key}-${state}.png`;
      await fold.screenshot({ path: join(here, file) });
      shots[`${size.key}-${state}`] = file;
    }
    if (size.key === 'ordinateur') {
      await page.evaluate(insertMode, STATES['avec-pret']);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: join(here, 'LB2-ordinateur-a-l-ouverture.png') });
      shots['ordinateur-ouverture'] = 'LB2-ordinateur-a-l-ouverture.png';
    }
  }
  await context.close();

  // La planche.
  const img = (key, width) =>
    shots[key] ? `<img src="${shots[key]}" style="width:${width}px" alt="">` : '';
  const col = (size, state, width) => `<div class="cell">${img(`${size}-${state}`, width)}</div>`;
  const row = (title, state) => `
    <div class="row"><div class="rowtitle">${title}</div>
      ${col('telephone', state, 360)}${col('tablette', state, 520)}${col('ordinateur', state, 640)}
    </div>`;
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Lot B — Comment finance-t-il${NNB}?</title>
<style>
@font-face{font-family:'Nunito Sans';src:url('${FONTS}/nunito-sans/nunito-sans-latin.woff2') format('woff2');font-weight:200 1000}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito Sans',Arial,sans-serif;background:#d4d4d8;color:#18181b;padding:28px;width:max-content;display:flex;flex-direction:column;gap:20px}
h1{font-size:26px;font-weight:800}
.lead{font-size:16px;color:#3f3f46;max-width:1640px;line-height:1.45}
.heads,.row{display:grid;grid-template-columns:170px 360px 520px 640px;gap:18px;align-items:start}
.heads div{font-size:15px;font-weight:800;color:#1e2f7a}
.rowtitle{font-size:15px;font-weight:800;color:#3f3f46;padding-top:6px}
.cell img{display:block;border:1px solid #a1a1aa;border-radius:10px;background:#fff}
.wide{display:grid;grid-template-columns:1fr 640px;gap:18px;align-items:start;max-width:1760px}
.wide img{display:block;border:1px solid #a1a1aa;border-radius:10px;width:100%}
.cap{font-size:14px;font-weight:700;color:#3f3f46;margin-bottom:6px}
.notes{background:#fff;border-radius:12px;padding:18px 22px;max-width:1760px;font-size:15.5px;line-height:1.5;display:grid;grid-template-columns:1fr 1fr;gap:4px 36px}
.notes h4{font-size:16px;font-weight:800;color:#1e2f7a;grid-column:1/-1;margin-top:6px}
.notes p{padding-left:14px;text-indent:-14px}
.notes .q{grid-column:1/-1}
</style></head><body>
<h1>Lot B — « Comment finance-t-il${NNB}?${NB}» sur la fiche acquéreur</h1>
<p class="lead">La fiche de M. Fontaine (démo, financement en cours) sur l’essai, le pli «${NB}Prêt à visiter${NNB}?${NB}» ouvert, comme à l’arrivée d’un acquéreur pas encore prêt. «${NB}Avant${NB}» est la fiche d’aujourd’hui ; les lignes «${NB}après${NB}» y insèrent la question avec les classes mêmes de l’application.</p>
<div class="heads"><div></div><div>Téléphone · 390 px</div><div>Tablette · 820 px</div><div>Ordinateur · 1 512 px</div></div>
${row('Avant', 'avant')}
${row('Après · Pas encore dit (toutes les fiches d’aujourd’hui)', 'pas-encore-dit')}
${row('Après · Avec prêt, noté', 'avec-pret')}
<div class="wide">
  <div><p class="cap">Ordinateur, la fiche à l’ouverture (1 512 × 771), avec le prêt noté</p>${img('ordinateur-ouverture', 1100)}</div>
  <div><p class="cap">Lu dans ses notes (B4)${NB}: «${NB}À vérifier${NB}», un toucher le confirme</p>${img('ordinateur-lu-dans-les-notes', 640)}</div>
</div>
<section class="notes">
  <h4>Avant</h4>
  <p>– «${NB}Prêt à visiter${NNB}?${NB}» ne dit que l’état du financement (Validé · En cours · Inconnu), jamais comment il finance.</p>
  <p>– L’offre d’achat ne sait pas s’il emprunte : elle se signe comptant, «${NB}sans recours à un prêt${NB}».</p>
  <h4>Après</h4>
  <p>– Sous l’état du financement, «${NB}Comment finance-t-il${NNB}?${NB}»${NB}: Comptant · Avec prêt · Pas encore dit. Le même geste que l’état : un toucher l’enregistre.</p>
  <p>– Toutes les fiches d’aujourd’hui sont en «${NB}Pas encore dit${NB}» (la migration du 28/11) : rien n’est reconstitué.</p>
  <p>– Avec prêt : l’apport, le montant du prêt et l’accord de principe de sa banque (Oui / Non), tous facultatifs. Les montants s’écrivent avec l’espace des milliers, comme «${NB}Votre fourchette${NB}» ; «${NB}Enregistrer le prêt${NB}», en contour.</p>
  <p>– Repasser en «${NB}Comptant${NB}» ou «${NB}Pas encore dit${NB}» efface l’apport, le prêt et l’accord : s’il y en a, l’écran le demande d’abord.</p>
  <p>– L’état du financement et «${NB}Prêt à visiter${NB}» ne changent pas : ils ne lisent pas le mode (réponse 8).</p>
  <p>– Lu dans ses notes (B4) : «${NB}À vérifier${NB}» à côté de la question ; un toucher sur le bon choix le confirme, et l’offre d’achat attend cette confirmation (réponse 10).</p>
  <p>– Jamais montré au vendeur, ni dans un document, ni par un lien.</p>
  <p>– Trois choix de plus dans ce pli, et le prêt : le pli n’est ouvert d’office que pour un acquéreur pas encore prêt ; prêt, il reste rangé dans «${NB}Tout le dossier${NB}».</p>
  <p class="q">Question, avec sa réponse par défaut${NB}: si vous préférez moins de boutons, une seule ligne «${NB}Comment finance-t-il${NNB}? Pas encore dit · Le dire${NB}» qui ouvre les trois choix. Par défaut : les trois choix, visibles.</p>
</section>
</body></html>`;
  writeFileSync(join(here, 'LB2-comment-finance-t-il.html'), html);
  const sheet = await browser.newPage({ deviceScaleFactor: 1 });
  await sheet.goto(pathToFileURL(join(here, 'LB2-comment-finance-t-il.html')).href);
  await sheet.evaluate(() => document.fonts.ready);
  await sheet.screenshot({ path: join(here, 'LB2-comment-finance-t-il.png'), fullPage: true });
  console.log(`planche : ${Object.keys(shots).length} captures, LB2-comment-finance-t-il.png`);
} finally {
  await browser.close();
}
