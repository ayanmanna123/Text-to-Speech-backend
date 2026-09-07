import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

let supabaseClient = null;
let supabaseAdminClient = null;

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      logger.warn('⚠️ Supabase credentials not fully configured in environment variables.');
    }
    supabaseClient = createClient(
      env.SUPABASE_URL || 'https://placeholder.supabase.co',
      env.SUPABASE_ANON_KEY || 'placeholder-anon-key'
    );
  }
  return supabaseClient;
};

export const getSupabaseAdmin = () => {
  if (!supabaseAdminClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn('⚠️ Supabase Admin Service Role key not configured in environment variables.');
    }
    supabaseAdminClient = createClient(
      env.SUPABASE_URL || 'https://placeholder.supabase.co',
      env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdminClient;
};
