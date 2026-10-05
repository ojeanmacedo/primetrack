import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import dns from 'dns';
import { URL } from 'url';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://benxhyftwnzsofsmbkze.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_fc7FSLBB6X3BokLfPEfEhQ_2jmvw38s';

let isOnline = false;
let checking = false;
let lastCheckTime = 0;
let host = '';

try {
  host = new URL(supabaseUrl).hostname;
} catch (e) {
  host = '';
}

function verifyHost() {
  if (!host) {
    isOnline = false;
    return;
  }
  const now = Date.now();
  if (checking || (now - lastCheckTime < 30000)) return;
  checking = true;
  dns.lookup(host, (err, address) => {
    checking = false;
    lastCheckTime = Date.now();
    isOnline = !err && Boolean(address);
  });
}

// Initial check triggered immediately
verifyHost();

const fastFetch = async (url, options = {}) => {
  verifyHost();
  if (!isOnline) {
    // Retorna imediatamente erro 500 sem travar nem acionar retentativas lentas do postgrest
    return new Response(JSON.stringify({ message: `Supabase host ${host} offline/unreachable` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    isOnline = false;
    return new Response(JSON.stringify({ message: `Supabase request failed: ${err.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  global: { fetch: fastFetch },
  auth: { persistSession: false }
});
