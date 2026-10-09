import { describe, expect, it } from 'vitest';

import {
  isSearchResultsTitle,
  mentionsExclusivity,
} from '@/features/comparable-import/utils/mentions-exclusivity';

describe('mentionsExclusivity', () => {
  it.each([
    'Exclusivité',
    'exclusivité',
    'Exclusivite',
    'EXCLUSIVITE',
    'EXCLUSIVITÉ',
    'en exclusivité',
    'mandat exclusif',
    'MANDAT EXCLUSIF',
    'Exclusivite - Grasse Quartier Sainte-Anne - Maison De Hameau Pleine De Charme',
    'EXCLUSIVITE - GRASSE QUARTIER SAINTE-ANNE -Très rare opportunité',
    'EXCLUSIVITE Idéalement situé dans le très recherché quartier des Bouches du Loup',
    'Exclusivité. Napoléon III, bel appartement',
    'Laforêt Immobilier vous présente en exclusivité cette belle maison',
    'En exclusivité, située au sein d’un domaine privé',
    'Mandat en exclusivité',
    'Bien proposé sous mandat exclusif.',
    'EXCLUSIF - Nice Nord, 3 pièces traversant',
    'Exclusif ! Rare sur le secteur',
    'Bureaux à rénover, face au square. Exclusivité!',
  ])('oui : %s', (text) => {
    expect(mentionsExclusivity(text)).toBe(true);
  });

  it.each([
    'Résidence exclusivement réservée aux seniors',
    'EXCLUSIVEMENT POUR INVESTISSEUR',
    'Hôtel particulier à vendre',
    'Dans un quartier exclusif de la Côte d’Azur',
    'Jardin à jouissance exclusive',
    'Une vue exclusive sur la baie',
    'Usage exclusif de la terrasse.',
    'Mandat simple, sans exclusivité',
    'Ce bien n’est pas en exclusivité',
    'Bien proposé sans mandat exclusif',
    'Appartement 3 pièces avec balcon',
    '',
  ])('non : %s', (text) => {
    expect(mentionsExclusivity(text)).toBe(false);
  });

  it('absent', () => {
    expect(mentionsExclusivity(null)).toBe(false);
    expect(mentionsExclusivity(undefined)).toBe(false);
  });
});

describe('isSearchResultsTitle', () => {
  it.each([
    'Achat immobilier Nice : 1 573 maisons à vendre en exclusivité',
    '8057 annonces Immobilier à vendre Nice 06000, Seloger.com',
    '2734 Appartements à Vendre à Nice (06000)',
  ])('page de résultats : %s', (title) => {
    expect(isSearchResultsTitle(title)).toBe(true);
  });

  it.each([
    'Appartement à vendre T3/F3 60 m² 247000 € Cessole Nice (06100)',
    'Vente appartement 3 pièces 65 m² à Nice (06000), 450 000 €',
    'vente maison/villa 6 pièces 207 m² Nice',
    'Appartement de prestige, face à la mer',
  ])('annonce : %s', (title) => {
    expect(isSearchResultsTitle(title)).toBe(false);
  });
});
