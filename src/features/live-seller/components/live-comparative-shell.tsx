'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Logo } from '@/components/brand/logo';
import { persistLiveComparableResponse } from '@/features/live-seller/actions/save-live-comparable-response';
import { persistLiveSellerSummary } from '@/features/live-seller/actions/save-live-seller-summary';
import { deliverLiveFragment } from '@/features/live-seller/actions/deliver-live-fragment';
import { LivePageAnalysis } from '@/features/live-seller/components/live-page-analysis';
import { LivePageCompetition } from '@/features/live-seller/components/live-page-competition';
import { LivePageConclusion } from '@/features/live-seller/components/live-page-conclusion';
import { LivePageDangerous } from '@/features/live-seller/components/live-page-dangerous';
import { LivePageDuration } from '@/features/live-seller/components/live-page-duration';
import { LivePageIntro } from '@/features/live-seller/components/live-page-intro';
import { LivePagePerceived } from '@/features/live-seller/components/live-page-perceived';
import { LivePageProperty } from '@/features/live-seller/components/live-page-property';
import { LivePagePrice } from '@/features/live-seller/components/live-page-price';
import { LivePagePriceRevealPilot } from '@/features/live-seller/components/live-page-price-reveal-pilot';
import {
  chromeBtn,
  ctaPrimary,
  navBtn,
  stageGlow,
  stageRoot,
} from '@/features/live-seller/components/live-stage';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { overlaySellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import type {
  AuthorizedAdvisorRange,
  AuthorizedSellerComparable,
  SellerComparable,
  SellerLiveData,
} from '@/features/live-seller/services/project-live-for-seller';
import type { LiveComparableResponse } from '@/features/live-seller/types';
import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';

export type LiveStageTheme = 'dark' | 'light';

// Live comparative reader — mode présentation. Client-only navigation state
// (page courante, plein écran, thème scène sombre/clair au choix du conseiller).
// Nothing about the source data is editable here; only the seller's Live answers
// are persisted through server actions.
export function LiveComparativeShell({
  projectId,
  live,
  property,
  projectName,
  advisorRange,
  initialIndex = 0,
  initialStage = 'dark',
  logoLightUrl = null,
  logoDarkUrl = null,
}: {
  projectId: string;
  // Donnée PROJETÉE : concurrents neutres tant que non estimés (aucun prix dans la
  // charge), le prix n'apparaît qu'à l'autorisation.
  live: SellerLiveData | null;
  property: SellerPresentationProperty | null;
  projectName: string;
  // Fourchette conseiller — livrée hors de la charge des concurrents (jamais un montant
  // avant l'autorisation côté serveur).
  advisorRange: AuthorizedAdvisorRange | null;
  // Fiche d'ouverture : reprise après un rechargement en plein rendez-vous
  // (paramètre « fiche » de l'URL, écrit ci-dessous), ou choix de l'aperçu design.
  initialIndex?: number;
  // Thème d'ouverture de la scène : sombre en Live réel, au choix dans l'aperçu.
  initialStage?: LiveStageTheme;
  // Mission 55 — logo de l'agence (le vendeur ne doit pas voir le nom d'un autre).
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stage, setStage] = useState<LiveStageTheme>(initialStage);

  type SaveStatus = 'pending' | 'ok' | 'failed';
  type SaveRecord = { status: SaveStatus; retry: () => void; error?: string };
  const [saves, setSaves] = useState<Record<string, SaveRecord>>({});
  // Vrai pendant une transition qui ATTEND la confirmation serveur (quitter 1/2/3/5).
  const [busy, setBusy] = useState(false);
  const [awaitError, setAwaitError] = useState<string | null>(null);
  // Fragments LIVRÉS pendant la séance (jamais dans la charge initiale) : la révélation
  // d'un concurrent (prix), la fourchette conseiller (central).
  const [delivered, setDelivered] = useState<Record<string, AuthorizedSellerComparable>>({});
  const [deliveredRange, setDeliveredRange] = useState<AuthorizedAdvisorRange | null>(null);
  // Réponse concurrent mise à jour côté client APRÈS persistance : écran 2 (base puis
  // graphe — 'no' retire les étapes suivantes) et écran 5 (durée révélée).
  const [responseOverrides, setResponseOverrides] = useState<
    Record<string, LiveComparableResponse>
  >({});
  const mainRef = useRef<HTMLElement | null>(null);

  const hasSubjectProperty = property != null;

  // Concurrents EFFECTIFS : projetés, recouverts des fragments livrés et des réponses
  // mises à jour côté client, sans rechargement.
  const comparables = useMemo<SellerComparable[]>(() => {
    const base = live?.comparables ?? [];
    return base.map((c) => overlaySellerComparable(c, delivered[c.id], responseOverrides[c.id]));
  }, [live, delivered, responseOverrides]);
  const summary = live?.sellerSummary ?? null;
  const navLive = useMemo(() => ({ comparables, sellerSummary: summary }), [comparables, summary]);

  const pages = useMemo(
    () => buildLivePages(navLive, hasSubjectProperty),
    [navLive, hasSubjectProperty],
  );
  const currentIndex = Math.min(index, pages.length - 1);
  const page = pages[currentIndex];
  const entry =
    page.comparableId != null
      ? (comparables.find((c) => c.id === page.comparableId) ?? null)
      : null;
  const authorizedEntry = entry?.authorized ? entry : null;
  const authorizedComparables = comparables.filter(
    (c): c is AuthorizedSellerComparable => c.authorized,
  );
  const effectiveRange = deliveredRange ?? advisorRange;
  const dangerousComparable =
    authorizedComparables.find((c) => c.id === summary?.seller_most_dangerous_comparable_id) ??
    null;

  const isInteractive = page.type !== 'intro' && page.type !== 'conclusion';
  const currentSave = saves[page.key];
  // devine-puis-révèle : la durée observée (5) et le central marché (7) ne se montrent
  // qu'après la réponse du vendeur — jamais à l'arrivée.
  const durationRevealed = authorizedEntry?.response?.seller_estimated_days_on_market != null;
  const rangeRevealed = effectiveRange != null;

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
      setAwaitError(null);
      setIndex((i) => {
        const target = Math.max(0, Math.min(pages.length - 1, i + delta));
        // Fin de séance bloquée tant qu'un enregistrement de fond a échoué.
        if (delta > 0 && pages[target]?.type === 'conclusion' && hasFailedSavesRef.current) {
          return i;
        }
        return target;
      });
    },
    [pages],
  );

  // Enregistrement EN ARRIÈRE-PLAN (avance optimiste), suivi, avec relance.
  const runBackground = useCallback(
    (key: string, save: () => Promise<{ ok: boolean; error?: string }>) => {
      const attempt = () => {
        setSaves((s) => ({ ...s, [key]: { status: 'pending', retry: attempt } }));
        void save()
          .then((r) => {
            if (!r.ok) console.error('[live] enregistrement échoué', { key, error: r.error });
            setSaves((s) => ({
              ...s,
              [key]: { status: r.ok ? 'ok' : 'failed', retry: attempt, error: r.error },
            }));
          })
          .catch((cause) => {
            console.error('[live] enregistrement injoignable', { key, cause });
            setSaves((s) => ({
              ...s,
              [key]: { status: 'failed', retry: attempt, error: 'Réseau indisponible.' },
            }));
          });
      };
      attempt();
    },
    [],
  );

  const harvest = useCallback(() => {
    const form = mainRef.current?.querySelector('form');
    return form ? new FormData(form) : new FormData();
  }, []);

  // « Valider et continuer » — un seul bouton par écran (§3.1). ATTENTES sur quitter
  // 1/2/3/5 (l'écran suivant dépend de la réponse persistée : borne 2.2, affichage) ;
  // avance OPTIMISTE ailleurs (§3.2). Révélation (3) et fourchette (7) LIVRÉES.
  const onValidate = useCallback(async () => {
    if (busy || index >= pages.length - 1) return;
    setAwaitError(null);
    const fd = harvest();

    if (page.type === 'subject_property') {
      setBusy(true);
      const r = await persistLiveSellerSummary(projectId, fd);
      setBusy(false);
      if (r.ok) go(1);
      else setAwaitError(r.error ?? 'Enregistrement impossible. Réessayez.');
      return;
    }
    if (page.type === 'comparable_competition' && entry) {
      setBusy(true);
      const r = await persistLiveComparableResponse(projectId, entry.id, fd);
      setBusy(false);
      if (!r.ok) {
        setAwaitError(r.error ?? 'Enregistrement impossible. Réessayez.');
        return;
      }
      // BASE PUIS GRAPHE : réponse en base d'abord, graphe client ensuite.
      setResponseOverrides((o) => ({
        ...o,
        [entry.id]: {
          ...(entry.response ?? {}),
          seller_serious_competitor: (fd.get('seller_serious_competitor') as string) || null,
          seller_serious_competitor_comment:
            (fd.get('seller_serious_competitor_comment') as string) || null,
        } as LiveComparableResponse,
      }));
      go(1);
      return;
    }
    if (page.type === 'comparable_price' && entry) {
      setBusy(true);
      const r = await deliverLiveFragment(projectId, {
        kind: 'comparable-reveal',
        comparableId: entry.id,
        formData: fd,
      });
      setBusy(false);
      if (!r.ok) {
        setAwaitError(r.error ?? 'Enregistrement impossible. Réessayez.');
        return;
      }
      if (r.fragment.kind === 'comparable') {
        // La révélation arrive AVEC la navigation autorisée : on la fusionne côté client.
        const revealed = r.fragment.comparable;
        setDelivered((d) => ({ ...d, [entry.id]: revealed }));
        go(1);
      }
      return;
    }
    if (page.type === 'comparable_duration' && entry) {
      if (!durationRevealed) {
        setBusy(true);
        const r = await persistLiveComparableResponse(projectId, entry.id, fd);
        setBusy(false);
        if (r.ok) {
          setResponseOverrides((o) => ({
            ...o,
            [entry.id]: {
              ...(entry.response ?? {}),
              seller_estimated_days_on_market:
                Number(fd.get('seller_estimated_days_on_market')) || null,
            } as LiveComparableResponse,
          }));
        } else setAwaitError(r.error ?? 'Enregistrement impossible. Réessayez.');
        return;
      }
      runBackground(page.key, () => persistLiveComparableResponse(projectId, entry.id, fd));
      go(1);
      return;
    }
    if (page.type === 'seller_perceived_price') {
      if (!rangeRevealed) {
        setBusy(true);
        const r = await deliverLiveFragment(projectId, { kind: 'advisor-range', formData: fd });
        setBusy(false);
        if (r.ok && r.fragment.kind === 'advisor-range') setDeliveredRange(r.fragment.advisorRange);
        else if (!r.ok) setAwaitError(r.error ?? 'Enregistrement impossible. Réessayez.');
        return;
      }
      go(1);
      return;
    }
    // OPTIMISTE : 4 révélation, 6 dangereux, 8 analyse.
    if (entry)
      runBackground(page.key, () => persistLiveComparableResponse(projectId, entry.id, fd));
    else runBackground(page.key, () => persistLiveSellerSummary(projectId, fd));
    go(1);
  }, [
    busy,
    index,
    pages.length,
    page.type,
    page.key,
    entry,
    projectId,
    durationRevealed,
    rangeRevealed,
    go,
    runBackground,
    harvest,
  ]);

  // Chaque écran s'ouvre en haut (§3.5) — la fenêtre ET le conteneur plein écran.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    rootRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

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
              onClick={() => record.retry()}
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
          <Logo
            onDark={stage === 'dark'}
            className="h-8 sm:h-9"
            lightSrc={logoLightUrl}
            darkSrc={logoDarkUrl}
          />
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

      {/* La fiche courante. `mainRef` permet à la barre unique de MOISSONNER le
          formulaire de l'écran courant au clic « Valider et continuer ». */}
      <main
        ref={mainRef}
        key={page.key}
        // MISSION 51 §3.3 — le padding-bas doit dégager la barre fixe (≈ 85 px) : on
        // sépare haut et bas (pt-*/pb-*) car un `py-*` responsive écraserait le pb et
        // coupait le bas du contenu (grille comparative illisible). `pb-32` = 128 px,
        // au-dessus de la barre en fenêtre ET en plein écran (safe-area comprise).
        className={`live-fade-up relative mx-auto w-full max-w-5xl flex-1 px-4 pt-6 sm:px-8 sm:pt-8 ${
          isInteractive || page.type === 'conclusion' ? 'pb-32' : 'pb-6 sm:pb-8'
        }`}
      >
        {page.type === 'intro' ? (
          <LivePageIntro
            comparablesCount={live?.comparables.length ?? 0}
            sellerName={projectName}
            address={[property?.address, property?.city].filter(Boolean).join(', ') || null}
            onStart={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
            logoLightUrl={logoLightUrl}
            logoDarkUrl={logoDarkUrl}
          />
        ) : page.type === 'subject_property' && property ? (
          <LivePageProperty property={property} summary={summary} />
        ) : page.type === 'comparable_competition' && entry ? (
          <LivePageCompetition entry={entry} />
        ) : page.type === 'comparable_price' && entry ? (
          <LivePagePrice entry={entry} />
        ) : page.type === 'comparable_price_reveal' && authorizedEntry ? (
          <LivePagePriceRevealPilot entry={authorizedEntry} />
        ) : page.type === 'comparable_duration' && authorizedEntry ? (
          <LivePageDuration entry={authorizedEntry} durationRevealed={durationRevealed} />
        ) : page.type === 'dangerous_competitor' && live ? (
          <LivePageDangerous comparables={authorizedComparables} summary={summary} />
        ) : page.type === 'seller_perceived_price' ? (
          <LivePagePerceived
            competitiveMarketCentral={effectiveRange?.competitiveMarketCentral ?? null}
            revealed={rangeRevealed}
            summary={summary}
          />
        ) : page.type === 'price_analysis' && effectiveRange ? (
          <LivePageAnalysis priceGaps={effectiveRange.priceGaps} summary={summary} />
        ) : page.type === 'conclusion' ? (
          <LivePageConclusion
            projectId={projectId}
            summary={summary}
            advisorRange={effectiveRange}
            dangerous={dangerousComparable}
          />
        ) : (
          <p className="text-zinc-500 stage:text-white/60">
            Contenu indisponible : préparez le dossier vendeur et ses concurrents dans la
            Préparation.
          </p>
        )}
      </main>

      {/* MISSION 51 §3.1/§3.3 — UNE barre ancrée à la fenêtre, UN bouton « Valider et
          continuer » qui enregistre ET avance : plus de « Suivant » distinct du
          « Enregistrer » (§2.1). Attentes sur quitter 1/2/3/5 (bouton occupé) ; avance
          optimiste ailleurs ; libellé « Révéler … » sur la 1re phase des écrans 5 et 7. */}
      {isInteractive ? (
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
            <span
              className={`text-xs ${awaitError ? 'text-red-600 stage:text-red-300' : 'text-zinc-400 stage:text-white/40'}`}
              aria-live="polite"
            >
              {busy
                ? 'Enregistrement…'
                : awaitError
                  ? awaitError
                  : currentSave?.status === 'pending'
                    ? 'Enregistrement…'
                    : currentSave?.status === 'ok'
                      ? 'Réponse enregistrée'
                      : ''}
            </span>
            <button
              type="button"
              onClick={() => void onValidate()}
              disabled={busy || index >= pages.length - 1}
              className={ctaPrimary}
            >
              {page.type === 'comparable_duration' && !durationRevealed
                ? 'Révéler la durée →'
                : page.type === 'seller_perceived_price' && !rangeRevealed
                  ? 'Révéler le positionnement →'
                  : 'Valider et continuer →'}
            </button>
          </div>
        </div>
      ) : null}

      {/* MISSION 53 — la FIN NORMALE du parcours. Le dernier écran mène à la conclusion
          (écran conseiller), distincte de « Quitter » (chrome, en haut) qui sort SANS
          conclure et laisse le dossier dans le Live. On sort du plein écran avant de passer
          à un écran advisor-only que le vendeur ne doit pas voir. */}
      {page.type === 'conclusion' ? (
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
            <Link
              href={`/builder/${projectId}/conclusion`}
              onClick={() => {
                void document.exitFullscreen?.().catch(() => {});
              }}
              className={ctaPrimary}
            >
              Terminer le rendez-vous →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
