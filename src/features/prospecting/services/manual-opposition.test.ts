import { describe, expect, it } from 'vitest';

import { addressKey } from '@/features/prospecting/services/address-key';
import {
  MANUAL_OPPOSITION_ARRONDISSEMENT,
  MANUAL_OPPOSITION_MISMATCH,
  MANUAL_OPPOSITION_NO_COMMUNE,
  MANUAL_OPPOSITION_UNAVAILABLE,
  MANUAL_OPPOSITION_UNKNOWN_COMMUNE,
  MANUAL_OPPOSITION_UNKNOWN_POSTAL_CODE,
  decideManualOpposition,
  manualCommuneLookupName,
  parseManualAddress,
  unverifiedManualOpposition,
  type ManualCommune,
} from '@/features/prospecting/services/manual-opposition';
import { buildOppositions, opposedOn } from '@/features/prospecting/services/opposition';

// Réponses de geo.api.gouv.fr (`type=commune-actuelle`), relevées le 13/10/2026.
const CAGNES: ManualCommune = { code: '06027', name: 'Cagnes-sur-Mer' };
const ANTIBES: ManualCommune = { code: '06004', name: 'Antibes' };
const PARIS: ManualCommune = { code: '75056', name: 'Paris' };
// 06530 : un code postal, cinq communes.
const POSTAL_06530: ManualCommune[] = [
  { code: '06026', name: 'Cabris' },
  { code: '06095', name: 'Peymeinade' },
  { code: '06118', name: 'Saint-Cézaire-sur-Siagne' },
  { code: '06137', name: 'Spéracèdes' },
  { code: '06140', name: 'Le Tignet' },
];

const decide = (raw: string, communes: ManualCommune[], chosen: string | null = null) => {
  const parts = parseManualAddress(raw);
  if (!parts) throw new Error(`adresse non lue : ${raw}`);
  return decideManualOpposition(parts, communes, chosen);
};

describe('parseManualAddress — la voie, le code postal, la commune', () => {
  it('lit les écritures courantes', () => {
    expect(parseManualAddress('  14 ch. des Oliviers,  06800 Cagnes-sur-Mer ')).toEqual({
      street: '14 ch. des Oliviers',
      postalCode: '06800',
      commune: 'Cagnes-sur-Mer',
    });
    expect(parseManualAddress('14 chemin des Oliviers 06800')).toEqual({
      street: '14 chemin des Oliviers',
      postalCode: '06800',
      commune: null,
    });
    expect(parseManualAddress('14 chemin des Oliviers, Cagnes-sur-Mer 06800, France')).toEqual({
      street: '14 chemin des Oliviers',
      postalCode: '06800',
      commune: 'Cagnes-sur-Mer',
    });
    expect(parseManualAddress('14 chemin des Oliviers, Cagnes-sur-Mer')).toEqual({
      street: '14 chemin des Oliviers',
      postalCode: null,
      commune: 'Cagnes-sur-Mer',
    });
  });

  it('refuse ce qui n’est pas une adresse : numéro puis rue', () => {
    for (const raw of [null, undefined, 42, '', '   ', 'rue des Pins, Antibes', '8 Antibes', '8']) {
      expect(parseManualAddress(raw)).toBeNull();
    }
    expect(parseManualAddress(`8 rue ${'x'.repeat(200)}, Antibes`)).toBeNull();
  });
});

// Mission 103 — le constat de l'audit n°4 : « 14 chemin des Oliviers 06800 » donnait la clé
// « 14 chemin des oliviers », qui ne rejoignait jamais la carte du bien.
describe('une opposition à la main exige une commune reconnue', () => {
  it('sans code postal ni commune : refusée, rien ne serait bloqué', () => {
    expect(decide('14 chemin des Oliviers', [])).toEqual({
      status: 'error',
      error: MANUAL_OPPOSITION_NO_COMMUNE,
    });
  });

  it('avec le code postal seul : la commune est déduite du référentiel', () => {
    expect(decide('14 chemin des Oliviers 06800', [CAGNES])).toEqual({
      status: 'ready',
      key: '14 chemin des oliviers cagnes sur mer',
      display: '14 chemin des Oliviers, Cagnes-sur-Mer',
      verified: true,
      commune: 'Cagnes-sur-Mer',
    });
  });

  it('un code postal à plusieurs communes : le conseiller choisit', () => {
    expect(decide('3 route de Grasse 06530', POSTAL_06530)).toEqual({
      status: 'choose',
      communes: POSTAL_06530,
    });
    // Un code hors de la liste ne choisit rien.
    expect(decide('3 route de Grasse 06530', POSTAL_06530, '06004').status).toBe('choose');
    expect(decide('3 route de Grasse 06530', POSTAL_06530, '06095')).toEqual({
      status: 'ready',
      key: '3 route de grasse peymeinade',
      display: '3 route de Grasse, Peymeinade',
      verified: true,
      commune: 'Peymeinade',
    });
    // La commune tapée choisit d'elle-même.
    expect(decide('3 rte de Grasse, 06530 Le Tignet', POSTAL_06530)).toMatchObject({
      status: 'ready',
      key: '3 route de grasse le tignet',
    });
  });

  it('une commune tapée sans code postal doit être reconnue par le référentiel', () => {
    expect(decide('8 avenue Hochet, Antibes', [ANTIBES])).toMatchObject({
      status: 'ready',
      key: '8 avenue hochet antibes',
    });
    expect(decide('8 avenue Hochet, Antibs', [ANTIBES])).toEqual({
      status: 'error',
      error: MANUAL_OPPOSITION_UNKNOWN_COMMUNE,
    });
  });

  it('ville et code postal en désaccord, ou code postal inconnu : on ne devine pas', () => {
    expect(decide('8 avenue Hochet, 06800 Antibes', [CAGNES])).toEqual({
      status: 'error',
      error: MANUAL_OPPOSITION_MISMATCH,
    });
    expect(decide('8 avenue Hochet 99999', [])).toEqual({
      status: 'error',
      error: MANUAL_OPPOSITION_UNKNOWN_POSTAL_CODE,
    });
  });

  it('le nom d’usage d’une commune se cherche sous son nom officiel (M86)', () => {
    expect(manualCommuneLookupName('Juan-les-Pins')).toBe('antibes');
    expect(manualCommuneLookupName('St Laurent du Var')).toBe('saint laurent du var');
    expect(manualCommuneLookupName('Paris 15ème')).toBe('paris');
  });

  it('Paris, Lyon, Marseille : l’arrondissement est exigé, lu dans le code postal ou le nom', () => {
    expect(decide('12 rue Lecourbe 75015', [PARIS])).toEqual({
      status: 'ready',
      key: '12 rue lecourbe paris 15',
      display: '12 rue Lecourbe, Paris 15e',
      verified: true,
      commune: 'Paris 15e',
    });
    expect(decide('12 rue Lecourbe, Paris 15ème', [PARIS])).toMatchObject({
      key: '12 rue lecourbe paris 15',
    });
    expect(decide('12 rue Lecourbe, Paris', [PARIS])).toEqual({
      status: 'error',
      error: MANUAL_OPPOSITION_ARRONDISSEMENT,
    });
  });
});

describe('la même adresse, à la main et sur une carte, donne la même clé', () => {
  const cases: [string, ManualCommune[], string][] = [
    // [adresse tapée à la main, réponse du référentiel, adresse de la carte]
    ['14 chemin des Oliviers 06800', [CAGNES], '14 ch des Oliviers, 06800 Cagnes-sur-Mer'],
    ['14 ch. des Oliviers, Cagnes sur Mer', [CAGNES], '14 chemin des Oliviers, Cagnes-sur-Mer'],
    // Alias (M86) : Cros-de-Cagnes est Cagnes-sur-Mer, Juan-les-Pins est Antibes.
    ['14 chemin des Oliviers, Cros-de-Cagnes', [CAGNES], '14 chemin des Oliviers, Cagnes-sur-Mer'],
    ['14 chemin des Oliviers 06800', [CAGNES], '14 chemin des Oliviers, 06800 Cros-de-Cagnes'],
    ['8 bis av. Hochet · 2e étage, 06160 Juan-les-Pins', [ANTIBES], '8 avenue Hochet, Antibes'],
    ['8 avenue Hochet 06160', [ANTIBES], '8 av Hochet, 06160 Juan-les-Pins'],
    // Arrondissements (M99).
    ['12 rue Lecourbe 75015', [PARIS], '12 rue Lecourbe, 75015 Paris'],
    ['12 rue Lecourbe, 75015 Paris', [PARIS], '12 rue Lecourbe, Paris 15e Arrondissement'],
  ];

  it.each(cases)('« %s »', (typed, communes, cardAddress) => {
    const decision = decide(typed, communes);
    expect(decision.status).toBe('ready');
    if (decision.status !== 'ready') return;
    expect(decision.key).toBe(addressKey(cardAddress));
    // Et la clé, relue telle que la base la garde, ne bouge pas.
    expect(addressKey(decision.key)).toBe(decision.key);
  });

  it('l’adresse inscrite est bloquée partout, quelle que soit son écriture sur une carte', () => {
    const decision = decide('14 chemin des Oliviers 06800', [CAGNES]);
    const list = buildOppositions([
      {
        address_key: decision.status === 'ready' ? decision.key : null,
        listing_key: null,
        requested_at: '2026-10-12T08:00:00.000Z',
      },
    ]);
    expect(
      opposedOn({ address: '14 ch des Oliviers · 1er étage, 06800 Cagnes-sur-Mer' }, list),
    ).toBe('2026-10-12T08:00:00.000Z');
    expect(opposedOn({ address: '16 chemin des Oliviers, 06800 Cagnes-sur-Mer' }, list)).toBeNull();
  });
});

// Mission 104 — le service des communes ne répond pas, même au second essai.
describe('service des communes indisponible', () => {
  const fallback = (raw: string) => {
    const parts = parseManualAddress(raw);
    if (!parts) throw new Error(`adresse non lue : ${raw}`);
    return unverifiedManualOpposition(parts);
  };

  it('code postal seul : il faut taper la commune', () => {
    expect(fallback('14 chemin des Oliviers 06800')).toEqual({
      status: 'error',
      error: MANUAL_OPPOSITION_UNAVAILABLE,
    });
    expect(MANUAL_OPPOSITION_UNAVAILABLE).toBe(
      'Service des communes indisponible : tapez le nom de la commune.',
    );
  });

  it('commune tapée : la même clé que la carte, alias et arrondissement compris, non vérifiée', () => {
    const cases: [string, string][] = [
      ['14 chemin des Oliviers, 06800 Cagnes-sur-Mer', '14 ch des Oliviers, 06800 Cagnes-sur-Mer'],
      ['14 chemin des Oliviers, Cros-de-Cagnes', '14 chemin des Oliviers, Cagnes-sur-Mer'],
      ['8 avenue Hochet, Juan-les-Pins', '8 av Hochet, 06160 Antibes'],
      ['12 rue Lecourbe, 75015 Paris', '12 rue Lecourbe, Paris 15e Arrondissement'],
    ];
    for (const [typed, card] of cases) {
      const decision = fallback(typed);
      expect(decision).toMatchObject({ status: 'ready', verified: false });
      expect(decision.status === 'ready' && decision.key).toBe(addressKey(card));
    }
  });

  it('Paris sans arrondissement ne se devine pas', () => {
    expect(fallback('12 rue Lecourbe, Paris').status).toBe('error');
  });
});
