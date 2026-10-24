-- Mission 114 (partie B) — les dossiers de démonstration de chaque closer, et la remise à zéro.
--
-- « Préparer ma démo » crée, pour le closer connecté de l'agence de démonstration, quatre
-- dossiers à quatre étapes ; « Remettre ma démo à zéro » supprime les siens et en recrée quatre.
-- Pour les reconnaître, une MARQUE sur le dossier : `projects.demo_stage`, l'étape à laquelle il
-- a été préparé — nulle sur tout dossier ordinaire. La remise à zéro ne touche qu'aux dossiers
-- marqués du closer connecté, dans une agence `is_demo` (garde de l'action, clé service).
--
-- Compatible avec le code de `main` : une colonne nullable de plus, aucune ligne écrite ; le
-- navigateur garde ses droits sur `projects` (la marque ne décide d'aucune donnée).

alter table public.projects
  add column demo_stage text
    check (demo_stage is null or demo_stage in ('to_prepare', 'ready', 'signed', 'follow_up'));

comment on column public.projects.demo_stage is
  'Mission 114 — dossier de démonstration d''un closer : l''étape à laquelle il a été préparé (to_prepare, ready, signed, follow_up) ; nul pour tout dossier ordinaire.';
