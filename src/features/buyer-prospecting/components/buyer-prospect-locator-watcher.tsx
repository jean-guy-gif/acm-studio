'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import {
  loadBuyerProspectsToLocate,
  locateDemoBuyerProspects,
  saveBuyerProspectLocations,
} from '@/features/buyer-prospecting/actions/buyer-prospect-locations';
import {
  LOCATOR_MAX_URLS,
  fetchLocatorProperties,
  pingLocator,
} from '@/features/competitor-locator/client';
import { createLocationWatch } from '@/features/competitor-locator/services/location-watch';
import { syncCompetitorLocations } from '@/features/competitor-locator/services/sync-competitor-locations';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';

// Mission 120 — sur Prospection, ACM redemande au Localisateur les adresses des biens démarchés
// depuis une recherche acquéreur, comme pour les concurrents d'un mandat (M75) : une passe à
// l'ouverture, une à chaque retour sur l'onglet. En démonstration, le Localisateur simulé (M114).
// N'affiche rien : l'avis discret du Localisateur est déjà celui des concurrents.
export function BuyerProspectLocatorWatcher() {
  const router = useRouter();
  const demo = useDemoMode();
  useEffect(() => {
    const watch = createLocationWatch({
      sync: () =>
        demo
          ? locateDemoBuyerProspects()
          : syncCompetitorLocations({
              ping: pingLocator,
              loadToLocate: loadBuyerProspectsToLocate,
              fetchProperties: fetchLocatorProperties,
              save: saveBuyerProspectLocations,
              maxUrls: LOCATOR_MAX_URLS,
            }),
      onOutcome: (outcome) => {
        if (outcome.changed > 0) {
          router.refresh();
        }
      },
    });
    watch.start();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        watch.start();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      watch.stop();
    };
  }, [router, demo]);
  return null;
}
