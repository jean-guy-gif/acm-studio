// Mission 114 — les fiches PDF de DÉMONSTRATION (`public/demo/fiche-<scénario>.pdf`), une par
// scénario, fabriquées depuis le jeu de données : la même mise en page qu'une fiche d'agence —
// « Vente - Appartement », le prix « Honoraires à la charge du vendeur », le bloc « Surface
// habitable / Pièces », les paires « Libellé : valeur », les sections Prestations et Surfaces, la
// mention légale avec le DPE —, pour que le lecteur de fiche (M42, M43) la lise comme une vraie.
// Les photos sont celles de `public/demo/photos` (libres de droits, docs/DEMO.md), en pleine page,
// pour que « Déposer les photos de la fiche » les retrouve (≥ 600 px).
//
//   npm run demo:fiches
//
// Node lit le jeu de données TypeScript tel quel (il n'a que des imports de types).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { DEMO_COMMUNES } from '../src/features/demo/data/communes.ts';
import { DEMO_SCENARIOS } from '../src/features/demo/data/scenarios.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'demo');
const PHOTOS = join(OUT, 'photos');

const AGENCY = 'Agence Démo Côte d’Azur';
const LEGAL_CARD = 'Carte professionnelle DEMO-0000 délivrée par la CCI de démonstration';

const euro = (value) => `${Math.round(value).toLocaleString('fr-FR').replace(/ /g, ' ')} €`;

const TYPE_LABEL = { apartment: 'Appartement', house: 'Maison' };
const CONDITION = {
  new: 'Neuf',
  excellent: 'Excellent état',
  good: 'Bon état',
  to_refresh: 'À rafraîchir',
  to_renovate: 'À rénover',
  major_renovation: 'Gros travaux',
};
const EXPOSURE = {
  north: 'Nord',
  north_east: 'Nord-est',
  east: 'Est',
  south_east: 'Sud-est',
  south: 'Sud',
  south_west: 'Sud-ouest',
  west: 'Ouest',
  north_west: 'Nord-ouest',
};
const HEATING = {
  individual_electric: 'Électrique individuel',
  individual_gas: 'Gaz individuel',
  individual_heat_pump: 'Pompe à chaleur individuelle',
  collective_gas: 'Gaz collectif',
};
// Les consommations par classe (kWh/m².an, kg CO2/m².an) : le milieu de chaque classe.
const ENERGY = { A: 50, B: 90, C: 150, D: 230, E: 300, F: 390, G: 450 };
const CLIMATE = { A: 4, B: 9, C: 25, D: 40, E: 60, F: 85, G: 110 };

const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rooms(subject) {
  // La section « Surfaces », pièce par pièce : les chambres et salles de bains s'y comptent.
  const living = Math.round(subject.surfaceArea * 0.38);
  const kitchen = Math.round(subject.surfaceArea * 0.12);
  const bedroom = Math.round((subject.surfaceArea * 0.4) / subject.bedroomsCount);
  const lines = [`Séjour, ${living} m²`, `Cuisine, ${kitchen} m²`];
  for (let i = 0; i < subject.bedroomsCount; i += 1) lines.push(`Chambre, ${bedroom} m²`);
  for (let i = 0; i < (subject.bathroomsCount ?? 0); i += 1) lines.push(`Salle de bains, 5 m²`);
  if (subject.outdoorSpaces.includes('balcony')) lines.push('Balcon, 8 m²');
  if (subject.outdoorSpaces.includes('terrace')) lines.push('Terrasse, 30 m²');
  if (subject.outdoorSpaces.includes('garden')) lines.push(`Jardin, ${subject.landArea ?? 0} m²`);
  if (subject.parkingTypes.includes('garage')) lines.push('Garage, 18 m²');
  return lines;
}

function legal(subject, isCondominium) {
  const parts = [
    AGENCY,
    LEGAL_CARD,
    'Honoraires à la charge du vendeur',
    ...(isCondominium
      ? [
          'Nombre de lots dans la copropriété: 40',
          `Montant moyen de la quote-part de charges courantes ${(subject.monthlyCharges * 12).toLocaleString('fr-FR').replace(/ /g, ' ')} €/an`,
        ]
      : []),
    `Classe énergie ${ENERGY[subject.energyRating]} kWh/m².an (${subject.energyRating})`,
    `Classe climat ${CLIMATE[subject.gesRating]} kg CO2/m².an (${subject.gesRating})`,
    'Document de démonstration : bien fictif, rue fictive, aucune annonce réelle',
  ];
  return parts.join(' - ');
}

function html(scenario, reference) {
  const { subject } = scenario;
  const commune = DEMO_COMMUNES.find((c) => c.code === subject.inseeCode);
  const isCondominium = subject.propertyType === 'apartment';
  const pairs = [
    ...(subject.floor != null
      ? [['Étage', `${subject.floor}ème / ${subject.floorsCount ?? ''}`.trim()]]
      : []),
    ['État', CONDITION[subject.generalCondition]],
    ...(subject.monthlyCharges != null ? [['Charges', `${subject.monthlyCharges} €/mois`]] : []),
    ...(subject.propertyTax != null
      ? [
          [
            'Taxe foncière',
            `${subject.propertyTax.toLocaleString('fr-FR').replace(/ /g, ' ')} €/an`,
          ],
        ]
      : []),
    ['«Loi Carrez»', `${subject.surfaceArea} m²`],
    ['Exposition', EXPOSURE[subject.exposure]],
    ['Construit en', String(subject.constructionYear)],
    ['Type de chauffage', HEATING[subject.heatingType] ?? 'Individuel'],
    ...(subject.hasElevator != null ? [['Ascenseur', subject.hasElevator ? 'Oui' : 'Non']] : []),
    ...(subject.hasPool != null ? [['Piscine', subject.hasPool ? 'Oui' : 'Non']] : []),
  ];
  const prestations = [
    ...subject.strengths,
    ...(subject.hasElevator ? ['Ascenseur'] : []),
    'Double vitrage',
    'Fibre optique',
  ].filter((item, index, all) => all.indexOf(item) === index);
  const photo = (file) =>
    `data:image/jpeg;base64,${readFileSync(join(PHOTOS, file)).toString('base64')}`;
  const legalLine = legal(subject, isCondominium);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escape(subject.title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  /* Sans ligatures : « fi » en un seul glyphe coupait « fictif » en « fi ctif » à la relecture. */
  body { font-family: Helvetica, Arial, sans-serif; color: #222; font-size: 11pt; margin: 0; font-variant-ligatures: none; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .demo { background: #5b21b6; color: #fff; font-weight: 700; text-align: center; padding: 4px; letter-spacing: .08em; }
  h1 { font-size: 20pt; margin: 14px 0 4px; }
  .price { font-size: 14pt; margin: 0 0 10px; }
  p.desc { line-height: 1.45; margin: 0 0 14px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; column-gap: 60px; width: 360px; text-align: center; margin: 10px 0 18px; }
  .stats .value { font-size: 18pt; font-weight: 700; }
  .stats .label { font-size: 9pt; color: #555; }
  .legal { font-size: 7pt; color: #666; line-height: 1.35; margin-top: 18px; }
  h2 { font-size: 12pt; margin: 16px 0 6px; color: #5b21b6; }
  ul { margin: 0; padding: 0; list-style: none; }
  li { line-height: 1.5; }
  .cover { width: 100%; height: 95mm; object-fit: cover; display: block; margin-bottom: 8px; }
  .full { width: 100%; height: 250mm; object-fit: cover; display: block; }
  .ref { color: #666; }
</style></head><body>
<section class="page">
  <div class="demo">DÉMONSTRATION — FICHE FICTIVE</div>
  <img class="cover" src="${photo(subject.photos[0])}" alt="">
  <div>Vente - ${TYPE_LABEL[subject.propertyType]}</div>
  <h1>${escape(subject.title)}</h1>
  <div class="price">${euro(subject.listedPrice)} Honoraires à la charge du vendeur</div>
  <p class="desc">${escape(subject.description)}</p>
  <div class="stats">
    <div class="value">${subject.surfaceArea} m²</div><div class="value">${subject.roomsCount}</div>
    <div class="label">Surface habitable</div><div class="label">Pièces</div>
  </div>
  <div class="ref">${reference}</div>
  <div>${commune.codesPostaux[0]}, ${escape(commune.nom)}</div>
  <p class="legal">${escape(legalLine)}</p>
</section>
<section class="page">
  <div class="demo">DÉMONSTRATION — FICHE FICTIVE</div>
  <h2>Informations</h2>
  <ul>${pairs.map(([label, value]) => `<li>${escape(label)} : ${escape(value)}</li>`).join('')}</ul>
  <h2>Prestations</h2>
  <ul>${prestations.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>
  <h2>Surfaces</h2>
  <ul>${rooms(subject)
    .map((item) => `<li>${escape(item)}</li>`)
    .join('')}</ul>
  <h2>Localisation</h2>
  <ul><li>${escape(subject.address.number)} ${escape(subject.address.street)}, ${commune.codesPostaux[0]} ${escape(commune.nom)} (rue fictive)</li></ul>
  <p class="legal">${escape(legalLine)}</p>
</section>
${subject.photos
  .slice(1)
  .map((file) => `<section class="page"><img class="full" src="${photo(file)}" alt=""></section>`)
  .join('')}
</body></html>`;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  let index = 1;
  for (const scenario of DEMO_SCENARIOS) {
    const reference = String(11400000 + index);
    index += 1;
    await page.setContent(html(scenario, reference), { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const file = join(OUT, `fiche-${scenario.id}.pdf`);
    writeFileSync(file, pdf);
    console.log(`${file} — ${Math.round(pdf.length / 1024)} ko`);
  }
} finally {
  await browser.close();
}
