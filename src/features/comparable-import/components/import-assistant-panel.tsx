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
import { LISTING_MESSAGE_TYPE } from '@/features/comparable-import/services/build-bookmarklet';

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
    // Le raccourci envoie la page plusieurs fois, en tentatives espacées : on se
    // contente d'écouter et de ne retenir que la première reçue. On n'envoie
    // RIEN vers l'onglet du portail — terrain (19/08) : une version précédente y
    // répétait un signal « prêt », et Bien'ici affichait sa page d'erreur.
    function onMessage(event: MessageEvent) {
      if (receivedRef.current) {
        return;
      }
      // Cas normal : le message vient de la fenêtre qui nous a ouverts. Certains
      // navigateurs coupent ce lien (window.opener nul) ; on accepte alors un
      // message bien formé, ce qui reste sans danger : ce contenu n'est jamais
      // exécuté, il alimente une fiche que le conseiller relit avant
      // d'enregistrer.
      const opener = window.opener as Window | null;
      if (opener && event.source !== opener) {
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
    return () => window.removeEventListener('message', onMessage);
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
