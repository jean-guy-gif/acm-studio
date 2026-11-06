-- Mission 132 — La fiche en 30 secondes, et « prêt à visiter ».
--
--   1. `buyers.financing` : le financement de l'acquéreur — validé (accord de principe ou apport
--      suffisant), en cours, inconnu (défaut). Écrit par le serveur seul, comme toute la fiche (M117),
--      par un geste à part (trois boutons sur la fiche), daté (`financing_changed_at`).
--   2. `buyers.contacted_at` : « J'ai eu l'acquéreur aujourd'hui », le dernier contact déclaré par le
--      conseiller, à l'heure du serveur, jamais choisie (modèle des relances, M96). Le « dernier
--      échange » se CALCULE à la lecture : le plus récent de ce contact et des faits déjà datés
--      (création de la fiche, présentation, réponse par le lien, visite demandée ou faite, statut) ;
--      rien n'est reconstitué pour les fiches existantes (M56).
--
-- « Prêt à visiter » et « À recontacter » se calculent à l'affichage : aucun statut nouveau dans
-- l'enum (même principe que `projects.status`, CLAUDE.md).
--
-- Compatible avec le code de `main` : deux colonnes nulles et une avec défaut ; `main` n'en lit ni
-- n'en écrit aucune, ses insertions prennent le défaut. Les droits ne changent pas : le navigateur
-- garde la seule lecture (M117). Aucune ligne existante n'est modifiée au-delà du défaut.

alter table public.buyers
  add column financing text not null default 'unknown'
    check (financing in ('validated', 'in_progress', 'unknown')),
  add column financing_changed_at timestamptz,
  add column contacted_at timestamptz;

comment on column public.buyers.financing is
  'Mission 132 — validated : accord de principe ou apport suffisant ; in_progress ; unknown (défaut). Écrit par le serveur seul.';
comment on column public.buyers.financing_changed_at is
  'Mission 132 — quand le financement a été posé pour la dernière fois (heure du serveur).';
comment on column public.buyers.contacted_at is
  'Mission 132 — « J''ai eu l''acquéreur aujourd''hui » : le dernier contact déclaré, heure du serveur. Le dernier échange se calcule à la lecture.';
