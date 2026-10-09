import { describe, expect, it } from 'vitest';

import {
  locationAction,
  needsLocatorQuery,
} from '@/features/competitor-locator/services/location-action';
import {
  LOCATOR_POLL_INTERVAL_MS,
  nextPollDelayMs,
} from '@/features/competitor-locator/services/poll-schedule';

const URL = 'https://www.bienici.com/annonce/apimo-87251688';
const row = (state: string | null, confirmed: boolean | null = null, url: string | null = URL) => ({
  listing_url: url,
  locator_state: state,
  locator_confirmed: confirmed,
});

describe('locationAction — ce que la carte propose', () => {
  it('inconnu ou fiche : « Trouver l’adresse »', () => {
    expect(locationAction(row('inconnu'))).toBe('find');
    expect(locationAction(row('fiche'))).toBe('find');
  });

  it('en cours : ACM attend', () => {
    expect(locationAction(row('en-cours'))).toBe('pending');
  });

  it('prêt mais non confirmé : « Localiser moi-même »', () => {
    expect(locationAction(row('pret', false))).toBe('locate');
  });

  it('confirmé : retenu en silence, aucun bouton', () => {
    expect(locationAction(row('pret', true))).toBe('confirmed');
  });

  it('saisie manuelle (sans annonce) ou jamais demandé : rien', () => {
    expect(locationAction(row('pret', false, null))).toBe('none');
    expect(locationAction(row('pret', false, '  '))).toBe('none');
    expect(locationAction(row(null))).toBe('none');
  });
});

describe('needsLocatorQuery', () => {
  it('une adresse confirmée ne se redemande plus', () => {
    expect(needsLocatorQuery(row('pret', true))).toBe(false);
  });

  it('tout le reste se redemande, tant qu’il y a une annonce', () => {
    expect(needsLocatorQuery(row(null))).toBe(true);
    expect(needsLocatorQuery(row('pret', false))).toBe(true);
    expect(needsLocatorQuery(row('en-cours', null, null))).toBe(false);
  });
});

describe('nextPollDelayMs — 10 s pendant 2 min', () => {
  it('rien en cours : on ne redemande pas', () => {
    expect(nextPollDelayMs(false, 0)).toBeNull();
  });

  it('en cours : toutes les 10 s, jusqu’à 2 min', () => {
    expect(nextPollDelayMs(true, 0)).toBe(LOCATOR_POLL_INTERVAL_MS);
    expect(nextPollDelayMs(true, 110_000)).toBe(LOCATOR_POLL_INTERVAL_MS);
    expect(nextPollDelayMs(true, 110_001)).toBeNull();
    expect(nextPollDelayMs(true, 120_000)).toBeNull();
  });
});
