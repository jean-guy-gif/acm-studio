import { describe, expect, it } from 'vitest';

import {
  buyerLetterAddressee,
  buyerLetterForbidden,
  defaultBuyerLetter,
  matchingFeatures,
} from '@/features/buyer-prospecting/services/buyer-letter';
import {
  buyerProspectingCard,
  parseProspectingOrigin,
} from '@/features/buyer-prospecting/services/buyer-prospect-card';
import { buildBuyerProspectRow } from '@/features/buyer-prospecting/services/buyer-prospect-row';
import {
  NO_FACTS,
  prospectFacts,
  storedFacts,
} from '@/features/buyer-prospecting/services/prospect-facts';
import { visitAction } from '@/features/buyer-prospecting/services/visit-action';
import {
  visitLetterState,
  visitWaitingLabel,
} from '@/features/buyer-prospecting/services/visit-letter-state';
import type { BuyerProspectRecord } from '@/features/buyer-prospecting/types';
import { buildOppositions } from '@/features/prospecting/services/opposition';
import { prospectionHref } from '@/features/prospecting/services/filter-prospecting';
import { formatSquareMeters } from '@/lib/format';

const M2 = formatSquareMeters(200);

// Mission 120 — « J'ai un acquéreur pour votre bien » : l'action de la visite, les faits du bien
// démarché, le courrier, la carte et l'état relu.

describe('l’action proposée selon l’origine du bien et son exclusivité', () => {
  it('un mandat signé se fait visiter, un vendeur à relancer se rappelle (M86)', () => {
    expect(visitAction({ source: 'project', projectId: 'p1', outcome: 'signed' })).toEqual({
      kind: 'propose_visit',
      projectId: 'p1',
    });
    expect(visitAction({ source: 'project', projectId: 'p1', outcome: 'follow_up' })).toEqual({
      kind: 'call_seller',
      projectId: 'p1',
    });
    expect(visitAction({ source: 'project', projectId: 'p1', outcome: 'withdrawn' }).kind).toBe(
      'none',
    );
  });

  it('un concurrent ou une annonce : propriétaire, confrère, ou le choix du conseiller', () => {
    for (const source of ['competitor', 'listing'] as const) {
      expect(visitAction({ source, exclusivity: 'no' }).kind).toBe('owner_letter');
      expect(visitAction({ source, exclusivity: 'yes' }).kind).toBe('colleague_letter');
      expect(visitAction({ source, exclusivity: 'unknown' }).kind).toBe('choose');
      expect(visitAction({ source, exclusivity: null }).kind).toBe('choose');
    }
  });
});

describe('les faits d’un bien démarché, en liste d’autorisation', () => {
  it('l’import d’abord, puis la recherche ; rien hors liste ni hors bornes', () => {
    const facts = prospectFacts(
      {
        surfaceArea: 200,
        outdoorSpaces: ['terrace', 'garden', 'piscine', 'none'],
        parkingTypes: ['garage'],
        energyRating: 'b',
        price: -4,
        photoUrls: ['https://exemple.invalid/1.jpg', 'javascript:alert(1)'],
        title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
        address: '12 rue des Lilas',
      },
      { propertyType: 'house', roomsCount: 7, surfaceArea: 999, city: 'Mouans-Sartoux' },
    );
    expect(facts).toEqual({
      ...NO_FACTS,
      propertyType: 'house',
      surfaceArea: 200,
      roomsCount: 7,
      outdoorSpaces: ['terrace', 'garden'],
      parkingTypes: ['garage'],
      energyRating: 'B',
      city: 'Mouans-Sartoux',
      photoUrls: ['https://exemple.invalid/1.jpg'],
    });
    expect(JSON.stringify(facts)).not.toMatch(/Dupont|Lilas|EXCLUSIVITÉ/);
  });

  it('relu en base, ce qui n’est pas un objet ne donne rien', () => {
    expect(storedFacts([1, 2])).toEqual(NO_FACTS);
    expect(storedFacts(null)).toEqual(NO_FACTS);
  });
});

const keller = {
  name: 'Famille Keller',
  budgetIdeal: 1_500_000,
  budgetMax: 1_650_000,
  propertyTypes: ['house' as const],
  roomsMin: 5,
  surfaceMin: 180,
  outdoor: true,
  parking: null,
  pool: true,
};
const villa = {
  ...NO_FACTS,
  propertyType: 'house',
  roomsCount: 7,
  surfaceArea: 200,
  outdoorSpaces: ['terrace', 'garden'],
  parkingTypes: ['garage'],
  hasPool: null,
  city: 'Mouans-Sartoux',
};

describe('le courrier au propriétaire', () => {
  it('ce que la fiche demande ET que le bien a : ni le garage (non demandé), ni la piscine (non indiquée)', () => {
    expect(matchingFeatures(villa, keller)).toBe(
      `maison de 7 pièces, ${M2}, avec une terrasse et un jardin`,
    );
    expect(matchingFeatures({ ...villa, hasPool: true }, keller)).toBe(
      `maison de 7 pièces, ${M2}, avec une terrasse, un jardin et une piscine`,
    );
    expect(matchingFeatures(NO_FACTS, keller)).toBeNull();
  });

  it('le texte proposé : la recherche, la question de la visite, rien d’autre', () => {
    const texts = defaultBuyerLetter(villa, keller);
    expect(texts.letter).toContain(
      `J’accompagne une recherche qui correspond aux caractéristiques de votre bien : maison de 7 pièces, ${M2}, avec une terrasse et un jardin.`,
    );
    expect(texts.letter).toContain(
      'Je souhaiterais vérifier avec vous si une visite est envisageable.',
    );
    expect(buyerLetterForbidden([texts.title, texts.letter, texts.contactHook], keller)).toBe(
      false,
    );
  });

  it('jamais le nom, jamais le budget, jamais « certain », « offre », « prête »', () => {
    const ok = (text: string) => !buyerLetterForbidden([text], keller);
    expect(ok('Mes clients, la famille Keller, adorent votre maison.')).toBe(false);
    expect(ok('Un budget de 1 650 000 €.')).toBe(false);
    expect(ok('Un budget de 1650000 €.')).toBe(false);
    expect(ok('Un acquéreur certain.')).toBe(false);
    expect(ok('Une offre rapide.')).toBe(false);
    expect(ok('Une visite prête.')).toBe(false);
    expect(ok('Je souhaiterais vérifier avec vous si une visite est envisageable.')).toBe(true);
    // « famille » seul n'est pas un nom.
    expect(ok('Une famille cherche une maison.')).toBe(true);
  });

  it('le destinataire : le propriétaire d’une maison, les copropriétaires d’un appartement', () => {
    expect(buyerLetterAddressee(villa, '8 allée du Décor, 06370 Mouans-Sartoux')).toEqual({
      lead: 'Au propriétaire du',
      nameLines: ['8 allée du Décor', '06370 Mouans-Sartoux'],
    });
    expect(
      buyerLetterAddressee({ propertyType: 'Appartement' }, '3 rue A, 06600 Antibes').lead,
    ).toBe('Aux copropriétaires du');
  });
});

const prospect = (patch: Partial<BuyerProspectRecord> = {}): BuyerProspectRecord => ({
  id: 'p1',
  created_at: '2026-10-26T10:00:00Z',
  updated_at: '2026-10-26T10:00:00Z',
  agency_id: 'a',
  created_by: null,
  listing_url: 'https://www.seloger.com/annonces/achat/maison/mougins-06/26ZEJMLWB13Y.htm',
  listing_key: 'seloger:26ZEJMLWB13Y',
  facts: { propertyType: 'house', surfaceArea: 200, roomsCount: 7, city: 'Mougins' },
  sold_by: 'agency',
  exclusivity: 'no',
  sold_by_source: null,
  exclusivity_source: null,
  locator_state: null,
  locator_label: null,
  locator_label_key: null,
  locator_address: null,
  locator_source: null,
  locator_confirmed: null,
  locator_property_id: null,
  locator_latitude: null,
  locator_longitude: null,
  locator_analyzed_at: null,
  locator_address_at: null,
  locator_purged_at: null,
  prospecting_handed_at: null,
  prospecting_meeting_at: null,
  prospecting_mandate_at: null,
  prospecting_declined_at: null,
  prospecting_collaboration_at: null,
  prospecting_collaboration_declined_at: null,
  ...patch,
});

describe('la carte d’un bien démarché', () => {
  it('la même ligne qu’un concurrent : adresse à confirmer, prêt, remis', () => {
    expect(buildBuyerProspectRow(prospect()).status).toBe('to_confirm');
    const ready = buildBuyerProspectRow(
      prospect({ locator_address: '8 allée du Décor, Mougins', locator_confirmed: true }),
    );
    expect(ready.status).toBe('ready');
    expect(ready.step).toBe('owner');
    expect(ready.listingKey).toBe('seloger:26ZEJMLWB13Y');
    expect(ready.surfaceArea).toBe(200);
    expect(
      buildBuyerProspectRow(prospect({ prospecting_handed_at: '2026-10-27T09:00:00Z' })).status,
    ).toBe('handed');
    expect(buildBuyerProspectRow(prospect({ exclusivity: 'yes' })).step).toBe('colleague');
    expect(buildBuyerProspectRow(prospect({ exclusivity: null, sold_by: null })).step).toBe(
      'check',
    );
  });

  it('« Ne plus solliciter » par l’annonce, comme un concurrent (M102)', () => {
    const oppositions = buildOppositions([
      {
        address_key: null,
        listing_key: 'seloger:26ZEJMLWB13Y',
        requested_at: '2026-10-20T10:00:00Z',
        commune_unverified: false,
      } as never,
    ]);
    expect(buildBuyerProspectRow(prospect(), oppositions).opposedOn).not.toBeNull();
  });

  it('une carte de Prospection sans dossier vendeur', () => {
    const row = buildBuyerProspectRow(prospect());
    const card = buyerProspectingCard({ prospectId: 'p1', row, origins: [] });
    expect(card.sellers).toEqual([]);
    expect(card.copies).toHaveLength(1);
  });

  it('le filtre « Origine » : dans l’adresse, un inconnu retombe sur tout', () => {
    expect(parseProspectingOrigin('acquereur')).toBe('buyer');
    expect(parseProspectingOrigin('vendeur')).toBe('seller');
    expect(parseProspectingOrigin('autre')).toBe('all');
    expect(prospectionHref(null, 'all', 'buyer')).toBe('/prospection?origine=acquereur');
    expect(prospectionHref(null, 'all')).toBe('/prospection');
  });
});

describe('l’état du courrier, relu sur la visite', () => {
  const card = (status: Parameters<typeof visitLetterState>[0] & object) => card2(status);
  const card2 = (value: NonNullable<Parameters<typeof visitLetterState>[0]>) => value;
  const base = { step: 'owner' as const, handedAt: null, meetingAt: null, opposedOn: null };

  it('« Adresse à confirmer », « Courrier prêt », « Remis le … », en attente du propriétaire', () => {
    const toConfirm = visitLetterState(card({ ...base, status: 'to_confirm' }));
    expect(toConfirm.kind === 'address' && toConfirm.label).toBe('Adresse à confirmer');
    expect(visitWaitingLabel(toConfirm, 'owner')).toBe('En attente du propriétaire');
    const ready = visitLetterState(card({ ...base, status: 'ready' }));
    expect(ready.kind === 'ready' && ready.label).toBe('Courrier prêt');
    const handed = visitLetterState(
      card({ ...base, status: 'handed', handedAt: '2026-10-27T09:00:00Z' }),
    );
    expect(handed.kind === 'handed' && handed.label).toBe('Remis le 27/10');
    expect(visitWaitingLabel(handed, 'owner')).toBe('En attente du propriétaire');
  });

  it('mandat rentré ou collaboration obtenue : la visite repasse « À planifier »', () => {
    const mandate = visitLetterState(card({ ...base, status: 'mandate' }));
    expect(mandate.kind === 'done' && mandate.label).toBe('Mandat rentré');
    expect(visitWaitingLabel(mandate, 'owner')).toBeNull();
    const collaboration = visitLetterState(
      card({ ...base, step: 'colleague', status: 'collaboration' }),
    );
    expect(collaboration.kind === 'done' && collaboration.label).toBe('Collaboration obtenue');
    expect(visitWaitingLabel(collaboration, 'colleague')).toBeNull();
  });

  it('sans courrier : rien ; opposé : « Ne plus solliciter »', () => {
    expect(visitLetterState(null)).toEqual({ kind: 'none' });
    expect(visitLetterState(card({ ...base, status: 'ready', opposedOn: '2026-10-20' })).kind).toBe(
      'closed',
    );
  });
});
