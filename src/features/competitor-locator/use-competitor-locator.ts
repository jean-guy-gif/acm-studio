'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadCompetitorsToLocate,
  saveCompetitorLocations,
} from '@/features/competitor-locator/actions/competitor-locations';
import {
  LOCATOR_MAX_URLS,
  fetchLocatorProperties,
  pingLocator,
} from '@/features/competitor-locator/client';
import {
  createLocationWatch,
  type LocationWatch,
} from '@/features/competitor-locator/services/location-watch';
import { syncCompetitorLocations } from '@/features/competitor-locator/services/sync-competitor-locations';
import type { LocatorAvailability } from '@/features/competitor-locator/types';

// Mission 75 — branche la veille du Localisateur sur un dossier : une passe à l'ouverture, une à
// chaque retour sur l'onglet (le conseiller revient d'une annonce ou de la vue du Localisateur),
// et `refresh()` après un import. `availability` reste null tant que le ping n'a pas répondu.
export function useCompetitorLocator(
  projectId: string,
  // Faux là où l'écran ne montre pas les adresses (recherche) : rien à rafraîchir.
  refreshOnChange = true,
): {
  availability: LocatorAvailability | null;
  refresh: () => void;
} {
  const router = useRouter();
  const [availability, setAvailability] = useState<LocatorAvailability | null>(null);
  const watchRef = useRef<LocationWatch | null>(null);

  useEffect(() => {
    const watch = createLocationWatch({
      sync: () =>
        syncCompetitorLocations({
          ping: pingLocator,
          loadToLocate: () => loadCompetitorsToLocate(projectId),
          fetchProperties: fetchLocatorProperties,
          save: (entries) => saveCompetitorLocations(projectId, entries),
          maxUrls: LOCATOR_MAX_URLS,
        }),
      onOutcome: (outcome) => {
        setAvailability(outcome.availability);
        if (refreshOnChange && outcome.changed > 0) {
          router.refresh();
        }
      },
    });
    watchRef.current = watch;
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
      watchRef.current = null;
    };
  }, [projectId, router, refreshOnChange]);

  const refresh = useCallback(() => watchRef.current?.start(), []);

  return { availability, refresh };
}
