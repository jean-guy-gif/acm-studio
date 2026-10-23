import { describe, expect, it } from 'vitest';

import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import { parseLocatorProperty } from '@/features/competitor-locator/schemas/locator-property';
import {
  isImportableUrl,
  parseStreamEstateResponse,
} from '@/features/competitor-search/services/stream-estate';
import { DEMO_COMMUNES } from '@/features/demo/data/communes';
import { DEMO_LISTINGS, DEMO_SCENARIOS, demoScenario } from '@/features/demo/data/scenarios';
import { DEMO_LISTING_HOST } from '@/features/demo/constants';
import { demoGeo } from '@/features/demo/services/demo-geo';
import {
  demoImportedData,
  demoLocatorEntry,
  demoSubjectImportedData,
} from '@/features/demo/services/demo-listing-data';
import { demoStreamEstatePage } from '@/features/demo/services/demo-stream-estate';
import {
  demoListingUrl,
  demoPhotoFile,
  demoPhotoUrl,
  demoSubjectListingUrl,
  findDemoListing,
  findDemoSubjectScenario,
  isDemoListingUrl,
} from '@/features/demo/services/demo-urls';

// Mission 114 (A2.6) — les données simulées passent par les MÊMES chemins que les vraies : ce
// test les fait relire par les schémas et services de l'outil, sans rien recopier.

const NOW = new Date('2026-10-23T12:00:00.000Z');
const noWait = () => Promise.resolve();

describe('les adresses de la démonstration', () => {
  it('une annonce se retrouve par son adresse, et seulement sur l’hôte réservé', () => {
    for (const listing of DEMO_LISTINGS) {
      const url = demoListingUrl(listing);
      expect(isDemoListingUrl(url)).toBe(true);
      expect(findDemoListing(url)).toBe(listing);
      expect(isImportableUrl(url)).toBe(true);
    }
    expect(findDemoListing(`https://${DEMO_LISTING_HOST}/antibes/inconnu`)).toBeNull();
    expect(findDemoListing('https://www.seloger.com/annonces/ant-01')).toBeNull();
    expect(isDemoListingUrl('https://www.seloger.com/annonces/ant-01')).toBe(false);
    expect(isDemoListingUrl('pas une adresse')).toBe(false);
  });

  it('l’annonce du bien vendeur d’un scénario se reconnaît, pas celle d’un concurrent', () => {
    for (const scenario of DEMO_SCENARIOS) {
      expect(findDemoSubjectScenario(demoSubjectListingUrl(scenario.id))).toBe(scenario);
    }
    expect(findDemoSubjectScenario(demoListingUrl(DEMO_LISTINGS[0]))).toBeNull();
    expect(findDemoSubjectScenario(`https://${DEMO_LISTING_HOST}/bien-vendeur/paris`)).toBeNull();
  });

  it('une photo de démonstration a une forme stricte : aucun chemin ne remonte', () => {
    expect(demoPhotoFile(demoPhotoUrl('appartement-01.jpg'))).toBe('appartement-01.jpg');
    expect(demoPhotoFile(demoPhotoUrl('../../.env'))).toBeNull();
    expect(demoPhotoFile(demoPhotoUrl('appartement-01.png'))).toBeNull();
    expect(demoPhotoFile('https://autre-hote.example/demo/photos/appartement-01.jpg')).toBeNull();
    expect(demoPhotoFile('pas une adresse')).toBeNull();
  });
});

describe('la géographie simulée', () => {
  it('reconnaît les communes de la démo par la règle des agences réelles', async () => {
    const antibes = await demoGeo.resolveCommune('Antibes', '06600');
    expect(antibes.ok && antibes.code).toBe('06004');
    const juan = await demoGeo.resolveCommune('Antibes', '06160');
    expect(juan.ok && juan.code).toBe('06004');
    const vence = await demoGeo.resolveCommune('Vence', null);
    expect(vence.ok && vence.code).toBe('06157');
    expect((await demoGeo.resolveCommune('Paris', '75015')).ok).toBe(false);
    // Ville et code postal en désaccord : on ne devine pas (M99).
    expect((await demoGeo.resolveCommune('Antibes', '06250')).ok).toBe(false);
  });

  it('géocode les seules adresses fictives du jeu de données, dans leur commune', async () => {
    const { subject } = demoScenario('antibes');
    const found = await demoGeo.geocodeSubject(
      `${subject.address.number} ${subject.address.street}`,
      '06600',
      'Antibes',
    );
    expect(found.ok && found.point).toEqual(subject.location);
    const elsewhere = await demoGeo.geocodeSubject(
      `${subject.address.number} ${subject.address.street}`,
      '06140',
      'Vence',
    );
    expect(elsewhere.ok).toBe(false);
    const unknown = await demoGeo.geocodeSubject('1 avenue Inconnue', '06600', 'Antibes');
    expect(unknown.ok).toBe(false);
    expect((await demoGeo.geocodeSubject(null, '06600', 'Antibes')).ok).toBe(false);
  });

  it('sert la table locale des communes, et rien hors du département', async () => {
    expect(await demoGeo.fetchDepartmentCommunes('06')).toHaveLength(DEMO_COMMUNES.length);
    expect(await demoGeo.fetchDepartmentCommunes('75')).toEqual([]);
    const byPostal = await demoGeo.fetchCommunes({ postalCode: '06140' });
    expect(byPostal?.map((commune) => commune.nom).sort()).toEqual([
      'Tourrettes-sur-Loup',
      'Vence',
    ]);
    const byName = await demoGeo.fetchCommunes({ name: 'mougins' });
    expect(byName?.map((commune) => commune.code)).toEqual(['06085']);
  });
});

describe('Stream Estate simulé', () => {
  const antibes = demoScenario('antibes');
  const page = demoStreamEstatePage({ listings: antibes.listings, now: NOW, wait: noWait });

  it('répond dans la forme de l’API, relue par le schéma de l’outil, sur l’hôte réservé', async () => {
    const params = new URLSearchParams();
    params.append('propertyTypes[]', '0');
    params.append('includedInseeCodes[]', '06004');
    params.set('roomMin', '3');
    params.set('roomMax', '3');
    params.set('surfaceMin', '61');
    params.set('surfaceMax', '75');
    params.set('budgetMin', '380000');
    params.set('budgetMax', '430000');
    params.set('itemsPerPage', '20');
    params.set('page', '1');
    const response = await page(params);
    expect(response.ok).toBe(true);
    const parsed = parseStreamEstateResponse(response.ok ? response.json : null, NOW);
    expect(parsed).not.toBeNull();
    expect(parsed!.candidates.length).toBeGreaterThan(0);
    for (const candidate of parsed!.candidates) {
      expect(new URL(candidate.url).hostname).toBe(DEMO_LISTING_HOST);
    }
  });

  it('filtre comme l’API : type, commune, pièces, surface, prix, DPE ; pagine', async () => {
    const all = new URLSearchParams();
    all.set('itemsPerPage', '100');
    const everything = await page(all);
    const total = everything.ok
      ? (everything.json as { 'hydra:totalItems': number })['hydra:totalItems']
      : 0;
    expect(total).toBe(antibes.listings.length);

    const houses = new URLSearchParams();
    houses.append('propertyTypes[]', '1');
    const none = await page(houses);
    expect(none.ok && (none.json as { 'hydra:totalItems': number })['hydra:totalItems']).toBe(0);

    const energy = new URLSearchParams();
    energy.append('energyCategories[]', 'C');
    const classC = await page(energy);
    const expectedC = antibes.listings.filter((listing) => listing.energyRating === 'C').length;
    expect(classC.ok && (classC.json as { 'hydra:totalItems': number })['hydra:totalItems']).toBe(
      expectedC,
    );

    const small = new URLSearchParams();
    small.set('itemsPerPage', '5');
    small.set('page', '2');
    const second = await page(small);
    const members = second.ok ? (second.json as { 'hydra:member': unknown[] })['hydra:member'] : [];
    expect(members.length).toBe(Math.min(5, Math.max(0, antibes.listings.length - 5)));
  });
});

describe('ce qu’un bien de démonstration dit, dans les formes de l’outil', () => {
  it('l’annonce lue donne un concurrent entier, prix compris', () => {
    for (const listing of DEMO_LISTINGS) {
      const data = demoImportedData(listing, NOW);
      const input = importedToComparableInput(data);
      expect(input).not.toBeNull();
      expect(input!.price).toBe(listing.price);
      expect(input!.surface_area).toBe(listing.surfaceArea);
      expect(data.listingUrl).toBe(demoListingUrl(listing));
      expect(data.photoUrls.length).toBe(listing.photos.length);
      expect(data.address).toBeNull();
    }
  });

  it('la réponse du Localisateur simulé est une adresse confirmée, relue par le schéma', () => {
    for (const listing of DEMO_LISTINGS) {
      const entry = demoLocatorEntry(listing, NOW);
      const parsed = parseLocatorProperty(entry.raw);
      expect(parsed).not.toBeNull();
      expect(parsed!.confirmed).toBe(true);
      expect(parsed!.address).toContain(listing.address.street);
      expect(parsed!.latitude).toBe(listing.location.lat);
    }
  });

  it('l’annonce du bien vendeur porte son adresse fictive et son prix « pour information »', () => {
    for (const scenario of DEMO_SCENARIOS) {
      const data = demoSubjectImportedData(scenario, NOW);
      expect(data.listingUrl).toBe(demoSubjectListingUrl(scenario.id));
      expect(data.address).toBe(
        `${scenario.subject.address.number} ${scenario.subject.address.street}`,
      );
      expect(data.price).toBe(scenario.subject.listedPrice);
      expect(data.photoUrls.length).toBe(scenario.subject.photos.length);
    }
  });
});
