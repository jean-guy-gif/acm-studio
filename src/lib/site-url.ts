// L'adresse publique de l'environnement courant (travail, essai, local) : c'est elle que portent
// les liens des e-mails (M64). Jamais en dur.
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}
