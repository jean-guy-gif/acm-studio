import Image from 'next/image';

// Logo officiel Start Academy.
//
// Seuls fichiers publiés (dans `public/brand/`, servis par Next.js) :
//   - start-academy-logo.png       → wordmark bleu, pour FOND CLAIR
//   - start-academy-logo-white.png → wordmark blanc, pour FOND SOMBRE
// Les sources de la charte (PDF/HD/bureautique) sont hors `public/`, dans
// `brand-source/` (git-ignoré, jamais publié ni committé).
//
// Aucun redessin, aucun faux symbole, aucune couleur/typo modifiée, aucun
// dégradé, aucune déformation : on affiche le PNG officiel HD transparent
// (719 × 344, ratio ≈ 2,09:1) via next/image en conservant ses proportions
// naturelles (hauteur imposée, largeur auto). C'est le SEUL point centralisant
// tous les usages (Connexion, Onboarding, navigation Préparation, intro Live,
// barre mobile).

const NATURAL_WIDTH = 719;
const NATURAL_HEIGHT = 344;

export function Logo({
  onDark = false,
  priority = false,
  className = 'h-8',
}: {
  /** Choisit la variante blanche (fond sombre) plutôt que la variante bleue (fond clair). */
  onDark?: boolean;
  /** À activer pour un logo au-dessus de la ligne de flottaison (Connexion, intro Live). */
  priority?: boolean;
  /** Ne fournir QUE la hauteur (ex. `h-10`). La largeur reste automatique. */
  className?: string;
}) {
  const src = onDark ? '/brand/start-academy-logo-white.png' : '/brand/start-academy-logo.png';

  // `w-auto self-start shrink-0` garantit le respect des proportions : sans
  // `self-start`, un parent flex-col (carte, navigation, intro Live) étire le
  // logo sur toute la largeur via `align-items: stretch` et le déforme.
  return (
    <Image
      src={src}
      alt="Start Academy"
      width={NATURAL_WIDTH}
      height={NATURAL_HEIGHT}
      priority={priority}
      className={`w-auto shrink-0 self-start ${className}`}
    />
  );
}
