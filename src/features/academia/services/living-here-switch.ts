// Mission 156 — « Vivre ici » sur tout bien d'une sélection acquéreur (hors mandat compris) : tant
// que le texte A3 de `/confidentialite` n'est pas validé par la juriste et en ligne, tout le hors
// mandat reste éteint en production — le bloc du dossier acquéreur, le lien discret de la fiche,
// les lignes d'information, l'enregistrement, et tout lien hors mandat vers l'acquéreur (son lien,
// « Confirmer la visite ») (décision de Jean-Guy, 16/11). Il s'ouvre sur l'essai (déploiement de
// prévisualisation Vercel), en local et dans les tests, par une liste d'autorisation, sur le modèle
// du bon de la tournée (M154) : un environnement qui ne se dit pas reste éteint. L'allumer en
// production est un geste à part, sur l'ordre de Jean-Guy, avec le texte. Lu au serveur seulement.
//
// La date du lien d'un mandat et ses avertissements aux 25e et 30e jours ne passent pas par lui :
// le texte validé couvre déjà le mandat.

export const VIVRE_ICI_TOUT_BIEN_OUVERT = false;

export function livingHereEverywhereOpen(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
  lit: boolean = VIVRE_ICI_TOUT_BIEN_OUVERT,
): boolean {
  return (
    lit || env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'development' || env.NODE_ENV === 'test'
  );
}
