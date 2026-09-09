import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://abevsorvhbkltgbesism.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZXZzb3J2aGJrbHRnYmVzaXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODQ0NTgsImV4cCI6MjA5MTA2MDQ1OH0.rjN_rXix0kP2qEqoXyR4F0RLzwrqzZBPyTpg1Uvhn1Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Returns the stored value, or null ONLY when the row genuinely doesn't exist.
// Throws on any real error (network down, auth expired, RLS denied, backend error)
// so callers can tell "no data" apart from "couldn't reach the database" — the
// latter must NOT be treated as an empty dataset or it overwrites good cloud data.
export const dbGet = async (key) => {
  const { data, error } = await supabase
    .from('app_data')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
};

export const dbSet = async (key, value) => {
  const { error } = await supabase
    .from('app_data')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
};
