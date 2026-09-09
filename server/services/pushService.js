import webPush from 'web-push';
import { db } from '../db.js';

// VAPID keys persistentes locais
let pushConfig = db.get('pushConfig');

if (!pushConfig || !pushConfig.publicKey || !pushConfig.privateKey) {
  const vapidKeys = webPush.generateVAPIDKeys();
  pushConfig = {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
    contactEmail: 'mailto:admin@primetrack.top'
  };
  db.set('pushConfig', pushConfig);
}

webPush.setVapidDetails(
  pushConfig.contactEmail || 'mailto:admin@primetrack.top',
  pushConfig.publicKey,
  pushConfig.privateKey
);

export function getVapidPublicKey() {
  return pushConfig.publicKey;
}

export function saveSubscription(subscription) {
  if (!subscription || !subscription.endpoint) return;
  const subs = db.get('pushSubscriptions') || [];
  const exists = subs.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push({
      ...subscription,
      subscribedAt: new Date().toISOString()
    });
    db.set('pushSubscriptions', subs);
  }
}

export function removeSubscription(endpoint) {
  if (!endpoint) return;
  const subs = db.get('pushSubscriptions') || [];
  const filtered = subs.filter(s => s.endpoint !== endpoint);
  db.set('pushSubscriptions', filtered);
}

export async function sendSalesNotification({ title, body, icon, tag, data }) {
  const subs = db.get('pushSubscriptions') || [];
  if (subs.length === 0) {
    console.log('[WebPush] Nenhuma inscrição ativa no momento.');
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: title || '🎉 Venda Aprovada!',
    body: body || 'Nova venda registrada no PrimeTrack',
    icon: icon || '/images/primetrack-app-icon.png',
    badge: '/images/primetrack-app-icon.png',
    tag: tag || `sale_${Date.now()}`,
    data: data || { url: '/sales' }
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webPush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      console.warn('[WebPush] Falha ao enviar para endpoint:', err.statusCode, err.message);
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        removeSubscription(sub.endpoint);
      }
    }
  }

  console.log(`[WebPush] Disparadas ${sent} notificações (${failed} falhas).`);
  return { sent, failed };
}
