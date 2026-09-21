import { describe, expect, it } from 'vitest';

import {
  DEMO_AT,
  demoAnsweredResponses,
  demoAnsweredSummary,
  demoComparables,
  demoProject,
  demoProperty,
  demoSavedPositioning,
} from '@/app/design-preview/demo-data';
import {
  authorizeAdvisorRange,
  authorizeComparableReveal,
  isComparableAuthorized,
  projectComparableForSeller,
  projectLiveForSeller,
} from '@/features/live-seller/services/project-live-for-seller';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';

// On part de la SORTIE RÉELLE du builder de production, jamais d'un objet fabriqué à la
// main : un test qui ne reproduit pas ce que la production fabrique valide un monde qui
// n'existe pas.
function buildLive(answered: boolean) {
  const presentation = buildSellerPresentation({
    project: demoProject,
    property: demoProperty,
    diagnostics: null,
    condominium: null,
    comparables: demoComparables,
    savedPositioning: demoSavedPositioning,
    sellerResponses: answered ? demoAnsweredResponses : [],
    sellerSummary: answered ? demoAnsweredSummary : null,
    generatedAt: DEMO_AT,
    propertyPhotoUrls: [],
  });
  if (!presentation.live) throw new Error('fixture sans live');
  return presentation.live;
}

// Le manifeste neutre : EXACTEMENT ces champs voyagent avant autorisation. Toute
// addition future au modèle concurrent qui se glisserait dans la projection fait
// tomber ce test — au lieu d'attendre qu'un vendeur voie le prix.
const NEUTRAL_KEYS = [
  'authorized',
  'id',
  'position',
  'neutralLabel',
  'city',
  'district',
  'propertyType',
  'surfaceArea',
  'roomsCount',
  'bedroomsCount',
  'energyRating',
  'gesRating',
  'photoUrls',
  'featureComparison',
  'response',
].sort();

const AMOUNT_KEYS = ['price', 'pricePerSquareMeter', 'title', 'listingUrl', 'priceReveal'];

describe('projectComparableForSeller — liste d’autorisation (§2.2)', () => {
  it('un concurrent SANS estimation persistée : exactement le manifeste neutre, aucun montant', () => {
    const fresh = buildLive(false);
    const entry = fresh.comparables[0];
    expect(isComparableAuthorized(entry)).toBe(false);

    const projected = projectComparableForSeller(entry);
    // La règle, pas le résultat : égalité d'ensembles de champs.
    expect(Object.keys(projected).sort()).toEqual(NEUTRAL_KEYS);
    for (const key of AMOUNT_KEYS) {
      expect(projected).not.toHaveProperty(key);
    }
    // Et le prix réel n'apparaît nulle part dans la charge sérialisée du concurrent.
    expect(JSON.stringify(projected)).not.toContain(String(entry.price));
    // Le libellé est composé, jamais le titre rogné : il ne porte pas le prix.
    expect(projected.neutralLabel).not.toContain(String(entry.price));
  });

  it('un concurrent AVEC estimation persistée : le prix et la révélation sont livrés', () => {
    const answered = buildLive(true);
    const authorized = answered.comparables.find(isComparableAuthorized);
    expect(
      authorized,
      'la fixture answered doit avoir au moins un concurrent autorisé',
    ).toBeTruthy();

    const projected = projectComparableForSeller(authorized!);
    expect(projected.authorized).toBe(true);
    if (projected.authorized) {
      expect(projected.price).toBe(authorized!.price);
      expect(projected.priceReveal).toBeDefined();
    }
  });

  it('AUTORISATION PAR CONCURRENT, pas par séance : le prix du 1 voyage, celui du 2 non', () => {
    // Concurrent autorisé (estimation persistée) et concurrent neutre (aucune) dans la
    // même séance : la projection distingue les deux — c'est ce qui sépare la règle
    // d'un simple verrou de séance.
    const answered = buildLive(true);
    const fresh = buildLive(false);
    const persisted = answered.comparables.find(isComparableAuthorized);
    const notPersisted = fresh.comparables[0];
    expect(persisted).toBeTruthy();

    const pPersisted = projectComparableForSeller(persisted!);
    const pNeutral = projectComparableForSeller(notPersisted);

    expect(pPersisted.authorized).toBe(true);
    expect(pNeutral.authorized).toBe(false);
    // Le prix du concurrent non autorisé est absent de sa charge…
    expect(JSON.stringify(pNeutral)).not.toContain(String(notPersisted.price));
    // …tandis que celui du concurrent autorisé y est.
    expect(JSON.stringify(pPersisted)).toContain(String(persisted!.price));
  });
});

describe('livraison — fourchette conseiller absente de la charge initiale (§ règle produit)', () => {
  it('projectLiveForSeller ne porte NI competitiveMarketCentral NI priceGaps NI advisorDecision', () => {
    const live = buildLive(true);
    // La fourchette existe bien dans la donnée serveur…
    expect(live.competitiveMarketCentral).not.toBeNull();
    const projected = projectLiveForSeller(live);
    // …mais la charge remise au shell ne l'a pas.
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain(String(live.competitiveMarketCentral));
    if (live.advisorDecision) {
      expect(serialized).not.toContain(String(live.advisorDecision.advisorPrice));
    }
    expect(projected).not.toHaveProperty('competitiveMarketCentral');
    expect(projected).not.toHaveProperty('priceGaps');
    expect(projected).not.toHaveProperty('advisorDecision');
  });

  it('la voie de livraison RE-VÉRIFIE : révélation refusée sans estimation persistée', () => {
    const fresh = buildLive(false);
    const id = fresh.comparables[0].id;
    // Un client qui demande la révélation d'un concurrent non estimé n'obtient rien.
    expect(authorizeComparableReveal(fresh, id)).toBeNull();

    const answered = buildLive(true);
    const authorizedId = answered.comparables.find(isComparableAuthorized)!.id;
    const delivered = authorizeComparableReveal(answered, authorizedId);
    expect(delivered?.authorized).toBe(true);
    expect(delivered?.price).toBeTypeOf('number');
  });

  it('la fourchette se livre par la même voie, MAIS seulement après la valeur perçue', () => {
    // Sans valeur perçue persistée : refusée (comme la révélation sans estimation).
    const fresh = buildLive(false);
    expect(fresh.sellerSummary?.seller_perceived_property_price ?? null).toBeNull();
    expect(authorizeAdvisorRange(fresh)).toBeNull();

    // Une fois la valeur perçue persistée : livrée.
    const answered = buildLive(true);
    expect(answered.sellerSummary?.seller_perceived_property_price).not.toBeNull();
    const range = authorizeAdvisorRange(answered);
    expect(range?.competitiveMarketCentral).toBe(answered.competitiveMarketCentral);
    expect(range?.advisorDecision).toBe(answered.advisorDecision);
  });
});
