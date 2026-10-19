'use client';

import { useCallback, useEffect, useState } from 'react';

import { pingExtension } from '@/features/browser-extension/client';

// Feature-detection for the browser extension (mission « L'extension navigateur »,
// §5): the app stays whole without it. `available` is null while unknown, then true
// or false — callers keep every existing gesture when it is false.
type ExtensionState = { available: boolean | null; version?: string; noSiteAccess?: boolean };

// Mission 108 — `recheck` : « Réessayer », la détection complète refaite à la demande.
export function useBrowserExtension(): ExtensionState & { recheck: () => Promise<void> } {
  const [state, setState] = useState<ExtensionState>({ available: null });
  const recheck = useCallback(async () => {
    const result = await pingExtension({ force: true });
    setState({
      available: result.available,
      version: result.version,
      noSiteAccess: result.noSiteAccess === true,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    pingExtension().then((result) => {
      if (!cancelled) {
        setState({
          available: result.available,
          version: result.version,
          noSiteAccess: result.noSiteAccess === true,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, recheck };
}
