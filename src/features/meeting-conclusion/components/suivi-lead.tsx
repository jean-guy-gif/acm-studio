'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Mission 146 — un seul bouton plein sur l'écran du Suivi (M143) : celui de la première carte dont
// l'étape est due, dans l'ordre du Suivi (M96), comme « Aujourd'hui » (M145). Un panneau ouvert qui
// porte son propre bouton plein — le Point marché dû, la relance — devient le seul plein
// de l'écran : la première carte due passe alors en contour (précision de Jean-Guy, 08/11).
// Mission 146 (partie B) — après « J'ai relancé », la carte n'est plus due : la carte due suivante
// reprend le plein aussitôt, sans rechargement (`settle`).

type SuiviLead = {
  leadId: string | null;
  claim: (id: string) => void;
  release: (id: string) => void;
  settle: (id: string) => void;
};

const SuiviLeadContext = createContext<SuiviLead>({
  leadId: null,
  claim: () => {},
  release: () => {},
  settle: () => {},
});

export function SuiviLeadProvider({
  dueIds,
  children,
}: {
  // Les cartes dont l'étape est due, dans l'ordre du Suivi.
  dueIds: string[];
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [settled, setSettled] = useState<ReadonlySet<string>>(new Set());
  const claim = useCallback((id: string) => setOpenId(id), []);
  const release = useCallback(
    (id: string) => setOpenId((current) => (current === id ? null : current)),
    [],
  );
  const settle = useCallback(
    (id: string) => setSettled((current) => (current.has(id) ? current : new Set(current).add(id))),
    [],
  );
  const value = useMemo(
    () => ({ leadId: suiviLeadId(dueIds, openId, settled), claim, release, settle }),
    [dueIds, openId, settled, claim, release, settle],
  );
  return <SuiviLeadContext.Provider value={value}>{children}</SuiviLeadContext.Provider>;
}

// La carte qui porte le plein : celle dont un panneau à bouton plein est ouvert, sinon la première
// carte encore due (une carte relancée ne l'est plus). Pur.
export function suiviLeadId(
  dueIds: readonly string[],
  openPanelId: string | null,
  settled: ReadonlySet<string> = new Set(),
): string | null {
  return openPanelId ?? dueIds.find((id) => !settled.has(id)) ?? null;
}

export function useSuiviLead(): SuiviLead {
  return useContext(SuiviLeadContext);
}
