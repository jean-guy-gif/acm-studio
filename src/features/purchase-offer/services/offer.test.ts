import { describe, expect, it } from 'vitest';

import { numberInWords } from '@/features/purchase-offer/services/amount-in-words';
import { offerExpiryTasks } from '@/features/purchase-offer/services/offer-tasks';
import {
  OFFRE_AVEC_PRET_VALIDEE,
  loanClause,
  renderOffer,
  sharesBaseInWords,
  type OfferFields,
} from '@/features/purchase-offer/services/offer-text';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { buildSuiviTaskList } from '@/features/meeting-conclusion/services/suivi-tasks';
import { documentToText } from '@/features/visit-voucher/services/voucher-text';

// Mission 137 (partie B) — l'offre d'achat : les montants en lettres de 1 à 9 999 999, le texte
// validé rendu à l'identique, les paragraphes conditionnels, le prêt caché, l'échéance rappelée.

describe('les montants en lettres', () => {
  it.each([
    [1, 'un'],
    [16, 'seize'],
    [17, 'dix-sept'],
    [21, 'vingt et un'],
    [22, 'vingt-deux'],
    [70, 'soixante-dix'],
    [71, 'soixante et onze'],
    [72, 'soixante-douze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [91, 'quatre-vingt-onze'],
    [99, 'quatre-vingt-dix-neuf'],
    [100, 'cent'],
    [101, 'cent un'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [280, 'deux cent quatre-vingts'],
    [1000, 'mille'],
    [1001, 'mille un'],
    [2000, 'deux mille'],
    [80_000, 'quatre-vingt mille'],
    [200_000, 'deux cent mille'],
    [420_000, 'quatre cent vingt mille'],
    [1_000_000, 'un million'],
    [2_000_000, 'deux millions'],
    [1_639_500, 'un million six cent trente-neuf mille cinq cents'],
    [
      9_999_999,
      'neuf millions neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf',
    ],
  ])('%i → %s', (value, words) => {
    expect(numberInWords(value)).toBe(words);
  });

  it('de 1 à 9 999 999 : jamais d’espace double, de trait d’union au bord, ni d’erreur', () => {
    for (let value = 1; value <= 9_999_999; value += 997) {
      const words = numberInWords(value);
      expect(words).not.toMatch(/ {2}|^[ -]|[ -]$|- | -/);
    }
    expect(() => numberInWords(10_000_000)).toThrow();
    expect(() => numberInWords(1.5)).toThrow();
  });

  it('la base des tantièmes', () => {
    expect(sharesBaseInWords(1000)).toBe('millièmes');
    expect(sharesBaseInWords(10_000)).toBe('dix millièmes');
    expect(sharesBaseInWords(100)).toBe('centièmes');
  });
});

const AGENCY = {
  name: 'Agence Exemple',
  address: '10 avenue du Prototype, 06250 Mougins',
  phone: '06 39 98 00 00',
  email: 'agence@example.com',
  companyName: 'Société Exemple',
  companyForm: 'SAS',
  shareCapital: '10 000',
  companySeat: '1 rue de la Maquette, 06000 Nice',
  rcsCity: 'Nice',
  rcsNumber: '123 456 789',
  cardNumber: 'CPI 0601 2026 000 000 001',
  cardIssuer: 'CCI Nice Côte d’Azur',
  vatNumber: 'FR32123456789',
  rcpInsurer: 'Assureur Exemple',
  rcpAddress: '2 rue de la Maquette, 06000 Nice',
  rcpNumber: 'RCP-1',
  guaranteeBody: 'Garant Exemple',
  guaranteeAddress: '3 rue de la Maquette, 06000 Nice',
  guaranteeNumber: 'GF-1',
  guaranteeAmount: 120000,
  representativeName: 'Claire Exemple',
  representativeTitle: 'Présidente',
};

const fields = (over: Partial<OfferFields> = {}): OfferFields => ({
  agency: AGENCY,
  offrants: [
    {
      civility: 'M.',
      lastName: 'Exemple',
      firstNames: 'Paul Antoine',
      birthDate: '12/04/1978',
      birthPlace: 'Strasbourg (67)',
      nationality: 'française',
      profession: 'ingénieur',
    },
  ],
  address: '5 chemin des Figurants, 69006 Lyon',
  matrimonial: null,
  fiscalResidenceFrance: true,
  mandateNumber: 'M-1',
  agent: null,
  condominium: false,
  propertyAddress: '12 allée du Décor, 06250 Mougins',
  parcels: [
    { prefix: '', section: 'AB', number: '214', lieudit: 'Les Restanques', area: '18 a 40 ca' },
  ],
  totalArea: '18 a 40 ca',
  lots: [],
  price: 1_590_000,
  feesPaidBy: 'seller',
  fees: 64_000,
  financing: 'cash',
  loan: null,
  validUntil: '08/11/2026',
  contractDeadline: '21/12/2026',
  deposit: 80_000,
  ...over,
});

describe('le texte validé de l’offre', () => {
  it('est rendu à l’identique, champs remplacés (instantané)', () => {
    expect(documentToText(renderOffer(fields()))).toMatchSnapshot();
  });

  it('les clauses mot pour mot, la garantie et son montant, sans le réseau', () => {
    const text = documentToText(renderOffer(fields()));
    expect(text).toMatch(/sous le n° GF-1 pour un montant de 120\s000 € ,/);
    expect(text).toContain(
      "L'OFFRANT déclare son intention d'acquérir les biens ci-dessus désignés au prix de un million cinq cent quatre-vingt-dix mille euros",
    );
    expect(text).toContain("Les honoraires de l'Agence seront à la charge du VENDEUR.");
    expect(text).toContain('soixante-quatre mille euros');
    expect(text).toContain('versera la somme de quatre-vingt mille euros');
    expect(text).toContain("prévue par l'article L. 313-42 du Code de la consommation.");
    expect(text).toContain("Cette offre d'achat est valable jusqu'au 08/11/2026 inclus.");
    expect(text).toContain(
      "En la signant électroniquement, L'OFFRANT ACCEPTE D'ACQUERIR LES BIENS AUX PRIX ET CONDITIONS CONTENUS DANS LA PRESENTE OFFRE D'ACHAT.",
    );
    expect(text).toContain('Ayant leur résidence fiscale en France');
    expect(text).not.toMatch(/réseau|[{}]/i);
  });

  it('agent commercial, copropriété (lots, PACK ALUR) et régime matrimonial : seulement renseignés', () => {
    const plain = documentToText(renderOffer(fields()));
    expect(plain).not.toMatch(/agent commercial|copropriété|PACK ALUR|LOT NUMERO|Se déclarant/);
    const full = documentToText(
      renderOffer(
        fields({
          agent: { name: 'Léa Exemple', rsac: 'RSAC 123' },
          condominium: true,
          lots: [{ number: 212, description: 'un appartement', shares: 212, base: 10_000 }],
          matrimonial: 'mariés sous le régime de la communauté',
          fiscalResidenceFrance: false,
        }),
      ),
    );
    expect(full).toContain(
      "Ce mandat a été apporté par Léa Exemple, agissant en sa qualité d'agent commercial, régulièrement inscrit au Registre spécial des Agents commerciaux sous le numéro RSAC 123 .",
    );
    expect(full).toContain(
      'soumis au régime de la copropriété tel que défini par la loi du 10 juillet 1965',
    );
    expect(full).toContain(
      'LOT NUMERO DEUX CENT DOUZE ( 212 ) Description : un appartement Et les deux cent douze / dix millièmes ( 212 / 10000 èmes) des parties communes générales .',
    );
    expect(full).toContain(
      'le PACK ALUR et le PRE ETAT DATE délivrés par le syndic de copropriété.',
    );
    expect(full).toContain(
      "Se déclarant mariés sous le régime de la communauté, ledit régime n'ayant subi aucune modification",
    );
    expect(full).toContain("N'ayant pas leur résidence fiscale en France");
  });

  it('la clause « avec prêt » reste désactivée tant que le juriste ne l’a pas validée', () => {
    expect(OFFRE_AVEC_PRET_VALIDEE).toBe(false);
    const text = documentToText(
      renderOffer(
        fields({
          financing: 'loan',
          loan: { contribution: 100_000, amount: 1_490_000, years: 20, rate: '4,2', days: 15 },
        }),
      ),
    );
    expect(text).not.toContain("condition suspensive de l'obtention de ce ou ces prêts");
    expect(text).toContain("L'OFFRANT déclare ne pas avoir l'intention de recourir à un prêt");
    // Codée, prête à l'emploi.
    expect(
      loanClause({ contribution: 100_000, amount: 1_490_000, years: 20, rate: '4,2', days: 15 })[0],
    ).toContain(
      "d'une durée maximale de 20 ans, au taux nominal maximum de 4,2 % l'an hors assurance.",
    );
  });
});

describe('l’échéance de l’offre, rappelée la veille', () => {
  const NOW = new Date('2026-11-07T09:00:00Z');
  const offer = (over: Record<string, unknown> = {}) => ({
    offerId: 'o1',
    buyerId: 'keller',
    buyerName: 'Famille Keller',
    validUntil: '2026-11-08',
    answered: false,
    ...over,
  });

  it('due la veille, et le dernier jour ; passée ou répondue : plus rien', () => {
    const tasks = offerExpiryTasks([offer()], NOW);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.dueOn).toBe('2026-11-07');
    expect(offerExpiryTasks([offer({ validUntil: '2026-11-06' })], NOW)).toEqual([]);
    expect(offerExpiryTasks([offer({ answered: true })], NOW)).toEqual([]);
    // Dans trois jours : pas encore due.
    const later = offerExpiryTasks([offer({ validUntil: '2026-11-10' })], NOW);
    expect(buildSuiviTaskList([], NOW, later).dues).toHaveLength(0);
  });

  it('en tête de « À faire aujourd’hui », jamais en retard, « expire demain »', () => {
    const list = buildSuiviTaskList([], NOW, [
      {
        kind: 'buyer_relaunch',
        projectId: '',
        sellerName: '',
        dueOn: '2026-11-01',
        buyerId: 'lambert',
        buyerName: 'M. et Mme Lambert',
        count: 1,
        sentOn: '2026-10-30',
      },
      ...offerExpiryTasks([offer()], NOW),
    ]);
    expect(list.dues[0]!.kind).toBe('offer_expiry');
    const line = taskLine(
      list.dues[0]!,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-07',
    );
    expect(line.title).toBe('L’offre de la famille Keller expire demain');
    expect(line.detail).toBe('valable jusqu’au 08/11 inclus · le vendeur n’a pas répondu');
    expect(line.late).toBeNull();
    expect(line.href).toBe('/acquereurs/keller/offre/o1');
  });
});
