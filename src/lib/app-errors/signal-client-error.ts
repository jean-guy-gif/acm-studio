import { reportClientError } from '@/lib/app-errors/report-client-error';

// Mission 100 — côté navigateur : signale une erreur au journal, sans jamais rien afficher ni
// lever. Une erreur de rendu serveur porte un `digest` : le serveur l'a déjà enregistrée avec son
// vrai message, le navigateur n'en a qu'une version vidée — on ne la compte pas deux fois.
export function signalClientError(source: 'browser' | 'live', error: unknown): void {
  if (typeof error === 'object' && error !== null && 'digest' in error) {
    if (typeof (error as { digest: unknown }).digest === 'string') return;
  }
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? 'Erreur');
  void reportClientError({
    source,
    page: window.location.pathname,
    message: message.slice(0, 5000),
  }).catch(() => {});
}
