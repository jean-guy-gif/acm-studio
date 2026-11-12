// Mission 137 — le bon de visite : le texte validé juridiquement, repris MOT POUR MOT de la fiche
// de mission. Seuls changent les champs entre accolades ; les variantes « réseau » sont celles de
// l'agence seule (décision de Jean-Guy, 06/11). La coquille « de de relations commerciales » du
// modèle est gardée tant que le juriste ne l'a pas corrigée. Pur.
//
// Ne rien reformater ici : un mot changé est un texte non validé. Les apostrophes sont celles du
// modèle (droites), les espaces avant les virgules aussi.

import {
  VOUCHER_OUTSIDE_RECEIVED,
  voucherOutsideCommitment,
  voucherOutsideLine,
  type OutsideTitle,
} from '@/features/visit-voucher/services/outside-mandate';

export const VOUCHER_TEMPLATE_VERSION = 'bon-de-visite-2026-11-06';
// Mission 153 — la version hors mandat : trois phrases changent, validées par la juriste (12/11).
export const VOUCHER_OUTSIDE_TEMPLATE_VERSION = 'bon-de-visite-hors-mandat-2026-11-12';

export type VoucherAgency = {
  name: string;
  address: string;
  phone: string;
  email: string;
  companyName: string;
  companyForm: string;
  shareCapital: string;
  companySeat: string;
  rcsCity: string;
  rcsNumber: string;
  cardNumber: string;
  cardIssuer: string;
  vatNumber: string;
  rcpInsurer: string;
  rcpAddress: string;
  rcpNumber: string;
  guaranteeBody: string;
  guaranteeAddress: string;
  guaranteeNumber: string;
  representativeName: string;
  representativeTitle: string;
};

export type VoucherBien = { mandate: string; price: string; address: string };

export type VoucherFields = {
  agency: VoucherAgency;
  // « M. Paul Keller » ; deux visiteurs : « M. Paul Keller et Mme Anna Keller ».
  visitorName: string;
  visitorAddress: string;
  // « sa carte nationale d'identité », « son passeport »…
  visitorPiece: string;
  biens: VoucherBien[];
  advisorName: string;
  city: string;
  // JJ/MM/AAAA.
  date: string;
  // Mission 153 — un bon hors mandat : le titre auquel l'Agence intervient, le même pour tous ses
  // biens (un bon ne réunit jamais un bien sous mandat et un bien hors mandat).
  title?: OutsideTitle | null;
};

// Le document : un titre, puis des sections ; chaque section a un titre et des paragraphes.
export type DocumentSection = { heading: string | null; paragraphs: string[] };
export type RenderedDocument = { title: string; sections: DocumentSection[] };

export function agencyIdentityParagraphs(agency: VoucherAgency): string[] {
  return [
    `${agency.name} , située ${agency.address} , téléphone ${agency.phone} , adresse mail ${agency.email} , exploitée par la société ${agency.companyName} ${agency.companyForm} au capital de ${agency.shareCapital} euros, dont le siège social est situé ${agency.companySeat} , RCS ${agency.rcsCity} n° ${agency.rcsNumber} , titulaire de la carte professionnelle Transaction sur immeubles et fonds de commerce n° ${agency.cardNumber} délivrée par ${agency.cardIssuer} , numéro de TVA ${agency.vatNumber} , assurée en responsabilité civile professionnelle par ${agency.rcpInsurer} dont le siège est sis ${agency.rcpAddress} sur le territoire national sous le n° ${agency.rcpNumber} ,`,
  ];
}

export function renderVoucher(fields: VoucherFields): RenderedDocument {
  const { agency } = fields;
  const title = fields.title ?? null;
  return {
    title: 'BON DE VISITE - BIEN(S) A VENDRE',
    sections: [
      {
        heading: "L'AGENCE",
        paragraphs: [
          ...agencyIdentityParagraphs(agency),
          `Adhérente de la caisse de Garantie ${agency.guaranteeBody} dont le siège est sis ${agency.guaranteeAddress} sous le n° ${agency.guaranteeNumber} ,`,
          "DECLARANT NE POUVOIR NI RECEVOIR NI DETENIR D'AUTRES FONDS, EFFETS OU VALEURS QUE CEUX REPRESENTATIFS DE SA REMUNERATION",
          "N'ayant aucun lien capitalistique ou juridique avec une banque ou une société financière,",
          `Représentée par ${agency.representativeName} , agissant en sa qualité de ${agency.representativeTitle} , ayant tous pouvoirs à l'effet des présentes,`,
        ],
      },
      {
        heading: 'DECLARATIONS',
        paragraphs: [
          `Je soussigné(e) ${fields.visitorName} , demeurant ${fields.visitorAddress} , comme en atteste ${fields.visitorPiece}`,
          'Agissant tant en mon nom personnel que pour le compte de toute autre personne physique ou morale que je jugerai bon de me substituer et pour laquelle je me porte fort, en tant que de besoin.',
          title
            ? VOUCHER_OUTSIDE_RECEIVED
            : "Reconnais m'être présenté(e) ce jour à l'Agence, avoir demandé et reçu de celle-ci les renseignements, adresses et conditions de vente des biens ci-dessous désignés, précisés notamment dans le mandat de vente.",
          "Ces biens, dont je n'avais aucune connaissance auparavant, m'ont été présentés pour la première fois et uniquement par l'Agence.",
          "Je sais que ces indications ont été fournies selon les dires des vendeurs et qu'elles sont confidentielles. Je m'engage à les garder secrètes.",
          title
            ? voucherOutsideCommitment(title)
            : "Je suis informé(e) que le vendeur s'est engagé, dans le cadre du mandat de vente qu'il a confié à l'Agence, à ne pas traiter la vente de ces biens directement avec un acquéreur présenté par l'Agence ou ayant visité le bien avec l'Agence.",
          "Je m'engage à ne pas me présenter chez les vendeurs sans être accompagné(e) d'un représentant de l'Agence ou, à défaut, sans communiquer auxdits vendeurs le présent bon de visite. Je m'engage également à en informer toute personne qui me présenterait les mêmes biens que ceux qui m'ont déjà été présentés.",
          "Je m'engage à ne pas tenter d'évincer l'Agence de la rémunération à laquelle elle pourrait légitimement prétendre.",
          "En cas de manquement à cet engagement, je suis informé(e) que je pourrai être tenu(e) de réparer le préjudice que constituerait l'éviction de l'Agence par le versement d'un dédommagement égal au montant des honoraires auxquels elle aurait pu prétendre.",
        ],
      },
      {
        heading: 'BIEN(S) PROPOSE(S) A LA VENTE',
        paragraphs: [
          ...fields.biens.map((bien) =>
            title
              ? voucherOutsideLine(title, bien)
              : `Numéro du mandat : ${bien.mandate} · Prix de commercialisation : ${bien.price} € · Adresse du bien : ${bien.address}`,
          ),
          `Les biens ci-dessus mentionnés ont été présentés par ${fields.advisorName} .`,
        ],
      },
      {
        heading: 'Collecte et exploitation des données personnelles',
        paragraphs: [
          "L'Agence est responsable des traitements des données à caractère personnel collectées à l'occasion des présentes.",
          "Les principales finalités de ces traitements sont la gestion, le traitement et le suivi des demandes concernant l'Agence, la gestion des fichiers clients-prospects et la réalisation d'opérations de marketing direct, la lutte contre le blanchiment de capitaux et le financement du terrorisme et, plus généralement, les finalités décrites dans la Politique générale de protection des données consultable sur le site de l'Agence ou, sur simple demande, auprès de l'Agence.",
          "Ces données à caractère personnel sont destinées aux services et personnels habilités des responsables de l'Agence, ainsi qu'à leurs partenaires et prestataires, contractuels et commerciaux.",
          "Ces traitements se fondent soit sur le présent contrat, soit sur le respect d'obligations légales, soit sur la poursuite d'intérêts légitimes, à savoir la gestion et le suivi de de relations commerciales et l'organisation d'opérations de marketing, de prospection et de communication. A défaut de correspondre à l'une de ces trois bases légales, le traitement des données à caractère personnel collectées sera fondé sur le consentement de la personne concernée, notamment si elles sont transmises à des partenaires commerciaux de l'Agence.",
          `Le CLIENT pourra demander à l'Agence d'accéder aux données à caractère personnel le concernant, de les rectifier, de les modifier, de les supprimer ou de s'opposer à leur exploitation en adressant un courriel en ce sens à ${agency.email} ou un courrier postal à l'adresse suivante : ${agency.address} . Toute réclamation pourra être introduite auprès de la Commission Nationale de l'Informatique et des Libertés (www.cnil.fr).`,
          "Le consommateur est informé qu'il peut s'opposer à l'utilisation de ses coordonnées téléphoniques à des fins de prospection commerciale en s'inscrivant sur la liste d'opposition au démarchage téléphonique sur le site internet bloctel.gouv.fr ou par courrier à l'adresse : Worldline - Service Bloctel - CS 61311 - 41013 BLOIS CEDEX",
        ],
      },
      {
        heading: 'SIGNATURE(S)',
        paragraphs: [
          `Fait à ${fields.city} , le ${fields.date} . — SIGNATURE(S) « Lu et approuvé »`,
        ],
      },
    ],
  };
}

// Le texte figé à la signature : une ligne par titre (« # » le document, « ## » une section) et
// un paragraphe par ligne. Relu tel quel pour réimprimer le document signé, jamais recalculé.
export function documentToText(document: RenderedDocument): string {
  const lines = [`# ${document.title}`];
  for (const section of document.sections) {
    if (section.heading) lines.push(`## ${section.heading}`);
    lines.push(...section.paragraphs);
  }
  return lines.join('\n');
}

export function textToDocument(text: string): RenderedDocument {
  const document: RenderedDocument = { title: '', sections: [] };
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      document.sections.push({ heading: line.slice(3), paragraphs: [] });
    } else if (line.startsWith('# ')) {
      document.title = line.slice(2);
    } else if (line.length > 0) {
      if (document.sections.length === 0) document.sections.push({ heading: null, paragraphs: [] });
      document.sections[document.sections.length - 1]!.paragraphs.push(line);
    }
  }
  return document;
}

export const VISITOR_PIECES = {
  cni: "sa carte nationale d'identité",
  passport: 'son passeport',
  residence: 'son titre de séjour',
  driving: 'son permis de conduire',
} as const;
export type VisitorPiece = keyof typeof VISITOR_PIECES;
export const VISITOR_PIECE_LABELS: Record<VisitorPiece, string> = {
  cni: 'Carte nationale d’identité',
  passport: 'Passeport',
  residence: 'Titre de séjour',
  driving: 'Permis de conduire',
};
