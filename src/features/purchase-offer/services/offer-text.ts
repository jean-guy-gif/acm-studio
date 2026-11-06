import { numberInWords } from '@/features/purchase-offer/services/amount-in-words';
import {
  agencyIdentityParagraphs,
  type RenderedDocument,
  type VoucherAgency,
} from '@/features/visit-voucher/services/voucher-text';
import { formatNumber } from '@/lib/format';

// Mission 137 (partie B) — l'offre d'achat ferme : le texte validé juridiquement, repris MOT POUR
// MOT de la fiche de mission. Seuls changent les champs entre accolades ; les variantes « réseau »
// sont celles de l'agence seule (décision de Jean-Guy, 06/11). Les paragraphes « agent commercial »
// et « copropriété » n'existent que renseignés. La clause « avec prêt » est un PROJET : codée, mais
// désactivée tant que le juriste ne l'a pas validée (`OFFRE_AVEC_PRET_VALIDEE`). Pur.
//
// Ne rien reformater ici : un mot changé est un texte non validé. Une ligne qui commence par
// « ### » est un intertitre du modèle.

export const OFFER_TEMPLATE_VERSION = 'offre-achat-2026-11-06';

// Passe à vrai par Jean-Guy, après la validation du juriste (fiche, décision 3).
export const OFFRE_AVEC_PRET_VALIDEE = false;

export type OfferAgency = VoucherAgency & { guaranteeAmount: number };

export type Offrant = {
  civility: 'M.' | 'Mme';
  lastName: string;
  firstNames: string;
  // JJ/MM/AAAA.
  birthDate: string;
  birthPlace: string;
  nationality: string;
  profession: string;
};

export type CadastreParcel = {
  prefix: string;
  section: string;
  number: string;
  lieudit: string;
  area: string;
};

export type CondoLot = {
  number: number;
  description: string;
  shares: number;
  base: number;
};

export type OfferLoan = {
  contribution: number;
  amount: number;
  years: number;
  rate: string;
  days: number;
};

export type OfferFields = {
  agency: OfferAgency;
  offrants: Offrant[];
  address: string;
  // « marié sous le régime de la communauté réduite aux acquêts, le 12/06/2010 à Lyon » ; vide :
  // la phrase n'apparaît pas.
  matrimonial: string | null;
  fiscalResidenceFrance: boolean;
  mandateNumber: string;
  agent: { name: string; rsac: string } | null;
  condominium: boolean;
  propertyAddress: string;
  parcels: CadastreParcel[];
  totalArea: string;
  lots: CondoLot[];
  price: number;
  feesPaidBy: 'seller' | 'buyer';
  fees: number;
  financing: 'cash' | 'loan';
  loan: OfferLoan | null;
  // JJ/MM/AAAA.
  validUntil: string;
  contractDeadline: string;
  deposit: number;
};

const euros = (value: number): string => formatNumber(Math.round(value), { maxDecimals: 0 });

// « dix millièmes » : la base des tantièmes en lettres (l'ordinal du dernier mot : « millièmes »,
// « centièmes », « cinquièmes », « neuvièmes », « quatrièmes »).
export function sharesBaseInWords(base: number): string {
  const words = numberInWords(base);
  const cut = Math.max(words.lastIndexOf(' '), words.lastIndexOf('-')) + 1;
  const head = words.slice(0, cut);
  // Le « s » du pluriel de « cents » et « vingts » seulement (jamais celui de « trois »).
  const last = words.slice(cut).replace(/^(cent|vingt)s$/, '$1');
  const ordinal =
    last === 'mille'
      ? 'millième'
      : last === 'cinq'
        ? 'cinquième'
        : last === 'neuf'
          ? 'neuvième'
          : last.endsWith('e')
            ? `${last.slice(0, -1)}ième`
            : `${last}ième`;
  return `${head}${ordinal}s`;
}

// « 10 000 » : les chiffres des tantièmes, groupés par milliers d'une espace, comme le modèle
// (« ( 136 / 10 000 èmes) », décision de Jean-Guy, 06/11).
export function groupedThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function offrantLine(offrant: Offrant): string {
  return `${offrant.civility} ${offrant.lastName} ${offrant.firstNames} né(e) le ${offrant.birthDate} à ${offrant.birthPlace} , de nationalité ${offrant.nationality} , ${offrant.profession}`;
}

export function loanClause(loan: OfferLoan): string[] {
  return [
    `L'OFFRANT déclare avoir l'intention de financer son acquisition au moyen d'un apport personnel de ${numberInWords(loan.contribution)} euros ( ${euros(loan.contribution)} €) et d'un ou plusieurs prêts d'un montant total maximum de ${numberInWords(loan.amount)} euros ( ${euros(loan.amount)} €), d'une durée maximale de ${loan.years} ans, au taux nominal maximum de ${loan.rate} % l'an hors assurance.`,
    "Par conséquent, en cas d'acceptation de son offre par le VENDEUR, l'avant-contrat de vente sera conclu sous la condition suspensive de l'obtention de ce ou ces prêts, conformément aux articles L. 313-40 et suivants du Code de la consommation. La durée de validité de cette condition suspensive, fixée dans l'avant-contrat, ne pourra être inférieure à un mois à compter de sa signature.",
    `L'OFFRANT devenu acquéreur s'engage à déposer sa ou ses demandes de prêt dans un délai de ${loan.days} jours à compter de la signature de l'avant-contrat et à en justifier à l'Agence et au VENDEUR.`,
  ];
}

export function renderOffer(fields: OfferFields): RenderedDocument {
  const { agency } = fields;
  const withLoan = OFFRE_AVEC_PRET_VALIDEE && fields.financing === 'loan' && fields.loan != null;
  return {
    title: "OFFRE D'ACHAT",
    sections: [
      {
        heading: "En présence et avec le concours de l'Agence",
        paragraphs: [
          ...agencyIdentityParagraphs(agency),
          `Adhérente de la caisse de Garantie ${agency.guaranteeBody} dont le siège est sis ${agency.guaranteeAddress} sous le n° ${agency.guaranteeNumber} pour un montant de ${euros(agency.guaranteeAmount)} € ,`,
          "DECLARANT NE POUVOIR NI RECEVOIR NI DETENIR D'AUTRES FONDS, EFFETS OU VALEURS QUE CEUX REPRESENTATIFS DE SA REMUNERATION.",
          "N'ayant aucun lien capitalistique ou juridique avec une banque ou une société financière,",
          `Représentée par ${agency.representativeName} , agissant en sa qualité de ${agency.representativeTitle} , ayant tous pouvoirs à l'effet des présentes,`,
          'Ci-après "l\'Agence" ou "le Mandataire",',
        ],
      },
      {
        heading: "L'OFFRANT",
        paragraphs: [
          `${fields.offrants.map(offrantLine).join(' et ')} , demeurant ${fields.address} ,`,
          ...(fields.matrimonial?.trim()
            ? [
                `Se déclarant ${fields.matrimonial.trim()}, ledit régime n'ayant subi aucune modification conventionnelle ou judiciaire depuis,`,
              ]
            : []),
          `${fields.fiscalResidenceFrance ? 'Ayant' : "N'ayant pas"} leur résidence fiscale en France, au sens de la règlementation fiscale.`,
          'Ci-après "l\'OFFRANT"',
          "L'OFFRANT s'engage à acquérir, aux conditions arrêtées ci-après, avec faculté de substitution, les biens immobiliers ci-dessous désignés.",
          `L'OFFRANT reconnait que ces conditions ont été négociées par l'Agence titulaire d'un mandat de négociation régulièrement inscrit sur son Registre des mandats sous le numéro ${fields.mandateNumber} .`,
          ...(fields.agent
            ? [
                `Ce mandat a été apporté par ${fields.agent.name}, agissant en sa qualité d'agent commercial, régulièrement inscrit au Registre spécial des Agents commerciaux sous le numéro ${fields.agent.rsac} .`,
              ]
            : []),
        ],
      },
      {
        heading: 'Nature et description des biens',
        paragraphs: [
          ...(fields.condominium
            ? [
                `Dans un ensemble immobilier soumis au régime de la copropriété tel que défini par la loi du 10 juillet 1965 situé ${fields.propertyAddress} .`,
              ]
            : []),
          'Cet ensemble immobilier étant édifié sur une parcelle de terrain cadastrée :',
          ...fields.parcels.map(
            (parcel) =>
              `| ${parcel.prefix} | ${parcel.section} | ${parcel.number} | ${parcel.lieudit} | ${parcel.area}`,
          ),
          `Soit une contenance totale de ${fields.totalArea} .`,
          `Adresse postale des biens : ${fields.propertyAddress}`,
          ...fields.lots.map(
            (lot) =>
              `LOT NUMERO ${numberInWords(lot.number).toUpperCase()} ( ${lot.number} ) Description : ${lot.description} Et les ${numberInWords(lot.shares)} / ${sharesBaseInWords(lot.base)} ( ${groupedThousands(lot.shares)} / ${groupedThousands(lot.base)} èmes) des parties communes générales .`,
          ),
        ],
      },
      {
        heading: "Conditions d'acquisition",
        paragraphs: [
          "### Prix d'acquisition",
          `L'OFFRANT déclare son intention d'acquérir les biens ci-dessus désignés au prix de ${numberInWords(fields.price)} euros ( ${euros(fields.price)} €).`,
          `Les honoraires de l'Agence seront à la charge du ${fields.feesPaidBy === 'seller' ? 'VENDEUR' : 'ACQUEREUR'}.`,
          `Le montant de ces honoraires sera de ${numberInWords(fields.fees)} euros ( ${euros(fields.fees)} €).`,
          "L'OFFRANT supportera en plus l'ensemble des frais, droits et émoluments relatifs à la vente.",
          "### Financement de l'acquisition",
          ...(withLoan
            ? loanClause(fields.loan!)
            : [
                "L'OFFRANT déclare ne pas avoir l'intention de recourir à un prêt pour financer son acquisition. Par conséquent, en cas d'acceptation de son offre par le VENDEUR, l'OFFRANT devenu acquéreur s'engage à reproduire dans l'avant-contrat de vente ou dans une déclaration qui lui sera annexée et à laquelle cet avant-contrat fera référence la mention manuscrite de renonciation à la condition suspensive d'obtention d'un prêt prévue par l'article L. 313-42 du Code de la consommation.",
              ]),
          "### Autres conditions de l'acquisition",
          'Les biens devront, au jour du transfert de propriété, être libres de tout titre locatif et de toute occupation.',
          'Outre les conditions ordinaires et de droit, la vente sera soumise aux conditions suspensives suivantes :',
          "- le certificat d'urbanisme ou les titres de propriété ne devront révéler aucune charge réelle ou servitude grave pouvant déprécier la valeur des biens objet des présentes ou altérer de manière significative la jouissance de l'ACQUEREUR,",
          "- l'état hypothécaire ne devra révéler aucune inscription de privilège ou d'hypothèque garantissant des créances dont le solde, en capital, intérêts et accessoires, ne pourra être remboursé à l'aide du prix de vente.",
        ],
      },
      {
        heading: "Acceptation de l'offre par le VENDEUR",
        paragraphs: [
          `Cette offre d'achat est valable jusqu'au ${fields.validUntil} inclus.`,
          "Passé cette date, et à défaut d'acceptation par le VENDEUR, elle deviendra caduque, sans autre formalité, sauf accord contraire de l'OFFRANT.",
          "L'acceptation de vendre aux conditions de la présente offre devra être actée par la signature de celle-ci par le VENDEUR.",
          "Elle sera notifiée à l'OFFRANT au plus tard le dernier jour de validité de l'offre.",
          `Un avant-contrat de vente devra ensuite être signé par le VENDEUR et l'OFFRANT au plus tard le ${fields.contractDeadline}${
            fields.condominium
              ? " sous réserve d'avoir l'ensemble des documents administratifs relatifs au dossier de vente dont le PACK ALUR et le PRE ETAT DATE délivrés par le syndic de copropriété."
              : ''
          }`,
          `L'OFFRANT devenu ACQUEREUR versera la somme de ${numberInWords(fields.deposit)} euros ( ${euros(fields.deposit)} €) à titre d'acompte dans les conditions définies par l'avant-contrat.`,
          "L'offre acceptée constitue un accord sur la chose et sur le prix au sens des articles 1583 et 1589 du Code civil.",
          'En cas de refus de réitérer la présente :',
          "- le VENDEUR pourra être contraint de vendre les biens susvisés par tous les moyens et voies de droit, en supportant les frais de poursuites. S'il venait à décéder, ses héritiers et ayants droit seront tenus d'exécuter la présente ;",
          "- L'OFFRANT sous réserve de la levée des éventuelles conditions suspensives applicables ou de l'exercice d'un éventuel droit de rétractation, sera tenu d'acheter. Toutefois, s'il venait à décéder, ses héritiers et ayants droit auront la faculté de se désister sans indemnité.",
          "L'OFFRANT bénéficiera à la suite de la signature de l'avant-contrat de vente d'un délai de rétractation de 10 jours conformément aux dispositions de l'article L. 271-1 du code de la construction et de l'habitation.",
          "L'ACQUEREUR et le VENDEUR autorisent expressément le(s) notaire(s) à communiquer à l'AGENCE le projet d'avant-contrat ainsi que l'avant-contrat de vente signé, le projet d'acte authentique ainsi que l'acte authentique qui seront établis dans le cadre de la présente vente.",
        ],
      },
      {
        heading: 'Données personnelles',
        paragraphs: [
          "L'OFFRANT est informé que les données à caractère personnel le concernant collectées par le MANDATAIRE à l'occasion de la présente feront l'objet de traitements informatiques. Ces traitements se fondent soit sur la présente offre, soit sur le respect d'obligations légales, soit sur la poursuite d'intérêts légitimes.",
          "L'Agence est responsable des traitements des données à caractère personnel collectées à l'occasion des présentes.",
          "Ces données sont collectées et traitées aux fins de la réception et de la gestion de la présente offre d'achat, de sa transmission au vendeur, de la réalisation des opérations confiées, du suivi de la relation commerciale et de communication, de la gestion des fichiers clients-prospects, du respect des obligations légales et réglementaires applicables à l'activité de l'agence, notamment en matière de lutte contre le blanchiment de capitaux et le financement du terrorisme et, plus généralement, les finalités décrites dans la Politique générale de protection des données consultable sur le site de l'Agence ou, sur simple demande, auprès de l'Agence.",
          "Les données à caractère personnel sont destinées aux services et personnels habilités des responsables de l'Agence ainsi qu'aux intervenants participant à la réalisation de l'opération ou à l'exécution d'obligations légales ou réglementaires, notamment les notaires, établissements bancaires, assureurs, avocats, commissaires de justice, prestataires de signature électronique, prestataires de lettre recommandée électronique et, le cas échéant, aux professionnels de l'immobilier intervenant dans le cadre d'un partenariat nécessaire à l'exécution de la mission confiée.",
          "L'OFFRANT est également informé que ces données à caractère personnel pourront également être destinées aux opérations de prospection du MANDATAIRE dans le respect de la règlementation en vigueur.",
          "Les données à caractère personnel sont conservées pendant la durée nécessaire à l'exécution des présentes, augmentée des délais légaux de prescription applicables.",
          `L'OFFRANT pourra demander à l'Agence d'accéder aux données à caractère personnel la concernant, de les rectifier, de les modifier, de les supprimer ou de s'opposer à leur exploitation en adressant un courriel en ce sens à ${agency.email} ou un courrier postal à l'adresse suivante : ${agency.address} . Toute réclamation pourra être introduite auprès de la Commission Nationale de l'Informatique et des Libertés (www.cnil.fr).`,
          "Le consommateur est informé que toute sollicitation téléphonique effectuée à des fins commerciales suppose son consentement préalable, sauf si elle intervient dans le cadre autorisé par la réglementation en vigueur et notamment dans le cadre de l'exécution d'un contrat en cours au sens du quatrième alinéa de l'article L223-1 du Code de la consommation.",
        ],
      },
      {
        heading: 'Signature',
        paragraphs: [
          "En la signant électroniquement, L'OFFRANT ACCEPTE D'ACQUERIR LES BIENS AUX PRIX ET CONDITIONS CONTENUS DANS LA PRESENTE OFFRE D'ACHAT.",
        ],
      },
    ],
  };
}
