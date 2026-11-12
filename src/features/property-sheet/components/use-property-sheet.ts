'use client';

import { useCallback, useRef, useState } from 'react';

import {
  loadPropertySheet,
  type PropertySheetTarget,
} from '@/features/property-sheet/actions/load-property-sheet';
import { SHEET_UNREADABLE } from '@/features/property-sheet/sheet-messages';
import type { SheetState } from '@/features/property-sheet/components/property-sheet-view';
import type { PropertySheet } from '@/features/property-sheet/services/property-sheet';

// Mission 152 (partie B) — ouvrir la fiche complète : tout de suite pour une annonce que l'écran a
// déjà (la recherche du marché), sinon par l'action du serveur ; seule la dernière demande compte.
export function usePropertySheet() {
  const [state, setState] = useState<SheetState | null>(null);
  const request = useRef(0);

  const openSheet = useCallback((sheet: PropertySheet) => {
    request.current += 1;
    setState({ status: 'ready', sheet });
  }, []);

  const openTarget = useCallback((target: PropertySheetTarget) => {
    request.current += 1;
    const mine = request.current;
    setState({ status: 'loading' });
    void loadPropertySheet(target)
      .catch(() => ({ ok: false as const, error: SHEET_UNREADABLE }))
      .then((result) => {
        if (request.current !== mine) return;
        setState(
          result.ok
            ? { status: 'ready', sheet: result.sheet }
            : { status: 'error', error: result.error },
        );
      });
  }, []);

  const close = useCallback(() => {
    request.current += 1;
    setState(null);
  }, []);

  return { state, openSheet, openTarget, close };
}
