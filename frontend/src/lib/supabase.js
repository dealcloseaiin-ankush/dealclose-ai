import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Agar deployment me keys nahi hongi, toh Supabase client ko ek dummy URL milega taaki website crash na ho (white screen na aaye).
export const supabase = createClient(supabaseUrl || "https://dummy-project.supabase.co", supabaseAnonKey || "dummy-key");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your frontend .env file or Vercel.");
}