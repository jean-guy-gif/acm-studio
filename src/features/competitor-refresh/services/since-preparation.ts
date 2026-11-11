// Mission 152 (partie A) — « Depuis la préparation », sur « Avant le rendez-vous » : ce qui a bougé
// chez les concurrents retenus depuis qu'ils ont été relevés, lu dans les faits datés (la copie de
// l'import, M152 ; les relevés d'annonce, M47 ; le retrait sur preuve, M103). Rien ne vient du
// navigateur. Pur.

export const LISTINGS_CHECK_STALE_HOURS = 24;

export type SincePreparationCompetitor = {
  id: string;
  label: string;
  price: number;
  hasListing: boolean;
  goneAt: string | null;
  // Le prix relevé à l'import (la copie), sinon le premier relevé daté de l'annonce.
  recordedPrice: number | null;
  // Les relevés de l'annonce, du plus ancien au plus récent.
  observations: { observed_on: string; price: number }[];
  // L'annonce a-t-elle été relue le jour de la dernière vérification ?
  readOnCheck: boolean | null;
};

export type SincePreparationChange =
  | {
      kind: 'price';
      id: string;
      label: string;
      from: number;
      to: number;
      // L'écart en % du prix d'avant, au dixième.
      percent: number;
      on: string | null;
    }
  | { kind: 'gone'; id: string; label: string; on: string | null };

export type SincePreparation = {
  checkedAt: string | null;
  // Plus de 24 h sans vérification, ou jamais vérifié.
  stale: boolean;
  changes: SincePreparationChange[];
  unchanged: number;
  // Annonces que la dernière vérification n'a pas pu lire.
  unread: number;
  read: number;
  withListing: number;
};

// Le rappel au lancement du Live : un vrai dossier dont le Live n'a pas commencé, des concurrents
// retenus qui ont une annonce, et aucune vérification depuis 24 h.
export function listingsCheckStale(input: {
  isExample: boolean;
  started: boolean;
  withListing: boolean;
  checkedAt: string | null;
  now: Date;
}): boolean {
  if (input.isExample || input.started || !input.withListing) return false;
  if (input.checkedAt == null) return true;
  return (
    input.now.getTime() - new Date(input.checkedAt).getTime() >
    LISTINGS_CHECK_STALE_HOURS * 3_600_000
  );
}

// Le jour où le prix actuel a été constaté pour la première fois après un autre prix.
function changedOn(observations: { observed_on: string; price: number }[], price: number) {
  let on: string | null = null;
  for (let index = observations.length - 1; index >= 0; index -= 1) {
    if (Math.round(Number(observations[index].price)) !== Math.round(price)) break;
    on = observations[index].observed_on;
  }
  return on;
}

export function sincePreparation(
  competitors: SincePreparationCompetitor[],
  checkedAt: string | null,
  now: Date,
): SincePreparation {
  const withListing = competitors.filter((competitor) => competitor.hasListing);
  const changes: SincePreparationChange[] = [];
  let unchanged = 0;
  for (const competitor of withListing) {
    if (competitor.goneAt) {
      changes.push({
        kind: 'gone',
        id: competitor.id,
        label: competitor.label,
        on: competitor.goneAt.slice(0, 10),
      });
      continue;
    }
    const observations = [...competitor.observations].sort((a, b) =>
      a.observed_on.localeCompare(b.observed_on),
    );
    const from =
      competitor.recordedPrice ?? (observations[0] ? Number(observations[0].price) : null);
    if (from != null && from > 0 && Math.round(from) !== Math.round(competitor.price)) {
      changes.push({
        kind: 'price',
        id: competitor.id,
        label: competitor.label,
        from,
        to: competitor.price,
        percent: Math.round(((competitor.price - from) / from) * 1000) / 10,
        on: changedOn(observations, competitor.price),
      });
    } else {
      unchanged += 1;
    }
  }
  const checked = checkedAt ? new Date(checkedAt) : null;
  const read = withListing.filter((competitor) => competitor.readOnCheck === true).length;
  return {
    checkedAt,
    stale:
      checked == null || now.getTime() - checked.getTime() > LISTINGS_CHECK_STALE_HOURS * 3_600_000,
    changes,
    unchanged,
    unread: checked ? withListing.length - read : 0,
    read: checked ? read : 0,
    withListing: withListing.length,
  };
}
