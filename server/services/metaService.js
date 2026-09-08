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

let cachedUsdRate = 5.0891;
let lastRateFetch = 0;

export async function getUsdToBrlRate() {
  const now = Date.now();
  if (now - lastRateFetch < 15 * 60 * 1000) {
    return cachedUsdRate;
  }
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const data = await res.json();
    if (data?.USDBRL?.bid) {
      cachedUsdRate = Number(data.USDBRL.bid);
      lastRateFetch = now;
    }
  } catch (e) {
    console.warn('Erro ao obter cotação USD/BRL:', e.message);
  }
  return cachedUsdRate;
}

/**
 * 4. Busca todas as Contas de Anúncios vinculadas a esse perfil
 */
export async function fetchAdAccounts(accessToken) {
  const url = `${GRAPH_BASE_URL}/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,balance,is_prepay_account,funding_source_details,business_name,business&limit=100&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  
  const usdRate = await getUsdToBrlRate();

  return (data.data || []).map(acc => {
    const isPrepay = acc.is_prepay_account === true;
    const isCreditCard = acc.funding_source_details?.type === 1 || !isPrepay;
    const isUsd = acc.currency === 'USD';
    const rate = isUsd ? usdRate : 1.0;

    const rawBalance = Number(acc.balance || 0) / 100;
    const rawSpent = Number(acc.amount_spent || 0) / 100;

    // Se for conta pós-paga / cartão de crédito, o saldo disponível é 0.00 (zerado)
    const realAvailableBalance = isCreditCard ? '0.00' : (rawBalance * rate).toFixed(2);
    const convertedSpent = (rawSpent * rate).toFixed(2);

    return {
      id: acc.id, // ex: act_1092137896602979
      accountId: acc.account_id, // ex: 1092137896602979
      name: acc.name || `Conta ${acc.account_id}`,
      currency: 'BRL',
      rawCurrency: acc.currency,
      amountSpent: convertedSpent,
      balance: realAvailableBalance,
      isPrepay,
      cardInfo: acc.funding_source_details?.display_string || null,
      status: acc.account_status === 1 ? 'ACTIVE' : 'DISABLED',
      businessName: acc.business_name || acc.business?.name || 'BM Principal',
      syncActive: false
    };
  });
}

/**
 * 4.1 Busca saldo e métricas em tempo real direto da conta
 */
export async function fetchLiveAccountDetails(adAccountId, accessToken) {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const url = `${GRAPH_BASE_URL}/${actId}?fields=id,name,account_status,currency,amount_spent,balance,is_prepay_account,funding_source_details,business_name&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const usdRate = await getUsdToBrlRate();
  const isUsd = data.currency === 'USD';
  const rate = isUsd ? usdRate : 1.0;

  const isPrepay = data.is_prepay_account === true;
  const isCreditCard = data.funding_source_details?.type === 1 || !isPrepay;
  const rawBalance = Number(data.balance || 0) / 100;
  const rawSpent = Number(data.amount_spent || 0) / 100;

  const realAvailableBalance = isCreditCard ? '0.00' : (rawBalance * rate).toFixed(2);
  const convertedSpent = (rawSpent * rate).toFixed(2);

  return {
    id: data.id,
    accountId: data.account_id || data.id.replace('act_', ''),
    name: data.name,
    currency: 'BRL',
    rawCurrency: data.currency,
    amountSpent: convertedSpent,
    balance: realAvailableBalance,
    isPrepay,
    cardInfo: data.funding_source_details?.display_string || null,
    status: data.account_status === 1 ? 'ACTIVE' : 'DISABLED',
    businessName: data.business_name || 'BM Principal'
  };
}

/**
 * 5. Busca Campanhas reais da Conta de Anúncios com Gastos, Vendas e Receita em Tempo Real (BRL)
 */
export async function fetchCampaigns(adAccountId, accessToken, accountName = '', datePreset = 'today', timeRange = null, accountCurrency = null) {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

  let insightField = `insights.date_preset(${datePreset}){spend,impressions,clicks,cpc,cpm,ctr,actions,action_values}`;
  if (timeRange && timeRange.since && timeRange.until) {
    insightField = `insights.time_range({'since':'${timeRange.since}','until':'${timeRange.until}'}){spend,impressions,clicks,cpc,cpm,ctr,actions,action_values}`;
  }

  const url = `${GRAPH_BASE_URL}/${actId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,${insightField}&limit=100&access_token=${accessToken}`;
  
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const usdRate = await getUsdToBrlRate();
  // Se for conta em Dólar (USD) como a CA01, aplica a taxa de conversão para BRL (Real Brasileiro)
  const isUsd = accountCurrency === 'USD' || (!accountCurrency && actId.includes('1092137896602979'));
  const rate = isUsd ? usdRate : 1.0;

  return (data.data || []).map(c => {
    const insight = c.insights?.data?.[0] || {};
    const rawSpend = Number(insight.spend || 0);
    const clicks = Number(insight.clicks || 0);
    const impressions = Number(insight.impressions || 0);

    const rawDailyBudget = c.daily_budget ? (Number(c.daily_budget) / 100) : null;
    const rawLifetimeBudget = c.lifetime_budget ? (Number(c.lifetime_budget) / 100) : null;

    // Valores reais exatos em Real Brasileiro (R$)
    const baseBudget = rawDailyBudget !== null ? rawDailyBudget : (rawLifetimeBudget !== null ? rawLifetimeBudget : 25.00);
    const realBudget = baseBudget * rate;
    const realSpend = rawSpend * rate;

    // Extrai compras reais e receita reportadas pelo Pixel da Meta
    const actions = insight.actions || [];
    const actionValues = insight.action_values || [];

    const purchaseAction = actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
    const purchaseVal = actionValues.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
    const initCheckoutAction = actions.find(a => a.action_type === 'initiate_checkout' || a.action_type === 'omni_initiated_checkout');

    const pixelSales = purchaseAction ? Number(purchaseAction.value) : 0;
    const rawPixelRevenue = purchaseVal ? Number(purchaseVal.value) : 0;
    const pixelRevenue = rawPixelRevenue * rate;
    const initCheckouts = initCheckoutAction ? Number(initCheckoutAction.value) : 0;

    const profit = pixelRevenue - realSpend;
    const roas = realSpend > 0 ? (pixelRevenue / realSpend).toFixed(2) : '0.00';
    const cpa = pixelSales > 0 ? (realSpend / pixelSales).toFixed(2) : '0.00';
    const realCpc = clicks > 0 ? (realSpend / clicks) : 0;
    const realCpm = impressions > 0 ? (realSpend / impressions) * 1000 : 0;
    const rawCtr = insight.ctr ? Number(insight.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);

    return {
      id: c.id,
      name: c.name,
      status: c.status === 'ACTIVE' || c.effective_status === 'ACTIVE',
      rawStatus: c.status,
      effectiveStatus: c.effective_status || c.status,
      objective: c.objective,
      budget: realBudget.toFixed(2),
      budgetType: c.daily_budget ? 'Diário' : 'Vitalício',
      spend: realSpend.toFixed(2),
      impressions,
      clicks,
      cpc: realCpc.toFixed(2),
      cpm: realCpm.toFixed(2),
      ctr: rawCtr.toFixed(2),
      sales: pixelSales,
      revenue: pixelRevenue.toFixed(2),
      profit: profit.toFixed(2),
      roas,
      cpa,
      initCheckouts,
      adAccountId: actId,
      accountName: accountName || 'Conta de Anúncios',
      currency: 'BRL'
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
