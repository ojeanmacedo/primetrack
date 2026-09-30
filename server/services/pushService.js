import crypto from 'crypto';
import webPush from 'web-push';
import { db } from '../db.js';
import { supabaseAdmin } from '../supabase.js';
import { createClient } from '@supabase/supabase-js';

// MonsterPay Cloud Storage Fallback (Livre de RLS para persistência ininterrupta em Vercel Serverless)
const MP_URL = 'https://wahkbxkiwdjtlnvvxxrh.supabase.co';
const MP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhaGtieGtpd2RqdGxudnZ4eHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDAxODgsImV4cCI6MjA4NjkxNjE4OH0.S97irN5_gTfDBId_-OggmBa1fwYLrV6eCaVRRbVSIR8';
let mpClient = null;
function getMpCloud() {
  if (!mpClient) {
    mpClient = createClient(MP_URL, MP_KEY);
  }
  return mpClient;
}

// Chaves VAPID Estáticas Globais (Essenciais para Vercel Serverless Function)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDDqgKlJ9eDLQjZKaMb06TzzD9hGygXvexJr4nb4ULiAGsJp2Ba5l_buv8cb9_wCy9dHA2lNMyTWvcnU0EON-Sg';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'WCksimHx0fLsj3JZNJwL_edI3B0Oy9IsfT_FCV8D9-w';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@primetrack.top';

webPush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

const OWNER_IDS = ['usr_1788826403159', 'usr_admin_digitaljm', 'usr_1790177682943'];
const isOwner = (id) => !id || OWNER_IDS.includes(id);

function getEndpointHash(endpoint) {
  if (!endpoint) return 'unknown';
  return crypto.createHash('md5').update(endpoint).digest('hex');
}

export async function saveSubscription(subscription, userId = 'usr_1788826403159') {
  if (!subscription || !subscription.endpoint) return;
  const effectiveUserId = userId || 'usr_1788826403159';
  
  // 1. Salva em memória/arquivo local
  const subs = db.get('pushSubscriptions') || [];
  const existsIdx = subs.findIndex(s => s.endpoint === subscription.endpoint);
  const subRecord = {
    ...subscription,
    userId: effectiveUserId,
    subscribedAt: new Date().toISOString()
  };
  if (existsIdx >= 0) {
    subs[existsIdx] = { ...subs[existsIdx], ...subRecord };
  } else {
    subs.push(subRecord);
  }
  db.set('pushSubscriptions', subs);

  // 2. Persiste em Cloud Storage (Supabase MonsterPay) para sobreviver 100% em qualquer Serverless Vercel
  try {
    const cloud = getMpCloud();
    const endpointHash = getEndpointHash(subscription.endpoint);
    const ipMarker = `push_sub_${endpointHash}:` + JSON.stringify(subRecord);

    // Remove registro anterior do mesmo endpoint se existir
    await cloud.from('pix_rate_limits').delete().like('ip_address', `push_sub_${endpointHash}:%`);
    // Insere nova subscription
    await cloud.from('pix_rate_limits').insert({ ip_address: ipMarker });
    console.log(`[WebPush] Inscrição persistida com sucesso no Cloud Storage para ${effectiveUserId}`);
  } catch (errCloud) {
    console.warn('[WebPush] Aviso ao salvar no Cloud Storage:', errCloud.message);
  }

  // 3. Fallback no Supabase secundário
  try {
    const endpointHash = getEndpointHash(subscription.endpoint);
    await supabaseAdmin.from('pixels').upsert({
      id: `push_sub_${endpointHash}`,
      user_id: effectiveUserId,
      name: 'WebPushDevice',
      domain: JSON.stringify(subRecord),
      status: 'active',
      emq_score: 10,
      events_count: 1
    });
  } catch (err) {}
}

export async function getAllSubscriptions(userId = null) {
  let list = db.get('pushSubscriptions') || [];
  const map = new Map();
  list.forEach(s => map.set(s.endpoint, s));

  // 1. Recupera do Cloud Storage garantido (MonsterPay Supabase)
  try {
    const cloud = getMpCloud();
    const { data: cloudRows } = await cloud.from('pix_rate_limits').select('*').like('ip_address', 'push_sub_%');
    if (cloudRows && cloudRows.length > 0) {
      cloudRows.forEach(row => {
        try {
          const rawJson = row.ip_address.substring(row.ip_address.indexOf(':') + 1);
          const parsed = JSON.parse(rawJson);
          if (parsed && parsed.endpoint) {
            map.set(parsed.endpoint, parsed);
          }
        } catch (e) {}
      });
    }
  } catch (eCloud) {
    console.warn('[WebPush] Erro ao buscar inscrições no Cloud Storage:', eCloud.message);
  }

  // 2. Recupera do Supabase secundário
  try {
    const { data } = await supabaseAdmin.from('pixels').select('*').like('id', 'push_sub_%');
    if (data && data.length > 0) {
      data.forEach(d => {
        try {
          const parsed = JSON.parse(d.domain);
          if (parsed && parsed.endpoint) {
            map.set(parsed.endpoint, { ...parsed, userId: d.user_id || parsed.userId });
          }
        } catch(e) {}
      });
    }
  } catch (e) {}

  list = Array.from(map.values());

  // Se houver userId, filtra ou faz fallback para donos/todas as inscrições ativas
  if (userId) {
    const matched = list.filter(s => {
      if (!s.userId) return true;
      if (isOwner(userId)) return isOwner(s.userId);
      return s.userId === userId || isOwner(s.userId);
    });
    if (matched.length > 0) return matched;
  }
  return list;
}

export async function removeSubscription(endpoint) {
  if (!endpoint) return;
  const subs = db.get('pushSubscriptions') || [];
  const filtered = subs.filter(s => s.endpoint !== endpoint);
  db.set('pushSubscriptions', filtered);

  try {
    const endpointHash = getEndpointHash(endpoint);
    const cloud = getMpCloud();
    await cloud.from('pix_rate_limits').delete().like('ip_address', `push_sub_${endpointHash}:%`);
    await supabaseAdmin.from('pixels').delete().eq('id', `push_sub_${endpointHash}`);
  } catch (e) {}
}

export async function sendSalesNotification({ title, body, icon, tag, data, userId = null }) {
  const subs = await getAllSubscriptions(userId);
  if (subs.length === 0) {
    console.log('[WebPush] Nenhuma inscrição encontrada' + (userId ? ` para o usuário ${userId}` : '') + '.');
    return { sent: 0, failed: 0, total: 0 };
  }

  const payload = JSON.stringify({
    title: title || '🎉 Venda Aprovada!',
    body: body || 'Nova venda registrada no PrimeTrack',
    icon: icon || 'https://app.primetrack.top/images/primetrack-app-icon.png',
    badge: 'https://app.primetrack.top/images/primetrack-app-icon.png',
    tag: tag ? `${tag}_${Date.now()}` : `sale_${Date.now()}`,
    data: data || { url: '/sales' }
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webPush.sendNotification(sub, payload, {
        TTL: 60 * 60 * 24,
        urgency: 'high'
      });
      sent++;
    } catch (err) {
      console.warn('[WebPush] Falha ao enviar para endpoint:', err.statusCode, err.message);
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await removeSubscription(sub.endpoint);
      }
    }
  }

  console.log(`[WebPush] Disparadas ${sent} notificações (${failed} falhas de ${subs.length} inscritos).`);
  return { sent, failed, total: subs.length };
}
