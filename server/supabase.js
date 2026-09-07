import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://benxhyftwnzsofsmbkze.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_fc7FSLBB6X3BokLfPEfEhQ_2jmvw38s';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
