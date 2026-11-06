import type { LanguageTemplates } from '@/features/buyer-messages/templates/types';

// Mission 139 — die Nachrichten auf Deutsch. Cachés sur la fiche (`LANGUE_ALLEMAND_PROPOSEE`) tant
// qu'un locuteur natif ne les a pas relus (`docs/MODELES_A_RELIRE.md`). Le bien au génitif : « die
// Besichtigung des Hauses in Mougins ».
const inCity = (noun: string, city: string | null): string => (city ? `${noun} in ${city}` : noun);

export const GERMAN: LanguageTemplates = {
  locale: 'de-DE',
  greeting: (name) => `Guten Tag ${name},`,
  property: (kind, city) =>
    inCity(
      kind === 'house' ? 'des Hauses' : kind === 'apartment' ? 'der Wohnung' : 'der Immobilie',
      city,
    ),
  visit: {
    thanks: (property, day) => `Vielen Dank für die Besichtigung ${property} am ${day}.`,
    liked: (list) => `Was Ihnen gefallen hat: ${list}.`,
    disliked: (list) => `Was Sie gestört hat: ${list}.`,
    next: {
      offer:
        'Wie besprochen bereiten wir Ihr Kaufangebot gemeinsam vor: Ich rufe Sie an, um die Einzelheiten zu klären.',
      second_visit:
        'Ich schlage Ihnen eine zweite Besichtigung vor und melde mich mit Terminvorschlägen.',
      keep_searching:
        'Ich suche weiter für Sie und schicke Ihnen die nächsten Immobilien, die zu Ihrer Suche passen.',
    },
    tags: {
      district: { liked: 'die Lage', disliked: 'die Lage' },
      surface: { liked: 'die Wohnfläche', disliked: 'die Wohnfläche' },
      outdoor: { liked: 'der Außenbereich', disliked: 'der Außenbereich' },
      parking: { liked: 'der Parkplatz', disliked: 'der Parkplatz' },
      price: { liked: 'der Preis', disliked: 'der Preis' },
      works: { liked: 'der Zustand der Immobilie', disliked: 'die nötigen Renovierungsarbeiten' },
      light: { liked: 'die Helligkeit', disliked: 'die Helligkeit' },
      overlooked: { liked: 'der freie Blick', disliked: 'die Einsehbarkeit' },
      noise: { liked: 'die Ruhe', disliked: 'der Lärm' },
      pool: { liked: 'der Pool', disliked: 'der Pool' },
    },
  },
  weekly: {
    intro: 'Hier ist der Wochenüberblick zu Ihrer Suche.',
    lead: 'Diese Woche für Sie: ',
    studied: { one: '{n} Immobilie geprüft', other: '{n} Immobilien geprüft' },
    dismissed: { one: '{n} aussortiert', other: '{n} aussortiert' },
    retained: { one: '{n} ausgewählt', other: '{n} ausgewählt' },
    visits: { one: '{n} Besichtigung', other: '{n} Besichtigungen' },
    reasons: {
      terrace: 'wegen der Terrasse',
      parking: 'wegen des Parkplatzes',
      floor: 'wegen der Etage',
      sector: 'wegen der Lage',
      over_budget: 'wegen des Preises',
      condition: 'wegen des Zustands',
      other: 'aus einem anderen Grund',
    },
    empty: 'Diese Woche gab es keine neue passende Immobilie; ich behalte den Markt im Blick.',
    closing: 'Ich stehe Ihnen gern zur Verfügung.',
  },
  meeting: {
    body: 'Ich schlage Ihnen ein gemeinsames Gespräch über Ihre Suche vor, in der Agentur oder per Videoanruf, wie es Ihnen lieber ist. Wann passt es Ihnen?',
  },
  subjects: {
    visit: 'Unsere Besichtigung',
    weekly: 'Ihr Wochenüberblick',
    meeting: 'Gespräch zu Ihrer Suche',
  },
};
