'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';

// Photo d'annonce servie EN DIRECT par le portail (jamais copiée chez nous —
// choix juridique du projet). Deux conséquences traitées ici, une fois pour
// toutes, au lieu d'attributs dispersés dans chaque écran :
//
//  1. `referrer-policy: no-referrer` — plusieurs CDN de portails refusent une
//     image demandée depuis un autre domaine que le leur. Sans en-tête Referer,
//     la requête passe comme un accès direct. Politique appliquée partout.
//  2. Repli propre — une annonce retirée, une URL périmée ou un CDN qui refuse
//     produisaient une icône d'image cassée, y compris pendant un rendez-vous
//     vendeur. On affiche à la place un cadre « photo indisponible », à la même
//     place et à la même taille.
//
// Aucune donnée inventée : on n'affiche jamais d'image de remplacement, on
// affiche l'absence.
export function RemoteImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackLabel = 'Photo indisponible',
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  // Classes du cadre de repli (par défaut : celles de l'image, pour conserver
  // exactement la même place dans la mise en page).
  fallbackClassName?: string;
  fallbackLabel?: string;
  eager?: boolean;
}) {
  // On mémorise l'URL qui a échoué (et non un booléen) : la même instance sert
  // plusieurs photos successives dans la visionneuse, et une nouvelle URL doit
  // repartir d'un état sain.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const failed = failedSrc === src;

  // Le rendu vient du serveur : le navigateur peut avoir tenté — et raté — le
  // chargement AVANT que React n'attache ses écouteurs, auquel cas l'événement
  // `error` est déjà passé et ne se rejouera jamais. On contrôle donc aussi
  // l'état réel de l'image au montage et à chaque changement d'URL.
  useEffect(() => {
    const node = imageRef.current;
    if (node && node.complete && node.naturalWidth === 0) {
      setFailedSrc(src);
    }
  }, [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} — ${fallbackLabel}`}
        className={`flex items-center justify-center bg-zinc-100 px-2 text-center text-xs text-zinc-400 stage:bg-white/10 stage:text-white/40 ${fallbackClassName ?? className ?? ''}`}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  );
}
