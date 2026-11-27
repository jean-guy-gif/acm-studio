import { describe, expect, it } from 'vitest';

import { professionalMentions } from '@/features/prospecting-file/services/build-prospecting-file';
import {
  guaranteeLine,
  legalIdentityGaps,
  type LegalIdentity,
} from '@/features/legal-identity/services/legal-identity';
import {
  cityOfAddress,
  parisDateLabel,
  visitorsLabel,
  voucherAgency,
  voucherPrice,
} from '@/features/visit-voucher/services/voucher-fields';
import {
  decodeSignature,
  readVoucherFields,
} from '@/features/visit-voucher/services/voucher-input';
import {
  documentToText,
  renderVoucher,
  textToDocument,
  VISITOR_PIECES,
} from '@/features/visit-voucher/services/voucher-text';

// Mission 137 (partie A) — le bon de visite : le texte validé rendu à l'identique, seuls les champs
// changent ; l'identité légale incomplète ne produit rien ; la signature est un PNG.
const IDENTITY: LegalIdentity = {
  companyName: 'Société Exemple',
  companyForm: 'SAS',
  shareCapital: '10 000',
  companySeat: '1 rue de la Maquette, 06000 Nice',
  rcsCity: 'Nice',
  rcsNumber: '123 456 789',
  vatNumber: 'FR32123456789',
  agencyPhone: '06 39 98 00 00',
  agencyEmail: 'agence@example.com',
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
const BRANDING = {
  documentName: null,
  postalAddress: '10 avenue du Prototype, 06250 Mougins',
  professionalCard: 'CPI 0601 2026 000 000 001',
  professionalCardIssuer: 'CCI Nice Côte d’Azur',
};

const render = () => {
  const agency = voucherAgency({
    identity: IDENTITY,
    branding: BRANDING,
    agencyName: 'Agence Exemple',
  })!;
  return documentToText(
    renderVoucher({
      agency,
      visitorName: visitorsLabel([
        { civility: 'M.', name: 'Paul Exemple' },
        { civility: 'Mme', name: 'Anna Exemple' },
      ]),
      visitorAddress: '5 chemin des Figurants, 69006 Lyon',
      visitorPiece: VISITOR_PIECES.cni,
      biens: [
        {
          mandate: 'M-1',
          price: voucherPrice(1639500),
          address: '12 allée du Décor, 06250 Mougins',
        },
        {
          mandate: 'M-2',
          price: voucherPrice(1720000),
          address: '4 rue du Brouillon, 06250 Mougins',
        },
      ],
      advisorName: 'Carl Conseiller',
      city: cityOfAddress(BRANDING.postalAddress),
      date: '06/11/2026',
    }),
  );
};

describe('le texte validé du bon de visite', () => {
  it('est rendu à l’identique, champs remplacés (instantané)', () => {
    expect(render()).toMatchSnapshot();
  });

  it('reprend les clauses mot pour mot, la coquille « de de » comprise, sans le réseau', () => {
    const text = render();
    expect(text).toContain('la gestion et le suivi de de relations commerciales');
    expect(text).toContain(
      "DECLARANT NE POUVOIR NI RECEVOIR NI DETENIR D'AUTRES FONDS, EFFETS OU VALEURS QUE CEUX REPRESENTATIFS DE SA REMUNERATION",
    );
    expect(text).toContain(
      "L'Agence est responsable des traitements des données à caractère personnel collectées à l'occasion des présentes.",
    );
    expect(text).toContain("consultable sur le site de l'Agence ou, sur simple demande");
    expect(text).toContain("partenaires commerciaux de l'Agence.");
    expect(text).toContain('Worldline - Service Bloctel - CS 61311 - 41013 BLOIS CEDEX');
    expect(text).not.toMatch(/réseau|[{}]/i);
  });

  it('remplit chaque champ : l’agence, deux visiteurs, deux biens, le conseiller, la ville', () => {
    const text = render();
    expect(text).toContain(
      'Agence Exemple , située 10 avenue du Prototype, 06250 Mougins , téléphone 06 39 98 00 00',
    );
    expect(text).toContain('Je soussigné(e) M. Paul Exemple et Mme Anna Exemple , demeurant');
    expect(text).toContain("comme en atteste sa carte nationale d'identité");
    expect(text).toMatch(
      /Numéro du mandat\s: M-1 · Prix de commercialisation\s: 1\s639\s500 € · Adresse du bien\s: 12 allée du Décor/,
    );
    expect(text).toContain(
      'Les biens ci-dessus mentionnés ont été présentés par Carl Conseiller .',
    );
    expect(text).toContain('Fait à Mougins , le 06/11/2026 .');
  });

  it('se relit tel qu’il a été figé : titre, sections, paragraphes', () => {
    const document = textToDocument(render());
    expect(document.title).toBe('BON DE VISITE - BIEN(S) A VENDRE');
    expect(document.sections.map((section) => section.heading)).toEqual([
      "L'AGENCE",
      'DECLARATIONS',
      'BIEN(S) PROPOSE(S) A LA VENTE',
      'Collecte et exploitation des données personnelles',
      'SIGNATURE(S)',
    ]);
    expect(documentToText(document)).toBe(render());
  });
});

describe('l’identité légale', () => {
  it('incomplète : ce qui manque, et aucun paragraphe d’agence', () => {
    const gaps = legalIdentityGaps(
      { ...IDENTITY, rcpNumber: null, guaranteeAmount: null },
      {
        ...BRANDING,
        professionalCard: '',
      },
    );
    expect(gaps).toEqual([
      'Carte professionnelle',
      'Responsabilité civile professionnelle\u00a0: N° de contrat',
      'Garantie financière\u00a0: Montant de la garantie (en euros)',
    ]);
    expect(
      voucherAgency({
        identity: { ...IDENTITY, vatNumber: null },
        branding: BRANDING,
        agencyName: 'A',
      }),
    ).toBeNull();
    expect(legalIdentityGaps(IDENTITY, BRANDING)).toEqual([]);
  });

  it('la garantie structurée, recomposée sans préfixe (les courriers ajoutent « Garantie financière : »)', () => {
    expect(guaranteeLine(IDENTITY)?.replace(/\s/g, ' ')).toBe('Garant Exemple, n° GF-1, 120 000 €');
    expect(guaranteeLine({ ...IDENTITY, guaranteeBody: null })).toBeNull();
    // Le courrier ajoute le préfixe une seule fois (relecteur : il se doublait).
    const mentions = professionalMentions({
      professionalCard: 'CPI 1',
      professionalCardIssuer: 'CCI',
      financialGuarantee: guaranteeLine(IDENTITY),
    });
    expect(mentions.join(' ').match(/Garantie financière/g)).toHaveLength(1);
  });

  it('le nom sur les documents l’emporte sur le nom de l’agence', () => {
    expect(
      voucherAgency({
        identity: IDENTITY,
        branding: { ...BRANDING, documentName: 'Nom imprimé' },
        agencyName: 'Agence Exemple',
      })?.name,
    ).toBe('Nom imprimé');
  });
});

describe('les petites règles', () => {
  it('la ville de l’adresse, la date de Paris', () => {
    expect(cityOfAddress('10 avenue du Prototype, 06250 Mougins')).toBe('Mougins');
    expect(cityOfAddress('sans code postal')).toBe('');
    expect(cityOfAddress('10 avenue du Prototype, 06250 Mougins, France')).toBe('Mougins');
    expect(parisDateLabel(new Date('2026-11-06T23:30:00Z'))).toBe('07/11/2026');
  });

  it('une signature : un PNG vérifié par ses octets, 256 Ko au plus', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(100),
    ]);
    expect(decodeSignature(`data:image/png;base64,${png.toString('base64')}`)).not.toBeNull();
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(100)]);
    expect(decodeSignature(`data:image/png;base64,${jpeg.toString('base64')}`)).toBeNull();
    const huge = Buffer.concat([png, Buffer.alloc(300 * 1024)]);
    expect(decodeSignature(`data:image/png;base64,${huge.toString('base64')}`)).toBeNull();
  });

  it('les champs gardés se relisent par liste d’autorisation', () => {
    expect(readVoucherFields({ visitors: [] })).toBeNull();
    expect(readVoucherFields('texte')).toBeNull();
  });
});
