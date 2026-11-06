import type { LanguageTemplates } from '@/features/buyer-messages/templates/types';

// Mission 139 — сообщения на русском. Cachés sur la fiche (`LANGUE_RUSSE_PROPOSEE`) tant qu'un
// locuteur natif ne les a pas relus (`docs/MODELES_A_RELIRE.md`). Les chiffres s'écrivent « Изучено
// объектов: 14 » : la forme ne s'accorde pas au nombre, ce qui évite les trois pluriels du russe ;
// le bien au génitif (« просмотр дома в Mougins »), la commune en lettres latines, comme l'annonce.
const inCity = (noun: string, city: string | null): string => (city ? `${noun} в ${city}` : noun);

export const RUSSIAN: LanguageTemplates = {
  locale: 'ru-RU',
  greeting: (name) => `Здравствуйте, ${name}!`,
  property: (kind, city) =>
    inCity(kind === 'house' ? 'дома' : kind === 'apartment' ? 'квартиры' : 'объекта', city),
  visit: {
    thanks: (property, day) => `Спасибо за просмотр ${property} ${day}.`,
    liked: (list) => `Что вам понравилось: ${list}.`,
    disliked: (list) => `Что вас смутило: ${list}.`,
    next: {
      offer:
        'Как мы договорились, мы вместе подготовим ваше предложение о покупке: я позвоню вам, чтобы обсудить условия.',
      second_visit: 'Предлагаю повторный просмотр: я свяжусь с вами и предложу удобное время.',
      keep_searching:
        'Я продолжаю поиск для вас и пришлю следующие объекты, подходящие под ваш запрос.',
    },
    tags: {
      district: { liked: 'район', disliked: 'район' },
      surface: { liked: 'площадь', disliked: 'площадь' },
      outdoor: { liked: 'терраса или сад', disliked: 'терраса или сад' },
      parking: { liked: 'парковка', disliked: 'парковка' },
      price: { liked: 'цена', disliked: 'цена' },
      works: { liked: 'состояние объекта', disliked: 'необходимый ремонт' },
      light: { liked: 'освещённость', disliked: 'освещённость' },
      overlooked: { liked: 'открытый вид', disliked: 'окна напротив' },
      noise: { liked: 'тишина', disliked: 'шум' },
      pool: { liked: 'бассейн', disliked: 'бассейн' },
    },
  },
  weekly: {
    intro: 'Вот итоги недели по вашему поиску.',
    lead: 'На этой неделе для вас: ',
    studied: { one: 'изучено объектов: {n}', other: 'изучено объектов: {n}' },
    dismissed: { one: 'отклонено: {n}', other: 'отклонено: {n}' },
    retained: { one: 'отобрано: {n}', other: 'отобрано: {n}' },
    visits: { one: 'просмотров: {n}', other: 'просмотров: {n}' },
    reasons: {
      terrace: 'из-за террасы',
      parking: 'из-за парковки',
      floor: 'из-за этажа',
      sector: 'из-за района',
      over_budget: 'из-за цены',
      condition: 'из-за состояния',
      other: 'по другой причине',
    },
    empty: 'На этой неделе новых подходящих объектов не появилось; я внимательно слежу за рынком.',
    closing: 'Остаюсь на связи.',
  },
  meeting: {
    body: 'Предлагаю вместе обсудить ваш поиск — в агентстве или по видеосвязи, как вам удобнее. Когда вам было бы удобно встретиться?',
  },
  subjects: { visit: 'Наш просмотр', weekly: 'Итоги недели', meeting: 'Встреча по вашему поиску' },
};
