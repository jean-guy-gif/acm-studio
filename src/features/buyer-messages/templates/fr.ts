import type { LanguageTemplates } from '@/features/buyer-messages/templates/types';

// Mission 139 — les messages en français, la langue par défaut.
const of = (noun: string, city: string | null): string => {
  if (!city) return noun;
  return /^[aeiouyàâéèêîôûh]/i.test(city) ? `${noun} d’${city}` : `${noun} de ${city}`;
};

export const FRENCH: LanguageTemplates = {
  locale: 'fr-FR',
  greeting: (name) => `Bonjour ${name},`,
  // Avec sa préposition, que « la visite » attend : « de la maison de Mougins », « du bien ».
  property: (kind, city) =>
    of(
      kind === 'house' ? 'de la maison' : kind === 'apartment' ? 'de l’appartement' : 'du bien',
      city,
    ),
  visit: {
    thanks: (property, day) => `Merci pour la visite ${property} le ${day}.`,
    liked: (list) => `Ce qui vous a plu : ${list}.`,
    disliked: (list) => `Ce qui vous a gêné : ${list}.`,
    next: {
      offer:
        'Comme convenu, nous préparons ensemble votre offre d’achat : je vous appelle pour en fixer les termes.',
      second_visit: 'Je vous propose une deuxième visite : je reviens vers vous avec des créneaux.',
      keep_searching:
        'Je continue à chercher pour vous et je vous envoie les prochains biens qui correspondent à votre recherche.',
    },
    tags: {
      district: { liked: 'le quartier', disliked: 'le quartier' },
      surface: { liked: 'la surface', disliked: 'la surface' },
      outdoor: { liked: 'l’extérieur', disliked: 'l’extérieur' },
      parking: { liked: 'le stationnement', disliked: 'le stationnement' },
      price: { liked: 'le prix', disliked: 'le prix' },
      works: { liked: 'l’état du bien', disliked: 'les travaux à prévoir' },
      light: { liked: 'la luminosité', disliked: 'la luminosité' },
      overlooked: { liked: 'l’absence de vis-à-vis', disliked: 'le vis-à-vis' },
      noise: { liked: 'le calme', disliked: 'le bruit' },
      pool: { liked: 'la piscine', disliked: 'la piscine' },
    },
  },
  weekly: {
    intro: 'Voici le point de la semaine sur votre recherche.',
    lead: 'Cette semaine pour vous : ',
    studied: { one: '{n} bien étudié', other: '{n} biens étudiés' },
    dismissed: { one: '{n} écarté', other: '{n} écartés' },
    retained: { one: '{n} retenu', other: '{n} retenus' },
    visits: { one: '{n} visite', other: '{n} visites' },
    reasons: {
      terrace: 'pour la terrasse',
      parking: 'pour le stationnement',
      floor: 'pour l’étage',
      sector: 'pour le secteur',
      over_budget: 'pour le prix',
      condition: 'pour l’état',
      other: 'pour une autre raison',
    },
    empty: 'Pas de nouveau bien correspondant cette semaine ; je reste attentif.',
    closing: 'Je reste à votre disposition.',
  },
  meeting: {
    body: 'Je vous propose de faire le point ensemble sur votre recherche, à l’agence ou en visio, comme vous préférez. Quel moment vous conviendrait ?',
  },
  subjects: { visit: 'Notre visite', weekly: 'Le point de la semaine', meeting: 'Faire le point' },
};
