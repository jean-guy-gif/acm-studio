'use client';

import { useEffect, useState } from 'react';

// Mission 130 — la pastille du menu « Suivi » : le nombre de tâches dues aujourd'hui. Lue une fois
// au chargement de la page (`/api/suivi/taches`), puis tenue à jour par le Suivi lui-même, qui
// publie son compte à chaque rendu (une relance enregistrée la fait baisser sans rechargement).
const EVENT = 'acm:suivi-tasks';

let firstRead: Promise<number | null> | null = null;
const readCount = (): Promise<number | null> => {
  firstRead ??= fetch('/api/suivi/taches', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : { count: null }))
    .then((body: { count?: unknown }) => (typeof body.count === 'number' ? body.count : null))
    .catch(() => null);
  return firstRead;
};

// `enabled` faux (menu Acquéreur, sans entrée « Suivi ») : aucune lecture.
export function useSuiviTaskCount(enabled = true): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void readCount().then((value) => {
      if (alive) setCount((current) => current ?? value);
    });
    const onCount = (event: Event) => {
      const value = (event as CustomEvent<number>).detail;
      if (typeof value === 'number') setCount(value);
    };
    window.addEventListener(EVENT, onCount);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, onCount);
    };
  }, [enabled]);
  return count;
}

// Rendu par la page du Suivi : elle publie le compte qu'elle vient de calculer.
export function SuiviTaskCountSync({ count }: { count: number }) {
  useEffect(() => {
    firstRead = Promise.resolve(count);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: count }));
  }, [count]);
  return null;
}

export function suiviTaskCountLabel(count: number): string {
  return `Suivi, ${count} tâche${count > 1 ? 's' : ''} à faire aujourd’hui`;
}
