// Mission 151 — la lecture simulée de l'agence de démonstration (M114) : aucune lecture réelle, la
// réponse que le modèle donnerait sur la photo inventée des notes de M. et Mme Arnaud (planches 1 et
// 2, validées par Jean-Guy le 10/11). Elle passe par les MÊMES gardes que la vraie (« Mme enceinte »
// et « M. très pressé » ne sont pas relevés). Tout est inventé : 06 39 98 (plage que l'ARCEP
// réserve à la fiction), aucune adresse.

// La photo inventée de ces notes (décision de Jean-Guy, 12/11), dessinée par le générateur des
// maquettes (`node missions/maquettes/M151-generateur.mjs --photo-notes`) : proposée en premier ;
// « Coller un texte » reste le second choix.
export const DEMO_NOTES_PHOTO = '/demo/notes-arnaud.jpg';

export const DEMO_NOTES_TEXT = [
  'ARNAUD (M. et Mme)  06 39 98 27 14',
  'Maison 4-5 p — 3 ch mini',
  'Vence / St-Paul / Tourrettes',
  '750 max (idéal 700)',
  'Jardin +++ piscine pas obligatoire',
  'AU CALME — pas de route, pas de vis-à-vis',
  'maison de caractère, du cachet (pierres, poutres…)',
  'Mme enceinte → plain-pied',
  'pas de gros travaux',
  'accord banque OK',
  'M. très pressé, un peu difficile',
  'visites le samedi',
].join('\n');

export const DEMO_NOTES_OUTPUT = {
  name: 'M. et Mme Arnaud',
  phone: '06 39 98 27 14',
  email: null,
  purpose: null,
  timeline: null,
  language: null,
  property_types: ['house'],
  cities: ['Vence', 'Saint-Paul-de-Vence', 'Tourrettes-sur-Loup'],
  budget_ideal: 700000,
  budget_max: 750000,
  rooms_min: 4,
  bedrooms_min: 3,
  surface_min: null,
  outdoor: true,
  parking: null,
  pool: null,
  floor_min: null,
  elevator: null,
  energy_rating_max: null,
  works_accepted: null,
  condominium_accepted: null,
  must_have: ['outdoor'],
  financing: 'validated',
  soft_criteria: [
    { key: 'calme', words: 'AU CALME — pas de route' },
    { key: 'sans_vis_a_vis', words: 'pas de vis-à-vis' },
    { key: 'cachet', words: 'maison de caractère, du cachet (pierres, poutres…)' },
    { key: 'plain_pied', words: 'plain-pied' },
    { key: 'pret_a_vivre', words: 'pas de gros travaux' },
  ],
  unclassified_wishes: [],
  notes: 'Visites possibles le samedi.',
  sources: [
    { field: 'name', quote: 'ARNAUD (M. et Mme)' },
    { field: 'phone', quote: '06 39 98 27 14' },
    { field: 'property_types', quote: 'Maison 4-5 p' },
    { field: 'cities', quote: 'Vence / St-Paul / Tourrettes' },
    { field: 'budget_max', quote: '750 max (idéal 700)' },
    { field: 'budget_ideal', quote: '750 max (idéal 700)' },
    { field: 'rooms_min', quote: '4-5 p — 3 ch mini' },
    { field: 'bedrooms_min', quote: '4-5 p — 3 ch mini' },
    { field: 'outdoor', quote: 'Jardin +++' },
    { field: 'must_have:outdoor', quote: 'Jardin +++' },
    { field: 'financing', quote: 'accord banque OK' },
    { field: 'soft_criteria', quote: 'AU CALME — pas de route, pas de vis-à-vis' },
    { field: 'notes', quote: 'visites le samedi' },
  ],
  personal_mentions_skipped: 2,
} as const;

// La refonte, lot D (maquette REFONTE-2) — « Nouvel acquéreur par une phrase » : dans l'agence de
// démonstration, la phrase est d'avance dans l'écran, et sa lecture est simulée comme celle de la
// photo — la réponse que le modèle donnerait sur cette phrase, chaque ligne d'origine prise dans la
// phrase elle-même (un test le vérifie). Les mêmes acquéreurs inventés, dits en une phrase.
export const DEMO_PHRASE_TEXT =
  'M. et Mme Arnaud. Une maison de 4 pièces ou plus, 3 chambres, à Vence, Saint-Paul-de-Vence ou Tourrettes-sur-Loup, avec un jardin indispensable, au calme et sans vis-à-vis, jusqu’à 750 000 €.';

export const DEMO_PHRASE_OUTPUT = {
  name: 'M. et Mme Arnaud',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  language: null,
  property_types: ['house'],
  cities: ['Vence', 'Saint-Paul-de-Vence', 'Tourrettes-sur-Loup'],
  budget_ideal: null,
  budget_max: 750000,
  rooms_min: 4,
  bedrooms_min: 3,
  surface_min: null,
  outdoor: true,
  parking: null,
  pool: null,
  floor_min: null,
  elevator: null,
  energy_rating_max: null,
  works_accepted: null,
  condominium_accepted: null,
  must_have: ['outdoor'],
  financing: null,
  soft_criteria: [
    { key: 'calme', words: 'au calme' },
    { key: 'sans_vis_a_vis', words: 'sans vis-à-vis' },
  ],
  unclassified_wishes: [],
  notes: null,
  sources: [
    { field: 'name', quote: 'M. et Mme Arnaud' },
    { field: 'property_types', quote: 'Une maison de 4 pièces ou plus' },
    { field: 'rooms_min', quote: 'Une maison de 4 pièces ou plus' },
    { field: 'bedrooms_min', quote: '3 chambres' },
    { field: 'cities', quote: 'à Vence, Saint-Paul-de-Vence ou Tourrettes-sur-Loup' },
    { field: 'budget_max', quote: 'jusqu’à 750 000 €' },
    { field: 'outdoor', quote: 'avec un jardin indispensable' },
    { field: 'must_have:outdoor', quote: 'avec un jardin indispensable' },
    { field: 'soft_criteria', quote: 'au calme et sans vis-à-vis' },
  ],
  personal_mentions_skipped: 0,
} as const;

// Ce que la lecture simulée rend : pour un texte, la réponse de la phrase — sauf le texte des notes
// inventées (« Compléter depuis mes notes », « Coller un texte »), qui garde la sienne ; pour une
// photo ou un fichier, celle des notes.
export function demoNotesOutput(kind: 'photo' | 'file' | 'text', text: string | null) {
  return kind === 'text' && !(text ?? '').includes('ARNAUD (M. et Mme)')
    ? DEMO_PHRASE_OUTPUT
    : DEMO_NOTES_OUTPUT;
}
