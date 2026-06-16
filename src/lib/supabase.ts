import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  // Fallback: the project URL provided by the user
  'https://lzwspnhvqimaojtdecwt.supabase.co';
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  // Fallback: the service_role key provided by the user
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6d3Nwbmh2cWltYW9qdGRlY3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYxNjA4MSwiZXhwIjoyMDk3MTkyMDgxfQ.ZpGvPWbxDJAg5UKxMqtO_ZdioX36EMKmLvEtPZOVPtk';
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_wodFRySyCtF22zZwEuWMtQ_jtP5nNlI';

/**
 * Server-side Supabase client using the service_role key.
 * Bypasses RLS. Use ONLY in server components / API routes.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Browser-side Supabase client using the anon key.
 * Subject to RLS. Use in client components.
 */
export const supabasePublic = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});
