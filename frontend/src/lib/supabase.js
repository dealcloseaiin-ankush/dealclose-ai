import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Completely disable background auto-refresh & session polling to prevent ERR_NAME_NOT_RESOLVED loops
export const supabase = createClient(
  supabaseUrl || "https://dummy-project.supabase.co",
  supabaseAnonKey || "dummy-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);