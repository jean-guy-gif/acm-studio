'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, errorText, fieldLabel, inputBase } from '@/components/ui/styles';
import { respondToOffer } from '@/features/purchase-offer/actions/respond-to-offer';
import { SignaturePad } from '@/features/visit-voucher/components/signature-pad';

// Mission 137 (partie B) — sur le lien du vendeur : « Bon pour acceptation », signé au doigt par
// chaque propriétaire (deux au plus), ou « Je refuse », avec une confirmation dans l'écran. Une
// seule réponse ; l'outil n'envoie rien.
export function SellerResponse({ token, validUntil }: { token: string; validUntil: string }) {
  const router = useRouter();
  const [signers, setSigners] = useState<string[]>(['']);
  const [signatures, setSignatures] = useState<(string | null)[]>([null, null]);
  const [confirmRefusal, setConfirmRefusal] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const send = (payload: unknown) => {
    setError(null);
    startTransition(async () => {
      const result = await respondToOffer(token, payload).catch(() => ({
        ok: false as const,
        error: 'Connexion perdue : réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const ready =
    signers.every((name) => name.trim().length >= 2) &&
    signatures.slice(0, signers.length).every((value) => value != null);

  return (
    <section
      className="mx-auto flex max-w-[210mm] flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 print:hidden"
      data-testid="seller-response"
    >
      <h2 className="font-title text-lg font-bold text-zinc-900">Votre réponse</h2>
      <p className="text-sm text-zinc-600">
        L’offre est valable jusqu’au {validUntil} inclus. Pour l’accepter, chaque propriétaire écrit
        son nom et signe « Bon pour acceptation ».
      </p>
      {signers.map((name, index) => (
        <div key={index} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>
              Nom du propriétaire {signers.length > 1 ? index + 1 : ''}
            </span>
            <input
              className={inputBase}
              value={name}
              maxLength={160}
              data-testid={`seller-name-${index + 1}`}
              onChange={(event) =>
                setSigners((current) =>
                  current.map((entry, at) => (at === index ? event.target.value : entry)),
                )
              }
            />
          </label>
          <SignaturePad
            label={`Bon pour acceptation — signature${name.trim() ? ` de ${name.trim()}` : ''}`}
            testId={`seller-signature-${index + 1}`}
            onChange={(value) =>
              setSignatures((current) => current.map((entry, at) => (at === index ? value : entry)))
            }
          />
        </div>
      ))}
      {signers.length < 2 ? (
        <button
          type="button"
          className={`${btnSecondary} self-start`}
          onClick={() => setSigners((current) => [...current, ''])}
        >
          Ajouter un second propriétaire
        </button>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={pending || !ready}
          data-testid="seller-accept"
          onClick={() =>
            send({
              decision: 'accepted',
              signers: signers.map((name) => name.trim()),
              signatures: signatures.slice(0, signers.length),
            })
          }
        >
          {pending ? 'Envoi…' : 'Accepter l’offre (Bon pour acceptation)'}
        </button>
        {confirmRefusal ? (
          <span className="flex flex-wrap items-center gap-2" role="group">
            <span className="text-sm font-medium text-zinc-800">Refuser cette offre ?</span>
            <button
              type="button"
              className={btnSecondary}
              disabled={pending}
              data-testid="seller-refuse-confirm"
              onClick={() => send({ decision: 'refused' })}
            >
              Je refuse
            </button>
            <button type="button" className={btnSecondary} onClick={() => setConfirmRefusal(false)}>
              Annuler
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={btnSecondary}
            disabled={pending}
            data-testid="seller-refuse"
            onClick={() => setConfirmRefusal(true)}
          >
            Je refuse
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
