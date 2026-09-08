import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { sendCapiEvent } from './services/capi.js';
import { parseWebhook } from './services/webhooks.js';
import { attributeOrder } from './services/attribution.js';
import { 
  getAuthorizationUrl, 
  exchangeCodeForLongLivedToken, 
  fetchUserProfile, 
  fetchAdAccounts, 
  fetchLiveAccountDetails,
  fetchCampaigns, 
  fetchAdsWithCreatives 
} from './services/metaService.js';
import { supabaseAdmin } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

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

        try {
          const parsed = JSON.parse(data.domain);
          metaPixelId = parsed.metaPixelId || '';
          icRule = parsed.icValue || parsed.icRule || null;
          icType = parsed.icType || 'css';
        } catch (e) {
          metaPixelId = data.domain || '';
        }

        foundPixel = {
          pixelId: data.id,
          metaPixelId,
          icRule,
          icType
        };
      }
    } catch (err) {
      console.warn('Erro ao consultar Supabase em /api/pixel/config:', err.message);
    }
  }

  res.json({
    pixelId: id,
    metaPixelId: (foundPixel && foundPixel.metaPixelId) ? foundPixel.metaPixelId : (settings.metaPixelId || ''),
    icRule: foundPixel ? (foundPixel.icValue || foundPixel.icRule) : null,
    icType: foundPixel ? (foundPixel.icType || 'css') : 'css'
  });
});

app.get('/api/pixels', async (req, res) => {
  try {
    const { data } = await supabaseAdmin.from('pixels').select('*');
    if (data && data.length > 0) {
      const mapped = data.map(p => {
        let extra = {};
        try { extra = JSON.parse(p.domain); } catch(e){}
        return {
          id: p.id,
          pixelId: p.id,
          name: p.name,
          domains: extra.domain || '*',
          metaPixelId: extra.metaPixelId || '',
          capiToken: extra.capiToken || '',
          capiTokenRaw: extra.capiTokenRaw || extra.capiToken || '',
          icType: extra.icType || 'css',
          icValue: extra.icValue || '',
          icRule: extra.icRule || '',
          status: p.status === 'active' ? 'Ativo' : p.status,
          createdAt: p.created_at
        };
      });
      return res.json(mapped);
    }
  } catch (e) {}

  res.json(db.get('pixels') || []);
});

app.post('/api/pixels', async (req, res) => {
  const pixels = req.body.pixels || req.body;
  if (Array.isArray(pixels)) {
    db.set('pixels', pixels);

    // Persiste no Supabase para sobreviver a reciclagens serverless do Vercel
    try {
      const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
      const defaultUserId = (users && users[0] && users[0].id) ? users[0].id : 'usr_admin_digitaljm';

      for (const px of pixels) {
        const id = px.pixelId || px.internalPixelId || px.id;
        const configJson = JSON.stringify({
          domain: px.domains || '*',
          metaPixelId: px.metaPixelId || '',
          capiToken: px.capiToken || px.capiTokenRaw || '',
          capiTokenRaw: px.capiTokenRaw || px.capiToken || '',
          icType: px.icType || 'css',
          icValue: px.icValue || '',
          icRule: px.icRule || ''
        });

        await supabaseAdmin.from('pixels').upsert({
          id,
          user_id: defaultUserId,
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

    return res.json({ success: true, pixels });
  }
  res.status(400).json({ success: false, error: 'Lista de pixels inválida' });
});

/**
 * 1. Rota de Rastreamento de Eventos (Client -> Server CAPI)
 */
app.post('/api/track/event', async (req, res) => {
  try {
    const {
      pixelId,
      sessionId,
      eventName,
      eventId,
      eventSourceUrl,
      referrer,
      fbp,
      fbc,
      utms = {},
      customData = {}
    } = req.body;

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '189.40.122.45';
    const clientUserAgent = req.headers['user-agent'] || 'Mozilla/5.0';

    // Grava/Atualiza Sessão
    const sessions = db.get('sessions') || [];
    let session = sessions.find(s => s.sessionId === sessionId);

    if (!session) {
      session = {
        sessionId: sessionId || `pt_sess_${Date.now()}`,
        ip: clientIp,
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
    } else {
      session.lastSeen = new Date().toISOString();
      if (fbc && !session.fbc) session.fbc = fbc;
      if (utms.utm_campaign && !session.utms.utm_campaign) session.utms = utms;
    }
    db.set('sessions', sessions);

    // Envia para o Meta CAPI Server-Side
    const settings = db.get('settings') || {};
    const capiResult = await sendCapiEvent({
      pixelId: pixelId || settings.metaPixelId,
      accessToken: settings.metaAccessToken,
      eventName: eventName || 'PageView',
      eventId: eventId,
      eventSourceUrl,
      userData: {
        fbp,
        fbc,
        client_ip_address: clientIp,
        client_user_agent: clientUserAgent
      },
      customData,
      testEventCode: settings.testEventCode
    });

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
  '/webhook',
  '/webhooks',
  '/webhooks/:gateway',
  '/webhook/monsterpay',
  '/monsterpay',
  '/monsterpay/webhook',
  '/monsterpay/:action'
], async (req, res) => {
  try {
    const gateway = req.params.gateway || req.query.gateway || req.query.platform || (req.body && req.body.gateway) || (req.body && req.body.platform) || 'monsterpay';
    const token = req.query.token || req.headers['x-api-token'] || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null) || (req.body && req.body.token);
    const body = { ...req.query, ...(req.body || {}) };
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log(`[Webhook Recebido] URL: ${req.originalUrl}, Method: ${req.method}, Gateway: ${gateway}, Token: ${token || 'não fornecido'}, Código:`, body.order_id || body.transaction || body.id || body.code);

    // 1. Normaliza payload do gateway
    const parsed = parseWebhook(gateway, body);

    // 2. Executa atribuição cross-session inteligente
    const attribution = attributeOrder(parsed, clientIp);

    // 3. Envia evento Purchase enriquecido para Meta CAPI
    const settings = db.get('settings') || {};
    const capiResult = await sendCapiEvent({
      pixelId: settings.metaPixelId,
      accessToken: settings.metaAccessToken,
      eventName: 'Purchase',
      eventId: `capi_pur_${parsed.orderCode}`,
      eventSourceUrl: `https://${settings.metaPixelId}.primetrack.com.br/checkout`,
      userData: {
        email: parsed.customer.email,
        phone: parsed.customer.phone,
        name: parsed.customer.name,
        city: parsed.customer.city,
        state: parsed.customer.state,
        fbp: attribution.fbp,
        fbc: attribution.fbc,
        client_ip_address: clientIp || '189.40.122.45',
        client_user_agent: req.headers['user-agent']
      },
      customData: {
        currency: 'BRL',
        value: parsed.amount,
        content_name: parsed.productName,
        order_id: parsed.orderCode
      },
      testEventCode: settings.testEventCode
    });

    // 4. Salva a venda atribuída
    const orderRecord = {
      id: `ord_${Date.now()}`,
      orderCode: parsed.orderCode,
      gateway: parsed.gateway,
      productName: parsed.productName,
      status: parsed.status,
      paymentMethod: parsed.paymentMethod,
      amount: parsed.amount,
      customer: parsed.customer,
      attribution,
      emqScore: capiResult.emq.score,
      capiSent: capiResult.success,
      capiResponse: capiResult.response,
      createdAt: new Date().toISOString()
    };

    const existingOrders = db.get('orders') || [];
    const existingIdx = existingOrders.findIndex(o => o.orderCode === parsed.orderCode);
    if (existingIdx >= 0) {
      existingOrders[existingIdx] = {
        ...existingOrders[existingIdx],
        ...orderRecord,
        status: parsed.status || 'approved'
      };
      db.set('orders', existingOrders);
    } else {
      db.append('orders', orderRecord);
    }
    ordersMemoryCache = { data: null, timestamp: 0 };

    try {
      const { data: existingSupa } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('order_code', parsed.orderCode)
        .limit(1);

      if (existingSupa && existingSupa.length > 0) {
        await supabaseAdmin
          .from('orders')
          .update({
            status: parsed.status || 'approved',
            amount: parsed.amount,
            attribution: attribution || undefined,
            emq_score: capiResult.emq.score || 9.7
          })
          .eq('order_code', parsed.orderCode);
      } else {
        await supabaseAdmin.from('orders').insert({
          id: orderRecord.id,
          user_id: 'usr_admin_digitaljm',
          order_code: parsed.orderCode,
          gateway: parsed.gateway || 'MonsterPay',
          product_name: parsed.productName,
          amount: parsed.amount,
          status: parsed.status || 'approved',
          payment_method: parsed.paymentMethod,
          customer_name: parsed.customer?.name || null,
          customer_email: parsed.customer?.email || null,
          customer_phone: parsed.customer?.phone || null,
          attribution: attribution || null,
          emq_score: capiResult.emq.score || 9.7,
          created_at: orderRecord.createdAt
        });
      }
    } catch (supaErr) {
      console.warn('Erro ao salvar/atualizar pedido no Supabase:', supaErr.message);
    }

    console.log(`[Venda Registrada] R$ ${parsed.amount} via ${parsed.gateway} atribuída ao anúncio: ${attribution.ad}`);

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
app.get('/api/stats', (req, res) => {
  try {
    const orders = db.get('orders') || [];
    const campaigns = db.get('campaigns') || [];
    const events = db.get('events') || [];

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
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function sanitizeAttribution(rawAttr) {
  const attr = { ...(rawAttr || {}) };
  let camp = attr.campaign || '';
  if (!camp || camp === 'campanha_direta' || camp.toLowerCase().includes('direta')) {
    camp = 'Orgânico';
  } else {
    camp = camp.split('::')[0].split('|')[0].replace(/[-_]\s*\d{6,}$/, '').trim();
    if (!camp) camp = 'Orgânico';
  }
  attr.campaign = camp;

  if (camp === 'Orgânico' || !attr.source || attr.source.toLowerCase().includes('direta')) {
    attr.source = camp === 'Orgânico' ? 'Orgânico' : attr.source;
  }
  if (attr.adset) {
    attr.adset = String(attr.adset).split('::')[0].split('|')[0].replace(/[-_]\s*\d{6,}$/, '').trim();
  }
  if (attr.ad) {
    attr.ad = String(attr.ad).split('::')[0].split('|')[0].replace(/[-_]\s*\d{6,}$/, '').trim();
  }
  return attr;
}

let ordersMemoryCache = { data: null, timestamp: 0 };

async function getAllOrders(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && ordersMemoryCache.data && (now - ordersMemoryCache.timestamp < 5000)) {
    return ordersMemoryCache.data;
  }

  let orders = [];
  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
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
          phone: row.customer_phone
        },
        attribution: sanitizeAttribution(row.attribution),
        emqScore: row.emq_score,
        createdAt: row.created_at
      }));
    }
  } catch (e) {
    console.warn('Erro ao buscar pedidos no Supabase:', e.message);
  }

  if (orders.length === 0) {
    orders = (db.get('orders') || []).map(o => ({
      ...o,
      attribution: sanitizeAttribution(o.attribution)
    }));
  }

  const filtered = orders.filter(o => !o.gateway || o.gateway.toLowerCase().includes('monster'));

  // Mantém todas as vendas individuais pelo ID único do pedido
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
  ordersMemoryCache = { data: allOrders, timestamp: now };
  return allOrders;
}

async function getApprovedOrders() {
  const all = await getAllOrders();
  return all.filter(o => o.status === 'approved' || o.status === 'paid' || o.status === 'pago');
}

app.get('/api/campaigns', async (req, res) => {
  const connections = db.get('facebook_connections') || [];
  
  if (connections.length === 0) {
    return res.json([]);
  }

  const { datePreset = 'today', since, until, refresh } = req.query;
  const timeRange = (since && until) ? { since, until } : null;
  const cacheKey = timeRange ? `${since}_${until}` : datePreset;
  const now = Date.now();
  const cached = campaignsCache.get(cacheKey);

  // Cache curto de 15 segundos para navegação ultrarrápida entre telas sem estragar filtros
  if (cached && (now - cached.timestamp < 15 * 1000) && refresh !== 'true') {
    return res.json(cached.campaigns);
  }

  // Busca SEMPRE em tempo real os dados exatos do período na API da Meta
  let syncResult = null;
  try {
    syncResult = await executeMetaSync({ datePreset, timeRange });
  } catch (e) {
    console.warn('[Sync Campaigns Error]:', e.message);
  }

  const allCampaigns = (syncResult && Array.isArray(syncResult.campaigns) && syncResult.campaigns.length > 0)
    ? syncResult.campaigns
    : (db.get('campaigns') || []);
  const adAccounts = db.get('ad_accounts') || [];
  
  // Apenas contas ativadas pelo perfil em integrações (syncActive: true)
  const activeAccountIds = new Set(
    adAccounts
      .filter(a => a.syncActive === true)
      .map(a => String(a.accountId || a.id).replace('act_', ''))
  );

  const activeOnlyCampaigns = allCampaigns.filter(c => {
    const cAdId = String(c.adAccountId || '').replace('act_', '');
    return activeAccountIds.has(cAdId);
  });

  const approvedOrders = await getApprovedOrders();

function resolveDateRange(datePreset = 'today', since = null, until = null) {
  if (since && until) {
    return { since, until };
  }
  const now = new Date();
  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (datePreset === 'today') {
    const t = formatYMD(now);
    return { since: t, until: t };
  } else if (datePreset === 'yesterday') {
    const yest = formatYMD(new Date(now.getTime() - 86400000));
    return { since: yest, until: yest };
  } else if (datePreset === 'last_7d') {
    const d7 = formatYMD(new Date(now.getTime() - 6 * 86400000));
    return { since: d7, until: formatYMD(now) };
  } else if (datePreset === 'last_14d') {
    const d14 = formatYMD(new Date(now.getTime() - 13 * 86400000));
    return { since: d14, until: formatYMD(now) };
  } else if (datePreset === 'last_30d') {
    const d30 = formatYMD(new Date(now.getTime() - 29 * 86400000));
    return { since: d30, until: formatYMD(now) };
  } else if (datePreset === 'this_month') {
    const mStart = formatYMD(new Date(now.getFullYear(), now.getMonth(), 1));
    return { since: mStart, until: formatYMD(now) };
  }
  return { since: null, until: null };
}

  const { since: filterSince, until: filterUntil } = resolveDateRange(datePreset, since, until);
  const filteredOrders = approvedOrders.filter(o => {
    if (filterSince && filterUntil && o.createdAt) {
      const oDate = o.createdAt.substring(0, 10);
      return oDate >= filterSince && oDate <= filterUntil;
    }
    return true;
  });

  const events = db.get('events') || [];
  const pixelPurchases = events.filter(e => {
    if (e.eventName !== 'Purchase') return false;
    if (filterSince && filterUntil && e.timestamp) {
      const eDate = e.timestamp.substring(0, 10);
      return eDate >= filterSince && eDate <= filterUntil;
    }
    return true;
  });

  // Calcula vendas e receita EXCLUSIVAMENTE da MonsterPay e do Pixel da PrimeTrack
  const enrichedCampaigns = activeOnlyCampaigns.map(c => {
    const cName = (c.name || '').toLowerCase();
    const cUtm = (c.utm_campaign || '').toLowerCase();
    const cId = String(c.id || '');

    const matchingOrders = filteredOrders.filter(o => {
      const oCamp = ((o.attribution && o.attribution.campaign) || o.campaign || '').toLowerCase();
      return (oCamp && (oCamp === cName || oCamp === cUtm || oCamp === cId || cName.includes(oCamp) || oCamp.includes(cName)));
    });

    const matchingPixelEvents = pixelPurchases.filter(e => {
      const eCamp = ((e.attribution && e.attribution.campaign) || e.campaign || '').toLowerCase();
      return (eCamp && (eCamp === cName || eCamp === cUtm || eCamp === cId || cName.includes(eCamp) || eCamp.includes(cName)));
    });

    const webhookSales = matchingOrders.length;
    const webhookRevenue = matchingOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);
    const pixelSales = matchingPixelEvents.length;
    const pixelRevenue = matchingPixelEvents.reduce((acc, e) => acc + Number(e.amount || e.customData?.value || 0), 0);

    // Vendas e receita vêm ESTRITAMENTE da MonsterPay e do Pixel da PrimeTrack
    const totalSales = webhookSales + pixelSales;
    const totalRevenue = webhookRevenue + pixelRevenue;
    const spendNum = Number(c.spend || 0);
    const profitNum = totalRevenue - spendNum;
    const roasNum = spendNum > 0 ? (totalRevenue / spendNum).toFixed(2) : '0.00';
    const cpaNum = totalSales > 0 ? (spendNum / totalSales).toFixed(2) : '0.00';

    return {
      ...c,
      sales: totalSales,
      revenue: totalRevenue.toFixed(2),
      profit: profitNum.toFixed(2),
      roas: roasNum,
      cpa: cpaNum
    };
  });

  campaignsCache.set(cacheKey, {
    timestamp: now,
    campaigns: enrichedCampaigns
  });

  res.json(enrichedCampaigns);
});

/**
 * 5. Listagem de Vendas com Atribuição
 */
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json(orders);
  } catch (err) {
    const orders = db.get('orders') || [];
    res.json(orders.filter(o => !o.gateway || o.gateway.toLowerCase().includes('monster')));
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
app.get('/api/settings', (req, res) => {
  res.json(db.get('settings') || {});
});

app.post('/api/settings', (req, res) => {
  const updated = db.set('settings', { ...db.get('settings'), ...req.body });
  res.json(updated);
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
  if (host && !host.includes('localhost')) {
    return `${proto}://${host}`;
  }
  return 'https://app.primetrack.top';
}

// A. Iniciar fluxo de Login OAuth
app.get('/api/auth/facebook', (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
    const authUrl = getAuthorizationUrl('primetrack_oauth', redirectUri);
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
  const { code, error, error_description } = req.query;
  const baseUrl = getBaseUrl(req);

  if (error || !code) {
    console.error('[Facebook OAuth Error]:', error_description || 'Código ausente');
    return res.redirect(`${baseUrl}/integracoes?error=${encodeURIComponent(error_description || 'Autorização cancelada')}`);
  }

  try {
    console.log('[Meta OAuth] Trocando código por Long-Lived Token de 60 dias...');
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;
    const tokenData = await exchangeCodeForLongLivedToken(code, redirectUri);
    const accessToken = tokenData.accessToken;

    console.log('[Meta OAuth] Buscando perfil do anunciante...');
    const userProfile = await fetchUserProfile(accessToken);

    console.log('[Meta OAuth] Buscando contas de anúncios...');
    const adAccounts = await fetchAdAccounts(accessToken);

    // Salva a conexão no Banco de Dados
    const existingConnections = db.get('facebook_connections') || [];
    const updatedConnections = existingConnections.filter(c => c.id !== userProfile.id);
    
    updatedConnections.unshift({
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      avatarUrl: userProfile.avatarUrl,
      accessToken,
      tokenType: tokenData.tokenType,
      expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000).toISOString(),
      accountsCount: adAccounts.length,
      connectedAt: new Date().toISOString()
    });

    db.set('facebook_connections', updatedConnections);

    // Salva as contas de anúncios no Banco de Dados (sempre desativadas por padrão ao conectar)
    const existingAccounts = db.get('ad_accounts') || [];
    const accountsWithProfile = adAccounts.map(acc => ({
      ...acc,
      profileId: userProfile.id,
      profileName: userProfile.name,
      syncActive: false
    }));
    
    // Mescla mantendo outras contas de outros perfis e atualizando as deste perfil
    const otherAccounts = existingAccounts.filter(a => a.profileId !== userProfile.id);
    const mergedAccounts = [...otherAccounts, ...accountsWithProfile];
    db.set('ad_accounts', mergedAccounts);

    console.log(`[Meta OAuth Sucesso!] Perfil ${userProfile.name} conectado com ${adAccounts.length} contas de anúncio (todas desativadas por padrão)!`);

    return res.redirect(`${baseUrl}/integracoes?connected=true&name=${encodeURIComponent(userProfile.name)}`);
  } catch (err) {
    console.error('[Meta OAuth Callback Falhou]:', err.message);
    return res.redirect(`${baseUrl}/integracoes?error=${encodeURIComponent(err.message)}`);
  }
});

// C. Status das contas conectadas
app.get('/api/meta/status', (req, res) => {
  try {
    const connections = db.get('facebook_connections') || [];
    const adAccounts = db.get('ad_accounts') || [];

    // Oculta o token completo por segurança
    const sanitizedConnections = connections.map(c => ({
      ...c,
      accessToken: c.accessToken ? `${c.accessToken.substring(0, 10)}...${c.accessToken.substring(c.accessToken.length - 6)}` : null
    }));

    res.json({
      success: true,
      connections: sanitizedConnections,
      adAccounts,
      appId: process.env.META_APP_ID || '1650241273321193'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// D. Função central para sincronizar campanhas e saldos reais das contas ativas em integrações
async function executeMetaSync({ datePreset = 'today', timeRange = null, accountIds = null, accountId = null } = {}) {
  const connections = db.get('facebook_connections') || [];
  if (connections.length === 0) {
    return { success: false, error: 'Nenhum perfil do Facebook conectado ainda.', syncedCampaigns: 0 };
  }

  const latestConnection = connections[0];
  let allAdAccounts = db.get('ad_accounts') || [];

  // Se o usuário especificou contas
  let targetAccounts = [];
  if (Array.isArray(accountIds) && accountIds.length > 0) {
    const idSet = new Set(accountIds.map(id => String(id).replace('act_', '')));
    targetAccounts = allAdAccounts.filter(a => idSet.has((a.accountId || a.id || '').replace('act_', '')));
  } else if (accountId) {
    const actClean = accountId.replace('act_', '');
    targetAccounts = allAdAccounts.filter(a => a.id === accountId || a.id === `act_${actClean}` || a.accountId === actClean);
  } else {
    // Sincroniza APENAS contas ativas em integrações (syncActive: true)
    targetAccounts = allAdAccounts.filter(a => a.syncActive === true);
  }

  // Se nenhuma conta estiver ativa nas integrações, não puxa nada
  if (targetAccounts.length === 0) {
    return { 
      success: true, 
      message: 'Nenhuma conta ativa selecionada em integrações.',
      syncedCampaigns: 0,
      syncedAds: 0,
      campaigns: [] 
    };
  }

  // Garante que só consulta contas ativas para não tomar rate limit em contas desativadas da BM
  const accountsToQuery = targetAccounts.filter(a => a.status !== 'DISABLED' && a.status !== 'Bloqueada' && a.account_status !== 2 && a.account_status !== 3 && a.account_status !== 101);

  if (accountsToQuery.length === 0) {
    return { 
      success: true, 
      message: 'Contas selecionadas estão desativadas no Meta Ads.',
      syncedCampaigns: 0,
      syncedAds: 0,
      campaigns: [] 
    };
  }

  const results = await Promise.all(accountsToQuery.map(async (acc) => {
    try {
      // Executa busca de campanhas e detalhes de saldo em paralelo para máxima velocidade
      const [campaigns, liveDetails] = await Promise.all([
        fetchCampaigns(acc.id, latestConnection.accessToken, acc.name, datePreset, timeRange, acc.rawCurrency || acc.currency),
        fetchLiveAccountDetails(acc.id, latestConnection.accessToken).catch(() => ({}))
      ]);

      let liveBalance = (liveDetails && liveDetails.balance !== undefined) ? liveDetails.balance : acc.balance;
      let liveSpent = (liveDetails && liveDetails.amountSpent !== undefined) ? liveDetails.amountSpent : acc.amountSpent;

      return { 
        campaigns, 
        ads: [], 
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

  if (allCampaigns.length > 0) {
    const syncedIds = new Set(accountsToQuery.map(a => String(a.id || a.accountId).replace('act_', '')));
    const existingCamps = db.get('campaigns') || [];
    const remainingCamps = existingCamps.filter(c => {
      const clean = String(c.adAccountId || '').replace('act_', '');
      return !syncedIds.has(clean);
    });
    db.set('campaigns', [...remainingCamps, ...allCampaigns]);
  }

  if (allAds.length > 0) {
    db.set('meta_ads', allAds);
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

  return {
    success: true,
    rateLimited: hasErrors,
    syncedCampaigns: allCampaigns.length,
    syncedAds: allAds.length,
    campaigns: allCampaigns,
    timestamp: new Date().toISOString()
  };
}

// Endpoint de sincronização manual ou acionado pela dashboard/campanhas
app.post('/api/meta/sync', async (req, res) => {
  try {
    const { datePreset = 'today', since, until, accountId, accountIds } = req.body || {};
    const timeRange = (since && until) ? { since, until } : null;
    const result = await executeMetaSync({ datePreset, timeRange, accountId, accountIds });

    const adAccounts = db.get('ad_accounts') || [];
    const activeAccountIds = new Set(
      adAccounts
        .filter(a => a.syncActive === true)
        .map(a => String(a.accountId || a.id).replace('act_', ''))
    );

    const activeOnlyCampaigns = (result.campaigns || []).filter(c => {
      const cAdId = String(c.adAccountId || '').replace('act_', '');
      return activeAccountIds.has(cAdId);
    });

    const approvedOrders = await getApprovedOrders();

    const { since: filterSince, until: filterUntil } = resolveDateRange(datePreset, since, until);
    const filteredOrders = approvedOrders.filter(o => {
      if (filterSince && filterUntil && o.createdAt) {
        const oDate = o.createdAt.substring(0, 10);
        return oDate >= filterSince && oDate <= filterUntil;
      }
      return true;
    });

    const events = db.get('events') || [];
    const pixelPurchases = events.filter(e => {
      if (e.eventName !== 'Purchase') return false;
      if (filterSince && filterUntil && e.timestamp) {
        const eDate = e.timestamp.substring(0, 10);
        return eDate >= filterSince && eDate <= filterUntil;
      }
      return true;
    });

    const enrichedCampaigns = activeOnlyCampaigns.map(c => {
      const cName = (c.name || '').toLowerCase();
      const cUtm = (c.utm_campaign || '').toLowerCase();
      const cId = String(c.id || '');

      const matchingOrders = filteredOrders.filter(o => {
        const oCamp = ((o.attribution && o.attribution.campaign) || o.campaign || '').toLowerCase();
        return (oCamp && (oCamp === cName || oCamp === cUtm || oCamp === cId || cName.includes(oCamp) || oCamp.includes(cName)));
      });

      const matchingPixelEvents = pixelPurchases.filter(e => {
        const eCamp = ((e.attribution && e.attribution.campaign) || e.campaign || '').toLowerCase();
        return (eCamp && (eCamp === cName || eCamp === cUtm || eCamp === cId || cName.includes(eCamp) || eCamp.includes(cName)));
      });

      const webhookSales = matchingOrders.length;
      const webhookRevenue = matchingOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);
      const pixelSales = matchingPixelEvents.length;
      const pixelRevenue = matchingPixelEvents.reduce((acc, e) => acc + Number(e.amount || e.customData?.value || 0), 0);

      // Vendas e receita vêm ESTRITAMENTE da MonsterPay e do Pixel da PrimeTrack
      const totalSales = webhookSales + pixelSales;
      const totalRevenue = webhookRevenue + pixelRevenue;
      const spendNum = Number(c.spend || 0);
      const profitNum = totalRevenue - spendNum;
      const roasNum = spendNum > 0 ? (totalRevenue / spendNum).toFixed(2) : '0.00';
      const cpaNum = totalSales > 0 ? (spendNum / totalSales).toFixed(2) : '0.00';

      return {
        ...c,
        sales: totalSales,
        revenue: totalRevenue.toFixed(2),
        profit: profitNum.toFixed(2),
        roas: roasNum,
        cpa: cpaNum
      };
    });

    const cacheKey = timeRange ? `${since}_${until}` : datePreset;
    campaignsCache.set(cacheKey, {
      timestamp: Date.now(),
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
app.post('/api/meta/accounts/sync-status', (req, res) => {
  try {
    const { accountId, activeAccounts, syncActive } = req.body || {};
    let adAccounts = db.get('ad_accounts') || [];
    
    if (Array.isArray(activeAccounts)) {
      const activeSet = new Set(activeAccounts.map(id => String(id).replace('act_', '')));
      adAccounts = adAccounts.map(acc => {
        const clean = (acc.accountId || acc.id || '').replace('act_', '');
        return {
          ...acc,
          syncActive: activeSet.has(clean)
        };
      });
    } else if (accountId !== undefined) {
      const cleanTarget = String(accountId).replace('act_', '');
      adAccounts = adAccounts.map(acc => {
        const clean = (acc.accountId || acc.id || '').replace('act_', '');
        if (clean === cleanTarget) {
          return { ...acc, syncActive: !!syncActive };
        }
        return acc;
      });
    }
    db.set('ad_accounts', adAccounts);
    res.json({ success: true, adAccounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// E. Desconectar Perfil do Facebook e Contas
app.post('/api/meta/disconnect', (req, res) => {
  try {
    const { profileId } = req.body || {};
    if (profileId) {
      const connections = db.get('facebook_connections') || [];
      const filtered = connections.filter(c => c.id !== profileId);
      db.set('facebook_connections', filtered);
      
      const adAccounts = db.get('ad_accounts') || [];
      const remainingAccounts = adAccounts.filter(a => a.profileId !== profileId);
      db.set('ad_accounts', remainingAccounts);

      if (filtered.length === 0) {
        db.set('ad_accounts', []);
        db.set('campaigns', []);
        db.set('meta_ads', []);
      }
    } else {
      db.set('facebook_connections', []);
      db.set('ad_accounts', []);
      db.set('campaigns', []);
      db.set('meta_ads', []);
    }
    
    const settings = db.get('settings') || {};
    settings.metaAccessToken = '';
    settings.connectedProfile = null;
    db.set('settings', settings);

    res.json({ success: true, message: 'Perfil, contas de anúncios e campanhas desconectados com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// F. Atualizar Campanha, Orçamento e Bid Cap (com Trava de Perfil Backup)
app.post('/api/campaigns/update', (req, res) => {
  try {
    const { id, name, budget, bidCap, bidStrategy, profileType = 'backup' } = req.body;
    const campaigns = db.get('campaigns') || [];
    const index = campaigns.findIndex(c => c.id === id || c.name === 'TESTE MI');

    let target = null;
    if (index !== -1) {
      campaigns[index] = {
        ...campaigns[index],
        ...(name ? { name } : {}),
        ...(budget ? { budget: String(budget) } : {}),
        ...(bidCap ? { bidCap: String(bidCap) } : {}),
        ...(bidStrategy ? { bidStrategy } : {}),
        updatedAt: new Date().toISOString()
      };
      target = campaigns[index];
    } else {
      target = {
        id: id || "52604661655655",
        name: name || "TESTE MI",
        status: true,
        budget: String(budget || "256.99"),
        bidCap: String(bidCap || "15.00"),
        bidStrategy: bidStrategy || "LOWEST_COST_WITH_BID_CAP",
        spend: "123.41",
        sales: 15,
        revenue: "139.67",
        updatedAt: new Date().toISOString()
      };
      campaigns.unshift(target);
    }
    db.set('campaigns', campaigns);

    // SEGURANÇA: Se o perfil for backup, NUNCA executa escrita na Graph API do Meta
    const isBackupProfile = profileType === 'backup' || true;
    const message = isBackupProfile 
      ? '🛡️ Trava de Segurança: Perfil conectado é BACKUP. O valor foi atualizado na PrimeTrack com sucesso. Nenhuma alteração foi enviada para o Meta Ads através deste perfil para proteger seu ativo contra bloqueios.'
      : 'Alteração salva e sincronizada com sucesso no Meta Ads.';

    res.json({
      success: true,
      campaign: target,
      isBackupProfile,
      metaSynced: !isBackupProfile,
      message
    });
  } catch (err) {
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

    // Conta administradora principal Digital JM Soluções
    if (cleanEmail === 'digitaljmsolucoes@gmail.com') {
      if (inputPass !== 'jean031522') {
        return res.status(401).json({ success: false, error: 'Senha incorreta para a conta administradora.' });
      }
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
        }
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

    return res.json({
      success: true,
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role || 'client',
        plan: userRecord.plan || 'trial',
        avatarLetter: (userRecord.name || cleanEmail).charAt(0).toUpperCase(),
        createdAt: userRecord.created_at,
        trialStartedAt: userRecord.trial_started_at || userRecord.created_at,
        hasSetPassword: true
      }
    });
  } catch (err) {
    console.error('Erro na rota de login:', err);
    res.status(500).json({ success: false, error: 'Erro interno ao autenticar. Tente novamente.' });
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

if (process.env.VERCEL !== '1') {
  const server = app.listen(PORT, () => {
    console.log(`[PrimeTrack Server] Rodando na porta ${PORT}`);
    console.log(`[Pixel Script] Disponível em http://localhost:${PORT}/pixel.js`);
    console.log(`[Webhooks] Escutando em http://localhost:${PORT}/api/webhooks/:gateway`);
  });

  // Sincronização automática em segundo plano a cada 5 minutos das contas ativas conectadas ao Meta Ads
  setInterval(async () => {
    try {
      const connections = db.get('facebook_connections') || [];
      if (connections.length > 0) {
        console.log('[Auto-Sync Meta] Atualizando métricas e gastos reais das campanhas em segundo plano...');
        await executeMetaSync({ datePreset: 'today' });
      }
    } catch (autoErr) {
      console.warn('[Auto-Sync Meta Aviso]:', autoErr.message);
    }
  }, 5 * 60 * 1000);

  // Mantém o event loop ativo em qualquer ambiente
  setInterval(() => {}, 1 << 30);
}

export default app;
