// Mission 122 (partie B, décisions de Jean-Guy, 25/10) — ce que montre le lien du dossier, selon
// la sélection et ce qui vient de se passer sur l'écran. Pur.
//   « Ce que nous avons vu ensemble » : la présentation est terminée (relue en base, ou dite par le
//   refus d'un envoi), en lecture seule ;
//   le merci : sa réponse est déjà donnée (relue en base, ou dite par le refus d'un envoi), ou il
//   vient de l'envoyer — jamais de nouveau le formulaire ;
//   sinon le déroulé, à répondre.
export type LinkScreen = 'seen-together' | 'thanks' | 'deck';
export type LinkClosed = 'answered' | 'presented';

export function linkScreen(state: {
  presented: boolean;
  answered: boolean;
  sent: boolean;
  closed: LinkClosed | null;
}): LinkScreen {
  if (state.presented || state.closed === 'presented') return 'seen-together';
  if (state.answered || state.sent || state.closed === 'answered') return 'thanks';
  return 'deck';
}
