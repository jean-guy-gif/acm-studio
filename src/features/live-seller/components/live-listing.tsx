'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useDemoMode } from '@/features/demo/components/demo-mode-provider';
import { openLiveListing } from '@/features/live-seller/actions/open-live-listing';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  ctaPrimary,
  errorText,
  navBtn,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import type { LiveListingCopy } from '@/features/live-seller/services/live-listing-copy';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatSquareMeters, formatDay, formatEuro } from '@/lib/format';

// Mission 152 (partie A) — « Voir l'annonce », une fois le prix de ce concurrent dévoilé, pour
// confirmer le prix au vendeur qui doute (Jean-Guy, 11/11) : l'annonce s'ouvre sur son portail,
// dans un nouvel onglet, le Live reste là. L'onglet s'ouvre DANS le geste (Safari, iPad : M134) ;
// son adresse n'arrive qu'après, par une action qui revérifie la révélation en base (M51). Quand
// l'annonce n'est plus en ligne — ou dans l'agence de démonstration, dont les annonces ne mènent à
// aucun portail réel (M114) —, la copie enregistrée s'ouvre en couche, comme « Revoir » (M113) :
// rien n'est écrit, l'adresse du Live ne change pas, les flèches sont suspendues. En contour : le
// seul plein reste « Valider et continuer » (M146).
export function LiveListingButton({ entry }: { entry: AuthorizedSellerComparable }) {
  const params = useParams<{ projectId: string }>();
  const isDemo = useDemoMode();
  const { texts } = useLiveTexts();
  const t = texts.live.listing;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copy, setCopy] = useState<LiveListingCopy | null>(null);
  const close = useCallback(() => setCopy(null), []);

  if (entry.listing == null || !params?.projectId) return null;
  const projectId = params.projectId;
  const opensTab = entry.listing === 'online' && !isDemo;

  const onClick = async () => {
    if (busy) return;
    setFailed(false);
    // L'onglet d'abord, vide, dans le geste ; il reçoit l'annonce ou se referme.
    const tab = opensTab ? window.open('', '_blank') : null;
    if (tab) tab.opener = null;
    setBusy(true);
    try {
      const result = await openLiveListing(projectId, entry.id);
      if (result.ok && result.kind === 'online' && tab) {
        tab.location.href = result.url;
        return;
      }
      tab?.close();
      if (result.ok && result.kind === 'copy') {
        setCopy(result.copy);
        return;
      }
      setFailed(true);
    } catch {
      tab?.close();
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-busy={busy || undefined}
        className={`${navBtn} self-start`}
        data-testid="live-listing-open"
      >
        {busy ? t.opening : opensTab ? `${t.open} ↗` : t.open}
      </button>
      {failed ? (
        <p role="alert" className={errorText}>
          {t.failed(t.open)}
        </p>
      ) : null}
      {copy ? <LiveListingCopyView entry={entry} copy={copy} onClose={close} /> : null}
    </div>
  );
}

function LiveListingCopyView({
  entry,
  copy,
  onClose,
}: {
  entry: AuthorizedSellerComparable;
  copy: LiveListingCopy;
  onClose: () => void;
}) {
  const { language, texts } = useLiveTexts();
  const t = texts.live.listing;
  const label = neutralComparableLabel(entry, language);
  const euro = (value: number) => formatEuro(value, { language });
  const day = (value: string) => formatDay(value, language);

  // Comme « Revoir » : le shell suspend ses flèches, Échap ferme (sauf la visionneuse au-dessus).
  useEffect(() => {
    // Ouverte depuis « Revoir », la couche rend la main à la fiche, qui garde les flèches.
    const previous = document.body.dataset.review;
    document.body.dataset.review = 'open';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.body.dataset.lightbox !== 'open') {
        event.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      if (previous == null) delete document.body.dataset.review;
    };
  }, [onClose]);

  const facts = [
    copy.surfaceArea != null ? formatSquareMeters(copy.surfaceArea, { language }) : null,
    copy.roomsCount != null ? texts.common.rooms(copy.roomsCount) : null,
    copy.bedroomsCount != null ? t.bedrooms(copy.bedroomsCount) : null,
    copy.landArea != null ? t.land(formatSquareMeters(copy.landArea, { language })) : null,
    copy.energyRating ? t.dpe(copy.energyRating) : null,
    ...copy.outdoorSpaces.map((value) => texts.labels.outdoor[value]),
    ...copy.parkingTypes.map((value) => texts.labels.parking[value]),
  ].filter((fact): fact is string => fact != null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      data-testid="live-listing-copy"
      className="fixed inset-0 z-[46] overflow-x-hidden overflow-y-auto bg-white stage:bg-brand-deep"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-8 md:h-full md:min-h-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={statLabel}>{t.title}</span>
            <h2 className="font-title text-2xl leading-snug font-semibold text-zinc-900 sm:text-3xl stage:text-white">
              {label}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={`${ctaPrimary} shrink-0`}>
            {t.close}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          <div className="flex min-h-0 flex-col md:w-3/5">
            <LiveGallery photos={copy.photoUrls} alt={label} fill />
          </div>
          <div className="flex flex-col gap-4 md:w-2/5">
            <div className="flex flex-col gap-2" data-testid="live-listing-price">
              <span className={statLabel}>{t.listed}</span>
              <span className="font-title text-4xl font-bold text-zinc-900 stage:text-white">
                {euro(copy.price)}
              </span>
              <ul className="flex flex-col gap-1 text-sm text-zinc-600 stage:text-white/75">
                <li>
                  {copy.recordedOn
                    ? t.recorded(copy.portal, day(copy.recordedOn), copy.atImport)
                    : t.recordedAsIs}
                </li>
                {copy.lastCheck ? (
                  <li>
                    {t.lastCheck(
                      day(copy.lastCheck.on),
                      euro(copy.lastCheck.price),
                      copy.drop == null || copy.drop.on < copy.lastCheck.on,
                    )}
                  </li>
                ) : null}
                {copy.drop ? (
                  <li>{t.drop(euro(copy.drop.from), euro(copy.drop.to), day(copy.drop.on))}</li>
                ) : null}
              </ul>
            </div>
            {facts.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {facts.map((fact) => (
                  <li
                    key={fact}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700 stage:border-white/20 stage:text-white/85"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            ) : null}
            {copy.goneSince ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 stage:border-amber-300/30 stage:bg-amber-400/10 stage:text-amber-200">
                {t.gone(day(copy.goneSince))}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
