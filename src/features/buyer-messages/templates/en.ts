import type { LanguageTemplates } from '@/features/buyer-messages/templates/types';

// Mission 139 — the English messages. À FAIRE RELIRE par un locuteur natif avant le `/valide`
// (décision de Jean-Guy, 06/11) : ce fichier est à part pour cela (`docs/MODELES_A_RELIRE.md`).
// British English: dates as « 6 November », never « 11/6 ».
const inCity = (noun: string, city: string | null): string => (city ? `${noun} in ${city}` : noun);

export const ENGLISH: LanguageTemplates = {
  locale: 'en-GB',
  greeting: (name) => `Dear ${name},`,
  property: (kind, city) =>
    inCity(
      kind === 'house' ? 'the house' : kind === 'apartment' ? 'the flat' : 'the property',
      city,
    ),
  visit: {
    thanks: (property, day) => `Thank you for visiting ${property} on ${day}.`,
    liked: (list) => `What you liked: ${list}.`,
    disliked: (list) => `What held you back: ${list}.`,
    next: {
      offer:
        'As agreed, we will prepare your offer together: I will call you to go through the terms.',
      second_visit: 'I suggest a second viewing: I will get back to you with some possible times.',
      keep_searching:
        'I am still searching for you and will send you the next properties that match your search.',
    },
    tags: {
      district: { liked: 'the neighbourhood', disliked: 'the neighbourhood' },
      surface: { liked: 'the size', disliked: 'the size' },
      outdoor: { liked: 'the outdoor space', disliked: 'the outdoor space' },
      parking: { liked: 'the parking', disliked: 'the parking' },
      price: { liked: 'the price', disliked: 'the price' },
      works: { liked: 'the condition of the property', disliked: 'the work needed' },
      light: { liked: 'the light', disliked: 'the light' },
      overlooked: { liked: 'the open outlook', disliked: 'being overlooked' },
      noise: { liked: 'the quiet', disliked: 'the noise' },
      pool: { liked: 'the pool', disliked: 'the pool' },
    },
  },
  weekly: {
    intro: 'Here is this week’s update on your search.',
    lead: 'This week for you: ',
    studied: { one: '{n} property reviewed', other: '{n} properties reviewed' },
    dismissed: { one: '{n} set aside', other: '{n} set aside' },
    retained: { one: '{n} shortlisted', other: '{n} shortlisted' },
    visits: { one: '{n} viewing', other: '{n} viewings' },
    reasons: {
      terrace: 'for the terrace',
      parking: 'for parking',
      floor: 'for the floor',
      sector: 'for the location',
      over_budget: 'for the price',
      condition: 'for the condition',
      other: 'for another reason',
    },
    empty: 'No new property matched your search this week; I am keeping a close eye on the market.',
    closing: 'Please do not hesitate to contact me.',
  },
  meeting: {
    body: 'I would like to suggest a meeting to review your search together, at the agency or by video call, whichever suits you best. When would be convenient for you?',
  },
};
