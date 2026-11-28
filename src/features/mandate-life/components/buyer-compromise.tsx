'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { errorText, link, socleBtnOutline } from '@/components/ui/styles';
import { moveBuyerStatus } from '@/features/buyers/actions/buyers';

// Lot C (question 17, choix 5 de la maquette) — sur la fiche d'un acquéreur de l'agence : le
// compromis noté pour lui, puis la vente. Son statut ne change pas d'office : la vente notée
// propose « A acheté », par le même geste que les boutons de statut (un cran, daté).

export function BuyerCompromiseLines({
  compromise,
}: {
  compromise: {
    signedText: string;
    deedPlannedText: string | null;
    saleText: string | null;
    sellerHref: string;
  };
}) {
  return (
    <ul className="flex flex-col text-sm" data-testid="buyer-compromise">
      <li className="flex items-center gap-2 border-t border-zinc-100 py-2 first:border-0 stage:border-white/10">
        <span className="font-bold text-emerald-700" aria-label="fait">
          ✓
        </span>
        <span className="text-zinc-800 stage:text-white/85">
          Compromis signé {compromise.signedText}
          {compromise.deedPlannedText ? ` · acte prévu ${compromise.deedPlannedText}` : ''}
        </span>
      </li>
      {compromise.saleText ? (
        <li className="flex items-center gap-2 border-t border-zinc-100 py-2 stage:border-white/10">
          <span className="font-bold text-emerald-700" aria-label="fait">
            ✓
          </span>
          <span className="text-zinc-800 stage:text-white/85">
            Vente signée {compromise.saleText}
          </span>
        </li>
      ) : null}
      <li className="pt-1">
        <Link href={compromise.sellerHref} className={`${link} underline underline-offset-4`}>
          Voir le mandat
        </Link>
      </li>
    </ul>
  );
}

export function BoughtProposal({ buyerId, saleDay }: { buyerId: string; saleDay: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[#E3F4EC] p-3 stage:bg-emerald-400/10">
      <p className="text-sm text-[#0B6B4A] stage:text-emerald-300">
        La vente est notée ({saleDay})&nbsp;: passer cet acquéreur à «&nbsp;A acheté&nbsp;»&#x202f;?
      </p>
      <button
        type="button"
        className={`${socleBtnOutline} self-start`}
        disabled={pending}
        data-testid="buyer-bought-proposal"
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await moveBuyerStatus(buyerId, 'forward');
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        {pending ? 'Enregistrement…' : 'A acheté'}
      </button>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
