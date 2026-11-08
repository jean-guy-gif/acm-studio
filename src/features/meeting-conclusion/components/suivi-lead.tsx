'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Mission 146 — un seul bouton plein sur l'écran du Suivi (M143) : celui de la première carte dont
// l'étape est due, dans l'ordre du Suivi (M96), comme « Aujourd'hui » (M145). Un panneau ouvert qui
// porte son propre bouton plein — le Point marché dû, la relance — devient le seul plein
// de l'écran : la première carte due passe alors en contour (précision de Jean-Guy, 08/11).

type SuiviLead = {
  leadId: string | null;
  claim: (id: string) => void;
  release: (id: string) => void;
};

const SuiviLeadContext = createContext<SuiviLead>({
  leadId: null,
  claim: () => {},
  release: () => {},
});

export function SuiviLeadProvider({
  firstDueId,
  children,
}: {
  firstDueId: string | null;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const claim = useCallback((id: string) => setOpenId(id), []);
  const release = useCallback(
    (id: string) => setOpenId((current) => (current === id ? null : current)),
    [],
  );
  const value = useMemo(
    () => ({ leadId: suiviLeadId(firstDueId, openId), claim, release }),
    [firstDueId, openId, claim, release],
  );
  return <SuiviLeadContext.Provider value={value}>{children}</SuiviLeadContext.Provider>;
}

// La carte qui porte le plein : celle dont un panneau à bouton plein est ouvert, sinon la première
// carte due. Pur.
export function suiviLeadId(firstDueId: string | null, openPanelId: string | null): string | null {
  return openPanelId ?? firstDueId;
}

export function useSuiviLead(): SuiviLead {
  return useContext(SuiviLeadContext);
}
