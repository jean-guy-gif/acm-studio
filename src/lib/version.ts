// Mission 100 — le commit que sert ce déploiement. Vercel le pose à la compilation ; en local,
// il n'y en a pas.
export function deployedCommit(): string | null {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  return sha ? sha.slice(0, 40) : null;
}
