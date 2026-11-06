import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { alertError, backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { ProposeSeries, type ProposeCandidate } from '@/features/buyers/components/propose-series';
import { loadLoopCatalog } from '@/features/buyers/queries/get-loop-properties';
import { loadAgencyBuyers } from '@/features/buyers/queries/get-property-buyers';
import {
  budgetGapLabel,
  LOOP_ORIGIN_NOTES,
  loopBuyers,
  propertyFigures,
  propertyPhrase,
  sentDayLabel,
} from '@/features/buyers/services/loop-properties';
import {
  PROPERTY_BUYER_MISSING_LABELS,
  starsFilled,
  type PropertyBuyer,
} from '@/features/buyers/services/property-buyers';
import { getProfile } from '@/lib/auth/get-profile';

export const metadata: Metadata = { title: 'Proposer ce bien — ACM Studio' };

type ProposePageProps = { searchParams: Promise<{ bien?: string }> };

// Mission 134 — « Proposer ce bien » : les acquéreurs de l'agence qui lui correspondent (la règle de
// la 133), les prêts d'abord, chacun avec ses ★ remplies et son écart au budget ; tous cochés, le
// conseiller décoche ; puis l'envoi en série, un acquéreur à la fois. Ceux à qui il a déjà été
// proposé le disent (« déjà proposé le … »). Pour le conseiller seul.
export default async function ProposePropertyPage({ searchParams }: ProposePageProps) {
  const { bien } = await searchParams;
  const profile = await getProfile();
  if (!profile || !bien) notFound();
  const now = new Date();
  const [agency, catalog] = await Promise.all([
    loadAgencyBuyers(profile.agency_id),
    loadLoopCatalog(profile.agency_id, now, null),
  ]);
  const failed = agency.failed || catalog.failed;
  const item = failed ? null : (catalog.items.find((entry) => entry.key === bien) ?? null);
  if (!failed && !item) notFound();

  const loop = item
    ? loopBuyers(item, agency.buyers, agency.progress, catalog.contacts, now)
    : null;
  const toCandidate = ({ buyer, ready, missing }: PropertyBuyer): ProposeCandidate => ({
    id: buyer.id,
    name: buyer.name,
    phone: buyer.phone,
    email: buyer.email,
    ready,
    missing: missing ? PROPERTY_BUYER_MISSING_LABELS[missing] : null,
    stars: item && item.price != null ? starsFilled(buyer, item.property, item.price) : [],
    budgetGap: budgetGapLabel(item?.price ?? null, buyer.budgetMax),
    wants: {
      name: buyer.name,
      pool: buyer.pool,
      outdoor: buyer.outdoor,
      parking: buyer.parking,
      elevator: buyer.elevator,
      budgetMax: buyer.budgetMax,
    },
  });
  const figures = item
    ? propertyFigures({ surfaceArea: item.property.surfaceArea, price: item.price })
    : null;

  return (
    <div className="flex max-w-4xl flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-1.5">
        <Link href="/suivi" className={backLink}>
          ← Suivi
        </Link>
        <span className={kickerLabel}>Proposer ce bien</span>
        <h1 className={pageTitle} data-testid="propose-title">
          {item ? `${propertyPhrase(item.property)}${figures ? ` (${figures})` : ''}` : 'Ce bien'}
        </h1>
        {item ? (
          <p className={pageSubtitle}>{[item.label, LOOP_ORIGIN_NOTES[item.origin]].join(' · ')}</p>
        ) : null}
      </div>
      {failed || !item || !loop ? (
        <p role="alert" className={alertError}>
          Les acquéreurs n’ont pas pu être lus pour l’instant : rechargez la page.
        </p>
      ) : (
        <ProposeSeries
          propertyKey={item.key}
          item={{ property: item.property, price: item.price, origin: item.origin }}
          candidates={loop.toPropose.map(toCandidate)}
          proposed={loop.proposed.map(({ entry, sentAt }) => ({
            id: entry.buyer.id,
            name: entry.buyer.name,
            label: sentAt ? `déjà proposé le ${sentDayLabel(sentAt)}` : 'déjà dans sa sélection',
          }))}
          advisorFirstName={profile.first_name ?? null}
        />
      )}
    </div>
  );
}
