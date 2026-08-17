import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';

/**
 * Lazy Supabase Admin client — created on first use.
 * This prevents a startup crash when SUPABASE_URL/SERVICE_ROLE_KEY are not yet configured.
 * Backend use only — NEVER expose this key to the client.
 */
let _client: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey ||
        config.supabaseServiceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
      throw new Error(
        '[SupabaseAdmin] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env'
      );
    }
    _client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}

/**
 * Create a temporary Supabase auth.users entry solely for email verification.
 * A random throwaway password is assigned — the student will never use it.
 * Returns the auth user UUID.
 */
export async function createSupabaseAuthUser(
  email: string,
  redirectTo: string
): Promise<string> {
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password: crypto.randomUUID(), // throwaway — discarded immediately
    email_confirm: false,          // sends verification email
    user_metadata: { registration_redirect_to: redirectTo },
  });

  if (error || !data?.user?.id) {
    throw new Error(`Supabase auth user creation failed: ${error?.message || 'unknown error'}`);
  }
  return data.user.id;
}

/**
 * Check whether a Supabase auth user has confirmed their email.
 * Used as polling fallback if the Database Webhook missed delivery.
 */
export async function isEmailConfirmed(supabaseAuthId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(supabaseAuthId);
  if (error || !data?.user) return false;
  return !!data.user.email_confirmed_at;
}

/**
 * Delete the temporary Supabase auth.users entry.
 * Called after account activation (password setup) or rejection.
 */
export async function deleteSupabaseAuthUser(supabaseAuthId: string): Promise<void> {
  await getSupabaseAdmin().auth.admin.deleteUser(supabaseAuthId);
}

/**
 * Generate a time-limited signed URL for a private storage object.
 * @param bucket  e.g. 'student-documents'
 * @param path    e.g. 'registrations/{id}/college-id.jpg'
 * @param expiresInSeconds  default 900 (15 min)
 */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 900
): Promise<string> {
  const { data, error } = await getSupabaseAdmin().storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message || 'unknown error'}`);
  }
  return data.signedUrl;
}

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the storage path.
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const { error } = await getSupabaseAdmin().storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  return path;
}
