import { describe, expect, it } from 'vitest';

import { parseLocatorProperty } from '@/features/competitor-locator/schemas/locator-property';

// Les formes exactes livrées par le Localisateur 3.1.1-acm1 (lib/acm.js, reponseBiens).
const EMPTY = {
  etiquette: null,
  etiquetteCle: null,
  adresse: '',
  source: null,
  confirme: false,
  bienId: null,
  lat: null,
  lon: null,
  analyseLe: null,
};

describe('parseLocatorProperty — la réponse du Localisateur est une donnée', () => {
  it('« inconnu » : rien d’autre que l’état', () => {
    expect(parseLocatorProperty({ ...EMPTY, etat: 'inconnu', libelle: null })).toEqual({
      state: 'inconnu',
      label: null,
      labelKey: null,
      address: null,
      source: null,
      confirmed: false,
      propertyId: null,
      latitude: null,
      longitude: null,
      analyzedAt: null,
    });
  });

  it('« pret » confirmé par le Localisateur : adresse retenue', () => {
    const location = parseLocatorProperty({
      etat: 'pret',
      etiquette: 'Adresse confirmée',
      etiquetteCle: 'confirmee',
      adresse: '12 avenue des Mimosas 06800 Cagnes-sur-Mer',
      source: 'dpe',
      confirme: false,
      bienId: 'b-42',
      lat: 43.66,
      lon: 7.15,
      libelle: 'Adresse confirmée',
      analyseLe: '2026-10-08T09:30:00.000Z',
    });
    expect(location).toMatchObject({
      state: 'pret',
      label: 'Adresse confirmée',
      labelKey: 'confirmee',
      address: '12 avenue des Mimosas 06800 Cagnes-sur-Mer',
      source: 'dpe',
      confirmed: true,
      propertyId: 'b-42',
      latitude: 43.66,
      longitude: 7.15,
      analyzedAt: '2026-10-08T09:30:00.000Z',
    });
  });

  it('confirmé par le conseiller (`confirme`) : retenu, quelle que soit l’étiquette', () => {
    const location = parseLocatorProperty({
      ...EMPTY,
      etat: 'pret',
      etiquette: 'Confirmée par vous',
      etiquetteCle: 'vous',
      adresse: '3 rue du Port',
      source: 'vous',
      confirme: true,
    });
    expect(location?.confirmed).toBe(true);
  });

  it('« Confirmée par vous · maison à préciser » : pas d’adresse unique, donc pas retenue', () => {
    const location = parseLocatorProperty({
      ...EMPTY,
      etat: 'pret',
      etiquette: 'Confirmée par vous · maison à préciser',
      etiquetteCle: 'vous',
      confirme: true,
    });
    expect(location).toMatchObject({ address: null, confirmed: false });
  });

  it('ne lit JAMAIS le texte de l’étiquette pour décider', () => {
    const location = parseLocatorProperty({
      ...EMPTY,
      etat: 'pret',
      etiquette: 'Adresse confirmée',
      etiquetteCle: 'pistes',
      adresse: '3 rue du Port',
    });
    expect(location?.confirmed).toBe(false);
  });

  it('pistes : étiquette affichable, aucune adresse, non confirmé', () => {
    const location = parseLocatorProperty({
      ...EMPTY,
      etat: 'pret',
      etiquette: 'À vérifier · 3 pistes',
      etiquetteCle: 'pistes',
    });
    expect(location).toMatchObject({
      label: 'À vérifier · 3 pistes',
      labelKey: 'pistes',
      address: null,
      confirmed: false,
    });
  });

  it('un état inconnu d’ACM rejette l’entrée', () => {
    expect(parseLocatorProperty({ ...EMPTY, etat: 'certain' })).toBeNull();
    expect(parseLocatorProperty(null)).toBeNull();
    expect(parseLocatorProperty('pret')).toBeNull();
  });

  it('une clé ou une source hors liste reste vide, jamais devinée', () => {
    const location = parseLocatorProperty({
      ...EMPTY,
      etat: 'pret',
      etiquetteCle: 'presque',
      source: 'autre',
      adresse: '3 rue du Port',
    });
    expect(location).toMatchObject({ labelKey: null, source: null, confirmed: false });
  });

  it('coordonnées impossibles et date illisible restent vides', () => {
    const location = parseLocatorProperty({
      ...EMPTY,
      etat: 'pret',
      lat: 143,
      lon: 'sept',
      analyseLe: 'hier',
      bienId: 17,
    });
    expect(location).toMatchObject({
      latitude: null,
      longitude: null,
      analyzedAt: null,
      propertyId: '17',
    });
  });
});
