import type { StudyKind, StudyTexts } from '@/lib/client-texts/study-types';

// Mission 163 A — the market study sentences, in English (to be read by a native speaker,
// `docs/MODELES_A_RELIRE.md`). Same structure and arguments as the French.

type Noun = { one: string; many: string };
const NOUNS: Record<StudyKind, Noun> = {
  maison: { one: 'house', many: 'houses' },
  appartement: { one: 'flat', many: 'flats' },
  bien: { one: 'property', many: 'properties' },
};

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (count: number): string => (count < WORDS.length ? WORDS[count]! : String(count));
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const and = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
const noun = (kind: StudyKind, count: number) => (count === 1 ? NOUNS[kind].one : NOUNS[kind].many);
const cheaperPhrase = (count: number, kind: StudyKind): string =>
  count === 0
    ? `no ${NOUNS[kind].one} for sale is cheaper than yours`
    : count === 1
      ? `one ${NOUNS[kind].one} for sale is cheaper than yours`
      : `${word(count)} ${NOUNS[kind].many} for sale are cheaper than yours`;
const checklist = (kind: StudyKind): string =>
  kind === 'maison'
    ? 'floor area, land, condition, date of sale'
    : kind === 'appartement'
      ? 'floor area, floor, condition, date of sale'
      : 'floor area, condition, date of sale';
const within = (radius: string | null) => (radius ? `within ${radius}` : 'around your home');

export const ENGLISH_STUDY: StudyTexts = {
  kicker: 'Market study',
  coverTitle: (kind, commune) =>
    `Your ${NOUNS[kind].one}${commune ? ` in ${commune}` : ''} and the market`,
  coverLand: (area) => `${area} of land`,
  preparedFor: 'Prepared for',
  preparedBy: (advisor, agency, day) =>
    `${advisor ? `by ${advisor}, ${agency}` : `by ${agency}`}, on ${day}`,
  footer: (kind, commune, day) =>
    ['Market study', `${cap(NOUNS[kind].one)}${commune ? ` in ${commune}` : ''}`, day].join(' · '),
  salutation: (_civility, name) => `Dear ${name},`,
  avisBy: (advisor) => (advisor ? `${advisor}’s view` : 'Your agency’s view'),
  and,
  or: (items) =>
    items.length <= 1
      ? (items[0] ?? '')
      : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`,

  summary: {
    title: (count, kind) =>
      count <= 1
        ? `What this study tells you about your ${NOUNS[kind].one}`
        : `${cap(word(count))} things this study tells you about your ${NOUNS[kind].one}`,
    lead: (salutation, withSales) =>
      `${salutation ? `${salutation} here` : 'Here'} is what the listings${
        withSales ? ' and the sales' : ''
      } around your home say. I have gathered them for you, before your buyers do.`,
    kpiCompetitors: (count, kind) => `${noun(kind, count)} like yours for sale today`,
    kpiSales: (count, kind, since) => `${noun(kind, count)} sold near you since ${since}`,
    kpiPlace: 'where your price stands, from cheapest to most expensive',
    kpiDays: (days) => (days > 1 ? 'days' : 'day'),
    kpiDaysLabel: (kind) =>
      `half the ${NOUNS[kind].many} for sale have been waiting for a buyer at least this long`,
    page: (page) => `page ${page}`,
    howTitle: 'How this study is made',
    how: (competitors, sales, quartier, kind) => {
      const gathered = [
        sales ? 'the sales signed at the notary' : null,
        quartier ? 'the public data for your address' : null,
      ].filter((item): item is string => item != null);
      const first = competitors
        ? `I selected the ${NOUNS[kind].many} for sale that are most like yours${
            gathered.length ? `, then gathered ${and(gathered)}` : ''
          }.`
        : gathered.length
          ? `I gathered ${and(gathered)}.`
          : '';
      return `${first ? `${first} ` : ''}Every figure has its source and its date.`;
    },
    valueTitle: (kind) => `And the value of your ${NOUNS[kind].one}?`,
    value: (price, proposed) =>
      `This study does not calculate it: it shows the market as your buyers see it. ${
        price
          ? proposed
            ? `The proposed price: ${price}.`
            : `The price, we set together: ${price}.`
          : 'We will set the price together.'
      }`,
  },

  competitors: {
    title: (inSale, kind) =>
      inSale === 0
        ? `The ${NOUNS[kind].many} compared with yours are no longer for sale`
        : inSale === 1
          ? `One ${NOUNS[kind].one} like yours is for sale today`
          : `${cap(word(inSale))} ${NOUNS[kind].many} like yours are for sale today`,
    lead: (inSale, kind, prices) => {
      if (inSale === 0) return `Here is each of them, side by side with your ${NOUNS[kind].one}.`;
      if (inSale === 1)
        return `${prices ? `Its asking price: ${prices.from}. ` : ''}Your buyers will visit it too: here it is, side by side with your ${NOUNS[kind].one}.`;
      return `${
        prices && prices.from !== prices.to ? `From ${prices.from} to ${prices.to}. ` : ''
      }Your buyers will visit them too: here is each one, side by side with your ${NOUNS[kind].one}.`;
    },
    item: (inSale, kind, prices) =>
      `${ENGLISH_STUDY.competitors.title(inSale, kind)}${
        inSale === 0 || !prices
          ? ''
          : prices.from !== prices.to
            ? `, from ${prices.from} to ${prices.to}`
            : `, at ${prices.from}`
      }.`,
    itemSub: (shown, advantaged, against, weaker, strong) => {
      const parts: string[] = [];
      if (advantaged > 0 && against)
        parts.push(
          `${cap(word(advantaged))} ${advantaged > 1 ? 'have' : 'has'} an edge over yours: ${against}.`,
        );
      if (weaker > 0 && strong)
        parts.push(
          `Yours has the edge over ${
            shown === 1 ? 'it' : weaker === 1 ? 'one of them' : `${word(weaker)} of them`
          }: ${strong}.`,
        );
      if (parts.length === 0)
        parts.push(
          shown === 1
            ? 'From what the listing says, it is equivalent to yours.'
            : 'From what the listings say, they are equivalent to yours.',
        );
      return parts.join(' ');
    },
    avis: (shown, kind, advantaged, against, onlySurface, strengths) => {
      const first =
        shown === 1
          ? `Your buyers will not see your ${NOUNS[kind].one} on its own: they will compare it with this one.`
          : `Your buyers will not see your ${NOUNS[kind].one} on its own: they will compare it with these ${
              shown <= 10 ? word(shown) : shown
            }.`;
      const subject = shown === 1 ? 'It' : cap(word(advantaged));
      const second =
        advantaged > 0 && against
          ? onlySurface
            ? `${subject} ${shown === 1 || advantaged === 1 ? 'is' : 'are'} larger`
            : `${subject} ${shown === 1 || advantaged === 1 ? 'has' : 'have'} the edge on ${against}`
          : shown === 1
            ? 'It has no edge over yours in what the listing says'
            : 'None has an edge over yours in what the listings say';
      const third = strengths
        ? `; yours has ${strengths} going for it. That is what the listing must show.`
        : '. The listing must show what will make buyers choose yours.';
      return `${first} ${second}${third}`;
    },
    source: (day) =>
      `Listings as known on ${day}. Asking prices, not sale prices. Floor areas and features as advertised, to be checked.`,
    faceTo: (kind) => `Compared with your ${NOUNS[kind].one}`,
    youValue: (value) => `(yours: ${value})`,
    equivalentOn: (criteria) => `Equivalent on: ${criteria}.`,
    equivalentAll: (kind) => `Equivalent to your ${NOUNS[kind].one} on every criterion.`,
    criterion: {
      surface: 'floor area',
      energy_rating: 'energy rating',
      rooms: 'number of rooms',
      bedrooms: 'number of bedrooms',
      condition: 'condition',
      ges_rating: 'emissions rating',
      outdoor: 'outdoor space',
      parking: 'parking',
      exposure: 'aspect',
    },
    criterionBare: {
      surface: 'floor area',
      energy_rating: 'energy rating',
      rooms: 'rooms',
      bedrooms: 'bedrooms',
      condition: 'condition',
      ges_rating: 'emissions rating',
      outdoor: 'outdoor space',
      parking: 'parking',
      exposure: 'aspect',
    },
    strength: {
      surface: (value) => `its ${value}`,
      energy_rating: (value) => `its energy rating ${value}`,
      rooms: (value) => `its ${value} rooms`,
      bedrooms: (value) => `its ${value} bedrooms`,
      condition: (value) => `its condition (${value.toLowerCase()})`,
      ges_rating: (value) => `its emissions rating ${value}`,
      outdoor: (value) => `its outdoor space (${value.toLowerCase()})`,
      parking: (value) => `its parking (${value.toLowerCase()})`,
      exposure: (value) => `its ${value.toLowerCase()} aspect`,
    },
  },

  sales: {
    title: (count, kind) =>
      count === 1
        ? `One ${NOUNS[kind].one} like yours has sold near you`
        : `${cap(word(count))} ${NOUNS[kind].many} like yours have sold near you`,
    lead: (count, since, radius, surface, prices) => {
      const scope = [
        `Since ${since}`,
        radius ? `within ${radius}` : null,
        surface ? `from ${surface.from} to ${surface.to}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      const signed = !prices
        ? ''
        : count === 1 || prices.from === prices.to
          ? ` ${count === 1 ? 'A price' : 'Prices'} signed at the notary: ${prices.from}.`
          : ` Prices signed at the notary, from ${prices.from} to ${prices.to}.`;
      return `${scope}.${signed}`;
    },
    item: (count, kind, surface, since) =>
      `${cap(word(count))} ${noun(kind, count)}${
        surface ? ` from ${surface.from} to ${surface.to}` : ''
      } ${count === 1 ? 'has' : 'have'} sold near you since ${since}.`,
    itemSub: (count, kept, kind, likeness) =>
      count === 1
        ? 'A price signed at the notary.'
        : `Prices signed at the notary. ${
            kept >= count
              ? 'I kept them all.'
              : likeness
                ? `I selected ${word(kept)}, the ones most like your ${NOUNS[kind].one}${
                    likeness.facts ? `: ${likeness.facts}` : ''
                  }.`
                : `I selected ${word(kept)}, the most recent.`
          }`,
    tableTitle: (count, kept, kind, likeness) =>
      kept < count
        ? likeness
          ? `The ${word(kept)} sales most like your ${NOUNS[kind].one}`
          : `The ${word(kept)} most recent sales`
        : count === 1
          ? 'The sale'
          : `The ${word(count)} sales`,
    tableNote: (likeness) =>
      `${
        likeness.rooms && likeness.surface
          ? 'Chosen first on the number of rooms, then on floor area'
          : likeness.rooms
            ? 'Chosen on the number of rooms'
            : 'Chosen on floor area'
      }${likeness.facts ? `: ${likeness.facts}` : ''}.`,
    legendKept: (kept) =>
      kept === 1
        ? 'the selected sale, numbered as in the table'
        : `the ${kept} selected sales, numbered as in the table`,
    legendOthers: (others) => (others === 1 ? 'the other sale' : `the ${others} other sales`),
    readTitle: 'How to read these figures',
    read: [
      'These are real sale prices, not asking prices.',
      'An older sale was signed at the prices of its year: the market has moved since.',
      'Sales from recent months are not all published yet.',
    ],
    rooms: (values) => {
      const sorted = [...new Set(values)].sort((a, b) => a - b);
      if (sorted.length === 0) return null;
      if (sorted.length === 1) return `${sorted[0]} room${sorted[0] === 1 ? '' : 's'}`;
      if (sorted.length === 2) return `${sorted[0]} or ${sorted[1]} rooms`;
      return `${sorted[0]} to ${sorted[sorted.length - 1]} rooms`;
    },
    surface: (range) => (range.from === range.to ? range.to : `${range.from} to ${range.to}`),
    avis: (kept, kind, rooms, surface) => {
      const facts = [rooms, surface].filter(Boolean).join(', ');
      return kept === 1
        ? `This ${NOUNS[kind].one} is like yours${facts ? `: ${facts}` : ''}. We look at it together: ${checklist(kind)}.`
        : `These ${word(kept)} ${NOUNS[kind].many} are like yours${
            facts ? `: ${facts}` : ''
          }. We look at them together, one by one: ${checklist(kind)}.`;
    },
    privacy: 'No seller or buyer is named.',
  },

  ranking: {
    title: (price, count, kind) => `At ${price}, ${cheaperPhrase(count, kind)}`,
    lead: (inSale, kind) =>
      inSale === 1
        ? `Your price, compared with the ${NOUNS[kind].one} for sale.`
        : `Your price, compared with the ${word(inSale)} ${NOUNS[kind].many} for sale, from cheapest to most expensive.`,
    itemBefore: 'Your price ranks ',
    itemAfter: (total, count, kind) => ` of ${total}: ${cheaperPhrase(count, kind)}.`,
    itemSub: (price, proposed, count) =>
      `At ${price}, ${proposed ? 'the proposed price' : 'the price we set together'}.${
        count === 0
          ? ''
          : count === 1
            ? ' It is the one your buyers will visit first.'
            : ' These are the ones your buyers will visit first.'
      }`,
    avis: (count, kind, strengths) =>
      count > 0
        ? `A buyer often starts with the cheapest. ${
            strengths
              ? `What sets your ${NOUNS[kind].one} apart must show from the listing: ${strengths}.`
              : `The listing for your ${NOUNS[kind].one} must show, from the first photo, what will make buyers choose it.`
          }`
        : `${cap(cheaperPhrase(0, kind))}: buyers often start with the cheapest.${
            strengths ? ` It also has ${strengths} going for it.` : ''
          }`,
    verdictNote:
      'The first third is no problem, the second needs your attention, the last is a danger.',
    source: (day, proposed, kind) =>
      `Asking prices, as known on ${day}. Your ${NOUNS[kind].one} at ${
        proposed ? 'the proposed price' : 'the price we set together'
      }. At equal prices, your ${NOUNS[kind].one} takes the better rank.`,
  },

  quartier: {
    title: (conclusion) => `What your buyer will ask: ${conclusion}`,
    parcelNothing: 'nothing recorded on your plot',
    parcelCount: (count) => `${word(count)} planning item${count > 1 ? 's' : ''} on your plot`,
    permits: (count, radius) =>
      count === 0
        ? `no building permit ${within(radius)}`
        : `${word(count)} building permit${count > 1 ? 's' : ''} ${within(radius)}`,
    risks: 'the risks at your address',
    figures: 'your neighbourhood in figures',
    lead: (parts) => {
      const names = {
        planning: 'the local plan',
        permits: 'what is being built nearby',
        risks: 'the risks',
        population: 'the residents of the neighbourhood',
        condominium: 'the building',
      };
      return `${cap(parts.map((part) => names[part]).join(', '))}. Your buyer will ${
        parts.includes('risks') ? 'receive them before signing' : 'ask about them'
      }: here they are, as the public data gives them.`;
    },
    item: (conclusion) => `${cap(conclusion)}.`,
    riskPapers: 'Your buyer will receive the risk statement before signing.',
    risksNote: 'This is not the official risk statement, which must be provided for the sale.',
    residents: 'Residents',
    talkTitle: 'How to talk about it with a buyer',
    talk: [
      {
        lead: 'Say it first.',
        text: 'A risk you mention first reassures; discovered at the notary, it casts doubt on everything else.',
      },
      {
        lead: 'Show what has actually happened.',
        text: 'Claims made or not, work carried out: the facts count more than the map.',
      },
      {
        lead: 'Prepare the papers.',
        text: 'The risk statement, the insurance certificates and, if any, the invoices for the work.',
      },
    ],
    avisPermits: (count, dwellings, radius) =>
      count === 0
        ? `No building permit is recorded ${within(radius)}: it is a question buyers often ask, and we have the answer.`
        : `${cap(word(count))} building permit${count > 1 ? 's are' : ' is'} recorded ${within(radius)}${
            dwellings ? `, for ${dwellings} home${dwellings > 1 ? 's' : ''} in all` : ''
          }: it is a question buyers often ask, and we have the answer, permits in hand.`,
    avisFlood:
      'Your town lies in an area at significant risk of flooding: we will say so first, and you will tell me what you have actually experienced.',
    avisRisks:
      'The risks at your address are public: we will present them first, with the official risk statement.',
    avisParcel: (count) =>
      count === 0
        ? 'The local plan records nothing on your plot: it is a question buyers often ask, and we have the answer.'
        : `The local plan records ${word(count)} item${count > 1 ? 's' : ''} on your plot: we will look at ${
            count > 1 ? 'them' : 'it'
          } together before the sale.`,
  },

  next: {
    title: 'What comes next, in three steps',
    steps: (kind) => [
      {
        title: 'Today',
        text: 'We read this study together. You tell me what the listings do not say.',
      },
      {
        title: 'Going on sale',
        text: `Listing, photos, surveys: your ${NOUNS[kind].one} reaches the market ready to be compared.`,
      },
      {
        title: 'Every month',
        text: 'A market update: what has dropped, what has sold, where your price stands.',
      },
    ],
    papersTitle: 'Papers to gather',
    papers: (kind) => [
      'The title deed',
      'The latest property tax notice',
      'The surveys already carried out',
      'The plans, if any',
      'Invoices for recent work',
      ...(kind === 'maison' ? ['The drainage certificate'] : []),
      ...(kind === 'appartement'
        ? ['The minutes of the last three general meetings', 'The building’s regulations']
        : []),
      'Any claim made to the insurer',
    ],
    questionsTitle: 'Your questions for our next conversation',
    contact: 'To reach me',
    isTitle: 'What this study is, and what it is not',
    is: (kind, day, withSales, price) =>
      `It compares your ${NOUNS[kind].one} with the ${NOUNS[kind].many} for sale on ${day}${
        withSales ? ' and with the sales published around your home' : ''
      }. The prices of the properties for sale are asking prices, not sale prices${
        withSales ? '; those of the actual sales were signed at the notary' : ''
      }; floor areas and features as advertised, to be checked. It does not give the value of your ${
        NOUNS[kind].one
      }: ${
        price === 'agreed'
          ? 'we have set the price together'
          : price === 'proposed'
            ? 'it shows where the proposed price stands'
            : 'we will set the price together'
      }. No seller or buyer is named.`,
    sourceRows: {
      competitors: 'Properties for sale',
      sales: 'Sales',
      planning: 'Planning and permits',
      risks: 'Risks and residents',
      condominium: 'Building',
      planningOnly: 'Planning',
      permitsOnly: 'Building permits',
      risksOnly: 'Risks',
      peopleOnly: 'Residents',
    },
    competitorsSource: 'Listings on property portals',
  },
};
