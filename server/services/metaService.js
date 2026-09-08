import dotenv from 'dotenv';
import { db } from '../db.js';
dotenv.config();

const META_APP_ID = process.env.META_APP_ID || '1650241273321193';
const META_APP_SECRET = process.env.META_APP_SECRET || '3fde35c68c4bde3e0a5bd8acc4cbf4c7';
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3001/api/auth/facebook/callback';
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * 1. Gera URL oficial do Facebook Login OAuth com permissões de anúncios
 */
export function getAuthorizationUrl(state = 'primetrack_oauth', customRedirectUri = null) {
  const scopes = [
    'public_profile',
    'ads_read',
    'ads_management',
    'business_management'
  ].join(',');

  const redirectUri = customRedirectUri || META_REDIRECT_URI || 'https://app.primetrack.top/api/auth/facebook/callback';

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: redirectUri,
    state: state,
    scope: scopes,
    response_type: 'code'
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * 2. Troca o código temporário retornado pelo Facebook por um Token de 60 Dias (Long-Lived)
 */
export async function exchangeCodeForLongLivedToken(code, customRedirectUri = null) {
  try {
    const redirectUri = customRedirectUri || META_REDIRECT_URI || 'https://app.primetrack.top/api/auth/facebook/callback';
    // Passo A: Troca 'code' por Short-Lived Access Token
    const shortTokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: redirectUri,
      code: code
    });

    const shortTokenRes = await fetch(`${GRAPH_BASE_URL}/oauth/access_token?${shortTokenParams.toString()}`);
    const shortTokenData = await shortTokenRes.json();

    if (shortTokenData.error) {
      throw new Error(`Erro ao obter token inicial: ${shortTokenData.error.message}`);
    }

    const shortToken = shortTokenData.access_token;

    // Passo B: Troca o token de curta duração por um de longa duração (60 dias)
    const longTokenParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortToken
    });

    const longTokenRes = await fetch(`${GRAPH_BASE_URL}/oauth/access_token?${longTokenParams.toString()}`);
    const longTokenData = await longTokenRes.json();

    if (longTokenData.error) {
      // Fallback para o token curto caso a troca falhe
      return {
        accessToken: shortToken,
        expiresIn: shortTokenData.expires_in || 7200,
        tokenType: 'short_lived'
      };
    }

    return {
      accessToken: longTokenData.access_token,
      expiresIn: longTokenData.expires_in || (60 * 86400),
      tokenType: 'long_lived_60_days'
    };
  } catch (err) {
    console.error('[Meta OAuth Error]:', err);
    throw err;
  }
}

/**
 * 3. Busca o perfil do usuário conectado (Nome, ID, Foto)
 */
export async function fetchUserProfile(accessToken) {
  const url = `${GRAPH_BASE_URL}/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return {
    id: data.id,
    name: data.name,
    email: data.email || null,
    avatarUrl: data.picture?.data?.url || null
  };
}

/**
 * 4. Busca todas as Contas de Anúncios vinculadas a esse perfil
 */
export async function fetchAdAccounts(accessToken) {
  const url = `${GRAPH_BASE_URL}/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,balance,business_name,business&limit=100&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  
  return (data.data || []).map(acc => ({
    id: acc.id, // ex: act_1092137896602979
    accountId: acc.account_id, // ex: 1092137896602979
    name: acc.name || `Conta ${acc.account_id}`,
    currency: acc.currency || 'BRL',
    amountSpent: (Number(acc.amount_spent || 0) / 100).toFixed(2),
    balance: (Number(acc.balance || 0) / 100).toFixed(2),
    status: acc.account_status === 1 ? 'ACTIVE' : 'DISABLED',
    businessName: acc.business_name || acc.business?.name || 'BM Principal',
    syncActive: false
  }));
}

/**
 * 4.1 Busca saldo e métricas em tempo real direto da conta
 */
export async function fetchLiveAccountDetails(adAccountId, accessToken) {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const url = `${GRAPH_BASE_URL}/${actId}?fields=id,name,account_status,currency,amount_spent,balance,business_name&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  
  return {
    id: data.id,
    accountId: data.account_id || data.id.replace('act_', ''),
    name: data.name,
    currency: data.currency || 'BRL',
    amountSpent: (Number(data.amount_spent || 0) / 100).toFixed(2),
    balance: (Number(data.balance || 0) / 100).toFixed(2),
    status: data.account_status === 1 ? 'ACTIVE' : 'DISABLED',
    businessName: data.business_name || 'BM Principal'
  };
}


/**
 * Taxa de conversão USD -> BRL
 */
let cachedUsdRate = 5.60;
let lastUsdRateFetch = 0;

async function getUsdBrlRate() {
  const now = Date.now();
  if (now - lastUsdRateFetch < 3600000 && cachedUsdRate) {
    return cachedUsdRate;
  }
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const data = await res.json();
    if (data.USDBRL && data.USDBRL.bid) {
      cachedUsdRate = Number(data.USDBRL.bid);
      lastUsdRateFetch = now;
      return cachedUsdRate;
    }
  } catch (e) {}
  return cachedUsdRate || 5.60;
}

/**
 * 5. Busca Campanhas reais da Conta de Anúncios com Gastos em Tempo Real (Convertido para BRL)
 */
export async function fetchCampaigns(adAccountId, accessToken, accountName = '', datePreset = 'today') {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  
  // Verifica a moeda da conta a partir da lista salva ou consulta rápida
  let isUsd = false;
  let accountCurrency = 'BRL';
  try {
    const savedAccs = db.get('ad_accounts') || [];
    const found = savedAccs.find(a => a.id === actId || a.accountId === actId.replace('act_', ''));
    if (found) {
      accountCurrency = found.currency || 'BRL';
      if (found.currency === 'USD') {
        isUsd = true;
      }
    }
  } catch (e) {}

  const rate = isUsd ? await getUsdBrlRate() : 1.0;

  const url = `${GRAPH_BASE_URL}/${actId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,insights.date_preset(${datePreset}){spend,impressions,clicks,cpc,cpm,ctr}&limit=100&access_token=${accessToken}`;
  
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  return (data.data || []).map(c => {
    const insight = c.insights?.data?.[0] || {};
    const rawSpend = Number(insight.spend || 0);
    const clicks = Number(insight.clicks || 0);
    const impressions = Number(insight.impressions || 0);

    const rawDailyBudget = c.daily_budget ? (Number(c.daily_budget) / 100) : null;
    const rawLifetimeBudget = c.lifetime_budget ? (Number(c.lifetime_budget) / 100) : null;

    // Valores reais na moeda nativa da conta (ex.: USD se for conta em dólar, BRL se for conta em real)
    const nativeBudget = rawDailyBudget !== null ? rawDailyBudget : (rawLifetimeBudget !== null ? rawLifetimeBudget : 25.00);
    const nativeSpend = rawSpend;

    // Valores convertidos para BRL (para consolidação se necessário)
    const spendBrl = isUsd ? rawSpend * rate : rawSpend;
    const budgetBrl = isUsd ? nativeBudget * rate : nativeBudget;

    const rawCpc = insight.cpc ? Number(insight.cpc) : (clicks > 0 ? nativeSpend / clicks : 0);
    const rawCpm = insight.cpm ? Number(insight.cpm) : (impressions > 0 ? (nativeSpend / impressions) * 1000 : 0);
    const rawCtr = insight.ctr ? Number(insight.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);

    return {
      id: c.id,
      name: c.name,
      status: c.status === 'ACTIVE' || c.effective_status === 'ACTIVE',
      rawStatus: c.status,
      effectiveStatus: c.effective_status || c.status,
      objective: c.objective,
      budget: nativeBudget.toFixed(2),
      budgetBrl: budgetBrl.toFixed(2),
      budgetType: c.daily_budget ? 'Diário' : 'Vitalício',
      spend: nativeSpend.toFixed(2),
      spendBrl: spendBrl.toFixed(2),
      rawSpendUsd: isUsd ? rawSpend.toFixed(2) : null,
      impressions,
      clicks,
      cpc: rawCpc.toFixed(2),
      cpm: rawCpm.toFixed(2),
      ctr: rawCtr.toFixed(2),
      sales: 0,
      revenue: '0.00',
      profit: (0 - nativeSpend).toFixed(2),
      roas: '0.00',
      cpa: '0.00',
      adAccountId: actId,
      accountName: accountName || 'Conta de Anúncios',
      currency: accountCurrency
    };
  });
}

/**
 * 6. Busca Anúncios e Criativos de Vídeo/Imagem da Conta
 */
export async function fetchAdsWithCreatives(adAccountId, accessToken) {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const url = `${GRAPH_BASE_URL}/${actId}/ads?fields=id,name,status,campaign_id,adset_id,creative{id,name,thumbnail_url,image_url,video_id}&access_token=${accessToken}`;

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const ads = [];
  for (const ad of (data.data || [])) {
    let videoUrl = null;

    // Se o criativo tiver vídeo, busca a URL direta do arquivo de vídeo (mp4)
    if (ad.creative?.video_id) {
      try {
        const vidRes = await fetch(`${GRAPH_BASE_URL}/${ad.creative.video_id}?fields=source,picture&access_token=${accessToken}`);
        const vidData = await vidRes.json();
        if (vidData.source) {
          videoUrl = vidData.source;
        }
      } catch (err) {
        console.warn(`Não foi possível buscar URL de vídeo do criativo ${ad.creative.id}`);
      }
    }

    ads.push({
      id: ad.id,
      name: ad.name,
      status: ad.status === 'ACTIVE',
      campaignId: ad.campaign_id,
      adsetId: ad.adset_id,
      creativeId: ad.creative?.id,
      creativeName: ad.creative?.name,
      thumbnailUrl: ad.creative?.thumbnail_url || ad.creative?.image_url,
      videoUrl: videoUrl,
      type: videoUrl ? 'video' : 'image'
    });
  }

  return ads;
}
