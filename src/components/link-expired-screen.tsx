import { ENGLISH_TEXTS } from '@/lib/client-texts/en';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';

// Mission 127 B — la page d'un lien remis au vendeur ou à l'acquéreur qui ne s'ouvre plus (retiré,
// ou expiré après 30 jours) : elle parle à la personne qui a reçu le lien, pas à un conseiller —
// ni « agence », ni « mes dossiers », aucun bouton. Elle ne reçoit aucune donnée.
// Mission 131 — `feminine` accorde « retirée » (« L’Étude de marché a été retirée »).
// Mission 140 — le lien n'existe plus : la langue de la personne n'est pas connue, la page la dit en
// français puis en anglais, depuis les textes du client.
export type LinkGoneKind = keyof typeof FRENCH_TEXTS.common.linkGone.what;

export function LinkExpiredScreen({
  kind,
  feminine = false,
}: {
  kind: LinkGoneKind;
  feminine?: boolean;
}) {
  const fr = FRENCH_TEXTS.common.linkGone;
  const en = ENGLISH_TEXTS.common.linkGone;
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 bg-gradient-to-b from-brand-soft/60 to-white p-6 text-center">
      <span className="font-title text-sm font-bold tracking-[0.25em] text-brand-deep/70 uppercase">
        ACM Studio
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-title text-3xl font-bold tracking-tight text-brand-deep">{fr.title}</h1>
        <p className="text-base text-zinc-600">{fr.body(fr.what[kind], feminine)}</p>
      </div>
      <div className="flex max-w-md flex-col gap-2 border-t border-zinc-200 pt-5" lang="en">
        <h2 className="font-title text-xl font-bold tracking-tight text-brand-deep">{en.title}</h2>
        <p className="text-sm text-zinc-600">{en.body(en.what[kind], feminine)}</p>
      </div>
    </main>
  );
}
