// Mission 127 B — la page d'un lien remis au vendeur ou à l'acquéreur qui ne s'ouvre plus (retiré,
// ou expiré après 30 jours) : elle parle à la personne qui a reçu le lien, pas à un conseiller —
// ni « agence », ni « mes dossiers », aucun bouton. Elle ne reçoit aucune donnée.
export function LinkExpiredScreen({ what }: { what: string }) {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand-soft/60 to-white p-6 text-center">
      <span className="font-title text-sm font-bold tracking-[0.25em] text-brand-deep/70 uppercase">
        ACM Studio
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-title text-3xl font-bold tracking-tight text-brand-deep">
          Ce lien n’est plus valable
        </h1>
        <p className="text-base text-zinc-600">
          {what} a été retiré, ou son lien a expiré : il est valable 30 jours. Pour le recevoir de
          nouveau, demandez-le à votre conseiller.
        </p>
      </div>
    </main>
  );
}
