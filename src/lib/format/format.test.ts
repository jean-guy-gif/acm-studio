import { describe, expect, it } from 'vitest';

import {
  formatDay,
  formatEuro,
  formatEuroPerSquareMeter,
  formatNumber,
  formatPercent,
  formatSquareMeters,
} from '@/lib/format';

// Intl sépare les milliers par une espace fine insécable et l'unité suit une espace insécable :
// on compare sur des espaces simples.
const plain = (value: string): string => value.replace(/[  ]/g, ' ');

describe('formatNumber', () => {
  it('n’affiche jamais un nombre brut', () => {
    expect(formatNumber(-1.7000000000000028)).toBe('−1,7');
    expect(formatNumber(0.1 + 0.2)).toBe('0,3');
  });

  it('garde 2 décimales au plus, sans zéro inutile', () => {
    expect(formatNumber(64.7)).toBe('64,7');
    expect(formatNumber(64.756)).toBe('64,76');
    expect(formatNumber(64)).toBe('64');
    expect(formatNumber(64.1, { maxDecimals: 5 })).toBe('64,1');
    expect(formatNumber(1.23456, { maxDecimals: 5 })).toBe('1,23');
  });

  it('sépare les milliers', () => {
    expect(plain(formatNumber(300000))).toBe('300 000');
  });

  it('signe un écart, jamais un zéro', () => {
    expect(formatNumber(2.5, { signed: true })).toBe('+2,5');
    expect(formatNumber(-2.5, { signed: true })).toBe('−2,5');
    expect(formatNumber(0, { signed: true })).toBe('0');
    expect(formatNumber(-0.001)).toBe('0');
  });

  it('rend un tiret pour une valeur qui n’est pas un nombre', () => {
    expect(formatNumber(Number.NaN)).toBe('—');
    expect(formatEuro(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('unités', () => {
  it('suit les exemples de la mission 74', () => {
    expect(plain(formatSquareMeters(64.7))).toBe('65 m²');
    expect(plain(formatSquareMeters(-1.7000000000000028))).toBe('−2 m²');
    expect(plain(formatEuroPerSquareMeter(4739.2))).toBe('4 739 €/m²');
    expect(plain(formatEuro(300000))).toBe('300 000 €');
  });

  it('arrondit un montant à l’euro, sauf demande contraire', () => {
    expect(plain(formatEuro(299999.6))).toBe('300 000 €');
    expect(plain(formatEuro(0.2, { minDecimals: 2, maxDecimals: 2 }))).toBe('0,20 €');
    expect(plain(formatEuro(-5000, { signed: true }))).toBe('−5 000 €');
  });

  it('formate un pourcentage', () => {
    expect(plain(formatPercent(12.345))).toBe('12,35 %');
    expect(plain(formatPercent(4.2, { signed: true }))).toBe('+4,2 %');
  });

  it('ne laisse pas l’unité partir à la ligne', () => {
    expect(formatEuro(1)).toBe('1 €');
  });
});

// Mission 140 — ce que voit le client suit sa langue ; sans langue, le français ne bouge pas.
describe('les nombres dans la langue du client', () => {
  it('en anglais : l’euro devant, la virgule des milliers, le point décimal', () => {
    expect(formatEuro(1_639_500, { language: 'en' })).toBe('€1,639,500');
    expect(formatEuro(-5_000, { language: 'en', signed: true })).toBe('−€5,000');
    expect(formatEuro(5_000, { language: 'en', signed: true })).toBe('+€5,000');
    expect(formatEuroPerSquareMeter(4_739, { language: 'en' })).toBe('€4,739/m²');
    expect(formatPercent(5.8, { language: 'en' })).toBe('5.8%');
    // Les surfaces restent en m² (la fiche de la mission).
    expect(formatSquareMeters(140, { language: 'en' }).replace(/\s/g, ' ')).toBe('140 m²');
  });

  it('en français, à l’octet près, avec ou sans la langue', () => {
    expect(formatEuro(1_639_500, { language: 'fr' })).toBe(formatEuro(1_639_500));
    expect(formatPercent(5.8, { language: 'fr' })).toBe(formatPercent(5.8));
  });

  it('les jours, à Paris', () => {
    expect(formatDay('2026-11-05T23:30:00Z', 'fr')).toBe('6 novembre 2026');
    expect(formatDay('2026-11-05T23:30:00Z', 'en')).toBe('6 November 2026');
    expect(formatDay('2026-11-06T10:00:00Z', 'en', 'dayMonth')).toBe('6 November');
    expect(formatDay('2026-11-06T10:00:00Z', 'en', 'numeric')).toBe('06/11/2026');
  });
});
