import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface RescueSketchDatabase {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          github_login: string;
          github_id: number;
          language: 'es' | 'en';
          license_accepted_at: string | null;
        };
        Insert: Omit<
          RescueSketchDatabase['public']['Tables']['profiles']['Row'],
          'license_accepted_at'
        > & {
          license_accepted_at?: string | null;
        };
        Update: Partial<RescueSketchDatabase['public']['Tables']['profiles']['Insert']>;
      };
      public_tracks: {
        Row: {
          id: string;
          owner_id: string;
          github_login: string;
          track_path: string;
          branch_name: string;
          pull_request_number: number | null;
          status: 'draft' | 'in_review' | 'approved' | 'rejected';
          head_sha: string | null;
          checksum: string | null;
          schema_version: string;
          ruleset_version: string;
          catalog_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          RescueSketchDatabase['public']['Tables']['public_tracks']['Row'],
          'created_at' | 'updated_at'
        >;
        Update: Partial<RescueSketchDatabase['public']['Tables']['public_tracks']['Insert']>;
      };
    };
  };
}

let client: SupabaseClient<RescueSketchDatabase> | undefined;

export function getSupabaseClient(): SupabaseClient<RescueSketchDatabase> {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (
    typeof url !== 'string' ||
    typeof publishableKey !== 'string' ||
    url.length === 0 ||
    publishableKey.length === 0
  ) {
    throw new Error(
      'Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  client = createClient<RescueSketchDatabase>(url, publishableKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export async function signInWithGitHub(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'read:user user:email',
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

export async function signOutFromSupabase(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}
