-- Mission 157 — un lien « Vivre ici » collé à la main se comporte comme un lien créé en un clic
-- (Jean-Guy, 17/11) : il n'est plus montré, ni au vendeur ni aux acquéreurs, quand l'adresse du bien
-- a changé depuis son collage. La base garde donc l'adresse du bien au moment où le lien change :
-- `projects.academia_living_here_property`, la rue, le code postal et la commune tels qu'enregistrés
-- (le serveur compose l'adresse et la compare, comme pour un lien créé en un clic).
--
-- Posée par la base seule, par le déclencheur de la date du lien (M156), qui la relit sur le bien
-- vendeur du dossier : aucun chemin d'écriture ne peut l'oublier ni la choisir ; vidée avec le lien ;
-- nulle pour un lien collé avant cette migration (0 lien de mandat en base le 17/11). Ni table, ni
-- politique, ni index : une colonne, la fonction remplacée, le déclencheur recréé pour la couvrir.

set local lock_timeout = '5s';

alter table public.projects add column academia_living_here_property jsonb
  check (academia_living_here_property is null or jsonb_typeof(academia_living_here_property) = 'object');
comment on column public.projects.academia_living_here_property is
  'Mission 157 — l''adresse du bien vendeur (address, postal_code, city) au moment où le lien « Vivre ici » a été posé, relue par la base ; nulle sans lien, et pour les liens d''avant.';

create or replace function public.date_academia_living_here_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.academia_living_here_url is distinct from old.academia_living_here_url then
    if new.academia_living_here_url is null then
      new.academia_living_here_pasted_at := null;
      new.academia_living_here_property := null;
    else
      new.academia_living_here_pasted_at := now();
      new.academia_living_here_property := (
        select jsonb_build_object('address', s.address, 'postal_code', s.postal_code, 'city', s.city)
        from public.subject_properties s
        where s.project_id = new.id and s.agency_id = new.agency_id
        limit 1
      );
    end if;
  else
    new.academia_living_here_pasted_at := old.academia_living_here_pasted_at;
    new.academia_living_here_property := old.academia_living_here_property;
  end if;
  return new;
end $$;

revoke all on function public.date_academia_living_here_link() from public, anon, authenticated;

drop trigger projects_date_academia_living_here_link on public.projects;
create trigger projects_date_academia_living_here_link
  before insert or update of academia_living_here_url, academia_living_here_pasted_at,
    academia_living_here_property on public.projects
  for each row execute function public.date_academia_living_here_link();
