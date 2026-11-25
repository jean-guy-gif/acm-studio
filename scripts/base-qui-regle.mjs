// « Personne n'est connecté » (`missions/BASE_JEUDI_MATIN.md`, avant le geste 1) : la requête et la
// règle, pures. Par agence, les sessions des vrais comptes et leur dernière activité, en minutes.
// Les comptes de test sont écartés ; ni nom ni adresse e-mail ne sort de la base.
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

export function sessionsQuery(testEmails) {
  const excluded = (testEmails ?? []).filter(Boolean);
  if (excluded.length === 0) throw new Error('Les comptes de test à écarter manquent.');
  return `
select a.name as agence,
       count(s.id) as sessions,
       round(extract(epoch from (now() - max(greatest(s.refreshed_at at time zone 'utc', s.updated_at)))) / 60) as minutes
  from auth.users u
  join public.profiles p on p.id = u.id
  join public.agencies a on a.id = p.agency_id
  left join auth.sessions s on s.user_id = u.id
 where lower(u.email) not in (${excluded.map((email) => `lower(${quote(email)})`).join(', ')})
 group by a.id, a.name
 order by 3 nulls last`;
}

// Une session se renouvelle au plus toutes les heures tant que l'outil est ouvert dans un
// navigateur : une activité de moins d'une heure veut dire « peut-être connecté » (un onglet resté
// ouvert compte aussi) ; au-delà, personne.
export const ACTIVE_WITHIN_MINUTES = 60;

export function whoIsConnected(rows, within = ACTIVE_WITHIN_MINUTES) {
  const seen = (rows ?? [])
    .filter((row) => row?.minutes != null && Number.isFinite(Number(row.minutes)))
    .map((row) => ({ agence: String(row.agence), minutes: Number(row.minutes) }))
    .sort((a, b) => a.minutes - b.minutes);
  const active = seen.filter((row) => row.minutes < within);
  const ago = (minutes) =>
    minutes < 60
      ? `il y a ${minutes} min`
      : `il y a ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
  const lines =
    active.length > 0
      ? [
          `⚠ Peut-être connecté (activité de session depuis moins de ${within} minutes) :`,
          ...active.map((row) => `    ${row.agence} — ${ago(row.minutes)}`),
          'Un onglet resté ouvert compte aussi : Jean-Guy décide du moment.',
        ]
      : [
          `✔ Aucune session d’un vrai compte active depuis ${within} minutes.`,
          seen.length > 0
            ? `  La dernière : ${seen[0].agence}, ${ago(seen[0].minutes)}.`
            : '  Aucune session de vrai compte dans la base.',
        ];
  return { nobody: active.length === 0, active, last: seen[0] ?? null, lines };
}
