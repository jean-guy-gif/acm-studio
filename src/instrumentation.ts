import type { Instrumentation } from 'next';

// Mission 100 — savoir quand ça casse : chaque erreur que le serveur attrape (page, action,
// route) entre au journal des erreurs. Le module est chargé à la demande, côté Node seulement.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { recordRequestError } = await import('@/lib/app-errors/record-request-error');
  await recordRequestError(error, request, context);
};
