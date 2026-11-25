// La preuve que l'essai parle à la base d'essai (`essai-preuve.mjs`) : la règle, pure.
// `inProduction`, `inEssai` : le nombre de sessions neuves du compte de test, juste après sa
// connexion sur l'essai, lu dans chaque base ; `inEssai` est nul tant que la référence de la base
// d'essai n'est pas posée.
export function essaiVerdict({ inProduction, inEssai }) {
  if (inProduction > 0) {
    return {
      ok: false,
      message:
        'L’essai lit encore la base de la PRODUCTION : la connexion du compte de test y a laissé une session. On s’arrête là : aucune spec ne part, rien n’est touché à la production.',
    };
  }
  if (inEssai == null) {
    return {
      ok: false,
      message:
        'Aucune session neuve dans la production, mais la référence de la base d’essai n’est pas posée (E2E_SUPABASE_REF) : la preuve n’est pas faite.',
    };
  }
  if (inEssai > 0) {
    return {
      ok: true,
      message:
        'L’essai parle à la base d’essai : la session neuve y est, et rien dans la production.',
    };
  }
  return {
    ok: false,
    message:
      'La session neuve n’est dans aucune des deux bases : la preuve n’est pas faite. On s’arrête là.',
  };
}
