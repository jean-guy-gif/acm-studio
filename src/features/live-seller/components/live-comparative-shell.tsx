'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Logo } from '@/components/brand/logo';
import {
  persistLiveComparableResponse,
  saveLiveComparableResponse,
} from '@/features/live-seller/actions/save-live-comparable-response';
import { saveLiveSellerSummary } from '@/features/live-seller/actions/save-live-seller-summary';
import { LivePageAnalysis } from '@/features/live-seller/components/live-page-analysis';
import { LivePageCompetition } from '@/features/live-seller/components/live-page-competition';
import { LivePageConclusion } from '@/features/live-seller/components/live-page-conclusion';
import { LivePageDangerous } from '@/features/live-seller/components/live-page-dangerous';
import { LivePageDuration } from '@/features/live-seller/components/live-page-duration';
import { LivePageIntro } from '@/features/live-seller/components/live-page-intro';
import { LivePagePerceived } from '@/features/live-seller/components/live-page-perceived';
import { LivePageProperty } from '@/features/live-seller/components/live-page-property';
import { LivePagePrice } from '@/features/live-seller/components/live-page-price';
import {
  LivePagePriceRevealPilot,
  type PriceCoherenceDraft,
} from '@/features/live-seller/components/live-page-price-reveal-pilot';
import {
  chromeBtn,
  ctaPrimary,
  navBtn,
  stageGlow,
  stageRoot,
} from '@/features/live-seller/components/live-stage';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { canAdvanceLivePage } from '@/features/live-seller/services/can-advance-live-page';
import type { SellerPresentation } from '@/features/seller-presentation/types/seller-presentation';

export type LiveStageTheme = 'dark' | 'light';

// Live comparative reader — mode présentation. Client-only navigation state
// (page courante, plein écran, thème scène sombre/clair au choix du conseiller).
// Nothing about the source data is editable here; only the seller's Live answers
// are persisted through server actions.
export function LiveComparativeShell({
  projectId,
  presentation,
  initialIndex = 0,
  initialStage = 'dark',
}: {
  projectId: string;
  presentation: SellerPresentation;
  // Fiche d'ouverture : reprise après un rechargement en plein rendez-vous
  // (paramètre « fiche » de l'URL, écrit ci-dessous), ou choix de l'aperçu design.
  initialIndex?: number;
  // Thème d'ouverture de la scène : sombre en Live réel, au choix dans l'aperçu.
  initialStage?: LiveStageTheme;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stage, setStage] = useState<LiveStageTheme>(initialStage);

  // MISSION 51 — état de l'écran-pilote (étape 3, contrat « Valider et continuer »).
  // Le brouillon de la réaction du vendeur vit ICI (composant contrôlé) ; le shell
  // l'enregistre en arrière-plan et suit l'issue de chaque enregistrement.
  const [revealDraft, setRevealDraft] = useState<PriceCoherenceDraft>({
    coherence: '',
    comment: '',
  });
  type SaveStatus = 'pending' | 'ok' | 'failed';
  type SaveRecord = {
    status: SaveStatus;
    comparableId: string;
    formData: FormData;
    error?: string;
  };
  const [saves, setSaves] = useState<Record<string, SaveRecord>>({});

  const live = presentation.live;
  const hasSubjectProperty = presentation.property != null;
  const pages = useMemo(() => buildLivePages(live, hasSubjectProperty), [live, hasSubjectProperty]);
  const currentIndex = Math.min(index, pages.length - 1);
  const page = pages[currentIndex];
  const entry =
    page.comparableId != null
      ? (live?.comparables.find((c) => c.id === page.comparableId) ?? null)
      : null;
  const canAdvance = canAdvanceLivePage(page.type, entry, live?.sellerSummary ?? null);
  // Garde de progression : on lit la valeur courante via une ref pour que `go`
  // reste référentiellement stable (react-hooks/preserve-manual-memoization) tout
  // en respectant la dernière valeur de `canAdvance` au moment de l'appel.
  const canAdvanceRef = useRef(canAdvance);
  useEffect(() => {
    canAdvanceRef.current = canAdvance;
  }, [canAdvance]);

  const isPilot = page.type === 'comparable_price_reveal' && entry != null;
  const currentSave = saves[page.key];

  // MISSION 51 §3.2 — enregistrements en arrière-plan encore en échec. Tant qu'il en
  // reste un, la fin de séance est bloquée (voir `go`) et une bannière propose la
  // relance : aucune réponse affichée ne peut être perdue en silence (§2.1).
  const failedSaves = useMemo(
    () => Object.entries(saves).filter(([, record]) => record.status === 'failed'),
    [saves],
  );
  const hasFailedSavesRef = useRef(false);
  useEffect(() => {
    hasFailedSavesRef.current = failedSaves.length > 0;
  }, [failedSaves]);

  const go = useCallback(
    (delta: number) => {
      if (delta > 0 && !canAdvanceRef.current) return;
      setIndex((i) => {
        const target = Math.max(0, Math.min(pages.length - 1, i + delta));
        // Fin de séance bloquée tant qu'un enregistrement a échoué : on n'atteint pas
        // la conclusion en laissant une réponse du vendeur non confirmée en base.
        if (delta > 0 && pages[target]?.type === 'conclusion' && hasFailedSavesRef.current) {
          return i;
        }
        return target;
      });
    },
    [pages],
  );

  // Enregistre une réponse EN ARRIÈRE-PLAN (sans revalidatePath), suit son issue et
  // conserve le FormData pour permettre une relance en cas d'échec.
  const runSave = useCallback(
    (key: string, comparableId: string, formData: FormData) => {
      setSaves((current) => ({ ...current, [key]: { status: 'pending', comparableId, formData } }));
      void persistLiveComparableResponse(projectId, comparableId, formData)
        .then((result) => {
          // Le détail technique va au JOURNAL, pas à l'écran (jamais devant le vendeur).
          if (!result.ok) {
            console.error('[live] enregistrement échoué', {
              key,
              comparableId,
              error: result.error,
            });
          }
          setSaves((current) => ({
            ...current,
            [key]: {
              ...current[key],
              status: result.ok ? 'ok' : 'failed',
              error: result.ok ? undefined : result.error,
            },
          }));
        })
        .catch((cause) => {
          console.error('[live] enregistrement injoignable', { key, comparableId, cause });
          setSaves((current) => ({
            ...current,
            [key]: { ...current[key], status: 'failed', error: 'Réseau indisponible.' },
          }));
        });
    },
    [projectId],
  );

  // « Valider et continuer » de l'écran-pilote : on enregistre la réaction en
  // arrière-plan PUIS on avance immédiatement — la révélation ne consomme aucune
  // réponse en aval avant l'analyse, l'avance optimiste est donc sûre ici (§3.2).
  const onValidateReveal = useCallback(() => {
    if (!entry) return;
    const formData = new FormData();
    formData.set('seller_price_coherence', revealDraft.coherence);
    formData.set('seller_price_coherence_comment', revealDraft.comment);
    runSave(page.key, entry.id, formData);
    go(1);
  }, [entry, revealDraft, page.key, runSave, go]);

  // Chaque écran s'ouvre en haut (§3.5) — la fenêtre ET le conteneur plein écran.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    rootRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

  // À l'ouverture de l'écran-pilote, le brouillon part de la réponse persistée.
  const initializedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (page.type !== 'comparable_price_reveal' || !entry) return;
    if (initializedKeyRef.current === page.key) return;
    initializedKeyRef.current = page.key;
    setRevealDraft({
      coherence: entry.response?.seller_price_coherence ?? '',
      comment: entry.response?.seller_price_coherence_comment ?? '',
    });
  }, [page.key, page.type, entry]);

  const toggleFullscreen = useCallback(() => {
    const element = rootRef.current;
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        void document.exitFullscreen?.();
      } else if (element?.requestFullscreen) {
        void element.requestFullscreen().catch(() => {});
      }
    } catch {
      // Fullscreen API unavailable or refused — never break the presentation.
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Reprise après rechargement : la fiche courante est reflétée dans l'URL
  // (« ?fiche=N »), que la page serveur relit pour rouvrir au bon endroit. On
  // utilise replaceState — pas la navigation Next — pour ne provoquer aucun
  // aller-retour serveur ni saut de défilement pendant la présentation, et pour
  // que le bouton Précédent du navigateur ne sorte pas du Live fiche par fiche.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const url = new URL(window.location.href);
    if (currentIndex === 0) {
      url.searchParams.delete('fiche');
    } else {
      url.searchParams.set('fiche', String(currentIndex));
    }
    if (url.toString() !== window.location.href) {
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, [currentIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return; // never hijack typing
      }
      // The photo lightbox owns the keyboard while it is open.
      if (document.body.dataset.lightbox === 'open') {
        return;
      }
      if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen();
      } else if (event.key === 'ArrowLeft') {
        go(-1);
      } else if (event.key === 'ArrowRight') {
        go(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [go, toggleFullscreen]);

  const saveResponse = entry ? saveLiveComparableResponse.bind(null, projectId, entry.id) : null;
  const saveSummary = saveLiveSellerSummary.bind(null, projectId);

  const isIntro = page.type === 'intro';
  const stepLabel =
    page.comparableIndex != null && live
      ? `Concurrent ${page.comparableIndex} sur ${live.comparables.length} · Étape ${page.step} sur 4`
      : page.title;

  return (
    <div
      ref={rootRef}
      data-stage={stage}
      className={`${stageRoot} ${isFullscreen ? 'overflow-x-hidden overflow-y-auto' : 'overflow-hidden'}`}
    >
      {/* MISSION 51 §3.2 — un enregistrement en échec ne doit pas passer inaperçu,
          MAIS il s'adresse au CONSEILLER, pas au vendeur : pastille discrète dans le
          coin des réglages (chrome conseiller), jamais une bande pleine largeur devant
          le client. Le détail technique est au journal ; l'écran dit l'essentiel. */}
      {failedSaves.length > 0 ? (
        <div
          className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900 shadow-sm"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
          role="status"
        >
          <span className="text-xs font-medium">
            Réponse non enregistrée. Relancez avant de continuer.
          </span>
          {failedSaves.map(([key, record]) => (
            <button
              key={key}
              type="button"
              onClick={() => runSave(key, record.comparableId, record.formData)}
              className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-amber-300"
            >
              Relancer
            </button>
          ))}
        </div>
      ) : null}

      <div className={stageGlow} aria-hidden />

      {/* Chrome supérieur : identité + réglages, volontairement discret. */}
      <header className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-5">
        <div className="flex items-center gap-3">
          <Logo onDark={stage === 'dark'} className="h-8 sm:h-9" />
          <span className="hidden text-sm font-medium text-zinc-400 sm:inline stage:text-white/50">
            Rendez-vous vendeur
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStage((s) => (s === 'dark' ? 'light' : 'dark'))}
            className={chromeBtn}
            aria-label={stage === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          >
            {stage === 'dark' ? 'Clair' : 'Sombre'}
          </button>
          <button type="button" onClick={toggleFullscreen} className={chromeBtn}>
            {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
          <Link href={`/builder/${projectId}/presentation`} className={chromeBtn}>
            Quitter
          </Link>
        </div>
      </header>

      {/* Progression : fine, élégante, jamais envahissante. */}
      {!isIntro ? (
        <div className="relative mx-auto mt-4 flex w-full max-w-5xl flex-col gap-1.5 px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-brand-deep/70 stage:text-brand">
              {stepLabel}
            </span>
            <span className="text-xs text-zinc-400 stage:text-white/40">
              {index + 1} / {pages.length}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-zinc-200 stage:bg-white/10">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${((index + 1) / pages.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* La fiche courante. */}
      <main
        key={page.key}
        className={`live-fade-up relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-8 ${
          isPilot ? 'pb-28' : ''
        }`}
      >
        {page.type === 'intro' ? (
          <LivePageIntro
            live={live}
            sellerName={presentation.project.name}
            address={
              [presentation.property?.address, presentation.property?.city]
                .filter(Boolean)
                .join(', ') || null
            }
            onStart={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          />
        ) : page.type === 'subject_property' && presentation.property ? (
          <LivePageProperty
            property={presentation.property}
            summary={live?.sellerSummary ?? null}
            saveAction={saveSummary}
          />
        ) : page.type === 'comparable_competition' && entry && saveResponse ? (
          <LivePageCompetition entry={entry} saveAction={saveResponse} />
        ) : page.type === 'comparable_price' && entry && saveResponse ? (
          <LivePagePrice entry={entry} saveAction={saveResponse} />
        ) : page.type === 'comparable_price_reveal' && entry ? (
          <LivePagePriceRevealPilot
            entry={entry}
            draft={revealDraft}
            onDraftChange={setRevealDraft}
          />
        ) : page.type === 'comparable_duration' && entry && saveResponse ? (
          <LivePageDuration entry={entry} saveAction={saveResponse} />
        ) : page.type === 'dangerous_competitor' && live ? (
          <LivePageDangerous
            comparables={live.comparables}
            summary={live.sellerSummary}
            saveAction={saveSummary}
          />
        ) : page.type === 'seller_perceived_price' && live ? (
          <LivePagePerceived live={live} summary={live.sellerSummary} saveAction={saveSummary} />
        ) : page.type === 'price_analysis' && live ? (
          <LivePageAnalysis live={live} summary={live.sellerSummary} saveAction={saveSummary} />
        ) : page.type === 'conclusion' && live ? (
          <LivePageConclusion live={live} />
        ) : (
          <p className="text-zinc-500 stage:text-white/60">
            Contenu indisponible : préparez le dossier vendeur et ses concurrents dans la
            Préparation.
          </p>
        )}
      </main>

      {/* Navigation : Suivant en évidence, verrouillé tant que la réponse
          attendue n'est pas enregistrée. Masquée sur l'écran-pilote, qui porte sa
          propre barre « Valider et continuer » ancrée à la fenêtre. */}
      {!isIntro && !isPilot ? (
        <footer className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 border-t border-zinc-200 px-4 py-4 sm:px-8 stage:border-white/10">
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className={navBtn}>
            ← Précédent
          </button>
          <button type="button" onClick={() => setIndex(0)} className={chromeBtn}>
            Sommaire
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= pages.length - 1 || !canAdvance}
            className={ctaPrimary}
            title={!canAdvance ? 'Enregistrez la réponse du vendeur pour continuer' : undefined}
          >
            Suivant →
          </button>
        </footer>
      ) : null}

      {/* MISSION 51 §3.1 + §3.3 — barre de l'écran-pilote ANCRÉE À LA FENÊTRE (fixed),
          un seul bouton « Valider et continuer » qui enregistre ET avance : plus de
          « Suivant » distinct du « Enregistrer » où la saisie se perdait (§2.1). */}
      {isPilot ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur stage:border-white/10 stage:bg-brand-deep/95"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            paddingTop: '1rem',
          }}
        >
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
            <button type="button" onClick={() => go(-1)} disabled={index === 0} className={navBtn}>
              ← Précédent
            </button>
            <span className="text-xs text-zinc-400 stage:text-white/40" aria-live="polite">
              {currentSave?.status === 'pending'
                ? 'Enregistrement…'
                : currentSave?.status === 'ok'
                  ? 'Réponse enregistrée'
                  : currentSave?.status === 'failed'
                    ? 'Enregistrement à relancer'
                    : ''}
            </span>
            <button
              type="button"
              onClick={onValidateReveal}
              disabled={index >= pages.length - 1}
              className={ctaPrimary}
            >
              Valider et continuer →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
