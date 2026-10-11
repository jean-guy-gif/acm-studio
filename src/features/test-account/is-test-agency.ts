// Mission 87 — l'agence du test automatique (e2e) porte un nom voulu : long, sans logo, et
// commençant par « TEST AUTOMATIQUE ». C'est à ce début de nom qu'on la reconnaît, pour dire à
// l'écran qu'on n'est pas dans un vrai compte. On ne la renomme pas : l'e2e a besoin de son nom.
export const TEST_AGENCY_PREFIX = 'TEST AUTOMATIQUE';

export const TEST_ACCOUNT_MESSAGE =
  'Compte de test automatique — ne préparez pas de vrai dossier ici';

export function isTestAgency(agencyName: string | null | undefined): boolean {
  return (agencyName ?? '').trim().toUpperCase().startsWith(TEST_AGENCY_PREFIX);
}
