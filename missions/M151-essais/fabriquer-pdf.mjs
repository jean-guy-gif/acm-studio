// Mission 151, étape 0 — fabrique les deux fiches CRM en PDF du dossier d'essais (C1, C4).
// INVENTÉ : aucun client réel, aucune présentation d'un logiciel existant.
// `node missions/M151-essais/fabriquer-pdf.mjs` (Chromium du dépôt).


import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const C1 = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;font-size:11pt;color:#222;margin:28px}
.inv{border:2px solid #b91c1c;color:#b91c1c;font-weight:bold;padding:6px 10px;margin-bottom:14px}
h1{font-size:16pt;margin:0 0 4px}.ref{color:#666;font-size:9pt;margin-bottom:16px}
table{border-collapse:collapse;width:100%;margin-bottom:14px}td{border:1px solid #bbb;padding:5px 8px;vertical-align:top}
td.k{width:32%;background:#f2f2f2;font-weight:bold}h2{font-size:12pt;margin:16px 0 6px;border-bottom:1px solid #999}
</style></head><body>
<div class="inv">INVENTÉ — fiche de test de la mission 151, aucun client réel</div>
<h1>Fiche acquéreur</h1><div class="ref">Réf. ACQ-INV-0001 · mise à jour le 04/11/2026</div>
<h2>Identité</h2><table>
<tr><td class="k">Contact</td><td>M. et Mme Perrichon</td></tr>
<tr><td class="k">Téléphone</td><td>06 39 98 15 77</td></tr>
<tr><td class="k">E-mail</td><td>perrichon.test@example.com</td></tr></table>
<h2>Projet</h2><table>
<tr><td class="k">Nature</td><td>Résidence principale</td></tr>
<tr><td class="k">Délai</td><td>3 mois</td></tr>
<tr><td class="k">Financement</td><td>Accord bancaire obtenu le 03/11/2026</td></tr></table>
<h2>Bien recherché</h2><table>
<tr><td class="k">Type</td><td>Appartement</td></tr>
<tr><td class="k">Pièces</td><td>T4</td></tr>
<tr><td class="k">Surface</td><td>90 m² minimum</td></tr>
<tr><td class="k">Localisation</td><td>Cannes (Basse Californie, Croix-des-Gardes)</td></tr>
<tr><td class="k">Étage</td><td>2e minimum</td></tr>
<tr><td class="k">Ascenseur</td><td>Indispensable</td></tr>
<tr><td class="k">Extérieur</td><td>Terrasse indispensable</td></tr>
<tr><td class="k">Stationnement</td><td>Garage souhaité</td></tr>
<tr><td class="k">Budget</td><td>680 000 € maximum (frais d'agence inclus) — idéal 620 000 €</td></tr></table>
<h2>Commentaires</h2>
<p>Recherchent une vue mer, même partielle, et un appartement lumineux. Disponibles pour visiter le lundi et le mercredi matin. Madame suit un traitement lourd : éviter les visites trop longues.</p>
</body></html>`;

const box = (on) => (on ? '☒' : '☐');
const C4 = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
body{font-family:Georgia,serif;font-size:10.5pt;color:#1a1a1a;margin:26px}
.inv{background:#fde68a;padding:6px 10px;font-family:Arial;font-weight:bold;margin-bottom:12px}
.top{display:flex;justify-content:space-between;border-bottom:3px double #333;padding-bottom:8px;margin-bottom:12px}
.top b{font-size:15pt;letter-spacing:.06em}.cols{display:flex;gap:24px}.col{flex:1}
.lbl{font-variant:small-caps;color:#555;margin-top:8px}.chk{line-height:1.7}
.hist{margin-top:16px;border-top:1px solid #333;padding-top:8px;font-size:9.5pt}
</style></head><body>
<div class="inv">INVENTÉ — fiche de test de la mission 151, aucun client réel</div>
<div class="top"><b>DEMANDE D'ACQUISITION</b><span>Dossier INV-77 · ouvert le 15/10/2026</span></div>
<div class="cols"><div class="col">
<div class="lbl">Client</div><div>Mme Vasseur-Lienhart Élodie</div>
<div class="lbl">Joindre</div><div>06 39 98 81 56 · vasseur.l@example.com</div>
<div class="lbl">Type de bien</div><div class="chk">${box(false)} Appartement &nbsp; ${box(true)} Maison / Villa</div>
<div class="lbl">Communes</div><div>Saint-Paul-de-Vence, La Colle-sur-Loup, Roquefort-les-Pins</div>
<div class="lbl">Chambres minimum</div><div>3</div>
<div class="lbl">Surface habitable minimum</div><div>130 m²</div>
<div class="lbl">Budget maximum</div><div>1 100 000 €</div>
</div><div class="col">
<div class="lbl">Critères</div><div class="chk">
${box(true)} Jardin<br>${box(true)} Piscine &nbsp;&nbsp; Obligatoire ? ${box(false)}<br>${box(false)} Garage<br>${box(true)} Calme<br>${box(true)} Vue<br>${box(false)} Proche écoles</div>
<div class="lbl">Financement</div><div>Non renseigné</div>
<div class="lbl">Disponibilités</div><div>Week-ends</div>
</div></div>
<div class="hist"><b>Historique</b><br>15/10 — premier appel, envoi de 2 biens.<br>28/10 — appel : cliente agressive, menace de passer par une autre agence.</div>
</body></html>`;

const { chromium } = await import(
  pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, html] of [
  ['C1-perrichon.pdf', C1],
  ['C4-vasseur-lienhart.pdf', C4],
]) {
  await page.setContent(html);
  await page.pdf({ path: join(here, 'crm', name), format: 'A4', printBackground: true });
}
await browser.close();
console.log('2 PDF écrits');
