import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import {
  buildProspectingRows,
  isProspectingOpen,
} from '@/features/competitor-locator/services/build-prospecting-rows';

const NOW = new Date('2026-10-09T08:00:00Z');
const URL = 'https://www.bienici.com/annonce/apimo-87251688';

describe('isProspectingOpen', () => {
  it('seulement pour un dossier conclu « mandat signé »', () => {
    expect(isProspectingOpen('meeting_completed', 'signed')).toBe(true);
    expect(isProspectingOpen('meeting_completed', 'follow_up')).toBe(false);
    expect(isProspectingOpen('meeting_completed', null)).toBe(false);
    expect(isProspectingOpen('ready_for_meeting', 'signed')).toBe(false);
  });
});

describe('buildProspectingRows — la liste de tournée', () => {
  it('une ligne complète : adresse, étiquette, annonce, ancienneté, baisse', () => {
    const [row] = buildProspectingRows(
      [
        makeComparable({
          id: 'c1',
          title: 'Appartement 4 pièces',
          listing_url: URL,
          price: 335000,
          surface_area: 73,
          rooms_count: 4,
          listing_published_at: '2026-09-09T00:00:00Z',
          locator_address: '12 avenue des Mimosas 06800 Cagnes-sur-Mer',
          locator_label: 'Adresse confirmée',
          locator_confirmed: true,
        }),
      ],
      [
        {
          portal: 'bienici',
          listingKey: 'apimo-87251688',
          observedOn: '2026-09-10',
          price: 349000,
          boundLabel: null,
        },
        {
          portal: 'bienici',
          listingKey: 'apimo-87251688',
          observedOn: '2026-10-01',
          price: 335000,
          boundLabel: null,
        },
      ],
      NOW,
    );
    expect(row).toMatchObject({
      id: 'c1',
      title: 'Appartement 4 pièces',
      address: '12 avenue des Mimosas 06800 Cagnes-sur-Mer',
      label: 'Adresse confirmée',
      confirmed: true,
      price: 335000,
      surfaceArea: 73,
      roomsCount: 4,
    });
    expect(row.onlineSince).toBe(
      'En ligne depuis le 9 septembre 2026 · 30 jours — d’après Bien’ici',
    );
    expect(row.priceDrop).toContain('Baisse constatée par ACM');
    expect(row.priceDrop).toContain('10 septembre 2026');
    expect(row.priceDrop).toContain('1 octobre 2026');
  });

  it('sans adresse du Localisateur : la ligne reste, l’adresse est absente', () => {
    const [row] = buildProspectingRows(
      [makeComparable({ listing_url: URL, locator_label: 'À vérifier · 3 pistes' })],
      [],
      NOW,
    );
    expect(row).toMatchObject({
      address: null,
      label: 'À vérifier · 3 pistes',
      confirmed: false,
      onlineSince: null,
      priceDrop: null,
    });
  });

  it('une borne basse reste un texte ; une première observation dit « vue par ACM »', () => {
    const [bound, seen] = buildProspectingRows(
      [
        makeComparable({ id: 'a', listing_url: URL }),
        makeComparable({ id: 'b', listing_url: 'https://www.bienici.com/annonce/autre-123' }),
      ],
      [
        {
          portal: 'bienici',
          listingKey: 'apimo-87251688',
          observedOn: '2026-10-01',
          price: 300000,
          boundLabel: 'plus de 2 mois',
        },
        {
          portal: 'bienici',
          listingKey: 'autre-123',
          observedOn: '2026-10-04',
          price: 300000,
          boundLabel: null,
        },
      ],
      NOW,
    );
    expect(bound.onlineSince).toBe('En ligne depuis plus de 2 mois (Bien’ici)');
    expect(seen.onlineSince).toBe('Vue par ACM depuis 5 jours');
  });

  it('la baisse validée par le conseiller passe avant le constat ; une hausse n’est pas une baisse', () => {
    const [validated, rise] = buildProspectingRows(
      [
        makeComparable({
          id: 'a',
          listing_url: URL,
          price_drop_amount: 20000,
          price_drop_percentage: 4.9,
        }),
        makeComparable({ id: 'b', listing_url: 'https://www.bienici.com/annonce/autre-123' }),
      ],
      [
        {
          portal: 'bienici',
          listingKey: 'autre-123',
          observedOn: '2026-09-01',
          price: 300000,
          boundLabel: null,
        },
        {
          portal: 'bienici',
          listingKey: 'autre-123',
          observedOn: '2026-10-01',
          price: 310000,
          boundLabel: null,
        },
      ],
      NOW,
    );
    expect(validated.priceDrop).toMatch(/^Baisse de 20\s000\s€ \(−4,9\s%\)$/);
    expect(rise.priceDrop).toBeNull();
  });

  it('les concurrents écartés ne sont pas à prospecter', () => {
    expect(
      buildProspectingRows([makeComparable({ is_selected: false, listing_url: URL })], [], NOW),
    ).toEqual([]);
  });
});
