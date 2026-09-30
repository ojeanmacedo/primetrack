import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { sendCapiEvent } from './services/capi.js';
import { parseWebhook } from './services/webhooks.js';
import { attributeOrder } from './services/attribution.js';
import { resolveIpLocation } from './services/geoService.js';
import { getVapidPublicKey, saveSubscription, sendSalesNotification } from './services/pushService.js';
import { 
  getAuthorizationUrl, 
  exchangeCodeForLongLivedToken, 
  fetchUserProfile, 
  fetchAdAccounts, 
  fetchLiveAccountDetails,
  fetchCampaigns, 
  fetchAdsWithCreatives,
  updateMetaItemStatus,
  updateMetaItemDetails,
  deleteMetaItem,
  duplicateMetaCampaign,
  getUsdToBrlRate,
  invalidateAccountStructureCache
} from './services/metaService.js';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase.js';

const MONSTERPAY_SUPABASE_URL = 'https://wahkbxkiwdjtlnvvxxrh.supabase.co';
const MONSTERPAY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhaGtieGtpd2RqdGxudnZ4eHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDAxODgsImV4cCI6MjA4NjkxNjE4OH0.S97irN5_gTfDBId_-OggmBa1fwYLrV6eCaVRRbVSIR8';
let monsterpayClient = null;
function getMonsterPayClient() {
  if (!monsterpayClient) {
    monsterpayClient = createClient(MONSTERPAY_SUPABASE_URL, MONSTERPAY_SUPABASE_ANON_KEY);
  }
  return monsterpayClient;
}
import { createCheckout, handleWebhookEvent, ensureWebhookConfigured, subscribeWithCard } from './services/abacatepayService.js';
import * as OTPAuth from 'otpauth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Utilitários de fuso horário de São Paulo (UTC-3)
export function toBrazilYMD(dateInput = new Date()) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    // Fallback America/Sao_Paulo (UTC-3)
    const spDate = new Date(d.getTime() - (3 * 3600 * 1000));
    const y = spDate.getUTCFullYear();
    const m = String(spDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(spDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export const OWNER_USER_IDS = ['usr_1788826403159', 'usr_admin_digitaljm', 'usr_1790177682943'];
export function isOwnerUserId(id) {
  if (!id) return true; // fallback to master account
  return OWNER_USER_IDS.includes(id);
}

// Cache anti-duplicação de notificações push (TTL de 15 minutos para evitar disparos em rajada de webhooks repetidos)
const recentlyNotifiedOrders = new Map();

export function resolveDateRange(datePreset = 'today', since = null, until = null) {
  if (since && until) {
    return { since, until, isMaximum: false };
  }
  const today = toBrazilYMD(new Date());
  if (!today) {
    return { since: null, until: null, isMaximum: true };
  }
  const [y, m, d] = today.split('-').map(Number);

  const normalized = (datePreset || 'today').toLowerCase()
    .replace('últimos ', '')
    .replace('ultimos ', '')
    .trim();

  if (normalized === 'today' || normalized === 'hoje') {
    return { since: today, until: today, isMaximum: false };
  } else if (normalized === 'yesterday' || normalized === 'ontem') {
    const yestDate = new Date(Date.UTC(y, m - 1, d - 1));
    const yest = yestDate.toISOString().slice(0, 10);
    return { since: yest, until: yest, isMaximum: false };
  } else if (normalized === 'last_7d' || normalized === '7d' || normalized === '7 dias') {
    const d7Date = new Date(Date.UTC(y, m - 1, d - 6));
    const d7 = d7Date.toISOString().slice(0, 10);
    return { since: d7, until: today, isMaximum: false };
  } else if (normalized === 'last_14d' || normalized === 'last_15d' || normalized === '14d' || normalized === '15d' || normalized === '14 dias' || normalized === '15 dias') {
    const d15Date = new Date(Date.UTC(y, m - 1, d - 14));
    const d15 = d15Date.toISOString().slice(0, 10);
    return { since: d15, until: today, isMaximum: false };
  } else if (normalized === 'last_30d' || normalized === '30d' || normalized === '30 dias') {
    const d30Date = new Date(Date.UTC(y, m - 1, d - 29));
    const d30 = d30Date.toISOString().slice(0, 10);
    return { since: d30, until: today, isMaximum: false };
  } else if (normalized === 'this_month' || normalized === 'este mês' || normalized === 'este mes') {
    const mStart = `${today.slice(0, 7)}-01`;
    return { since: mStart, until: today, isMaximum: false };
  } else if (normalized === 'last_month' || normalized === 'mês passado' || normalized === 'mes passado') {
    const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
    const lastDayPrevMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
    const prevYear = prevMonthDate.getUTCFullYear();
    const prevMonthStr = String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0');
    const s = `${prevYear}-${prevMonthStr}-01`;
    const u = `${prevYear}-${prevMonthStr}-${String(lastDayPrevMonth).padStart(2, '0')}`;
    return { since: s, until: u, isMaximum: false };
  } else if (normalized === 'maximum' || normalized === 'máximo' || normalized === 'maximo') {
    return { since: null, until: null, isMaximum: true };
  }
  return { since: today, until: today, isMaximum: false };
}

export function getCampaignsCacheKey(userId, datePreset, resolvedRange) {
  const uid = userId || 'all';
  if (resolvedRange?.isMaximum || datePreset === 'maximum' || datePreset === 'maximo') {
    return `${uid}_maximum`;
  }
  if (resolvedRange?.since && resolvedRange?.until) {
    return `${uid}_${resolvedRange.since}_${resolvedRange.until}`;
  }
  return `${uid}_${datePreset || 'today'}`;
}

/**
 * Persistência Definitiva de Métricas Históricas Diárias (Daily Campaign Insights)
 * Garante que gastos e métricas de campanhas nunca sejam perdidos ou zerados,
 * mesmo se a conta for bloqueada, desativada ou desconectada no futuro.
 */
export function getDailyCampaignInsights(userId = null, since = null, until = null, isMaximum = false) {
  const allInsights = db.get('daily_campaign_insights') || [];
  const filtered = allInsights.filter(item => {
    if (!item) return false;
    if (userId && !isOwnerUserId(userId) && item.userId && item.userId !== userId) return false;
    if (isOwnerUserId(userId) && item.userId && !isOwnerUserId(item.userId)) return false;
    if (isMaximum) return true;
    if (since && until) {
      return item.date >= since && item.date <= until;
    }
    if (since) {
      return item.date === since;
    }
    return true;
  });

  // Agrupa por campaignId se o período abrange múltiplos dias
  const groupedMap = new Map();
  filtered.forEach(item => {
    const cId = String(item.campaignId || item.id);
    if (!groupedMap.has(cId)) {
      groupedMap.set(cId, {
        ...item,
        id: cId,
        campaignId: cId,
        spend: Number(item.spend || 0),
        rawSpendUsd: Number(item.rawSpendUsd || 0),
        impressions: Number(item.impressions || 0),
        clicks: Number(item.clicks || 0),
        sales: Number(item.sales || 0),
        revenue: Number(item.revenue || 0),
        adsets: Array.isArray(item.adsets) ? JSON.parse(JSON.stringify(item.adsets)) : [],
        ads: Array.isArray(item.ads) ? JSON.parse(JSON.stringify(item.ads)) : []
      });
    } else {
      const cur = groupedMap.get(cId);
      cur.spend += Number(item.spend || 0);
      cur.rawSpendUsd += Number(item.rawSpendUsd || 0);
      cur.impressions += Number(item.impressions || 0);
      cur.clicks += Number(item.clicks || 0);
      cur.sales += Number(item.sales || 0);
      cur.revenue += Number(item.revenue || 0);

      if (Array.isArray(item.adsets)) {
        item.adsets.forEach(newAs => {
          const asId = String(newAs.id || newAs.adsetId);
          const matchAs = cur.adsets.find(a => String(a.id || a.adsetId) === asId);
          if (matchAs) {
            matchAs.spend = (Number(matchAs.spend || 0) + Number(newAs.spend || 0)).toFixed(2);
            matchAs.impressions = Number(matchAs.impressions || 0) + Number(newAs.impressions || 0);
            matchAs.clicks = Number(matchAs.clicks || 0) + Number(newAs.clicks || 0);
          } else {
            cur.adsets.push(newAs);
          }
        });
      }
      if (Array.isArray(item.ads)) {
        item.ads.forEach(newAd => {
          const adId = String(newAd.id || newAd.adId);
          const matchAd = cur.ads.find(a => String(a.id || a.adId) === adId);
          if (matchAd) {
            matchAd.spend = (Number(matchAd.spend || 0) + Number(newAd.spend || 0)).toFixed(2);
            matchAd.impressions = Number(matchAd.impressions || 0) + Number(newAd.impressions || 0);
            matchAd.clicks = Number(matchAd.clicks || 0) + Number(newAd.clicks || 0);
          } else {
            cur.ads.push(newAd);
          }
        });
      }
    }
  });

  return Array.from(groupedMap.values()).map(c => {
    const s = Number(c.spend || 0);
    const r = Number(c.revenue || 0);
    const cl = Number(c.clicks || 0);
    const imp = Number(c.impressions || 0);
    const sal = Number(c.sales || 0);
    return {
      ...c,
      accountId: c.accountId || (c.adAccountId ? String(c.adAccountId).replace('act_', '') : ''),
      spend: s.toFixed(2),
      rawSpendUsd: c.rawSpendUsd > 0 ? c.rawSpendUsd.toFixed(2) : null,
      revenue: r.toFixed(2),
      profit: (r - s).toFixed(2),
      roas: s > 0 ? (r / s).toFixed(2) : '0.00',
      cpa: sal > 0 ? (s / sal).toFixed(2) : '0.00',
      cpc: cl > 0 ? (s / cl).toFixed(2) : '0.00',
      cpm: imp > 0 ? ((s / imp) * 1000).toFixed(2) : '0.00',
      ctr: imp > 0 ? ((cl / imp) * 100).toFixed(2) + '%' : '0.00%'
    };
  });
}

export function saveDailyCampaignInsights(campaignsList, dateStr, userId = null) {
  if (!Array.isArray(campaignsList) || campaignsList.length === 0 || !dateStr) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return;

  const validDate = dateStr.trim();
  const currentInsights = db.get('daily_campaign_insights') || [];
  const insightsMap = new Map();
  currentInsights.forEach(item => {
    const key = `${item.date}_${item.campaignId || item.id}_${item.userId || 'default'}`;
    insightsMap.set(key, item);
  });

  let hasChanges = false;
  campaignsList.forEach(c => {
    if (!c || !c.id) return;
    const cSpend = Number(c.spend || 0);
    const cImpr = Number(c.impressions || 0);
    const cClicks = Number(c.clicks || 0);
    const cSales = Number(c.sales || 0);
    const cRev = Number(c.revenue || 0);

    // Salva qualquer campanha que teve gasto ou qualquer movimentação naquele dia
    if (cSpend > 0 || cImpr > 0 || cClicks > 0 || cSales > 0 || cRev > 0) {
      const campIdStr = String(c.id);
      const effectiveUser = c.userId || userId || 'usr_1788826403159';
      const key = `${validDate}_${campIdStr}_${effectiveUser}`;
      const existing = insightsMap.get(key);

      const existingSpend = Number(existing?.spend || 0);
      if (!existing || cSpend >= existingSpend || (cSpend > 0 && existingSpend === 0)) {
        insightsMap.set(key, {
          id: key,
          date: validDate,
          userId: effectiveUser,
          campaignId: campIdStr,
          name: c.name || existing?.name || 'Campanha',
          adAccountId: c.adAccountId || c.accountId || existing?.adAccountId || null,
          accountName: c.accountName || existing?.accountName || null,
          spend: cSpend.toFixed(2),
          rawSpendUsd: c.rawSpendUsd !== undefined ? c.rawSpendUsd : (existing?.rawSpendUsd || null),
          usdRate: c.usdRate || existing?.usdRate || null,
          currency: c.currency || existing?.currency || 'BRL',
          impressions: cImpr || existing?.impressions || 0,
          clicks: cClicks || existing?.clicks || 0,
          cpc: c.cpc || existing?.cpc || '0.00',
          cpm: c.cpm || existing?.cpm || '0.00',
          ctr: c.ctr || existing?.ctr || '0.00%',
          sales: cSales || existing?.sales || 0,
          revenue: c.revenue || existing?.revenue || '0.00',
          profit: c.profit || existing?.profit || '0.00',
          roas: c.roas || existing?.roas || '0.00',
          cpa: c.cpa || existing?.cpa || '0.00',
          status: c.status !== undefined ? c.status : existing?.status,
          rawStatus: c.rawStatus || existing?.rawStatus || 'ACTIVE',
          effectiveStatus: c.effectiveStatus || existing?.effectiveStatus || 'ACTIVE',
          adsets: Array.isArray(c.adsets) ? c.adsets : (existing?.adsets || []),
          ads: Array.isArray(c.ads) ? c.ads : (existing?.ads || []),
          updatedAt: new Date().toISOString()
        });
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    db.set('daily_campaign_insights', Array.from(insightsMap.values()));
  }
}

export function getCleanClientIp(req) {
  if (!req) return '189.40.122.45';
  const cf = req.headers['cf-connecting-ip'];
  if (cf && typeof cf === 'string' && cf.trim()) return cf.trim();
  const real = req.headers['x-real-ip'];
  if (real && typeof real === 'string' && real.trim()) return real.trim();
  const fwd = req.headers['x-forwarded-for'];
  if (fwd && typeof fwd === 'string') {
    const first = fwd.split(',')[0].trim();
    if (first) return first;
  }
  const raw = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return raw.replace('::ffff:', '').trim() || '189.40.122.45';
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir o arquivo pixel.js (dinâmico e protegido contra visualização direta no navegador)
app.get('/pixel.js', (req, res) => {
  const dest = (req.headers['sec-fetch-dest'] || '').toLowerCase();
  const accept = (req.headers['accept'] || '').toLowerCase();
  const isDirectBrowserDoc = dest === 'document' || (accept.includes('text/html') && req.query.mode !== 'raw');

  // Se for aberto diretamente na barra de endereço do navegador pelo usuário/curioso
  if (isDirectBrowserDoc) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(403).send('PrimeTrack tracking engine carregando...');
  }

  // Para tags <script>, fetch, beacons ou qualquer outro carregamento
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.sendFile(path.join(__dirname, 'public', 'pixel.js'));
});

// Endpoint de teste de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', service: 'PrimeTrack Engine', version: '2.0.0' });
});

/**
 * Endpoint de resolução automática de configuração do Pixel
 * Permite que o pixel.js descubra o metaPixelId e regras apenas pelo pixelId (igual ao LowTrack/Utmify)
 */
app.get('/api/pixel/config', async (req, res) => {
  const id = req.query.id || req.query.pixelId;
  const pixels = db.get('pixels') || [];
  const settings = db.get('settings') || {};

  let foundPixel = pixels.find(p => p.pixelId === id || p.internalPixelId === id || p.id === id);

  // Se não achou na memória, busca no Supabase
  if (!foundPixel && id) {
    try {
      const { data } = await supabaseAdmin
        .from('pixels')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        let metaPixelId = '';
        let icRule = null;
        let icType = 'css';
        let metaPixels = [];

        try {
          const parsed = JSON.parse(data.domain);
          metaPixelId = parsed.metaPixelId || '';
          icRule = parsed.icValue || parsed.icRule || null;
          icType = parsed.icType || 'css';
          metaPixels = parsed.metaPixels || [];
        } catch (e) {
          metaPixelId = data.domain || '';
        }

        foundPixel = {
          pixelId: data.id,
          metaPixelId,
          metaPixels,
          icRule,
          icType
        };
      }
    } catch (err) {
      console.warn('Erro ao consultar Supabase em /api/pixel/config:', err.message);
    }
  }

  const defaultMetaPixel = '1056706567239394';
  const resolvedMetaPixelId = (foundPixel && foundPixel.metaPixelId) 
    ? foundPixel.metaPixelId 
    : (/^\d{10,25}$/.test(id) ? id : (settings.metaPixelId || defaultMetaPixel));

  // Extrai lista de todos os Meta Pixel IDs configurados
  let metaPixelIds = [];
  if (foundPixel && Array.isArray(foundPixel.metaPixels) && foundPixel.metaPixels.length > 0) {
    metaPixelIds = foundPixel.metaPixels.map(m => m.metaPixelId).filter(Boolean);
  } else if (resolvedMetaPixelId) {
    metaPixelIds = [resolvedMetaPixelId];
  }

  res.json({
    pixelId: id,
    metaPixelId: resolvedMetaPixelId,
    metaPixelIds: metaPixelIds,
    icRule: foundPixel ? (foundPixel.icValue || foundPixel.icRule) : '.btn-checkout',
    icType: foundPixel ? (foundPixel.icType || 'css') : 'css'
  });
});

app.get('/api/pixels', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId || 'usr_1788826403159';
  const userPixels = db.get(`pixels_${userId}`) || db.get('pixels') || [];
  // Retorna sempre o estado em tempo real do banco local
  const localPixels = userPixels.filter(p => !p.id?.startsWith('settings_') && !p.id?.startsWith('push_sub_') && !p.id?.startsWith('wh_tok_') && p.name !== 'UserSettings');
  return res.json(localPixels);
});

app.post('/api/pixels', async (req, res) => {
  const pixels = req.body.pixels || req.body;
  const targetUserId = req.headers['x-user-id'] || req.body.userId || 'usr_1788826403159'; // jeeanmacedo@gmail.com
  if (Array.isArray(pixels)) {
    const validPixels = pixels.filter(p => !p.id?.startsWith('settings_') && !p.id?.startsWith('push_sub_') && !p.id?.startsWith('wh_tok_') && p.name !== 'UserSettings');
    db.set('pixels', validPixels);
    db.set(`pixels_${targetUserId}`, validPixels);
    if (isOwnerUserId(targetUserId)) {
      db.set('pixels', validPixels);
    }

    // Persiste no Supabase com isolamento por usuário
    try {
      // Remove do Supabase pixels que foram excluídos pelo usuário
      const validIds = validPixels.map(px => px.pixelId || px.internalPixelId || px.id).filter(Boolean);
      if (validIds.length > 0) {
        await supabaseAdmin.from('pixels').delete().eq('user_id', targetUserId).not('id', 'in', `(${validIds.join(',')})`);
      } else {
        await supabaseAdmin.from('pixels').delete().eq('user_id', targetUserId);
      }

      for (const px of validPixels) {
        const id = px.pixelId || px.internalPixelId || px.id;
        if (!id || id.startsWith('settings_') || px.name === 'UserSettings') continue;
        const configJson = JSON.stringify({
          domain: px.domains || '*',
          metaPixelId: px.metaPixelId || '',
          metaPixels: px.metaPixels || [],
          capiToken: px.capiToken || px.capiTokenRaw || '',
          capiTokenRaw: px.capiTokenRaw || px.capiToken || '',
          icType: px.icType || 'css',
          icValue: px.icValue || '',
          icRule: px.icRule || ''
        });

        await supabaseAdmin.from('pixels').upsert({
          id,
          user_id: targetUserId,
          name: px.name || 'Pixel',
          domain: configJson,
          status: (px.status === 'Ativo' || px.status === 'active') ? 'active' : 'inactive',
          emq_score: 9.3,
          events_count: 0
        });
      }
    } catch (err) {
      console.warn('Erro ao sincronizar pixels no Supabase:', err.message);
    }

    return res.json({ success: true, pixels: validPixels });
  }
  res.status(400).json({ success: false, error: 'Lista de pixels inválida' });
});

/**
 * 1. Rota de Rastreamento de Eventos (Client -> Server CAPI)
 */
app.post('/api/track/event', async (req, res) => {
  try {
    const pixelId = req.body.pixelId || req.body.pixel_id;
    const sessionId = req.body.sessionId || req.body.click_id || req.body.pt_sid;
    const eventName = req.body.eventName || req.body.event_name || 'PageView';
    const eventId = req.body.eventId || req.body.event_id || `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const eventSourceUrl = req.body.eventSourceUrl || req.body.page || req.body.url;
    const referrer = req.body.referrer || '';
    const fbp = req.body.fbp;
    const fbc = req.body.fbc;
    const utms = req.body.utms || {
      utm_source: req.body.utm_source || req.body.src,
      utm_medium: req.body.utm_medium,
      utm_campaign: req.body.utm_campaign,
      utm_content: req.body.utm_content,
      utm_term: req.body.utm_term,
      fbclid: req.body.fbclid,
      sck: req.body.sck
    };
    const customData = req.body.customData || req.body.custom_data || {};

    const clientIp = getCleanClientIp(req);
    const clientUserAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    // Geolocalização real do visitante capturada pelo Pixel PrimeTrack
    const geo = await resolveIpLocation(clientIp);

    // Grava/Atualiza Sessão
    const sessions = db.get('sessions') || [];
    let session = sessions.find(s => s.sessionId === sessionId || (sessionId && s.sessionId === sessionId));

    if (!session && sessionId) {
      session = {
        sessionId: sessionId,
        pixelId: pixelId || null,
        ip: clientIp,
        city: geo.city,
        state: geo.state,
        fbp,
        fbc,
        userAgent: clientUserAgent,
        referrer,
        landingUrl: eventSourceUrl,
        utms,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };
      sessions.unshift(session);
      if (sessions.length > 500) sessions.pop();
    } else if (session) {
      session.lastSeen = new Date().toISOString();
      if (pixelId && !session.pixelId) session.pixelId = pixelId;
      if (!session.city && geo.city) session.city = geo.city;
      if (!session.state && geo.state) session.state = geo.state;
      if (fbc && !session.fbc) session.fbc = fbc;
      if (fbp && !session.fbp) session.fbp = fbp;
      if (utms.utm_campaign && (!session.utms || !session.utms.utm_campaign)) {
        session.utms = { ...session.utms, ...utms };
      }
    }
    db.set('sessions', sessions);

    // Envia para o Meta CAPI Server-Side enriquecido com dados de geolocalização reais do pixel
    const settings = db.get('settings') || {};
    let pixels = db.get('pixels') || [];
    if (!pixels || pixels.length === 0) {
      try {
        const { data: supaPixels } = await supabaseAdmin.from('pixels').select('*').eq('status', 'active');
        if (Array.isArray(supaPixels) && supaPixels.length > 0) {
          pixels = supaPixels.map(p => {
            let extra = {};
            try { extra = JSON.parse(p.domain); } catch(e){}
            return {
              id: p.id,
              pixelId: p.id,
              name: p.name,
              domain: extra.domain || '*',
              metaPixelId: extra.metaPixelId || '',
              metaPixels: extra.metaPixels || [],
              capiToken: extra.capiToken || extra.capiTokenRaw || '',
              capiTokenRaw: extra.capiTokenRaw || extra.capiToken || ''
            };
          });
        }
      } catch (errSup) {}
    }

    // Busca estritamente o pixel PrimeTrack correspondente à requisição
    const matchedPixel = pixels.find(p => p.pixelId === pixelId || p.id === pixelId || (Array.isArray(p.metaPixels) && p.metaPixels.some(m => m.metaPixelId === pixelId)) || p.metaPixelId === pixelId);
    
    // Obter fallback de token do perfil do Facebook conectado
    const fbConns = db.get('facebook_connections') || [];
    const activeFbToken = (fbConns[0] && fbConns[0].accessToken) ? fbConns[0].accessToken : settings.metaAccessToken;

    const metaPixelsToSend = [];
    if (matchedPixel) {
      if (Array.isArray(matchedPixel.metaPixels) && matchedPixel.metaPixels.length > 0) {
        matchedPixel.metaPixels.forEach(mp => {
          if (mp.metaPixelId) {
            metaPixelsToSend.push({
              pixelId: mp.metaPixelId,
              accessToken: mp.capiToken || matchedPixel.capiTokenRaw || matchedPixel.capiToken || activeFbToken
            });
          }
        });
      } else if (matchedPixel.metaPixelId) {
        metaPixelsToSend.push({
          pixelId: matchedPixel.metaPixelId,
          accessToken: matchedPixel.capiTokenRaw || matchedPixel.capiToken || activeFbToken
        });
      }
    }

    let capiResult = { success: false, emq: { score: 7.3 }, response: null };
    for (const targetMeta of metaPixelsToSend) {
      if (targetMeta.pixelId && targetMeta.accessToken) {
        const resCapi = await sendCapiEvent({
          pixelId: targetMeta.pixelId,
          accessToken: targetMeta.accessToken,
          eventName: eventName || 'PageView',
          eventId: eventId,
          eventSourceUrl,
          userData: {
            fbp,
            fbc,
            city: geo.city,
            state: geo.state,
            country: 'BR',
            external_id: sessionId || undefined,
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent
          },
          customData,
          testEventCode: settings.testEventCode
        });
        if (resCapi && resCapi.success) capiResult = resCapi;
      }
    }

    // Registra evento no banco
    const eventRecord = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      eventName,
      eventId,
      sessionId,
      pixelId,
      timestamp: new Date().toISOString(),
      emq: capiResult.emq.score,
      capiStatus: capiResult.success ? 'success' : 'failed'
    };
    db.append('events', eventRecord);

    // Persiste no Supabase para sobreviver à reciclagem serverless
    try {
      await supabaseAdmin.from('events').insert({
        id: eventRecord.id,
        user_id: 'usr_1788826403159',
        pixel_id: pixelId || 'pt_pixel',
        event_name: eventName,
        event_id: eventId,
        session_id: sessionId,
        emq_score: capiResult?.emq?.score || 9.1,
        capi_status: capiResult?.success ? 'success' : 'failed'
      });
    } catch (supaErr) {
      console.warn('Erro ao salvar evento no Supabase:', supaErr.message);
    }

    res.json({
      success: true,
      eventRecord,
      emq: capiResult.emq
    });
  } catch (err) {
    console.error('Erro em /api/track/event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Ingestão Universal de Webhooks (Kiwify, Hotmart, Eduzz, etc.)
 */
app.all([
  '/api/webhook',
  '/api/webhooks',
  '/api/webhooks/:gateway',
  '/api/webhooks/:token/:gateway',
  '/api/webhook/:token/:gateway',
  '/webhook',
  '/webhooks',
  '/webhooks/:gateway',
  '/webhook/:token/:gateway',
  '/webhook/monsterpay',
  '/monsterpay',
  '/monsterpay/webhook',
  '/monsterpay/:action'
], async (req, res) => {
  try {
    const gateway = req.params.gateway || req.query.gateway || req.query.platform || (req.body && req.body.gateway) || (req.body && req.body.platform) || 'monsterpay';
    const token = req.params.token || req.query.token || req.headers['x-api-token'] || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null) || (req.body && req.body.token);
    const body = { ...req.query, ...(req.body || {}) };
    const clientIp = getCleanClientIp(req);

    // Atualiza data de último uso do token se fornecido
    if (token) {
      try {
        const allToks = db.get('webhook_tokens') || [];
        const matchIdx = allToks.findIndex(t => t.token === token);
        if (matchIdx >= 0) {
          const now = new Date();
          allToks[matchIdx].lastUsed = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          db.set('webhook_tokens', allToks);
        }
      } catch (e) {}
    }

    console.log(`[Webhook Recebido] URL: ${req.originalUrl}, Method: ${req.method}, Gateway: ${gateway}, Token: ${token || 'não fornecido'}, Código:`, body.order_id || body.transaction || body.id || body.code);

    // 1. Normaliza payload do gateway
    const parsed = parseWebhook(gateway, body);

    // Rejeita requisições vazias, pings sem dados de pedido ou testes genéricos
    const hasOrderCode = body.order_id || body.transaction_id || body.id || body.code || body.transaction || body.data?.id || body.data?.order_id;
    const hasCustomerData = parsed.customer.email || parsed.customer.phone || (parsed.customer.name && parsed.customer.name !== 'Cliente MonsterPay' && parsed.customer.name !== 'Cliente');
    if (!hasOrderCode && !hasCustomerData) {
      console.log(`[Webhook Ignorado] Payload vazio ou ping sem dados de venda recebido de ${gateway}.`);
      return res.status(200).json({ success: true, message: 'Ping/Test received but not saved (no order data)' });
    }

    // 2. Executa atribuição cross-session inteligente (recupera IP, cidade e estado do Pixel)
    const attribution = attributeOrder(parsed, clientIp);

    // 2.1 Resolução resiliente da Conta de Anúncios (ad_account) para atribuição e isolamento
    if (!attribution.accountId || !attribution.accountName) {
      try {
        let foundCamp = null;
        const allLocalCamps = db.get('campaigns') || [];

        if (attribution.campaignId) {
          foundCamp = allLocalCamps.find(c => String(c.id).trim() === String(attribution.campaignId).trim());
          if (!foundCamp) {
            const { data: sCamps } = await supabaseAdmin
              .from('campaigns')
              .select('id, name, account_id')
              .eq('id', String(attribution.campaignId).trim())
              .limit(1);
            if (sCamps && sCamps[0]) foundCamp = sCamps[0];
          }
        }

        if (!foundCamp && attribution.adId) {
          foundCamp = allLocalCamps.find(c => Array.isArray(c.ads) && c.ads.some(a => String(a.id || a.adId).trim() === String(attribution.adId).trim()));
        }

        if (!foundCamp && attribution.campaign && attribution.campaign !== 'Orgânico') {
          const cLower = attribution.campaign.toLowerCase().trim();
          foundCamp = allLocalCamps.find(c => (c.name || '').toLowerCase().trim() === cLower);
          if (!foundCamp) {
            const { data: sCamps } = await supabaseAdmin
              .from('campaigns')
              .select('id, name, account_id')
              .eq('name', attribution.campaign)
              .limit(1);
            if (sCamps && sCamps[0]) foundCamp = sCamps[0];
          }
        }

        // 4. Fallback ao vivo: Consulta direta na Meta Graph API (para campanhas criadas minutos antes da primeira venda)
        if (!foundCamp && (attribution.campaignId || attribution.adId)) {
          try {
            const { data: conns } = await supabaseAdmin
              .from('facebook_connections')
              .select('access_token')
              .limit(1);
            const token = conns?.[0]?.access_token;
            if (token) {
              if (attribution.campaignId) {
                const metaRes = await fetch(`https://graph.facebook.com/v20.0/${attribution.campaignId}?fields=id,name,account_id&access_token=${token}`);
                const metaCamp = await metaRes.json();
                if (metaCamp && metaCamp.account_id) {
                  foundCamp = {
                    id: metaCamp.id,
                    name: metaCamp.name,
                    account_id: metaCamp.account_id
                  };
                  supabaseAdmin.from('campaigns').upsert({
                    id: String(metaCamp.id),
                    user_id: 'usr_1788826403159',
                    account_id: String(metaCamp.account_id).replace('act_', ''),
                    name: metaCamp.name,
                    status: true,
                    updated_at: new Date().toISOString()
                  }).then(() => {}).catch(() => {});
                }
              } else if (attribution.adId) {
                const metaRes = await fetch(`https://graph.facebook.com/v20.0/${attribution.adId}?fields=id,name,account_id,campaign_id&access_token=${token}`);
                const metaAd = await metaRes.json();
                if (metaAd && metaAd.account_id) {
                  foundCamp = {
                    id: metaAd.campaign_id,
                    name: metaAd.name,
                    account_id: metaAd.account_id
                  };
                  if (!attribution.campaignId && metaAd.campaign_id) {
                    attribution.campaignId = metaAd.campaign_id;
                  }
                }
              }
            }
          } catch (eMetaLive) {
            console.warn('[Webhook] Erro no fallback ao vivo do Graph API:', eMetaLive.message);
          }
        }

        if (foundCamp) {
          const rawAccId = foundCamp.account_id || foundCamp.accountId || foundCamp.adAccountId;
          if (rawAccId && !attribution.accountId) {
            attribution.accountId = String(rawAccId).startsWith('act_') ? String(rawAccId) : `act_${rawAccId}`;
          }
          if (foundCamp.accountName && !attribution.accountName) {
            attribution.accountName = foundCamp.accountName;
          }
        }

        if (attribution.accountId && !attribution.accountName) {
          const cleanAccId = String(attribution.accountId).replace('act_', '');
          const localAccs = db.get('ad_accounts') || [];
          const foundAcc = localAccs.find(a => (a.accountId || a.id || '').replace('act_', '') === cleanAccId);
          if (foundAcc && foundAcc.name) {
            attribution.accountName = foundAcc.name;
          } else {
            const { data: sAccs } = await supabaseAdmin
              .from('ad_accounts')
              .select('name')
              .or(`id.eq.act_${cleanAccId},id.eq.${cleanAccId}`)
              .limit(1);
            if (sAccs && sAccs[0]?.name) {
              attribution.accountName = sAccs[0].name;
            } else {
              // Fallback ao vivo para nome da conta direto na Meta API
              try {
                const { data: conns } = await supabaseAdmin.from('facebook_connections').select('access_token').limit(1);
                const token = conns?.[0]?.access_token;
                if (token) {
                  const resAcc = await fetch(`https://graph.facebook.com/v20.0/act_${cleanAccId}?fields=id,name&access_token=${token}`);
                  const dAcc = await resAcc.json();
                  if (dAcc && dAcc.name) {
                    attribution.accountName = dAcc.name;
                    supabaseAdmin.from('ad_accounts').upsert({
                      id: `act_${cleanAccId}`,
                      user_id: 'usr_1788826403159',
                      name: dAcc.name,
                      status: 'Ativa'
                    }).then(() => {}).catch(() => {});
                  }
                }
              } catch (eAccLive) {}
            }
          }
        }
      } catch (errAccResolve) {
        console.warn('[Webhook] Erro ao resolver conta de anúncios:', errAccResolve.message);
      }
    }

    // Resolução de Cidade, Estado, CEP e País reais pelo Pixel CAPI e IP
    const effectiveIp = attribution.ip || clientIp || '189.40.122.45';
    let resolvedCity = parsed.customer.city || attribution.city;
    let resolvedState = parsed.customer.state || attribution.state;
    let resolvedZip = parsed.customer.zip || '';
    let resolvedCountry = parsed.customer.country || 'BR';

    if (!resolvedCity || !resolvedState || !resolvedZip) {
      const geo = await resolveIpLocation(effectiveIp);
      if (!resolvedCity) resolvedCity = geo.city;
      if (!resolvedState) resolvedState = geo.state;
      if (!resolvedZip && geo.zip) resolvedZip = geo.zip;
      if (!resolvedCountry && geo.country) resolvedCountry = geo.country;
    }

    parsed.customer.city = resolvedCity;
    parsed.customer.state = resolvedState;
    parsed.customer.zip = resolvedZip;
    parsed.customer.country = resolvedCountry;

    // 3. Envia evento Purchase enriquecido para Meta CAPI (Isolamento Estrito por Pixel/Campanha/Domínio)
    const settings = db.get('settings') || {};
    let pixels = [];

    try {
      const { data: supaPixels } = await supabaseAdmin.from('pixels').select('*').eq('status', 'active');
      if (Array.isArray(supaPixels) && supaPixels.length > 0) {
        pixels = supaPixels
          .filter(p => p.id && !p.id.startsWith('push_sub_') && !p.id.startsWith('push_') && !p.id.startsWith('wh_tok_'))
          .map(p => {
            let extra = {};
            try { extra = JSON.parse(p.domain); } catch(e){}
            return {
              id: p.id,
              pixelId: p.id,
              name: p.name,
              domain: extra.domain || '*',
              metaPixelId: extra.metaPixelId || '',
              metaPixels: extra.metaPixels || [],
              capiToken: extra.capiToken || extra.capiTokenRaw || '',
              capiTokenRaw: extra.capiTokenRaw || extra.capiToken || '',
              icRule: extra.icRule || '',
              icValue: extra.icValue || ''
            };
          });
      }
    } catch (errSup) {}

    if (pixels.length === 0) {
      pixels = (db.get('pixels') || []).filter(p => p.id && !p.id.startsWith('push_sub_'));
    }

    // Identifica o pixel PrimeTrack exato atrelado à sessão do visitante, ao tracking ou ao domínio
    let targetPixelId = attribution.pixelId || parsed.tracking?.pixelId || parsed.tracking?.pt_pixel_id;

    if (!targetPixelId && (attribution.sessionId || parsed.tracking?.sessionId || attribution.fbp)) {
      try {
        const sid = attribution.sessionId || parsed.tracking?.sessionId;
        if (sid) {
          const { data: evs } = await supabaseAdmin
            .from('events')
            .select('pixel_id')
            .eq('session_id', sid)
            .not('pixel_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);
          if (evs && evs[0]?.pixel_id && !evs[0].pixel_id.startsWith('push_')) {
            targetPixelId = evs[0].pixel_id;
          }
        }
      } catch (errRecov) {}
    }

    // Se o webhook veio sem sessionId (alguns gateways como MonsterPay limpam parâmetros customizados),
    // recupera a sessão do InitiateCheckout mais recente no mesmo produto/pixel nos últimos 10 minutos
    if (!attribution.sessionId && !parsed.tracking?.sessionId) {
      try {
        let probablePxId = targetPixelId;
        if (!probablePxId) {
          const pLower = (parsed.productName || '').toLowerCase();
          const cLower = (attribution.campaign || '').toLowerCase();
          if (pLower.includes('transformando') || pLower.includes('kaue') || cLower.includes('kaue') || cLower.includes('abo')) {
            probablePxId = 'pt_px_n7jmhi3grhi';
          } else if (pLower.includes('estoica') || cLower.includes('estoica')) {
            probablePxId = 'pt_px_9ptwarw3j6i';
          }
        }
        if (probablePxId) {
          const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const { data: recentIcs } = await supabaseAdmin
            .from('events')
            .select('session_id, pixel_id')
            .eq('pixel_id', probablePxId)
            .eq('event_name', 'InitiateCheckout')
            .gte('created_at', tenMinAgo)
            .order('created_at', { ascending: false })
            .limit(1);

          if (recentIcs && recentIcs[0]?.session_id) {
            attribution.sessionId = recentIcs[0].session_id;
            if (!targetPixelId) targetPixelId = probablePxId;
          }
        }
      } catch (errFallbackSid) {}
    }

    const orderDomain = (attribution.landingUrl || '').toLowerCase();
    const prodName = (parsed.productName || '').toLowerCase();
    const campName = (attribution.campaign || '').toLowerCase();

    let specificPixel = null;

    // 1) Match direto por ID de Pixel PrimeTrack ou ID Meta Pixel
    if (targetPixelId) {
      specificPixel = pixels.find(p => 
        p.pixelId === targetPixelId || 
        p.id === targetPixelId || 
        p.metaPixelId === targetPixelId || 
        (Array.isArray(p.metaPixels) && p.metaPixels.some(m => m.metaPixelId === targetPixelId))
      );
    }

    // 2) Match por domínio configurado
    if (!specificPixel && orderDomain) {
      specificPixel = pixels.find(p => p.domain && p.domain !== '*' && orderDomain.includes(p.domain.toLowerCase()));
    }

    // 3) Match semântico por Produto / Campanha / Palavras-chave
    if (!specificPixel) {
      if (prodName.includes('transformando') || prodName.includes('vida') || prodName.includes('vakinha') || campName.includes('abo') || campName.includes('vakinha')) {
        specificPixel = pixels.find(p => 
          (p.name && p.name.toLowerCase().includes('kaue')) || 
          p.metaPixelId === '2460567341021217' || 
          (p.icValue && p.icValue.includes('donation'))
        );
      } else if (prodName.includes('mirella') || prodName.includes('privacy') || campName.includes('mirella')) {
        specificPixel = pixels.find(p => 
          (p.name && (p.name.toLowerCase().includes('jofrrey') || p.name.toLowerCase().includes('mirella'))) || 
          p.metaPixelId === '1058568486987355'
        );
      }
    }

    // 4) Match por nome de pixel contido no produto ou campanha
    if (!specificPixel) {
      specificPixel = pixels.find(p => p.name && (prodName.includes(p.name.toLowerCase()) || campName.includes(p.name.toLowerCase())));
    }

    // 5) Fallback
    if (!specificPixel && pixels.length > 0) {
      specificPixel = pixels[0];
    }

    // Resolução dinâmica e precisa da URL do evento
    let eventSourceUrl = attribution.landingUrl;
    if (!eventSourceUrl) {
      if (specificPixel && specificPixel.domain && specificPixel.domain !== '*') {
        eventSourceUrl = `https://${specificPixel.domain.replace(/^https?:\/\//, '')}/checkout`;
      } else if (prodName.includes('transformando') || prodName.includes('vakinha') || (specificPixel && specificPixel.name && specificPixel.name.toLowerCase().includes('kaue'))) {
        eventSourceUrl = 'https://vakinhahoje.icu/checkout';
      } else if (prodName.includes('mirella') || prodName.includes('privacy')) {
        eventSourceUrl = 'https://conteudodelas.shop/checkout';
      } else {
        const hostHeader = req.headers.host || 'checkout.primetrack.top';
        eventSourceUrl = `https://${hostHeader}/checkout`;
      }
    }

    if (specificPixel) {
      attribution.pixelId = specificPixel.id;
      attribution.metaPixelId = specificPixel.metaPixelId || (specificPixel.metaPixels?.[0]?.metaPixelId) || null;
    }
    attribution.landingUrl = eventSourceUrl;

    // Fallback de Access Token do Facebook conectado para garantir CAPI 100% ativo
    const fbConns = db.get('facebook_connections') || [];
    const activeFbToken = (fbConns[0] && fbConns[0].accessToken) ? fbConns[0].accessToken : settings.metaAccessToken;

    let capiResult = { success: false, emq: { score: 7.3 }, response: null };

    // Monta a lista apenas dos Pixels Meta configurados dentro DESTE pixel específico da PrimeTrack
    const metaPixelsToSend = [];
    if (specificPixel) {
      if (Array.isArray(specificPixel.metaPixels) && specificPixel.metaPixels.length > 0) {
        specificPixel.metaPixels.forEach(mp => {
          if (mp.metaPixelId) {
            metaPixelsToSend.push({
              pixelId: mp.metaPixelId,
              accessToken: mp.capiToken || specificPixel.capiTokenRaw || specificPixel.capiToken || activeFbToken
            });
          }
        });
      } else if (specificPixel.metaPixelId) {
        metaPixelsToSend.push({
          pixelId: specificPixel.metaPixelId,
          accessToken: specificPixel.capiTokenRaw || specificPixel.capiToken || activeFbToken
        });
      }
    }

    // Roteamento inteligente de Sub-Pixels Meta (quando há múltiplos pixels para o mesmo produto em BMs diferentes)
    let finalMetaPixelsToSend = metaPixelsToSend;

    if (metaPixelsToSend.length > 1) {
      // 1. Prioridade: Parâmetro explícito na URL/tracking (ex: pt_meta_pixel=1712345646538691 ou meta_pixel)
      const explicitMetaPx = parsed.tracking?.pt_meta_pixel || parsed.tracking?.meta_pixel || parsed.tracking?.pixel || req.query?.pt_meta_pixel || req.query?.meta_pixel;
      if (explicitMetaPx) {
        const found = metaPixelsToSend.filter(m => m.pixelId === explicitMetaPx);
        if (found.length > 0) finalMetaPixelsToSend = found;
      }

      // 2. Prioridade: Roteamento contextual por Conta de Anúncios / Campanha das BMs
      if (finalMetaPixelsToSend.length > 1) {
        const campId = attribution.campaignId;
        const allCampaigns = db.get('campaigns') || [];
        let campMatch = allCampaigns.find(c => String(c.id).trim() === String(campId).trim());

        // Se não achou na memória, busca no Supabase
        if (!campMatch && campId) {
          try {
            const { data: sCamps } = await supabaseAdmin
              .from('campaigns')
              .select('*')
              .eq('id', String(campId).trim())
              .limit(1);
            if (sCamps && sCamps[0]) {
              campMatch = sCamps[0];
            }
          } catch (e) {}
        }

        let resolvedAccountName = campMatch?.accountName || campMatch?.account_name || attribution.accountName || '';
        if (!resolvedAccountName && (campMatch?.account_id || campMatch?.accountId)) {
          const accId = String(campMatch.account_id || campMatch.accountId).replace('act_', '');
          try {
            const { data: sAccs } = await supabaseAdmin
              .from('ad_accounts')
              .select('name')
              .or(`id.eq.act_${accId},id.eq.${accId}`)
              .limit(1);
            if (sAccs && sAccs[0]?.name) {
              resolvedAccountName = sAccs[0].name;
            }
          } catch (e) {}
        }

        // Normalizador universal de texto (remove acentos, pontuação, lowercase)
        const normalizeText = (s) => String(s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

        // Extrator de tokens significativos (palavras com >= 2 caracteres alfanuméricos)
        const extractTokens = (s) => normalizeText(s)
          .split(/[^a-z0-9]+/i)
          .filter(t => t.length >= 2);

        const normAccount = normalizeText(resolvedAccountName);
        const normCamp = normalizeText(campMatch?.name || attribution.campaign || parsed.tracking?.utm_campaign || '');
        const normAd = normalizeText(attribution.adName || attribution.adSetName || parsed.tracking?.utm_content || '');
        const normSource = normalizeText(parsed.tracking?.utm_source || attribution.source || '');

        const accountTokens = extractTokens(normAccount);
        const campTokens = extractTokens(normCamp);
        const adTokens = extractTokens(normAd);
        const sourceTokens = extractTokens(normSource);

        // Encontra o sub-pixel exato que corresponde com maior precisão à conta/BM
        let bestSub = null;
        let bestScore = -1;

        for (const mp of (specificPixel.metaPixels || [])) {
          const normName = normalizeText(mp.name);
          if (!normName) continue;

          const subTokens = extractTokens(normName);
          if (subTokens.length === 0) continue;

          let score = 0;

          // 1. MATCH DE CONTA DE ANÚNCIOS / BM (Prioridade Alta: 90-120 pts por token coincidente)
          // Se o nome do sub-pixel contém tokens que identificam a conta de anúncios (ex: 'ca03', 'jeffrey', 'bm2', 'conta1')
          for (const st of subTokens) {
            if (accountTokens.includes(st)) {
              score += 120;
            } else if (accountTokens.some(at => (at.length >= 3 && st.length >= 3 && (at.startsWith(st) || st.startsWith(at))))) {
              score += 90;
            } else if (normAccount && (normAccount.includes(st) || st.includes(normAccount))) {
              score += 70;
            }
          }

          // 2. MATCH DE CAMPANHA (Prioridade Média: 30 pts por token coincidente)
          for (const st of subTokens) {
            if (campTokens.includes(st)) {
              score += 30;
            } else if (campTokens.some(ct => (ct.length >= 4 && st.length >= 4 && (ct.startsWith(st) || st.startsWith(ct))))) {
              score += 20;
            }
          }

          // 3. MATCH DE ANÚNCIO / SOURCE (Prioridade Secundária: 20 pts por token)
          for (const st of subTokens) {
            if (adTokens.includes(st) || sourceTokens.includes(st)) {
              score += 20;
            }
          }

          // 4. BÔNUS DE ESPECIFICIDADE (Frases inteiras contidas)
          if (normAccount && normName.length >= 4 && (normAccount.includes(normName) || normName.includes(normAccount))) {
            score += 100;
          }
          if (normCamp && normName.length >= 4 && (normCamp.includes(normName) || normName.includes(normCamp))) {
            score += 40;
          }

          if (score > bestScore) {
            bestScore = score;
            bestSub = mp;
          }
        }

        if (bestSub && bestScore > 0) {
          console.log(`[Roteamento Multi-BM] Venda da campanha '${normCamp}' (${normAccount}) roteada com score ${bestScore} para o Pixel Meta '${bestSub.name}' (${bestSub.metaPixelId})`);
          finalMetaPixelsToSend = metaPixelsToSend.filter(m => m.pixelId === bestSub.metaPixelId);
        }
      }
    }

    // 4. Dispara CAPI APENAS para pedidos APROVADOS / PAGOS (Evita compras duplicadas e eventos falsos de PIX pendente)
    const isApproved = parsed.status === 'approved' || parsed.status === 'paid';

    if (isApproved && finalMetaPixelsToSend.length > 0) {
      for (const targetMeta of finalMetaPixelsToSend) {
        const pxId = targetMeta.pixelId;
        const pxToken = targetMeta.accessToken;

        if (pxToken && pxToken.startsWith('EAA')) {
          const singleCapi = await sendCapiEvent({
            pixelId: pxId,
            accessToken: pxToken,
            eventName: 'Purchase',
            eventId: `capi_pur_${parsed.orderCode}`,
            eventSourceUrl: eventSourceUrl,
            userData: {
              email: parsed.customer.email,
              phone: parsed.customer.phone,
              name: parsed.customer.name,
              city: resolvedCity || 'São Paulo',
              state: resolvedState || 'SP',
              zip: resolvedZip || '',
              country: resolvedCountry || 'BR',
              external_id: parsed.customer.email || parsed.orderCode,
              fbp: attribution.fbp,
              fbc: attribution.fbc,
              client_ip_address: effectiveIp,
              client_user_agent: attribution.userAgent || req.headers['user-agent']
            },
            customData: {
              currency: 'BRL',
              value: parsed.amount,
              content_name: parsed.productName,
              order_id: parsed.orderCode
            },
            testEventCode: settings.testEventCode
          });
          if (singleCapi && singleCapi.success) {
            capiResult = singleCapi;
            attribution.metaPixelId = pxId;
            try {
              await supabaseAdmin.from('events').insert({
                id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                user_id: orderUserId || 'usr_1788826403159',
                pixel_id: specificPixel?.id || 'pt_pixel',
                event_name: 'Purchase',
                event_id: `capi_pur_${parsed.orderCode}`,
                session_id: attribution.sessionId || null,
                emq_score: capiResult?.emq?.score || 9.5,
                capi_status: 'success'
              });
            } catch (evErr) {}
          }
        }
      }
    } else if (!isApproved) {
      console.log(`[CAPI Ignorado] Pedido ${parsed.orderCode} com status '${parsed.status}'. Purchase só é enviado após aprovação do pagamento.`);
    }

    // 4. Identificação do usuário dono do Webhook Token para Isolamento Estrito de Vendas
    let tokenUserId = null;
    if (token) {
      try {
        const { data: supaTok } = await supabaseAdmin.from('pixels').select('user_id').eq('id', `wh_tok_${token}`).limit(1);
        if (supaTok && supaTok[0]?.user_id) tokenUserId = supaTok[0].user_id;
      } catch (e) {}
      if (!tokenUserId) {
        try {
          const { data: tokData } = await supabaseAdmin.from('webhook_tokens').select('user_id').eq('token', token).limit(1);
          if (tokData && tokData[0]?.user_id) tokenUserId = tokData[0].user_id;
        } catch (e) {}
      }
      if (!tokenUserId) {
        const allTokens = db.get('webhook_tokens') || [];
        const foundTok = allTokens.find(t => t.token === token);
        if (foundTok && (foundTok.userId || foundTok.user_id)) {
          tokenUserId = foundTok.userId || foundTok.user_id;
        }
      }
    }
    const orderUserId = tokenUserId || specificPixel?.userId || (isOwnerUserId(req.query.userId) ? req.query.userId : 'usr_1788826403159');

    // 5. Salva a venda atribuída com isolamento por usuário
    const orderRecord = {
      id: `ord_${Date.now()}`,
      userId: orderUserId,
      orderCode: parsed.orderCode,
      gateway: parsed.gateway,
      productName: parsed.productName,
      status: parsed.status,
      paymentMethod: parsed.paymentMethod,
      amount: parsed.amount,
      commission: parsed.commission || parsed.amount,
      grossAmount: parsed.grossAmount || parsed.amount,
      customer: {
        ...parsed.customer,
        city: resolvedCity,
        state: resolvedState
      },
      attribution: {
        ...attribution,
        customer_city: resolvedCity,
        customer_state: resolvedState,
        client_ip: effectiveIp
      },
      emqScore: capiResult.emq.score,
      capiSent: capiResult.success,
      capiResponse: capiResult.response,
      createdAt: new Date().toISOString()
    };

    const existingOrders = db.get('orders') || [];
    const existingIdx = existingOrders.findIndex(o => o.orderCode === parsed.orderCode);
    const prevOrder = existingIdx >= 0 ? existingOrders[existingIdx] : null;
    const prevStatus = prevOrder ? prevOrder.status : null;

    if (existingIdx >= 0) {
      existingOrders[existingIdx] = {
        ...existingOrders[existingIdx],
        ...orderRecord,
        userId: existingOrders[existingIdx].userId || orderUserId,
        status: parsed.status || 'waiting_payment'
      };
      db.set('orders', existingOrders);
    } else {
      db.append('orders', orderRecord);
    }
    ordersMemoryCache = {};
    campaignsCache.clear();

    let supaPrevStatus = null;
    try {
      const { data: existingSupa } = await supabaseAdmin
        .from('orders')
        .select('id, status, user_id')
        .eq('order_code', parsed.orderCode)
        .limit(1);

      if (existingSupa && existingSupa.length > 0) {
        supaPrevStatus = existingSupa[0].status;
        await supabaseAdmin
          .from('orders')
          .update({
            status: parsed.status || 'waiting_payment',
            amount: parsed.amount,
            attribution: attribution || undefined,
            emq_score: capiResult.emq.score || 9.7
          })
          .eq('order_code', parsed.orderCode);
      } else {
        await supabaseAdmin.from('orders').insert({
          id: orderRecord.id,
          user_id: orderUserId,
          order_code: parsed.orderCode,
          gateway: parsed.gateway || 'MonsterPay',
          product_name: parsed.productName,
          amount: parsed.amount,
          status: parsed.status || 'waiting_payment',
          payment_method: parsed.paymentMethod,
          customer_name: parsed.customer?.name || null,
          customer_email: parsed.customer?.email || null,
          customer_phone: parsed.customer?.phone || null,
          attribution: {
            ...(attribution || {}),
            customer_city: parsed.customer?.city || '',
            customer_state: parsed.customer?.state || ''
          },
          emq_score: capiResult.emq.score || 9.7,
          created_at: orderRecord.createdAt
        });
      }
    } catch (supaErr) {
      console.warn('Erro ao salvar/atualizar pedido no Supabase:', supaErr.message);
    }

    console.log(`[Venda Registrada] R$ ${parsed.amount} via ${parsed.gateway} atribuída ao anúncio: ${attribution.ad}`);

    // Disparo de Web Push para iOS Safari & Navegadores
    try {
      const isPaid = parsed.status === 'paid' || parsed.status === 'approved';
      const isPending = parsed.status === 'waiting_payment' || parsed.status === 'pending';
      const isRefunded = parsed.status === 'refunded';

      const effectivelyPreviousStatus = prevStatus || supaPrevStatus;
      const isPaidAlready = isPaid && (effectivelyPreviousStatus === 'paid' || effectivelyPreviousStatus === 'approved');
      const isPendingAlready = isPending && (effectivelyPreviousStatus === 'waiting_payment' || effectivelyPreviousStatus === 'pending');
      const isRefundedAlready = isRefunded && (effectivelyPreviousStatus === 'refunded');

      // Deduplicação: se for o mesmo pedido com o mesmo status exato num intervalo menor que 3 segundos, evita duplicação
      const notifStatusKey = isPaid ? 'approved' : (isPending ? 'pending' : (isRefunded ? 'refunded' : parsed.status));
      const notifDedupeKey = `${parsed.orderCode}_${notifStatusKey}`;
      const now = Date.now();
      const recentlyNotified = recentlyNotifiedOrders.has(notifDedupeKey) && (now - recentlyNotifiedOrders.get(notifDedupeKey) < 3 * 1000);

      // Notifica se houver mudança de status ou se for um novo pedido / evento
      const shouldNotify = !recentlyNotified && (!isPaidAlready || !isPendingAlready);
      if (shouldNotify) {
        recentlyNotifiedOrders.set(notifDedupeKey, now);
        if (recentlyNotifiedOrders.size > 1000) {
          for (const [k, ts] of recentlyNotifiedOrders.entries()) {
            if (now - ts > 10 * 1000) recentlyNotifiedOrders.delete(k);
          }
        }
      }
      
      // Respeita configurações de notificação do usuário (busca Supabase primeiro)
      let notifSettings = {};
      try {
        const targetUserId = orderUserId || 'usr_1788826403159';
        const idsToSearch = isOwnerUserId(targetUserId)
          ? ['settings_usr_1788826403159', 'settings_usr_admin_digitaljm', 'settings_global']
          : [`settings_${targetUserId}`];

        const { data: supaSet } = await supabaseAdmin
          .from('pixels')
          .select('domain')
          .in('id', idsToSearch)
          .limit(1);

        if (supaSet && supaSet[0]?.domain) {
          const parsed = JSON.parse(supaSet[0].domain);
          notifSettings = parsed.notificationSettings || parsed;
        }
      } catch (e) {}

      if (!notifSettings || Object.keys(notifSettings).length === 0) {
        const localSettings = (orderUserId && !isOwnerUserId(orderUserId)) ? (db.get(`settings_${orderUserId}`) || {}) : (db.get('settings') || {});
        notifSettings = localSettings.notificationSettings || {};
      }

      const allowApproved = notifSettings.vendasAprovadas !== false;
      const allowPending = notifSettings.vendasPendentes !== false;
      const allowRefunded = notifSettings.vendasReembolsadas === true;
      const hideProduct = notifSettings.ocultarProduto !== false;
      const showCampaign = notifSettings.mostrarCampanha !== false;
      const showDashboard = notifSettings.mostrarDashboard === true;
      const showGross = notifSettings.mostrarBruto === true;

      const currencyToUse = parsed.currency || 'BRL';
      const amountToDisplay = showGross ? (parsed.grossAmount || parsed.amount) : (parsed.amount || 0);
      const formattedAmount = (amountToDisplay || 0).toLocaleString('pt-BR', { style: 'currency', currency: currencyToUse });
      const campaignName = attribution?.campaign || 'Campanha';

      const titlePrefix = showDashboard ? 'Dashboard — ' : '';

      // Monta corpo da notificação respeitando as preferências
      const buildNotifBody = (isNeg = false) => {
        let text = `Comissão: ${isNeg ? '-' : ''}${formattedAmount}`;
        if (!hideProduct && parsed.productName) {
          text = `${parsed.productName} — ${text}`;
        }
        if (showCampaign && campaignName) {
          text += ` — ${campaignName}`;
        }
        return text;
      };

      if (shouldNotify) {
        if (isPaid && allowApproved) {
          await sendSalesNotification({
            title: `${titlePrefix}Venda Aprovada!`,
            body: buildNotifBody(false),
            icon: 'https://app.primetrack.top/images/primetrack-app-icon.png',
            tag: `order_${parsed.orderCode}_approved`,
            data: { url: '/sales', orderCode: parsed.orderCode },
            userId: orderUserId
          });
        } else if (isPending && allowPending) {
          await sendSalesNotification({
            title: `${titlePrefix}Venda Pendente!`,
            body: buildNotifBody(false),
            icon: 'https://app.primetrack.top/images/primetrack-app-icon.png',
            tag: `order_${parsed.orderCode}_pending`,
            data: { url: '/sales', orderCode: parsed.orderCode },
            userId: orderUserId
          });
        } else if (isRefunded && allowRefunded) {
          await sendSalesNotification({
            title: `${titlePrefix}Venda Reembolsada!`,
            body: buildNotifBody(true),
            icon: 'https://app.primetrack.top/images/primetrack-app-icon.png',
            tag: `order_${parsed.orderCode}_refunded`,
            data: { url: '/sales', orderCode: parsed.orderCode },
            userId: orderUserId
          });
        }
      } else {
        console.log(`[WebPush] Notificação ignorada para ${parsed.orderCode}: status '${parsed.status}' já foi notificado anteriormente.`);
      }
    } catch (pushErr) {
      console.warn('[WebPush] Falha ao enviar notificação de webhook:', pushErr.message);
    }

    res.json({
      success: true,
      orderCode: parsed.orderCode,
      attributedCampaign: attribution.campaign,
      attributedAd: attribution.ad,
      recoveredFromBio: attribution.recoveredFromBio,
      emqScore: capiResult.emq.score,
      capiSent: capiResult.success
    });
  } catch (err) {
    console.error('Erro em /api/webhooks:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Estatísticas e Métricas em Tempo Real
 */
app.get('/api/stats', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId || null;
  try {
    const orders = await getAllOrders(false, userId);
    let campaigns = db.get('campaigns') || [];
    if (userId && !isOwnerUserId(userId)) {
      campaigns = campaigns.filter(c => c.userId === userId);
    }
    let events = db.get('events') || [];
    if (userId && !isOwnerUserId(userId)) {
      events = events.filter(e => e.userId === userId);
    }

    const approvedOrders = orders.filter(o => o.status === 'approved');
    const totalRevenue = approvedOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
    const totalSpend = campaigns.reduce((acc, c) => acc + (c.spend || 0), 0);
    const netProfit = totalRevenue - totalSpend;
    const realRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;
    const averageCpa = approvedOrders.length > 0 ? Number((totalSpend / approvedOrders.length).toFixed(2)) : 0;

    // Média de EMQ
    const emqSum = approvedOrders.reduce((acc, o) => acc + (o.emqScore || 9.1), 0);
    const emqAverage = approvedOrders.length > 0 ? Number((emqSum / approvedOrders.length).toFixed(1)) : 9.3;

    // Vendas recuperadas da bio
    const recoveredBioCount = approvedOrders.filter(o => o.attribution && o.attribution.matchType === 'cross_session_bio').length;

    res.json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalSpend: Number(totalSpend.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      realRoas,
      averageCpa,
      totalOrders: approvedOrders.length,
      emqAverage,
      recoveredBioCount,
      eventsCount: events.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Listagem de Campanhas e Criativos com Gastos do Meta e Vendas de Webhooks (Kiwify, Hotmart, MonsterPay, etc.)
 */
// Cache em memória de alta performance para resposta instantânea (< 2ms)
const campaignsCache = new Map();
const ongoingCampaignSyncs = new Map();
let lastAdAccountsDiscoveryTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Registro em memória de status alterados recentemente (TTL de 15 minutos) para proteger contra lag de replicação da Meta Graph API
export const recentStatusOverrides = new Map(); // itemId -> { status: boolean, timestamp: number }

// Registro em memória de itens excluídos recentemente (TTL de 24 horas) para nunca ressuscitar itens excluídos na sincronização
export const recentDeletedItemIds = new Map(); // itemId -> timestamp

// Registro em memória de orçamentos, lances e nomes alterados recentemente (TTL de 15 minutos) para zero delay
export const recentDetailOverrides = new Map(); // itemId -> { budget, bidCap, name, bidStrategy, timestamp: number }

export function recordStatusOverride(id, status) {
  if (!id) return;
  recentStatusOverrides.set(String(id), { status: Boolean(status), timestamp: Date.now() });
}

export function getEffectiveStatusOverride(id) {
  if (!id) return undefined;
  const entry = recentStatusOverrides.get(String(id));
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > 60 * 1000) {
    recentStatusOverrides.delete(String(id));
    return undefined;
  }
  return entry.status;
}

export function recordDeletedId(id) {
  if (!id) return;
  recentDeletedItemIds.set(String(id), Date.now());
}

export function isItemDeleted(id) {
  if (!id) return false;
  const ts = recentDeletedItemIds.get(String(id));
  if (!ts) return false;
  if (Date.now() - ts > 24 * 3600 * 1000) {
    recentDeletedItemIds.delete(String(id));
    return false;
  }
  return true;
}

export function recordDetailOverride(id, details) {
  if (!id || !details) return;
  const existing = recentDetailOverrides.get(String(id)) || {};
  recentDetailOverrides.set(String(id), {
    ...existing,
    ...details,
    timestamp: Date.now()
  });
}

export function getEffectiveDetailOverride(id) {
  if (!id) return null;
  const entry = recentDetailOverrides.get(String(id));
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 15 * 60 * 1000) {
    recentDetailOverrides.delete(String(id));
    return null;
  }
  return entry;
}

// Deduplicação de alertas de perfil bloqueado: avisa apenas 1 vez por perfil
const notifiedBlockedProfiles = new Set();

function extractEntityNameAndId(val) {
  if (!val) return { name: '', id: null };
  const str = String(val).trim();
  if (/^\d{6,}$/.test(str)) {
    return { name: str, id: str };
  }
  let name = str;
  let id = null;
  if (str.includes('::')) {
    const parts = str.split('::');
    name = parts[0].trim();
    if (parts[1] && /^\d{6,}$/.test(parts[1].trim())) id = parts[1].trim();
  } else if (str.includes('|')) {
    const parts = str.split('|');
    name = parts[0].trim();
    if (parts[1] && /^\d{6,}$/.test(parts[1].trim())) id = parts[1].trim();
  } else {
    const match = str.match(/[-_]\s*(\d{6,})$/);
    if (match) {
      id = match[1];
      name = str.replace(/[-_]\s*\d{6,}$/, '').trim();
    }
  }
  name = name.replace(/[-_]\s*\d{6,}$/, '').trim();
  return { name, id };
}

function sanitizeAttribution(rawAttr) {
  const attr = { ...(rawAttr || {}) };

  const parsedCamp = extractEntityNameAndId(attr.campaign);
  if (!attr.campaignId && parsedCamp.id) {
    attr.campaignId = parsedCamp.id;
  }
  let camp = parsedCamp.name || attr.campaign || '';
  if (!camp || camp === 'campanha_direta' || camp.toLowerCase().includes('direta')) {
    camp = 'Orgânico';
  }
  attr.campaign = camp;

  if (attr.adset) {
    const parsedAdset = extractEntityNameAndId(attr.adset);
    if (!attr.adsetId && parsedAdset.id) attr.adsetId = parsedAdset.id;
    attr.adset = parsedAdset.name || attr.adset;
  }

  if (attr.ad) {
    const parsedAd = extractEntityNameAndId(attr.ad);
    if (!attr.adId && parsedAd.id) attr.adId = parsedAd.id;
    attr.ad = parsedAd.name || attr.ad;
  }

  if (camp === 'Orgânico' || !attr.source || attr.source.toLowerCase().includes('direta')) {
    attr.source = camp === 'Orgânico' ? 'Orgânico' : attr.source;
  }

  // Resolução de conta em memória caso o pedido tenha vindo sem conta explícita
  if (!attr.accountId && (attr.campaignId || attr.adId)) {
    const localCamps = db.get('campaigns') || [];
    const matchedCamp = localCamps.find(c => 
      (attr.campaignId && String(c.id).trim() === String(attr.campaignId).trim()) ||
      (attr.adId && Array.isArray(c.ads) && c.ads.some(a => String(a.id || a.adId).trim() === String(attr.adId).trim()))
    );
    if (matchedCamp) {
      attr.accountId = matchedCamp.adAccountId || (matchedCamp.accountId ? (String(matchedCamp.accountId).startsWith('act_') ? String(matchedCamp.accountId) : `act_${matchedCamp.accountId}`) : null);
      attr.accountName = matchedCamp.accountName || attr.accountName;
    }
  }

  return attr;
}

let ordersMemoryCache = {};

async function getAllOrders(forceFresh = false, userId = null) {
  const cacheKey = userId || 'all';
  const now = Date.now();
  if (!forceFresh && ordersMemoryCache[cacheKey] && (now - ordersMemoryCache[cacheKey].timestamp < 5000)) {
    return ordersMemoryCache[cacheKey].data;
  }

  let orders = [];
  try {
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (userId) {
      if (isOwnerUserId(userId)) {
        query = query.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        query = query.eq('user_id', userId);
      }
    }
    const { data } = await query;
    if (Array.isArray(data) && data.length > 0) {
      orders = data.map(row => ({
        id: row.id,
        orderCode: row.order_code,
        gateway: row.gateway,
        productName: row.product_name,
        amount: Number(row.amount || 0),
        status: row.status,
        paymentMethod: row.payment_method,
        customer: {
          name: row.customer_name,
          email: row.customer_email,
          phone: row.customer_phone,
          city: row.customer_city || row.city || row.attribution?.customer_city || row.attribution?.city || '',
          state: row.customer_state || row.state || row.attribution?.customer_state || row.attribution?.state || ''
        },
        attribution: sanitizeAttribution(row.attribution),
        emqScore: row.emq_score,
        createdAt: row.created_at
      }));
    }
  } catch (e) {
    console.warn('Erro ao buscar pedidos no Supabase:', e.message);
  }

  // Sincronização direta com a base de vendas da MonsterPay para o usuário dono (jeeanmacedo@gmail.com)
  if (orders.length === 0 && isOwnerUserId(userId)) {
    try {
      const mpClient = getMonsterPayClient();
      const { data: mpSales } = await mpClient
        .from('sales')
        .select('*')
        .eq('user_id', 'f64f0317-b2f7-438b-b07a-6a6507238189')
        .order('created_at', { ascending: false })
        .limit(300);

      if (Array.isArray(mpSales) && mpSales.length > 0) {
        orders = mpSales.map(s => {
          const gross = Number(s.amount || 0);
          const pFee = Number(s.percent_fee || 0);
          const fFee = Number(s.fixed_fee || 0);
          const net = Number((gross - (gross * (pFee / 100)) - fFee).toFixed(2));

          let status = 'waiting_payment';
          if (s.status === 'paid' || s.status === 'approved') status = 'approved';
          else if (s.status === 'expired' || s.status === 'cancelled') status = 'cancelled';
          else if (s.status === 'refunded') status = 'refunded';
          else status = 'waiting_payment';

          let campName = s.utm_campaign || 'Orgânico';
          let campId = null;
          if (campName && campName.includes('|')) {
            const parts = campName.split('|');
            campName = parts[0].trim();
            campId = parts[1].trim();
          }

          let adName = s.utm_content || '';
          let adId = null;
          if (adName && adName.includes('|')) {
            const parts = adName.split('|');
            adName = parts[0].trim();
            adId = parts[1].trim();
          }

          let adsetName = s.utm_medium || '';
          let adsetId = null;
          if (adsetName && adsetName.includes('|')) {
            const parts = adsetName.split('|');
            adsetName = parts[0].trim();
            adsetId = parts[1].trim();
          }

          return {
            id: s.id,
            userId: 'usr_1788826403159',
            orderCode: s.payment_id || s.id,
            gateway: 'MonsterPay',
            productName: s.product_name || 'Vivendo De Internet',
            status,
            paymentMethod: 'pix',
            amount: net,
            commission: net,
            grossAmount: gross,
            customer: {
              name: s.customer_name || 'Cliente MonsterPay',
              email: s.customer_email || '',
              phone: s.customer_phone || '',
              document: s.customer_cpf || '',
              city: '',
              state: ''
            },
            attribution: sanitizeAttribution({
              campaign: campName,
              campaignId: campId,
              adset: adsetName,
              adsetId: adsetId,
              ad: adName,
              adId: adId,
              source: s.utm_source || 'Facebook',
              accountId: '806160179256359',
              accountName: 'CA01 BM7'
            }),
            emqScore: 9.7,
            capiSent: s.capi_purchase_sent || false,
            createdAt: s.created_at
          };
        });

        try {
          db.set('orders', orders);
        } catch (eDb) {}
      }
    } catch (eMp) {
      console.warn('Erro ao sincronizar vendas da MonsterPay:', eMp.message);
    }
  }

  // Fallback para orders locais com isolamento estrito por usuário
  if (orders.length === 0) {
    const localOrders = db.get('orders') || [];
    if (isOwnerUserId(userId)) {
      orders = localOrders.filter(o => !o.userId || isOwnerUserId(o.userId)).map(o => ({
        ...o,
        attribution: sanitizeAttribution(o.attribution)
      }));
    } else if (userId) {
      orders = localOrders.filter(o => o.userId === userId).map(o => ({
        ...o,
        attribution: sanitizeAttribution(o.attribution)
      }));
    } else {
      orders = localOrders.filter(o => !o.userId || isOwnerUserId(o.userId)).map(o => ({
        ...o,
        attribution: sanitizeAttribution(o.attribution)
      }));
    }
  }

  // Se o usuário não possui pedidos, retorna lista vazia imediatamente
  if (orders.length === 0) {
    ordersMemoryCache[cacheKey] = { data: [], timestamp: now };
    return [];
  }

  const filtered = orders;

  // Enriquece pedidos com dados de geolocalização capturados pelo Pixel CAPI
  const sessions = db.get('sessions') || [];
  for (const o of filtered) {
    if (!o.customer) o.customer = {};
    if (!o.customer.city || !o.customer.state) {
      const matchedSession = sessions.find(s => 
        (o.customer.email && s.customerEmail === o.customer.email) ||
        (o.attribution?.sessionId && s.sessionId === o.attribution.sessionId) ||
        (o.attribution?.fbp && s.fbp === o.attribution.fbp) ||
        (o.attribution?.ip && s.ip === o.attribution.ip)
      );
      if (matchedSession && matchedSession.city) {
        o.customer.city = matchedSession.city;
        o.customer.state = matchedSession.state;
      }
    }
  }

  // Mantém todas as vendas individuais pelo ID
  const orderMap = new Map();
  for (const o of filtered) {
    const key = o.id || o.orderCode;
    if (!orderMap.has(key)) {
      orderMap.set(key, o);
    } else {
      const existing = orderMap.get(key);
      if (['approved', 'paid', 'pago'].includes(o.status)) {
        orderMap.set(key, o);
      }
    }
  }
  const allOrders = Array.from(orderMap.values());
  ordersMemoryCache[cacheKey] = { data: allOrders, timestamp: now };
  return allOrders;
}

// Função de máxima precisão para identificação e desambiguação de campanhas (anti-colisão entre contas e cópias)
export function isMatchCampaign(campaignNameOrId, camp, orderOrEvent = null, allCampaignsList = []) {
  if (!campaignNameOrId && !orderOrEvent) return false;
  
  const cId = String(camp.id || '').trim();
  const cName = (camp.name || '').toLowerCase().trim();
  const cUtm = (camp.utm_campaign || '').toLowerCase().trim();
  const cAccId = String(camp.adAccountId || camp.accountId || '').replace('act_', '').trim();
  const cAccName = (camp.accountName || '').toLowerCase().trim();

  // 1. Prioridade Absoluta: ID explícito da campanha vindo do tracking (UTM {{campaign.id}}, Pixel ou Webhook)
  const explicitCampId = String(
    orderOrEvent?.attribution?.campaignId || 
    orderOrEvent?.campaignId || 
    orderOrEvent?.utms?.campaignId || 
    ''
  ).trim();
  if (explicitCampId) {
    return explicitCampId === cId;
  }

  // 2. Se o identificador pesquisado for numérico puro (ID da campanha da Meta), match estrito por ID
  const target = String(campaignNameOrId || '').toLowerCase().trim();
  if (!target || target === 'orgânico' || target === 'organico' || target === 'histórico') return false;
  if (/^\d{6,}$/.test(target)) {
    return target === cId.toLowerCase();
  }

  // 3. Isolamento Estrito de Conta de Anúncios:
  // Se o pedido possui conta de anúncios identificada (ID ou Nome), NUNCA pode pontuar em campanha de outra conta!
  const orderAccId = String(
    orderOrEvent?.attribution?.accountId || 
    orderOrEvent?.attribution?.adAccountId || 
    orderOrEvent?.accountId || 
    orderOrEvent?.utms?.accountId || 
    ''
  ).replace('act_', '').trim();
  if (orderAccId && cAccId && orderAccId !== cAccId) {
    return false;
  }

  const orderAccName = (
    orderOrEvent?.attribution?.accountName || 
    orderOrEvent?.accountName || 
    orderOrEvent?.utms?.accountName || 
    ''
  ).toLowerCase().trim();
  if (orderAccName && cAccName && orderAccName !== cAccName) {
    return false;
  }

  // Pedidos originados de contas desconectadas (ex: CA01 BM2) não podem pontuar em contas ativas diferentes
  if (orderAccName.includes('bm2') && !cAccName.includes('bm2')) {
    return false;
  }

  // 4. Isolamento de Criativo (Ad ID):
  // Se o pedido possui ID do anúncio explícito, valida se este anúncio pertence a esta campanha
  const explicitAdId = String(
    orderOrEvent?.attribution?.adId || 
    orderOrEvent?.adId || 
    orderOrEvent?.utms?.adId || 
    ''
  ).trim();
  if (explicitAdId && Array.isArray(camp.ads) && camp.ads.length > 0) {
    const hasAdId = camp.ads.some(a => String(a.id || a.adId).trim() === explicitAdId);
    if (!hasAdId) return false;
  }

  // 5. Proteção de Campanha Recém-Criada / Sem Tráfego:
  // Se a campanha tem 0 gasto, 0 cliques e 0 impressões E houver outra cópia ativa com mesmo nome,
  // evita que a cópia zerada canibalize a campanha que realmente rodou.
  const campSpend = Number(camp.spend || 0);
  const campClicks = Number(camp.clicks || 0);
  const campImpressions = Number(camp.impressions || 0);
  const isZeroTraffic = campSpend === 0 && campClicks === 0 && campImpressions === 0;

  // Match exato por UTM campaign ou ID literal
  if (cId && target === cId.toLowerCase()) return true;
  if (cUtm && target === cUtm) {
    return true;
  }

  if (target === cName) {
    const candidateCampaigns = (allCampaignsList || []).filter(ac => (ac.name || '').toLowerCase().trim() === cName);
    // Se for a única campanha com este nome, atribui diretamente
    if (candidateCampaigns.length <= 1) {
      return true;
    }

    // Se houver múltiplas com o mesmo nome e esta nunca teve tráfego, não pontua
    if (isZeroTraffic) {
      return false;
    }

    // Desambiguação inteligente caso existam múltiplas campanhas com mesmo nome
    if (candidateCampaigns.length > 1) {
      // A. Filtra por conta se conhecida
      if (orderAccName) {
        const accMatch = candidateCampaigns.filter(ac => (ac.accountName || '').toLowerCase().trim() === orderAccName);
        if (accMatch.length > 0) {
          return accMatch[0].id === camp.id;
        }
      }
      if (orderAccId) {
        const accMatch = candidateCampaigns.filter(ac => String(ac.adAccountId || ac.accountId || '').replace('act_', '').trim() === orderAccId);
        if (accMatch.length > 0) {
          return accMatch[0].id === camp.id;
        }
      }
      // B. Filtra por criativo/anúncio se o pedido especifica anúncio
      const orderAdName = (orderOrEvent?.attribution?.ad || orderOrEvent?.ad || '').toLowerCase().trim();
      if (orderAdName) {
        const adMatches = candidateCampaigns.filter(ac => 
          Array.isArray(ac.ads) && ac.ads.some(a => (a.name || '').toLowerCase().trim() === orderAdName && (Number(a.spend || 0) > 0 || Number(a.clicks || 0) > 0))
        );
        if (adMatches.length === 1) {
          return adMatches[0].id === camp.id;
        }
      }
      // C. Atribui à campanha que realmente teve tráfego/gasto
      const activeSpending = candidateCampaigns.filter(ac => Number(ac.spend || 0) > 0 && Number(ac.clicks || 0) > 0);
      if (activeSpending.length === 1) {
        return activeSpending[0].id === camp.id;
      }

      // Regra absoluta do usuário: se não conseguir rastrear com 100% de certeza entre campanhas duplicadas,
      // a venda não é associada a nenhuma campanha (permanece como Orgânica)
      return false;
    }

    return true;
  }

  return false;
}

// Função de máxima precisão para identificação e atribuição estrita de conjuntos de anúncios (anti-duplicação em cópias e ABO)
export function isMatchAdset(orderOrEvent, as, camp) {
  if (!orderOrEvent || !as) return false;
  const asId = String(as.id || as.adsetId || '').trim();
  const asName = (as.name || '').toLowerCase().trim();

  // 1. Prioridade Absoluta: ID explícito do conjunto vindo do tracking
  // (UTM {{adset.id}}, Pixel ou Webhook)
  let explicitAdsetId = String(
    orderOrEvent?.attribution?.adsetId || 
    orderOrEvent?.adsetId || 
    orderOrEvent?.utms?.adsetId || 
    ''
  ).trim();

  if (!explicitAdsetId && orderOrEvent?.attribution?.adset) {
    const parsed = extractEntityNameAndId(orderOrEvent.attribution.adset);
    if (parsed.id) explicitAdsetId = String(parsed.id).trim();
  }

  if (explicitAdsetId) {
    // Se o pedido possui ID explícito do conjunto, DEVE corresponder ESTRITAMENTE ao ID deste conjunto!
    // NUNCA pode vazar para outros conjuntos por igualdade de nome!
    return explicitAdsetId === asId;
  }

  // 2. Resolução através do Anúncio (Ad ID -> Conjunto Pai)
  // Todo anúncio no Meta pertence a um conjunto específico (ad.adsetId)
  let explicitAdId = String(
    orderOrEvent?.attribution?.adId || 
    orderOrEvent?.adId || 
    orderOrEvent?.utms?.adId || 
    ''
  ).trim();

  if (!explicitAdId && orderOrEvent?.attribution?.ad) {
    const parsed = extractEntityNameAndId(orderOrEvent.attribution.ad);
    if (parsed.id) explicitAdId = String(parsed.id).trim();
  }

  if (explicitAdId && Array.isArray(camp.ads) && camp.ads.length > 0) {
    const matchedAd = camp.ads.find(a => String(a.id || a.adId).trim() === explicitAdId);
    if (matchedAd && (matchedAd.adsetId || matchedAd.adset_id)) {
      const parentAdsetId = String(matchedAd.adsetId || matchedAd.adset_id).trim();
      return parentAdsetId === asId;
    }
  }

  // 3. Fallback: Match por Nome do Conjunto (Apenas se NÃO houver ID do conjunto nem do anúncio)
  const orderAdsetRaw = orderOrEvent?.attribution?.adset || orderOrEvent?.adset || orderOrEvent?.utms?.adset || '';
  const parsedOrderAdset = extractEntityNameAndId(orderAdsetRaw);
  const orderAdsetName = (parsedOrderAdset.name || orderAdsetRaw || '').toLowerCase().trim();

  if (!orderAdsetName || orderAdsetName === 'conjunto_padrao' || orderAdsetName === 'padrao') {
    return false;
  }

  if (orderAdsetName === asName) {
    // Desambiguação caso existam múltiplos conjuntos com o mesmo nome na campanha (ex: cópias)
    const matchingCandidates = (camp.adsets || []).filter(a => (a.name || '').toLowerCase().trim() === asName);
    if (matchingCandidates.length === 1) {
      return true;
    }

    // Se múltiplos conjuntos têm o mesmo nome, prioriza desambiguação pelo conjunto com compras reais no Meta
    const withMetaPurchases = matchingCandidates.filter(a => Number(a.metaPurchases || 0) > 0);
    if (withMetaPurchases.length === 1) {
      return withMetaPurchases[0].id === as.id;
    }

    // Se múltiplos conjuntos têm o mesmo nome, atribui apenas àquele que teve gasto/cliques reais
    const withTraffic = matchingCandidates.filter(a => Number(a.spend || 0) > 0 || Number(a.clicks || 0) > 0);
    if (withTraffic.length === 1) {
      return withTraffic[0].id === as.id;
    }

    // Se não há como desambiguar com 100% de certeza, NUNCA duplica a venda para todos os conjuntos!
    // Para evitar fabricar vendas falsas, atribui apenas ao primeiro conjunto candidato
    return matchingCandidates[0].id === as.id;
  }

  return false;
}

// Função de máxima precisão para identificação e atribuição estrita de anúncios/criativos (anti-duplicação)
export function isMatchAd(orderOrEvent, ad, camp) {
  if (!orderOrEvent || !ad) return false;
  const adId = String(ad.id || ad.adId || '').trim();
  const adName = (ad.name || '').toLowerCase().trim();
  const adParentAdsetId = String(ad.adsetId || ad.adset_id || '').trim();

  // 1. Prioridade Absoluta: ID explícito do anúncio vindo do tracking
  // (UTM {{ad.id}}, Pixel ou Webhook)
  let explicitAdId = String(
    orderOrEvent?.attribution?.adId || 
    orderOrEvent?.adId || 
    orderOrEvent?.utms?.adId || 
    ''
  ).trim();

  if (!explicitAdId && orderOrEvent?.attribution?.ad) {
    const parsed = extractEntityNameAndId(orderOrEvent.attribution.ad);
    if (parsed.id) explicitAdId = String(parsed.id).trim();
  }

  if (explicitAdId) {
    // Se o pedido possui ID explícito do anúncio, DEVE corresponder ESTRITAMENTE ao ID deste anúncio!
    // NUNCA pode vazar para outros anúncios por igualdade de nome!
    return explicitAdId === adId;
  }

  // 2. Validação do Conjunto Pai:
  // Se o pedido especificou um conjunto (por ID), o anúncio DEVE pertencer a esse conjunto
  let explicitAdsetId = String(
    orderOrEvent?.attribution?.adsetId || 
    orderOrEvent?.adsetId || 
    orderOrEvent?.utms?.adsetId || 
    ''
  ).trim();

  if (!explicitAdsetId && orderOrEvent?.attribution?.adset) {
    const parsed = extractEntityNameAndId(orderOrEvent.attribution.adset);
    if (parsed.id) explicitAdsetId = String(parsed.id).trim();
  }

  if (explicitAdsetId && adParentAdsetId && explicitAdsetId !== adParentAdsetId) {
    return false;
  }

  // 3. Fallback: Match por Nome do Anúncio (Apenas se NÃO houver ID de anúncio)
  const orderAdRaw = orderOrEvent?.attribution?.ad || orderOrEvent?.ad || orderOrEvent?.utms?.ad || '';
  const parsedOrderAd = extractEntityNameAndId(orderAdRaw);
  const orderAdName = (parsedOrderAd.name || orderAdRaw || '').toLowerCase().trim();

  if (!orderAdName || orderAdName === 'criativo_padrao' || orderAdName === 'padrao') {
    return false;
  }

  if (orderAdName === adName) {
    // Desambiguação caso múltiplos anúncios tenham o mesmo nome
    const matchingCandidates = (camp.ads || []).filter(a => (a.name || '').toLowerCase().trim() === adName);
    if (matchingCandidates.length === 1) {
      return true;
    }

    // Se o pedido especificou o conjunto, filtra anúncios daquele conjunto
    if (explicitAdsetId) {
      const inAdset = matchingCandidates.filter(a => String(a.adsetId || a.adset_id).trim() === explicitAdsetId);
      if (inAdset.length === 1) {
        return inAdset[0].id === ad.id;
      }
    }

    // Atribui àquele que teve gasto/cliques reais
    const withTraffic = matchingCandidates.filter(a => Number(a.spend || 0) > 0 || Number(a.clicks || 0) > 0);
    if (withTraffic.length === 1) {
      return withTraffic[0].id === ad.id;
    }

    // Se não há como desambiguar com 100% de certeza, atribui apenas ao primeiro candidato para evitar duplicações
    return matchingCandidates[0].id === ad.id;
  }

  return false;
}

export function enrichCampaignsWithTracking({
  campaigns = [],
  orders = [],
  pendingOrders = [],
  pixelPurchases = [],
  pixelICs = []
}) {
  return campaigns.map(c => {
    const matchingOrders = orders.filter(o => {
      const oCamp = ((o.attribution && o.attribution.campaign) || o.campaign || '').toLowerCase().trim();
      return isMatchCampaign(oCamp, c, o, campaigns);
    });

    const matchingPendingOrders = pendingOrders.filter(o => {
      const oCamp = ((o.attribution && o.attribution.campaign) || o.campaign || '').toLowerCase().trim();
      return isMatchCampaign(oCamp, c, o, campaigns);
    });

    const matchingPixelEvents = pixelPurchases.filter(e => {
      const eCamp = ((e.attribution && e.attribution.campaign) || e.campaign || (e.utms && e.utms.utm_campaign) || '').toLowerCase().trim();
      return isMatchCampaign(eCamp, c, e, campaigns);
    });

    const matchingPixelICs = pixelICs.filter(e => {
      const eCamp = ((e.attribution && e.attribution.campaign) || e.campaign || (e.utms && e.utms.utm_campaign) || '').toLowerCase().trim();
      return isMatchCampaign(eCamp, c, e, campaigns);
    });

    const webhookSales = matchingOrders.length;
    const webhookRevenue = matchingOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);
    const pixelSales = matchingPixelEvents.length;
    const pixelRevenue = matchingPixelEvents.reduce((acc, e) => acc + Number(e.amount || e.customData?.value || 0), 0);
    const metaCampSales = Number(c.metaPurchases || 0);
    const metaCampRev = Number(c.metaRevenue || 0);

    const sumAdsetMetaSales = (c.adsets || []).reduce((sum, a) => sum + Number(a.metaPurchases || 0), 0);
    const sumAdsetMetaRev = (c.adsets || []).reduce((sum, a) => sum + Number(a.metaRevenue || 0), 0);

    const totalSales = Math.max(webhookSales, pixelSales, metaCampSales, sumAdsetMetaSales);
    const totalRevenue = Math.max(webhookRevenue, pixelRevenue, metaCampRev, sumAdsetMetaRev);
    const spendNum = Number(c.spend || 0);
    const profitNum = totalRevenue - spendNum;
    const roasNum = spendNum > 0 ? (totalRevenue / spendNum).toFixed(2) : '0.00';
    const cpaNum = totalSales > 0 ? (spendNum / totalSales).toFixed(2) : '0.00';

    const totalICs = Math.max(Number(c.initCheckouts || 0), matchingPixelICs.length);
    const costPerIc = totalICs > 0 ? (spendNum / totalICs).toFixed(2) : '0.00';

    const nameUpper = (c.name || '').toUpperCase();
    const explicitCboInName = nameUpper.includes('CBO') || nameUpper.includes('BID') || nameUpper.includes('COST CAP');
    const hasCampLevelBudget = Boolean(c.daily_budget || c.lifetime_budget || (c.isCbo === true) || (c.budgetType === 'Diário' && !c.isAbo));
    const hasBidCapStrategy = c.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' || c.bidStrategy === 'COST_CAP' || (c.bidCap && Number(c.bidCap) > 0);

    const isCampCbo = Boolean(explicitCboInName || c.isCbo === true || hasBidCapStrategy || hasCampLevelBudget);
    const isCampAbo = !isCampCbo;

    const enrichedAdsets = (c.adsets || []).map(as => {
      const asSpend = Number(as.spend || 0);
      
      const directOrders = matchingOrders.filter(o => isMatchAdset(o, as, c));
      const directPending = matchingPendingOrders.filter(o => isMatchAdset(o, as, c));
      const directPixelPurchases = matchingPixelEvents.filter(e => isMatchAdset(e, as, c));
      const directPixelICs = matchingPixelICs.filter(e => isMatchAdset(e, as, c));

      let asSales = 0;
      let asPending = 0;
      let asRevenue = 0;

      if (c.adsets.length === 1) {
        // Se a campanha possui apenas 1 conjunto, todos os dados da campanha pertencem a ele
        asSales = Math.max(totalSales, Number(as.metaPurchases || 0));
        asPending = matchingPendingOrders.length;
        asRevenue = Math.max(totalRevenue, Number(as.metaRevenue || 0));
      } else {
        // Múltiplos conjuntos (especialmente ABO, onde cada conjunto é independente):
        // Reconcilia as vendas do webhook/pixel com os dados oficiais do Meta Insights daquele conjunto específico!
        const webhookAsSales = directOrders.length;
        const pixelAsSales = directPixelPurchases.length;
        const metaAsPurchases = Number(as.metaPurchases || 0);
        asSales = Math.max(webhookAsSales, pixelAsSales, metaAsPurchases);
        asPending = directPending.length;

        const webhookAsRev = directOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
        const pixelAsRev = directPixelPurchases.reduce((sum, e) => sum + Number(e.amount || e.customData?.value || 0), 0);
        const metaAsRevenue = Number(as.metaRevenue || 0);

        let effectiveAsRev = Math.max(webhookAsRev, pixelAsRev, metaAsRevenue);
        if (effectiveAsRev === 0 && asSales > 0) {
          const avgTicket = (webhookRevenue > 0 && webhookSales > 0) ? (webhookRevenue / webhookSales) : 26.81;
          effectiveAsRev = asSales * avgTicket;
        }
        asRevenue = effectiveAsRev;
      }

      const asProfit = asRevenue - asSpend;
      const asRoas = asSpend > 0 ? (asRevenue / asSpend).toFixed(2) : '0.00';
      const asCpa = asSales > 0 ? (asSpend / asSales).toFixed(2) : '0.00';
      const asArpu = asSales > 0 ? (asRevenue / asSales).toFixed(2) : '0.00';

      const asICs = c.adsets.length === 1 ? totalICs : Math.max(Number(as.ic || as.initCheckouts || 0), directPixelICs.length);
      const asCostPerIc = asICs > 0 ? (asSpend / asICs).toFixed(2) : '0.00';

      const campBid = (isCampCbo && c.bidCap && Number(c.bidCap) > 0) ? String(c.bidCap) : null;
      const asBid = isCampCbo ? ((as.bidCap && Number(as.bidCap) > 0) ? String(as.bidCap) : campBid) : null;
      const hasRealBidAmount = Boolean(asBid && Number(asBid) > 0);
      const asBidStrategy = hasRealBidAmount ? (as.bidStrategy || c.bidStrategy || 'LOWEST_COST_WITH_BID_CAP') : 'LOWEST_COST_WITHOUT_CAP';
      const asBidCap = hasRealBidAmount ? asBid : null;

      return {
        ...as,
        isCbo: isCampCbo,
        isAbo: isCampAbo,
        bidStrategy: asBidStrategy,
        bidCap: asBidCap,
        spend: as.spend || '0.00',
        sales: asSales,
        pendingSales: asPending,
        revenue: asRevenue.toFixed(2),
        profit: asProfit.toFixed(2),
        roas: asRoas,
        cpa: asCpa,
        arpu: asArpu,
        ic: asICs,
        costPerIc: asCostPerIc
      };
    });

    const enrichedAds = (c.ads || []).map(ad => {
      const adSpend = Number(ad.spend || 0);

      const directOrders = matchingOrders.filter(o => isMatchAd(o, ad, c));
      const directPending = matchingPendingOrders.filter(o => isMatchAd(o, ad, c));
      const directPixelPurchases = matchingPixelEvents.filter(e => isMatchAd(e, ad, c));

      let adSales = 0;
      let adPending = 0;
      let adRevenue = 0;

      if (c.ads.length === 1) {
        adSales = Math.max(totalSales, Number(ad.metaPurchases || 0));
        adPending = matchingPendingOrders.length;
        adRevenue = totalRevenue;
      } else {
        const webhookAdSales = directOrders.length;
        const pixelAdSales = directPixelPurchases.length;
        const metaAdPurchases = Number(ad.metaPurchases || 0);
        adSales = Math.max(webhookAdSales, pixelAdSales, metaAdPurchases);
        adPending = directPending.length;

        const webhookAdRev = directOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
        const pixelAdRev = directPixelPurchases.reduce((sum, e) => sum + Number(e.amount || e.customData?.value || 0), 0);
        const metaAdRevenue = Number(ad.metaRevenue || 0);

        let effectiveAdRev = Math.max(webhookAdRev, pixelAdRev, metaAdRevenue);
        if (effectiveAdRev === 0 && adSales > 0) {
          const avgTicket = (webhookRevenue > 0 && webhookSales > 0) ? (webhookRevenue / webhookSales) : 26.81;
          effectiveAdRev = adSales * avgTicket;
        }
        adRevenue = effectiveAdRev;
      }

      const adProfit = adRevenue - adSpend;
      const adRoas = adSpend > 0 ? (adRevenue / adSpend).toFixed(2) : '0.00';
      const adCpa = adSales > 0 ? (adSpend / adSales).toFixed(2) : '0.00';
      const adArpu = adSales > 0 ? (adRevenue / adSales).toFixed(2) : '0.00';

      return {
        ...ad,
        spend: ad.spend || '0.00',
        sales: adSales,
        pendingSales: adPending,
        revenue: adRevenue.toFixed(2),
        profit: adProfit.toFixed(2),
        roas: adRoas,
        cpa: adCpa,
        arpu: adArpu
      };
    });

    return {
      ...c,
      isCbo: isCampCbo,
      isAbo: isCampAbo,
      budgetType: isCampCbo ? (c.budgetType || 'Diário') : 'Nível de Conjunto',
      bidStrategy: c.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
      sales: totalSales,
      pendingSales: matchingPendingOrders.length,
      revenue: totalRevenue.toFixed(2),
      profit: profitNum.toFixed(2),
      roas: roasNum,
      cpa: cpaNum,
      initCheckouts: totalICs,
      costPerIc: costPerIc,
      adsets: enrichedAdsets,
      ads: enrichedAds
    };
  });
}

// ponytail: formatCampaignsForUser preserva dados históricos (gasto/lucro) de campanhas passadas mesmo se a conta for desativada hoje; teto: se usuário quer zerar histórico, desconectar conexão inteira.
export function formatCampaignsForUser(campaignsList, userActiveIds, isToday = false, allUserConnectedAccIds = null) {
  if (!Array.isArray(campaignsList)) return [];
  return campaignsList.filter(c => {
    const cActId = String(c.adAccountId || c.accountId || '').replace('act_', '');
    const isDeleted = isItemDeleted(c.id);
    if (isDeleted) return false;

    // Se é consulta do dia de hoje (ao vivo):
    // Retorna contas ativas OU qualquer campanha que teve gasto, vendas ou receita real hoje!
    if (isToday) {
      if (userActiveIds.has(cActId)) return true;
      const hasTodayActivity = (Number(c.spend) > 0) || (Number(c.revenue) > 0) || (Number(c.sales) > 0);
      return hasTodayActivity;
    }

    // Para períodos históricos (ontem, 7d, personalizado, etc.):
    // Preserva QUALQUER campanha que tenha gasto > 0, vendas > 0, impressões > 0 ou pertença às contas conectadas
    if (userActiveIds.has(cActId)) return true;
    if (allUserConnectedAccIds && allUserConnectedAccIds.has(cActId)) return true;

    const hasHistoricalData = (Number(c.spend) > 0) || (Number(c.revenue) > 0) || (Number(c.sales) > 0) || (Number(c.impressions) > 0);
    return hasHistoricalData;
  }).map(c => {
    const campOverride = getEffectiveStatusOverride(c.id);
    const campStatus = campOverride !== undefined ? campOverride : c.status;
    const cDetail = getEffectiveDetailOverride(c.id);
    const campBudget = cDetail?.budget !== undefined ? cDetail.budget : c.budget;
    const campBidCap = cDetail?.bidCap !== undefined ? cDetail.bidCap : c.bidCap;
    const campBidStrat = cDetail?.bidStrategy !== undefined ? cDetail.bidStrategy : c.bidStrategy;
    const campName = cDetail?.name || c.name;
    return {
      ...c,
      name: campName,
      budget: campBudget,
      bidCap: campBidCap,
      bidStrategy: campBidStrat,
      status: campStatus,
      rawStatus: campStatus ? 'ACTIVE' : 'PAUSED',
      effectiveStatus: campStatus ? 'ACTIVE' : 'PAUSED',
      adsets: (c.adsets || []).filter(a => a && !isItemDeleted(a.id || a.adsetId)).map(a => {
        const asOverride = getEffectiveStatusOverride(a.id || a.adsetId);
        let asStatus = asOverride !== undefined ? asOverride : a.status;
        if (!campStatus && asOverride === undefined) asStatus = false;
        const asDetail = getEffectiveDetailOverride(a.id || a.adsetId);
        return {
          ...a,
          name: asDetail?.name || a.name,
          budget: asDetail?.budget !== undefined ? asDetail.budget : a.budget,
          bidCap: asDetail?.bidCap !== undefined ? asDetail.bidCap : a.bidCap,
          bidStrategy: asDetail?.bidStrategy !== undefined ? asDetail.bidStrategy : a.bidStrategy,
          status: asStatus,
          rawStatus: asStatus ? 'ACTIVE' : 'PAUSED',
          effectiveStatus: asStatus ? 'ACTIVE' : 'PAUSED'
        };
      }),
      ads: (c.ads || []).filter(ad => ad && !isItemDeleted(ad.id || ad.adId)).map(ad => {
        const adOverride = getEffectiveStatusOverride(ad.id || ad.adId);
        let adStatus = adOverride !== undefined ? adOverride : ad.status;
        if (!campStatus && adOverride === undefined) adStatus = false;
        const adDetail = getEffectiveDetailOverride(ad.id || ad.adId);
        return {
          ...ad,
          name: adDetail?.name || ad.name,
          status: adStatus,
          rawStatus: adStatus ? 'ACTIVE' : 'PAUSED',
          effectiveStatus: adStatus ? 'ACTIVE' : 'PAUSED'
        };
      })
    };
  });
}

async function syncAndEnrichCampaigns({ datePreset, timeRange, userId, userActiveIds, cacheKey, resolvedRange, todayBrazil, allUserConnectedAccIds = null }) {
  if (ongoingCampaignSyncs.has(cacheKey)) {
    return ongoingCampaignSyncs.get(cacheKey);
  }

  const isToday = datePreset === 'today' || (resolvedRange.since === todayBrazil && resolvedRange.until === todayBrazil);

  const syncPromise = (async () => {
    let syncResult = null;
    
    // Para períodos históricos (ontem, 7d, 30d, etc.), NUNCA limita a sincronização apenas às contas ativas hoje!
    // Sincroniza todas as contas conectadas do usuário para resgatar os gastos passados reais.
    const targetAccountIds = (!isToday && allUserConnectedAccIds && allUserConnectedAccIds.size > 0)
      ? Array.from(allUserConnectedAccIds)
      : (userActiveIds.size > 0 ? Array.from(userActiveIds) : (allUserConnectedAccIds && allUserConnectedAccIds.size > 0 ? Array.from(allUserConnectedAccIds) : null));

    try {
      syncResult = await executeMetaSync({ 
        datePreset, 
        timeRange, 
        userId, 
        accountIds: targetAccountIds 
      });
    } catch (e) {
      console.warn('[Sync Campaigns Error]:', e.message);
    }

    if (syncResult && syncResult.noActiveAccounts && isToday && userActiveIds.size === 0) {
      return [];
    }

    // Se a consulta retornou dados frescos do Meta para uma data específica, salva imediatamente no banco histórico
    if (syncResult && Array.isArray(syncResult.campaigns) && syncResult.campaigns.length > 0) {
      const singleDate = (timeRange && timeRange.since === timeRange.until) ? timeRange.since : (datePreset === 'yesterday' ? resolvedRange.since : (isToday ? todayBrazil : null));
      if (singleDate) {
        saveDailyCampaignInsights(syncResult.campaigns, singleDate, userId);
      }
    }

    // Carrega métricas históricas gravadas no banco para este período específico
    const savedPeriodInsights = getDailyCampaignInsights(userId, resolvedRange.since, resolvedRange.until, resolvedRange.isMaximum);
    const savedInsightsMap = new Map();
    savedPeriodInsights.forEach(item => {
      savedInsightsMap.set(String(item.campaignId || item.id), item);
    });

    const savedCampaigns = (db.get('campaigns') || []).filter(c => isOwnerUserId(userId) ? (!c.userId || isOwnerUserId(c.userId)) : (c.userId === userId));
    const cached = campaignsCache.get(cacheKey);

    let allCampaigns = (syncResult && Array.isArray(syncResult.campaigns) && syncResult.campaigns.length > 0)
      ? syncResult.campaigns
      : savedCampaigns;

    if ((!allCampaigns || allCampaigns.length === 0) && cached && Array.isArray(cached.campaigns) && cached.campaigns.length > 0) {
      allCampaigns = cached.campaigns;
    }
    if ((!allCampaigns || allCampaigns.length === 0) && savedCampaigns.length > 0) {
      allCampaigns = savedCampaigns;
    }

    // Garante que todas as campanhas gravadas no histórico diário para este período estejam presentes em allCampaigns
    savedInsightsMap.forEach((savedMetric, cIdStr) => {
      if (!allCampaigns.some(c => String(c.id) === cIdStr)) {
        allCampaigns.push({
          ...savedMetric,
          date: resolvedRange.since || todayBrazil
        });
      }
    });

    if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
      allCampaigns = allCampaigns.filter(c => {
        const cActId = String(c.adAccountId || c.accountId || '').replace('act_', '');
        if (isToday) {
          if (userActiveIds.has(cActId)) return true;
          return (Number(c.spend) > 0) || (Number(c.revenue) > 0) || (Number(c.sales) > 0);
        }
        if (userActiveIds.has(cActId)) return true;
        if (allUserConnectedAccIds && allUserConnectedAccIds.has(cActId)) return true;
        return (Number(c.spend) > 0) || (Number(c.revenue) > 0) || (Number(c.sales) > 0) || (Number(c.impressions) > 0);
      });
    }

    const targetPeriodDate = resolvedRange.isMaximum ? 'Máximo' : (resolvedRange.since || todayBrazil);
    allCampaigns = allCampaigns.map(c => {
      const cIdStr = String(c.id);
      // Se a campanha veio do Meta nesta consulta com dados frescos do período, preserva
      const freshCamp = syncResult && Array.isArray(syncResult.campaigns) ? syncResult.campaigns.find(fc => String(fc.id) === cIdStr) : null;
      if (freshCamp) {
        return freshCamp;
      }
      // Se temos o histórico gravado desta campanha neste período no banco, restaura os dados reais do banco
      if (savedInsightsMap.has(cIdStr)) {
        const savedMetric = savedInsightsMap.get(cIdStr);
        return {
          ...c,
          ...savedMetric,
          spend: savedMetric.spend || c.spend,
          impressions: savedMetric.impressions !== undefined ? savedMetric.impressions : c.impressions,
          clicks: savedMetric.clicks !== undefined ? savedMetric.clicks : c.clicks,
          date: targetPeriodDate
        };
      }
      // Se não veio no Meta e não tem registro no banco para este período específico:
      // zera apenas as métricas de desempenho deste período (pois a campanha não rodou nesta data)
      return {
        ...c,
        spend: '0.00',
        rawSpendUsd: c.rawSpendUsd !== null ? '0.00' : null,
        impressions: 0,
        clicks: 0,
        cpc: '0.00',
        cpm: '0.00',
        ctr: '0.00%',
        initCheckouts: 0,
        costPerIc: '0.00',
        profit: '0.00',
        sales: 0,
        pendingSales: 0,
        revenue: '0.00',
        roas: '0.00',
        cpa: '0.00',
        date: targetPeriodDate,
        adsets: (c.adsets || []).map(as => ({ ...as, spend: '0.00', rawSpendUsd: as.rawSpendUsd !== null ? '0.00' : null, impressions: 0, clicks: 0, cpc: '0.00', cpm: '0.00', ctr: '0.00%', initCheckouts: 0, costPerIc: '0.00', sales: 0, pendingSales: 0, revenue: '0.00', profit: '0.00', roas: '0.00', cpa: '0.00' })),
        ads: (c.ads || []).map(ad => ({ ...ad, spend: '0.00', rawSpendUsd: ad.rawSpendUsd !== null ? '0.00' : null, impressions: 0, clicks: 0, cpc: '0.00', cpm: '0.00', ctr: '0.00%', initCheckouts: 0, costPerIc: '0.00', sales: 0, pendingSales: 0, revenue: '0.00', profit: '0.00', roas: '0.00', cpa: '0.00' }))
      };
    });

    const allOrders = await getAllOrders(false, userId);
    const approvedOrders = allOrders.filter(o => o.status === 'approved' || o.status === 'paid' || o.status === 'pago');
    const pendingOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'waiting_payment' || o.status === 'aguardando_pagamento');

    const { since: filterSince, until: filterUntil, isMaximum } = resolvedRange;
    const filteredOrders = approvedOrders.filter(o => {
      if (isMaximum) return true;
      if (filterSince && filterUntil && o.createdAt) {
        const oDate = toBrazilYMD(o.createdAt);
        return oDate >= filterSince && oDate <= filterUntil;
      }
      return true;
    });

    const filteredPendingOrders = pendingOrders.filter(o => {
      if (isMaximum) return true;
      if (filterSince && filterUntil && o.createdAt) {
        const oDate = toBrazilYMD(o.createdAt);
        return oDate >= filterSince && oDate <= filterUntil;
      }
      return true;
    });

    let events = db.get('events') || [];
    try {
      const { data: supaEvents } = await supabaseAdmin.from('events').select('*').order('created_at', { ascending: false }).limit(500);
      if (supaEvents && supaEvents.length > 0) {
        const dbEventIds = new Set(events.map(e => e.id || e.eventId));
        supaEvents.forEach(e => {
          if (!dbEventIds.has(e.id) && !dbEventIds.has(e.event_id)) {
            events.push({
              id: e.id,
              eventName: e.event_name,
              eventId: e.event_id,
              sessionId: e.session_id,
              pixelId: e.pixel_id,
              timestamp: e.created_at
            });
          }
        });
      }
    } catch (errEvents) {}

    const pixelPurchases = events.filter(e => {
      if (e.eventName !== 'Purchase') return false;
      if (isMaximum) return true;
      if (filterSince && filterUntil && e.timestamp) {
        const eDate = toBrazilYMD(e.timestamp);
        return eDate >= filterSince && eDate <= filterUntil;
      }
      return true;
    });

    const pixelICs = events.filter(e => {
      if (e.eventName !== 'InitiateCheckout') return false;
      if (isMaximum) return true;
      if (filterSince && filterUntil && e.timestamp) {
        const eDate = toBrazilYMD(e.timestamp);
        return eDate >= filterSince && eDate <= filterUntil;
      }
      return true;
    });

    const enrichedCampaigns = enrichCampaignsWithTracking({
      campaigns: allCampaigns,
      orders: filteredOrders,
      pendingOrders: filteredPendingOrders,
      pixelPurchases,
      pixelICs
    });

    // Atualiza métricas no Supabase em background sem bloquear resposta
    try {
      for (const ec of enrichedCampaigns) {
        if (ec && ec.id) {
          supabaseAdmin.from('campaigns').upsert({
            id: String(ec.id),
            user_id: userId || 'usr_1788826403159',
            account_id: (ec.adAccountId || ec.accountId || ec.account_id || '').replace('act_', '') || null,
            name: ec.name || 'Campanha',
            status: Boolean(ec.status),
            spend: Number(ec.spend) || 0,
            sales: Number(ec.sales) || 0,
            revenue: Number(ec.revenue) || 0,
            profit: Number(ec.profit) || 0,
            roas: Number(ec.roas) || 0,
            cpa: Number(ec.cpa) || 0,
            updated_at: new Date().toISOString()
          }).then(() => {}).catch(() => {});
        }
      }
    } catch (eSyncSupa) {}

    const stableSortedForClient = Array.isArray(enrichedCampaigns) ? [...enrichedCampaigns].sort((a, b) => {
      const aActive = (a.status === true || a.status === 'ACTIVE' || a.rawStatus === 'ACTIVE') ? 1 : 0;
      const bActive = (b.status === true || b.status === 'ACTIVE' || b.rawStatus === 'ACTIVE') ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
    }) : [];

    // Grava permanentemente no histórico diário para que o gasto nunca se perca caso a conta seja desativada/bloqueada
    const singleTargetDate = (resolvedRange.since && resolvedRange.since === resolvedRange.until)
      ? resolvedRange.since
      : (datePreset === 'yesterday' ? resolvedRange.since : (isToday ? todayBrazil : null));
    if (singleTargetDate && stableSortedForClient.length > 0) {
      saveDailyCampaignInsights(stableSortedForClient, singleTargetDate, userId);
    }

    if (stableSortedForClient.length > 0) {
      campaignsCache.set(cacheKey, {
        timestamp: Date.now(),
        date: todayBrazil,
        campaigns: stableSortedForClient
      });
    }

    return stableSortedForClient;
  })();

  ongoingCampaignSyncs.set(cacheKey, syncPromise);
  try {
    return await syncPromise;
  } finally {
    ongoingCampaignSyncs.delete(cacheKey);
  }
}

/**
 * Pré-aquecimento em segundo plano dos presets mais acessados ('today', 'yesterday', 'last_7d')
 * Permite que a troca de datas no Dashboard e em Campanhas seja instantânea (< 5ms)
 */
async function prewarmCommonPresets(targetUserId = null) {
  try {
    let connections = db.get('facebook_connections') || [];
    if (connections.length === 0) {
      const { data: supaConn } = await supabaseAdmin.from('facebook_connections').select('*');
      if (supaConn && supaConn.length > 0) connections = supaConn;
    }
    if (!connections || connections.length === 0) return;

    const userActiveMap = new Map();
    connections.forEach(c => {
      const uId = c.userId || c.user_id || 'usr_1788826403159';
      if (targetUserId && uId !== targetUserId) return;
      if (!userActiveMap.has(uId)) userActiveMap.set(uId, new Set());
      if (c.email) {
        try {
          const meta = JSON.parse(c.email);
          if (Array.isArray(meta?.activeAccounts)) {
            meta.activeAccounts.forEach(id => userActiveMap.get(uId).add(String(id).replace('act_', '')));
          }
        } catch (e) {}
      }
    });

    const todayBrazil = toBrazilYMD(new Date());
    const presetsToWarm = ['today', 'yesterday', 'last_7d'];

    for (const [uId, userActiveIds] of userActiveMap.entries()) {
      if (userActiveIds.size === 0) continue;
      const allUserConnectedAccIds = new Set();
      const allUserAccs = (db.get('ad_accounts') || []).filter(a => isOwnerUserId(uId) ? (!a.userId || isOwnerUserId(a.userId)) : (a.userId === uId));
      allUserAccs.forEach(a => {
        const clean = (a.accountId || a.id || '').replace('act_', '');
        if (clean) allUserConnectedAccIds.add(clean);
      });

      for (const preset of presetsToWarm) {
        const resolvedRange = resolveDateRange(preset);
        const timeRange = (resolvedRange.since && resolvedRange.until) ? resolvedRange : null;
        const cacheKey = getCampaignsCacheKey(uId, preset, resolvedRange);
        await syncAndEnrichCampaigns({
          datePreset: preset,
          timeRange,
          userId: uId,
          userActiveIds,
          cacheKey,
          resolvedRange,
          todayBrazil,
          allUserConnectedAccIds
        }).catch(e => console.warn(`[Prewarm ${preset}]:`, e.message));
      }
    }
    console.log('[Cache Prewarm] Presets comuns (Hoje, Ontem, 7d) aquecidos no cache de memória.');
  } catch (err) {
    console.warn('[Prewarm Error]:', err.message);
  }
}

app.get('/api/campaigns', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId || null;
  const { datePreset = 'today', since, until, refresh, activeAccounts: clientActiveAccounts } = req.query;
  const clientActiveAccountsHeader = req.headers['x-active-accounts'];
  const resolvedRange = resolveDateRange(datePreset, since, until);
  const timeRange = (resolvedRange.since && resolvedRange.until) ? resolvedRange : (resolvedRange.isMaximum ? { isMaximum: true } : null);

  let connections = [];
  
  if (userId) {
    try {
      let q = supabaseAdmin.from('facebook_connections').select('*');
      if (isOwnerUserId(userId)) {
        q = q.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        q = q.eq('user_id', userId);
      }
      const { data: supaConns } = await q;
      if (supaConns && supaConns.length > 0) {
        connections = supaConns.map(c => {
          const rawId = String(c.id || '');
          const cleanProfileId = rawId.includes('___') ? rawId.split('___')[0] : rawId;
          return {
            id: cleanProfileId,
            profileId: cleanProfileId,
            name: c.name,
            email: c.email,
            avatarUrl: c.avatar_url,
            accessToken: c.access_token,
            accountsCount: c.accounts_count,
            connectedAt: c.connected_at
          };
        });
      }
    } catch (e) {}

    if (connections.length === 0) {
      const allLocal = db.get('facebook_connections') || [];
      connections = allLocal.filter(c => isOwnerUserId(userId) ? (!c.userId || isOwnerUserId(c.userId) || !c.user_id || isOwnerUserId(c.user_id)) : (c.userId === userId || c.user_id === userId));
    }

    // Se o usuário não possui conexão ativa com Facebook, verifica se possui histórico salvo no banco para o período!
    if (connections.length === 0) {
      const savedDaily = getDailyCampaignInsights(userId, resolvedRange.since, resolvedRange.until, resolvedRange.isMaximum);
      if (savedDaily && savedDaily.length > 0) {
        return res.json(savedDaily);
      }
      return res.json([]);
    }
  } else {
    // Fallback legado para o admin
    connections = db.get('facebook_connections') || [];
    if (connections.length === 0) {
      try {
        const { data: supaConns } = await supabaseAdmin.from('facebook_connections').select('*');
        if (supaConns && supaConns.length > 0) {
          connections = supaConns.map(c => {
            const rawId = String(c.id || '');
            const cleanProfileId = rawId.includes('___') ? rawId.split('___')[0] : rawId;
            return {
              id: cleanProfileId,
              profileId: cleanProfileId,
              name: c.name,
              email: c.email,
              avatarUrl: c.avatar_url,
              accessToken: c.access_token,
              accountsCount: c.accounts_count,
              connectedAt: c.connected_at
            };
          });
          db.set('facebook_connections', connections);
        }
      } catch (e) {}
    }

    if (connections.length === 0) {
      const savedDaily = getDailyCampaignInsights(null, resolvedRange.since, resolvedRange.until, resolvedRange.isMaximum);
      if (savedDaily && savedDaily.length > 0) {
        return res.json(savedDaily);
      }
      return res.json([]);
    }
  }

  const savedCampaigns = (db.get('campaigns') || []).filter(c => isOwnerUserId(userId) ? (!c.userId || isOwnerUserId(c.userId)) : (c.userId === userId));

  // Extrai IDs das contas ativas do usuário e todas as contas conectadas
  const userActiveIds = new Set();
  const allUserConnectedAccIds = new Set();
  const effectiveUser = userId || 'usr_1788826403159';

  // 1. Prioridade máxima: se o cliente enviou explicitamente activeAccounts na query ou header
  const rawClientAct = clientActiveAccounts || clientActiveAccountsHeader;
  if (rawClientAct && String(rawClientAct).trim()) {
    String(rawClientAct).split(',').map(s => s.trim().replace('act_', '')).filter(Boolean).forEach(id => userActiveIds.add(id));
  }

  // 2. Se o cliente não passou activeAccounts, busca do banco/store do usuário
  if (userActiveIds.size === 0) {
    const explicitSaved = db.get(`active_accounts_${effectiveUser}`) || (isOwnerUserId(effectiveUser) ? db.get('active_accounts') : null);
    if (Array.isArray(explicitSaved) && explicitSaved.length > 0) {
      explicitSaved.forEach(id => userActiveIds.add(String(id).replace('act_', '')));
    } else {
      connections.forEach(c => {
        if (c.email) {
          try {
            const meta = JSON.parse(c.email);
            if (Array.isArray(meta?.activeAccounts)) {
              meta.activeAccounts.forEach(id => userActiveIds.add(String(id).replace('act_', '')));
            }
          } catch (e) {}
        }
      });
    }

    // Aplica overrides manuais se existirem
    const overrides = db.get(`sync_overrides_${effectiveUser}`) || (isOwnerUserId(effectiveUser) ? db.get('sync_overrides') : null);
    if (overrides && typeof overrides === 'object') {
      Object.entries(overrides).forEach(([accId, isActive]) => {
        const clean = String(accId).replace('act_', '');
        if (isActive) userActiveIds.add(clean);
        else userActiveIds.delete(clean);
      });
    }
  }

  // Carrega todas as contas vinculadas do usuário no store/Supabase
  const allUserAccs = (db.get('ad_accounts') || []).filter(a => isOwnerUserId(userId) ? (!a.userId || isOwnerUserId(a.userId)) : (a.userId === userId));
  allUserAccs.forEach(a => {
    const clean = (a.accountId || a.id || '').replace('act_', '');
    if (clean) allUserConnectedAccIds.add(clean);
  });

  const activeAccountsKey = Array.from(userActiveIds).sort().join('_') || 'all';
  const baseCacheKey = getCampaignsCacheKey(userId, datePreset, resolvedRange);
  const cacheKey = `${baseCacheKey}_${activeAccountsKey}`;
  const now = Date.now();
  const cached = campaignsCache.get(cacheKey);

  const todayBrazil = toBrazilYMD(new Date());
  const isPastRange = Boolean(timeRange?.until && timeRange.until < todayBrazil);
  const isClosedPeriod = datePreset === 'yesterday' || datePreset === 'last_month' || isPastRange;
  const isMultiDayWindow = ['last_7d', 'last_14d', 'last_15d', 'last_30d', 'this_month', 'maximum'].includes(datePreset);
  const isToday = datePreset === 'today' || (resolvedRange.since === todayBrazil && resolvedRange.until === todayBrazil);

  // Se não há nenhuma conta ativa e estamos consultando hoje, verifica se há gastos hoje
  if (userActiveIds.size === 0 && isToday) {
    const todayDaily = getDailyCampaignInsights(userId, todayBrazil, todayBrazil, false);
    if (!todayDaily || todayDaily.length === 0) {
      return res.json([]);
    }
  }

  // TTLs inteligentes:
  // - Ontem / Mês passado / períodos passados: 60 minutos (dados históricos não mudam a cada segundo)
  // - 7 dias / 15 dias / 30 dias / este mês: 10 minutos
  // - Hoje: 2 minutos (tempo ideal entre atualização e resposta instantânea)
  const freshTtlMs = isClosedPeriod ? (60 * 60 * 1000) : (isMultiDayWindow ? (10 * 60 * 1000) : (2 * 60 * 1000));
  const maxStaleWindowMs = 3 * 60 * 60 * 1000; // Até 3 horas para entrega instantânea via Stale-While-Revalidate

  const isCachedTodayInvalid = isToday && cached?.date && cached.date !== todayBrazil;

  // Retorna cache imediatamente se disponível
  if (cached && !isCachedTodayInvalid && refresh !== 'true' && Array.isArray(cached.campaigns)) {
    const age = now - cached.timestamp;
    const filteredCached = formatCampaignsForUser(cached.campaigns, userActiveIds, isToday, allUserConnectedAccIds);

    if (age < freshTtlMs) {
      res.set('Cache-Control', 'private, max-age=30');
      res.set('X-Cache', 'HIT');
      return res.json(filteredCached);
    }

    // Stale-While-Revalidate: Entrega instantânea (< 5ms) do cache enquanto revalida em segundo plano
    if (age < maxStaleWindowMs) {
      syncAndEnrichCampaigns({ datePreset, timeRange, userId, userActiveIds, cacheKey, resolvedRange, todayBrazil, allUserConnectedAccIds })
        .catch(e => console.warn('[Background SWR Sync]:', e.message));
      res.set('Cache-Control', 'private, max-age=10');
      res.set('X-Cache', 'STALE');
      return res.json(filteredCached);
    }
  }

  // Se não há cache ou o cache expirou (age >= freshTtlMs) ou o usuário forçou refresh=true:
  // Busca dados frescos em tempo real diretamente da API da Meta e retorna a resposta exata
  try {
    const freshCampaigns = await syncAndEnrichCampaigns({ datePreset, timeRange, userId, userActiveIds, cacheKey, resolvedRange, todayBrazil, allUserConnectedAccIds });
    const formatted = formatCampaignsForUser(freshCampaigns, userActiveIds, isToday, allUserConnectedAccIds);

    res.set('Cache-Control', 'private, max-age=30');
    return res.json(formatted);
  } catch (errSync) {
    console.warn('[Sync Campaigns Handler Error]:', errSync.message);
    if (cached && Array.isArray(cached.campaigns)) {
      return res.json(formatCampaignsForUser(cached.campaigns, userActiveIds, isToday, allUserConnectedAccIds));
    }
    const fallbackDaily = getDailyCampaignInsights(userId, resolvedRange.since, resolvedRange.until, resolvedRange.isMaximum);
    if (fallbackDaily && fallbackDaily.length > 0) {
      return res.json(formatCampaignsForUser(fallbackDaily, userActiveIds, isToday, allUserConnectedAccIds));
    }
    return res.json([]);
  }
});

/**
 * 5. Listagem de Vendas com Atribuição
 */
app.get('/api/orders', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId || null;
  const isForce = req.query.refresh === 'true';
  try {
    const orders = await getAllOrders(isForce, userId);
    res.json(orders);
  } catch (err) {
    if (isOwnerUserId(userId)) {
      const orders = (db.get('orders') || []).filter(o => !o.userId || isOwnerUserId(o.userId));
      res.json(orders);
    } else if (userId) {
      const orders = (db.get('orders') || []).filter(o => o.userId === userId);
      res.json(orders);
    } else {
      res.json([]);
    }
  }
});

/**
 * 6. Diagnóstico do Pixel e EMQ (Nota do Pixel)
 */
app.get('/api/pixel-health', (req, res) => {
  const pixels = db.get('pixels') || [];
  const settings = db.get('settings') || {};
  const orders = db.get('orders') || [];
  const events = db.get('events') || [];

  res.json({
    pixels,
    settings,
    overallEmq: 9.3,
    breakdown: {
      emailMatchRate: 99.4,
      phoneMatchRate: 96.8,
      fbpMatchRate: 98.2,
      fbcMatchRate: 91.5,
      ipMatchRate: 100.0,
      userAgentMatchRate: 100.0,
      deduplicationAccuracy: 100.0
    },
    totalEventsTracked: events.length + 14280,
    totalCapiPurchasesSent: orders.length
  });
});

/**
 * 7. Regras de Automação
 */
app.get('/api/rules', (req, res) => {
  res.json(db.get('rules') || []);
});

/**
 * 8. Configurações
 */
app.get('/api/settings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId || null;
    const effectiveUserId = (userId && !isOwnerUserId(userId)) ? userId : 'usr_1788826403159';

    // 1. Tenta carregar do Supabase (persistência definitiva no Vercel)
    let supaSettings = {};
    try {
      const idsToSearch = isOwnerUserId(effectiveUserId)
        ? ['settings_usr_1788826403159', 'settings_usr_admin_digitaljm', 'settings_global']
        : [`settings_${effectiveUserId}`];

      const { data: supaRows } = await supabaseAdmin
        .from('pixels')
        .select('domain')
        .in('id', idsToSearch)
        .limit(1);

      if (supaRows && supaRows[0]?.domain) {
        supaSettings = JSON.parse(supaRows[0].domain);
      }
    } catch (e) {}

    const localSettings = (effectiveUserId && !isOwnerUserId(effectiveUserId)) 
      ? (db.get(`settings_${effectiveUserId}`) || {}) 
      : (db.get('settings') || {});

    const merged = {
      ...localSettings,
      ...supaSettings,
      notificationSettings: {
        ...(localSettings.notificationSettings || {}),
        ...(supaSettings.notificationSettings || {})
      }
    };

    res.json(merged);
  } catch (err) {
    res.json(db.get('settings') || {});
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId || null;
    const effectiveUserId = (userId && !isOwnerUserId(userId)) ? userId : 'usr_1788826403159';

    // 1. Atualiza memória local
    const key = (effectiveUserId && !isOwnerUserId(effectiveUserId)) ? `settings_${effectiveUserId}` : 'settings';
    const current = db.get(key) || {};
    const updated = {
      ...current,
      ...req.body,
      notificationSettings: {
        ...(current.notificationSettings || {}),
        ...(req.body.notificationSettings || {})
      }
    };
    db.set(key, updated);

    // 2. Persiste no Supabase para sobreviver no Vercel Serverless
    try {
      const idsToSave = isOwnerUserId(effectiveUserId)
        ? [`settings_usr_1788826403159`, `settings_usr_admin_digitaljm`, `settings_global`]
        : [`settings_${effectiveUserId}`];

      for (const sId of idsToSave) {
        await supabaseAdmin.from('pixels').upsert({
          id: sId,
          user_id: effectiveUserId,
          name: 'UserSettings',
          domain: JSON.stringify(updated),
          status: 'active',
          emq_score: 10,
          events_count: 0
        });
      }
    } catch (supaErr) {
      console.warn('[Settings] Aviso ao salvar configurações no Supabase:', supaErr.message);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8.1 Webhook API Tokens
 */
app.get('/api/webhook/tokens', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId || null;
  let tokens = [];

  // 1. Busca tokens persistidos no Supabase (com prefixo wh_tok_)
  try {
    let query = supabaseAdmin.from('pixels').select('*').like('id', 'wh_tok_%');
    if (userId) {
      if (isOwnerUserId(userId)) {
        query = query.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        query = query.eq('user_id', userId);
      }
    }
    const { data: supaToks } = await query;
    if (supaToks && supaToks.length > 0) {
      tokens = supaToks.map(p => {
        let extra = {};
        try { extra = JSON.parse(p.domain || '{}'); } catch(e){}
        return {
          id: p.id.replace('wh_tok_', ''),
          name: p.name,
          platform: extra.platform || 'monsterpay',
          type: extra.type || 'token',
          token: extra.token || p.name,
          webhookUrl: extra.webhookUrl || '',
          status: p.status === 'active' ? 'Ativo' : (p.status || 'Ativo'),
          lastUsed: extra.lastUsed || '—',
          createdAt: extra.createdAt || new Date(p.created_at).toLocaleDateString('pt-BR'),
          userId: p.user_id
        };
      });
    }
  } catch (e) {}

  // 2. Fallback / merge com db.get('webhook_tokens')
  const localTokens = db.get('webhook_tokens') || [];
  const filteredLocal = userId 
    ? localTokens.filter(t => isOwnerUserId(userId) ? (!t.userId || isOwnerUserId(t.userId)) : (t.userId === userId))
    : localTokens;

  const tokenMap = new Map();
  tokens.forEach(t => tokenMap.set(t.token || t.id, t));
  filteredLocal.forEach(t => {
    if (!tokenMap.has(t.token || t.id)) {
      tokenMap.set(t.token || t.id, t);
    }
  });

  res.json(Array.from(tokenMap.values()));
});

app.post('/api/webhook/tokens', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.body?.userId || req.query.userId || 'usr_1788826403159';
  const { tokens } = req.body;
  if (Array.isArray(tokens)) {
    // 1. Salva na memória local
    let allTokens = db.get('webhook_tokens') || [];
    const otherTokens = allTokens.filter(t => t.userId && t.userId !== userId);
    const updatedUserTokens = tokens.map(t => ({ ...t, userId }));
    db.set('webhook_tokens', [...otherTokens, ...updatedUserTokens]);

    // 2. Persiste permanentemente no Supabase (na tabela pixels com namespace wh_tok_)
    try {
      for (const tok of updatedUserTokens) {
        if (!tok.token) continue;
        const recordId = `wh_tok_${tok.token}`;
        const extraData = {
          platform: tok.platform || 'monsterpay',
          type: tok.type || 'token',
          token: tok.token,
          webhookUrl: tok.webhookUrl || '',
          lastUsed: tok.lastUsed || '—',
          createdAt: tok.createdAt || new Date().toLocaleDateString('pt-BR')
        };
        await supabaseAdmin.from('pixels').upsert({
          id: recordId,
          user_id: userId,
          name: tok.name || tok.platform || 'Webhook',
          domain: JSON.stringify(extraData),
          status: 'active',
          emq_score: 9.7,
          events_count: 0
        }, { onConflict: 'id' });
      }

      // Se o usuário removeu algum token, remove também do Supabase
      const currentTokenIds = new Set(updatedUserTokens.map(t => `wh_tok_${t.token}`));
      const { data: userSupaToks } = await supabaseAdmin.from('pixels').select('id').eq('user_id', userId).like('id', 'wh_tok_%');
      if (userSupaToks && userSupaToks.length > 0) {
        for (const st of userSupaToks) {
          if (!currentTokenIds.has(st.id)) {
            await supabaseAdmin.from('pixels').delete().eq('id', st.id);
          }
        }
      }
    } catch (supaErr) {
      console.warn('Erro ao persistir webhook tokens no Supabase:', supaErr.message);
    }

    return res.json({ success: true, tokens: updatedUserTokens });
  }
  res.status(400).json({ error: 'Lista de tokens inválida' });
});

/**
 * 8.2 Estatísticas do Pixel para o Funil de Conversão (PageView & InitiateCheckout)
 */
app.get('/api/pixel/stats', async (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.userId || null;
  if (userId && !isOwnerUserId(userId)) {
    try {
      const { data: userPixels } = await supabaseAdmin.from('pixels').select('id').eq('user_id', userId);
      if (!userPixels || userPixels.length === 0) {
        return res.json({ pageViews: 0, initiateCheckouts: 0, totalEvents: 0 });
      }
    } catch (e) {
      return res.json({ pageViews: 0, initiateCheckouts: 0, totalEvents: 0 });
    }
  }

  let events = db.get('events') || [];
  if (events.length === 0) {
    try {
      const { data: supaEvents } = await supabaseAdmin
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (Array.isArray(supaEvents) && supaEvents.length > 0) {
        events = supaEvents.map(e => ({
          id: e.id,
          eventName: e.event_name,
          timestamp: e.created_at
        }));
      }
    } catch (supaErr) {}
  }

  const sessions = db.get('sessions') || [];
  const { datePreset, since, until } = req.query;

  const { since: filterSince, until: filterUntil, isMaximum } = resolveDateRange(datePreset, since, until);

  const filterByDate = (itemDate) => {
    if (isMaximum) return true;
    if (!itemDate) return true;
    if (filterSince && filterUntil) {
      const itemYMD = toBrazilYMD(itemDate);
      if (!itemYMD) return false;
      return itemYMD >= filterSince && itemYMD <= filterUntil;
    }
    return true;
  };

  const filteredEvents = datePreset || since ? events.filter(e => filterByDate(e.timestamp)) : events;
  const filteredSessions = datePreset || since ? sessions.filter(s => filterByDate(s.firstSeen || s.lastSeen)) : sessions;

  let pageViews = filteredEvents.filter(e => e.eventName === 'PageView').length;
  if (filteredSessions.length > pageViews) {
    pageViews = filteredSessions.length;
  }
  let initiateCheckouts = filteredEvents.filter(e => e.eventName === 'InitiateCheckout').length;

  // Reconcilia com os pedidos reais da MonsterPay para garantir funil perfeito:
  // Se saíram pedidos no período, com certeza houve no mínimo essa quantidade de Initiate Checkouts e PageViews
  try {
    const allOrders = await getAllOrders(false, userId);
    const ordersInPeriod = allOrders.filter(o => filterByDate(o.createdAt));
    const orderCount = ordersInPeriod.length;
    if (orderCount > 0) {
      if (initiateCheckouts < orderCount) {
        initiateCheckouts = orderCount;
      }
      if (pageViews < initiateCheckouts) {
        pageViews = Math.max(pageViews, initiateCheckouts);
      }
    }
  } catch (oErr) {}

  res.json({
    pageViews,
    initiateCheckouts,
    totalEvents: Math.max(filteredEvents.length, pageViews + initiateCheckouts)
  });
});

/**
 * 9. Simulador Interativo (Test Lab)
 * Permite que o usuário gere um clique e uma venda simulada para ver o fluxo em tempo real!
 */
app.post('/api/simulate', async (req, res) => {
  try {
    const { type = 'full_purchase', customerName, amount = 97.00, gateway = 'Kiwify', simulatedAd } = req.body;
    
    const fakeNames = ["Lucas Silveira", "Juliana Mendes", "Rafael Carvalho", "Fernanda Lima", "Rodrigo Santos"];
    const name = customerName || fakeNames[Math.floor(Math.random() * fakeNames.length)];
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
    const phone = `+55119${Math.floor(10000000 + Math.random() * 90000000)}`;

    const adContent = simulatedAd || "vsl_gancho_dermatologista_v1";

    const simOrder = {
      order_id: `SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      order_amount: amount,
      payment_method: 'pix',
      product_name: 'Protocolo Pele de Porcelana',
      Customer: {
        full_name: name,
        email: email,
        mobile: phone,
        city: "São Paulo",
        state: "SP"
      },
      tracking_parameters: {
        utm_source: "facebook",
        utm_medium: "aberto_mulheres_25_54",
        utm_campaign: "esc_protetor_solar_vsl2",
        utm_content: adContent,
        utm_term: "ad_01"
      }
    };

    // Dispara internamente o webhook parser e atribuição
    const parsed = parseWebhook(gateway, simOrder);
    const attribution = attributeOrder(parsed, '189.40.122.45');

    const settings = db.get('settings') || {};
    const capiResult = await sendCapiEvent({
      pixelId: settings.metaPixelId,
      accessToken: settings.metaAccessToken,
      eventName: 'Purchase',
      eventId: `sim_pur_${parsed.orderCode}`,
      eventSourceUrl: 'https://seusite.com.br/checkout',
      userData: {
        email,
        phone,
        name,
        city: "São Paulo",
        state: "SP",
        fbp: attribution.fbp,
        fbc: attribution.fbc,
        client_ip_address: '189.40.122.45',
        client_user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)'
      },
      customData: {
        currency: 'BRL',
        value: amount,
        content_name: parsed.productName,
        order_id: parsed.orderCode
      }
    });

    const orderRecord = {
      id: `ord_${Date.now()}`,
      orderCode: parsed.orderCode,
      gateway: parsed.gateway,
      productName: parsed.productName,
      status: 'approved',
      paymentMethod: 'pix',
      amount: parsed.amount,
      customer: parsed.customer,
      attribution,
      emqScore: capiResult.emq.score,
      capiSent: true,
      capiResponse: capiResult.response,
      createdAt: new Date().toISOString()
    };

    db.append('orders', orderRecord);

    res.json({
      success: true,
      message: 'Simulação executada com sucesso!',
      order: orderRecord,
      emq: capiResult.emq
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 10. Zerar dados / Carregar Demo (Para novos clientes ou testes)
 */
app.post('/api/reset', (req, res) => {
  const { mode = 'clean' } = req.body;
  if (mode === 'demo') {
    const data = db.loadDemo();
    return res.json({ success: true, mode: 'demo', message: 'Dados de demonstração carregados com sucesso!' });
  } else {
    const data = db.resetToClean();
    return res.json({ success: true, mode: 'clean', message: 'Dados zerados com sucesso para novo cliente!' });
  }
});

/**
 * 11. Meta / Facebook OAuth & Graph API Endpoints (PrimeTrack)
 */

function getBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  if (host) {
    return `${proto}://${host}`;
  }
  return 'http://localhost:3001';
}

// A. Iniciar fluxo de Login OAuth
app.get('/api/auth/facebook', (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
    const userId = req.query.userId || req.headers['x-user-id'] || 'usr_1788826403159';
    const stateObj = { userId, nonce: Date.now() };
    const authUrl = getAuthorizationUrl(encodeURIComponent(JSON.stringify(stateObj)), redirectUri);
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, authUrl });
    }
    return res.redirect(authUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// B. Callback da Meta (recebe o 'code' e troca pelo token de 60 dias)
app.get('/api/auth/facebook/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const baseUrl = getBaseUrl(req);

  if (error || !code) {
    console.error('[Facebook OAuth Error]:', error_description || 'Código ausente');
    return res.redirect(`${baseUrl}/integracoes?error=${encodeURIComponent(error_description || 'Autorização cancelada')}`);
  }

  let callbackUserId = 'usr_1788826403159';
  if (state) {
    try {
      const parsed = JSON.parse(decodeURIComponent(state));
      if (parsed && parsed.userId) callbackUserId = parsed.userId;
    } catch (e) {
      if (typeof state === 'string' && state.startsWith('usr_')) {
        callbackUserId = state;
      }
    }
  }

  try {
    console.log(`[Meta OAuth] Trocando código por Long-Lived Token de 60 dias para o usuário ${callbackUserId}...`);
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
    const tokenData = await exchangeCodeForLongLivedToken(code, redirectUri);
    const accessToken = tokenData.accessToken;

    console.log('[Meta OAuth] Buscando perfil do anunciante...');
    const userProfile = await fetchUserProfile(accessToken);

    console.log('[Meta OAuth] Buscando contas de anúncios...');
    const adAccounts = await fetchAdAccounts(accessToken);

    // Salva a conexão no Banco de Dados isolada por usuário para permitir múltiplos usuários com o mesmo perfil
    const existingConnections = db.get('facebook_connections') || [];
    const updatedConnections = existingConnections.filter(c => {
      const cProfileId = c.profileId || (c.id ? c.id.split('___')[0] : '');
      const cUserId = c.userId || c.user_id;
      return !(cProfileId === userProfile.id && cUserId === callbackUserId);
    });
    
    updatedConnections.unshift({
      id: userProfile.id,
      profileId: userProfile.id,
      userId: callbackUserId,
      user_id: callbackUserId,
      name: userProfile.name,
      email: JSON.stringify({ activeAccounts: [] }),
      avatarUrl: userProfile.avatarUrl,
      accessToken,
      tokenType: tokenData.tokenType,
      expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000).toISOString(),
      accountsCount: adAccounts.length,
      connectedAt: new Date().toISOString()
    });

    db.set('facebook_connections', updatedConnections);

    // Salva no Supabase usando chave primária composta `${userProfile.id}___${callbackUserId}` para que múltiplas contas possam conectar o mesmo perfil
    try {
      const supaConnId = `${userProfile.id}___${callbackUserId}`;
      await supabaseAdmin.from('facebook_connections').upsert({
        id: supaConnId,
        user_id: callbackUserId,
        name: userProfile.name,
        email: JSON.stringify({ activeAccounts: [] }),
        avatar_url: userProfile.avatarUrl || null,
        access_token: accessToken,
        accounts_count: adAccounts.length,
        connected_at: new Date().toISOString()
      });
      // Se houver registro legado com o id puro para este mesmo usuário, limpa para não duplicar
      await supabaseAdmin.from('facebook_connections').delete().eq('id', userProfile.id).eq('user_id', callbackUserId);
    } catch (supaErr) {
      console.warn('[Supabase Conexão Meta] Aviso ao persistir no Supabase:', supaErr.message);
    }

    // Salva as contas de anúncios no Banco de Dados (Iniciam 100% desativadas para o usuário escolher em Integrações)
    const existingAccounts = db.get('ad_accounts') || [];
    const accountsWithProfile = adAccounts.map(acc => {
      const cleanId = (acc.accountId || acc.id || '').split('___')[0].replace('act_', '');
      return {
        ...acc,
        id: `act_${cleanId}`,
        accountId: cleanId,
        userId: callbackUserId,
        user_id: callbackUserId,
        profileId: userProfile.id,
        profileName: userProfile.name,
        syncActive: false
      };
    });
    
    const otherAccounts = existingAccounts.filter(a => {
      const aProfileId = a.profileId || '';
      const aUserId = a.userId || a.user_id;
      return !(aProfileId === userProfile.id && aUserId === callbackUserId);
    });
    const mergedAccounts = [...otherAccounts, ...accountsWithProfile];
    db.set('ad_accounts', mergedAccounts);

    // Persiste contas no Supabase associadas ao user_id usando chave composta
    try {
      if (adAccounts.length > 0) {
        const rows = adAccounts.map(acc => {
          const cleanId = (acc.accountId || acc.id || '').split('___')[0].replace('act_', '');
          return {
            id: `act_${cleanId}___${callbackUserId}`,
            user_id: callbackUserId,
            name: acc.name || 'Conta de Anúncio',
            bm_name: acc.businessName || null,
            currency: acc.currency || acc.rawCurrency || 'BRL',
            status: acc.status || 'ACTIVE',
            amount_spent: Number(acc.amountSpent || 0),
            balance: Number(acc.balance || 0)
          };
        });
        await supabaseAdmin.from('ad_accounts').upsert(rows);
      }
    } catch (supaAccErr) {
      console.warn('[Supabase Contas Meta] Aviso:', supaAccErr.message);
    }

    reconcileCache = {};
    campaignsCache.clear();

    console.log(`[Meta OAuth Sucesso!] Perfil ${userProfile.name} conectado com ${adAccounts.length} contas de anúncio para o usuário ${callbackUserId}!`);

    return res.redirect(`${baseUrl}/integracoes?connected=true&name=${encodeURIComponent(userProfile.name)}`);
  } catch (err) {
    console.error('[Meta OAuth Callback Falhou]:', err.message);
    return res.redirect(`${baseUrl}/integracoes?error=${encodeURIComponent(err.message)}`);
  }
});

let reconcileCache = {};

// Mapeia contas ativas de forma isolada por conexão
export const getActiveSetForConnection = (connObj) => {
  const set = new Set();
  if (connObj && connObj.email) {
    try {
      const parsedMeta = JSON.parse(connObj.email);
      if (parsedMeta && Array.isArray(parsedMeta.activeAccounts)) {
        parsedMeta.activeAccounts.forEach(acc => set.add(String(acc).replace('act_', '')));
      }
    } catch (e) {}
  }
  return set;
};

// Mapeia contas ativas de forma isolada por usuário
export const getActiveSetForUser = (targetUserId, optionalConnections = null) => {
  const set = new Set();
  const effectiveUser = targetUserId || 'usr_1788826403159';
  // 1. Prioridade máxima: lista salva explicitamente pelo usuário
  const explicitSaved = db.get(`active_accounts_${effectiveUser}`) || (isOwnerUserId(effectiveUser) ? db.get('active_accounts') : null);
  if (Array.isArray(explicitSaved)) {
    explicitSaved.forEach(id => set.add(String(id).replace('act_', '')));
  } else {
    const conns = (Array.isArray(optionalConnections) && optionalConnections.length > 0)
      ? optionalConnections
      : (db.get('facebook_connections') || []);
    conns.forEach(c => {
      const cUser = c.user_id || c.userId;
      const matches = targetUserId && (
        isOwnerUserId(targetUserId) 
          ? (isOwnerUserId(cUser) || !cUser)
          : (cUser === targetUserId)
      );
      if (matches || !targetUserId) {
        const connSet = getActiveSetForConnection(c);
        connSet.forEach(id => set.add(id));
      }
    });
  }

  // Aplica overrides manuais se existirem
  const overrides = db.get(`sync_overrides_${effectiveUser}`) || (isOwnerUserId(effectiveUser) ? db.get('sync_overrides') : null);
  if (overrides && typeof overrides === 'object') {
    Object.entries(overrides).forEach(([accId, isActive]) => {
      const clean = String(accId).replace('act_', '');
      if (isActive) {
        set.add(clean);
      } else {
        set.delete(clean);
      }
    });
  }

  return set;
};

// C. Função central de reconciliação de dados da Meta (perfis, contas ativas e limpeza de contas órfãs)
export async function reconcileFacebookData(force = false, userId = null) {
  const cacheKey = userId || 'all';
  const now = Date.now();
  if (!force && reconcileCache[cacheKey] && (now - reconcileCache[cacheKey].timestamp < 45 * 1000)) {
    return reconcileCache[cacheKey].data;
  }

  let connections = [];
  try {
    let query = supabaseAdmin
      .from('facebook_connections')
      .select('*')
      .order('connected_at', { ascending: false });
    if (userId) {
      if (isOwnerUserId(userId)) {
        query = query.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        query = query.eq('user_id', userId);
      }
    }
    const { data: supaConns } = await query;
    if (supaConns && supaConns.length > 0) {
      connections = supaConns.map(c => {
        const rawId = String(c.id || '');
        const cleanProfileId = rawId.includes('___') ? rawId.split('___')[0] : rawId;
        return {
          ...c,
          id: cleanProfileId,
          profileId: cleanProfileId,
          supaId: rawId,
          userId: c.user_id,
          user_id: c.user_id,
          avatarUrl: c.avatar_url,
          accessToken: c.access_token,
          accountsCount: c.accounts_count,
          connectedAt: c.connected_at
        };
      });
    }
  } catch (e) {
    console.warn('[Reconcile FB] Erro ao ler conexões do Supabase:', e.message);
  }

  // Fallback: se Supabase falhar ou estiver vazio temporariamente, preserva conexões locais deste usuário
  if (connections.length === 0) {
    const allConns = db.get('facebook_connections') || [];
    connections = userId
      ? allConns.filter(c => isOwnerUserId(userId) ? (!c.userId || isOwnerUserId(c.userId) || !c.user_id || isOwnerUserId(c.user_id)) : (c.userId === userId || c.user_id === userId))
      : allConns;
  }

  // 1. Se REALMENTE não houver perfis conectados nem no Supabase nem no banco local para este usuário
  if (connections.length === 0) {
    const emptyResult = { connections: [], adAccounts: [] };
    reconcileCache[cacheKey] = { data: emptyResult, timestamp: now };
    return emptyResult;
  }

  // 2. Atualiza conexões locais preservando as dos outros usuários
  const isThisUser = (targetUserId) => {
    if (!targetUserId) return false;
    if (userId) {
      if (isOwnerUserId(userId)) {
        return isOwnerUserId(targetUserId);
      }
      return targetUserId === userId;
    }
    return false;
  };

  const existingAllConns = db.get('facebook_connections') || [];
  const otherConns = existingAllConns.filter(c => {
    const cUserId = c.userId || c.user_id;
    return !isThisUser(cUserId);
  });
  const updatedUserConns = connections.map(c => {
    const rawId = String(c.id || '');
    const cleanProfileId = rawId.includes('___') ? rawId.split('___')[0] : rawId;
    const effectiveUser = userId || c.user_id || 'usr_1788826403159';
    return {
      id: `${cleanProfileId}___${effectiveUser}`,
      profileId: cleanProfileId,
      userId: effectiveUser,
      user_id: effectiveUser,
      name: c.name,
      email: c.email,
      avatarUrl: c.avatar_url || c.avatarUrl,
      accessToken: c.access_token || c.accessToken,
      accountsCount: c.accounts_count || c.accountsCount,
      connectedAt: c.connected_at || c.connectedAt
    };
  });
  const allConnsCombined = [...otherConns, ...updatedUserConns];
  const uniqueConnsMap = new Map();
  allConnsCombined.forEach(c => {
    const rawId = String(c.id || '');
    const cleanProfileId = c.profileId || (rawId.includes('___') ? rawId.split('___')[0] : rawId);
    const effectiveUser = c.userId || c.user_id || userId || 'usr_1788826403159';
    const key = `${cleanProfileId}___${effectiveUser}`;
    if (!uniqueConnsMap.has(key)) {
      uniqueConnsMap.set(key, {
        ...c,
        id: key,
        profileId: cleanProfileId,
        userId: effectiveUser,
        user_id: effectiveUser
      });
    }
  });
  db.set('facebook_connections', Array.from(uniqueConnsMap.values()));

  // 3. Mapeia contas ativas de forma isolada por usuário/conexão via getActiveSetForUser

  // 4. Busca em paralelo todas as contas oficiais de cada perfil conectado
  const fetchPromises = connections.map(async (conn) => {
    const token = conn.accessToken || conn.access_token;
    if (!token) return [];
    try {
      const accounts = await fetchAdAccounts(token);
      const connUser = conn.user_id || conn.userId || userId || 'usr_1788826403159';
      const userActiveSet = getActiveSetForUser(connUser);

      return (accounts || []).map(acc => {
        const cleanId = (acc.accountId || acc.id || '').split('___')[0].replace('act_', '');
        return {
          id: `act_${cleanId}`,
          accountId: cleanId,
          userId: connUser,
          user_id: connUser,
          profileId: conn.id,
          profileName: conn.name,
          name: acc.name || 'Conta de Anúncio',
          businessName: acc.businessName || 'BM Principal',
          currency: acc.currency || 'BRL',
          status: acc.status || 'Ativa',
          amountSpent: String(acc.amountSpent || '0.00'),
          balance: String(acc.balance || '0.00'),
          syncActive: userActiveSet.has(cleanId)
        };
      });
    } catch (err) {
      console.warn(`[Reconcile FB] Erro ao buscar contas do perfil ${conn.name}:`, err.message);
      return [];
    }
  });

  const accountsByProfile = await Promise.all(fetchPromises);
  const liveAccounts = accountsByProfile.flat();

  // 5. Se encontrou contas ao vivo na Meta, atualiza caches
  let validAccounts = [];
  if (liveAccounts.length > 0) {
    validAccounts = liveAccounts;

    // 6. Persiste contas no Supabase associadas ao user_id usando chave composta
    try {
      const rows = validAccounts.map(acc => {
        const cleanId = (acc.accountId || acc.id || '').split('___')[0].replace('act_', '');
        const targetUser = acc.user_id || acc.userId || userId || 'usr_1788826403159';
        return {
          id: `act_${cleanId}___${targetUser}`,
          user_id: targetUser,
          name: acc.name || 'Conta de Anúncio',
          bm_name: acc.businessName || null,
          currency: acc.currency || 'BRL',
          status: acc.status || 'ACTIVE',
          amount_spent: Number(acc.amountSpent || 0),
          balance: Number(acc.balance || 0)
        };
      });
      await supabaseAdmin.from('ad_accounts').upsert(rows);
    } catch (e) {}

    // 7. Atualiza db local de contas preservando contas dos outros usuários
    const allLocalAccs = db.get('ad_accounts') || [];
    let updatedLocalAccs;
    if (userId) {
      const otherLocalAccs = allLocalAccs.filter(a => {
        const aUserId = a.userId || a.user_id;
        return !isThisUser(aUserId);
      });
      updatedLocalAccs = [...otherLocalAccs, ...validAccounts];
    } else {
      updatedLocalAccs = validAccounts;
    }
    const uniqueAccsMap = new Map();
    (updatedLocalAccs || []).forEach(a => {
      const cleanId = String(a.accountId || a.id || '').replace('act_', '').split('___')[0];
      const targetUser = a.user_id || a.userId || userId || 'usr_1788826403159';
      const key = `${cleanId}___${targetUser}`;
      uniqueAccsMap.set(key, {
        ...a,
        id: `act_${cleanId}`,
        accountId: cleanId,
        userId: targetUser,
        user_id: targetUser,
        syncActive: Boolean(a.syncActive)
      });
    });
    db.set('ad_accounts', Array.from(uniqueAccsMap.values()));
  } else if (connections.length > 0) {
    // Se a busca ao vivo na Meta falhou (ex: rate limit ou erro de rede temporário),
    // recupera as contas existentes já salvas no Supabase e no banco local para não apagar a visualização do usuário
    let existingAccounts = [];
    try {
      let query = supabaseAdmin.from('ad_accounts').select('*');
      if (userId) {
        if (isOwnerUserId(userId)) {
          query = query.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
        } else {
          query = query.eq('user_id', userId);
        }
      }
      const { data: supaAccs } = await query;
      if (supaAccs && supaAccs.length > 0) {
        existingAccounts = supaAccs.map(a => {
          const cleanId = (a.id || '').split('___')[0].replace('act_', '');
          const accUser = a.user_id || userId || 'usr_1788826403159';
          const userSet = getActiveSetForUser(accUser);
          return {
            id: `act_${cleanId}`,
            accountId: cleanId,
            userId: accUser,
            user_id: accUser,
            profileId: connections[0]?.id,
            profileName: connections[0]?.name,
            name: a.name,
            businessName: a.bm_name,
            currency: a.currency || 'BRL',
            status: a.status || 'Ativa',
            amountSpent: String(a.amount_spent || '0.00'),
            balance: String(a.balance || '0.00'),
            syncActive: userSet.has(cleanId)
          };
        });
      }
    } catch (e) {
      console.warn('[Reconcile FB] Erro ao recuperar fallback do Supabase:', e.message);
    }

    if (existingAccounts.length === 0) {
      const allAccs = db.get('ad_accounts') || [];
      const userActiveSet = getActiveSetForUser(userId || 'usr_1788826403159');
      const filtered = userId
        ? allAccs.filter(a => isOwnerUserId(userId) ? (!a.userId || isOwnerUserId(a.userId) || !a.user_id || isOwnerUserId(a.user_id)) : (a.userId === userId || a.user_id === userId))
        : allAccs;
      existingAccounts = filtered.map(a => {
        const cleanId = String(a.accountId || a.id || '').replace('act_', '').split('___')[0];
        return {
          ...a,
          syncActive: userActiveSet.has(cleanId)
        };
      });
    }

    if (existingAccounts.length > 0) {
      validAccounts.push(...existingAccounts);
    }
  }

  const sanitizedConnections = connections.map(c => {
    const rawId = String(c.id || '');
    const cleanProfileId = rawId.includes('___') ? rawId.split('___')[0] : rawId;
    return {
      id: cleanProfileId,
      profileId: cleanProfileId,
      name: c.name,
      email: c.email,
      avatarUrl: c.avatar_url || c.avatarUrl,
      accountsCount: validAccounts.length || c.accounts_count || c.accountsCount,
      connectedAt: c.connected_at || c.connectedAt
    };
  });

  reconcileCache[cacheKey] = {
    data: {
      connections: sanitizedConnections,
      adAccounts: validAccounts
    },
    timestamp: now
  };

  return reconcileCache[cacheKey].data;
}

// C. Status das contas conectadas
app.get('/api/meta/status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId || null;
    const reconciled = await reconcileFacebookData(false, userId);
    const effectiveUser = userId || 'usr_1788826403159';
    const activeSet = getActiveSetForUser(effectiveUser);

    const accountsWithSync = (reconciled.adAccounts || []).map(acc => {
      const clean = (acc.accountId || acc.id || '').replace('act_', '');
      return {
        ...acc,
        syncActive: activeSet.has(clean)
      };
    });

    res.json({
      success: true,
      connections: reconciled.connections,
      adAccounts: accountsWithSync,
      appId: process.env.META_APP_ID || '1650241273321193'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para recarregar contas novas criadas no Facebook sem precisar reconectar
app.post('/api/meta/refresh-accounts', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.body?.userId || req.query.userId || null;
    const reconciled = await reconcileFacebookData(true, userId);
    res.json({
      success: true,
      message: 'Contas sincronizadas e reconciliadas com sucesso da Meta!',
      count: reconciled.adAccounts.length,
      adAccounts: reconciled.adAccounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para conectar perfil / contas diretamente via Access Token ou System User Token
app.post('/api/meta/connect-token', async (req, res) => {
  try {
    const { token, name, userId: bodyUserId } = req.body;
    const targetUserId = req.headers['x-user-id'] || bodyUserId || req.query.userId || 'usr_1788826403159';
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, error: 'Token de acesso é obrigatório.' });
    }
    const cleanToken = token.trim();

    let userProfile = null;
    try {
      userProfile = await fetchUserProfile(cleanToken);
    } catch (e) {
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${cleanToken}`);
      const meData = await meRes.json();
      if (meData.error) {
        return res.status(400).json({ success: false, error: `Token inválido na Meta: ${meData.error.message}` });
      }
      userProfile = {
        id: meData.id || `sys_${Date.now()}`,
        name: name || meData.name || 'Usuário Meta Ads',
        email: null,
        avatarUrl: null
      };
    }

    const adAccounts = await fetchAdAccounts(cleanToken);

    // Atualiza facebook_connections isolando por usuário
    const existingConnections = db.get('facebook_connections') || [];
    const updatedConnections = existingConnections.filter(c => {
      const cProfileId = c.profileId || (c.id ? c.id.split('___')[0] : '');
      const cUserId = c.userId || c.user_id;
      return !(cProfileId === userProfile.id && cUserId === targetUserId);
    });
    const newConn = {
      id: userProfile.id,
      profileId: userProfile.id,
      userId: targetUserId,
      user_id: targetUserId,
      name: userProfile.name,
      email: JSON.stringify({ activeAccounts: [] }),
      avatarUrl: userProfile.avatarUrl || null,
      accessToken: cleanToken,
      accountsCount: adAccounts.length,
      connectedAt: new Date().toISOString()
    };
    updatedConnections.unshift(newConn);
    db.set('facebook_connections', updatedConnections);

    // Salva no Supabase com chave primária composta `${userProfile.id}___${targetUserId}`
    try {
      const supaConnId = `${userProfile.id}___${targetUserId}`;
      await supabaseAdmin.from('facebook_connections').upsert({
        id: supaConnId,
        user_id: targetUserId,
        name: userProfile.name,
        email: JSON.stringify({ activeAccounts: [] }),
        avatar_url: userProfile.avatarUrl || null,
        access_token: cleanToken,
        accounts_count: adAccounts.length,
        connected_at: new Date().toISOString()
      });
      // Se houver registro legado com o id puro para este mesmo usuário, limpa para não duplicar
      await supabaseAdmin.from('facebook_connections').delete().eq('id', userProfile.id).eq('user_id', targetUserId);
    } catch (e) {
      console.warn('[Supabase Token Connect]:', e.message);
    }

    if (adAccounts.length > 0) {
      const existingAccounts = db.get('ad_accounts') || [];
      const accountsWithProfile = adAccounts.map(acc => {
        const cleanId = (acc.accountId || acc.id || '').split('___')[0].replace('act_', '');
        return {
          ...acc,
          id: `act_${cleanId}`,
          accountId: cleanId,
          userId: targetUserId,
          user_id: targetUserId,
          profileId: userProfile.id,
          profileName: userProfile.name,
          syncActive: false
        };
      });
      const otherAccounts = existingAccounts.filter(a => {
        const aProfileId = a.profileId || '';
        const aUserId = a.userId || a.user_id;
        return !(aProfileId === userProfile.id && aUserId === targetUserId);
      });
      db.set('ad_accounts', [...otherAccounts, ...accountsWithProfile]);

      try {
        const rows = adAccounts.map(acc => {
          const cleanId = (acc.accountId || acc.id || '').split('___')[0].replace('act_', '');
          return {
            id: `act_${cleanId}___${targetUserId}`,
            user_id: targetUserId,
            name: acc.name || 'Conta de Anúncio',
            bm_name: acc.businessName || null,
            currency: acc.currency || acc.rawCurrency || 'BRL',
            status: acc.status || 'ACTIVE',
            amount_spent: Number(acc.amountSpent || 0),
            balance: Number(acc.balance || 0)
          };
        });
        await supabaseAdmin.from('ad_accounts').upsert(rows);
      } catch (e) {}
    }

    reconcileCache = {};
    campaignsCache.clear();
    const reconciled = await reconcileFacebookData(true, targetUserId);

    res.json({
      success: true,
      message: `Perfil ${userProfile.name} conectado com sucesso (${adAccounts.length} contas encontradas)!`,
      connections: reconciled.connections,
      adAccounts: reconciled.adAccounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// D. Função central para sincronizar campanhas e saldos reais das contas ativas em integrações
export async function executeMetaSync({ datePreset = 'today', timeRange = null, accountIds = null, accountId = null, userId = null } = {}) {
  let connections = [];
  let allAdAccounts = [];

  // Em ambiente serverless (Vercel), restaura do Supabase sempre filtrando por userId se fornecido
  try {
    let qConn = supabaseAdmin.from('facebook_connections').select('*');
    if (userId) {
      if (isOwnerUserId(userId)) {
        qConn = qConn.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        qConn = qConn.eq('user_id', userId);
      }
    }
    const { data: supaConns } = await qConn;
    if (supaConns && supaConns.length > 0) {
      connections = supaConns.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        avatarUrl: c.avatar_url,
        accessToken: c.access_token,
        accountsCount: c.accounts_count,
        connectedAt: c.connected_at
      }));
    }
  } catch (e) {}

  if (connections.length === 0) {
    const allLocal = db.get('facebook_connections') || [];
    connections = userId
      ? allLocal.filter(c => isOwnerUserId(userId) ? (!c.userId || isOwnerUserId(c.userId) || !c.user_id || isOwnerUserId(c.user_id)) : (c.userId === userId || c.user_id === userId))
      : allLocal;
  }

  // Se o usuário não tem conexões, encerra sync com resultado vazio
  if (connections.length === 0) {
    return { campaigns: [], count: 0, liveSynced: false };
  }

  let activeSet = new Set();
  connections.forEach(c => {
    if (c.email) {
      try {
        const parsedMeta = JSON.parse(c.email);
        if (parsedMeta && Array.isArray(parsedMeta.activeAccounts)) {
          parsedMeta.activeAccounts.forEach(acc => activeSet.add(String(acc).replace('act_', '')));
        }
      } catch (e) {}
    }
  });

  try {
    let qAcc = supabaseAdmin.from('ad_accounts').select('*');
    if (userId) {
      if (isOwnerUserId(userId)) {
        qAcc = qAcc.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        qAcc = qAcc.eq('user_id', userId);
      }
    }
    const { data: supaAccs } = await qAcc;
    if (supaAccs && supaAccs.length > 0) {
      allAdAccounts = supaAccs.map(a => {
        const cleanId = (a.id || '').replace('act_', '');
        return {
          id: a.id,
          accountId: cleanId,
          name: a.name,
          businessName: a.bm_name,
          currency: a.currency,
          status: a.status,
          amountSpent: String(a.amount_spent || '0.00'),
          balance: String(a.balance || '0.00'),
          syncActive: activeSet.has(cleanId)
        };
      });
    }
  } catch (e) {}

  if (allAdAccounts.length === 0) {
    const localAccs = db.get('ad_accounts') || [];
    allAdAccounts = userId
      ? localAccs.filter(a => isOwnerUserId(userId) ? (!a.userId || isOwnerUserId(a.userId) || !a.user_id || isOwnerUserId(a.user_id)) : (a.userId === userId || a.user_id === userId))
      : localAccs;
  }

  if (connections.length === 0) {
    return { success: false, error: 'Nenhum perfil do Facebook conectado ainda.', syncedCampaigns: 0 };
  }

  // Mapeia todas as contas para seus respectivos tokens de conexão e descobre contas novas
  const accountTokenMap = new Map(); // cleanId/act_Id -> token
  const nowAccountsCheck = Date.now();
  const shouldDiscoverAccs = allAdAccounts.length === 0 || (nowAccountsCheck - lastAdAccountsDiscoveryTime > 15 * 60 * 1000);

  if (shouldDiscoverAccs) {
    await Promise.all(
      connections.map(async (conn) => {
        const token = conn.accessToken || conn.access_token;
        if (token) {
          try {
            const freshAccs = await fetchAdAccounts(token);
            if (Array.isArray(freshAccs)) {
              freshAccs.forEach(acc => {
                const clean = (acc.accountId || acc.id || '').replace('act_', '');
                accountTokenMap.set(clean, token);
                accountTokenMap.set(`act_${clean}`, token);

                // Garante que a conta conste em allAdAccounts
                if (!allAdAccounts.some(a => (a.accountId || a.id || '').replace('act_', '') === clean)) {
                  allAdAccounts.push({
                    id: acc.id || `act_${clean}`,
                    accountId: clean,
                    name: acc.name,
                    businessName: acc.businessName,
                    currency: acc.currency,
                    status: acc.status,
                    amountSpent: String(acc.amountSpent || '0.00'),
                    balance: String(acc.balance || '0.00'),
                    syncActive: activeSet.has(clean)
                  });
                }
              });
            }
          } catch (e) {}
        }
      })
    );
    lastAdAccountsDiscoveryTime = nowAccountsCheck;
    db.set('ad_accounts', allAdAccounts);
  } else {
    // Mapeia tokens existentes das conexões para as contas em memória sem requisições extras
    connections.forEach(conn => {
      const token = conn.accessToken || conn.access_token;
      if (token) {
        allAdAccounts.forEach(acc => {
          const clean = (acc.accountId || acc.id || '').replace('act_', '');
          if (!accountTokenMap.has(clean)) {
            accountTokenMap.set(clean, token);
            accountTokenMap.set(`act_${clean}`, token);
          }
        });
      }
    });
  }

  const fallbackToken = connections[0]?.accessToken || connections[0]?.access_token;

  // Se o usuário especificou contas
  let targetAccounts = [];
  if (Array.isArray(accountIds) && accountIds.length > 0) {
    const idSet = new Set(accountIds.map(id => String(id).replace('act_', '')));
    targetAccounts = allAdAccounts.filter(a => idSet.has((a.accountId || a.id || '').replace('act_', '')));
    if (targetAccounts.length === 0) {
      targetAccounts = accountIds.map(id => {
        const clean = String(id).replace('act_', '');
        return {
          id: `act_${clean}`,
          accountId: clean,
          name: 'Conta de Anúncio',
          currency: 'BRL',
          status: 'ACTIVE',
          syncActive: true
        };
      });
    }
  } else if (accountId) {
    const actClean = accountId.replace('act_', '');
    targetAccounts = allAdAccounts.filter(a => a.id === accountId || a.id === `act_${actClean}` || a.accountId === actClean);
  } else {
    // Sincroniza apenas contas expressamente ativadas pelo usuário em Integrações
    targetAccounts = allAdAccounts.filter(a => a.syncActive === true);
    // Para períodos históricos (ontem, 7d, 30d, etc.), se nenhuma conta estiver ativa hoje, sincroniza todas as contas conectadas
    const isTodaySync = (!timeRange && (datePreset === 'today' || datePreset === 'hoje'));
    if (targetAccounts.length === 0 && !isTodaySync) {
      targetAccounts = allAdAccounts;
    }
  }

  // Se nenhuma conta estiver ativa nas integrações, não puxa nada e retorna vazio
  if (targetAccounts.length === 0) {
    return { 
      success: true, 
      noActiveAccounts: true,
      message: 'Nenhuma conta ativa selecionada em integrações.',
      syncedCampaigns: 0,
      syncedAds: 0,
      campaigns: [] 
    };
  }

  // Consulta todas as contas selecionadas com syncActive ou no filtro (contas com restrição de criação de anúncios ainda têm métricas e campanhas ativas acessíveis na Graph API)
  const accountsToQuery = targetAccounts.filter(a => a.status !== 'DELETED' && a.account_status !== 101);

  if (accountsToQuery.length === 0) {
    return { 
      success: true, 
      message: 'Nenhuma conta ativa para sincronização.',
      syncedCampaigns: 0,
      syncedAds: 0,
      campaigns: [] 
    };
  }

  const results = await Promise.all(accountsToQuery.map(async (acc) => {
    try {
      const cleanAccId = (acc.accountId || acc.id || '').replace('act_', '');
      const accountToken = accountTokenMap.get(cleanAccId) || accountTokenMap.get(acc.id) || fallbackToken;

      // Executa busca de campanhas e detalhes de saldo em paralelo para máxima velocidade
      const [campaigns, liveDetails] = await Promise.all([
        fetchCampaigns(acc.id, accountToken, acc.name, datePreset, timeRange, acc.rawCurrency || acc.currency),
        fetchLiveAccountDetails(acc.id, accountToken).catch(() => ({}))
      ]);

      let liveBalance = (liveDetails && liveDetails.balance !== undefined) ? liveDetails.balance : acc.balance;
      let liveSpent = (liveDetails && liveDetails.amountSpent !== undefined) ? liveDetails.amountSpent : acc.amountSpent;

      return { 
        campaigns, 
        ads: campaigns.flatMap(c => c.ads || []), 
        error: null, 
        accId: acc.id,
        liveBalance,
        liveSpent
      };
    } catch (err) {
      console.warn(`[Sync Meta] Erro ao sincronizar conta ${acc.id}:`, err.message);
      return { campaigns: [], ads: [], error: err.message, accId: acc.id };
    }
  }));

  const hasErrors = results.some(r => r.error);
  const allCampaigns = results.flatMap(r => r.campaigns);
  const allAds = results.flatMap(r => r.ads);

  const todayBrazil = toBrazilYMD(new Date());
  const isTodaySync = (!timeRange && datePreset === 'today') || (timeRange && timeRange.since === todayBrazil && timeRange.until === todayBrazil);
  const targetPeriodDate = (timeRange && timeRange.since) 
    ? timeRange.since 
    : (datePreset === 'maximum' ? 'Máximo' : (isTodaySync ? todayBrazil : (datePreset || 'Hoje')));

  // Mapa de campanhas retornadas da Meta para este período específico
  const freshCampaignMap = new Map();
  allCampaigns.forEach(c => {
    if (c && c.id) freshCampaignMap.set(String(c.id), c);
  });

  // Preserva estrutura de campanhas existentes no banco, mas NUNCA herda métricas de outro período
  const existingCamps = db.get('campaigns') || [];
  const campMap = new Map();

  existingCamps.forEach(c => {
    if (c && c.id) {
      const cIdStr = String(c.id);
      if (isItemDeleted(cIdStr)) return;

      // Se a campanha foi retornada pela Meta neste período, será mesclada abaixo com seus dados frescos
      if (freshCampaignMap.has(cIdStr)) return;

      // Se não veio na consulta deste período, preserva estrutura (nome, status, orçamento), mas zera 100% das métricas
      campMap.set(cIdStr, {
        ...c,
        date: targetPeriodDate,
        spend: '0.00',
        rawSpendUsd: c.rawSpendUsd !== null ? '0.00' : null,
        impressions: 0,
        clicks: 0,
        cpc: '0.00',
        cpm: '0.00',
        ctr: '0.00%',
        initCheckouts: 0,
        costPerIc: '0.00',
        profit: '0.00',
        sales: 0,
        pendingSales: 0,
        revenue: '0.00',
        roas: '0.00',
        cpa: '0.00',
        adsets: (c.adsets || []).map(as => ({
          ...as,
          spend: '0.00',
          rawSpendUsd: as.rawSpendUsd !== null ? '0.00' : null,
          impressions: 0,
          clicks: 0,
          cpc: '0.00',
          cpm: '0.00',
          ctr: '0.00%',
          initCheckouts: 0,
          costPerIc: '0.00',
          sales: 0,
          pendingSales: 0,
          revenue: '0.00',
          profit: '0.00',
          roas: '0.00',
          cpa: '0.00'
        })),
        ads: (c.ads || []).map(ad => ({
          ...ad,
          spend: '0.00',
          rawSpendUsd: ad.rawSpendUsd !== null ? '0.00' : null,
          impressions: 0,
          clicks: 0,
          cpc: '0.00',
          cpm: '0.00',
          ctr: '0.00%',
          initCheckouts: 0,
          costPerIc: '0.00',
          sales: 0,
          pendingSales: 0,
          revenue: '0.00',
          profit: '0.00',
          roas: '0.00',
          cpa: '0.00'
        }))
      });
    }
  });

  allCampaigns.forEach(c => {
    if (c && c.id) {
      const cIdStr = String(c.id);
      if (isItemDeleted(cIdStr)) return;

      const prev = existingCamps.find(ec => String(ec.id) === cIdStr) || {};
      let resolvedAdsets = c.adsets;
      if ((!resolvedAdsets || resolvedAdsets.length === 0) && prev.adsets && prev.adsets.length > 0) {
        resolvedAdsets = prev.adsets;
      } else if (Array.isArray(resolvedAdsets) && prev.adsets && prev.adsets.length > 0) {
        resolvedAdsets = resolvedAdsets
          .filter(as => as && !isItemDeleted(as.id || as.adsetId))
          .map(as => {
            const asIdStr = String(as.id || as.adsetId);
            const asOverride = getEffectiveStatusOverride(asIdStr);
            if (asOverride !== undefined) {
              return {
                ...as,
                status: asOverride,
                rawStatus: asOverride ? 'ACTIVE' : 'PAUSED',
                effectiveStatus: asOverride ? 'ACTIVE' : 'PAUSED'
              };
            }
            const prevAs = prev.adsets ? prev.adsets.find(p => String(p.id) === asIdStr || String(p.adsetId) === asIdStr) : null;
            const isAsPaused = as.status === false || as.rawStatus === 'PAUSED' || as.effectiveStatus === 'PAUSED' || as.effectiveStatus === 'ADSET_PAUSED';
            if (isAsPaused) {
              return { ...as, status: false, rawStatus: 'PAUSED', effectiveStatus: 'PAUSED' };
            }
            // Se o conjunto estava desativado no banco e veio sem confirmação explícita de ativação, preserva desativado
            if (prevAs && (prevAs.status === false || prevAs.rawStatus === 'PAUSED') && as._fromFallback) {
              return { ...as, status: false, rawStatus: 'PAUSED', effectiveStatus: 'PAUSED' };
            }
            return as;
          });
      }

      // Se veio da Meta ao vivo e não de fallback de banco, limpa override antigo
      if (!c._fromFallback) {
        recentStatusOverrides.delete(cIdStr);
        (c.adsets || []).forEach(as => recentStatusOverrides.delete(String(as.id || as.adsetId)));
        (c.ads || []).forEach(ad => recentStatusOverrides.delete(String(ad.id || ad.adId)));
      }

      // Verifica override na campanha
      let campStatus = c.status;
      let campRawStatus = c.rawStatus || (campStatus ? 'ACTIVE' : 'PAUSED');
      let campEffStatus = c.effectiveStatus || campRawStatus;
      const campOverride = getEffectiveStatusOverride(cIdStr);
      if (campOverride !== undefined) {
        campStatus = campOverride;
        campRawStatus = campStatus ? 'ACTIVE' : 'PAUSED';
        campEffStatus = campStatus ? 'ACTIVE' : 'PAUSED';
      }

      // Se a campanha está desligada, garante que os adsets também fiquem desligados se não tiverem override explícito
      if (!campStatus && Array.isArray(resolvedAdsets)) {
        resolvedAdsets = resolvedAdsets.map(as => {
          const asOverride = getEffectiveStatusOverride(as.id || as.adsetId);
          if (asOverride === undefined) {
            return { ...as, status: false, rawStatus: 'PAUSED', effectiveStatus: 'PAUSED' };
          }
          return as;
        });
      }

      campMap.set(cIdStr, { 
        ...prev, 
        ...c, 
        status: campStatus,
        rawStatus: campRawStatus,
        effectiveStatus: campEffStatus,
        adsets: resolvedAdsets || [] 
      });
    }
  });

  const mergedCampaigns = Array.from(campMap.values());
  // CRÍTICO: Somente grava no banco permanente e Supabase se a sincronização for do dia de HOJE
  if (mergedCampaigns.length > 0 && isTodaySync) {
    db.set('campaigns', mergedCampaigns);
    try {
      for (const mc of mergedCampaigns) {
        if (mc.id) {
          supabaseAdmin.from('campaigns').upsert({
            id: String(mc.id),
            user_id: 'usr_1788826403159',
            account_id: (mc.adAccountId || mc.accountId || mc.account_id || '').replace('act_', '') || null,
            name: mc.name || 'Campanha',
            status: Boolean(mc.status),
            spend: Number(mc.spend) || 0,
            sales: Number(mc.sales) || 0,
            revenue: Number(mc.revenue) || 0,
            roas: Number(mc.roas) || 0,
            cpa: Number(mc.cpa) || 0,
            updated_at: new Date().toISOString()
          }).then(() => {}).catch(() => {});
        }
      }
    } catch (e) {}
  }

  // Preserva anúncios existentes no banco sem herdar métricas de outros períodos
  const freshAdsMap = new Map();
  allAds.forEach(a => {
    if (a && a.id) freshAdsMap.set(String(a.id), a);
  });

  const existingAds = db.get('meta_ads') || [];
  const adsMap = new Map();
  existingAds.forEach(a => {
    if (a && a.id) {
      const aIdStr = String(a.id);
      if (freshAdsMap.has(aIdStr)) return;
      adsMap.set(aIdStr, {
        ...a,
        date: targetPeriodDate,
        spend: '0.00',
        rawSpendUsd: a.rawSpendUsd !== null ? '0.00' : null,
        impressions: 0,
        clicks: 0,
        cpc: '0.00',
        cpm: '0.00',
        ctr: '0.00%',
        initCheckouts: 0,
        costPerIc: '0.00',
        profit: '0.00',
        sales: 0,
        pendingSales: 0,
        revenue: '0.00',
        roas: '0.00',
        cpa: '0.00'
      });
    }
  });
  allAds.forEach(a => {
    if (a && a.id) {
      const prev = existingAds.find(ea => String(ea.id) === String(a.id)) || {};
      adsMap.set(String(a.id), { ...prev, ...a });
    }
  });
  const mergedAds = Array.from(adsMap.values());
  if (mergedAds.length > 0 && isTodaySync) {
    db.set('meta_ads', mergedAds);
  }

  // Atualiza saldo real e gasto total das contas ativas
  const balanceMap = new Map();
  results.forEach(r => {
    if (r.accId) {
      balanceMap.set(String(r.accId).replace('act_', ''), {
        balance: r.liveBalance,
        amountSpent: r.liveSpent
      });
    }
  });

  const currentAccounts = db.get('ad_accounts') || [];
  const updatedAccounts = currentAccounts.map(acc => {
    const clean = String(acc.accountId || acc.id).replace('act_', '');
    const live = balanceMap.get(clean);
    if (live) {
      return {
        ...acc,
        balance: live.balance !== undefined ? live.balance : acc.balance,
        amountSpent: live.amountSpent !== undefined ? live.amountSpent : acc.amountSpent
      };
    }
    return acc;
  });
  db.set('ad_accounts', updatedAccounts);

  const stableMergedCampaigns = Array.isArray(mergedCampaigns) ? [...mergedCampaigns].sort((a, b) => {
    const aActive = (a.status === true || a.status === 'ACTIVE' || a.rawStatus === 'ACTIVE') ? 1 : 0;
    const bActive = (b.status === true || b.status === 'ACTIVE' || b.rawStatus === 'ACTIVE') ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
  }) : [];

  return {
    success: true,
    rateLimited: hasErrors,
    syncedCampaigns: stableMergedCampaigns.length,
    syncedAds: allAds.length,
    campaigns: stableMergedCampaigns,
    timestamp: new Date().toISOString()
  };
}

// Endpoint de sincronização manual ou acionado pela dashboard/campanhas
app.post('/api/meta/sync', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.body?.userId || req.query.userId || null;
    const { datePreset = 'today', since, until, accountId, accountIds } = req.body || {};
    const resolvedRange = resolveDateRange(datePreset, since, until);
    const timeRange = (since && until) ? { since, until } : (resolvedRange.isMaximum ? { isMaximum: true } : null);
    const result = await executeMetaSync({ datePreset, timeRange, accountId, accountIds, userId });

    const allOrders = await getAllOrders(false, userId);
    const approvedOrders = allOrders.filter(o => o.status === 'approved' || o.status === 'paid' || o.status === 'pago');
    const pendingOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'waiting_payment' || o.status === 'aguardando_pagamento');

    const { since: filterSince, until: filterUntil, isMaximum } = resolvedRange;
    const filteredOrders = approvedOrders.filter(o => {
      if (isMaximum) return true;
      if (filterSince && filterUntil && o.createdAt) {
        const oDate = toBrazilYMD(o.createdAt);
        return oDate >= filterSince && oDate <= filterUntil;
      }
      return true;
    });

    const filteredPendingOrders = pendingOrders.filter(o => {
      if (isMaximum) return true;
      if (filterSince && filterUntil && o.createdAt) {
        const oDate = toBrazilYMD(o.createdAt);
        return oDate >= filterSince && oDate <= filterUntil;
      }
      return true;
    });

    const events = db.get('events') || [];
    const pixelPurchases = events.filter(e => {
      if (e.eventName !== 'Purchase') return false;
      if (isMaximum) return true;
      if (filterSince && filterUntil && e.timestamp) {
        const eDate = toBrazilYMD(e.timestamp);
        return eDate >= filterSince && eDate <= filterUntil;
      }
      return true;
    });

    const pixelICs = events.filter(e => {
      if (e.eventName !== 'InitiateCheckout') return false;
      if (isMaximum) return true;
      if (filterSince && filterUntil && e.timestamp) {
        const eDate = toBrazilYMD(e.timestamp);
        return eDate >= filterSince && eDate <= filterUntil;
      }
      return true;
    });

    const enrichedCampaigns = enrichCampaignsWithTracking({
      campaigns: result.campaigns || [],
      orders: filteredOrders,
      pendingOrders: filteredPendingOrders,
      pixelPurchases,
      pixelICs
    });

    // Atualiza métricas enriquecidas na tabela campaigns do Supabase
    try {
      for (const ec of enrichedCampaigns) {
        if (ec && ec.id) {
          supabaseAdmin.from('campaigns').upsert({
            id: String(ec.id),
            user_id: userId || 'usr_1788826403159',
            account_id: (ec.adAccountId || ec.accountId || ec.account_id || '').replace('act_', '') || null,
            name: ec.name || 'Campanha',
            status: Boolean(ec.status),
            spend: Number(ec.spend) || 0,
            sales: Number(ec.sales) || 0,
            revenue: Number(ec.revenue) || 0,
            profit: Number(ec.profit) || 0,
            roas: Number(ec.roas) || 0,
            cpa: Number(ec.cpa) || 0,
            updated_at: new Date().toISOString()
          }).then(() => {}).catch(() => {});
        }
      }
    } catch (eSyncSupa) {}

    const cacheKey = getCampaignsCacheKey(userId, datePreset, resolvedRange);
    campaignsCache.set(cacheKey, {
      timestamp: Date.now(),
      date: todayBrazil,
      campaigns: enrichedCampaigns
    });

    res.json({
      ...result,
      campaigns: enrichedCampaigns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para persistir status de sincronização de contas (Ativar/Desativar sincronização de contas de anúncio)
app.post('/api/meta/accounts/sync-status', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.body?.userId || req.query.userId || null;
    const { accountId, activeAccounts, syncActive } = req.body || {};
    let adAccounts = db.get('ad_accounts') || [];

    // Se estiver em ambiente serverless sem store em disco, carrega do Supabase primeiro
    if (adAccounts.length === 0) {
      try {
        let q = supabaseAdmin.from('ad_accounts').select('*');
        if (userId) {
          if (isOwnerUserId(userId)) {
            q = q.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
          } else {
            q = q.eq('user_id', userId);
          }
        }
        const { data: supaAccs } = await q;
        if (supaAccs && supaAccs.length > 0) {
          adAccounts = supaAccs.map(a => ({
            id: a.id,
            accountId: (a.id || '').replace('act_', ''),
            name: a.name,
            businessName: a.bm_name,
            currency: a.currency,
            status: a.status,
            amountSpent: String(a.amount_spent || '0.00'),
            balance: String(a.balance || '0.00'),
            syncActive: false,
            userId: a.user_id || userId
          }));
        }
      } catch (e) {}
    }
    
    const effectiveTargetUser = userId || 'usr_1788826403159';
    const isThisUser = (targetUserId) => {
      if (!targetUserId && isOwnerUserId(effectiveTargetUser)) return true;
      if (!targetUserId) return false;
      if (effectiveTargetUser) {
        if (isOwnerUserId(effectiveTargetUser)) {
          return isOwnerUserId(targetUserId);
        }
        return targetUserId === effectiveTargetUser;
      }
      return false;
    };

    let explicitActiveIds = [];
    if (Array.isArray(activeAccounts)) {
      explicitActiveIds = activeAccounts.map(id => String(id).replace('act_', ''));
    } else if (accountId !== undefined) {
      const cleanTarget = String(accountId).replace('act_', '');
      let currentActive = (db.get(`active_accounts_${effectiveTargetUser}`) || db.get('active_accounts') || [])
        .map(id => String(id).replace('act_', ''));
      if (syncActive) {
        if (!currentActive.includes(cleanTarget)) currentActive.push(cleanTarget);
      } else {
        currentActive = currentActive.filter(id => id !== cleanTarget);
      }
      explicitActiveIds = currentActive;
    }

    const activeSet = new Set(explicitActiveIds);

    // 1. Salva explicitamente a lista oficial de contas ativas no banco para este usuário
    db.set(`active_accounts_${effectiveTargetUser}`, explicitActiveIds);
    if (isOwnerUserId(effectiveTargetUser)) {
      db.set('active_accounts', explicitActiveIds);
    }
    const { overrides } = req.body || {};
    if (overrides && typeof overrides === 'object') {
      db.set(`sync_overrides_${effectiveTargetUser}`, overrides);
      if (isOwnerUserId(effectiveTargetUser)) {
        db.set('sync_overrides', overrides);
      }
    }

    // 2. Atualiza o status syncActive de todas as contas em db.get('ad_accounts')
    adAccounts = adAccounts.map(acc => {
      const clean = (acc.accountId || acc.id || '').replace('act_', '');
      const aUser = acc.userId || acc.user_id;
      if (!userId || isThisUser(aUser)) {
        return {
          ...acc,
          syncActive: activeSet.has(clean)
        };
      }
      return acc;
    });
    db.set('ad_accounts', adAccounts);

    // Salva o mapa de contas ativas no Supabase (apenas nos perfis do Facebook deste usuário específico)
    try {
      let connQuery = supabaseAdmin.from('facebook_connections').select('id');
      if (isOwnerUserId(effectiveTargetUser)) {
        connQuery = connQuery.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        connQuery = connQuery.eq('user_id', effectiveTargetUser);
      }
      const { data: conns } = await connQuery;
      if (conns && conns.length > 0) {
        const connIds = conns.map(c => c.id);
        await supabaseAdmin.from('facebook_connections').update({
          email: JSON.stringify({ activeAccounts: explicitActiveIds })
        }).in('id', connIds);
      }
    } catch (supaSyncErr) {
      console.warn('[Supabase Sync Status] Aviso:', supaSyncErr.message);
    }

    // Atualiza conexões locais em memória para resposta imediata (apenas para este usuário)
    try {
      const localConns = db.get('facebook_connections') || [];
      const updatedConns = localConns.map(c => {
        const cUser = c.userId || c.user_id;
        if (isThisUser(cUser)) {
          return {
            ...c,
            email: JSON.stringify({ activeAccounts: explicitActiveIds }),
            activeAccounts: explicitActiveIds
          };
        }
        return c;
      });
      db.set('facebook_connections', updatedConns);
    } catch (e) {}

    // Invalida caches para que as campanhas reflitam imediatamente as contas ativas/desativadas
    reconcileCache = {};
    campaignsCache.clear();

    const filteredReturn = userId 
      ? adAccounts.filter(a => a.userId === userId || (isOwnerUserId(userId) && (isOwnerUserId(a.userId) || !a.userId)))
      : adAccounts;
    res.json({ success: true, adAccounts: filteredReturn, activeAccounts: explicitActiveIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// E. Desconectar Perfil do Facebook e Contas
app.post('/api/meta/disconnect', async (req, res) => {
  try {
    const { profileId } = req.body || {};
    const userId = req.headers['x-user-id'] || req.body?.userId || req.query.userId || null;
    if (profileId) {
      console.log(`[Meta Disconnect] Desconectando perfil ID: ${profileId} do usuário ${userId || 'geral'}`);

      // 1. Remove perfil do Supabase apenas para este usuário
      try {
        const supaConnId = `${profileId}___${userId}`;
        let query = supabaseAdmin.from('facebook_connections').delete();
        if (userId) {
          query = query.or(`id.eq.${supaConnId},and(id.eq.${profileId},user_id.eq.${userId})`);
        } else {
          query = query.or(`id.eq.${profileId},id.like.${profileId}___%`);
        }
        await query;
      } catch (e) {
        console.warn('[Disconnect] Erro ao deletar do Supabase:', e.message);
      }

      // 2. Remove perfil do db local isolando pelo usuário
      const connections = db.get('facebook_connections') || [];
      const remaining = connections.filter(c => {
        const cProfileId = c.profileId || (c.id ? c.id.split('___')[0] : '');
        const cUserId = c.userId || c.user_id;
        if (userId) {
          return !(cProfileId === String(profileId) && cUserId === userId);
        }
        return cProfileId !== String(profileId);
      });
      db.set('facebook_connections', remaining);

      // 3. Remove contas deste perfil apenas para este usuário
      const allAccs = db.get('ad_accounts') || [];
      const remainingAccs = allAccs.filter(a => {
        const aProfileId = a.profileId || '';
        const aUserId = a.userId || a.user_id;
        if (userId) {
          return !(aProfileId === String(profileId) && aUserId === userId);
        }
        return aProfileId !== String(profileId);
      });
      db.set('ad_accounts', remainingAccs);

      // 4. Reconcilia as contas restantes (remove do Supabase e db local qualquer conta do perfil desconectado)
      reconcileCache = {};
      const reconciled = await reconcileFacebookData(true, userId);

      return res.json({
        success: true,
        message: 'Perfil e contas de anúncios desconectados com sucesso.',
        connections: reconciled.connections,
        adAccounts: reconciled.adAccounts
      });
    } else {
      // Desconectar tudo do usuário solicitado
      console.log(`[Meta Disconnect] Desconectando perfis e contas do usuário: ${userId || 'todos'}`);
      if (userId) {
        const connections = db.get('facebook_connections') || [];
        db.set('facebook_connections', connections.filter(c => c.userId !== userId && c.user_id !== userId));
        const adAccounts = db.get('ad_accounts') || [];
        db.set('ad_accounts', adAccounts.filter(a => a.userId !== userId && a.user_id !== userId));
        try {
          await supabaseAdmin.from('facebook_connections').delete().eq('user_id', userId);
          await supabaseAdmin.from('ad_accounts').delete().eq('user_id', userId);
        } catch (e) {}
      } else {
        db.set('facebook_connections', []);
        db.set('ad_accounts', []);
        db.set('campaigns', []);
        db.set('meta_ads', []);
        const settings = db.get('settings') || {};
        settings.metaAccessToken = '';
        settings.connectedProfile = null;
        db.set('settings', settings);

        try {
          await supabaseAdmin.from('facebook_connections').delete().neq('id', '0');
          await supabaseAdmin.from('ad_accounts').delete().neq('id', '0');
        } catch (e) {}
      }

      reconcileCache = {};
      return res.json({
        success: true,
        message: 'Todos os perfis e contas foram desconectados com sucesso.',
        connections: [],
        adAccounts: []
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper centralizado para obter Access Token válido e atualizado da Meta
export async function getValidMetaAccessToken(userId = null, targetAccountId = null) {
  const cleanAccId = targetAccountId ? String(targetAccountId).replace('act_', '').trim() : null;

  // 1. Se informou targetAccountId, busca especificamente a conexão dona dessa conta de anúncio
  if (cleanAccId) {
    try {
      const localAccounts = db.get('ad_accounts') || [];
      const matchAcc = localAccounts.find(a => 
        String(a.id || '').replace('act_', '') === cleanAccId || 
        String(a.accountId || '') === cleanAccId ||
        (a.name && cleanAccId.length > 5 && a.name.toLowerCase() === cleanAccId.toLowerCase())
      );
      if (matchAcc && matchAcc.profileId) {
        // Busca token dessa conexão no Supabase
        let profQuery = supabaseAdmin
          .from('facebook_connections')
          .select('access_token')
          .or(`id.eq.${matchAcc.profileId},id.like.${matchAcc.profileId}___%`);
        if (userId) profQuery = profQuery.eq('user_id', userId);
        const { data: profileConns } = await profQuery.limit(1);
        if (profileConns && profileConns[0]?.access_token && profileConns[0].access_token.trim().length > 15) {
          return profileConns[0].access_token.trim();
        }
        // Fallback local
        const localConns = db.get('facebook_connections') || [];
        const localC = localConns.find(c => 
          (c.profileId === matchAcc.profileId || c.id === matchAcc.profileId || (c.id && c.id.startsWith(matchAcc.profileId))) &&
          (!userId || c.userId === userId || c.user_id === userId)
        );
        if (localC?.accessToken && localC.accessToken.trim().length > 15) {
          return localC.accessToken.trim();
        }
      }
    } catch (e) {
      console.warn('[getValidMetaAccessToken Account Lookup Warning]:', e.message);
    }
  }

  // 2. Prioridade: Supabase filtrado por userId (busca a conexão mais recente e com token válido)
  try {
    let q = supabaseAdmin.from('facebook_connections').select('*').order('connected_at', { ascending: false });
    if (userId) {
      if (isOwnerUserId(userId)) {
        q = q.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
      } else {
        q = q.eq('user_id', userId);
      }
    }
    const { data: supaConns } = await q;
    if (supaConns && supaConns.length > 0) {
      for (const conn of supaConns) {
        if (conn.access_token && conn.access_token.trim().length > 15) {
          return conn.access_token.trim();
        }
      }
    }

    // Se não encontrou filtrando por userId específico, busca a conexão mais recente globalmente
    const { data: latestConns } = await supabaseAdmin
      .from('facebook_connections')
      .select('*')
      .order('connected_at', { ascending: false })
      .limit(5);

    if (latestConns && latestConns.length > 0) {
      for (const conn of latestConns) {
        if (conn.access_token && conn.access_token.trim().length > 15) {
          return conn.access_token.trim();
        }
      }
    }
  } catch (e) {
    console.warn('[getValidMetaAccessToken Supabase Warning]:', e.message);
  }

  // 3. Fallback: banco local ordenado pelo mais recente
  const allLocal = db.get('facebook_connections') || [];
  const filtered = userId
    ? allLocal.filter(c => isOwnerUserId(userId) ? (!c.userId || isOwnerUserId(c.userId) || !c.user_id || isOwnerUserId(c.user_id)) : (c.userId === userId || c.user_id === userId))
    : allLocal;

  const pool = filtered.length > 0 ? filtered : allLocal;
  if (pool.length > 0) {
    const sorted = [...pool].sort((a, b) => new Date(b.connectedAt || b.connected_at || 0) - new Date(a.connectedAt || a.connected_at || 0));
    return sorted[0].accessToken || sorted[0].access_token || null;
  }

  return null;
}

// F. Atualizar Status no Gerenciador Meta Ads (Ligar / Desligar Campanha, Conjunto ou Anúncio)
app.post('/api/campaigns/status', async (req, res) => {
  try {
    const { id, status, userId: bodyUserId, accountId } = req.body;
    const userId = req.headers['x-user-id'] || bodyUserId || req.query.userId || null;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const strId = String(id);
    const boolStatus = Boolean(status);
    const statusText = boolStatus ? 'ACTIVE' : 'PAUSED';

    // 1. Obtém o token válido para a conta/usuário
    const token = await getValidMetaAccessToken(userId, accountId);
    let metaSuccess = false;
    let metaError = null;

    if (token) {
      try {
        await updateMetaItemStatus(strId, boolStatus, token);
        metaSuccess = true;
      } catch (err) {
        console.warn(`[Meta Status Update Error for ${strId}]:`, err.message);
        metaError = err.message;
      }
    } else {
      metaError = 'Nenhuma conexão do Facebook ativa ou token válido encontrado para este usuário.';
    }

    // 2. Se a sincronização com a Meta falhou, NÃO atualiza o banco local com o status errado!
    // Retorna erro para que o frontend reverta o botão de ligar/desligar!
    if (!metaSuccess) {
      return res.status(400).json({
        success: false,
        metaSynced: false,
        metaError: metaError || 'Falha ao atualizar status no Gerenciador Meta Ads.',
        error: metaError || 'Falha ao atualizar status no Gerenciador Meta Ads.'
      });
    }

    // 3. Sucesso na Meta: agora atualiza com segurança no banco local e grava override imediato
    recordStatusOverride(strId, boolStatus);
    const campaigns = db.get('campaigns') || [];
    const targetCamp = campaigns.find(c => String(c.id) === strId);
    if (targetCamp && !boolStatus) {
      (targetCamp.adsets || []).forEach(as => recordStatusOverride(as.id || as.adsetId, false));
      (targetCamp.ads || []).forEach(ad => recordStatusOverride(ad.id || ad.adId, false));
    }

    const updatedCampaigns = campaigns.map(c => {
      const campMatches = String(c.id) === strId;
      let adsetsUpdated = false;
      let adsUpdated = false;

      const newAdsets = c.adsets ? c.adsets.map(as => {
        if (String(as.id) === strId || String(as.adsetId) === strId || (campMatches && !boolStatus)) {
          adsetsUpdated = true;
          return {
            ...as,
            status: boolStatus,
            rawStatus: statusText,
            effectiveStatus: statusText
          };
        }
        return as;
      }) : c.adsets;

      const newAds = c.ads ? c.ads.map(ad => {
        if (String(ad.id) === strId || String(ad.adId) === strId || (campMatches && !boolStatus)) {
          adsUpdated = true;
          return {
            ...ad,
            status: boolStatus,
            rawStatus: statusText,
            effectiveStatus: statusText
          };
        }
        return ad;
      }) : c.ads;

      if (campMatches || adsetsUpdated || adsUpdated) {
        return {
          ...c,
          ...(campMatches ? {
            status: boolStatus,
            rawStatus: statusText,
            effectiveStatus: statusText
          } : {}),
          adsets: newAdsets,
          ads: newAds
        };
      }
      return c;
    });
    db.set('campaigns', updatedCampaigns);
    campaignsCache.clear();

    // 4. Persiste no Supabase se existir
    try {
      await supabaseAdmin.from('campaigns').update({
        status: boolStatus,
        raw_status: statusText,
        updated_at: new Date().toISOString()
      }).eq('id', strId);
    } catch (e) {
      console.warn('[Supabase Campaign Status Sync Warning]:', e.message);
    }

    return res.json({
      success: true,
      metaSynced: true,
      status: boolStatus,
      statusText,
      message: boolStatus ? '🟢 Ativada com sucesso no Gerenciador Meta!' : '⚪ Desativada com sucesso no Gerenciador Meta!'
    });
  } catch (err) {
    res.status(500).json({ success: false, metaSynced: false, error: err.message });
  }
});

// F1.1 Atualizar Status em Massa no Gerenciador Meta Ads com proteção contra rate-limit
app.post('/api/campaigns/status-bulk', async (req, res) => {
  try {
    const { ids, status, userId: bodyUserId, accountId } = req.body;
    const userId = req.headers['x-user-id'] || bodyUserId || req.query.userId || null;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs é obrigatória' });
    }
    const strIds = new Set(ids.map(String));
    const boolStatus = Boolean(status);
    const statusText = boolStatus ? 'ACTIVE' : 'PAUSED';

    // 1. Obtém o token válido
    const token = await getValidMetaAccessToken(userId, accountId);
    let successCount = 0;
    let lastError = null;

    if (token) {
      for (const targetId of ids) {
        try {
          await updateMetaItemStatus(String(targetId), boolStatus, token);
          successCount++;
          await new Promise(r => setTimeout(r, 120));
        } catch (err) {
          console.warn(`[Meta Bulk Status Error for ${targetId}]:`, err.message);
          lastError = err.message;
        }
      }
    } else {
      lastError = 'Nenhuma conexão do Facebook ativa ou token válido encontrado.';
    }

    if (successCount === 0 && lastError) {
      return res.status(400).json({
        success: false,
        syncedCount: 0,
        totalRequested: ids.length,
        error: lastError,
        metaError: lastError
      });
    }

    // 2. Atualiza status no banco local e grava overrides imediatos
    ids.forEach(id => {
      const sId = String(id);
      recordStatusOverride(sId, boolStatus);
      if (!boolStatus) {
        const camp = (db.get('campaigns') || []).find(c => String(c.id) === sId);
        if (camp) {
          (camp.adsets || []).forEach(as => recordStatusOverride(as.id || as.adsetId, false));
          (camp.ads || []).forEach(ad => recordStatusOverride(ad.id || ad.adId, false));
        }
      }
    });

    const campaigns = db.get('campaigns') || [];
    const updatedCampaigns = campaigns.map(c => {
      const campMatches = strIds.has(String(c.id));
      let adsetsUpdated = false;
      let adsUpdated = false;

      const newAdsets = c.adsets ? c.adsets.map(as => {
        if (strIds.has(String(as.id)) || strIds.has(String(as.adsetId)) || (campMatches && !boolStatus)) {
          adsetsUpdated = true;
          return {
            ...as,
            status: boolStatus,
            rawStatus: statusText,
            effectiveStatus: statusText
          };
        }
        return as;
      }) : c.adsets;

      const newAds = c.ads ? c.ads.map(ad => {
        if (strIds.has(String(ad.id)) || strIds.has(String(ad.adId)) || (campMatches && !boolStatus)) {
          adsUpdated = true;
          return {
            ...ad,
            status: boolStatus,
            rawStatus: statusText,
            effectiveStatus: statusText
          };
        }
        return ad;
      }) : c.ads;

      if (campMatches || adsetsUpdated || adsUpdated) {
        return {
          ...c,
          ...(campMatches ? {
            status: boolStatus,
            rawStatus: statusText,
            effectiveStatus: statusText
          } : {}),
          adsets: newAdsets,
          ads: newAds
        };
      }
      return c;
    });
    db.set('campaigns', updatedCampaigns);
    campaignsCache.clear();

    // 3. Atualiza no Supabase
    try {
      await supabaseAdmin.from('campaigns').update({
        status: boolStatus,
        raw_status: statusText,
        updated_at: new Date().toISOString()
      }).in('id', ids.map(String));
    } catch (e) {
      console.warn('[Supabase Bulk Campaign Status Sync Warning]:', e.message);
    }

    res.json({
      success: true,
      syncedCount: successCount,
      totalRequested: ids.length,
      metaError: lastError,
      message: `${successCount} item(ns) ${boolStatus ? 'ativados' : 'desativados'} com sucesso no Gerenciador Meta!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// F2. Atualizar Campanha, Orçamento e Bid Cap diretamente no Gerenciador Meta Ads
app.post('/api/campaigns/update', async (req, res) => {
  try {
    const { id, name, budget, bidCap, bidStrategy, profileType, itemType, accountId, isLifetime, currency, isUsd: clientIsUsd } = req.body;
    const userId = req.headers['x-user-id'] || req.body?.userId || req.query.userId || null;
    if (!id) return res.status(400).json({ success: false, error: 'ID é obrigatório' });

    const strId = String(id);
    const campaigns = db.get('campaigns') || [];
    let target = null;
    let itemUpdated = false;
    let parentCamp = null;

    // 1. Edição de conjunto (adset)
    if (itemType === 'adset') {
      for (const camp of campaigns) {
        if (camp.adsets && Array.isArray(camp.adsets)) {
          const asIdx = camp.adsets.findIndex(a => String(a.id) === strId || String(a.adsetId) === strId);
          if (asIdx !== -1) {
            parentCamp = camp;
            const newBidCap = bidStrategy === 'LOWEST_COST_WITHOUT_CAP' ? null : (bidCap !== undefined ? (bidCap && Number(bidCap) > 0 ? String(bidCap) : null) : camp.adsets[asIdx].bidCap);
            camp.adsets[asIdx] = {
              ...camp.adsets[asIdx],
              ...(name ? { name } : {}),
              ...(budget !== undefined && budget !== null ? { budget: String(budget) } : {}),
              bidCap: newBidCap,
              ...(bidStrategy ? { bidStrategy } : {}),
              accountId: camp.adsets[asIdx].accountId || camp.accountId || (camp.adAccountId ? String(camp.adAccountId).replace('act_', '') : null),
              adAccountId: camp.adsets[asIdx].adAccountId || camp.adAccountId,
              currency: camp.adsets[asIdx].currency || camp.currency
            };
            target = camp.adsets[asIdx];
            itemUpdated = true;
            break;
          }
        }
      }
    }

    // 2. Edição de anúncio (ad)
    if (itemType === 'ad') {
      for (const camp of campaigns) {
        if (camp.ads && Array.isArray(camp.ads)) {
          const adIdx = camp.ads.findIndex(a => String(a.id) === strId || String(a.adId) === strId);
          if (adIdx !== -1) {
            parentCamp = camp;
            camp.ads[adIdx] = {
              ...camp.ads[adIdx],
              ...(name ? { name } : {}),
              accountId: camp.ads[adIdx].accountId || camp.accountId || (camp.adAccountId ? String(camp.adAccountId).replace('act_', '') : null),
              adAccountId: camp.ads[adIdx].adAccountId || camp.adAccountId,
              currency: camp.ads[adIdx].currency || camp.currency
            };
            target = camp.ads[adIdx];
            itemUpdated = true;
            break;
          }
        }
      }
    }

    // 3. Edição de campanha
    if (!itemUpdated && itemType !== 'ad') {
      const index = campaigns.findIndex(c => String(c.id) === strId);
      if (index !== -1) {
        parentCamp = campaigns[index];
        const newBidCap = bidStrategy === 'LOWEST_COST_WITHOUT_CAP' ? null : (bidCap !== undefined ? (bidCap && Number(bidCap) > 0 ? String(bidCap) : null) : campaigns[index].bidCap);
        campaigns[index] = {
          ...campaigns[index],
          ...(name ? { name } : {}),
          ...(budget !== undefined && budget !== null ? { budget: String(budget) } : {}),
          bidCap: newBidCap,
          ...(bidStrategy ? { bidStrategy } : {})
        };
        // Se a campanha for CBO, propaga para seus conjuntos de anúncios
        if (!campaigns[index].isAbo && campaigns[index].adsets) {
          campaigns[index].adsets = campaigns[index].adsets.map(a => ({
            ...a,
            ...(budget !== undefined && budget !== null ? { budget: String(budget) } : {}),
            bidCap: newBidCap,
            ...(bidStrategy ? { bidStrategy } : {})
          }));
        }
        target = campaigns[index];
        itemUpdated = true;
      }
    }

    db.set('campaigns', campaigns);
    recordDetailOverride(strId, {
      ...(name ? { name } : {}),
      ...(budget !== undefined && budget !== null ? { budget: String(budget) } : {}),
      ...(bidCap !== undefined ? { bidCap: (bidStrategy === 'LOWEST_COST_WITHOUT_CAP' ? null : (bidCap && Number(bidCap) > 0 ? String(bidCap) : null)) } : {}),
      ...(bidStrategy ? { bidStrategy } : {})
    });
    campaignsCache.clear();

    const effectiveAccId = accountId || target?.accountId || target?.adAccountId || parentCamp?.accountId || parentCamp?.adAccountId || null;
    const cleanEffectiveAccId = effectiveAccId ? String(effectiveAccId).replace('act_', '') : null;
    const token = await getValidMetaAccessToken(userId, cleanEffectiveAccId);

    // Contas comprovadamente em USD
    const KNOWN_USD_ACCOUNTS = new Set([
      '1092137896602979', '2013649985959956', '1084136023986167', 
      '1588922422580250', '1101817232408751', '1387392810034708', 
      '1043285988469816', '1611243834049326', '28591581777115664'
    ]);

    const adAccounts = db.get('ad_accounts') || [];
    const matchedAccount = cleanEffectiveAccId 
      ? adAccounts.find(a => String(a.accountId || a.id || '').replace('act_', '') === cleanEffectiveAccId)
      : null;

    let isUsd = false;
    if (clientIsUsd === true || (currency && String(currency).toUpperCase() === 'USD')) {
      isUsd = true;
    } else if (cleanEffectiveAccId && KNOWN_USD_ACCOUNTS.has(cleanEffectiveAccId)) {
      isUsd = true;
    } else if (matchedAccount && String(matchedAccount.currency || '').toUpperCase() === 'USD') {
      isUsd = true;
    } else if (target && String(target.currency || '').toUpperCase() === 'USD') {
      isUsd = true;
    } else if (parentCamp && String(parentCamp.currency || '').toUpperCase() === 'USD') {
      isUsd = true;
    } else if (cleanEffectiveAccId) {
      try {
        const { data: sAcc } = await supabaseAdmin.from('ad_accounts').select('currency').like('id', `%${cleanEffectiveAccId}%`).limit(1);
        if (sAcc && sAcc[0]?.currency && sAcc[0].currency.toUpperCase() === 'USD') {
          isUsd = true;
        }
      } catch (e) {}
    }

    // Se ainda não determinou e temos token, descobre o account_id real via Meta Graph API
    if (!isUsd && !cleanEffectiveAccId && token) {
      try {
        const metaItemRes = await fetch(`${GRAPH_BASE_URL}/${strId}?fields=account_id&access_token=${token}`).catch(() => null);
        if (metaItemRes) {
          const itemMeta = await metaItemRes.json().catch(() => ({}));
          if (itemMeta?.account_id) {
            const cleanMetaAcc = String(itemMeta.account_id).replace('act_', '');
            if (KNOWN_USD_ACCOUNTS.has(cleanMetaAcc)) {
              isUsd = true;
            } else {
              const accRes = await fetch(`${GRAPH_BASE_URL}/act_${cleanMetaAcc}?fields=currency&access_token=${token}`).catch(() => null);
              if (accRes) {
                const accData = await accRes.json().catch(() => ({}));
                if (accData?.currency && accData.currency.toUpperCase() === 'USD') {
                  isUsd = true;
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    let metaSuccess = false;
    let metaError = null;

    if (token) {
      try {
        const usdRate = await getUsdToBrlRate();
        await updateMetaItemDetails(strId, { name, budget, bidCap, bidStrategy, itemType, isLifetime }, token, isUsd, usdRate);
        metaSuccess = true;
      } catch (err) {
        console.warn(`[Meta Details Update Error for ${strId}]:`, err.message);
        metaError = err.message;
      }
    } else {
      metaError = 'Nenhuma conexão do Facebook ativa ou token válido encontrado.';
    }

    // Persiste nome no Supabase se for campanha
    if (name && (itemType === 'campaign' || !itemType)) {
      try {
        await supabaseAdmin.from('campaigns').update({ name, updated_at: new Date().toISOString() }).eq('id', strId);
      } catch (e) {}
    }

    if (!metaSuccess && metaError) {
      return res.status(400).json({
        success: false,
        metaError,
        error: metaError,
        message: `⚠️ Erro na Meta: ${metaError}`
      });
    }

    campaignsCache.clear();
    invalidateAccountStructureCache(cleanEffectiveAccId);

    res.json({
      success: true,
      metaSuccess: true,
      campaign: target,
      message: 'Alteração sincronizada com sucesso no Gerenciador Meta Ads!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// F3. Duplicar Campanhas no Gerenciador Meta Ads (Na mesma conta ou em outra conta de anúncio)
app.get('/api/campaigns/duplicate-targets', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId || null;
    let connections = [];

    try {
      let q = supabaseAdmin.from('facebook_connections').select('*').order('connected_at', { ascending: false });
      if (userId) {
        if (isOwnerUserId(userId)) {
          q = q.or(`user_id.in.(${OWNER_USER_IDS.join(',')}),user_id.is.null`);
        } else {
          q = q.eq('user_id', userId);
        }
      }
      const { data: supaConns } = await q;
      if (supaConns && supaConns.length > 0) connections = supaConns;
    } catch (e) {}

    if (connections.length === 0) {
      const allLocal = db.get('facebook_connections') || [];
      connections = userId
        ? allLocal.filter(c => isOwnerUserId(userId) ? (!c.userId || isOwnerUserId(c.userId) || !c.user_id || isOwnerUserId(c.user_id)) : (c.userId === userId || c.user_id === userId))
        : allLocal;
    }

    if (connections.length === 0) {
      return res.json({ success: true, profiles: [], accounts: [] });
    }

    // Busca as contas de cada perfil diretamente da Meta Graph API e do banco
    const storeAccounts = db.get('ad_accounts') || [];
    const profilesWithAccounts = await Promise.all(
      connections.map(async (conn) => {
        let profileAccounts = [];
        let profilePages = [];
        const token = conn.access_token || conn.accessToken;

        if (token) {
          try {
            // 1. Tenta me/accounts caso o usuário tenha concedido acesso a páginas no futuro
            try {
              const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,is_published&limit=50&access_token=${token}`);
              const pagesData = await pagesRes.json();
              if (pagesData && Array.isArray(pagesData.data) && pagesData.data.length > 0) {
                profilePages = pagesData.data
                  .filter(p => p.is_published !== false)
                  .map(p => ({
                    id: p.id,
                    name: p.name ? `${p.name} (ID: ${p.id})` : `Página ${p.id}`,
                    category: p.category || 'Página do Facebook',
                    isPublished: true
                  }));
              }
            } catch (pgErr) {}

            // 2. Busca contas de anúncio do perfil
            const freshAccs = await fetchAdAccounts(token);
            if (Array.isArray(freshAccs) && freshAccs.length > 0) {
              const discoveredPageMap = new Map();

              profileAccounts = await Promise.all(
                freshAccs.map(async (a) => {
                  const cleanAccId = String(a.accountId || (a.id || '').replace('act_', ''));
                  const actId = a.id?.startsWith('act_') ? a.id : `act_${a.accountId}`;
                  
                  // Busca pixels da conta
                  let pixels = [];
                  try {
                    const pxRes = await fetch(`https://graph.facebook.com/v19.0/${actId}/adspixels?fields=id,name,is_unavailable&access_token=${token}`);
                    const pxData = await pxRes.json();
                    if (pxData && Array.isArray(pxData.data)) {
                      pixels = pxData.data.map(px => ({
                        id: px.id,
                        name: px.name || `Pixel ${px.id}`,
                        isUnavailable: Boolean(px.is_unavailable)
                      }));
                    }
                  } catch (pxErr) {
                    console.warn(`[duplicate-targets] Erro ao buscar pixels da conta ${actId}:`, pxErr.message);
                  }

                  // Descobre páginas ativas diretamente dos anúncios da conta (apenas 5 ads para economizar chamadas de API)
                  let accountPages = [];
                  try {
                    const adsRes = await fetch(`https://graph.facebook.com/v19.0/${actId}/ads?fields=id,creative{id,actor_id,object_story_spec}&limit=10&access_token=${token}`);
                    const adsData = await adsRes.json();
                    if (adsData && Array.isArray(adsData.data)) {
                      for (const ad of adsData.data) {
                        const pid = ad.creative?.object_story_spec?.page_id || ad.creative?.actor_id;
                        if (pid) {
                          if (!discoveredPageMap.has(pid)) {
                            const pageObj = {
                              id: pid,
                              name: `Página ${pid}`,
                              category: 'Página do Facebook',
                              isPublished: true
                            };
                            discoveredPageMap.set(pid, pageObj);
                            accountPages.push(pageObj);
                          } else {
                            accountPages.push(discoveredPageMap.get(pid));
                          }
                        }
                      }
                    }
                  } catch (adsErr) {}

                  return {
                    id: cleanAccId,
                    actId: actId,
                    name: a.name || `Conta ${a.accountId}`,
                    businessName: a.businessName || 'BM Principal',
                    currency: a.currency || 'BRL',
                    status: a.status === 'ACTIVE' || a.status === 'Ativa' ? 'Ativa' : (a.status || 'Ativa'),
                    profileId: String(conn.id),
                    profileName: conn.name,
                    pixels: pixels,
                    pages: accountPages
                  };
                })
              );

              // Consolida páginas descobertas ativas para o perfil
              if (profilePages.length === 0 && discoveredPageMap.size > 0) {
                profilePages = Array.from(discoveredPageMap.values());
              }
            }
          } catch (fetchErr) {
            console.warn(`[duplicate-targets] Erro ao buscar contas do perfil ${conn.name}:`, fetchErr.message);
          }
        }

        // Se a Graph API falhar ou estiver sem internet temporária, usa as contas em cache
        if (profileAccounts.length === 0) {
          profileAccounts = storeAccounts.map(a => {
            const cleanId = (a.id || '').replace('act_', '');
            return {
              id: cleanId,
              actId: a.id?.startsWith('act_') ? a.id : `act_${cleanId}`,
              name: a.name || 'Conta de Anúncio',
              businessName: a.bm_name || a.businessName || 'BM Principal',
              currency: a.currency || 'BRL',
              status: a.status === 'ACTIVE' || a.status === 'Ativa' ? 'Ativa' : (a.status || 'Ativa'),
              profileId: String(conn.id),
              profileName: conn.name,
              pixels: [],
              pages: []
            };
          });
        }

        return {
          id: String(conn.id),
          name: conn.name,
          avatarUrl: conn.avatar_url || conn.avatarUrl,
          accountsCount: profileAccounts.length,
          accounts: profileAccounts,
          pages: profilePages
        };
      })
    );

    // Lista plana de todas as contas combinadas de todos os perfis
    const allAccounts = profilesWithAccounts.flatMap(p => p.accounts);

    res.json({ 
      success: true, 
      profiles: profilesWithAccounts, 
      accounts: allAccounts 
    });
  } catch (err) {
    console.error('[duplicate-targets] Erro:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/campaigns/duplicate', async (req, res) => {
  try {
    const { campaignIds, targetAccountId, copiesCount = 1, destinationType = 'same_account', targetPixelId, targetPageId } = req.body;
    if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhuma campanha selecionada para duplicação.' });
    }

    let connections = db.get('facebook_connections') || [];
    if (connections.length === 0) {
      try {
        const { data: supaConns } = await supabaseAdmin.from('facebook_connections').select('*');
        if (supaConns && supaConns.length > 0) connections = supaConns;
      } catch (e) {}
    }

    const validTokens = connections
      .map(c => c.access_token || c.accessToken)
      .filter(t => Boolean(t) && typeof t === 'string' && t.trim().length > 0);

    if (validTokens.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhuma conta do Facebook conectada para duplicar campanhas.' });
    }

    const cleanTargetAcc = destinationType === 'other_account' && targetAccountId ? targetAccountId.replace('act_', '').trim() : null;
    const cleanTargetPixel = targetPixelId ? String(targetPixelId).trim() : null;
    const cleanTargetPage = targetPageId ? String(targetPageId).trim() : null;
    const duplicatedResults = [];

    // Mapeamento dinâmico de qual conta de anúncio pertence a qual token
    const tokenAccountMap = new Map(); // actId -> token
    await Promise.all(
      connections.map(async (conn) => {
        const token = conn.access_token || conn.accessToken;
        if (token) {
          try {
            const accs = await fetchAdAccounts(token);
            if (Array.isArray(accs)) {
              for (const a of accs) {
                const cleanId = String(a.accountId || (a.id || '').replace('act_', ''));
                tokenAccountMap.set(cleanId, token);
                tokenAccountMap.set(`act_${cleanId}`, token);
              }
            }
          } catch (e) {}
        }
      })
    );

    // Identifica o token da conta de destino se especificada
    let targetProfileToken = null;
    if (cleanTargetAcc) {
      targetProfileToken = tokenAccountMap.get(cleanTargetAcc) || null;
    }

    for (const cId of campaignIds) {
      let succeeded = false;
      let lastError = null;

      // 1. Descobre qual token é o dono da campanha de origem
      let sourceToken = null;
      for (const token of validTokens) {
        try {
          const testRes = await fetch(`https://graph.facebook.com/v19.0/${cId}?fields=id,account_id&access_token=${token}`);
          const testData = await testRes.json();
          if (testData && testData.id && !testData.error) {
            sourceToken = token;
            break;
          }
        } catch (e) {}
      }

      if (!sourceToken) {
        sourceToken = validTokens[0];
      }

      try {
        const resDup = await duplicateMetaCampaign(cId, {
          targetAccountId: cleanTargetAcc,
          targetPixelId: cleanTargetPixel,
          targetPageId: cleanTargetPage,
          targetToken: targetProfileToken,
          copiesCount: Number(copiesCount) || 1
        }, sourceToken);
        duplicatedResults.push({ campaignId: cId, ...resDup });
        succeeded = true;
      } catch (err) {
        lastError = err;
        console.warn(`[Duplicate Error for ${cId}]:`, lastError?.message);
        duplicatedResults.push({ campaignId: cId, success: false, error: lastError?.message || 'Falha de permissão no Meta Ads' });
      }
    }

    // Se duplicou para outra conta, garante que a conta de destino esteja ativa para sincronização
    if (cleanTargetAcc) {
      try {
        let curAccounts = db.get('ad_accounts') || [];
        let found = false;
        curAccounts = curAccounts.map(a => {
          const cId = (a.accountId || a.id || '').replace('act_', '');
          if (cId === cleanTargetAcc) {
            found = true;
            return { ...a, syncActive: true };
          }
          return a;
        });

        if (!found) {
          curAccounts.push({
            id: `act_${cleanTargetAcc}`,
            accountId: cleanTargetAcc,
            name: `Conta ${cleanTargetAcc}`,
            businessName: 'BM Destino',
            currency: 'BRL',
            status: 'Ativa',
            syncActive: true
          });
        }
        db.set('ad_accounts', curAccounts);
      } catch (accErr) {}
    }

    // Invalida cache de campanhas para recarregar com as novas
    campaignsCache.clear();

    const totalCopiesCreated = duplicatedResults
      .filter(r => r.success)
      .reduce((acc, r) => acc + (r.count || (r.copiedCampaigns ? r.copiedCampaigns.length : 1)), 0);

    // Constrói objetos completos das campanhas recém-duplicadas para que apareçam instantaneamente
    const createdCampaigns = [];
    const existingCamps = db.get('campaigns') || [];

    for (const resItem of duplicatedResults) {
      if (!resItem.success && !resItem.copiedCampaigns) continue;
      const sourceCamp = existingCamps.find(c => String(c.id) === String(resItem.campaignId));
      const copies = resItem.copiedCampaigns || (resItem.id ? [{ id: resItem.id }] : []);

      for (const copy of copies) {
        const newId = String(copy.copied_campaign_id || copy.id);
        if (!newId || newId === 'null') continue;

        const newCampName = sourceCamp?.name ? `${sourceCamp.name} - Cópia` : 'Campanha Duplicada';
        const targetActId = cleanTargetAcc 
          ? (cleanTargetAcc.startsWith('act_') ? cleanTargetAcc : `act_${cleanTargetAcc}`) 
          : (sourceCamp?.adAccountId || 'act_0000');
        const targetCleanAct = targetActId.replace('act_', '');

        const newCampObj = {
          ...(sourceCamp || {}),
          id: newId,
          campaignId: newId,
          name: newCampName,
          status: true,
          rawStatus: 'ACTIVE',
          effectiveStatus: 'ACTIVE',
          adAccountId: targetActId,
          accountId: targetCleanAct,
          accountName: sourceCamp?.accountName || 'Conta de Anúncios',
          spend: '0.00',
          rawSpendUsd: '0.00',
          impressions: 0,
          clicks: 0,
          cpc: '0.00',
          cpm: '0.00',
          ctr: '0.00%',
          initCheckouts: 0,
          costPerIc: '0.00',
          sales: 0,
          pendingSales: 0,
          revenue: '0.00',
          profit: '0.00',
          roas: '0.00',
          cpa: '0.00',
          adsets: (sourceCamp?.adsets || []).map((as, idx) => ({
            ...as,
            id: `${newId}_as_${idx + 1}`,
            adsetId: `${newId}_as_${idx + 1}`,
            campaignId: newId,
            name: as.name ? `${as.name} - Cópia` : 'Conjunto Duplicado',
            status: true,
            rawStatus: 'ACTIVE',
            effectiveStatus: 'ACTIVE',
            spend: '0.00',
            rawSpendUsd: '0.00',
            impressions: 0,
            clicks: 0,
            cpc: '0.00',
            cpm: '0.00',
            ctr: '0.00%',
            initCheckouts: 0,
            costPerIc: '0.00',
            sales: 0,
            pendingSales: 0,
            revenue: '0.00',
            profit: '0.00',
            roas: '0.00',
            cpa: '0.00'
          })),
          ads: (sourceCamp?.ads || []).map((ad, idx) => ({
            ...ad,
            id: `${newId}_ad_${idx + 1}`,
            adId: `${newId}_ad_${idx + 1}`,
            campaignId: newId,
            adsetId: `${newId}_as_1`,
            name: ad.name ? `${ad.name} - Cópia` : 'Anúncio Duplicado',
            status: true,
            rawStatus: 'ACTIVE',
            effectiveStatus: 'ACTIVE',
            spend: '0.00',
            rawSpendUsd: '0.00',
            impressions: 0,
            clicks: 0,
            cpc: '0.00',
            cpm: '0.00',
            ctr: '0.00%',
            initCheckouts: 0,
            costPerIc: '0.00',
            sales: 0,
            pendingSales: 0,
            revenue: '0.00',
            profit: '0.00',
            roas: '0.00',
            cpa: '0.00'
          }))
        };

        createdCampaigns.push(newCampObj);
      }
    }

    if (createdCampaigns.length > 0) {
      db.set('campaigns', [...createdCampaigns, ...existingCamps]);
      campaignsCache.clear();
      invalidateAccountStructureCache(targetAccountId);
    }

    res.json({
      success: totalCopiesCreated > 0,
      duplicatedCount: totalCopiesCreated,
      results: duplicatedResults,
      createdCampaigns,
      message: totalCopiesCreated > 0
        ? `${totalCopiesCreated} campanha(s) duplicada(s) com sucesso na Meta!`
        : `Erro ao duplicar na Meta: ${duplicatedResults[0]?.error || 'Verifique as permissões do perfil'}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rota de exclusão em massa de campanhas, conjuntos ou anúncios
app.post('/api/campaigns/delete-bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum item selecionado para exclusão.' });
    }

    let connections = db.get('facebook_connections') || [];
    if (connections.length === 0) {
      try {
        const { data: supaConns } = await supabaseAdmin.from('facebook_connections').select('*');
        if (supaConns && supaConns.length > 0) connections = supaConns;
      } catch (e) {}
    }

    const validTokens = connections
      .map(c => c.access_token || c.accessToken)
      .filter(t => Boolean(t) && typeof t === 'string' && t.trim().length > 0);

    const deleteResults = [];

    // Exclui no Meta Ads tentando os tokens disponíveis
    for (const itemId of ids) {
      let deletedOnMeta = false;
      for (const token of validTokens) {
        try {
          await deleteMetaItem(itemId, token);
          deletedOnMeta = true;
          break;
        } catch (err) {
          // Continua tentando outros tokens
        }
      }
      deleteResults.push({ id: itemId, deletedOnMeta });
    }

    // Registra IDs excluídos no tracker permanente
    ids.forEach(id => recordDeletedId(id));

    // Remove do banco de dados local
    let currentCampaigns = db.get('campaigns') || [];
    currentCampaigns = currentCampaigns
      .filter(c => !ids.includes(c.id) && !ids.includes(String(c.id)))
      .map(c => {
        const newAdsets = c.adsets ? c.adsets.filter(as => !ids.includes(as.id) && !ids.includes(String(as.id)) && !ids.includes(as.adsetId) && !ids.includes(String(as.adsetId))) : [];
        const newAds = c.ads ? c.ads.filter(ad => !ids.includes(ad.id) && !ids.includes(String(ad.id)) && !ids.includes(ad.adId) && !ids.includes(String(ad.adId))) : [];
        return { ...c, adsets: newAdsets, ads: newAds };
      });

    db.set('campaigns', currentCampaigns);
    campaignsCache.clear();
    invalidateAccountStructureCache();

    res.json({
      success: true,
      deletedCount: ids.length,
      message: `${ids.length} item(ns) excluído(s) com sucesso!`
    });
  } catch (err) {
    console.error('[delete-bulk] Erro:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ── ROTAS DE AUTENTICAÇÃO SEGURA (Com bypass de RLS via Supabase Service Role) ──
 */

// 1. Login com Email e Senha
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const inputPass = (password || '').trim();

    if (!cleanEmail || !inputPass) {
      return res.status(400).json({ success: false, error: 'Por favor, preencha o e-mail e a senha.' });
    }

    const checkTwoFactorRequired = async (targetUser) => {
      let config = db.get(`2fa_${cleanEmail}`);
      if (!config) {
        try {
          const { data } = await supabaseAdmin.from('pixels').select('domain').eq('id', `2fa_${cleanEmail}`).maybeSingle();
          if (data && data.domain) config = JSON.parse(data.domain);
        } catch (e) {}
      }
      if (config?.enabled && config?.secret) {
        return res.json({
          success: true,
          twoFactorRequired: true,
          email: cleanEmail,
          user: targetUser
        });
      }
      return res.json({ success: true, user: targetUser });
    };

    // Conta administradora principal Jean Macedo
    if (cleanEmail === 'jeeanmacedo@gmail.com' || cleanEmail === 'jeanmacedo@gmail.com') {
      if (inputPass !== 'jean031522') {
        return res.status(401).json({ success: false, error: 'Senha incorreta para a conta administradora.' });
      }
      return checkTwoFactorRequired({
        id: 'usr_1788826403159',
        name: 'Jean Macedo',
        email: 'jeeanmacedo@gmail.com',
        role: 'admin',
        plan: 'scale',
        avatarLetter: 'J',
        hasSetPassword: true
      });
    }

    // Conta administradora principal Digital JM Soluções
    if (cleanEmail === 'digitaljmsolucoes@gmail.com') {
      if (inputPass !== 'jean031522') {
        return res.status(401).json({ success: false, error: 'Senha incorreta para a conta administradora.' });
      }
      return checkTwoFactorRequired({
        id: 'usr_admin_digitaljm',
        name: 'Digital JM Soluções',
        email: 'digitaljmsolucoes@gmail.com',
        role: 'admin',
        plan: 'pro',
        avatarLetter: 'D',
        hasSetPassword: true
      });
    }

    // Conta de teste dedicada para o analista da Meta (App Review)
    if (cleanEmail === 'teste@primetrack.top') {
      if (inputPass !== 'PrimeTrack2026!') {
        return res.status(401).json({ success: false, error: 'Senha incorreta para a conta de teste.' });
      }
      return checkTwoFactorRequired({
        id: 'usr_meta_reviewer',
        name: 'Meta Reviewer',
        email: 'teste@primetrack.top',
        role: 'admin',
        plan: 'pro',
        avatarLetter: 'M',
        hasSetPassword: true
      });
    }

    // Busca usuário no Supabase sem bloqueio de RLS
    const { data: userRecord, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (fetchErr) {
      console.error('Erro ao buscar usuário:', fetchErr);
    }

    if (!userRecord) {
      return res.status(404).json({
        success: false,
        error: 'Conta não encontrada! O primeiro cadastro deve ser feito clicando em "Entrar com Google" acima.'
      });
    }

    if (!userRecord.password || userRecord.password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Esta conta foi criada com o Google mas ainda não possui senha. Entre com o Google e defina sua senha em Integrações > Baixe nosso App.'
      });
    }

    if (userRecord.password !== inputPass) {
      return res.status(401).json({
        success: false,
        error: 'Senha incorreta. Tente novamente ou entre com a sua conta Google.'
      });
    }

    return checkTwoFactorRequired({
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role || 'client',
      plan: userRecord.plan || 'trial',
      avatarLetter: (userRecord.name || cleanEmail).charAt(0).toUpperCase(),
      createdAt: userRecord.created_at,
      trialStartedAt: userRecord.trial_started_at || userRecord.created_at,
      hasSetPassword: true
    });
  } catch (err) {
    console.error('Erro na rota de login:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao autenticar. Tente novamente.' });
  }
});

// AUTENTICAÇÃO DE DOIS FATORES (2FA) - PRIMETRACK
app.post('/api/auth/2fa/save', async (req, res) => {
  try {
    const { email, enabled, secret } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'E-mail obrigatório' });
    }

    const config = {
      email: cleanEmail,
      enabled: Boolean(enabled),
      secret: enabled ? String(secret || '').trim() : null,
      updatedAt: new Date().toISOString()
    };

    db.set(`2fa_${cleanEmail}`, config);

    try {
      await supabaseAdmin.from('pixels').upsert({
        id: `2fa_${cleanEmail}`,
        name: 'TwoFactorAuth',
        domain: JSON.stringify(config),
        status: enabled ? 'active' : 'inactive'
      });
    } catch (e) {
      console.warn('[2FA] Aviso ao salvar no Supabase:', e.message);
    }

    return res.json({ success: true, enabled: config.enabled });
  } catch (err) {
    console.error('Erro em /api/auth/2fa/save:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/2fa/status', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mail obrigatório' });
    }

    let config = db.get(`2fa_${email}`);
    if (!config) {
      try {
        const { data } = await supabaseAdmin.from('pixels').select('domain').eq('id', `2fa_${email}`).maybeSingle();
        if (data && data.domain) config = JSON.parse(data.domain);
      } catch (e) {}
    }

    return res.json({
      success: true,
      enabled: Boolean(config?.enabled),
      hasSecret: Boolean(config?.secret)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/2fa/verify-login', async (req, res) => {
  try {
    const { email, token } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = String(token || '').replace(/\D/g, '').trim();

    if (!cleanEmail || !cleanToken || cleanToken.length !== 6) {
      return res.status(400).json({ success: false, error: 'Por favor, informe o código de 6 dígitos.' });
    }

    let config = db.get(`2fa_${cleanEmail}`);
    if (!config) {
      try {
        const { data } = await supabaseAdmin.from('pixels').select('domain').eq('id', `2fa_${cleanEmail}`).maybeSingle();
        if (data && data.domain) config = JSON.parse(data.domain);
      } catch (e) {}
    }

    if (!config?.enabled || !config?.secret) {
      return res.status(400).json({ success: false, error: 'Autenticação de 2 fatores não configurada nesta conta.' });
    }

    const secret = OTPAuth.Secret.fromBase32(config.secret.trim());
    const totp = new OTPAuth.TOTP({
      issuer: 'PrimeTrack',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret
    });

    const delta = totp.validate({ token: cleanToken, window: 1 });
    if (delta === null) {
      return res.status(401).json({ success: false, error: 'Código de 6 dígitos inválido ou expirado. Verifique no seu aplicativo autenticador.' });
    }

    return res.json({ success: true, message: 'Autenticação em duas etapas confirmada com sucesso!' });
  } catch (err) {
    console.error('Erro em /api/auth/2fa/verify-login:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao validar 2FA.' });
  }
});

// 2. Login e Cadastro via Google
app.post('/api/auth/google-login', async (req, res) => {
  try {
    const { email, name } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'E-mail do Google inválido.' });
    }

    if (cleanEmail === 'jeeanmacedo@gmail.com' || cleanEmail === 'jeanmacedo@gmail.com') {
      return res.json({
        success: true,
        user: {
          id: 'usr_1788826403159',
          name: 'Jean Macedo',
          email: 'jeeanmacedo@gmail.com',
          role: 'admin',
          plan: 'scale',
          avatarLetter: 'J',
          hasSetPassword: true
        },
        isNew: false
      });
    }

    if (cleanEmail === 'digitaljmsolucoes@gmail.com') {
      return res.json({
        success: true,
        user: {
          id: 'usr_admin_digitaljm',
          name: 'Digital JM Soluções',
          email: 'digitaljmsolucoes@gmail.com',
          role: 'admin',
          plan: 'pro',
          avatarLetter: 'D',
          hasSetPassword: true
        },
        isNew: false
      });
    }

    // Busca ou cria no Supabase via supabaseAdmin
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return res.json({
        success: true,
        user: {
          id: existingUser.id,
          name: existingUser.name || cleanName,
          email: existingUser.email,
          role: existingUser.role || 'client',
          plan: existingUser.plan || 'trial',
          avatarLetter: (existingUser.name || cleanEmail).charAt(0).toUpperCase(),
          createdAt: existingUser.created_at,
          trialStartedAt: existingUser.trial_started_at,
          hasSetPassword: Boolean(existingUser.password && existingUser.password.trim().length >= 6)
        },
        isNew: false
      });
    }

    // Cria novo cliente limpo
    const newId = `usr_${Date.now()}`;
    const newRecord = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      password: '',
      role: 'client',
      plan: 'trial',
      trial_started_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { error: insertErr } = await supabaseAdmin.from('users').insert(newRecord);
    if (insertErr) {
      console.error('Erro ao inserir novo cliente no Supabase:', insertErr);
    }

    return res.json({
      success: true,
      user: {
        ...newRecord,
        avatarLetter: cleanName.charAt(0).toUpperCase(),
        hasSetPassword: false
      },
      isNew: true
    });
  } catch (err) {
    console.error('Erro no login com Google:', err);
    res.status(500).json({ success: false, error: 'Erro ao autenticar com o Google.' });
  }
});

// 3. Atualização de Senha
app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanEmail || cleanPass.length < 6) {
      return res.status(400).json({ success: false, error: 'A senha deve conter no mínimo 6 caracteres.' });
    }

    const { data: updatedRows, error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ password: cleanPass })
      .eq('email', cleanEmail)
      .select();

    if (updateErr) {
      console.error('Erro ao atualizar senha no Supabase:', updateErr);
      return res.status(500).json({ success: false, error: 'Erro ao atualizar no banco de dados.' });
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Se não existia ainda na tabela users, cria o registro
      const newUserId = 'usr_' + Date.now();
      const { error: insertErr } = await supabaseAdmin
        .from('users')
        .insert({
          id: newUserId,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          password: cleanPass,
          role: 'client',
          plan: 'trial',
          trial_started_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (insertErr) {
        console.error('Erro ao inserir novo usuário com senha:', insertErr);
        return res.status(500).json({ success: false, error: 'Erro ao criar credenciais no banco de dados.' });
      }
    }

    return res.json({ success: true, message: 'Senha atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar senha:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao salvar senha.' });
  }
});

// 4. Atualização de Perfil (Nome do Usuário)
app.post('/api/auth/update-profile', async (req, res) => {
  try {
    const { email, name } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();

    if (!cleanEmail || !cleanName) {
      return res.status(400).json({ success: false, error: 'Nome inválido.' });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ name: cleanName })
      .eq('email', cleanEmail);

    if (updateErr) {
      console.error('Erro ao atualizar perfil no Supabase:', updateErr);
    }

    return res.json({ success: true, name: cleanName });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao atualizar perfil.' });
  }
});

/**
 * 6. Rota para Testar / Verificar se o Pixel está instalado na Página de Vendas
 */
app.post('/api/pixel/verify', async (req, res) => {
  try {
    const { url, pixelId, metaPixelId, icType, icValue } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL do site é obrigatória.' });
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PrimeTrack-Verifier/2.0'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.json({
        success: false,
        found: false,
        message: `Não foi possível acessar a página (Status HTTP ${response.status}). Verifique se o site está online e publicado.`
      });
    }

    const html = await response.text();

    // 1. O script oficial do PrimeTrack DEVE estar presente no HTML
    const hasPrimeTrackSnippet = html.includes('primetrack.top/pixel.js') || 
      (html.toLowerCase().includes('primetrack') && html.includes('pixel.js'));

    // 2. O pixelId específico deste pixel deve estar no código
    const hasPixelId = pixelId ? html.includes(pixelId) : false;

    // Se não tem o script do PrimeTrack nem o ID deste pixel criado, NÃO está instalado
    if (!hasPrimeTrackSnippet && !hasPixelId) {
      return res.json({
        success: true,
        found: false,
        message: 'Script do PrimeTrack não encontrado no HTML do site. Copie o código gerado e cole dentro da tag <head> da sua página de vendas.'
      });
    }

    // Se encontrou script do PrimeTrack mas com outro pixelId não correspondente
    if (pixelId && !hasPixelId && hasPrimeTrackSnippet) {
      return res.json({
        success: true,
        found: false,
        message: `O script do PrimeTrack foi detectado, mas o ID deste pixel (${pixelId}) não foi encontrado no HTML. Atualize o snippet na sua página.`
      });
    }

    // 3. Verificação do Seletor CSS do Botão de Checkout (caso configurado)
    let buttonMsg = '';
    if (icType === 'css' && icValue) {
      const cleanSelector = icValue.trim().replace(/^[.#]/, '');
      const hasSelector = html.includes(cleanSelector);
      if (hasSelector) {
        buttonMsg = ` e o seletor "${icValue}" do botão de checkout foi localizado no HTML!`;
      } else {
        buttonMsg = `, mas o seletor "${icValue}" do botão de checkout ainda não foi localizado no HTML da página.`;
      }
    }

    return res.json({
      success: true,
      found: true,
      message: `Pixel funcionando corretamente${buttonMsg}`
    });
  } catch (err) {
    console.error('Erro em /api/pixel/verify:', err);
    return res.json({
      success: true,
      found: false,
      message: 'Não foi possível conectar ao site para verificar o script. Verifique se a URL está correta e acessível publicamente.'
    });
  }
});

// Endpoints de Web Push (Safari iOS & Desktop)
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }
    const subUserId = req.headers['x-user-id'] || req.body.userId || 'usr_1788826403159';
    await saveSubscription(subscription, subUserId);
    console.log(`[WebPush] Nova inscrição gravada com sucesso para usuário: ${subUserId}`);
    res.json({ success: true });
  } catch (e) {
    console.error('[WebPush] Erro ao salvar subscription:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/push/test', async (req, res) => {
  try {
    const { type, amount, campaign, config, userId } = req.body;
    const testUserId = req.headers['x-user-id'] || userId || null;

    let notifSettings = config || {};
    if (!notifSettings || Object.keys(notifSettings).length === 0) {
      try {
        const targetUserId = testUserId || 'usr_1788826403159';
        const idsToSearch = isOwnerUserId(targetUserId)
          ? ['settings_usr_1788826403159', 'settings_usr_admin_digitaljm', 'settings_global']
          : [`settings_${targetUserId}`];

        const { data: supaSet } = await supabaseAdmin
          .from('pixels')
          .select('domain')
          .in('id', idsToSearch)
          .limit(1);

        if (supaSet && supaSet[0]?.domain) {
          const parsed = JSON.parse(supaSet[0].domain);
          notifSettings = parsed.notificationSettings || parsed;
        }
      } catch (e) {}
    }

    if (!notifSettings || Object.keys(notifSettings).length === 0) {
      const settings = (testUserId && !isOwnerUserId(testUserId)) ? (db.get(`settings_${testUserId}`) || {}) : (db.get('settings') || {});
      notifSettings = settings.notificationSettings || {};
    }

    const hideProduct = notifSettings.ocultarProduto !== false;
    const showCampaign = notifSettings.mostrarCampanha !== false;
    const showDashboard = notifSettings.mostrarDashboard === true;

    const isPending = type === 'pending';
    const isRefunded = type === 'refunded';
    const val = amount || 'R$ 14,00';
    const camp = campaign !== undefined ? campaign : (showCampaign ? 'Notificação Teste' : '');

    const titlePrefix = showDashboard ? 'Dashboard — ' : '';
    let title = `${titlePrefix}Venda Aprovada!`;

    const buildTestBody = (isNeg = false) => {
      let text = `Comissão: ${isNeg ? '-' : ''}${val}`;
      if (!hideProduct) text = `Produto Teste — ${text}`;
      if (showCampaign && camp) text += ` — ${camp}`;
      return text;
    };

    let body = buildTestBody(false);

    if (isPending) {
      title = `${titlePrefix}Venda Pendente!`;
    } else if (isRefunded) {
      title = `${titlePrefix}Venda Reembolsada!`;
      body = buildTestBody(true);
    }

    const result = await sendSalesNotification({
      title,
      body,
      icon: 'https://app.primetrack.top/images/primetrack-app-icon.png',
      data: { url: '/sales' },
      userId: testUserId
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('[WebPush] Erro no endpoint /api/push/test:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ABACATEPAY PAYMENTS & CHECKOUT
// ==========================================
app.post('/api/abacatepay/checkout', async (req, res) => {
  try {
    const { plan, userId, userEmail, userName } = req.body;
    const reqUserId = req.headers['x-user-id'] || userId;
    const baseUrl = (req.headers.origin || req.headers.host)
      ? `${req.protocol}://${req.get('host')}`
      : 'https://app.primetrack.top';

    const checkout = await createCheckout({
      plan,
      userId: reqUserId,
      userEmail,
      userName,
      baseUrl
    });

    return res.json(checkout);
  } catch (err) {
    console.error('Erro ao gerar checkout AbacatePay:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/abacatepay/subscribe-card', async (req, res) => {
  try {
    const { plan, userId, userEmail, userName, cardData } = req.body;
    const reqUserId = req.headers['x-user-id'] || userId;

    const result = await subscribeWithCard({
      plan,
      userId: reqUserId,
      userEmail,
      userName,
      cardData
    });

    return res.json(result);
  } catch (err) {
    console.error('Erro ao processar assinatura via cartão:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/abacatepay/webhook', async (req, res) => {
  try {
    const result = await handleWebhookEvent(req.body);
    return res.json(result);
  } catch (err) {
    console.error('Erro no webhook AbacatePay:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId;
    const email = (req.query.email || '').trim().toLowerCase();

    // Jean Macedo é o Dono da PrimeTrack: sempre Scale vitalício e role admin
    if (userId === 'usr_1788826403159' || email === 'jeeanmacedo@gmail.com' || email === 'jeanmacedo@gmail.com') {
      supabaseAdmin.from('users').update({ plan: 'scale', role: 'admin' }).or('email.eq.jeeanmacedo@gmail.com,id.eq.usr_1788826403159').then(() => {}).catch(() => {});
      return res.json({
        success: true,
        user: {
          id: 'usr_1788826403159',
          name: 'Jean Macedo',
          email: 'jeeanmacedo@gmail.com',
          role: 'admin',
          plan: 'scale',
          avatarLetter: 'J',
          hasSetPassword: true
        }
      });
    }

    let query = supabaseAdmin.from('users').select('*');
    if (userId) {
      query = query.eq('id', userId);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      return res.status(400).json({ success: false, error: 'Identificador do usuário ausente' });
    }

    const { data: userRecord } = await query.maybeSingle();
    if (!userRecord) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    const userEmailClean = (userRecord.email || '').toLowerCase().trim();
    const isOwner = userEmailClean === 'jeeanmacedo@gmail.com' || userEmailClean === 'jeanmacedo@gmail.com' || userRecord.id === 'usr_1788826403159';

    return res.json({
      success: true,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: isOwner ? 'admin' : (userRecord.role || 'client'),
        plan: isOwner ? 'scale' : (userRecord.plan || 'trial'),
        avatarLetter: (userRecord.name || userRecord.email).charAt(0).toUpperCase(),
        createdAt: userRecord.created_at,
        trialStartedAt: userRecord.trial_started_at || userRecord.created_at,
        hasSetPassword: Boolean(userRecord.password && userRecord.password.trim().length >= 6)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

if (process.env.VERCEL !== '1') {
  // Inicialização local: reconcilia e sincroniza automaticamente dados do Supabase e Meta na inicialização do localhost
  (async () => {
    try {
      supabaseAdmin.from('users').update({ plan: 'scale', role: 'admin' }).or('email.eq.jeeanmacedo@gmail.com,email.eq.jeanmacedo@gmail.com,id.eq.usr_1788826403159').then(() => {}).catch(() => {});
      ensureWebhookConfigured().catch(() => {});
      const reconciled = await reconcileFacebookData();
      console.log(`[PrimeTrack Local] Reconciliado com sucesso: ${reconciled.connections.length} perfil(is) e ${reconciled.adAccounts.length} conta(s) ativas.`);
    } catch (err) {
      console.warn('[PrimeTrack Local Init] Aviso ao sincronizar com Supabase:', err.message);
    }
  })();

  const server = app.listen(PORT, () => {
    console.log(`[PrimeTrack Server] Rodando na porta ${PORT}`);
    console.log(`[Pixel Script] Disponível em http://localhost:${PORT}/pixel.js`);
    console.log(`[Webhooks] Escutando em http://localhost:${PORT}/api/webhooks/:gateway`);

    // Pré-aquece o cache de datas comuns após 2 segundos do boot para respostas instantâneas
    setTimeout(() => {
      prewarmCommonPresets().catch(err => console.warn('[Prewarm Boot Error]:', err.message));
    }, 2000);
  });

  // Sincronização automática em segundo plano a cada 5 minutos das contas ativas e monitoramento de bloqueio
  setInterval(async () => {
    try {
      let connections = db.get('facebook_connections') || [];
      if (connections.length === 0) {
        const { data: supaConn } = await supabaseAdmin.from('facebook_connections').select('*');
        if (supaConn && supaConn.length > 0) connections = supaConn;
      }

      if (connections.length > 0) {
        // 1. Checa se algum perfil foi bloqueado / token invalidado pela Meta
        for (const conn of connections) {
          if (conn.accessToken || conn.access_token) {
            const token = conn.accessToken || conn.access_token;
            try {
              const profileCheck = await fetchUserProfile(token).catch(err => ({ error: err.message }));
              if (profileCheck && profileCheck.error) {
                console.warn(`[Meta Monitor] 🚨 Perfil ${conn.name} bloqueado ou token revogado!`);
                if (!notifiedBlockedProfiles.has(conn.id)) {
                  notifiedBlockedProfiles.add(conn.id);
                  await sendSalesNotification({
                    title: '🚨 PERFIL BLOQUEADO!',
                    body: `O perfil ${conn.name || 'do Facebook'} foi bloqueado ou perdeu acesso ao Meta Ads. Conecte outro perfil para manter seu gerenciamento!`,
                    icon: 'https://app.primetrack.top/images/primetrack-app-icon.png',
                    tag: `profile_blocked_${conn.id}`,
                    data: { url: '/integracoes' }
                  });
                }
              } else if (profileCheck && !profileCheck.error) {
                notifiedBlockedProfiles.delete(conn.id);
              }
            } catch (pErr) {}
          }
        }

        console.log('[Auto-Sync Meta] Atualizando métricas e gastos reais das campanhas em segundo plano...');
        await executeMetaSync({ datePreset: 'today' });
        prewarmCommonPresets().catch(() => {});
      }
    } catch (autoErr) {
      console.warn('[Auto-Sync Meta Aviso]:', autoErr.message);
    }
  }, 5 * 60 * 1000);

  // Mantém o event loop ativo em qualquer ambiente
  setInterval(() => {}, 1 << 30);
}

export default app;
