'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Correctifs 161 — l'adresse que le conseiller tape sur la fiche du bien, tant qu'elle n'est pas
// enregistrée, pour que la carte « Le bien dans Academia », à côté, le dise. Un contexte local à la
// page Bien vendeur, rien de plus : la fiche y écrit, la carte y lit.
type PropertyDraft = {
  // L'adresse tapée tant que la fiche a des modifications non enregistrées ; `undefined` sinon.
  typed: string | null | undefined;
  report: (typed: string | null | undefined) => void;
};

export const PropertyDraftContext = createContext<PropertyDraft>({
  typed: undefined,
  report: () => undefined,
});

export function PropertyDraftProvider({ children }: { children: ReactNode }) {
  const [typed, setTyped] = useState<string | null | undefined>(undefined);
  const value = useMemo(() => ({ typed, report: setTyped }), [typed]);
  return <PropertyDraftContext.Provider value={value}>{children}</PropertyDraftContext.Provider>;
}

export const usePropertyDraft = () => useContext(PropertyDraftContext);
