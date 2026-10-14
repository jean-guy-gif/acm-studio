'use client';

import { useEffect, useState } from 'react';

import { pingExtension } from '@/features/browser-extension/client';

// Feature-detection for the browser extension (mission « L'extension navigateur »,
// §5): the app stays whole without it. `available` is null while unknown, then true
// or false — callers keep every existing gesture when it is false.
type ExtensionState = { available: boolean | null; version?: string; noSiteAccess?: boolean };

export function useBrowserExtension(): ExtensionState {
  const [state, setState] = useState<ExtensionState>({ available: null });

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

  return state;
}
