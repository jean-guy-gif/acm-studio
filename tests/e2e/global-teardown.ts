import { execFileSync } from 'node:child_process';

// Mission 100 — une base propre : à la fin de CHAQUE passage, réussi ou non, l'e2e supprime ce
// qu'il a créé (dossiers, biens, concurrents, réponses, relances, oppositions, exemples). Il ne
// se contente plus d'archiver. C'est le script `npm run nettoyer:test` qui le fait : il ne
// connaît que l'agence « TEST AUTOMATIQUE » du compte de test et refuse toute autre agence.
// Exception assumée à « tout passe par l'écran » (M66) : rien de ce qui est conclu ou archivé ne
// se supprime depuis l'écran.
export default function globalTeardown(): void {
  try {
    execFileSync('node', ['scripts/nettoyer-test.mjs', '--supprimer'], { stdio: 'inherit' });
  } catch {
    throw new Error(
      'Le nettoyage de l’agence de test a échoué : lancez `npm run nettoyer:test` pour voir ce qu’il reste.',
    );
  }
}
