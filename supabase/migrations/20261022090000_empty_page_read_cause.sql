-- Mission 103 — une page d'annonce lue sans prix ni donnée, SANS preuve de retrait (page captcha,
-- gabarit de portail modifié), est un échec de lecture ordinaire : sa cause, « empty », s'ajoute
-- aux causes qu'un import en attente peut porter.
--
-- La liste ne fait que s'élargir : toutes les lignes existantes restent valides, et le code de
-- `main` (qui n'écrit jamais « empty ») n'est pas touché. Aucune donnée n'est modifiée.

alter table public.pending_competitor_imports
  drop constraint pending_competitor_imports_last_cause_check;

alter table public.pending_competitor_imports
  add constraint pending_competitor_imports_last_cause_check check (
    last_cause is null or last_cause in (
      'robots', 'invalid', 'network', 'timeout', 'too_large', 'withdrawn', 'empty', 'server',
      'no_price'
    )
  );
