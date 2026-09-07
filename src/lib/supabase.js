import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://benxhyftwnzsofsmbkze.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o8VfATMLGlrzXAmtaJHf1w_ofvNaM4R';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
