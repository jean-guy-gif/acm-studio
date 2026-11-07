import { describe, expect, it } from 'vitest';

import {
  legalTranslation,
  renderOfferInEnglish,
  TRADUCTION_DOCUMENTS_JURIDIQUES_VALIDEE,
  TRANSLATION_NOTICE,
  voucherFieldsForTranslation,
} from '@/features/legal-translation/legal-translation';
import type { OfferFields } from '@/features/purchase-offer/services/offer-text';
import type { StoredVoucherFields } from '@/features/visit-voucher/services/voucher-input';
import { documentToText, type VoucherAgency } from '@/features/visit-voucher/services/voucher-text';
import { frenchLeaks } from '@/test-fixtures/french-leaks';

// Mission 140 B — la traduction jointe du bon de visite et de l'offre d'achat : codée, désactivée
// tant que le juriste ne l'a pas validée ; jamais pour un client francophone ; le français reste le
// seul texte signé.

const AGENCY: VoucherAgency = {
  name: 'Agence Horizon',
  address: '70 rue du Bonheur, 06140 Vence',
  phone: '06 39 98 00 00',
  email: 'agence@example.com',
  companyName: 'Horizon SAS',
  companyForm: 'SAS',
  shareCapital: '10 000',
  companySeat: '70 rue du Bonheur, 06140 Vence',
  rcsCity: 'Grasse',
  rcsNumber: '123 456 789',
  cardNumber: 'CPI 0605 2026 000 000 001',
  cardIssuer: 'CCI Nice',
  vatNumber: 'FR32123456789',
  rcpInsurer: 'Assureur',
  rcpAddress: '1 place, 06000 Nice',
  rcpNumber: 'RCP-1',
  guaranteeBody: 'Garant',
  guaranteeAddress: '2 place, 06000 Nice',
  guaranteeNumber: 'GF-1',
  representativeName: 'Claire Exemple',
  representativeTitle: 'Présidente',
};

const STORED: StoredVoucherFields = {
  agency: AGENCY,
  visitors: [{ civility: 'M.', name: 'Wilson John' }],
  visitorAddress: '1 Baker Street, London',
  piece: 'passport',
  biens: [
    {
      visitId: 'v',
      reference: 'project:p',
      label: 'Appartement',
      mandate: '42',
      price: 395_000,
      address: '5 avenue des Pins, 06600 Antibes',
    },
  ],
  advisorName: 'Camille Martin',
  city: 'Vence',
  date: '06/11/2026',
};

const PROPER = [
  'Agence Horizon',
  '70 rue du Bonheur, 06140 Vence',
  'Horizon SAS',
  'Claire Exemple',
  'Présidente',
  '5 avenue des Pins, 06600 Antibes',
  'Camille Martin',
  'Commission Nationale de l’Informatique et des Libertés',
  'Worldline - Service Bloctel - CS 61311 - 41013 BLOIS CEDEX',
  'Vence',
];

describe('la traduction jointe des documents juridiques', () => {
  it('reste désactivée tant que le juriste ne l’a pas validée', () => {
    expect(TRADUCTION_DOCUMENTS_JURIDIQUES_VALIDEE).toBe(false);
    expect(
      legalTranslation(
        { kind: 'visit_voucher', fields: voucherFieldsForTranslation(STORED) },
        'en',
      ),
    ).toBeNull();
  });

  it('jamais pour un client francophone', () => {
    expect(
      legalTranslation(
        { kind: 'visit_voucher', fields: voucherFieldsForTranslation(STORED) },
        'fr',
        true,
      ),
    ).toBeNull();
  });

  it('validée : le bon en anglais, marqué en tête, sans un mot français hors des noms propres', () => {
    const translation = legalTranslation(
      { kind: 'visit_voucher', fields: voucherFieldsForTranslation(STORED) },
      'en',
      true,
    )!;
    expect(translation.title).toBe('VIEWING FORM - PROPERTY(IES) FOR SALE');
    const text = documentToText(translation);
    expect(text).toContain('their passport');
    expect(text).toContain('Listing price: €395,000');
    expect(frenchLeaks(text, PROPER)).toEqual([]);
    expect(TRANSLATION_NOTICE).toContain('seule la version française fait foi');
  });

  it('validée : l’offre en anglais, sans un mot français hors des noms propres', () => {
    const fields: OfferFields = {
      agency: { ...AGENCY, guaranteeAmount: 120_000 },
      offrants: [
        {
          civility: 'M.',
          lastName: 'Wilson',
          firstNames: 'John',
          birthDate: '01/02/1980',
          birthPlace: 'London',
          nationality: 'British',
          profession: 'engineer',
        },
      ],
      address: '1 Baker Street, London',
      matrimonial: null,
      fiscalResidenceFrance: false,
      mandateNumber: '42',
      agent: null,
      condominium: true,
      propertyAddress: '5 avenue des Pins, 06600 Antibes',
      parcels: [
        { prefix: '000', section: 'AB', number: '12', lieudit: 'Les Pins', area: '1 200 m²' },
      ],
      totalArea: '1 200 m²',
      lots: [{ number: 12, description: 'an apartment', shares: 136, base: 10_000 }],
      price: 395_000,
      feesPaidBy: 'seller',
      fees: 15_000,
      financing: 'cash',
      loan: null,
      validUntil: '13/11/2026',
      contractDeadline: '15/12/2026',
      deposit: 19_750,
    };
    const text = documentToText(renderOfferInEnglish(fields));
    expect(text).toContain('PURCHASE OFFER');
    expect(text).toContain('at the price of €395,000');
    expect(frenchLeaks(text, [...PROPER, 'Les Pins', 'ALUR', 'PRE-ETAT DATE'])).toEqual([]);
  });
});
