import { createClient } from '@/lib/supabase/server';

export type BootstrapAgencyOwnerInput = {
  agencyName: string;
  firstName: string;
  lastName: string;
};

export type BootstrapAgencyOwnerResult = {
  profileId: string;
  agencyId: string;
};

// Mission 88 — une invitation attend l'adresse de l'utilisateur : la base refuse de créer une
// agence (code ACM01). L'appelant renvoie alors vers l'acceptation de l'invitation.
export const PENDING_INVITATION_SQLSTATE = 'ACM01';

export class PendingInvitationError extends Error {
  constructor() {
    super('pending invitation');
    this.name = 'PendingInvitationError';
  }
}

// L'utilisateur connecté a-t-il une invitation en attente ? Il n'a pas encore de profil : la
// réponse vient d'une fonction de la base, qui ne dit que oui ou non, pour SON adresse.
export async function hasPendingInvitation(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('has_pending_invitation');
  return !error && data === true;
}

// Calls the bootstrap_agency_owner RPC and turns a Supabase error into a plain Error.
// Uses the shared server client — never a dedicated or service_role client.
export async function bootstrapAgencyOwner(
  input: BootstrapAgencyOwnerInput,
): Promise<BootstrapAgencyOwnerResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('bootstrap_agency_owner', {
    agency_name: input.agencyName,
    first_name: input.firstName,
    last_name: input.lastName,
  });

  if (error) {
    if (error.code === PENDING_INVITATION_SQLSTATE) {
      throw new PendingInvitationError();
    }
    throw new Error(error.message);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error('bootstrap_agency_owner returned no row');
  }

  return { profileId: row.profile_id, agencyId: row.agency_id };
}
