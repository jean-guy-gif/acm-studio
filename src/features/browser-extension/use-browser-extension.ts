'use client';

import { useCallback, useEffect, useState } from 'react';

import { pingExtension } from '@/features/browser-extension/client';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';

// Feature-detection for the browser extension (mission « L'extension navigateur »,
// §5): the app stays whole without it. `available` is null while unknown, then true
// or false — callers keep every existing gesture when it is false.
// Mission 114 — in the demo agency the extension is never probed: `available` is false at once
// (the server-side demo import takes the no-extension path) and `demo` tells callers not to show
// the installation notice.
type ExtensionState = {
  available: boolean | null;
  version?: string;
  noSiteAccess?: boolean;
  demo?: boolean;
};

// Mission 108 — `recheck` : « Réessayer », la détection complète refaite à la demande.
export function useBrowserExtension(): ExtensionState & { recheck: () => Promise<void> } {
  const demo = useDemoMode();
  const [state, setState] = useState<ExtensionState>(
    demo ? { available: false, demo: true } : { available: null },
  );
  const recheck = useCallback(async () => {
    if (demo) return;
    const result = await pingExtension({ force: true });
    setState({
      available: result.available,
      version: result.version,
      noSiteAccess: result.noSiteAccess === true,
    });
  }, [demo]);

  useEffect(() => {
    // Démo : l'état initial est déjà « absente, démo » ; rien à sonder.
    if (demo) return;
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
  }, [demo]);

  return { ...state, recheck };
}
