// La sonde de la base (`base-sonde.mjs`) : la règle, pure. `samples` : une demande par ligne, son
// heure et sa réponse. Une indisponibilité va de la première demande sans réponse à la première
// réponse qui suit ; sans retour, elle court jusqu'à la dernière demande.
export function downtime(samples) {
  const outages = [];
  let open = null;
  for (const sample of samples) {
    if (!sample.ok && open == null) open = { from: sample.at, to: null };
    if (sample.ok && open != null) {
      outages.push({ ...open, to: sample.at });
      open = null;
    }
  }
  const lastAt = samples.at(-1)?.at ?? null;
  if (open != null) outages.push(open);
  const seconds = outages.reduce(
    (total, outage) => total + ((outage.to ?? lastAt ?? outage.from) - outage.from) / 1000,
    0,
  );
  return { outages, seconds };
}
