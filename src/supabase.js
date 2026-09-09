import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://abevsorvhbkltgbesism.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZXZzb3J2aGJrbHRnYmVzaXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODQ0NTgsImV4cCI6MjA5MTA2MDQ1OH0.rjN_rXix0kP2qEqoXyR4F0RLzwrqzZBPyTpg1Uvhn1Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── STAGING / PRODUCTION DATA ISOLATION ──────────────────────────────────
// Production and every preview build share one Supabase project, so staging
// builds must not touch production's rows. Vercel sets REACT_APP_ENV=staging on
// Preview deploys only; those read/write "staging:"-prefixed keys instead.
// Safe by default: with the var unset (or if a staging build is ever served on
// the production host) it falls back to the real production data.
const PROD_HOST = 'stone-setting-pro.vercel.app';
const onProdHost = typeof window !== 'undefined' && window.location.hostname === PROD_HOST;
const NS = (process.env.REACT_APP_ENV === 'staging' && !onProdHost) ? 'staging:' : '';
export const isStagingData = NS !== '';
const nsKey = (key) => NS + key;

// Returns the stored value, or null ONLY when the row genuinely doesn't exist.
// Throws on any real error (network down, auth expired, RLS denied, backend error)
// so callers can tell "no data" apart from "couldn't reach the database" — the
// latter must NOT be treated as an empty dataset or it overwrites good cloud data.
export const dbGet = async (key) => {
  const { data, error } = await supabase
    .from('app_data')
    .select('value')
    .eq('key', nsKey(key))
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
};

export const dbSet = async (key, value) => {
  const { error } = await supabase
    .from('app_data')
    .upsert({ key: nsKey(key), value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
};
