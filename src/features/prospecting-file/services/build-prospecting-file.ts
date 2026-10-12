import {
  cardTitles,
  closeness,
  comparedRows,
  differences,
  distinctFacts,
  formatDistance,
  sameCity,
} from '@/features/prospecting-file/services/compare-properties';
import { addressLines } from '@/features/prospecting-file/services/addressee-lines';
import { footerAgencyName } from '@/features/prospecting-file/services/document-name';
import { capitalize, propertyWording } from '@/features/prospecting-file/services/property-wording';
import type {
  FixedTexts,
  ProspectingFile,
  ProspectingFileFacts,
  ProspectingFileOverrides,
  ProspectingFileTexts,
  ProspectingFileVersion,
  ProspectingSender,
} from '@/features/prospecting-file/types';

// Mission 84 — le dossier complet, tel qu'il s'imprime : TOUS ses textes sortent d'ici, pour
// qu'un test puisse vérifier chaque interdit sur ce que le document dit réellement. Pur : il
// sert au serveur (texte proposé, enregistrement) et à l'écran d'édition (aperçu).

const NBSP = '\u00a0';

// Où se trouve notre bien par rapport au leur, sans rien affirmer qu'on ne sache.
function nearness(facts: ProspectingFileFacts): { owner: string; colleague: string } {
  const wording = propertyWording(facts.kind);
  if (facts.distanceMeters != null) {
    const distance = formatDistance(facts.distanceMeters);
    return {
      owner:
        facts.distanceMeters < 1000
          ? `à quelques rues ${wording.ofYourOne}`
          : `à ${distance} ${wording.ofYourOne}`,
      colleague: ` à ${distance}`,
    };
  }
  if (sameCity(facts)) {
    return {
      owner: `dans le même secteur que ${wording.yourOne}`,
      colleague: ' dans le même secteur',
    };
  }
  return { owner: `comparable ${wording.toYourOne}`, colleague: '' };
}

function ownerTexts(facts: ProspectingFileFacts): ProspectingFileTexts {
  const wording = propertyWording(facts.kind);
  const theirs = distinctFacts(facts).theirs;
  return {
    title: `${capitalize(wording.yourNoun)} et ${wording.ourOne}\nattirent *les mêmes acquéreurs.*`,
    letter: [
      'Madame, Monsieur,',
      `Je viens de mettre en vente ${wording.a} ${nearness(facts).owner}. En préparant sa mise sur le marché, j’ai étudié les biens qui lui ressemblent vraiment : le vôtre en fait partie.`,
      `Concrètement, les acquéreurs qui visiteront ${wording.ourNoun} regarderont aussi ${wording.yourOne}. Plutôt que de nous les disputer, je vous propose de les partager.`,
    ].join('\n\n'),
    keyMessage:
      theirs.length > 0
        ? `Ce qui distingue ${wording.yourNoun} (${theirs.join(', ')}) intéresse une partie de mes acquéreurs. Je peux vous les amener.`
        : `Une partie de mes acquéreurs cherche ${wording.a} comme ${wording.yourOne}. Je peux vous les amener.`,
    proposals: [
      '*Découvrir votre projet et votre bien plus en détail*, et vous montrer précisément le bien concurrent et l’analyse de ce marché.',
      '*Présenter votre bien à mes acquéreurs* dont le projet correspond.',
      '*Vous rendre compte de chaque visite.*',
    ],
    contactHook: `Échangeons 15${NBSP}minutes.`,
  };
}

function colleagueTexts(facts: ProspectingFileFacts): ProspectingFileTexts {
  const wording = propertyWording(facts.kind);
  const rooms =
    facts.kind !== 'land' && facts.theirs.roomsCount != null
      ? ` de ${facts.theirs.roomsCount}${NBSP}pièce${facts.theirs.roomsCount > 1 ? 's' : ''}`
      : '';
  const city = facts.theirs.city?.trim() ? ` à ${facts.theirs.city.trim()}` : '';
  return {
    title: 'Deux biens, les mêmes acquéreurs :\n*croisons nos fichiers.*',
    letter: [
      'Cher confrère,',
      `Vous avez en exclusivité ${wording.the}${rooms}${city}. Je viens de rentrer en mandat ${wording.a} comparable${nearness(facts).colleague}. Nos deux biens s’adressent aux mêmes acquéreurs : je vous propose de travailler ensemble plutôt que l’un contre l’autre.`,
    ].join('\n\n'),
    // La version confrère tient en une page : pas de message clé.
    keyMessage: '',
    proposals: [
      '*Échange des acquéreurs qualifiés* sur les deux biens, dès cette semaine.',
      '*Honoraires partagés* selon un accord inter-cabinet écrit, à définir ensemble.',
      '*Chaque agence garde la main sur son mandat* : visites organisées et accompagnées par le titulaire.',
    ],
    contactHook: `On s’appelle cette semaine${NBSP}?`,
  };
}

export function defaultTexts(
  facts: ProspectingFileFacts,
  version: ProspectingFileVersion,
): ProspectingFileTexts {
  return version === 'owner' ? ownerTexts(facts) : colleagueTexts(facts);
}

// Le texte du conseiller quand il en a écrit un, le texte proposé sinon.
export function resolveTexts(
  defaults: ProspectingFileTexts,
  overrides: ProspectingFileOverrides,
): ProspectingFileTexts {
  return {
    title: overrides.title ?? defaults.title,
    letter: overrides.letter ?? defaults.letter,
    keyMessage: overrides.keyMessage ?? defaults.keyMessage,
    proposals: [
      overrides.proposals[0] ?? defaults.proposals[0],
      overrides.proposals[1] ?? defaults.proposals[1],
      overrides.proposals[2] ?? defaults.proposals[2],
    ],
    contactHook: overrides.contactHook ?? defaults.contactHook,
  };
}

const OWNER_FIXED: FixedTexts = {
  closenessTitle: 'Ce qui les rapproche',
  differencesTitle: 'Ce qui les distingue',
  proposalTitle: 'Ce que je vous propose',
  chain: ['Plus de visites', 'Plus d’offres', 'Une meilleure offre'],
  back: {
    kicker: 'Unir nos forces plutôt que les diviser',
    title: 'Plus de visites, c’est plus d’offres.\nEt plus d’offres, *c’est la meilleure.*',
    alone: {
      label: 'Chacun de son côté',
      visits: 5,
      caption: 'visites sur votre bien',
      note: 'Seuls les acquéreurs de votre agence ou de vos annonces.',
    },
    together: {
      label: 'Ensemble',
      visits: 10,
      caption: 'visites sur votre bien',
      note: 'Les vôtres, plus nos acquéreurs dont le projet correspond.',
    },
  },
  turnPage: 'Tournez la page →',
  information: null,
};

const COLLEAGUE_FIXED: FixedTexts = {
  closenessTitle: 'Ce qui les rapproche',
  differencesTitle: 'Ce qui les distingue',
  proposalTitle: 'Ma proposition',
  chain: ['Vos acquéreurs + les nôtres', 'Plus de visites', 'De meilleures offres'],
  back: null,
  turnPage: null,
  information: 'Proposition de collaboration entre professionnels',
};

function addressee(
  facts: ProspectingFileFacts,
  version: ProspectingFileVersion,
  theirTitle: string,
): ProspectingFile['addressee'] {
  if (version === 'colleague') {
    const city = facts.theirs.city?.trim();
    return {
      lead: 'À l’attention de',
      nameLines: ['Agence titulaire de l’exclusivité'],
      detail: ['Exclusivité', theirTitle, city].filter(Boolean).join(' · '),
    };
  }
  const address = facts.theirAddress?.trim() ?? '';
  // Un appartement : l'immeuble est connu, pas le lot — on écrit à ses copropriétaires.
  const who = facts.kind === 'apartment' ? 'Aux copropriétaires' : 'Au propriétaire';
  return {
    lead: /^\d/.test(address) ? `${who} du` : who,
    nameLines: addressLines(address),
    detail: null,
  };
}

export function buildProspectingFile(
  facts: ProspectingFileFacts,
  version: ProspectingFileVersion,
  options: { showPrices: boolean },
): ProspectingFile {
  const compact = version === 'colleague';
  const wording = propertyWording(facts.kind);
  const titles = cardTitles(facts, { compact });
  const rows = comparedRows(facts, { showPrices: options.showPrices, compact });
  const sector = facts.theirs.district?.trim() || facts.theirs.city?.trim() || null;
  const distance =
    facts.distanceMeters != null ? `à ${formatDistance(facts.distanceMeters)}` : null;

  return {
    version,
    kind: facts.kind,
    pricesShown: options.showPrices,
    addressee: addressee(facts, version, titles.theirs),
    addressSource: facts.theirAddressSource,
    defaults: defaultTexts(facts, version),
    ours: { label: compact ? 'Notre mandat' : 'Notre bien', title: titles.ours, rows: rows.ours },
    theirs: {
      label: compact ? 'Votre exclusivité' : 'Votre bien',
      title: titles.theirs,
      rows: rows.theirs,
    },
    theirPlaceholder: [
      capitalize(wording.yourNoun),
      [sector, distance].filter(Boolean).join(' · '),
    ].filter((line) => line !== ''),
    closeness: closeness(facts, { showPrices: options.showPrices }),
    differences: differences(facts),
    fixed: version === 'owner' ? OWNER_FIXED : COLLEAGUE_FIXED,
  };
}

export const NO_FUNDS_MENTION = 'Ne peut recevoir aucun fonds';

type MentionSender = Pick<
  ProspectingSender,
  | 'agencyName'
  | 'postalAddress'
  | 'professionalCard'
  | 'professionalCardIssuer'
  | 'financialGuarantee'
>;

// « Carte professionnelle CPI 0605 2018 000 123 456 délivrée par la CCI Nice Côte d'Azur »
function professionalCardMention(
  sender: Pick<MentionSender, 'professionalCard' | 'professionalCardIssuer'>,
): string | null {
  const card = sender.professionalCard?.trim();
  if (!card) {
    return null;
  }
  const issuer = sender.professionalCardIssuer?.trim();
  return `Carte professionnelle ${card}${issuer ? ` délivrée par ${issuer}` : ''}`;
}

// Les mentions professionnelles de l'agence (mission 102) : sa carte et qui l'a délivrée, puis
// sa garantie financière — ou, sans garantie, « Ne peut recevoir aucun fonds ». Le courrier ne
// s'imprime pas sans la carte (file-access.ts).
export function professionalMentions(
  sender: Pick<MentionSender, 'professionalCard' | 'professionalCardIssuer' | 'financialGuarantee'>,
): string[] {
  const guarantee = sender.financialGuarantee?.trim();
  return [
    professionalCardMention(sender),
    guarantee ? `Garantie financière : ${guarantee}` : NO_FUNDS_MENTION,
  ].filter((mention): mention is string => Boolean(mention));
}

// Pied de page : l'agence (nom sur les documents, M87), son adresse, puis ses mentions
// professionnelles. Le recto du courrier propriétaire les laisse au verso (`withCard: false`),
// où elles précèdent la mention légale : le pied du recto reste sur une ligne ou deux.
export function agencyMentionList(
  sender: MentionSender,
  options: { withAddress: boolean; withCard?: boolean },
): string[] {
  return [
    // Mission 87 — le nom tient sur une ligne, jamais coupé au milieu d'un mot.
    footerAgencyName(sender.agencyName),
    options.withAddress ? sender.postalAddress?.trim() : null,
    ...(options.withCard === false ? [] : professionalMentions(sender)),
  ].filter((mention): mention is string => Boolean(mention));
}

export function agencyMentions(sender: MentionSender, options: { withAddress: boolean }): string {
  return agencyMentionList(sender, options).join(' · ');
}

// Tout ce que le document dit, à plat : c'est sur cette liste que les tests cherchent les
// interdits (« mandat » côté propriétaire, « — » à la place d'une valeur, un jugement).
export function allTexts(file: ProspectingFile, texts: ProspectingFileTexts): string[] {
  const { fixed } = file;
  const cards = [file.ours, file.theirs].flatMap((card) => [
    card.label,
    card.title,
    ...card.rows.flatMap((row) => [row.label, row.value]),
  ]);
  const back = fixed.back
    ? [
        fixed.back.kicker,
        fixed.back.title,
        ...[fixed.back.alone, fixed.back.together].flatMap((column) => [
          column.label,
          column.caption,
          column.note,
        ]),
      ]
    : [];
  return [
    file.addressee.lead,
    ...file.addressee.nameLines,
    file.addressee.detail,
    texts.title,
    texts.letter,
    texts.keyMessage,
    ...texts.proposals,
    texts.contactHook,
    ...cards,
    ...file.theirPlaceholder,
    ...file.closeness,
    ...file.differences,
    fixed.closenessTitle,
    fixed.differencesTitle,
    fixed.proposalTitle,
    ...fixed.chain,
    ...back,
    fixed.turnPage,
    fixed.information,
  ].filter((text): text is string => typeof text === 'string' && text !== '');
}
