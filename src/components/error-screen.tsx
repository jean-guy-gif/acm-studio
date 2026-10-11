// Mission 88 — l'écran des pages d'erreur : en français, aux couleurs de l'app, avec une seule
// sortie, « Revenir à mes dossiers ». Il ne reçoit AUCUNE donnée : ni l'erreur, ni son message,
// ni rien du dossier ouvert — il peut donc s'afficher devant un vendeur, en plein Live, sans
// rien montrer. Sans état ni effet : utilisable par error.tsx (client) comme par not-found.tsx.
export const HOME_PATH = '/builder';
export const HOME_LABEL = 'Revenir à mes dossiers';

export function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand-soft/60 to-white p-6 text-center">
      <span className="font-title text-sm font-bold tracking-[0.25em] text-brand-deep/70 uppercase">
        ACM Studio
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-title text-3xl font-bold tracking-tight text-brand-deep">{title}</h1>
        <p className="text-base text-zinc-600">{message}</p>
      </div>
      {/* Lien plein (rechargement complet) : on repart d'un état propre. */}
      <a
        href={HOME_PATH}
        className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {HOME_LABEL}
      </a>
    </main>
  );
}
