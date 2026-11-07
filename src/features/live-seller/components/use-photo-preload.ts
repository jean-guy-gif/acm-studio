'use client';

import { useEffect, useState } from 'react';

import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 144 — les photos du Live se chargent pendant l'introduction, quatre à la fois, dans
// l'ordre du Live : à l'arrivée sur un écran, sa photo est déjà dans le cache du navigateur. Rien
// ne bloque : on avance quand on veut, les photos restantes arrivent ensuite. Mêmes adresses et
// même politique de référent que l'affichage (`RemoteImage`), pour que le cache serve l'écran.
const CONCURRENT_LOADS = 4;

export function usePhotoPreload(urls: readonly string[]): boolean {
  const key = urls.join('\n');
  const [doneKey, setDoneKey] = useState<string | null>(null);

  useEffect(() => {
    const queue = key === '' ? [] : key.split('\n');
    if (queue.length === 0) return;
    let cancelled = false;
    let next = 0;
    let finished = 0;
    const loadNext = () => {
      if (cancelled || next >= queue.length) return;
      const url = queue[next++]!;
      const image = new Image();
      image.referrerPolicy = 'no-referrer';
      image.decoding = 'async';
      const settle = () => {
        finished += 1;
        if (finished === queue.length) {
          if (!cancelled) setDoneKey(key);
          return;
        }
        loadNext();
      };
      // Une photo indisponible ne retient pas les autres : l'écran affichera son cadre de repli.
      image.onload = () => {
        void image
          .decode()
          .catch(() => undefined)
          .finally(settle);
      };
      image.onerror = settle;
      image.src = displayPhotoUrl(url);
    };
    for (let i = 0; i < Math.min(CONCURRENT_LOADS, queue.length); i += 1) loadNext();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return key === '' || doneKey === key;
}
