'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import {
  alertError,
  btnPrimary,
  btnSecondary,
  card,
  emptyState,
  hintText,
  link,
  metaLabel,
  sectionTitle,
} from '@/components/ui/styles';
import {
  ASSISTANT_FLAG,
  MAX_TRANSFER_BYTES,
  storeTransfer,
  transferSize,
} from '@/features/comparable-import/components/import-transfer';
import {
  LISTING_MESSAGE_TYPE,
  READY_SIGNAL,
} from '@/features/comparable-import/services/build-bookmarklet';

type ProjectChoice = { id: string; sellerName: string; statusLabel: string };

type Received = { url: string; html: string; bytes: number };

// Fenêtre ouverte par le raccourci « Envoyer vers ACM Studio ». Elle attend la
// page de l'annonce envoyée par l'onglet du portail, puis demande dans quel
// dossier vendeur l'ajouter.
//
// Le contenu reçu vient d'une page quelconque du web : il est traité comme une
// DONNÉE, jamais comme une instruction. Il n'est ni exécuté, ni affiché en tant
// que HTML — seulement transmis à l'analyse serveur existante, qui en extrait
// des champs typés que le conseiller vérifie avant enregistrement.
export function ImportAssistantPanel({ projects }: { projects: ProjectChoice[] }) {
  const [received, setReceived] = useState<Received | null>(null);
  const [error, setError] = useState<string | null>(null);
  const receivedRef = useRef(false);

  useEffect(() => {
    const opener = window.opener as Window | null;

    function onMessage(event: MessageEvent) {
      // On n'accepte que ce qui vient de la fenêtre qui nous a ouverts.
      if (!opener || event.source !== opener || receivedRef.current) {
        return;
      }
      const payload = event.data as { type?: unknown; url?: unknown; html?: unknown } | null;
      if (!payload || payload.type !== LISTING_MESSAGE_TYPE) {
        return;
      }
      if (typeof payload.url !== 'string' || typeof payload.html !== 'string') {
        return;
      }
      const bytes = transferSize(payload.html);
      receivedRef.current = true;
      if (bytes > MAX_TRANSFER_BYTES) {
        setError(
          'La page reçue est trop volumineuse pour être analysée. Utilisez le collage de code sur la page d’ajout d’un bien concurrent.',
        );
        return;
      }
      setReceived({ url: payload.url, html: payload.html, bytes });
    }

    window.addEventListener('message', onMessage);

    // L'onglet du portail attend notre signal pour envoyer la page. On le
    // répète : selon la vitesse de chargement, son écouteur peut ne pas être
    // encore en place au premier envoi.
    let attempts = 0;
    const ping = () => {
      if (receivedRef.current || !opener) {
        return;
      }
      attempts += 1;
      try {
        opener.postMessage(READY_SIGNAL, '*');
      } catch {
        // Fenêtre d'origine fermée entre-temps : le compte à rebours s'arrête.
      }
      if (attempts > 60) {
        window.clearInterval(timer);
      }
    };
    const timer = window.setInterval(ping, 400);
    ping();

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
    };
  }, []);

  function choose(projectId: string) {
    if (!received) {
      return;
    }
    if (!storeTransfer(received.url, received.html)) {
      setError(
        'Votre navigateur a refusé de transférer la page (espace insuffisant). Utilisez le collage de code sur la page d’ajout d’un bien concurrent.',
      );
      return;
    }
    window.location.assign(
      `/builder/${projectId}/comparables/new?${ASSISTANT_FLAG}=1&importUrl=${encodeURIComponent(received.url)}`,
    );
  }

  let host = '';
  try {
    host = received ? new URL(received.url).hostname.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      {received ? (
        <>
          <div className={`${card} flex flex-col gap-1.5 p-5`}>
            <span className={metaLabel}>Annonce reçue</span>
            <span className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
              {host || 'Portail inconnu'}
            </span>
            <span className="truncate text-sm text-zinc-500 stage:text-white/55">
              {received.url}
            </span>
            <span className="text-xs text-zinc-400 stage:text-white/40">
              Page de {Math.max(1, Math.round(received.bytes / 1024))} Ko, prête à être analysée.
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className={sectionTitle}>Dans quel dossier vendeur ?</h2>
            {projects.length === 0 ? (
              <div className={emptyState}>
                <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
                  Aucun dossier vendeur.
                </p>
                <p>
                  Créez d’abord un dossier dans la{' '}
                  <Link href="/builder" className={link}>
                    Préparation
                  </Link>
                  , puis relancez l’envoi depuis l’annonce.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {projects.map((project) => (
                  <li
                    key={project.id}
                    className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}
                  >
                    <span className="flex flex-col">
                      <span className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
                        {project.sellerName}
                      </span>
                      <span className="text-xs text-zinc-400 stage:text-white/40">
                        {project.statusLabel}
                      </span>
                    </span>
                    <button type="button" onClick={() => choose(project.id)} className={btnPrimary}>
                      Analyser dans ce dossier →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className={`${card} flex flex-col gap-2 p-6`}>
          <span className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            {error ? 'Transfert interrompu' : 'En attente de l’annonce…'}
          </span>
          <p className={hintText}>
            Cette fenêtre s’ouvre depuis le bouton « Envoyer vers ACM Studio » de votre barre de
            favoris, lorsque vous consultez une annonce. Si rien n’arrive, revenez sur l’onglet de
            l’annonce et cliquez à nouveau sur le bouton.
          </p>
          <Link href="/builder" className={`${btnSecondary} mt-2 w-fit`}>
            Retour à la Préparation
          </Link>
        </div>
      )}
    </div>
  );
}
