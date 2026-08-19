'use client';

import { useSyncExternalStore } from 'react';

import { btnSecondary, hintText, softPanel } from '@/components/ui/styles';
import { buildBookmarkletHref } from '@/features/comparable-import/services/build-bookmarklet';

// « Envoyer vers ACM Studio » — raccourci à glisser une fois dans la barre de
// favoris du conseiller.
//
// Ce que ça fait, et ce que ça ne fait pas : le conseiller consulte une annonce
// dans SON navigateur, avec SA session ; le raccourci reprend la page telle
// qu'elle s'affiche à lui et l'envoie à ACM Studio, qui l'analyse avec le même
// pipeline que l'import par adresse. Aucune requête n'est faite au portail par
// nos serveurs, aucune protection n'est contournée, aucune session n'est
// usurpée. C'est le pendant « en un clic » du collage de code manuel.
//
// Le code du raccourci vit dans build-bookmarklet.ts (couvert par des tests).

// L'adresse du site n'existe que dans le navigateur. On la lit comme une source
// externe (identités stables, pas de changement d'état dans un effet) : le rendu
// serveur ne produit rien, le navigateur complète juste après l'hydratation.
const subscribeToOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => null;

export function ImportBookmarklet() {
  const origin = useSyncExternalStore(subscribeToOrigin, getOrigin, getServerOrigin);

  return (
    <div className={`${softPanel} flex flex-col gap-2.5 p-4`}>
      <span className="font-title text-base font-semibold text-zinc-800 stage:text-white">
        Un portail refuse l’import ? Envoyez-lui la page en un clic
      </span>
      <p className={hintText}>
        Glissez ce bouton dans la barre de favoris de votre navigateur (une seule fois). Ensuite,
        sur n’importe quelle annonce, cliquez dessus : la page part dans ACM Studio, qui l’analyse
        et pré-remplit la fiche.
      </p>
      {origin ? (
        <a
          href={buildBookmarkletHref(origin)}
          className={`${btnSecondary} w-fit cursor-grab active:cursor-grabbing`}
          onClick={(event) => event.preventDefault()}
          draggable
        >
          ↗ Envoyer vers ACM Studio
        </a>
      ) : (
        <span className={`${btnSecondary} w-fit opacity-50`}>↗ Envoyer vers ACM Studio</span>
      )}
      <p className="text-xs text-zinc-400 stage:text-white/40">
        Le raccourci lit la page telle que vous la voyez déjà dans votre navigateur : rien n’est
        contourné, et nos serveurs n’interrogent pas le portail.
      </p>
    </div>
  );
}
