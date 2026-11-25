// Les sites dont l'extension ACM lit les pages : son manifeste fait foi (M73), un test compare cette
// liste à `extension/page-readiness.js`. Ailleurs, l'extension ne lit rien : l'écran ne la sollicite
// pas. Module pur, sans zod : il sert aussi dans le navigateur (M128 B).
export const EXTENSION_HOST_SUFFIXES: readonly string[] = [
  'seloger.com',
  'bienici.com',
  'green-acres.fr',
  'immobilier.lefigaro.fr',
  'maisonsetappartements.fr',
];

export function readByExtension(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return EXTENSION_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}
