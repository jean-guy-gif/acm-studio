import { describe, expect, it } from 'vitest';

import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import {
  clampInitialLiveIndex,
  maxReachableLiveIndex,
} from '@/features/live-seller/services/max-reachable-live-index';
import type {
  LiveComparableEntry,
  LiveComparativeData,
} from '@/features/seller-presentation/types/seller-presentation';

// La navigation ne lit du concurrent que son id et sa réponse persistée : on construit
// des entrées minimales du MODÈLE DE DOMAINE (pas du contenu scrapé), et on s'appuie sur
// le vrai buildLivePages pour la séquence de production.
function entry(id: string, response: LiveComparableEntry['response']): LiveComparableEntry {
  return { id, response } as unknown as LiveComparableEntry;
}
function live(
  comparables: LiveComparableEntry[],
  sellerSummary: LiveComparativeData['sellerSummary'] = null,
): LiveComparativeData {
  return { comparables, sellerSummary } as unknown as LiveComparativeData;
}

describe('maxReachableLiveIndex / clampInitialLiveIndex — §2.2', () => {
  it('la révélation est INATTEIGNABLE par l’URL tant que l’estimation n’est pas enregistrée', () => {
    // Un concurrent jugé « sérieux », mais aucune estimation encore donnée.
    const data = live([entry('c1', { seller_serious_competitor: 'yes' } as never)]);
    const pages = buildLivePages(data, false);

    const revealIndex = pages.findIndex((p) => p.type === 'comparable_price_reveal');
    const guessIndex = pages.findIndex((p) => p.type === 'comparable_price');
    expect(revealIndex).toBeGreaterThan(0);

    // On BORNE à l'étape de l'estimation (« À quel prix ? », libellé neutre, aucun prix).
    expect(maxReachableLiveIndex(pages, data)).toBe(guessIndex);
    // Ouvrir la révélation par son adresse → ramené à l'estimation, jamais la révélation.
    const opened = clampInitialLiveIndex(revealIndex, pages, data);
    expect(opened).toBe(guessIndex);
    expect(pages[opened].type).not.toBe('comparable_price_reveal');
  });

  it('une fois l’estimation enregistrée, la révélation devient atteignable', () => {
    const data = live([
      entry('c1', {
        seller_serious_competitor: 'yes',
        seller_estimated_listing_price: 350000,
      } as never),
    ]);
    const pages = buildLivePages(data, false);
    const revealIndex = pages.findIndex((p) => p.type === 'comparable_price_reveal');
    expect(clampInitialLiveIndex(revealIndex, pages, data)).toBe(revealIndex);
  });

  it('index 0 (introduction) toujours autorisé, valeur négative ramenée à 0', () => {
    const pages = buildLivePages(live([]), false);
    expect(clampInitialLiveIndex(0, pages, live([]))).toBe(0);
    expect(clampInitialLiveIndex(-3, pages, live([]))).toBe(0);
  });
});
