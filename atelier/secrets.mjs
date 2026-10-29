// Mission 126 — aucun secret sur la page ni dans le journal (fiche, point 7). Tout texte qui entre
// dans le journal passe ici : une phrase d'agent, une commande, un rapport. On ne garde jamais une
// commande ou un rapport bruts (risque principal de l'architecte) ; ce masque est la seconde parade.
// Pur, sans dépendance.

// La forme d'une branche de mission : `mission-120B-confrere`, `mission-120-j-ai-un-acquereur-…`.
const BRANCHE_DE_MISSION = /^mission-\d+[A-Z]?(?:-[a-z0-9]+)+$/;

// Chaque règle masque toute sa prise, ou garde un préfixe (le nom d'une variable) et masque la
// valeur ; `sauf` laisse passer une prise dont la forme est connue pour n'être pas un secret.
const RULES = [
  // Jetons connus : GitHub, Supabase, JWT.
  { motif: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { motif: /\b(?:sbp_[A-Za-z0-9]{20,}|sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,})\b/g },
  { motif: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  // Une variable sensible écrite avec sa valeur : E2E_…=…, …_KEY=…, …_SECRET=…, …_TOKEN=…,
  // …_PASSWORD=…, x-vercel-protection-bypass: … ; le nom reste, la valeur part.
  {
    motif:
      /\b((?:E2E_[A-Z_]+|[A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD|BYPASS))\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/g,
    garde: true,
  },
  { motif: /(x-vercel-protection-bypass\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi, garde: true },
  // Un mot de passe ou un jeton passé en paramètre d'adresse.
  {
    motif:
      /([?&](?:token|jeton|key|secret|password|bypass|x-vercel-protection-bypass)=)[^&\s"']+/gi,
    garde: true,
  },
  // Une longue chaîne opaque : hexadécimale (32 et plus), base64url (43 et plus), base64 (40 et
  // plus), ou alphanumérique mêlant lettres et chiffres (32 et plus, le jeton de l'essai) : un
  // condensat, un jeton, une clé.
  { motif: /\b[A-Fa-f0-9]{32,}\b/g },
  // Un jeton long mêle majuscules et minuscules (un jeton de 43 caractères sans majuscule : une
  // chance sur dix milliards) ; un nom de branche (« mission-120-j-ai-un-acquereur-pour-votre-bien »)
  // ou de migration (« 20261027090000_live_closed_after_conclusion ») n'en a pas, et une branche de
  // partie B (« mission-120B-… ») est reconnue à sa forme (bloquant du relecteur, 29/10).
  {
    // Bornes explicites, pas `\b` : un jeton qui commence ou finit par « - » ou « _ » (1 sur 32)
    // n'a pas de frontière de mot après « /synthese/ » (second bloquant du relecteur, 29/10).
    motif:
      /(?<![A-Za-z0-9_-])(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[a-z])[A-Za-z0-9_-]{43,}(?![A-Za-z0-9_-])/g,
    sauf: BRANCHE_DE_MISSION,
  },
  {
    motif:
      /\b(?=[A-Za-z0-9+/]*[0-9+/])(?=[A-Za-z0-9+/]*[A-Z])(?=[A-Za-z0-9+/]*[a-z])[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/=])/g,
  },
  // Alphanumérique mêlant lettres et chiffres (32 et plus) : le jeton de l'essai.
  { motif: /\b(?=[A-Za-z0-9]*[0-9])(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{32,}\b/g },
];

export const MASQUE = '[masqué]';

export function masquerSecrets(texte) {
  if (typeof texte !== 'string' || texte === '') return '';
  let sortie = texte;
  for (const { motif, garde, sauf } of RULES) {
    sortie = garde
      ? sortie.replace(motif, (tout, prefixe) =>
          // Une valeur déjà masquée reste telle quelle : « E2E_X=[masqué] » n'est pas un secret.
          tout.slice(prefixe.length).startsWith(MASQUE) ? tout : `${prefixe}${MASQUE}`,
        )
      : sortie.replace(motif, (prise) => (sauf && sauf.test(prise) ? prise : MASQUE));
  }
  return sortie;
}

// La première ligne utile d'un texte, masquée, bornée : ce que le journal garde d'un rapport.
export function premierePhrase(texte, maximum = 140) {
  const ligne =
    String(texte ?? '')
      .split('\n')
      .map((l) =>
        l
          .replace(/[*`]{1,3}/g, '')
          .replace(/^[#>\-\s]+/, '')
          .trim(),
      )
      .find((l) => l !== '') ?? '';
  const propre = masquerSecrets(ligne.replace(/\s+/g, ' '));
  return propre.length > maximum ? `${propre.slice(0, maximum - 1).trimEnd()}…` : propre;
}

// Vrai si le texte porte encore quelque chose qui ressemble à un secret : le test le vérifie sur
// les journaux d'exemple et sur ce que le hook écrit.
export function contientSecret(texte) {
  return masquerSecrets(String(texte ?? '')) !== String(texte ?? '');
}
