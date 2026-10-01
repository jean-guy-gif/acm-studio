// Mission 60 §1 — ce que le manager fournit pour inviter : une adresse et un rôle. Pur,
// déterministe, testable. L'agence ne vient JAMAIS du client (elle est imposée côté serveur).
export type InviteInput = { email: string; role: 'manager' | 'advisor' };
export type InviteInputResult = { ok: true; value: InviteInput } | { ok: false; error: string };

// Une validation d'adresse volontairement simple : présence d'un « @ » avec un local et un
// domaine non vides et sans espace. La vraie validation, c'est la livraison — une adresse
// invalide se traduira par un échec d'envoi visible, pas par un faux « en attente ».
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInviteInput(formData: FormData): InviteInputResult {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!EMAIL_SHAPE.test(email)) {
    return { ok: false, error: 'Saisissez une adresse e-mail valide.' };
  }
  const role = String(formData.get('role') ?? '');
  if (role !== 'manager' && role !== 'advisor') {
    return { ok: false, error: 'Choisissez un rôle : conseiller ou manager.' };
  }
  return { ok: true, value: { email, role } };
}
