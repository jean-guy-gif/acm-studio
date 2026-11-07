-- Mission 145 (partie B) — « Garder la date ».
--
-- Quand des acquéreurs prêts correspondent au bien d'un vendeur à relancer dont la relance n'est
-- pas encore due, « Aujourd'hui » montre « Relancer plus tôt ? ». « Garder la date » cache cette
-- ligne pour toute l'agence jusqu'à la date prévue ; elle revient si un acquéreur prêt de plus se
-- met à correspondre, ou après une nouvelle relance (décisions de Jean-Guy, 07/11). Deux colonnes
-- nullables sur la conclusion, rien d'autre (accord de Jean-Guy, 07/11) :
--
--   `early_follow_up_kept_at`    : le moment du geste, posé par le serveur ;
--   `early_follow_up_kept_ready` : le nombre d'acquéreurs prêts à cet instant, recalculé par le
--                                  serveur (jamais reçu du navigateur), 1 au moins.
--
-- Les deux vont ensemble. Aucun droit ne change : le navigateur n'écrit déjà rien sur cette table
-- (insert, update et delete révoqués à `authenticated`, M53) ; seule l'action du serveur les pose,
-- par la clé de service, après son garde. Aucune fonction ni aucun déclencheur.
--
-- Compatible avec le code de `main` : deux colonnes nulles qu'il ne lit ni n'écrit ; `conclude_meeting`
-- et le changement d'issue nomment leurs colonnes et n'y touchent pas. Aucune ligne existante n'est
-- modifiée.

alter table public.project_meeting_conclusions
  add column early_follow_up_kept_at timestamptz,
  add column early_follow_up_kept_ready integer,
  add constraint project_meeting_conclusions_early_follow_up_kept_check check (
    (early_follow_up_kept_at is null and early_follow_up_kept_ready is null)
    or (
      early_follow_up_kept_at is not null
      and early_follow_up_kept_ready is not null
      and early_follow_up_kept_ready >= 1
    )
  );

comment on column public.project_meeting_conclusions.early_follow_up_kept_at is
  'Mission 145 — « Garder la date » : le moment où le conseiller a gardé la date de relance malgré des acquéreurs prêts (posé par le serveur).';
comment on column public.project_meeting_conclusions.early_follow_up_kept_ready is
  'Mission 145 — le nombre d''acquéreurs prêts qui correspondaient au bien à cet instant (1 au moins) ; un de plus fait revenir « Relancer plus tôt ? ».';
