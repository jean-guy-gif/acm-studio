'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Logo } from '@/components/brand/logo';
import { persistLiveComparableResponse } from '@/features/live-seller/actions/save-live-comparable-response';
import { persistLiveSellerSummary } from '@/features/live-seller/actions/save-live-seller-summary';
import { deliverLiveFragment } from '@/features/live-seller/actions/deliver-live-fragment';
import { saveAdvisorClosest } from '@/features/live-seller/actions/save-advisor-closest';
import { setLivePresentationMode } from '@/features/live-seller/actions/set-live-presentation-mode';
import { markLiveEnded, markLiveStarted } from '@/features/live-seller/actions/live-timing-actions';
import {
  dangerousChoiceFromForm,
  type DangerousChoice,
} from '@/features/live-seller/services/dangerous-choice';
import { LivePageAnalysis } from '@/features/live-seller/components/live-page-analysis';
import { priceDigits } from '@/features/live-seller/components/price-input';
import { usePhotoPreload } from '@/features/live-seller/components/use-photo-preload';
import { livePhotoPreloadUrls } from '@/features/live-seller/services/photo-preload';
import { createSaveChain } from '@/features/live-seller/services/save-chain';
import { screenEnter } from '@/features/live-seller/services/screen-enter';
import { liveErrorMessage } from '@/features/live-seller/services/live-error-message';
import { LivePageAnalysisPending } from '@/features/live-seller/components/live-page-analysis-pending';
import { LivePageClosing } from '@/features/live-seller/components/live-page-closing';
import { LivePageClosest } from '@/features/live-seller/components/live-page-closest';
import { LivePageCompetition } from '@/features/live-seller/components/live-page-competition';
import { LivePageConclusion } from '@/features/live-seller/components/live-page-conclusion';
import { LivePageDangerous } from '@/features/live-seller/components/live-page-dangerous';
import { LivePageDirect } from '@/features/live-seller/components/live-page-direct';
import { LivePageDpe } from '@/features/live-seller/components/live-page-dpe';
import { LivePageDuration } from '@/features/live-seller/components/live-page-duration';
import { LivePageIntro } from '@/features/live-seller/components/live-page-intro';
import { LiveTextsProvider } from '@/features/live-seller/components/live-texts';
import { setProjectLanguage } from '@/features/projects/actions/set-project-language';
import { offeredLanguages, type ClientLanguage } from '@/lib/client-language';
import { clientTexts, textLanguage, type TextLanguage } from '@/lib/client-texts';
import { LivePageRevised } from '@/features/live-seller/components/live-page-revised';
import { LivePageQuickGuess } from '@/features/live-seller/components/live-page-quick-guess';
import { LivePageQuickReveal } from '@/features/live-seller/components/live-page-quick-reveal';
import { LivePagePerceived } from '@/features/live-seller/components/live-page-perceived';
import { LivePageProperty } from '@/features/live-seller/components/live-page-property';
import { LivePagePrice } from '@/features/live-seller/components/live-page-price';
import { LivePagePriceRevealPilot } from '@/features/live-seller/components/live-page-price-reveal-pilot';
import {
  chromeBtn,
  ctaPrimary,
  errorText,
  navBtn,
  stageGlow,
  stageGlowLayer,
  stageRoot,
} from '@/features/live-seller/components/live-stage';
import {
  buildLivePages,
  indexAfterModeChange,
  type LivePage,
  type LiveRhythm,
} from '@/features/live-seller/services/build-live-pages';
import { invalidatesAnalysis } from '@/features/live-seller/services/analysis-invalidation';
import { guardedSave, type SaveResult } from '@/features/live-seller/services/guarded-save';
import {
  LiveBuyersDot,
  LiveBuyersScreen,
} from '@/features/live-seller/components/live-buyers-badge';
import { showBuyersToSeller } from '@/features/live-seller/actions/show-buyers-to-seller';
import type { LiveBuyersReveal } from '@/features/live-seller/services/live-buyers';
import { livePositionKey } from '@/features/live-seller/services/live-resume';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { pendingBeforeAnalysis } from '@/features/live-seller/services/pending-before-analysis';
import { saveCommercializationPrice } from '@/features/meeting-conclusion/actions/save-commercialization-price';
import { overlaySellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import type {
  AuthorizedAdvisorRange,
  AuthorizedSellerComparable,
  SellerComparable,
  SellerLiveData,
} from '@/features/live-seller/services/project-live-for-seller';
import type { LiveComparableResponse, LiveSellerSummary } from '@/features/live-seller/types';
import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';
import { signalClientError } from '@/lib/app-errors/signal-client-error';

export type LiveStageTheme = 'dark' | 'light';

// Mission 92 — dit au conseiller, dans la barre, quand une réponse partie en fond n'est pas
// arrivée : le passage à « Conclusion » attend, et le bouton relance.

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
  rhythm = 'complete',
  initialStage = 'dark',
  logoLightUrl = null,
  logoDarkUrl = null,
  agencyName = null,
  hasAgreedPrice = false,
  presentationMode = 'interactive',
  buyersReveal = null,
  language: initialLanguage = 'fr',
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
  // Mission 95 — le rythme du Live choisi pour ce dossier (figé une fois le Live commencé).
  rhythm?: LiveRhythm;
  // Thème d'ouverture de la scène : sombre en Live réel, au choix dans l'aperçu.
  initialStage?: LiveStageTheme;
  // Mission 55 — logo de l'agence (le vendeur ne doit pas voir le nom d'un autre) ; à défaut
  // de logo, le NOM de l'agence — jamais Start Academy.
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  agencyName?: string | null;
  // Mission 89 — un prix de commercialisation est-il déjà enregistré pour ce dossier ? Un
  // oui/non, jamais le montant : la question de 1 à 10 ne dit « à ce prix » que s'il y en a un.
  hasAgreedPrice?: boolean;
  // Mission 131 — Live interactif ou présentation directe ; le conseiller en change en cours de
  // route par le menu « Réglages » (ce qui a été répondu est gardé).
  presentationMode?: 'interactive' | 'direct';
  // Mission 133 — les acquéreurs prêts de l'agence, anonymes ; null sous 5 (rien ne part alors).
  buyersReveal?: LiveBuyersReveal | null;
  // Mission 140 — la langue du dossier : celle de tout ce que voit le vendeur ; le conseiller la
  // change en direct dans « Réglages » (ce qui a été répondu est gardé).
  language?: ClientLanguage;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stage, setStage] = useState<LiveStageTheme>(initialStage);
  // Mission 131 — la façon de présenter, et le menu « Réglages » du conseiller.
  const [mode, setMode] = useState<'interactive' | 'direct'>(presentationMode);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<TextLanguage>(textLanguage(initialLanguage));
  const texts = clientTexts(language);
  const t = texts.live.shell;
  // Un message d'erreur du serveur est écrit en français : devant un vendeur d'une autre langue,
  // la scène dit le sien ; la perte de connexion garde son sens.
  // Mission 144 — trois messages d'échec, qui disent quoi faire ; jamais le détail du serveur. Le
  // message nomme le bouton présent à l'écran : celui de la barre, ou celui qu'on a touché.
  const barLabelRef = useRef<string>(t.validate);
  const errorFor = useCallback(
    (error: string | undefined, fallback: string, buttonLabel?: string): string =>
      liveErrorMessage(error, language, t, fallback, buttonLabel ?? barLabelRef.current),
    [language, t],
  );
  // Mission 133 — l'écran des acquéreurs prêts, ouvert par « Montrer au vendeur ».
  const [buyersScreen, setBuyersScreen] = useState(false);
  const closeBuyersScreen = useCallback(() => setBuyersScreen(false), []);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  // Le concurrent le plus proche, proposé par le conseiller en directe (jamais le choix du vendeur).
  const [closestId, setClosestId] = useState<string | null>(
    live?.sellerSummary?.advisor_closest_comparable_id ?? null,
  );
  const directRequestedRef = useRef<Set<string>>(new Set());

  type SaveStatus = 'pending' | 'ok' | 'failed';
  type SaveRecord = { status: SaveStatus; retry: () => void; error?: string };
  const [saves, setSaves] = useState<Record<string, SaveRecord>>({});
  // Vrai pendant une transition qui ATTEND la confirmation serveur (quitter 1/2/3/5).
  const [busy, setBusy] = useState(false);
  // Mission 144 — vrai pendant ce que « Valider » attend lui-même (une révélation) : le bouton
  // reste plein et se voit pressé ; toute autre attente le désactive, comme avant.
  const [validating, setValidating] = useState(false);
  // Mission 144 — la file des enregistrements de fond : dans l'ordre ; une révélation la solde.
  const retriesRef = useRef(new Map<string, () => void>());
  // La clé de l'écran de la valeur perçue (`build-live-pages`) : son échec retient les révélations.
  const PERCEIVED_PAGE_KEY = 'seller_perceived_price';
  const [saveChain] = useState(() =>
    createSaveChain({
      onStart: (key) => {
        const retry = () => retriesRef.current.get(key)?.();
        setSaves((s) => ({ ...s, [key]: { status: 'pending', retry } }));
      },
      onResult: (key, r) => {
        if (!r.ok) {
          console.error('[live] enregistrement échoué', { key, error: r.error });
          // Mission 100 — au journal des erreurs ; l'écran du vendeur ne change pas (M92).
          signalClientError('live', `Enregistrement de fond échoué (${key}) : ${r.error ?? ''}`);
        }
        const retry = () => retriesRef.current.get(key)?.();
        setSaves((s) => ({
          ...s,
          [key]: { status: r.ok ? 'ok' : 'failed', retry, error: r.error },
        }));
      },
    }),
  );
  const [awaitError, setAwaitError] = useState<string | null>(null);
  // Fragments LIVRÉS pendant la séance (jamais dans la charge initiale) : la révélation
  // d'un concurrent (prix), la fourchette conseiller (central). `range` part de ce que le
  // serveur a autorisé à l'ouverture (reprise après rechargement).
  const [delivered, setDelivered] = useState<Record<string, AuthorizedSellerComparable>>({});
  const [range, setRange] = useState<AuthorizedAdvisorRange | null>(advisorRange);
  // Mission 82 — le prix du vendeur, enregistré en début de rendez-vous : gardé côté client
  // pour que la page le réaffiche si on y revient (la charge d'ouverture ne le porte pas).
  const [perceivedOverride, setPerceivedOverride] = useState<number | null>(null);
  // Mission 92 — ce prix ne se donne qu'une fois : le montant tapé est redit en grand, et
  // n'est enregistré qu'au second « Valider » (une faute de frappe se voit avant).
  const [perceivedToConfirm, setPerceivedToConfirm] = useState<number | null>(null);
  // Mission 94 — le prix que le vendeur reformule après avoir vu le marché : même rappel en
  // grand avant d'enregistrer, et gardé côté client une fois en base.
  const [revisedOverride, setRevisedOverride] = useState<number | null>(null);
  const [revisedToConfirm, setRevisedToConfirm] = useState<number | null>(null);
  // Le concurrent le plus dangereux, choisi pendant la séance : enregistré en fond, il n'est
  // pas dans la charge d'ouverture — « Conclusion » le lit ici.
  const [dangerousOverride, setDangerousOverride] = useState<DangerousChoice | null>(null);
  // Réponse concurrent mise à jour côté client APRÈS persistance : écran 2 (base puis
  // graphe — 'no' retire les étapes suivantes) et écran 5 (durée révélée).
  const [responseOverrides, setResponseOverrides] = useState<
    Record<string, LiveComparableResponse>
  >({});
  const mainRef = useRef<HTMLElement | null>(null);
  // Mission 143 (I6) — un prix requis encore vide sur l'écran : « Valider » reste grisé.
  const [priceMissing, setPriceMissing] = useState(false);
  const checkPriceMissing = useCallback(() => {
    const required = mainRef.current?.querySelectorAll<HTMLInputElement>(
      'input[data-price-required="true"]',
    );
    setPriceMissing([...(required ?? [])].some((input) => Number(priceDigits(input.value)) === 0));
  }, []);

  const hasSubjectProperty = property != null;

  // Mission 81 — un prix de commercialisation saisi mais pas enregistré est enregistré avant
  // de quitter l'écran du prix. Mission 85 — c'est « Valider et continuer » qui le fait, la
  // question de 1 à 10 venant ensuite. Un échec retient sur l'écran, avec son message.
  const router = useRouter();
  const pendingPriceRef = useRef<string | null>(null);
  // Le prix enregistré pendant cette séance : rappelé sur l'écran de la note, rien d'autre.
  const [agreedPrice, setAgreedPrice] = useState<number | null>(null);
  const handlePendingPriceChange = useCallback((typed: string | null) => {
    pendingPriceRef.current = typed;
    setAwaitError(null);
  }, []);
  const handlePriceSaved = useCallback((saved: string) => {
    const price = Number(saved);
    setAgreedPrice(Number.isFinite(price) && price > 0 ? price : null);
  }, []);

  // Mission 85 — la note de 1 à 10 donnée après le prix. Chaque chiffre touché part en fond,
  // l'un après l'autre (la première note doit arriver avant la suivante) ; « Terminer le
  // rendez-vous » enregistre l'état final, réponse comprise, avant d'ouvrir la conclusion.
  // Sans note, il n'enregistre rien : le rendez-vous ne se bloque jamais (M81).
  const [closing, setClosing] = useState(() => ({
    first: live?.sellerSummary?.seller_launch_readiness_first ?? null,
    last: live?.sellerSummary?.seller_launch_readiness_last ?? null,
    missing: live?.sellerSummary?.seller_launch_readiness_missing ?? '',
  }));
  const closingSavesRef = useRef<Promise<void>>(Promise.resolve());
  // Où en est l'enregistrement de fond de la note : la barre le dit au conseiller (M51).
  const [closingSave, setClosingSave] = useState<'pending' | 'ok' | 'failed' | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const handleClosingScore = (score: number) => {
    const first = closing.first ?? score;
    setClosing((c) => ({ ...c, first, last: score }));
    setFinishError(null);
    const formData = new FormData();
    formData.set('seller_launch_readiness_first', String(first));
    formData.set('seller_launch_readiness_last', String(score));
    // La réponse déjà notée part avec le chiffre : passer de 7 à 10 ne la laisse pas en l'air.
    formData.set('seller_launch_readiness_missing', closing.missing);
    setClosingSave('pending');
    closingSavesRef.current = closingSavesRef.current
      .then(() => persistLiveSellerSummary(projectId, formData))
      .then(
        (result) => setClosingSave(result.ok ? 'ok' : 'failed'),
        () => setClosingSave('failed'),
      );
  };
  // Mission 92 — la tablette est encore tournée vers le vendeur : la fin du Live ouvre un
  // écran neutre (« Merci »), jamais l'écran conseiller de conclusion.
  const thanksHref = `/live/${projectId}/merci`;
  // « Terminer le rendez-vous » : la note d'abord (les chiffres déjà partis en fond, puis l'état
  // final), ensuite l'heure de fin du Live (mission 95). Un seul enregistrement protégé : un
  // échec de la note rend le bouton, avec son message. L'heure de fin, elle, est une mesure —
  // qu'elle ne s'écrive pas n'empêche jamais de terminer.
  const finishMeeting = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void finish();
  };
  const finish = async () => {
    if (finishing) {
      return;
    }
    setFinishError(null);
    const hasNote = closing.first != null && closing.last != null;
    const formData = new FormData();
    if (hasNote) {
      formData.set('seller_launch_readiness_first', String(closing.first));
      formData.set('seller_launch_readiness_last', String(closing.last));
      formData.set('seller_launch_readiness_missing', closing.missing);
    }
    const result = await guardedSave(
      () =>
        (hasNote
          ? closingSavesRef.current.then(() => persistLiveSellerSummary(projectId, formData))
          : Promise.resolve<SaveResult>({ ok: true })
        ).then((saved) =>
          saved.ok
            ? markLiveEnded(projectId).then(
                () => saved,
                () => saved,
              )
            : saved,
        ),
      { setBusy: setFinishing },
    );
    if (!result.ok) {
      setFinishError(errorFor(result.error, t.noteFailed, t.finish));
      return;
    }
    void document.exitFullscreen?.().catch(() => {});
    router.push(thanksHref);
  };

  // Concurrents EFFECTIFS : projetés, recouverts des fragments livrés et des réponses
  // mises à jour côté client, sans rechargement.
  const comparables = useMemo<SellerComparable[]>(() => {
    const base = live?.comparables ?? [];
    return base.map((c) => overlaySellerComparable(c, delivered[c.id], responseOverrides[c.id]));
  }, [live, delivered, responseOverrides]);
  const summary = useMemo<LiveSellerSummary | null>(() => {
    const base = live?.sellerSummary ?? null;
    if (perceivedOverride == null && dangerousOverride == null && revisedOverride == null) {
      return base;
    }
    return {
      ...(base ?? {}),
      ...(perceivedOverride == null ? {} : { seller_perceived_property_price: perceivedOverride }),
      ...(revisedOverride == null ? {} : { seller_revised_property_price: revisedOverride }),
      ...(dangerousOverride ?? {}),
    } as LiveSellerSummary;
  }, [live, perceivedOverride, dangerousOverride, revisedOverride]);
  const navLive = useMemo(() => ({ comparables, sellerSummary: summary }), [comparables, summary]);

  const pages = useMemo(
    () => buildLivePages(navLive, hasSubjectProperty, rhythm, mode),
    [navLive, hasSubjectProperty, rhythm, mode],
  );
  const currentIndex = Math.min(index, pages.length - 1);
  const page = pages[currentIndex];
  // Mission 144 — toutes les photos du Live, dès l'introduction : celles déjà livrées, rien d'autre.
  const preloadUrls = useMemo(
    () => livePhotoPreloadUrls(pages, property?.photoUrls ?? [], comparables),
    [pages, property, comparables],
  );
  const photosPreloaded = usePhotoPreload(preloadUrls);
  // Mission 144 — l'entrée d'un écran, posée AVANT qu'il soit peint : rien entre deux écrans du même
  // concurrent, un fondu bref depuis 60 % au changement de concurrent (jamais un écran transparent).
  const previousPageRef = useRef<LivePage | null>(null);
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (main && screenEnter(previousPageRef.current, page) === 'switch') {
      main.classList.add('live-enter');
    }
    previousPageRef.current = page;
  }, [page]);
  // Mission 143 (I6) — l'écran vient de changer : un prix requis s'y trouve-t-il, vide ?
  useEffect(() => {
    const frame = requestAnimationFrame(checkPriceMissing);
    return () => cancelAnimationFrame(frame);
  }, [page.key, checkPriceMissing]);
  const entry =
    page.comparableId != null
      ? (comparables.find((c) => c.id === page.comparableId) ?? null)
      : null;
  const authorizedEntry = entry?.authorized ? entry : null;
  const authorizedComparables = comparables.filter(
    (c): c is AuthorizedSellerComparable => c.authorized,
  );
  const effectiveRange = range;
  // Mission 82 — ce qui reste à passer avant « Analyse des prix » (étape sautée au clavier).
  const pendingSteps = useMemo(
    () =>
      pendingBeforeAnalysis(
        pages,
        comparables.map((entry) => ({
          ...entry,
          neutralLabel: neutralComparableLabel(entry, language),
        })),
        summary,
        language,
      ),
    [pages, comparables, summary, language],
  );
  const dangerousComparable =
    authorizedComparables.find((c) => c.id === summary?.seller_most_dangerous_comparable_id) ??
    null;
  // Mission 131 — à défaut du choix du vendeur, le bien proposé par le conseiller en directe.
  const closestComparable = authorizedComparables.find((c) => c.id === closestId) ?? null;
  const closestCandidates = authorizedComparables.filter(
    (c) => c.response?.seller_serious_competitor !== 'no',
  );

  const isClosingAct = page.type === 'conclusion' || page.type === 'closing_question';
  const isInteractive = page.type !== 'intro' && !isClosingAct;
  const currentSave = saves[page.key];
  // devine-puis-révèle : la durée observée ne se montre qu'après la réponse du vendeur —
  // jamais à l'arrivée. Le central marché, lui, n'arrive que sur « Analyse des prix ».
  const durationRevealed =
    authorizedEntry?.response?.seller_estimated_days_on_market != null &&
    authorizedEntry.marketDuration != null;
  // Mission 95 — écran 2 du rythme accéléré : reste-t-il une durée à deviner avant de la voir ?
  const quickDurationPending =
    page.type === 'comparable_quick_reveal' &&
    authorizedEntry != null &&
    authorizedEntry.durationKnown &&
    !durationRevealed;

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
      setPerceivedToConfirm(null);
      setRevisedToConfirm(null);
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

  // Mission 131 — en présentation directe, il n'y a pas de note de 1 à 10 : la conclusion est le
  // dernier écran, et c'est elle qui termine le rendez-vous.
  const advanceFromPrice = () => {
    if (currentIndex >= pages.length - 1) {
      void finish();
    } else {
      go(1);
    }
  };
  const leavePriceScreen = async () => {
    if (busy) return;
    setAwaitError(null);
    const typed = pendingPriceRef.current;
    if (typed == null) {
      advanceFromPrice();
      return;
    }
    const formData = new FormData();
    formData.set('commercialization_price', typed);
    const result = await guardedSave(() => saveCommercializationPrice(projectId, formData), {
      setBusy,
    });
    if (!result.ok) {
      setAwaitError(errorFor(result.error, t.saveFailed));
      return;
    }
    pendingPriceRef.current = null;
    handlePriceSaved(typed);
    advanceFromPrice();
  };

  // Enregistrement EN ARRIÈRE-PLAN (avance optimiste), suivi, avec relance. Mission 144 — dans la
  // file, dans l'ordre ; son suivi (« Relancer », M92) est tenu par la file elle-même, relances
  // faites avant une révélation comprises.
  const runBackground = useCallback(
    (key: string, save: () => Promise<{ ok: boolean; error?: string }>) => {
      const attempt = () => {
        void saveChain.run(key, save);
      };
      retriesRef.current.set(key, attempt);
      attempt();
    },
    [saveChain],
  );

  // Mission 131 — un concurrent en présentation directe : le fait « montré » est enregistré, puis
  // son prix livré par la voie gardée. Demandé une fois à l'arrivée sur son écran ; un échec se
  // relance par « Valider et continuer ».
  const showDirectly = useCallback(
    async (comparableId: string) => {
      directRequestedRef.current.add(comparableId);
      const r = await guardedSave(
        () => deliverLiveFragment(projectId, { kind: 'comparable-direct', comparableId }),
        { setBusy },
      );
      if (!r.ok) {
        directRequestedRef.current.delete(comparableId);
        setAwaitError(errorFor(r.error, t.saveFailed));
        return;
      }
      if (r.fragment.kind === 'comparable') {
        const revealed = r.fragment.comparable;
        setDelivered((d) => ({ ...d, [comparableId]: revealed }));
      }
    },
    [projectId, errorFor, t],
  );
  // À livrer : le prix pas encore montré, ou — deviné avant le passage en directe — la durée.
  const directPendingId =
    page.type === 'comparable_direct' &&
    entry != null &&
    (!entry.authorized || (entry.durationKnown && entry.marketDuration == null))
      ? entry.id
      : null;
  useEffect(() => {
    if (directPendingId == null || directRequestedRef.current.has(directPendingId)) return;
    void showDirectly(directPendingId);
  }, [directPendingId, showDirectly]);

  const pickClosest = async (comparableId: string | null) => {
    const previous = closestId;
    setClosestId(comparableId);
    setAwaitError(null);
    const r = await guardedSave(() => saveAdvisorClosest(projectId, comparableId), { setBusy });
    if (!r.ok) {
      setClosestId(previous);
      setAwaitError(errorFor(r.error, t.saveFailed));
    }
  };

  // Mission 131 — « Passer en présentation directe » / « Reprendre le Live interactif » : enregistré
  // sur le dossier d'abord ; on reste sur le même écran (ou le premier du même concurrent).
  const switchMode = async (next: 'interactive' | 'direct') => {
    if (switching) return;
    setMenuError(null);
    const r = await guardedSave(() => setLivePresentationMode(projectId, next), {
      setBusy: setSwitching,
    });
    if (!r.ok) {
      setMenuError(r.error ?? 'Le changement n’a pas pu être enregistré.');
      return;
    }
    const nextPages = buildLivePages(navLive, hasSubjectProperty, rhythm, next);
    setAwaitError(null);
    setIndex(indexAfterModeChange(page, currentIndex, nextPages));
    setMode(next);
    setMenuOpen(false);
  };

  // Mission 140 — la langue du vendeur, changée en direct : enregistrée sur le dossier, les écrans
  // se relisent aussitôt ; ce qui a été répondu est gardé.
  const [languageSwitching, setLanguageSwitching] = useState(false);
  const switchLanguage = async (next: TextLanguage) => {
    if (languageSwitching) return;
    setMenuError(null);
    const r = await guardedSave(() => setProjectLanguage(projectId, next), {
      setBusy: setLanguageSwitching,
    });
    if (!r.ok) {
      setMenuError(r.error ?? 'Le changement n’a pas pu être enregistré.');
      return;
    }
    setLanguage(next);
    setAwaitError(null);
    setMenuOpen(false);
  };

  const harvest = useCallback(() => {
    const form = mainRef.current?.querySelector('form');
    return form ? new FormData(form) : new FormData();
  }, []);

  // « Valider et continuer » — un seul bouton par écran (§3.1). ATTENTES sur quitter
  // 1/2/3/5 (l'écran suivant dépend de la réponse persistée : borne 2.2, affichage) ;
  // avance OPTIMISTE ailleurs (§3.2). Révélation (3) LIVRÉE ; fourchette LIVRÉE à l'entrée
  // de « Analyse des prix » (mission 82), jamais avant.
  const onValidate = useCallback(async () => {
    if (busy || index >= pages.length - 1) return;
    setAwaitError(null);
    const fd = harvest();
    // Mission 112 — un « Non » dit après coup retire ce concurrent de la bande (M108) : la bande
    // déjà livrée est oubliée, et redemandée au serveur en arrivant sur « Analyse des prix ».
    if (range != null && invalidatesAnalysis(fd)) setRange(null);
    const entersAnalysis = pages[index + 1]?.type === 'price_analysis';
    // Enregistre le formulaire de l'écran, puis demande la fourchette : le serveur ne la
    // livre que si le prix du vendeur est en base et que chaque concurrent est estimé.
    const deliverRange = (): Promise<SaveResult> =>
      deliverLiveFragment(projectId, { kind: 'advisor-range', formData: fd }).then((r) => {
        if (!r.ok) return { ok: false, error: r.error };
        if (r.fragment.kind === 'advisor-range') setRange(r.fragment.advisorRange);
        return { ok: true };
      });
    // Le choix du concurrent le plus dangereux, reporté dans le résumé tenu par le navigateur.
    const keepDangerousChoice = () => {
      if (page.type === 'dangerous_competitor') {
        setDangerousOverride(
          dangerousChoiceFromForm(
            fd,
            comparables.map((c) => c.id),
          ),
        );
      }
    };
    // Mission 89 — tout enregistrement attendu par le bouton est protégé : quoi qu'il arrive,
    // le bouton redevient actif, avec « Connexion perdue — touchez Valider pour réessayer ».
    // Mission 144 — jamais avant les enregistrements de fond qui le précèdent : la file est soldée
    // (vidée, ses échecs relancés une fois). Le prix du vendeur manque encore en base : rien n'est
    // révélé, et l'écran dit le refus du serveur (M82). Un autre échec ne retient pas la révélation :
    // il reste sous « Relancer », et retient la Conclusion comme avant (M92).
    const awaited = <T extends SaveResult>(save: () => Promise<T>) =>
      guardedSave(
        () =>
          saveChain.settle().then((missing) => {
            const perceived = missing.find((failure) => failure.key === PERCEIVED_PAGE_KEY);
            return perceived
              ? ({ ok: false, error: perceived.error ?? t.saveFailed } as unknown as T)
              : save();
          }),
        {
          setBusy: (pending) => {
            setBusy(pending);
            setValidating(pending);
          },
        },
      );

    if (page.type === 'comparable_direct' && entry) {
      if (entry.authorized) {
        go(1);
      } else {
        void showDirectly(entry.id);
      }
      return;
    }
    if (page.type === 'advisor_closest') {
      if (entersAnalysis && range == null && pendingSteps.length === 0) {
        const r = await awaited(deliverRange);
        if (!r.ok) {
          setAwaitError(errorFor(r.error, t.saveFailed));
          return;
        }
      }
      go(1);
      return;
    }
    // Mission 131 — en directe, « Votre bien » ne demande rien : rien à enregistrer.
    if (page.type === 'subject_property' && mode === 'direct') {
      go(1);
      return;
    }
    // Mission 144 — « Votre bien » s'enregistre en fond, dans la file (décision de Jean-Guy, 07/11).
    if (page.type === 'subject_property') {
      runBackground(page.key, () => persistLiveSellerSummary(projectId, fd));
      go(1);
      return;
    }
    if (page.type === 'comparable_competition' && entry) {
      // Mission 144 — en fond, dans la file : la devinette qui suit l'attend avant sa révélation.
      runBackground(page.key, () => persistLiveComparableResponse(projectId, entry.id, fd));
      // Seuls les champs de CET écran : une copie de toute la réponse figerait ici une durée
      // ou un prix encore vides, qui écraseraient ensuite la révélation livrée par le serveur.
      setResponseOverrides((o) => ({
        ...o,
        [entry.id]: {
          ...(o[entry.id] ?? {}),
          seller_serious_competitor: (fd.get('seller_serious_competitor') as string) || null,
          seller_serious_competitor_comment:
            (fd.get('seller_serious_competitor_comment') as string) || null,
        } as LiveComparableResponse,
      }));
      go(1);
      return;
    }
    if (page.type === 'comparable_price' && entry) {
      // Mission 92 — devinette déjà donnée et prix déjà livré : on avance, sans rien réécrire.
      if (entry.authorized && entry.response?.seller_estimated_listing_price != null) {
        go(1);
        return;
      }
      const r = await awaited(() =>
        deliverLiveFragment(projectId, {
          kind: 'comparable-reveal',
          comparableId: entry.id,
          formData: fd,
        }),
      );
      if (!r.ok) {
        setAwaitError(errorFor(r.error, t.saveFailed));
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
        // Mission 95 — la durée observée n'est livrée par le serveur qu'une fois la durée
        // devinée enregistrée : même voie gardée que le prix.
        const r = await awaited(() =>
          deliverLiveFragment(projectId, {
            kind: 'comparable-reveal',
            comparableId: entry.id,
            formData: fd,
          }),
        );
        if (!r.ok) {
          setAwaitError(errorFor(r.error, t.saveFailed));
          return;
        }
        if (r.fragment.kind === 'comparable') {
          const revealed = r.fragment.comparable;
          if (revealed.response?.seller_estimated_days_on_market == null) {
            setAwaitError(t.durationMissing);
            return;
          }
          setDelivered((d) => ({ ...d, [entry.id]: revealed }));
        }
        return;
      }
      runBackground(page.key, () => persistLiveComparableResponse(projectId, entry.id, fd));
      go(1);
      return;
    }
    // MISSION 95 — rythme accéléré, écran 1 : le sérieux et la devinette du prix, enregistrés
    // ensemble. « Non » dispense de deviner (et n'a pas d'écran 2) ; sinon la devinette est
    // demandée, et le prix n'est livré qu'une fois celle-ci en base.
    if (page.type === 'comparable_quick_guess' && entry) {
      const serious = String(fd.get('seller_serious_competitor') ?? '');
      const alreadyGuessed =
        entry.authorized && entry.response?.seller_estimated_listing_price != null;
      if (alreadyGuessed || serious === 'no') {
        // Mission 104 — « Non » : le prix tapé n'est pas envoyé (le serveur l'ignore aussi).
        if (serious === 'no') {
          fd.delete('seller_estimated_listing_price');
        }
        const r = await awaited(() => persistLiveComparableResponse(projectId, entry.id, fd));
        if (!r.ok) {
          setAwaitError(errorFor(r.error, t.saveFailed));
          return;
        }
        if (serious !== '') {
          // Seul le champ de cet écran (voir plus haut) : en revenant ici après la révélation
          // du prix, la durée encore vide ne doit pas être figée par-dessus sa révélation.
          setResponseOverrides((o) => ({
            ...o,
            [entry.id]: {
              ...(o[entry.id] ?? {}),
              seller_serious_competitor: serious,
            } as LiveComparableResponse,
          }));
        }
        go(1);
        return;
      }
      const guess = Number(String(fd.get('seller_estimated_listing_price') ?? '').trim());
      if (!Number.isFinite(guess) || guess <= 0) {
        setAwaitError(t.priceGuessMissing);
        return;
      }
      const r = await awaited(() =>
        deliverLiveFragment(projectId, {
          kind: 'comparable-reveal',
          comparableId: entry.id,
          formData: fd,
        }),
      );
      if (!r.ok) {
        setAwaitError(errorFor(r.error, t.saveFailed));
        return;
      }
      if (r.fragment.kind === 'comparable') {
        const revealed = r.fragment.comparable;
        setDelivered((d) => ({ ...d, [entry.id]: revealed }));
        go(1);
      }
      return;
    }
    // Écran 2 : la durée se devine, puis se révèle à sa place — livrée par le serveur une
    // fois la devinette en base. Sans durée connue, ou déjà révélée : on avance.
    if (page.type === 'comparable_quick_reveal' && entry) {
      if (!quickDurationPending) {
        go(1);
        return;
      }
      const days = String(fd.get('seller_estimated_days_on_market') ?? '').trim();
      if (days === '' || !Number.isFinite(Number(days)) || Number(days) < 0) {
        setAwaitError(t.durationMissing);
        return;
      }
      const r = await awaited(() =>
        deliverLiveFragment(projectId, {
          kind: 'comparable-reveal',
          comparableId: entry.id,
          formData: fd,
        }),
      );
      if (!r.ok) {
        setAwaitError(errorFor(r.error, t.saveFailed));
        return;
      }
      if (r.fragment.kind === 'comparable') {
        const revealed = r.fragment.comparable;
        setDelivered((d) => ({ ...d, [entry.id]: revealed }));
      }
      return;
    }
    if (page.type === 'seller_perceived_price') {
      // Mission 92 — déjà donné : il ne se réécrit pas. On avance (ou l'on demande la
      // fourchette, plus bas, quand « Analyse des prix » suit directement).
      const alreadyGiven = summary?.seller_perceived_property_price != null;
      if (alreadyGiven && !(entersAnalysis && range == null && pendingSteps.length === 0)) {
        go(1);
        return;
      }
      if (!alreadyGiven) {
        const raw = String(fd.get('seller_perceived_property_price') ?? '').trim();
        const typed = raw === '' ? Number.NaN : Number(raw);
        if (!Number.isFinite(typed) || typed <= 0) {
          setAwaitError(t.perceivedMissing);
          return;
        }
        // Premier « Valider » : l'écran redit le montant en grand. Le second l'enregistre.
        if (perceivedToConfirm !== typed) {
          setPerceivedToConfirm(typed);
          return;
        }
        // Sans concurrent, « Analyse des prix » suit directement : la fourchette se livre ici.
        if (entersAnalysis) {
          const r = await awaited(deliverRange);
          if (!r.ok) {
            setAwaitError(errorFor(r.error, t.saveFailed));
            return;
          }
        } else {
          // Mission 144 — en fond, dans la file : le premier concurrent l'attend (M89).
          runBackground(page.key, () => persistLiveSellerSummary(projectId, fd));
        }
        setPerceivedOverride(typed);
        go(1);
        return;
      }
    }
    // Mission 94 — Acte 5 : le vendeur reformule son prix avant l'analyse. Facultatif ; donné,
    // il est redit en grand, puis enregistré avec la demande de fourchette (ou seul, s'il reste
    // une étape à passer). Déjà donné : on avance sans rien réécrire.
    if (page.type === 'seller_revised_price') {
      const alreadyGiven = summary?.seller_revised_property_price != null;
      const canDeliver = entersAnalysis && range == null && pendingSteps.length === 0;
      if (!alreadyGiven) {
        const raw = String(fd.get('seller_revised_property_price') ?? '').trim();
        const typed = raw === '' ? Number.NaN : Number(raw);
        if (!Number.isFinite(typed) || typed <= 0) {
          setAwaitError(t.revisedMissing);
          return;
        }
        if (revisedToConfirm !== typed) {
          setRevisedToConfirm(typed);
          return;
        }
        const r = await awaited(() =>
          canDeliver ? deliverRange() : persistLiveSellerSummary(projectId, fd),
        );
        if (!r.ok) {
          setAwaitError(errorFor(r.error, t.saveFailed));
          return;
        }
        setRevisedOverride(typed);
        go(1);
        return;
      }
      if (!canDeliver) {
        go(1);
        return;
      }
    }
    // Une étape sautée : on n'insiste pas ici, « Analyse des prix » dira ce qui reste à passer.
    if (entersAnalysis && range == null && pendingSteps.length === 0) {
      const r = await awaited(deliverRange);
      if (r.ok) {
        // « Le concurrent le plus dangereux » précède « Analyse des prix » : c'est par ici
        // que son formulaire s'enregistre le plus souvent.
        keepDangerousChoice();
        go(1);
      } else setAwaitError(errorFor(r.error, t.saveFailed));
      return;
    }
    // Mission 80 — « Le DPE face au marché » ne recueille aucune réponse : on avance.
    if (page.type === 'dpe_market') {
      go(1);
      return;
    }
    // OPTIMISTE : révélation, concurrent le plus dangereux (fourchette déjà livrée), analyse.
    if (entry)
      runBackground(page.key, () => persistLiveComparableResponse(projectId, entry.id, fd));
    else {
      keepDangerousChoice();
      runBackground(page.key, () => persistLiveSellerSummary(projectId, fd));
    }
    go(1);
  }, [
    busy,
    index,
    pages,
    page.type,
    page.key,
    entry,
    projectId,
    durationRevealed,
    quickDurationPending,
    range,
    summary,
    perceivedToConfirm,
    revisedToConfirm,
    comparables,
    pendingSteps,
    go,
    runBackground,
    saveChain,
    harvest,
    showDirectly,
    mode,
    errorFor,
    t,
  ]);

  // Mission 94 — « Passer » : le vendeur ne reformule pas son prix. Rien n'est enregistré ; la
  // fourchette se demande quand même (formulaire vide), puisque « Analyse des prix » suit.
  const skipRevisedPrice = async () => {
    if (busy) return;
    setAwaitError(null);
    if (range == null && pendingSteps.length === 0) {
      const r = await guardedSave(
        () => deliverLiveFragment(projectId, { kind: 'advisor-range', formData: new FormData() }),
        { setBusy },
      );
      if (!r.ok) {
        setAwaitError(errorFor(r.error, t.analysisFailed, t.skip));
        return;
      }
      if (r.fragment.kind === 'advisor-range') setRange(r.fragment.advisorRange);
    }
    go(1);
  };

  // Arrivée sur « Analyse des prix » sans passer par « Valider et continuer » alors que tout
  // est passé : la fourchette se demande ici, par la même voie gardée côté serveur.
  const showAnalysis = async () => {
    if (busy) return;
    setAwaitError(null);
    const r = await guardedSave(
      () => deliverLiveFragment(projectId, { kind: 'advisor-range', formData: new FormData() }),
      { setBusy },
    );
    if (r.ok && r.fragment.kind === 'advisor-range') setRange(r.fragment.advisorRange);
    else if (!r.ok)
      setAwaitError(errorFor(r.error, t.analysisFailed, texts.live.analysis.showAnalysis));
  };

  // Mission 89 — l'appareil du conseiller garde le numéro de l'écran courant (rien du dossier) :
  // « Reprendre », sur la liste du Live, rouvre exactement là. Le serveur borne de toute façon.
  useEffect(() => {
    try {
      window.localStorage.setItem(livePositionKey(projectId), String(currentIndex));
    } catch {
      // Stockage refusé (navigation privée) : la reprise se fera d'après les réponses.
    }
  }, [projectId, currentIndex]);

  // Mission 95 — le Live relève son heure de début au premier écran qui suit l'introduction
  // (une fois par ouverture ; le serveur n'écrit que si aucun début n'est noté, et la base
  // garde le premier : une reprise après une pause ne le remet pas à zéro).
  const startMarkedRef = useRef(false);
  useEffect(() => {
    if (currentIndex >= 1 && !startMarkedRef.current) {
      startMarkedRef.current = true;
      void markLiveStarted(projectId).catch(() => {});
    }
  }, [projectId, currentIndex]);

  // Mission 89 — une réponse qui n'est pas (encore) en base : enregistrement de fond en cours
  // ou en échec, note de 1 à 10 comprise. Quitter ou recharger le dit avant de la perdre.
  const hasUnsavedAnswers =
    Object.values(saves).some((record) => record.status !== 'ok') ||
    closingSave === 'pending' ||
    closingSave === 'failed';
  useEffect(() => {
    if (!hasUnsavedAnswers) {
      return;
    }
    // Rechargement ou fermeture de l'onglet : seul le navigateur peut demander confirmation.
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedAnswers]);

  // « Quitter » demande confirmation DANS l'écran (pas de boîte du navigateur), puis ouvre un
  // écran neutre, « Rendez-vous en pause » (mission 92) — jamais la liste du Live, qui montre
  // les noms des autres vendeurs, ni la page de préparation, qui montre tous les prix.
  const [quitOpen, setQuitOpen] = useState(false);
  const quitMeeting = () => {
    void document.exitFullscreen?.().catch(() => {});
    router.push(`/live/${projectId}/pause`);
  };

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
      // The photo lightbox and the « Revoir » card (mission 113) own the keyboard while open.
      if (document.body.dataset.lightbox === 'open' || document.body.dataset.review === 'open') {
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

  // Mission 92 — un enregistrement de fond en échec retient avant « Conclusion » : la barre le
  // dit et son bouton relance, au lieu d'un « Valider » qui ne ferait rien.
  const blockedByFailedSave =
    failedSaves.length > 0 && pages[currentIndex + 1]?.type === 'conclusion';
  const retryFailedSaves = () => failedSaves.forEach(([, record]) => record.retry());
  // Le bouton de la barre, tel que l'écran le montre : c'est lui que nomme un message d'échec.
  const interactiveLabel =
    (page.type === 'comparable_duration' && !durationRevealed) || quickDurationPending
      ? t.revealDuration
      : (perceivedToConfirm != null && page.type === 'seller_perceived_price') ||
          (revisedToConfirm != null && page.type === 'seller_revised_price')
        ? t.confirm
        : t.validate;
  const barLabel =
    page.type === 'closing_question' ||
    (page.type === 'conclusion' && currentIndex >= pages.length - 1)
      ? t.finish
      : page.type === 'conclusion'
        ? t.validate
        : blockedByFailedSave
          ? t.retry
          : interactiveLabel;
  useEffect(() => {
    barLabelRef.current = barLabel;
  }, [barLabel]);

  const isIntro = page.type === 'intro';
  const hasAgencyLogo = Boolean(logoLightUrl || logoDarkUrl);
  // Mission 133 — le compteur caché : une pastille neutre dans la barre du bas, à côté de
  // « Précédent », après l'introduction, en Live interactif comme en présentation directe ; le
  // moment montré est noté en fond, suivi comme les autres enregistrements de fond (journal,
  // « Relancer », M92, M100).
  const buyersDot =
    !isIntro && buyersReveal ? (
      <LiveBuyersDot
        count={buyersReveal.count}
        onShow={() => {
          setBuyersScreen(true);
          runBackground('buyers-shown', () => showBuyersToSeller(projectId));
        }}
      />
    ) : null;
  const stepLabel =
    page.type === 'comparable_direct' && page.comparableIndex != null && live
      ? t.competitorOf(page.comparableIndex, live.comparables.length)
      : page.comparableIndex != null && live
        ? `${t.competitorOf(page.comparableIndex, live.comparables.length)} · ${t.stepOf(
            page.step ?? 0,
            Math.max(
              ...pages.filter((p) => p.comparableId === page.comparableId).map((p) => p.step ?? 0),
              page.step ?? 0,
            ),
          )}`
        : texts.live.titles[page.type];

  return (
    <LiveTextsProvider language={language}>
      <div
        ref={rootRef}
        data-stage={stage}
        // Mission 144 — les photos du Live sont dans le cache du navigateur (lu par l'e2e).
        data-photos-preloaded={photosPreloaded ? 'true' : 'false'}
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

        {/* MISSION 89 — la confirmation de sortie, dans la scène elle-même (elle reste visible en
          plein écran) : sobre, sans rien du dossier. */}
        {quitOpen ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-quit-title"
          >
            <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl">
              <h2 id="live-quit-title" className="font-title text-2xl font-bold text-brand-deep">
                {t.quitTitle}
              </h2>
              <p className="text-base text-zinc-600">
                {hasUnsavedAnswers ? t.quitUnsaved : t.quitSaved}
              </p>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setQuitOpen(false)}
                  className="btn-filled inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-deep px-6 py-2.5 font-title text-base font-semibold text-white hover:bg-brand-darker"
                >
                  {t.stay}
                </button>
                <button
                  type="button"
                  onClick={quitMeeting}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-2.5 font-title text-base font-semibold text-zinc-700 hover:border-brand hover:text-brand-deep"
                >
                  {hasUnsavedAnswers ? t.quitAnyway : t.quit}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className={stageGlowLayer} aria-hidden>
          <div className={stageGlow} />
        </div>

        {/* Chrome supérieur : identité + réglages, volontairement discret. */}
        <header className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-5">
          {/* MISSION 72 — c'est le nom d'agence qui cède la place (tronqué dans <Logo>),
            jamais les boutons : `min-w-0` ici, `shrink-0` sur les réglages. */}
          <div className="flex min-w-0 items-center gap-3">
            {/* Mission 146 (C8) — le bandeau dit le NOM de l'agence, en texte (le logo est dans la
              carte d'accueil) ; sans logo, l'accueil porte le nom en grand dans sa carte, et le
              bandeau ne le répète pas sur cet écran. */}
            {isIntro && !hasAgencyLogo ? null : (
              <Logo
                onDark={stage === 'dark'}
                className="h-8 sm:h-9"
                lightSrc={agencyName ? null : logoLightUrl}
                darkSrc={agencyName ? null : logoDarkUrl}
                fallbackName={agencyName}
              />
            )}
            <span
              className={`${isIntro && !hasAgencyLogo ? 'inline' : 'hidden sm:inline'} shrink-0 text-sm font-medium whitespace-nowrap text-zinc-500 stage:text-white/50`}
            >
              {t.kicker}
            </span>
          </div>
          <div className="relative flex shrink-0 items-center gap-1.5">
            {/* Mission 131 — le menu du conseiller : changer de rythme sans rien dire au vendeur, et
              télécharger l'Étude de marché. Discret, comme les autres réglages. */}
            <button
              type="button"
              onClick={() => {
                setMenuError(null);
                setMenuOpen((open) => !open);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              data-testid="live-options"
              className={chromeBtn}
            >
              Réglages
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-2 text-left text-zinc-800 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={switching}
                  onClick={() => void switchMode(mode === 'direct' ? 'interactive' : 'direct')}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-zinc-100 disabled:opacity-60"
                >
                  {switching
                    ? 'Enregistrement…'
                    : mode === 'direct'
                      ? 'Reprendre le Live interactif'
                      : 'Passer en présentation directe'}
                </button>
                <a
                  role="menuitem"
                  href={`/builder/${projectId}/etude-de-marche?vue=live`}
                  target="_blank"
                  rel="noopener"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-zinc-100"
                >
                  Télécharger l’Étude de marché
                </a>
                {offeredLanguages(language).includes('en') ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={languageSwitching}
                    data-testid="live-language"
                    onClick={() => void switchLanguage(language === 'en' ? 'fr' : 'en')}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-zinc-100 disabled:opacity-60"
                  >
                    {languageSwitching
                      ? 'Enregistrement…'
                      : language === 'en'
                        ? 'Passer les écrans en français'
                        : 'Passer les écrans en anglais'}
                  </button>
                ) : null}
                {menuError ? <p className="px-3 py-1 text-xs text-red-600">{menuError}</p> : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setStage((s) => (s === 'dark' ? 'light' : 'dark'))}
              className={chromeBtn}
              aria-label={stage === 'dark' ? t.toLight : t.toDark}
            >
              {stage === 'dark' ? t.light : t.dark}
            </button>
            <button type="button" onClick={toggleFullscreen} className={chromeBtn}>
              {isFullscreen ? t.exitFullscreen : t.fullscreen}
            </button>
            <button type="button" onClick={() => setQuitOpen(true)} className={chromeBtn}>
              {t.quit}
            </button>
          </div>
        </header>

        {/* Mission 133 — « Montrer au vendeur » : l'écran plein des acquéreurs prêts, anonymes. */}
        {buyersScreen && buyersReveal ? (
          <LiveBuyersScreen reveal={buyersReveal} onClose={closeBuyersScreen} />
        ) : null}

        {/* Progression : fine, élégante, jamais envahissante. */}
        {!isIntro ? (
          <div className="relative mx-auto mt-4 flex w-full max-w-5xl flex-col gap-1.5 px-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-[0.25em] uppercase text-brand-deep/70 stage:text-brand">
                {stepLabel}
              </span>
              <span className="text-xs text-zinc-500 stage:text-white/40">
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
          // Mission 144 — le type d'écran (jamais une donnée du dossier), lu par l'e2e chronométré.
          data-live-page={page.type}
          // Après le rendu : un choix (« Non ») change ce qui est requis.
          onInput={() => requestAnimationFrame(checkPriceMissing)}
          // MISSION 51 §3.3 — le padding-bas doit dégager la barre fixe (≈ 85 px) : on
          // sépare haut et bas (pt-*/pb-*) car un `py-*` responsive écraserait le pb et
          // coupait le bas du contenu (grille comparative illisible). `pb-32` = 128 px,
          // au-dessus de la barre en fenêtre ET en plein écran (safe-area comprise).
          className={`relative mx-auto w-full max-w-5xl flex-1 px-4 pt-6 sm:px-8 sm:pt-8 ${
            isInteractive || isClosingAct ? 'pb-32' : 'pb-6 sm:pb-8'
          } ${isIntro ? 'flex flex-col' : ''}`}
        >
          {page.type === 'intro' ? (
            <LivePageIntro
              comparablesCount={live?.comparables.length ?? 0}
              sellerName={projectName}
              address={[property?.address, property?.city].filter(Boolean).join(', ') || null}
              onStart={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
              logoLightUrl={logoLightUrl}
              logoDarkUrl={logoDarkUrl}
              agencyName={agencyName}
            />
          ) : page.type === 'subject_property' && property ? (
            <LivePageProperty
              property={property}
              summary={summary}
              asksSeller={mode !== 'direct'}
            />
          ) : page.type === 'comparable_competition' && entry ? (
            <LivePageCompetition entry={entry} />
          ) : page.type === 'comparable_price' && entry ? (
            <LivePagePrice entry={entry} />
          ) : page.type === 'comparable_price_reveal' && authorizedEntry ? (
            <LivePagePriceRevealPilot entry={authorizedEntry} />
          ) : page.type === 'comparable_duration' && authorizedEntry ? (
            <LivePageDuration entry={authorizedEntry} durationRevealed={durationRevealed} />
          ) : page.type === 'comparable_quick_guess' && entry ? (
            <LivePageQuickGuess entry={entry} />
          ) : page.type === 'comparable_quick_reveal' && authorizedEntry ? (
            <LivePageQuickReveal entry={authorizedEntry} />
          ) : page.type === 'comparable_direct' && entry ? (
            <LivePageDirect entry={entry} />
          ) : page.type === 'advisor_closest' ? (
            <LivePageClosest
              comparables={closestCandidates}
              selectedId={closestId}
              busy={busy}
              onPick={(id) => void pickClosest(id)}
            />
          ) : page.type === 'dpe_market' ? (
            <LivePageDpe
              subjectEnergyRating={property?.energyRating ?? null}
              competitorEnergyRatings={comparables.map((c) => c.energyRating)}
            />
          ) : page.type === 'dangerous_competitor' && live ? (
            <LivePageDangerous comparables={comparables} summary={summary} />
          ) : page.type === 'seller_perceived_price' ? (
            <LivePagePerceived summary={summary} confirming={perceivedToConfirm} />
          ) : page.type === 'seller_revised_price' ? (
            <LivePageRevised summary={summary} confirming={revisedToConfirm} />
          ) : page.type === 'price_analysis' && effectiveRange ? (
            <LivePageAnalysis
              priceGaps={effectiveRange.priceGaps}
              reading={effectiveRange.marketReading}
              revisedPrice={summary?.seller_revised_property_price ?? null}
              dangerousId={summary?.seller_most_dangerous_comparable_id ?? null}
            />
          ) : page.type === 'price_analysis' ? (
            <LivePageAnalysisPending
              steps={pendingSteps}
              busy={busy}
              onOpen={(pageIndex) => {
                setAwaitError(null);
                setIndex(pageIndex);
              }}
              onShowAnalysis={() => void showAnalysis()}
            />
          ) : page.type === 'conclusion' ? (
            <LivePageConclusion
              projectId={projectId}
              summary={summary}
              advisorRange={effectiveRange}
              dangerous={dangerousComparable ?? closestComparable}
              closest={dangerousComparable == null && closestComparable != null}
              onPendingPriceChange={handlePendingPriceChange}
              onPriceSaved={handlePriceSaved}
            />
          ) : page.type === 'closing_question' ? (
            <LivePageClosing
              agreedPrice={agreedPrice}
              hasAgreedPrice={hasAgreedPrice || agreedPrice != null}
              advisorAnalysis={effectiveRange?.priceGaps.advisorComparativePrice ?? null}
              score={closing.last}
              missing={closing.missing}
              onScore={handleClosingScore}
              onMissingChange={(missing) => setClosing((c) => ({ ...c, missing }))}
            />
          ) : (
            <p className="text-zinc-500 stage:text-white/60">
              {/* Mission 89 — neutre : aucune consigne au conseiller devant le vendeur. */}
              {t.unavailable}
            </p>
          )}
        </main>

        {/* MISSION 51 §3.1/§3.3 — UNE barre ancrée à la fenêtre, UN bouton « Valider et
          continuer » qui enregistre ET avance : plus de « Suivant » distinct du
          « Enregistrer » (§2.1). Attentes sur quitter 1/2/3/5 (bouton occupé) ; avance
          optimiste ailleurs ; libellé « Révéler … » sur la 1re phase de l'écran de durée. */}
        {isInteractive ? (
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur stage:border-white/10 stage:bg-brand-deep/95"
            style={{
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              paddingTop: '1rem',
            }}
          >
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={index === 0}
                  className={navBtn}
                >
                  {t.previous}
                </button>
                {buyersDot}
              </span>
              <span
                className={`text-xs ${awaitError || blockedByFailedSave ? 'text-red-600 stage:text-red-300' : 'text-zinc-500 stage:text-white/40'}`}
                aria-live="polite"
              >
                {busy
                  ? t.saving
                  : blockedByFailedSave
                    ? t.failedSave
                    : awaitError
                      ? awaitError
                      : currentSave?.status === 'pending'
                        ? t.saving
                        : currentSave?.status === 'ok'
                          ? t.answerSaved
                          : ''}
              </span>
              {/* Mission 94 — le prix reformulé est facultatif : « Passer » n'enregistre rien. */}
              {page.type === 'seller_revised_price' &&
              summary?.seller_revised_property_price == null ? (
                <button
                  type="button"
                  onClick={() => void skipRevisedPrice()}
                  disabled={busy}
                  className={navBtn}
                >
                  {t.skip}
                </button>
              ) : null}
              {blockedByFailedSave ? (
                <button type="button" onClick={retryFailedSaves} className={ctaPrimary}>
                  {t.retry}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onValidate()}
                  // Mission 144 — pendant une révélation, le bouton reste plein et se voit pressé
                  // (`aria-busy`) ; `onValidate` ignore un second toucher.
                  disabled={(busy && !validating) || index >= pages.length - 1 || priceMissing}
                  aria-busy={validating}
                  className={ctaPrimary}
                  data-testid="live-validate"
                >
                  {interactiveLabel}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* MISSION 85 — l'écran du prix n'est plus le dernier : « Valider et continuer »
          enregistre d'abord un prix saisi et non enregistré (M81), puis ouvre la question
          de 1 à 10. Un champ vide n'enregistre rien et n'empêche pas d'avancer. */}
        {page.type === 'conclusion' ? (
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur stage:border-white/10 stage:bg-brand-deep/95"
            style={{
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              paddingTop: '1rem',
            }}
          >
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={index === 0}
                  className={navBtn}
                >
                  {t.previous}
                </button>
                {buyersDot}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {awaitError ? <span className={errorText}>{awaitError}</span> : null}
                {finishError ? <span className={errorText}>{finishError}</span> : null}
                <button
                  type="button"
                  onClick={() => void leavePriceScreen()}
                  disabled={busy || finishing}
                  className={ctaPrimary}
                >
                  {busy
                    ? t.savingPrice
                    : finishing
                      ? t.saving
                      : currentIndex >= pages.length - 1
                        ? t.finish
                        : t.validate}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* MISSION 53 — la FIN NORMALE du parcours. Le dernier écran mène à la conclusion
          (écran conseiller), distincte de « Quitter » (chrome, en haut) qui sort SANS
          conclure et laisse le dossier dans le Live. On sort du plein écran avant de passer
          à un écran advisor-only que le vendeur ne doit pas voir. */}
        {page.type === 'closing_question' ? (
          <div
            className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur stage:border-white/10 stage:bg-brand-deep/95"
            style={{
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              paddingTop: '1rem',
            }}
          >
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-8">
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={index === 0}
                  className={navBtn}
                >
                  {t.previous}
                </button>
                {buyersDot}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-3">
                {finishError ? (
                  <span className={errorText}>{finishError}</span>
                ) : closingSave === 'pending' || closingSave === 'ok' ? (
                  <span className="text-xs text-zinc-500 stage:text-white/40" aria-live="polite">
                    {closingSave === 'pending' ? t.saving : t.noteSaved}
                  </span>
                ) : null}
                <Link
                  href={thanksHref}
                  onClick={finishMeeting}
                  aria-disabled={finishing}
                  className={ctaPrimary}
                >
                  {finishing ? t.saving : t.finish}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </LiveTextsProvider>
  );
}
