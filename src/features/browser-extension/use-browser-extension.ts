'use client';

import { useEffect, useState } from 'react';

import { pingExtension } from '@/features/browser-extension/client';

// Feature-detection for the browser extension (mission « L'extension navigateur »,
// §5): the app stays whole without it. `available` is null while unknown, then true
// or false — callers keep every existing gesture when it is false.
export function useBrowserExtension(): { available: boolean | null; version?: string } {
  const [state, setState] = useState<{ available: boolean | null; version?: string }>({
    available: null,
  });

  useEffect(() => {
    let cancelled = false;
    pingExtension().then((result) => {
      if (!cancelled) {
        setState({ available: result.available, version: result.version });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
