import type { LanguageTemplates } from '@/features/buyer-messages/templates/types';

// Mission 139 — i messaggi in italiano. Cachés sur la fiche (`LANGUE_ITALIEN_PROPOSEE`) tant qu'un
// locuteur natif ne les a pas relus (`docs/MODELES_A_RELIRE.md`).
const inCity = (noun: string, city: string | null): string => (city ? `${noun} a ${city}` : noun);

export const ITALIAN: LanguageTemplates = {
  locale: 'it-IT',
  greeting: (name) => `Buongiorno ${name},`,
  property: (kind, city) =>
    inCity(
      kind === 'house' ? 'la casa' : kind === 'apartment' ? 'l’appartamento' : 'l’immobile',
      city,
    ),
  visit: {
    thanks: (property, day) => `Grazie per aver visitato ${property} il ${day}.`,
    liked: (list) => `Cosa vi è piaciuto: ${list}.`,
    disliked: (list) => `Cosa vi ha frenato: ${list}.`,
    next: {
      offer:
        'Come concordato, prepariamo insieme la vostra proposta d’acquisto: vi chiamo per definirne i termini.',
      second_visit: 'Vi propongo una seconda visita: vi ricontatto con alcune disponibilità.',
      keep_searching:
        'Continuo a cercare per voi e vi invierò i prossimi immobili in linea con la vostra ricerca.',
    },
    tags: {
      district: { liked: 'il quartiere', disliked: 'il quartiere' },
      surface: { liked: 'la superficie', disliked: 'la superficie' },
      outdoor: { liked: 'lo spazio esterno', disliked: 'lo spazio esterno' },
      parking: { liked: 'il parcheggio', disliked: 'il parcheggio' },
      price: { liked: 'il prezzo', disliked: 'il prezzo' },
      works: { liked: 'lo stato dell’immobile', disliked: 'i lavori da fare' },
      light: { liked: 'la luminosità', disliked: 'la luminosità' },
      overlooked: { liked: 'la vista libera', disliked: 'la vicinanza degli edifici di fronte' },
      noise: { liked: 'la tranquillità', disliked: 'il rumore' },
      pool: { liked: 'la piscina', disliked: 'la piscina' },
    },
  },
  weekly: {
    intro: 'Ecco il punto della settimana sulla vostra ricerca.',
    lead: 'Questa settimana per voi: ',
    studied: { one: '{n} immobile esaminato', other: '{n} immobili esaminati' },
    dismissed: { one: '{n} scartato', other: '{n} scartati' },
    retained: { one: '{n} selezionato', other: '{n} selezionati' },
    visits: { one: '{n} visita', other: '{n} visite' },
    reasons: {
      terrace: 'per il terrazzo',
      parking: 'per il parcheggio',
      floor: 'per il piano',
      sector: 'per la zona',
      over_budget: 'per il prezzo',
      condition: 'per lo stato',
      other: 'per un altro motivo',
    },
    empty: 'Nessun nuovo immobile corrispondente questa settimana; continuo a seguire il mercato.',
    closing: 'Resto a vostra disposizione.',
  },
  meeting: {
    body: 'Vi propongo di fare il punto insieme sulla vostra ricerca, in agenzia o in videochiamata, come preferite. Quando vi andrebbe bene?',
  },
  subjects: {
    visit: 'La nostra visita',
    weekly: 'Il punto della settimana',
    meeting: 'Fare il punto',
  },
};
