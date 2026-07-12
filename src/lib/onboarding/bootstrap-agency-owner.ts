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
    throw new Error(error.message);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error('bootstrap_agency_owner returned no row');
  }

  return { profileId: row.profile_id, agencyId: row.agency_id };
}
