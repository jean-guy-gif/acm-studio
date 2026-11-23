import type { StudyKind, StudyTexts } from '@/lib/client-texts/study-types';

// Mission 163 A — les phrases de l'Étude de marché, en français (maquette M163-fil-conducteur,
// validée par Jean-Guy le 20/11). Composées depuis les chiffres : le mot du bien et ses accords
// (une maison, un appartement), les nombres en lettres jusqu'à douze.

type Noun = { one: string; many: string; feminine: boolean };
const NOUNS: Record<StudyKind, Noun> = {
  maison: { one: 'maison', many: 'maisons', feminine: true },
  appartement: { one: 'appartement', many: 'appartements', feminine: false },
  bien: { one: 'bien', many: 'biens', feminine: false },
};

const WORDS = ['zéro', '', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const word = (count: number, feminine: boolean): string =>
  count === 1 ? (feminine ? 'une' : 'un') : count < WORDS.length ? WORDS[count]! : String(count);
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const and = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;

// « la vôtre », « au vôtre », « que la vôtre »…
const yours = (n: Noun) => (n.feminine ? 'la vôtre' : 'le vôtre');
const toYours = (n: Noun) => (n.feminine ? 'à la vôtre' : 'au vôtre');
const e = (n: Noun, plural = false) => `${n.feminine ? 'e' : ''}${plural ? 's' : ''}`;
const cheaper = (n: Noun, plural: boolean) =>
  `moins ${n.feminine ? 'chère' : 'cher'}${plural ? 's' : ''}`;
const cheaperPhrase = (count: number, n: Noun): string =>
  count === 0
    ? `${n.feminine ? 'aucune' : 'aucun'} ${n.one} en vente n’est ${cheaper(n, false)} que ${yours(n)}`
    : count === 1
      ? `${word(1, n.feminine)} ${n.one} en vente est ${cheaper(n, false)} que ${yours(n)}`
      : `${word(count, n.feminine)} ${n.many} en vente sont ${cheaper(n, true)} que ${yours(n)}`;
const checklist = (kind: StudyKind): string =>
  kind === 'maison'
    ? 'surface, terrain, état, date de la vente'
    : kind === 'appartement'
      ? 'surface, étage, état, date de la vente'
      : 'surface, état, date de la vente';
const within = (radius: string | null) => (radius ? `à moins de ${radius}` : 'autour de chez vous');

export const FRENCH_STUDY: StudyTexts = {
  kicker: 'Étude de marché',
  coverTitle: (kind, commune) =>
    `Votre ${NOUNS[kind].one} ${commune ? `à ${commune} ` : ''}face au marché`,
  coverLand: (area) => `${area} de terrain`,
  preparedFor: 'Préparée pour',
  preparedBy: (advisor, agency, day) =>
    `${advisor ? `par ${advisor}, ${agency}` : `par ${agency}`}, le ${day}`,
  footer: (kind, commune, day) =>
    ['Étude de marché', `${cap(NOUNS[kind].one)}${commune ? ` à ${commune}` : ''}`, day].join(
      ' · ',
    ),
  salutation: (civility) =>
    civility === 'madame' ? 'Madame,' : civility === 'monsieur' ? 'Monsieur,' : 'Madame, Monsieur,',
  avisBy: (advisor) => (advisor ? `L’avis de ${advisor}` : 'L’avis de votre agence'),
  and,
  or: (items) =>
    items.length <= 1
      ? (items[0] ?? '')
      : `${items.slice(0, -1).join(', ')} ou ${items[items.length - 1]}`,

  summary: {
    title: (count, kind) =>
      count <= 1
        ? `Ce que cette étude vous apprend sur votre ${NOUNS[kind].one}`
        : `${cap(word(count, true))} choses que cette étude vous apprend sur votre ${NOUNS[kind].one}`,
    lead: (salutation, withSales) =>
      `${salutation ? `${salutation} voici` : 'Voici'} ce que disent les annonces${
        withSales ? ' et les ventes' : ''
      } autour de chez vous. Je les ai réunies pour vous, avant que vos acheteurs ne le fassent.`,
    kpiCompetitors: (count, kind) => {
      const n = NOUNS[kind];
      return `${count > 1 ? n.many : n.one} comme ${yours(n)} en vente aujourd’hui`;
    },
    kpiSales: (count, kind, since) => {
      const n = NOUNS[kind];
      return `${count > 1 ? n.many : n.one} vendu${e(n, count > 1)} autour de chez vous depuis ${since}`;
    },
    kpiPlace: 'la place de votre prix, du moins cher au plus cher',
    kpiSources: (count, page) =>
      `${count > 1 ? 'sources, toutes citées' : 'source, citée'} page ${page}`,
    page: (page) => `page ${page}`,
    howTitle: 'Comment cette étude est faite',
    how: (competitors, sales, quartier, kind) => {
      const n = NOUNS[kind];
      const gathered = [
        sales ? 'les ventes signées chez le notaire' : null,
        quartier ? 'les données publiques de votre adresse' : null,
      ].filter((item): item is string => item != null);
      const first = competitors
        ? `J’ai retenu les ${n.many} en vente qui ressemblent le plus ${toYours(n)}${
            gathered.length ? `, puis réuni ${and(gathered)}` : ''
          }.`
        : gathered.length
          ? `J’ai réuni ${and(gathered)}.`
          : '';
      return `${first ? `${first} ` : ''}Chaque chiffre a sa source et sa date.`;
    },
    valueTitle: (kind) => `Et la valeur de votre ${NOUNS[kind].one} ?`,
    value: (price, proposed) =>
      `Cette étude ne la calcule pas : elle montre le marché tel que vos acheteurs le voient. ${
        price
          ? proposed
            ? `Le prix proposé : ${price}.`
            : `Le prix, nous l’avons retenu ensemble : ${price}.`
          : 'Le prix, nous le fixerons ensemble.'
      }`,
  },

  competitors: {
    title: (inSale, kind) => {
      const n = NOUNS[kind];
      if (inSale === 0)
        return `Les ${n.many} comparé${e(n, true)} ${toYours(n)} ne sont plus en vente`;
      return inSale === 1
        ? `${cap(word(1, n.feminine))} ${n.one} comme ${yours(n)} est en vente aujourd’hui`
        : `${cap(word(inSale, n.feminine))} ${n.many} comme ${yours(n)} sont en vente aujourd’hui`;
    },
    lead: (inSale, kind, prices) => {
      const n = NOUNS[kind];
      const they = n.feminine ? 'elles' : 'eux';
      if (inSale === 0) return `Voici ${n.feminine ? 'chacune' : 'chacun'}, face à votre ${n.one}.`;
      if (inSale === 1)
        return `${prices ? `Son prix affiché : ${prices.from}. ` : ''}C’est ${
          n.feminine ? 'elle' : 'lui'
        } que vos acheteurs visitent aussi : ${n.feminine ? 'la' : 'le'} voici, face à votre ${n.one}.`;
      return `${
        prices && prices.from !== prices.to ? `De ${prices.from} à ${prices.to}. ` : ''
      }Ce sont ${they} que vos acheteurs visitent aussi : voici ${
        n.feminine ? 'chacune' : 'chacun'
      }, face à votre ${n.one}.`;
    },
    item: (inSale, kind, prices) =>
      `${FRENCH_STUDY.competitors.title(inSale, kind)}${
        inSale === 0 || !prices
          ? ''
          : prices.from !== prices.to
            ? `, de ${prices.from} à ${prices.to}`
            : `, à ${prices.from}`
      }.`,
    itemSub: (shown, advantaged, against, weaker, strong, kind) => {
      const n = NOUNS[kind];
      const parts: string[] = [];
      if (advantaged > 0 && against)
        parts.push(
          `${cap(word(advantaged, n.feminine))} ${advantaged > 1 ? 'ont' : 'a'} un avantage sur ${yours(n)} : ${against}.`,
        );
      if (weaker > 0 && strong)
        parts.push(
          `${cap(yours(n))} a l’avantage face à ${
            shown === 1
              ? n.feminine
                ? 'elle'
                : 'lui'
              : weaker === 1
                ? n.feminine
                  ? 'l’une d’entre elles'
                  : 'l’un d’entre eux'
                : `${word(weaker, n.feminine)} d’entre ${n.feminine ? 'elles' : 'eux'}`
          } : ${strong}.`,
        );
      if (parts.length === 0)
        parts.push(
          shown === 1
            ? `Sur ce que dit l’annonce, ${n.feminine ? 'elle est équivalente' : 'il est équivalent'} ${toYours(n)}.`
            : `Sur ce que disent les annonces, ${
                n.feminine ? 'elles sont équivalentes' : 'ils sont équivalents'
              } ${toYours(n)}.`,
        );
      return parts.join(' ');
    },
    avis: (shown, kind, advantaged, against, onlySurface, strengths) => {
      const n = NOUNS[kind];
      const alone = n.feminine ? 'seule' : 'seul';
      const it = n.feminine ? 'la' : 'le';
      const first =
        shown === 1
          ? `Vos acheteurs ne verront pas votre ${n.one} ${alone} : ils ${it} compareront à ${
              n.feminine ? 'celle-ci' : 'celui-ci'
            }.`
          : `Vos acheteurs ne verront pas votre ${n.one} ${alone} : ils ${it} compareront à ${
              shown <= 10 ? `ces ${word(shown, n.feminine)}-là` : `ces ${shown} ${n.many}`
            }.`;
      const bigger = (count: number) => `plus grand${n.feminine ? 'e' : ''}${count > 1 ? 's' : ''}`;
      const subject =
        shown === 1 ? (n.feminine ? 'Elle' : 'Il') : cap(word(advantaged, n.feminine));
      const second =
        advantaged > 0 && against
          ? onlySurface
            ? `${subject} ${shown === 1 || advantaged === 1 ? 'est' : 'sont'} ${bigger(shown === 1 ? 1 : advantaged)}`
            : `${subject} ${shown === 1 || advantaged === 1 ? 'a' : 'ont'} l’avantage sur ${against}`
          : shown === 1
            ? `${n.feminine ? 'Elle' : 'Il'} n’a pas d’avantage sur ${yours(n)} dans ce que dit l’annonce`
            : `${n.feminine ? 'Aucune' : 'Aucun'} n’a d’avantage sur ${yours(n)} dans ce que disent les annonces`;
      const third = strengths
        ? ` ; ${yours(n)} a pour ${n.feminine ? 'elle' : 'lui'} ${strengths}. C’est ce que l’annonce doit montrer.`
        : `. L’annonce doit montrer ce qui fera choisir ${yours(n)}.`;
      return `${first} ${second}${third}`;
    },
    source: (day) =>
      `Annonces telles que connues le ${day}. Prix affichés, pas des prix de vente. Surfaces et caractéristiques telles qu’annoncées, à vérifier.`,
    faceTo: (kind) => `Face à votre ${NOUNS[kind].one}`,
    youValue: (value) => `(vous : ${value})`,
    equivalentOn: (criteria) => `Équivalent sur : ${criteria}.`,
    equivalentAll: (kind) =>
      `${NOUNS[kind].feminine ? 'Équivalente' : 'Équivalent'} à votre ${NOUNS[kind].one} sur tous les critères.`,
    criterion: {
      surface: 'la surface',
      energy_rating: 'le DPE',
      rooms: 'le nombre de pièces',
      bedrooms: 'le nombre de chambres',
      condition: 'l’état général',
      ges_rating: 'le GES',
      outdoor: 'l’extérieur',
      parking: 'le stationnement',
      exposure: 'l’exposition',
    },
    criterionBare: {
      surface: 'surface',
      energy_rating: 'DPE',
      rooms: 'pièces',
      bedrooms: 'chambres',
      condition: 'état',
      ges_rating: 'GES',
      outdoor: 'extérieur',
      parking: 'stationnement',
      exposure: 'exposition',
    },
    strength: {
      surface: (value) => `ses ${value}`,
      energy_rating: (value) => `son DPE ${value}`,
      rooms: (value) => `ses ${value} pièces`,
      bedrooms: (value) => `ses ${value} chambres`,
      condition: (value) => `son état (${value.toLowerCase()})`,
      ges_rating: (value) => `son GES ${value}`,
      outdoor: (value) => `son extérieur (${value.toLowerCase()})`,
      parking: (value) => `son stationnement (${value.toLowerCase()})`,
      exposure: (value) => `son exposition ${value.toLowerCase()}`,
    },
  },

  sales: {
    title: (count, kind) => {
      const n = NOUNS[kind];
      return count === 1
        ? `${cap(word(1, n.feminine))} ${n.one} comme ${yours(n)} s’est vendu${e(n)} autour de chez vous`
        : `${cap(word(count, n.feminine))} ${n.many} comme ${yours(n)} se sont vendu${e(n, true)} autour de chez vous`;
    },
    lead: (count, since, radius, surface, prices) => {
      const scope = [
        `Depuis ${since}`,
        radius ? `à moins de ${radius}` : null,
        surface ? `de ${surface.from} à ${surface.to}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      const signed = !prices
        ? ''
        : count === 1 || prices.from === prices.to
          ? ` ${count === 1 ? 'Un prix signé' : 'Des prix signés'} chez le notaire : ${prices.from}.`
          : ` Des prix signés chez le notaire, de ${prices.from} à ${prices.to}.`;
      return `${scope}.${signed}`;
    },
    item: (count, kind, surface, since) => {
      const n = NOUNS[kind];
      const size = surface ? ` de ${surface.from} à ${surface.to}` : '';
      return count === 1
        ? `${cap(word(1, n.feminine))} ${n.one}${size} s’est vendu${e(n)} autour de chez vous depuis ${since}.`
        : `${cap(word(count, n.feminine))} ${n.many}${size} se sont vendu${e(n, true)} autour de chez vous depuis ${since}.`;
    },
    itemSub: (count, kept, kind) =>
      count === 1
        ? 'Un prix signé chez le notaire.'
        : `Des prix signés chez le notaire. ${
            kept < count
              ? `J’en ai retenu ${word(kept, true)}, les plus proches de votre ${NOUNS[kind].one}.`
              : 'Je les ai toutes retenues.'
          }`,
    tableTitle: (count, kept, kind) =>
      kept < count
        ? `Les ${word(kept, true)} ventes les plus proches de votre ${NOUNS[kind].one}`
        : count === 1
          ? 'La vente'
          : `Les ${word(count, true)} ventes`,
    legendKept: (kept) =>
      kept === 1
        ? 'la vente retenue, numérotée comme le tableau'
        : `les ${kept} ventes retenues, numérotées comme le tableau`,
    legendOthers: (others) => (others === 1 ? 'l’autre vente' : `les ${others} autres ventes`),
    readTitle: 'Comment lire ces chiffres',
    read: [
      'Ce sont des prix de vente réels, pas des prix d’annonce.',
      'Une vente ancienne s’est signée aux prix de son année : le marché a bougé depuis.',
      'Les ventes des derniers mois ne sont pas encore toutes publiées.',
    ],
    rooms: (values) => {
      const sorted = [...new Set(values)].sort((a, b) => a - b);
      if (sorted.length === 0) return null;
      const unit = (max: number) => (max > 1 ? 'pièces' : 'pièce');
      if (sorted.length === 1) return `${sorted[0]} ${unit(sorted[0]!)}`;
      if (sorted.length === 2) return `${sorted[0]} ou ${sorted[1]} pièces`;
      return `de ${sorted[0]} à ${sorted[sorted.length - 1]} pièces`;
    },
    surface: (range) => (range.from === range.to ? range.to : `de ${range.from} à ${range.to}`),
    avis: (kept, kind, rooms, surface) => {
      const n = NOUNS[kind];
      const facts = [rooms, surface].filter(Boolean).join(', ');
      if (kept === 1) {
        const these =
          kind === 'maison'
            ? 'Cette maison'
            : kind === 'appartement'
              ? 'Cet appartement'
              : 'Ce bien';
        return `${these} ressemble ${toYours(n)}${facts ? ` : ${facts}` : ''}. Nous ${
          n.feminine ? 'la' : 'le'
        } regardons ensemble : ${checklist(kind)}.`;
      }
      return `Ces ${word(kept, n.feminine)} ${n.many} ressemblent ${toYours(n)}${
        facts ? ` : ${facts}` : ''
      }. Nous les regardons ensemble, ${n.feminine ? 'une par une' : 'un par un'} : ${checklist(kind)}.`;
    },
    privacy: 'Aucun nom de vendeur ni d’acheteur.',
  },

  ranking: {
    title: (price, count, kind) => `À ${price}, ${cheaperPhrase(count, NOUNS[kind])}`,
    lead: (inSale, kind) => {
      const n = NOUNS[kind];
      return inSale === 1
        ? `Votre prix, face ${n.feminine ? 'à la' : 'au'} ${n.one} en vente.`
        : `Votre prix, face aux ${word(inSale, n.feminine)} ${n.many} en vente, du moins cher au plus cher.`;
    },
    itemBefore: 'Votre prix est ',
    itemAfter: (total, count, kind) => ` sur ${total} : ${cheaperPhrase(count, NOUNS[kind])}.`,
    itemSub: (price, proposed, count, kind) => {
      const n = NOUNS[kind];
      const who =
        count === 0
          ? ''
          : count === 1
            ? ` C’est ${n.feminine ? 'elle' : 'lui'} que vos acheteurs visiteront d’abord.`
            : ` Ce sont ${n.feminine ? 'elles' : 'eux'} que vos acheteurs visiteront d’abord.`;
      return `À ${price}, ${proposed ? 'le prix proposé' : 'le prix retenu ensemble'}.${who}`;
    },
    avis: (count, kind, strengths) => {
      const n = NOUNS[kind];
      if (count > 0)
        return `Un acheteur commence souvent par les ${cheaper(n, true)}. ${
          strengths
            ? `Ce qui distingue votre ${n.one} doit se voir dès l’annonce : ${strengths}.`
            : `L’annonce de votre ${n.one} doit montrer, dès la première photo, ce qui ${
                n.feminine ? 'la' : 'le'
              } fera choisir.`
        }`;
      return `${cap(cheaperPhrase(0, n))} : c’est souvent par les ${cheaper(n, true)} qu’un acheteur commence.${
        strengths
          ? ` ${n.feminine ? 'Elle' : 'Il'} a aussi pour ${n.feminine ? 'elle' : 'lui'} ${strengths}.`
          : ''
      }`;
    },
    verdictNote:
      'Le premier tiers ne pose pas de problème, le deuxième demande votre attention, le dernier est un danger.',
    source: (day, proposed, kind) => {
      const n = NOUNS[kind];
      return `Prix affichés, tels que connus le ${day}. Votre ${n.one} au ${
        proposed ? 'prix proposé' : 'prix retenu ensemble'
      }. À égalité de prix, votre ${n.one} prend le meilleur rang.`;
    },
  },

  quartier: {
    title: (conclusion) => `Ce que votre acheteur demandera : ${conclusion}`,
    parcelNothing: 'rien de relevé sur votre parcelle',
    parcelCount: (count) =>
      `${word(count, false)} élément${count > 1 ? 's' : ''} d’urbanisme sur votre parcelle`,
    permits: (count, radius) =>
      count === 0
        ? `aucun permis de construire ${within(radius)}`
        : `${word(count, false)} permis de construire ${within(radius)}`,
    risks: 'les risques de votre adresse',
    figures: 'votre quartier en chiffres',
    lead: (parts) => {
      const names = {
        planning: 'le plan d’urbanisme',
        permits: 'ce qui se construit autour',
        risks: 'les risques',
        population: 'les habitants du quartier',
        condominium: 'la copropriété',
      };
      return `${cap(parts.map((part) => names[part]).join(', '))}. Votre acheteur ${
        parts.includes('risks') ? 'les recevra avant de signer' : 'les demandera'
      } : les voici, tels que les données publiques les donnent.`;
    },
    item: (conclusion) => `${cap(conclusion)}.`,
    riskPapers: 'Votre acheteur recevra l’état des risques avant de signer.',
    risksNote: 'Ce n’est pas l’état des risques officiel, à produire pour la vente.',
    residents: 'Habitants',
    talkTitle: 'Comment en parler à un acheteur',
    talk: [
      {
        lead: 'Le dire en premier.',
        text: 'Un risque annoncé par le vendeur rassure ; découvert chez le notaire, il fait douter de tout le reste.',
      },
      {
        lead: 'Montrer ce qui a été vécu.',
        text: 'Sinistres déclarés ou non, travaux faits : les faits comptent plus que la carte.',
      },
      {
        lead: 'Préparer les papiers.',
        text: 'L’état des risques, les attestations d’assurance et, s’il y en a, les factures de travaux.',
      },
    ],
    avisPermits: (count, dwellings, radius) =>
      count === 0
        ? `Aucun permis de construire n’est relevé ${within(radius)} : c’est une question qu’un acheteur pose souvent, et nous avons la réponse.`
        : `${cap(word(count, false))} permis de construire ${count > 1 ? 'sont relevés' : 'est relevé'} ${within(
            radius,
          )}${
            dwellings ? `, pour ${dwellings} logement${dwellings > 1 ? 's' : ''} en tout` : ''
          } : c’est une question qu’un acheteur pose souvent, et nous avons la réponse, permis à l’appui.`,
    avisFlood:
      'Votre commune est classée en territoire à risque important d’inondation : nous le dirons en premier, et vous me direz ce que vous avez vécu.',
    avisRisks:
      'Les risques de votre adresse sont publics : nous les présenterons en premier, avec l’état des risques officiel.',
    avisParcel: (count) =>
      count === 0
        ? 'Rien n’est relevé sur votre parcelle au plan d’urbanisme : c’est une question qu’un acheteur pose souvent, et nous avons la réponse.'
        : `Le plan d’urbanisme relève ${word(count, false)} élément${count > 1 ? 's' : ''} sur votre parcelle : nous ${
            count > 1 ? 'les' : 'le'
          } regarderons ensemble avant la mise en vente.`,
  },

  next: {
    title: 'La suite tient en trois étapes',
    steps: (kind) => {
      const n = NOUNS[kind];
      return [
        {
          title: 'Aujourd’hui',
          text: 'Nous relisons cette étude ensemble. Vous me dites ce que les annonces ne disent pas.',
        },
        {
          title: 'La mise en vente',
          text: `Annonce, photos, diagnostics : votre ${n.one} arrive sur le marché ${
            n.feminine ? 'prête' : 'prêt'
          } à être comparé${e(n)}.`,
        },
        {
          title: 'Chaque mois',
          text: 'Un point marché : ce qui a baissé, ce qui s’est vendu, où en est votre prix.',
        },
      ];
    },
    papersTitle: 'Les papiers à réunir',
    papers: (kind) => [
      'Le titre de propriété',
      'Le dernier avis de taxe foncière',
      'Les diagnostics déjà réalisés',
      'Les plans, s’ils existent',
      'Les factures des travaux récents',
      ...(kind === 'maison' ? ['L’attestation d’assainissement'] : []),
      ...(kind === 'appartement'
        ? ['Les trois derniers procès-verbaux d’assemblée générale', 'Le règlement de copropriété']
        : []),
      'Tout sinistre déclaré à l’assurance',
    ],
    questionsTitle: 'Vos questions pour notre prochain échange',
    contact: 'Pour me joindre',
    isTitle: 'Ce que cette étude est, et ce qu’elle n’est pas',
    is: (kind, day, withSales, price) => {
      const n = NOUNS[kind];
      return `Elle compare votre ${n.one} aux ${n.many} en vente le ${day}${
        withSales ? ' et aux ventes publiées autour de chez vous' : ''
      }. Les prix des biens en vente sont ceux des annonces, pas des prix de vente${
        withSales ? ' ; ceux des ventes réelles ont été signés chez le notaire' : ''
      } ; surfaces et caractéristiques telles qu’annoncées, à vérifier. Elle ne donne pas la valeur de votre ${n.one} : ${
        price === 'agreed'
          ? 'le prix, nous l’avons retenu ensemble'
          : price === 'proposed'
            ? 'elle situe le prix proposé'
            : 'le prix, nous le fixerons ensemble'
      }. Aucun nom de vendeur ni d’acheteur n’est cité.`;
    },
    sourceRows: {
      competitors: 'Les biens en vente',
      sales: 'Les ventes',
      planning: 'Urbanisme et permis',
      risks: 'Risques et habitants',
      condominium: 'Copropriété',
    },
    competitorsSource: 'Annonces des portails immobiliers',
  },
};
