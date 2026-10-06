import { describe, expect, it } from 'vitest';

import {
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
    expect(plain(formatSquareMeters(64.7))).toBe('64,7 m²');
    expect(plain(formatSquareMeters(-1.7000000000000028))).toBe('−1,7 m²');
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
