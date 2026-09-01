MISSION 39 — La slide « Votre bien » (acte 1)

Date : 28 août 2026 Demande de Laurent : « la première page, c'est les caractéristiques du bien, et on demande au client : est-ce que ça correspond ? »

1. État des lieux

Le Storyboard officiel (docs/01_Method/Storyboard.md, acte 1, slide 2) prévoit une slide de reconnaissance avant tout concurrent. La machine à états (Meeting_State_Machine.md) l'appelle PROPERTY_DISCOVERY puis PROPERTY_CONFIRMED.

Le Live passe aujourd'hui de l'introduction directement au premier concurrent. Le vendeur n'a jamais l'occasion de reconnaître son bien avant qu'on lui montre la concurrence.

2. Ce qu'on fait
Nouveau type de page subject_property dans build-live-pages.ts, inséré entre intro et la première boucle concurrent.
Composant live-page-property.tsx : grande photo, galerie et visionneuse plein écran (réutiliser live-gallery.tsx et gallery-model.ts), caractéristiques, description.
Jamais de prix. Jamais la fourchette du conseiller. Jamais d'estimation. C'est l'acte 1 : le vendeur reconnaît son bien, rien d'autre.
Question : « Est-ce que cette présentation correspond bien à votre bien ? » Réponse oui / non, plus un commentaire libre — c'est souvent là que le vendeur lâche ce qu'il pense valoriser.
Persistance : deux colonnes sur live_seller_summary, seller_property_confirmed (contrainte yes / no) et seller_property_comment (2 000 caractères max, comme les autres commentaires).
can-advance-live-page.ts : on n'avance pas tant que la réponse n'est pas donnée, même règle que les autres écrans.
Si le dossier n'a pas de bien vendeur renseigné, la page ne s'insère pas — même logique que « le concurrent le plus dangereux », absent quand il n'y a aucun concurrent.
3. Garde-fous
Test explicite : la fourchette de prix du conseiller n'apparaît à aucun moment dans le Live.
Test sur buildLivePages : position de la page, et absence de la page quand il n'y a pas de bien vendeur.
4. Barrières

Migration + test SQL · vitest · tsc --noEmit · eslint · prettier --check · next build.