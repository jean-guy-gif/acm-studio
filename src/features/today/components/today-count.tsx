'use client';

import { useEffect, useState } from 'react';

// Mission 145 (partie B) — la pastille du menu « Aujourd'hui » : le nombre de LIGNES de la page
// (« Mes tâches »), lu une fois au chargement (`/api/aujourdhui`, jamais dans la mise en page,
// M128 B), puis tenu à jour par la page elle-même, qui publie son compte à chaque rendu.
// Remplace la pastille du Suivi (M130 A), qui comptait des tâches.
const EVENT = 'acm:today-lines';

let firstRead: Promise<number | null> | null = null;
const readCount = (): Promise<number | null> => {
  firstRead ??= fetch('/api/aujourdhui', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : { count: null }))
    .then((body: { count?: unknown }) => (typeof body.count === 'number' ? body.count : null))
    .catch(() => null);
  return firstRead;
};

export function useTodayCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
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
  }, []);
  return count;
}

// Rendu par la page « Aujourd'hui » (« Mes tâches ») : elle publie le compte qu'elle vient de faire.
export function TodayCountSync({ count }: { count: number }) {
  useEffect(() => {
    firstRead = Promise.resolve(count);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: count }));
  }, [count]);
  return null;
}

export function todayCountLabel(count: number): string {
  return `Aujourd’hui, ${count} ligne${count > 1 ? 's' : ''} à faire`;
}
