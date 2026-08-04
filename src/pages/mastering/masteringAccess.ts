import type { LoudnessProfile } from './masteringEngine';

export interface MasteringEntitlements {
  unlimited: boolean;
  freeMasterAvailable: boolean;
  freeMasterClaimedAt: string | null;
}

export interface RemoteMasteringConfiguration {
  id: string;
  name: string;
  presetId: string;
  strength: number;
  stereo: number;
  loudness: LoudnessProfile;
}

interface StoredUser {
  accessToken?: string;
  refreshToken?: string;
}

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
export const secureMasteringAccessEnabled = import.meta.env.VITE_MASTERING_SECURE_ACCESS === 'true';

function readStoredUser(): StoredUser & Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
  } catch {
    return {};
  }
}

function tokenExpiresSoon(token: string) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export async function getSecureAccessToken() {
  const user = readStoredUser();
  if (user.accessToken && !tokenExpiresSoon(user.accessToken)) return user.accessToken;
  if (!supabaseUrl || !supabaseAnonKey || !user.refreshToken) throw new Error('SECURE_SESSION_REQUIRED');

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
    body: JSON.stringify({ refresh_token: user.refreshToken }),
  });
  const refreshed = await response.json().catch(() => ({}));
  if (!response.ok || !refreshed.access_token) throw new Error('SECURE_SESSION_REQUIRED');
  const updated = {
    ...user,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || user.refreshToken,
  };
  localStorage.setItem('audioMixerUser', JSON.stringify(updated));
  return refreshed.access_token as string;
}

async function callMasteringAccess<T>(payload: Record<string, unknown>): Promise<T> {
  const accessToken = await getSecureAccessToken();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SECURE_SESSION_REQUIRED');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/mastering-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'MASTERING_ACCESS_ERROR');
  return data as T;
}

const mapConfiguration = (configuration: any): RemoteMasteringConfiguration => ({
  id: configuration.id,
  name: configuration.name,
  presetId: configuration.preset_id,
  strength: configuration.strength,
  stereo: configuration.stereo,
  loudness: configuration.loudness,
});

export const getMasteringEntitlements = () =>
  callMasteringAccess<MasteringEntitlements>({ action: 'entitlements' });

export const claimFreeMaster = () =>
  callMasteringAccess<{ success: true; unlimited: boolean }>({ action: 'claim_free_master' });

export async function listMasteringConfigurations() {
  const result = await callMasteringAccess<{ configurations: any[] }>({ action: 'list_configurations' });
  return result.configurations.map(mapConfiguration);
}

export async function saveMasteringConfiguration(configuration: Omit<RemoteMasteringConfiguration, 'id'>) {
  const result = await callMasteringAccess<{ configuration: any }>({
    action: 'save_configuration',
    configuration,
  });
  return mapConfiguration(result.configuration);
}

export const deleteMasteringConfiguration = (configurationId: string) =>
  callMasteringAccess<{ success: true }>({ action: 'delete_configuration', configurationId });
