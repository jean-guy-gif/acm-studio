import type {
  OfferFields,
  Offrant,
  OfferLoan,
} from '@/features/purchase-offer/services/offer-text';
import { OFFRE_AVEC_PRET_VALIDEE } from '@/features/purchase-offer/services/offer-text';
import type {
  RenderedDocument,
  VoucherAgency,
  VoucherFields,
} from '@/features/visit-voucher/services/voucher-text';
import { visitorsLabel } from '@/features/visit-voucher/services/voucher-fields';
import type { StoredVoucherFields } from '@/features/visit-voucher/services/voucher-input';
import type { TextLanguage } from '@/lib/client-texts';
import { formatNumber } from '@/lib/format';

// Mission 140 B — le bon de visite et l'offre d'achat pour un client qui n'est pas francophone : la
// version FRANÇAISE reste la seule signée et la seule qui fait foi ; une traduction est jointe,
// marquée en tête « Traduction pour information — seule la version française fait foi ». En
// attente de la validation du juriste (fiche, règle 9) : codée et testée, mais désactivée tant que
// Jean-Guy n'a pas passé cette constante à vrai. Pur.
//
// La traduction suit le texte validé paragraphe par paragraphe ; elle ne remplace rien : ni le
// texte figé à la signature, ni son empreinte. Les montants s'y écrivent en chiffres seulement (le
// français, qui fait foi, les écrit aussi en lettres).
export const TRADUCTION_DOCUMENTS_JURIDIQUES_VALIDEE = false;

export const TRANSLATION_NOTICE =
  'Traduction pour information — seule la version française fait foi · Translation for information only — only the French version is legally binding';

const euros = (value: number): string =>
  `€${formatNumber(Math.round(value), { maxDecimals: 0, language: 'en' })}`;

function agencyIdentity(agency: VoucherAgency): string {
  return `${agency.name}, located at ${agency.address}, telephone ${agency.phone}, email address ${agency.email}, operated by the company ${agency.companyName} ${agency.companyForm} with a share capital of ${agency.shareCapital} euros, whose registered office is at ${agency.companySeat}, Trade and Companies Register of ${agency.rcsCity} no. ${agency.rcsNumber}, holder of the professional card “Transactions on buildings and business assets” no. ${agency.cardNumber} issued by ${agency.cardIssuer}, VAT number ${agency.vatNumber}, insured for professional liability by ${agency.rcpInsurer}, whose registered office is at ${agency.rcpAddress}, for the national territory under no. ${agency.rcpNumber},`;
}

const NO_FUNDS =
  'DECLARING THAT IT MAY NOT RECEIVE OR HOLD ANY FUNDS, INSTRUMENTS OR VALUABLES OTHER THAN THOSE REPRESENTING ITS REMUNERATION';
const NO_BANK_LINK = 'Having no capital or legal link with a bank or a financial company,';

// Le bon de visite, en anglais (les mêmes champs que le texte validé).
export function renderVoucherInEnglish(fields: VoucherFields): RenderedDocument {
  const { agency } = fields;
  return {
    title: 'VIEWING FORM - PROPERTY(IES) FOR SALE',
    sections: [
      {
        heading: 'THE AGENCY',
        paragraphs: [
          agencyIdentity(agency),
          `Member of the guarantee fund ${agency.guaranteeBody}, whose registered office is at ${agency.guaranteeAddress}, under no. ${agency.guaranteeNumber},`,
          NO_FUNDS,
          NO_BANK_LINK,
          `Represented by ${agency.representativeName}, acting as ${agency.representativeTitle}, with full powers for the purposes hereof,`,
        ],
      },
      {
        heading: 'DECLARATIONS',
        paragraphs: [
          `I, the undersigned ${fields.visitorName}, residing at ${fields.visitorAddress}, as evidenced by ${fields.visitorPiece}`,
          'Acting both in my own name and on behalf of any other natural or legal person I may see fit to substitute for myself and for whom I stand surety, as necessary.',
          'Acknowledge that I came to the Agency today, asked for and received from it the information, addresses and terms of sale of the properties described below, set out in particular in the sale mandate.',
          'These properties, of which I had no prior knowledge, were presented to me for the first time and solely by the Agency.',
          'I know that this information was given according to the sellers’ statements and that it is confidential. I undertake to keep it secret.',
          'I am informed that the seller has undertaken, under the sale mandate entrusted to the Agency, not to deal with the sale of these properties directly with a buyer introduced by the Agency or who has viewed the property with the Agency.',
          'I undertake not to visit the sellers without being accompanied by a representative of the Agency or, failing that, without giving the said sellers this viewing form. I also undertake to inform anyone who might present to me the same properties as those already presented to me.',
          'I undertake not to attempt to deprive the Agency of the remuneration to which it could legitimately lay claim.',
          'In the event of a breach of this undertaking, I am informed that I may be required to make good the loss that the Agency’s exclusion would represent, by paying compensation equal to the amount of the fees to which it could have laid claim.',
        ],
      },
      {
        heading: 'PROPERTY(IES) OFFERED FOR SALE',
        paragraphs: [
          ...fields.biens.map(
            (bien) =>
              `Mandate number: ${bien.mandate} · Listing price: €${bien.price} · Address of the property: ${bien.address}`,
          ),
          `The properties mentioned above were presented by ${fields.advisorName}.`,
        ],
      },
      {
        heading: 'Collection and use of personal data',
        paragraphs: [
          'The Agency is the controller of the personal data collected in connection herewith.',
          'The main purposes of this processing are the management, handling and follow-up of requests concerning the Agency, the management of client and prospect files and direct marketing operations, the fight against money laundering and terrorist financing and, more generally, the purposes described in the General Data Protection Policy available on the Agency’s website or, on request, from the Agency.',
          'This personal data is intended for the authorised departments and staff of the Agency’s managers, and for their contractual and commercial partners and service providers.',
          'This processing is based either on this contract, or on compliance with legal obligations, or on the pursuit of legitimate interests, namely the management and follow-up of commercial relations and the organisation of marketing, prospecting and communication operations. Where none of these three legal bases applies, the processing of the personal data collected will be based on the consent of the person concerned, in particular if it is passed on to the Agency’s commercial partners.',
          `The CLIENT may ask the Agency to access, rectify, modify or delete the personal data concerning them, or object to its use, by sending an email to that effect to ${agency.email} or a letter to the following address: ${agency.address}. Any complaint may be lodged with the French data protection authority, the Commission Nationale de l’Informatique et des Libertés (www.cnil.fr).`,
          'The consumer is informed that they may object to the use of their telephone details for commercial prospecting by registering on the telephone canvassing opposition list on the website bloctel.gouv.fr or by post at: Worldline - Service Bloctel - CS 61311 - 41013 BLOIS CEDEX',
        ],
      },
      {
        heading: 'SIGNATURE(S)',
        paragraphs: [
          `Done at ${fields.city}, on ${fields.date}. — SIGNATURE(S) “Read and approved”`,
        ],
      },
    ],
  };
}

function offrantLine(offrant: Offrant): string {
  return `${offrant.civility === 'M.' ? 'Mr' : 'Ms'} ${offrant.lastName} ${offrant.firstNames}, born on ${offrant.birthDate} in ${offrant.birthPlace}, of ${offrant.nationality} nationality, ${offrant.profession}`;
}

function loanClause(loan: OfferLoan): string[] {
  return [
    `The OFFEROR declares their intention to finance the purchase with a personal contribution of ${euros(loan.contribution)} and one or more loans for a maximum total amount of ${euros(loan.amount)}, for a maximum term of ${loan.years} years, at a maximum nominal rate of ${loan.rate}% a year excluding insurance.`,
    'Consequently, if the SELLER accepts the offer, the preliminary sale contract will be concluded subject to the condition precedent of obtaining this or these loans, in accordance with articles L. 313-40 et seq. of the French Consumer Code. The period of validity of this condition precedent, set in the preliminary contract, may not be less than one month from its signature.',
    `The OFFEROR, having become the buyer, undertakes to submit their loan application(s) within ${loan.days} days of the signature of the preliminary contract and to provide evidence of this to the Agency and to the SELLER.`,
  ];
}

// L'offre d'achat ferme, en anglais (les mêmes champs que le texte validé).
export function renderOfferInEnglish(fields: OfferFields): RenderedDocument {
  const { agency } = fields;
  const withLoan = OFFRE_AVEC_PRET_VALIDEE && fields.financing === 'loan' && fields.loan != null;
  return {
    title: 'PURCHASE OFFER',
    sections: [
      {
        heading: 'In the presence and with the assistance of the Agency',
        paragraphs: [
          agencyIdentity(agency),
          `Member of the guarantee fund ${agency.guaranteeBody}, whose registered office is at ${agency.guaranteeAddress}, under no. ${agency.guaranteeNumber}, for an amount of ${euros(agency.guaranteeAmount)},`,
          `${NO_FUNDS}.`,
          NO_BANK_LINK,
          `Represented by ${agency.representativeName}, acting as ${agency.representativeTitle}, with full powers for the purposes hereof,`,
          'Hereinafter “the Agency” or “the Agent”,',
        ],
      },
      {
        heading: 'THE OFFEROR',
        paragraphs: [
          `${fields.offrants.map(offrantLine).join(' and ')}, residing at ${fields.address},`,
          ...(fields.matrimonial?.trim()
            ? [
                `Declaring themselves ${fields.matrimonial.trim()} (as stated in French in the original), the said regime not having been modified by agreement or by a court since,`,
              ]
            : []),
          `${fields.fiscalResidenceFrance ? 'Having' : 'Not having'} their tax residence in France, within the meaning of the tax regulations.`,
          'Hereinafter “the OFFEROR”',
          'The OFFEROR undertakes to purchase, on the terms set out below, with the option of substitution, the real property described below.',
          `The OFFEROR acknowledges that these terms were negotiated by the Agency, holder of a negotiation mandate duly entered in its Register of mandates under number ${fields.mandateNumber}.`,
          ...(fields.agent
            ? [
                `This mandate was brought in by ${fields.agent.name}, acting as a commercial agent, duly entered in the Special Register of Commercial Agents under number ${fields.agent.rsac}.`,
              ]
            : []),
        ],
      },
      {
        heading: 'Nature and description of the property',
        paragraphs: [
          ...(fields.condominium
            ? [
                `In a building complex subject to the co-ownership regime defined by the law of 10 July 1965, located at ${fields.propertyAddress}.`,
              ]
            : []),
          'This building complex being built on a plot of land registered in the land register as:',
          ...fields.parcels.map(
            (parcel) =>
              `| ${parcel.prefix} | ${parcel.section} | ${parcel.number} | ${parcel.lieudit} | ${parcel.area}`,
          ),
          `A total area of ${fields.totalArea}.`,
          `Postal address of the property: ${fields.propertyAddress}`,
          ...fields.lots.map(
            (lot) =>
              `LOT NUMBER ${lot.number} Description: ${lot.description} And ${lot.shares} / ${lot.base} ths of the general common parts.`,
          ),
        ],
      },
      {
        heading: 'Terms of purchase',
        paragraphs: [
          '### Purchase price',
          `The OFFEROR declares their intention to purchase the property described above at the price of ${euros(fields.price)}.`,
          `The Agency’s fees will be paid by the ${fields.feesPaidBy === 'seller' ? 'SELLER' : 'BUYER'}.`,
          `These fees will amount to ${euros(fields.fees)}.`,
          'The OFFEROR will in addition bear all costs, duties and fees relating to the sale.',
          '### Financing of the purchase',
          ...(withLoan
            ? loanClause(fields.loan!)
            : [
                'The OFFEROR declares that they do not intend to use a loan to finance the purchase. Consequently, if the SELLER accepts the offer, the OFFEROR, having become the buyer, undertakes to reproduce in the preliminary sale contract, or in a declaration annexed to it and referred to by it, the handwritten statement waiving the condition precedent of obtaining a loan provided for by article L. 313-42 of the French Consumer Code.',
              ]),
          '### Other terms of the purchase',
          'On the day of transfer of ownership, the property must be free of any lease and of any occupation.',
          'In addition to the ordinary and legal conditions, the sale will be subject to the following conditions precedent:',
          '- the planning certificate or the title deeds must not reveal any real charge or serious easement likely to reduce the value of the property hereunder or significantly impair the BUYER’s enjoyment of it,',
          '- the mortgage statement must not reveal any registered lien or mortgage securing debts whose balance, in capital, interest and costs, cannot be repaid from the sale price.',
        ],
      },
      {
        heading: 'Acceptance of the offer by the SELLER',
        paragraphs: [
          `This purchase offer is valid until ${fields.validUntil} inclusive.`,
          'After that date, and failing acceptance by the SELLER, it will lapse without further formality, unless the OFFEROR agrees otherwise.',
          'Acceptance to sell on the terms of this offer must be recorded by the SELLER signing it.',
          'It will be notified to the OFFEROR no later than the last day of validity of the offer.',
          `A preliminary sale contract must then be signed by the SELLER and the OFFEROR no later than ${fields.contractDeadline}${
            fields.condominium
              ? ', subject to all the administrative documents relating to the sale file being available, including the ALUR PACK and the PRE-ETAT DATE issued by the co-ownership managing agent.'
              : ''
          }`,
          `The OFFEROR, having become the BUYER, will pay the sum of ${euros(fields.deposit)} as a deposit, on the terms set by the preliminary contract.`,
          'The accepted offer constitutes an agreement on the property and on the price within the meaning of articles 1583 and 1589 of the French Civil Code.',
          'In the event of a refusal to confirm this agreement:',
          '- the SELLER may be compelled to sell the above property by all legal means and channels, bearing the costs of proceedings. Should the SELLER die, their heirs and successors will be bound to perform this agreement;',
          '- the OFFEROR, subject to the fulfilment of any applicable conditions precedent or the exercise of any right of withdrawal, will be bound to buy. However, should the OFFEROR die, their heirs and successors may withdraw without compensation.',
          'Following the signature of the preliminary sale contract, the OFFEROR will have a withdrawal period of 10 days in accordance with article L. 271-1 of the French Construction and Housing Code.',
          'The BUYER and the SELLER expressly authorise the notary or notaries to send the AGENCY the draft preliminary contract and the signed preliminary sale contract, the draft deed of sale and the deed of sale that will be drawn up for this sale.',
        ],
      },
      {
        heading: 'Personal data',
        paragraphs: [
          'The OFFEROR is informed that the personal data concerning them collected by the AGENT in connection herewith will be processed by computer. This processing is based either on this offer, or on compliance with legal obligations, or on the pursuit of legitimate interests.',
          'The Agency is the controller of the personal data collected in connection herewith.',
          'This data is collected and processed for the purposes of receiving and managing this purchase offer, passing it on to the seller, carrying out the operations entrusted, following up the commercial relationship and communication, managing client and prospect files, and complying with the legal and regulatory obligations applicable to the agency’s business, in particular as regards the fight against money laundering and terrorist financing and, more generally, the purposes described in the General Data Protection Policy available on the Agency’s website or, on request, from the Agency.',
          'The personal data is intended for the authorised departments and staff of the Agency’s managers and for those taking part in the transaction or in the performance of legal or regulatory obligations, in particular notaries, banks, insurers, lawyers, judicial officers, electronic signature providers, electronic registered mail providers and, where applicable, real estate professionals involved in a partnership necessary to perform the assignment entrusted.',
          'The OFFEROR is also informed that this personal data may also be used for the AGENT’s prospecting operations in compliance with the regulations in force.',
          'The personal data is kept for the time needed to perform this agreement, plus the applicable legal limitation periods.',
          `The OFFEROR may ask the Agency to access, rectify, modify or delete the personal data concerning them, or object to its use, by sending an email to that effect to ${agency.email} or a letter to the following address: ${agency.address}. Any complaint may be lodged with the French data protection authority, the Commission Nationale de l’Informatique et des Libertés (www.cnil.fr).`,
          'The consumer is informed that any telephone call made for commercial purposes requires their prior consent, unless it takes place within the framework authorised by the regulations in force and in particular in the performance of a current contract within the meaning of the fourth paragraph of article L223-1 of the French Consumer Code.',
        ],
      },
      {
        heading: 'Signature',
        paragraphs: [
          'BY SIGNING IT ELECTRONICALLY, THE OFFEROR AGREES TO PURCHASE THE PROPERTY AT THE PRICE AND ON THE TERMS SET OUT IN THIS PURCHASE OFFER.',
        ],
      },
    ],
  };
}

const VISITOR_PIECES_EN: Record<StoredVoucherFields['piece'], string> = {
  cni: 'their national identity card',
  passport: 'their passport',
  residence: 'their residence permit',
  driving: 'their driving licence',
};

// Les champs figés d'un bon signé, pour sa traduction : les mêmes que le texte signé.
export function voucherFieldsForTranslation(stored: StoredVoucherFields): VoucherFields {
  return {
    agency: stored.agency,
    visitorName: visitorsLabel(stored.visitors).replace(/ et /g, ' and '),
    visitorAddress: stored.visitorAddress,
    visitorPiece: VISITOR_PIECES_EN[stored.piece],
    biens: stored.biens.map((bien) => ({
      mandate: bien.mandate,
      price: formatNumber(Math.round(bien.price), { maxDecimals: 0, language: 'en' }),
      address: bien.address,
    })),
    advisorName: stored.advisorName,
    city: stored.city,
    date: stored.date,
  };
}

// La traduction jointe, s'il y en a une : jamais pour un client francophone, jamais tant que le
// juriste ne l'a pas validée (`validated` sert aux tests ; en production, la constante décide).
export function legalTranslation(
  input:
    | { kind: 'visit_voucher'; fields: VoucherFields }
    | { kind: 'purchase_offer'; fields: OfferFields },
  language: TextLanguage,
  validated: boolean = TRADUCTION_DOCUMENTS_JURIDIQUES_VALIDEE,
): RenderedDocument | null {
  if (!validated || language === 'fr') return null;
  return input.kind === 'visit_voucher'
    ? renderVoucherInEnglish(input.fields)
    : renderOfferInEnglish(input.fields);
}
