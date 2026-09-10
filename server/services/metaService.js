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

    // Converte saldo e gastos em Dólar para Real Brasileiro (R$)
    const realAvailableBalance = isCreditCard ? '0.00' : (rawBalance * rate).toFixed(2);
    const convertedSpent = (rawSpent * rate).toFixed(2);

    return {
      id: acc.id, // ex: act_1092137896602979
      accountId: acc.account_id, // ex: 1092137896602979
      name: acc.name || `Conta ${acc.account_id}`,
      currency: acc.currency || 'BRL',
      rawCurrency: acc.currency,
      amountSpent: convertedSpent,
      balance: realAvailableBalance,
      rawBalanceUsd: isUsd ? rawBalance.toFixed(2) : null,
      isPrepay,
      cardInfo: acc.funding_source_details?.display_string || null,
      account_status: acc.account_status,
      status: acc.account_status === 1 ? 'Ativa' : 'Bloqueada',
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

  const isUsd = data.currency === 'USD';
  const usdRate = isUsd ? await getUsdToBrlRate() : 1.0;

  const isPrepay = data.is_prepay_account === true;
  const isCreditCard = data.funding_source_details?.type === 1 || !isPrepay;
  const rawBalance = Number(data.balance || 0) / 100;
  const rawSpent = Number(data.amount_spent || 0) / 100;

  const realAvailableBalance = isCreditCard ? '0.00' : (rawBalance * usdRate).toFixed(2);
  const convertedSpent = (rawSpent * usdRate).toFixed(2);

  return {
    id: data.id,
    accountId: data.account_id || data.id.replace('act_', ''),
    name: data.name,
    currency: data.currency || 'BRL',
    rawCurrency: data.currency,
    amountSpent: convertedSpent,
    balance: realAvailableBalance,
    rawBalanceUsd: isUsd ? rawBalance.toFixed(2) : null,
    isPrepay,
    cardInfo: data.funding_source_details?.display_string || null,
    account_status: data.account_status,
    status: data.account_status === 1 ? 'Ativa' : 'Bloqueada',
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

  const [campRes, adsetsRes, adsRes, accRes] = await Promise.all([
    fetch(`${GRAPH_BASE_URL}/${actId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,${insightField}&limit=100&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE_URL}/${actId}/adsets?fields=id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,bid_amount,bid_strategy,${insightField}&limit=100&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}/ads?fields=id,name,status,effective_status,campaign_id,adset_id,creative{id,name,thumbnail_url,image_url,video_id},${insightField}&limit=100&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}?fields=currency&access_token=${accessToken}`).catch(() => null)
  ]);
  
  const data = await campRes.json();
  if (data.error) throw new Error(data.error.message);

  let adsetsData = { data: [] };
  try {
    if (adsetsRes) adsetsData = await adsetsRes.json();
  } catch (e) {}

  let adsData = { data: [] };
  try {
    if (adsRes) adsData = await adsRes.json();
  } catch (e) {}

  let metaCurrency = 'BRL';
  try {
    if (accRes) {
      const accData = await accRes.json();
      if (accData.currency) metaCurrency = accData.currency;
    }
  } catch (e) {}

  const isUsd = metaCurrency === 'USD' || accountCurrency === 'USD' || actId.includes('1092137896602979');
  const usdRate = isUsd ? await getUsdToBrlRate() : 1.0;

  // Processa os conjuntos reais vindos direto do Gerenciador de Anúncios da Meta
  const allAdsets = (adsetsData.data || []).map(adset => {
    const insight = adset.insights?.data?.[0] || {};
    const rawSpend = Number(insight.spend || 0);
    const clicks = Number(insight.clicks || 0);
    const impressions = Number(insight.impressions || 0);
    const realSpend = rawSpend * usdRate;
    const rawCtr = impressions > 0 ? ((clicks / impressions) * 100) : Number(insight.ctr || 0);
    const rawCpc = clicks > 0 ? (rawSpend / clicks) : Number(insight.cpc || 0);
    const realCpc = rawCpc * usdRate;
    const rawCpm = impressions > 0 ? ((rawSpend / impressions) * 1000) : Number(insight.cpm || 0);
    const realCpm = rawCpm * usdRate;

    let metaInitCheckouts = 0;
    if (Array.isArray(insight.actions)) {
      const icAction = insight.actions.find(a => 
        a.action_type === 'initiate_checkout' || 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'onsite_web_initiated_checkout'
      );
      if (icAction) metaInitCheckouts = Number(icAction.value || 0);
    }
    const costPerIc = metaInitCheckouts > 0 ? (realSpend / metaInitCheckouts).toFixed(2) : '0.00';

    const rawBidAmount = adset.bid_amount ? (Number(adset.bid_amount) / 100) : null;
    const realBidCap = rawBidAmount !== null ? (rawBidAmount * usdRate).toFixed(2) : '11.02';

    const rawDailyBudget = adset.daily_budget ? (Number(adset.daily_budget) / 100) : null;
    const realBudget = rawDailyBudget !== null ? (rawDailyBudget * usdRate).toFixed(2) : null;

    return {
      id: adset.id,
      adsetId: adset.id,
      campaignId: adset.campaign_id,
      name: adset.name,
      accountName: accountName || 'Conta de Anúncios',
      status: adset.status === 'ACTIVE' || adset.effective_status === 'ACTIVE',
      rawStatus: adset.status,
      effectiveStatus: adset.effective_status || adset.status,
      budget: realBudget,
      budgetType: adset.daily_budget ? 'Diário' : 'Vitalício',
      bidCap: realBidCap,
      bidStrategy: adset.bid_strategy || 'LOWEST_COST_WITH_BID_CAP',
      spend: realSpend.toFixed(2),
      impressions,
      clicks,
      cpc: realCpc.toFixed(2),
      cpm: realCpm.toFixed(2),
      ctr: `${rawCtr.toFixed(2)}%`,
      visits: Math.round(clicks * 0.75),
      ic: metaInitCheckouts,
      costPerIc,
      sales: 0,
      pendingSales: 0,
      revenue: '0.00',
      profit: (-realSpend).toFixed(2),
      roas: '0.00',
      cpa: '0.00',
      arpu: '0.00',
      updatedAt: 'N/A'
    };
  });

  // Processa os anúncios reais vindos direto do Gerenciador de Anúncios da Meta
  const allAds = await Promise.all((adsData.data || []).map(async ad => {
    const insight = ad.insights?.data?.[0] || {};
    const rawSpend = Number(insight.spend || 0);
    const clicks = Number(insight.clicks || 0);
    const impressions = Number(insight.impressions || 0);
    const realSpend = rawSpend * usdRate;
    const rawCtr = impressions > 0 ? ((clicks / impressions) * 100) : Number(insight.ctr || 0);
    const rawCpc = clicks > 0 ? (rawSpend / clicks) : Number(insight.cpc || 0);
    const realCpc = rawCpc * usdRate;
    const rawCpm = impressions > 0 ? ((rawSpend / impressions) * 1000) : Number(insight.cpm || 0);
    const realCpm = rawCpm * usdRate;

    let metaInitCheckouts = 0;
    if (Array.isArray(insight.actions)) {
      const icAction = insight.actions.find(a => 
        a.action_type === 'initiate_checkout' || 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'onsite_web_initiated_checkout'
      );
      if (icAction) metaInitCheckouts = Number(icAction.value || 0);
    }
    const costPerIc = metaInitCheckouts > 0 ? (realSpend / metaInitCheckouts).toFixed(2) : '0.00';
    const thumb = ad.creative?.thumbnail_url || ad.creative?.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';

    let videoUrl = null;
    if (ad.creative?.video_id) {
      try {
        const vidRes = await fetch(`${GRAPH_BASE_URL}/${ad.creative.video_id}?fields=source,picture&access_token=${accessToken}`);
        const vidData = await vidRes.json();
        if (vidData.source) {
          videoUrl = vidData.source;
        }
      } catch (err) {}
    }

    return {
      id: ad.id,
      adId: ad.id,
      campaignId: ad.campaign_id,
      adsetId: ad.adset_id,
      name: ad.name,
      accountName: accountName || 'Conta de Anúncios',
      status: ad.status === 'ACTIVE' || ad.effective_status === 'ACTIVE',
      rawStatus: ad.status,
      effectiveStatus: ad.effective_status || ad.status,
      mediaSrc: thumb,
      thumbnailUrl: thumb,
      videoUrl: videoUrl,
      spend: realSpend.toFixed(2),
      impressions,
      clicks,
      cpc: realCpc.toFixed(2),
      cpm: realCpm.toFixed(2),
      ctr: `${rawCtr.toFixed(2)}%`,
      visits: Math.round(clicks * 0.75),
      ic: metaInitCheckouts,
      costPerIc,
      sales: 0,
      pendingSales: 0,
      revenue: '0.00',
      profit: (-realSpend).toFixed(2),
      roas: '0.00',
      cpa: '0.00',
      arpu: '0.00',
      updatedAt: 'N/A'
    };
  }));

  return (data.data || []).map(c => {
    const insight = c.insights?.data?.[0] || {};
    const rawSpend = Number(insight.spend || 0);
    const clicks = Number(insight.clicks || 0);
    const impressions = Number(insight.impressions || 0);

    const rawDailyBudget = c.daily_budget ? (Number(c.daily_budget) / 100) : null;
    const rawLifetimeBudget = c.lifetime_budget ? (Number(c.lifetime_budget) / 100) : null;

    const baseBudget = rawDailyBudget !== null ? rawDailyBudget : (rawLifetimeBudget !== null ? rawLifetimeBudget : 25.00);

    // Converte automaticamente para Real Brasileiro (BRL / R$) se a conta de anúncios for em Dólar
    const realBudget = baseBudget * usdRate;
    const realSpend = rawSpend * usdRate;
    const rawCtr = impressions > 0 ? ((clicks / impressions) * 100) : Number(insight.ctr || 0);
    const rawCpc = clicks > 0 ? (rawSpend / clicks) : Number(insight.cpc || 0);
    const realCpc = rawCpc * usdRate;
    const rawCpm = impressions > 0 ? ((rawSpend / impressions) * 1000) : Number(insight.cpm || 0);
    const realCpm = rawCpm * usdRate;

    // Extrai Initiate Checkouts registrados pela Meta
    let metaInitCheckouts = 0;
    if (Array.isArray(insight.actions)) {
      const icAction = insight.actions.find(a => 
        a.action_type === 'initiate_checkout' || 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'onsite_web_initiated_checkout'
      );
      if (icAction) metaInitCheckouts = Number(icAction.value || 0);
    }
    const costPerIc = metaInitCheckouts > 0 ? (realSpend / metaInitCheckouts).toFixed(2) : '0.00';

    // Anexa conjuntos e anúncios reais vinculados a esta campanha
    const campAdsets = allAdsets.filter(a => a.campaignId === c.id);
    campAdsets.forEach(as => {
      if (!as.budget) {
        as.budget = realBudget.toFixed(2);
        as.budgetType = c.daily_budget ? 'Diário' : 'Vitalício';
      }
    });

    const campAds = allAds.filter(a => a.campaignId === c.id);

    // A API da Meta é utilizada ESTRITAMENTE para coletar gastos, impressões, cliques, CPC, CPM, CTR e ICS
    // As vendas e receitas vêm exclusivamente das plataformas integradas (MonsterPay) e do Pixel PrimeTrack
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
      rawSpendUsd: isUsd ? rawSpend.toFixed(2) : null,
      rawBudgetUsd: isUsd ? baseBudget.toFixed(2) : null,
      usdRate: isUsd ? usdRate : null,
      impressions,
      clicks,
      cpc: realCpc.toFixed(2),
      cpm: realCpm.toFixed(2),
      ctr: `${rawCtr.toFixed(2)}%`,
      sales: 0,
      revenue: '0.00',
      profit: (-realSpend).toFixed(2),
      roas: '0.00',
      cpa: '0.00',
      initCheckouts: metaInitCheckouts,
      costPerIc: costPerIc,
      adAccountId: actId,
      accountName: accountName || 'Conta de Anúncios',
      currency: 'BRL',
      adsets: campAdsets,
      ads: campAds
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

/**
 * 7. Atualiza status de Campanha, Conjunto ou Anúncio no Meta Ads
 */
export async function updateMetaItemStatus(itemId, status, accessToken) {
  const metaStatus = status ? 'ACTIVE' : 'PAUSED';
  const url = `${GRAPH_BASE_URL}/${itemId}?access_token=${accessToken}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: metaStatus })
  });

  const data = await res.json();

  if (data && data.error) {
    if (data.error.code === 613 || data.error.error_subcode === 4841018) {
      throw new Error('Aguarde alguns segundos para alterar novamente este mesmo item no Meta Ads.');
    }
    throw new Error(data.error.message || 'Erro ao comunicar com o Meta Ads');
  }

  return data;
}

/**
 * 8. Atualiza orçamento (budget), limite de lance (bid_amount), estratégia ou NOME no Meta Ads
 */
export async function updateMetaItemDetails(itemId, { name, budget, bidCap, bidStrategy, itemType = 'campaign' }, accessToken, isUsd = false, usdRate = 1.0) {
  const url = `${GRAPH_BASE_URL}/${itemId}?access_token=${accessToken}`;
  const body = {};

  if (name && typeof name === 'string' && name.trim().length > 0) {
    body.name = name.trim();
  }

  if (budget !== undefined && budget !== null && budget !== '') {
    const numBudget = Number(budget);
    if (!isNaN(numBudget) && numBudget > 0) {
      // Converte se a conta for em USD
      const budgetInAccountCurrency = isUsd ? (numBudget / usdRate) : numBudget;
      const budgetInCents = Math.round(budgetInAccountCurrency * 100);
      body.daily_budget = budgetInCents;
    }
  }

  if (bidCap !== undefined && bidCap !== null && bidCap !== '') {
    const numBid = Number(bidCap);
    if (!isNaN(numBid) && numBid > 0) {
      const bidInAccountCurrency = isUsd ? (numBid / usdRate) : numBid;
      const bidInCents = Math.round(bidInAccountCurrency * 100);
      body.bid_amount = bidInCents;
    }
  }

  if (bidStrategy) {
    body.bid_strategy = bidStrategy;
  }

  if (Object.keys(body).length === 0) {
    return { success: true, message: 'Nenhum campo para atualizar na Meta' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

/**
 * 8.5. Exclui Campanha, Conjunto ou Anúncio no Meta Ads
 */
export async function deleteMetaItem(itemId, accessToken) {
  const url = `${GRAPH_BASE_URL}/${itemId}?access_token=${accessToken}`;
  const res = await fetch(url, { method: 'DELETE' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Erro ao excluir item no Meta Ads');
  return data;
}

/**
 * 9. Duplica campanha no Gerenciador da Meta Ads (na mesma conta ou em outra conta)
 * Clona a campanha e todos os seus conjuntos e anúncios/criativos,
 * permitindo definir um pixel específico (targetPixelId) para a nova conta/campanha.
 */
export async function duplicateMetaCampaign(campaignId, { targetAccountId, targetPixelId, targetToken, copiesCount = 1, status = 'ACTIVE' }, accessToken) {
  const cleanTargetAcc = (targetAccountId || '').replace('act_', '').trim();
  const cleanTargetPixel = targetPixelId ? String(targetPixelId).trim() : null;
  const results = [];

  // Token para operar na conta de destino (se fornecido, usa o targetToken; caso contrário usa o accessToken original)
  const destToken = targetToken || accessToken;

  // Obtém informações da campanha de origem
  let sourceAccountId = cleanTargetAcc;
  let sourceCampData = null;
  try {
    const cInfoRes = await fetch(`${GRAPH_BASE_URL}/${campaignId}?fields=id,name,objective,daily_budget,lifetime_budget,special_ad_categories,buying_type,account_id&access_token=${accessToken}`);
    const cInfo = await cInfoRes.json();
    if (cInfo && !cInfo.error) {
      sourceCampData = cInfo;
      if (cInfo.account_id) sourceAccountId = cInfo.account_id;
    }
  } catch (e) {}

  // Obtém os conjuntos originais com suas configurações completas e seus anúncios
  let originalAdsetsWithAds = [];
  try {
    const adsetFields = 'id,name,status,daily_budget,lifetime_budget,bid_amount,bid_strategy,billing_event,optimization_goal,targeting,promoted_object,destination_type,ads{id,name,status,creative{id,name,object_story_spec,asset_feed_spec,image_url,video_id,body,title,call_to_action_type,link_url},tracking_specs}';
    const adsetsRes = await fetch(`${GRAPH_BASE_URL}/${campaignId}/adsets?fields=${adsetFields}&limit=50&access_token=${accessToken}`);
    const adsetsData = await adsetsRes.json();
    if (adsetsData && adsetsData.data) {
      originalAdsetsWithAds = adsetsData.data;
    }
  } catch (e) {
    console.warn(`[duplicateMetaCampaign] Falha ao pré-carregar adsets da campanha ${campaignId}:`, e.message);
  }

  const effectiveAccountId = cleanTargetAcc || sourceAccountId;
  const formattedActId = effectiveAccountId ? (effectiveAccountId.startsWith('act_') ? effectiveAccountId : `act_${effectiveAccountId}`) : null;
  const isCrossAccount = Boolean(cleanTargetAcc && cleanTargetAcc !== sourceAccountId);

  for (let i = 0; i < copiesCount; i++) {
    try {
      let newCampaignId = null;
      let rootCopyData = null;

      // Se for duplicação entre contas diferentes ou BMs diferentes com perfis distintos:
      if (isCrossAccount && destToken && sourceCampData) {
        const createCampBody = new URLSearchParams({
          access_token: destToken,
          name: sourceCampData.name ? `${sourceCampData.name} — Cópia` : 'Campanha Duplicada',
          objective: sourceCampData.objective || 'OUTCOME_SALES',
          status: status || 'ACTIVE',
          special_ad_categories: JSON.stringify(sourceCampData.special_ad_categories || [])
        });
        if (sourceCampData.daily_budget) createCampBody.append('daily_budget', sourceCampData.daily_budget);
        if (sourceCampData.lifetime_budget) createCampBody.append('lifetime_budget', sourceCampData.lifetime_budget);

        const createCampRes = await fetch(`${GRAPH_BASE_URL}/${formattedActId}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: createCampBody.toString()
        });
        const createdCampData = await createCampRes.json();
        if (createdCampData.id) {
          newCampaignId = createdCampData.id;
          rootCopyData = { copied_campaign_id: newCampaignId, id: newCampaignId };
        } else {
          throw new Error(createdCampData.error?.message || 'Falha ao criar campanha na conta de destino');
        }
      } else {
        // Duplicação nativa na mesma conta/perfil
        const copyUrl = `${GRAPH_BASE_URL}/${campaignId}/copies`;
        const params = new URLSearchParams();
        params.append('access_token', accessToken);
        params.append('deep_copy', 'false');
        params.append('status_option', status || 'ACTIVE');

        if (cleanTargetAcc) {
          params.append('target_account_id', cleanTargetAcc);
        }

        const res = await fetch(copyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const data = await res.json();

        if (data.error) {
          throw new Error(data.error.message || `Meta Graph API Error [${data.error.code || 'Desconhecido'}]`);
        }

        newCampaignId = data.copied_campaign_id || data.id;
        rootCopyData = data;
      }

      // 2. Clona cada conjunto de anúncio para a nova campanha
      if (originalAdsetsWithAds.length > 0 && newCampaignId) {
        for (const adset of originalAdsetsWithAds) {
          try {
            let newAdsetId = null;

            // Se for cross-account OU se especificou novo pixel, cria o adset diretamente na conta de destino
            if ((isCrossAccount || cleanTargetPixel) && formattedActId) {
              try {
                const targetPixelToUse = cleanTargetPixel || adset.promoted_object?.pixel_id;
                const customPromotedObj = targetPixelToUse ? {
                  pixel_id: targetPixelToUse,
                  custom_event_type: adset.promoted_object?.custom_event_type || 'PURCHASE'
                } : null;

                const createAdsetBody = {
                  access_token: destToken,
                  name: adset.name ? `${adset.name} — Cópia` : 'Conjunto Duplicado',
                  campaign_id: newCampaignId,
                  status: status || 'ACTIVE',
                  billing_event: adset.billing_event || 'IMPRESSIONS',
                  optimization_goal: adset.optimization_goal || 'OFFSITE_CONVERSIONS'
                };

                if (customPromotedObj) {
                  createAdsetBody.promoted_object = JSON.stringify(customPromotedObj);
                }

                if (adset.targeting) {
                  createAdsetBody.targeting = typeof adset.targeting === 'object' ? JSON.stringify(adset.targeting) : adset.targeting;
                }
                // Só inclui orçamento de conjunto se a campanha de origem NÃO tiver orçamento no nível de campanha (CBO)
                const hasCampBudget = Boolean(sourceCampData?.daily_budget || sourceCampData?.lifetime_budget);
                if (!hasCampBudget) {
                  if (adset.daily_budget) createAdsetBody.daily_budget = adset.daily_budget;
                  if (adset.lifetime_budget) createAdsetBody.lifetime_budget = adset.lifetime_budget;
                }

                if (adset.bid_amount) createAdsetBody.bid_amount = adset.bid_amount;
                if (adset.bid_strategy) createAdsetBody.bid_strategy = adset.bid_strategy;
                if (adset.destination_type) createAdsetBody.destination_type = adset.destination_type;

                const createAdsetRes = await fetch(`${GRAPH_BASE_URL}/${formattedActId}/adsets`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams(createAdsetBody).toString()
                });
                const createAdsetData = await createAdsetRes.json();
                if (createAdsetData.id) {
                  newAdsetId = createAdsetData.id;
                } else {
                  console.warn(`[duplicateMetaCampaign] Falha ao criar adset customizado:`, createAdsetData.error?.message);
                }
              } catch (customErr) {
                console.warn(`[duplicateMetaCampaign] Erro ao criar adset:`, customErr.message);
              }
            }

            // Fallback para cópia nativa de adset se for na mesma conta/perfil
            if (!newAdsetId && !isCrossAccount) {
              const adsetCopyParams = new URLSearchParams();
              adsetCopyParams.append('access_token', accessToken);
              adsetCopyParams.append('deep_copy', 'false');
              adsetCopyParams.append('status_option', status || 'ACTIVE');
              adsetCopyParams.append('campaign_id', newCampaignId);

              const adsetCopyRes = await fetch(`${GRAPH_BASE_URL}/${adset.id}/copies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: adsetCopyParams.toString()
              });
              const copiedAdsetData = await adsetCopyRes.json();
              newAdsetId = copiedAdsetData.copied_adset_id || copiedAdsetData.id;
            }

            // 3. Clona os anúncios para dentro do novo conjunto
            if (newAdsetId && formattedActId && adset.ads?.data?.length > 0) {
              for (const ad of adset.ads.data) {
                try {
                  let creativeIdToUse = ad.creative?.id;

                  // Se for cross-account, cria o criativo na conta de destino usando destToken
                  if (isCrossAccount && ad.creative?.object_story_spec) {
                    try {
                      const createCreativeBody = new URLSearchParams({
                        access_token: destToken,
                        name: ad.creative.name || ad.name || 'Criativo Duplicado',
                        object_story_spec: JSON.stringify(ad.creative.object_story_spec)
                      });
                      const createCrRes = await fetch(`${GRAPH_BASE_URL}/${formattedActId}/adcreatives`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: createCreativeBody.toString()
                      });
                      const createCrData = await createCrRes.json();
                      if (createCrData.id) {
                        creativeIdToUse = createCrData.id;
                      }
                    } catch (crErr) {
                      console.warn(`[Create AdCreative Cross-Account Error]:`, crErr.message);
                    }
                  }

                  if (creativeIdToUse) {
                    const adParams = new URLSearchParams();
                    adParams.append('access_token', destToken);
                    adParams.append('name', ad.name || 'Anúncio Duplicado');
                    adParams.append('adset_id', newAdsetId);
                    adParams.append('creative', JSON.stringify({ creative_id: creativeIdToUse }));
                    adParams.append('status', status || 'ACTIVE');

                    // Ajusta tracking_specs para o novo pixel se fornecido
                    const pixelForTracking = cleanTargetPixel || adset.promoted_object?.pixel_id;
                    if (pixelForTracking) {
                      const updatedTracking = [
                        { 'action.type': ['offsite_conversion'], fb_pixel: [pixelForTracking] }
                      ];
                      adParams.append('tracking_specs', JSON.stringify(updatedTracking));
                    } else if (ad.tracking_specs) {
                      adParams.append('tracking_specs', JSON.stringify(ad.tracking_specs));
                    }

                    await fetch(`${GRAPH_BASE_URL}/${formattedActId}/ads`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                      body: adParams.toString()
                    });
                  }
                } catch (adErr) {
                  console.warn(`[Clone Ad Error for ${ad.id}]:`, adErr.message);
                }
              }
            }
          } catch (adsetErr) {
            console.warn(`[Clone Adset Error for ${adset.id}]:`, adsetErr.message);
          }
        }
      }

      results.push(rootCopyData || { id: newCampaignId });
    } catch (err) {
      console.warn(`[Duplicate Meta Campaign ${campaignId} (#${i + 1}/${copiesCount}) Error]:`, err.message);
      throw err;
    }
  }

  return { success: true, count: results.length, copiedCampaigns: results };
}
    }
  }

  return { success: true, count: results.length, copiedCampaigns: results };
}
