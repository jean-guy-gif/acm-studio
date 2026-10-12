// Mission 100 — les comptes qui exploitent l'outil (page « Erreurs », plafonds de recherche) :
// une liste d'adresses dans la variable d'environnement ACM_OPERATOR_EMAILS, séparées par des
// virgules. Liste d'autorisation : sans variable, personne. Ce n'est pas un rôle d'agence — un
// manager n'y a pas droit — et rien n'en est stocké en base.
export function operatorEmails(
  raw: string | undefined = process.env.ACM_OPERATOR_EMAILS,
): string[] {
  return (raw ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes('@'));
}

export function isOperatorEmail(
  email: string | null | undefined,
  raw: string | undefined = process.env.ACM_OPERATOR_EMAILS,
): boolean {
  const normalized = (email ?? '').trim().toLowerCase();
  return normalized !== '' && operatorEmails(raw).includes(normalized);
}
