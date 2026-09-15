import dotenv from 'dotenv';
import { db } from '../db.js';
dotenv.config();

const META_APP_ID = process.env.META_APP_ID || '1650241273321193';
const META_APP_SECRET = process.env.META_APP_SECRET || '3fde35c68c4bde3e0a5bd8acc4cbf4c7';
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:3001/api/auth/facebook/callback';
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
export const DEFAULT_UTM_TAGS = 'utm_source=FB|{{ad.account_id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}';

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
    response_type: 'code',
    auth_type: 'rerequest',
    return_scopes: 'true'
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

  const isMaximum = datePreset === 'maximum' || datePreset === 'maximo' || timeRange?.isMaximum;

  // 1. Calcula o intervalo exato de datas (time_range) com base no fuso horário de Brasília (UTC-3)
  let effectiveRange = timeRange;
  if (!isMaximum && (!effectiveRange || !effectiveRange.since || !effectiveRange.until)) {
    const now = new Date();
    const spNow = new Date(now.getTime() - (3 * 3600 * 1000));
    const formatYMD = (d) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    if (datePreset === 'yesterday') {
      const yest = formatYMD(new Date(spNow.getTime() - 86400000));
      effectiveRange = { since: yest, until: yest };
    } else if (datePreset === 'last_7d') {
      const d7 = formatYMD(new Date(spNow.getTime() - 6 * 86400000));
      effectiveRange = { since: d7, until: formatYMD(spNow) };
    } else if (datePreset === 'last_14d' || datePreset === 'last_15d') {
      const d15 = formatYMD(new Date(spNow.getTime() - 14 * 86400000));
      effectiveRange = { since: d15, until: formatYMD(spNow) };
    } else if (datePreset === 'last_30d') {
      const d30 = formatYMD(new Date(spNow.getTime() - 29 * 86400000));
      effectiveRange = { since: d30, until: formatYMD(spNow) };
    } else if (datePreset === 'this_month') {
      const mStart = `${spNow.getUTCFullYear()}-${String(spNow.getUTCMonth() + 1).padStart(2, '0')}-01`;
      effectiveRange = { since: mStart, until: formatYMD(spNow) };
    } else if (datePreset === 'last_month') {
      const y = spNow.getUTCFullYear();
      const m = spNow.getUTCMonth();
      const prevMonthDate = new Date(Date.UTC(y, m - 1, 1));
      const lastDayPrevMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const prevYear = prevMonthDate.getUTCFullYear();
      const prevMonthStr = String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0');
      const since = `${prevYear}-${prevMonthStr}-01`;
      const until = `${prevYear}-${prevMonthStr}-${String(lastDayPrevMonth).padStart(2, '0')}`;
      effectiveRange = { since, until };
    } else {
      // Padrão: 'today' (dia de hoje em Brasília)
      const t = formatYMD(spNow);
      effectiveRange = { since: t, until: t };
    }
  }

  const timeParam = isMaximum 
    ? 'date_preset=maximum' 
    : `time_range=${encodeURIComponent(JSON.stringify({ since: effectiveRange.since, until: effectiveRange.until }))}`;

  // 2. Busca métricas direto da Insights API (imune a rate-limits de gerenciamento e no fuso correto)
  const [campInsightsRes, adsetInsightsRes, adInsightsRes, campRes, adsetsRes, adsRes, accRes] = await Promise.all([
    fetch(`${GRAPH_BASE_URL}/${actId}/insights?level=campaign&${timeParam}&fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,cpm,ctr,actions,action_values&limit=100&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}/insights?level=adset&${timeParam}&fields=adset_id,adset_name,spend,impressions,clicks,cpc,cpm,ctr,actions,action_values&limit=250&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}/insights?level=ad&${timeParam}&fields=ad_id,ad_name,spend,impressions,clicks,cpc,cpm,ctr,actions,action_values&limit=250&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,bid_strategy&limit=100&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}/adsets?fields=id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,bid_amount,bid_strategy&limit=250&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}/ads?fields=id,name,status,effective_status,campaign_id,adset_id,adset{id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,bid_amount,bid_strategy},creative{id,name,thumbnail_url,image_url,video_id}&limit=250&access_token=${accessToken}`).catch(() => null),
    fetch(`${GRAPH_BASE_URL}/${actId}?fields=currency&access_token=${accessToken}`).catch(() => null)
  ]);

  // Mapas de Insights reais para o período
  const campInsightsMap = new Map();
  try {
    if (campInsightsRes) {
      const ciData = await campInsightsRes.json();
      (ciData.data || []).forEach(i => campInsightsMap.set(String(i.campaign_id), i));
    }
  } catch (e) {}

  const adsetInsightsMap = new Map();
  try {
    if (adsetInsightsRes) {
      const aiData = await adsetInsightsRes.json();
      (aiData.data || []).forEach(i => adsetInsightsMap.set(String(i.adset_id), i));
    }
  } catch (e) {}

  const adInsightsMap = new Map();
  try {
    if (adInsightsRes) {
      const adiData = await adInsightsRes.json();
      (adiData.data || []).forEach(i => adInsightsMap.set(String(i.ad_id), i));
    }
  } catch (e) {}

  // Estrutura das campanhas
  let data = { data: [] };
  try {
    if (campRes) {
      const cd = await campRes.json();
      if (Array.isArray(cd.data)) data = cd;
    }
  } catch (e) {}

  let metaCurrency = 'BRL';
  try {
    if (accRes) {
      const accData = await accRes.json();
      if (accData.currency) metaCurrency = accData.currency;
    }
  } catch (e) {}

  const isUsd = metaCurrency === 'USD' || accountCurrency === 'USD' || actId.includes('1092137896602979') || actId.includes('2013649985959956') || actId.includes('1084136023986167') || actId.includes('1588922422580250');
  const usdRate = isUsd ? await getUsdToBrlRate() : 1.0;

  // Fallback: se a Meta bloquear leitura da estrutura por rate limit, recupera do db local
  const cleanAct = actId.replace('act_', '');
  const storedCampaigns = (db.get('campaigns') || []).filter(c => 
    (c.adAccountId || '').replace('act_', '') === cleanAct
  );

  // Consulta em tempo real via batch dos status das campanhas caso venha vazio ou precise de confirmação precisa
  if (!data.data || data.data.length === 0) {
    if (storedCampaigns.length > 0) {
      try {
        const campIdsToQuery = storedCampaigns.map(c => c.id).filter(Boolean);
        if (campIdsToQuery.length > 0 && accessToken) {
          const batch = campIdsToQuery.slice(0, 50).map(id => ({
            method: 'GET',
            relative_url: `${id}?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,bid_strategy`
          }));
          const batchRes = await fetch(`${GRAPH_BASE_URL}/?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch })
          }).catch(() => null);
          if (batchRes) {
            const batchResults = await batchRes.json().catch(() => []);
            if (Array.isArray(batchResults)) {
              const liveMap = new Map();
              batchResults.forEach(item => {
                if (item.code === 200 && item.body) {
                  try {
                    const b = JSON.parse(item.body);
                    if (b.id) liveMap.set(String(b.id), b);
                  } catch (e) {}
                }
              });
              storedCampaigns.forEach(c => {
                const live = liveMap.get(String(c.id));
                if (live) {
                  c.rawStatus = live.status;
                  c.effectiveStatus = live.effective_status;
                  c.status = (live.status === 'ACTIVE' || live.status === true) &&
                             live.status !== 'PAUSED' &&
                             live.effective_status !== 'PAUSED' &&
                             live.effective_status !== 'CAMPAIGN_PAUSED';
                  if (live.daily_budget !== undefined) c.daily_budget = live.daily_budget;
                  if (live.lifetime_budget !== undefined) c.lifetime_budget = live.lifetime_budget;
                  if (live.bid_strategy !== undefined) c.bidStrategy = live.bid_strategy;
                }
              });
            }
          }
        }
      } catch (eBatchCamp) {}

      data = {
        data: storedCampaigns.map(c => {
          const rawDaily = c.daily_budget ? (Number(c.daily_budget) / 100) : null;
          const rawLifetime = c.lifetime_budget ? (Number(c.lifetime_budget) / 100) : null;
          const nameUpper = (c.name || '').toUpperCase();
          const explicitAboInName = nameUpper.includes('ABO');
          const explicitCboInName = nameUpper.includes('CBO') || nameUpper.includes('BID') || nameUpper.includes('COST CAP');

          const hasCampBudget = Boolean(c.daily_budget || c.lifetime_budget || (c.isCbo === true) || (c.budgetType === 'Diário' && !c.isAbo));
          const hasBidStrategy = c.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' || c.bidStrategy === 'COST_CAP' || (c.bidCap && Number(c.bidCap) > 0);

          // Identificação definitiva CBO vs ABO:
          // Se tiver orçamento em nível de campanha, isCbo: true, BID CAP ou CBO no nome -> CBO
          // Só é ABO se NÃO for CBO
          const isCampCbo = Boolean(explicitCboInName || c.isCbo === true || hasBidStrategy || hasCampBudget);
          const isCampAbo = !isCampCbo;
          let campDailyBudget = null;
          if (isCampCbo) {
            const rawVal = (c.rawBudgetUsd !== null && c.rawBudgetUsd !== undefined && Number(c.rawBudgetUsd) > 0)
              ? Number(c.rawBudgetUsd)
              : (isUsd ? (Number(c.budget || 25) / usdRate) : Number(c.budget || 25));
            campDailyBudget = Math.round(rawVal * 100);
          }
          const isPaused = !c.status || c.rawStatus === 'PAUSED' || c.effectiveStatus === 'PAUSED' || c.effectiveStatus === 'CAMPAIGN_PAUSED';
          return {
            id: c.id,
            name: c.name,
            status: isPaused ? 'PAUSED' : 'ACTIVE',
            effective_status: isPaused ? 'PAUSED' : (c.effectiveStatus || 'ACTIVE'),
            objective: c.objective,
            daily_budget: campDailyBudget,
            bid_strategy: isCampAbo ? 'LOWEST_COST_WITHOUT_CAP' : (c.bidStrategy || 'LOWEST_COST_WITHOUT_CAP'),
            _fromFallback: true,
            _originalBudgetBrl: c.budget,
            _originalIsAbo: isCampAbo
          };
        })
      };
    }
  }

  // Estrutura dos conjuntos
  let adsetsData = { data: [] };
  try {
    if (adsetsRes) {
      const asd = await adsetsRes.json();
      if (Array.isArray(asd.data)) adsetsData = asd;
    }
  } catch (e) {}

  // Se a consulta em nível de conta falhou (por exemplo rate limit), busca os adsets de cada campanha individual
  if (!adsetsData.data || adsetsData.data.length === 0) {
    const liveCampIds = (data.data || []).map(c => c.id).filter(Boolean);
    if (liveCampIds.length > 0 && accessToken) {
      try {
        const campAdsetsBatch = liveCampIds.slice(0, 50).map(id => ({
          method: 'GET',
          relative_url: `${id}/adsets?fields=id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,bid_amount,bid_strategy`
        }));
        const campBatchRes = await fetch(`${GRAPH_BASE_URL}/?access_token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: campAdsetsBatch })
        }).catch(() => null);
        if (campBatchRes) {
          const batchResults = await campBatchRes.json().catch(() => []);
          if (Array.isArray(batchResults)) {
            const fetchedAdsets = [];
            batchResults.forEach(item => {
              if (item.code === 200 && item.body) {
                try {
                  const b = JSON.parse(item.body);
                  if (Array.isArray(b.data)) fetchedAdsets.push(...b.data);
                } catch (e) {}
              }
            });
            if (fetchedAdsets.length > 0) {
              adsetsData = { data: fetchedAdsets };
            }
          }
        }
      } catch (eBatchCampAdsets) {}
    }
  }

  if (!adsetsData.data || adsetsData.data.length === 0) {
    const fallbackAdsets = storedCampaigns.flatMap(c => {
      const campNameUpper = (c.name || '').toUpperCase();
      const explicitCbo = campNameUpper.includes('CBO') || campNameUpper.includes('BID') || campNameUpper.includes('COST CAP');
      const hasCampBudget = Boolean(c.daily_budget || c.lifetime_budget || (c.isCbo === true) || (c.budgetType === 'Diário' && !c.isAbo));
      const hasBidStrategy = c.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' || c.bidStrategy === 'COST_CAP' || (c.bidCap && Number(c.bidCap) > 0);
      const isCampCbo = Boolean(explicitCbo || c.isCbo === true || hasBidStrategy || hasCampBudget);
      const isCampAbo = !isCampCbo;
      return (c.adsets || []).map(a => ({
        ...a,
        _parentIsAbo: isCampAbo
      }));
    });
    if (fallbackAdsets.length > 0) {
      // Quando a leitura em nível de conta é bloqueada por rate limit (erro 17),
      // a chamada em lote direta aos IDs individuais dos conjuntos consulta o status real em tempo real
      try {
        const adsetIdsToQuery = fallbackAdsets.map(a => a.id || a.adsetId).filter(Boolean);
        if (adsetIdsToQuery.length > 0 && accessToken) {
          const batch = adsetIdsToQuery.slice(0, 50).map(id => ({
            method: 'GET',
            relative_url: `${id}?fields=id,name,status,effective_status`
          }));
          const batchRes = await fetch(`${GRAPH_BASE_URL}/?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch })
          }).catch(() => null);
          if (batchRes) {
            const batchResults = await batchRes.json().catch(() => []);
            if (Array.isArray(batchResults)) {
              const statusMap = new Map();
              batchResults.forEach(item => {
                if (item.code === 200 && item.body) {
                  try {
                    const b = JSON.parse(item.body);
                    if (b.id) statusMap.set(String(b.id), b);
                  } catch (e) {}
                }
              });
              fallbackAdsets.forEach(a => {
                const live = statusMap.get(String(a.id || a.adsetId));
                if (live) {
                  const isLivePaused = live.status === 'PAUSED' || live.effective_status === 'PAUSED' || live.effective_status === 'ADSET_PAUSED';
                  a.rawStatus = live.status;
                  a.effectiveStatus = live.effective_status;
                  a.status = !isLivePaused;
                }
              });
            }
          }
        }
      } catch (eBatch) {}

      adsetsData = { data: fallbackAdsets.map(a => {
        const isAboAdset = Boolean(a._parentIsAbo || a.isAbo);
        const rawBudgetVal = (a.rawBudgetUsd !== null && a.rawBudgetUsd !== undefined && Number(a.rawBudgetUsd) > 0)
          ? Number(a.rawBudgetUsd)
          : (isUsd ? (Number(a.budget || 10) / usdRate) : Number(a.budget || 10));

        let rawBidVal = null;
        if (!isAboAdset && a.bidCap && Number(a.bidCap) > 0 && Number(a.bidCap) < 500) {
          rawBidVal = (a.rawBidCapUsd !== null && a.rawBidCapUsd !== undefined && Number(a.rawBidCapUsd) > 0)
            ? Number(a.rawBidCapUsd)
            : (isUsd ? (Number(a.bidCap) / usdRate) : Number(a.bidCap));
        }

        const isPaused = !a.status || a.rawStatus === 'PAUSED' || a.effectiveStatus === 'PAUSED' || a.effectiveStatus === 'ADSET_PAUSED';
        return {
          id: a.id || a.adsetId,
          name: a.name,
          campaign_id: a.campaignId,
          status: isPaused ? 'PAUSED' : 'ACTIVE',
          effective_status: isPaused ? 'PAUSED' : (a.effectiveStatus || 'ACTIVE'),
          daily_budget: Math.round(rawBudgetVal * 100),
          bid_amount: rawBidVal !== null ? Math.round(rawBidVal * 100) : null,
          bid_strategy: isAboAdset ? 'LOWEST_COST_WITHOUT_CAP' : (a.bidStrategy || 'LOWEST_COST_WITHOUT_CAP'),
          _fromFallback: true,
          _originalBudgetBrl: a.budget,
          _originalBidCapBrl: isAboAdset ? null : a.bidCap
        };
      }) };
    }
  }

  // Estrutura dos anúncios
  let adsData = { data: [] };
  try {
    if (adsRes) {
      const ad = await adsRes.json();
      if (Array.isArray(ad.data)) adsData = ad;
    }
  } catch (e) {}

  // Se a consulta em nível de conta falhou (por exemplo rate limit), busca os ads de cada campanha individual
  if (!adsData.data || adsData.data.length === 0) {
    const liveCampIds = (data.data || []).map(c => c.id).filter(Boolean);
    if (liveCampIds.length > 0 && accessToken) {
      try {
        const campAdsBatch = liveCampIds.slice(0, 50).map(id => ({
          method: 'GET',
          relative_url: `${id}/ads?fields=id,name,status,effective_status,campaign_id,adset_id,adset{id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,bid_amount,bid_strategy},creative{id,name,thumbnail_url,image_url}`
        }));
        const campAdsBatchRes = await fetch(`${GRAPH_BASE_URL}/?access_token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: campAdsBatch })
        }).catch(() => null);
        if (campAdsBatchRes) {
          const batchResults = await campAdsBatchRes.json().catch(() => []);
          if (Array.isArray(batchResults)) {
            const fetchedAds = [];
            batchResults.forEach(item => {
              if (item.code === 200 && item.body) {
                try {
                  const b = JSON.parse(item.body);
                  if (Array.isArray(b.data)) fetchedAds.push(...b.data);
                } catch (e) {}
              }
            });
            if (fetchedAds.length > 0) {
              adsData = { data: fetchedAds };
            }
          }
        }
      } catch (eBatchCampAds) {}
    }
  }

  // Se a consulta de anúncios retornou os conjuntos dentro de 'adset', mescla ou preenche adsetsData
  if (Array.isArray(adsData.data) && adsData.data.length > 0) {
    const existingAdsetIds = new Set((adsetsData.data || []).map(a => String(a.id)));
    const additionalAdsets = [];
    adsData.data.forEach(ad => {
      if (ad.adset && ad.adset.id && !existingAdsetIds.has(String(ad.adset.id))) {
        existingAdsetIds.add(String(ad.adset.id));
        additionalAdsets.push({
          id: ad.adset.id,
          name: ad.adset.name || 'Conjunto de Anúncios',
          status: ad.adset.status || ad.status || 'ACTIVE',
          effective_status: ad.adset.effective_status || ad.effective_status || 'ACTIVE',
          campaign_id: ad.adset.campaign_id || ad.campaign_id,
          daily_budget: ad.adset.daily_budget,
          lifetime_budget: ad.adset.lifetime_budget,
          bid_amount: ad.adset.bid_amount,
          bid_strategy: ad.adset.bid_strategy
        });
      }
    });
    if (additionalAdsets.length > 0) {
      adsetsData.data = [...(adsetsData.data || []), ...additionalAdsets];
    }
  }

  if (!adsData.data || adsData.data.length === 0) {
    const fallbackAds = storedCampaigns.flatMap(c => c.ads || []);
    if (fallbackAds.length > 0) {
      try {
        const adIdsToQuery = fallbackAds.map(a => a.id || a.adId).filter(Boolean);
        if (adIdsToQuery.length > 0 && accessToken) {
          const batch = adIdsToQuery.slice(0, 50).map(id => ({
            method: 'GET',
            relative_url: `${id}?fields=id,name,status,effective_status`
          }));
          const batchRes = await fetch(`${GRAPH_BASE_URL}/?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch })
          }).catch(() => null);
          if (batchRes) {
            const batchResults = await batchRes.json().catch(() => []);
            if (Array.isArray(batchResults)) {
              const statusMap = new Map();
              batchResults.forEach(item => {
                if (item.code === 200 && item.body) {
                  try {
                    const b = JSON.parse(item.body);
                    if (b.id) statusMap.set(String(b.id), b);
                  } catch (e) {}
                }
              });
              fallbackAds.forEach(a => {
                const live = statusMap.get(String(a.id || a.adId));
                if (live) {
                  const isLivePaused = live.status === 'PAUSED' || live.effective_status === 'PAUSED' || live.effective_status === 'AD_PAUSED';
                  a.rawStatus = live.status;
                  a.effectiveStatus = live.effective_status;
                  a.status = !isLivePaused;
                }
              });
            }
          }
        }
      } catch (eBatchAd) {}

      adsData = { data: fallbackAds.map(a => {
        const isPaused = !a.status || a.rawStatus === 'PAUSED' || a.effectiveStatus === 'PAUSED' || a.effectiveStatus === 'AD_PAUSED';
        return {
          id: a.id || a.adId,
          name: a.name,
          campaign_id: a.campaignId,
          adset_id: a.adsetId,
          status: isPaused ? 'PAUSED' : 'ACTIVE',
          effective_status: isPaused ? 'PAUSED' : (a.effectiveStatus || 'ACTIVE'),
          creative: {
            id: a.creativeId || `cr_${a.id}`,
            thumbnail_url: a.thumbnailUrl || a.mediaSrc,
            image_url: a.mediaSrc
          }
        };
      }) };
    }
  }

  // Processa os conjuntos reais vinculando as métricas exatas do período
  const allAdsets = (adsetsData.data || []).map(adset => {
    const insight = adsetInsightsMap.get(String(adset.id)) || {};
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
    let metaPurchases = 0;
    let metaRevenue = 0;

    if (Array.isArray(insight.actions)) {
      const icAction = insight.actions.find(a => 
        a.action_type === 'initiate_checkout' || 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'onsite_web_initiated_checkout'
      );
      if (icAction) metaInitCheckouts = Number(icAction.value || 0);

      const pAction = insight.actions.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'onsite_web_purchase'
      );
      if (pAction) metaPurchases = Number(pAction.value || 0);
    }

    if (Array.isArray(insight.action_values)) {
      const pVal = insight.action_values.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'onsite_web_purchase'
      );
      if (pVal) metaRevenue = Number(pVal.value || 0) * usdRate;
    }

    const costPerIc = metaInitCheckouts > 0 ? (realSpend / metaInitCheckouts).toFixed(2) : '0.00';

    const rawBidAmount = adset.bid_amount ? (Number(adset.bid_amount) / 100) : null;
    let realBidCap = rawBidAmount !== null ? (rawBidAmount * usdRate).toFixed(2) : null;
    if (realBidCap && Number(realBidCap) > 500) realBidCap = null;
    if (adset._originalBidCapBrl !== undefined) {
      realBidCap = adset._originalBidCapBrl;
    }

    const rawDailyBudget = adset.daily_budget ? (Number(adset.daily_budget) / 100) : null;
    let realBudget = rawDailyBudget !== null ? (rawDailyBudget * usdRate).toFixed(2) : null;
    if (adset._originalBudgetBrl !== undefined && Number(adset._originalBudgetBrl) > 0) {
      realBudget = Number(adset._originalBudgetBrl).toFixed(2);
    }

    return {
      id: adset.id,
      adsetId: adset.id,
      campaignId: adset.campaign_id,
      name: adset.name,
      accountName: accountName || 'Conta de Anúncios',
      status: (adset.status === 'ACTIVE' || adset.status === true) && 
              adset.status !== 'PAUSED' && 
              adset.effective_status !== 'PAUSED' && 
              adset.effective_status !== 'ADSET_PAUSED',
      rawStatus: adset.status,
      effectiveStatus: adset.effective_status || adset.status,
      budget: realBudget,
      budgetType: adset.daily_budget ? 'Diário' : 'Vitalício',
      bidCap: realBidCap,
      bidStrategy: adset.bid_strategy || null,
      spend: realSpend.toFixed(2),
      rawSpendUsd: isUsd ? rawSpend.toFixed(2) : null,
      rawBudgetUsd: isUsd && rawDailyBudget !== null ? rawDailyBudget.toFixed(2) : null,
      usdRate: isUsd ? usdRate : null,
      currency: 'BRL',
      impressions,
      clicks,
      cpc: realCpc.toFixed(2),
      cpm: realCpm.toFixed(2),
      ctr: `${rawCtr.toFixed(2)}%`,
      visits: Math.round(clicks * 0.75),
      ic: metaInitCheckouts,
      costPerIc,
      metaPurchases,
      metaRevenue: metaRevenue.toFixed(2),
      sales: metaPurchases,
      pendingSales: 0,
      revenue: metaRevenue > 0 ? metaRevenue.toFixed(2) : '0.00',
      profit: (metaRevenue - realSpend).toFixed(2),
      roas: realSpend > 0 ? (metaRevenue / realSpend).toFixed(2) : '0.00',
      cpa: metaPurchases > 0 ? (realSpend / metaPurchases).toFixed(2) : '0.00',
      arpu: metaPurchases > 0 ? (metaRevenue / metaPurchases).toFixed(2) : '0.00'
    };
  });

  // Processa os anúncios vinculando as métricas exatas do período
  const allAds = (adsData.data || []).map(ad => {
    const insight = adInsightsMap.get(String(ad.id)) || {};
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
    let metaPurchases = 0;
    let metaRevenue = 0;
    if (Array.isArray(insight.actions)) {
      const icAction = insight.actions.find(a => 
        a.action_type === 'initiate_checkout' || 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'onsite_web_initiated_checkout'
      );
      if (icAction) metaInitCheckouts = Number(icAction.value || 0);

      const pAction = insight.actions.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'onsite_web_purchase'
      );
      if (pAction) metaPurchases = Number(pAction.value || 0);
    }

    if (Array.isArray(insight.action_values)) {
      const pVal = insight.action_values.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'onsite_web_purchase'
      );
      if (pVal) metaRevenue = Number(pVal.value || 0) * usdRate;
    }

    const costPerIc = metaInitCheckouts > 0 ? (realSpend / metaInitCheckouts).toFixed(2) : '0.00';
    const thumb = ad.creative?.thumbnail_url || ad.creative?.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';

    return {
      id: ad.id,
      adId: ad.id,
      campaignId: ad.campaign_id,
      adsetId: ad.adset_id,
      name: ad.name,
      accountName: accountName || 'Conta de Anúncios',
      status: (ad.status === 'ACTIVE' || ad.status === true) && 
              ad.status !== 'PAUSED' && 
              ad.effective_status !== 'PAUSED' && 
              ad.effective_status !== 'AD_PAUSED',
      rawStatus: ad.status,
      effectiveStatus: ad.effective_status || ad.status,
      mediaSrc: thumb,
      thumbnailUrl: thumb,
      videoUrl: null,
      spend: realSpend.toFixed(2),
      rawSpendUsd: isUsd ? rawSpend.toFixed(2) : null,
      usdRate: isUsd ? usdRate : null,
      currency: 'BRL',
      impressions,
      clicks,
      cpc: realCpc.toFixed(2),
      cpm: realCpm.toFixed(2),
      ctr: `${rawCtr.toFixed(2)}%`,
      visits: Math.round(clicks * 0.75),
      ic: metaInitCheckouts,
      costPerIc,
      metaPurchases,
      metaRevenue: metaRevenue.toFixed(2),
      sales: metaPurchases,
      pendingSales: 0,
      revenue: metaRevenue > 0 ? metaRevenue.toFixed(2) : '0.00',
      profit: (metaRevenue - realSpend).toFixed(2),
      roas: realSpend > 0 ? (metaRevenue / realSpend).toFixed(2) : '0.00',
      cpa: metaPurchases > 0 ? (realSpend / metaPurchases).toFixed(2) : '0.00',
      arpu: metaPurchases > 0 ? (metaRevenue / metaPurchases).toFixed(2) : '0.00'
    };
  });

  return (data.data || []).map(c => {
    const insight = campInsightsMap.get(String(c.id)) || {};
    const rawSpend = Number(insight.spend || 0);
    const clicks = Number(insight.clicks || 0);
    const impressions = Number(insight.impressions || 0);

    const nameUpper = (c.name || '').toUpperCase();
    const explicitAboInName = nameUpper.includes('ABO');
    const explicitCboInName = nameUpper.includes('CBO') || nameUpper.includes('BID') || nameUpper.includes('COST CAP');
    const rawDailyBudget = c.daily_budget ? (Number(c.daily_budget) / 100) : null;
    const rawLifetimeBudget = c.lifetime_budget ? (Number(c.lifetime_budget) / 100) : null;
    const hasCampLevelBudget = Boolean(rawDailyBudget || rawLifetimeBudget);
    const hasBidCapStrategy = c.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || c.bid_strategy === 'COST_CAP';

    // Identificação precisa de ABO vs CBO:
    // 1. Se tem orçamento na campanha (daily_budget / lifetime_budget) ou estratégia BID CAP -> CBO definitivo!
    // 2. Se tem CBO ou BID no nome -> CBO definitivo!
    // 3. Se tem ABO no nome E NÃO TEM orçamento na campanha e NÃO TEM BID CAP -> ABO
    // 4. Fallback: se não tiver orçamento na campanha -> ABO
    const isCbo = Boolean(hasCampLevelBudget || hasBidCapStrategy || explicitCboInName);
    const isAbo = !isCbo;
    let campBidStrategy = c.bid_strategy || 'LOWEST_COST_WITHOUT_CAP';
    if (isAbo && !hasBidCapStrategy) {
      campBidStrategy = 'LOWEST_COST_WITHOUT_CAP';
    }

    const baseBudget = rawDailyBudget !== null ? rawDailyBudget : (rawLifetimeBudget !== null ? rawLifetimeBudget : 25.00);
    let realBudget = baseBudget * usdRate;
    if (c._originalBudgetBrl && isCbo && Number(c._originalBudgetBrl) > 0) {
      realBudget = Number(c._originalBudgetBrl);
    }

    const realSpend = rawSpend * usdRate;
    const rawCtr = impressions > 0 ? ((clicks / impressions) * 100) : Number(insight.ctr || 0);
    const rawCpc = clicks > 0 ? (rawSpend / clicks) : Number(insight.cpc || 0);
    const realCpc = rawCpc * usdRate;
    const rawCpm = impressions > 0 ? ((rawSpend / impressions) * 1000) : Number(insight.cpm || 0);
    const realCpm = rawCpm * usdRate;

    let metaInitCheckouts = 0;
    let metaPurchases = 0;
    let metaRevenue = 0;

    if (Array.isArray(insight.actions)) {
      const icAction = insight.actions.find(a => 
        a.action_type === 'initiate_checkout' || 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'onsite_web_initiated_checkout'
      );
      if (icAction) metaInitCheckouts = Number(icAction.value || 0);

      const pAction = insight.actions.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'onsite_web_purchase'
      );
      if (pAction) metaPurchases = Number(pAction.value || 0);
    }

    if (Array.isArray(insight.action_values)) {
      const pVal = insight.action_values.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'onsite_web_purchase'
      );
      if (pVal) metaRevenue = Number(pVal.value || 0) * usdRate;
    }

    const costPerIc = metaInitCheckouts > 0 ? (realSpend / metaInitCheckouts).toFixed(2) : '0.00';

    const campAdsets = allAdsets.filter(a => String(a.campaignId) === String(c.id));
    campAdsets.forEach(as => {
      as.isCbo = isCbo;
      as.isAbo = isAbo;
      if (isCbo) {
        as.budget = realBudget.toFixed(2);
        as.budgetType = c.daily_budget ? 'Diário' : 'Vitalício';
      } else {
        if (!as.budget || Number(as.budget) > 500) {
          as.budget = '10.00';
        }
        as.budgetType = 'Diário';
      }

      if (isAbo) {
        as.bidCap = null;
        as.bidStrategy = 'LOWEST_COST_WITHOUT_CAP';
      } else {
        const rawCampBidAmount = c.bid_amount ? (Number(c.bid_amount) / 100) : null;
        const realCampBidCap = rawCampBidAmount !== null ? (rawCampBidAmount * usdRate).toFixed(2) : null;
        const effectiveBidCap = (as.bidCap !== undefined && as.bidCap !== null && Number(as.bidCap) > 0 && Number(as.bidCap) < 500)
          ? as.bidCap
          : (realCampBidCap && Number(realCampBidCap) < 500 ? realCampBidCap : null);

        const hasRealBidAmount = Boolean(effectiveBidCap && Number(effectiveBidCap) > 0);
        if (!hasRealBidAmount) {
          as.bidCap = null;
          as.bidStrategy = 'LOWEST_COST_WITHOUT_CAP';
        } else {
          as.bidCap = effectiveBidCap;
          as.bidStrategy = as.bidStrategy || campBidStrategy || 'LOWEST_COST_WITH_BID_CAP';
        }
      }
    });

    const rawCampBidAmount = c.bid_amount ? (Number(c.bid_amount) / 100) : null;
    const realCampBidCap = rawCampBidAmount !== null ? (rawCampBidAmount * usdRate).toFixed(2) : null;
    const finalCampBidCap = isCbo 
      ? ((realCampBidCap && Number(realCampBidCap) < 500 ? realCampBidCap : null) || (campAdsets.find(a => a.bidCap && Number(a.bidCap) > 0 && Number(a.bidCap) < 500)?.bidCap || null)) 
      : null;

    const campAds = allAds.filter(a => String(a.campaignId) === String(c.id));
    const totalAdsetsBudget = campAdsets.reduce((sum, a) => sum + Number(a.budget || 0), 0);
    const finalCampBudget = isCbo ? realBudget.toFixed(2) : (totalAdsetsBudget > 0 ? totalAdsetsBudget.toFixed(2) : '10.00');

    let finalCampSpend = realSpend;
    if (isAbo && campAdsets.length > 0) {
      const sumAdsetsSpend = campAdsets.reduce((sum, a) => sum + Number(a.spend || 0), 0);
      if (sumAdsetsSpend > 0) {
        finalCampSpend = sumAdsetsSpend;
      }
    } else if (isCbo && campAdsets.length === 1) {
      campAdsets[0].spend = realSpend.toFixed(2);
      if (isUsd) campAdsets[0].rawSpendUsd = rawSpend.toFixed(2);
      if (campAds.length === 1) {
        campAds[0].spend = realSpend.toFixed(2);
        if (isUsd) campAds[0].rawSpendUsd = rawSpend.toFixed(2);
      }
    }

    return {
      id: c.id,
      name: c.name,
      status: c.status === 'ACTIVE' || c.effective_status === 'ACTIVE',
      rawStatus: c.status,
      effectiveStatus: c.effective_status || c.status,
      objective: c.objective,
      isCbo,
      isAbo,
      bidCap: isAbo ? null : finalCampBidCap,
      bidStrategy: isAbo ? 'LOWEST_COST_WITHOUT_CAP' : campBidStrategy,
      budget: finalCampBudget,
      budgetType: isCbo ? (c.daily_budget ? 'Diário' : 'Vitalício') : 'Nível de Conjunto',
      spend: finalCampSpend.toFixed(2),
      rawSpendUsd: isUsd ? (finalCampSpend / usdRate).toFixed(2) : null,
      rawBudgetUsd: isUsd ? baseBudget.toFixed(2) : null,
      usdRate: isUsd ? usdRate : null,
      impressions,
      clicks,
      cpc: realCpc.toFixed(2),
      cpm: realCpm.toFixed(2),
      ctr: `${rawCtr.toFixed(2)}%`,
      metaPurchases,
      metaRevenue: metaRevenue > 0 ? metaRevenue.toFixed(2) : '0.00',
      sales: metaPurchases,
      revenue: metaRevenue > 0 ? metaRevenue.toFixed(2) : '0.00',
      profit: (metaRevenue - finalCampSpend).toFixed(2),
      roas: finalCampSpend > 0 ? (metaRevenue / finalCampSpend).toFixed(2) : '0.00',
      cpa: metaPurchases > 0 ? (finalCampSpend / metaPurchases).toFixed(2) : '0.00',
      initCheckouts: metaInitCheckouts,
      costPerIc: costPerIc,
      adAccountId: actId,
      accountName: accountName || 'Conta de Anúncios',
      currency: 'BRL',
      adsets: campAdsets,
      ads: campAds,
      date: isMaximum ? 'Máximo' : (effectiveRange?.since || 'Hoje'),
      dateRange: isMaximum ? { isMaximum: true } : effectiveRange
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
 * permitindo definir um pixel específico (targetPixelId) e uma página específica (targetPageId) para a nova conta/campanha.
 */
export async function duplicateMetaCampaign(campaignId, { targetAccountId, targetPixelId, targetPageId, targetToken, copiesCount = 1, status = 'ACTIVE' }, accessToken) {
  const cleanTargetAcc = (targetAccountId || '').replace('act_', '').trim();
  const cleanTargetPixel = targetPixelId ? String(targetPixelId).trim() : null;
  const cleanTargetPage = targetPageId ? String(targetPageId).trim() : null;
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
  const DEFAULT_UTM_TAGS = 'utm_source=FB|{{ad.account_id}}&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}';
  try {
    const adsetFields = 'id,name,status,daily_budget,lifetime_budget,bid_amount,bid_strategy,billing_event,optimization_goal,targeting,promoted_object,destination_type,ads{id,name,status,url_tags,creative{id,name,url_tags,object_story_id,effective_object_story_id,use_page_actor_override,object_story_spec,asset_feed_spec,image_url,image_hash,thumbnail_url,video_id,body,title,call_to_action_type,link_url},tracking_specs}';
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
          if (createdCampData.error?.code === 17 || createdCampData.error?.code === 613) {
            throw new Error('Limite temporário de requisições da Meta nessa conta. Aguarde cerca de 1 a 2 minutos para a Meta liberar novas chamadas.');
          }
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

                  // Se for cross-account OU se especificou nova página (targetPageId), cria o criativo na conta de destino usando destToken
                  if (isCrossAccount || cleanTargetPage) {
                    try {
                      // 1. Prioridade Máxima: se o criativo tem um post existente (effective_object_story_id ou object_story_id)
                      const existingStoryId = ad.creative?.effective_object_story_id || ad.creative?.object_story_id;
                      if (existingStoryId && !cleanTargetPage) {
                        try {
                          const createCrRes = await fetch(`${GRAPH_BASE_URL}/${formattedActId}/adcreatives`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                              access_token: destToken,
                              name: ad.creative?.name || ad.name || 'Criativo Duplicado',
                              object_story_id: existingStoryId
                            }).toString()
                          });
                          const createCrData = await createCrRes.json();
                          if (createCrData.id) {
                            creativeIdToUse = createCrData.id;
                          } else {
                            console.warn(`[Create AdCreative with StoryId Warning]:`, createCrData.error?.message);
                          }
                        } catch (stErr) {
                          console.warn(`[Create AdCreative with StoryId Error]:`, stErr.message);
                        }
                      }

                      // 2. Se não conseguiu por object_story_id e temos object_story_spec
                      if (!creativeIdToUse && ad.creative?.object_story_spec) {
                        const specCopy = JSON.parse(JSON.stringify(ad.creative.object_story_spec));
                        
                        // Substitui para a nova página se fornecida
                        if (cleanTargetPage) {
                          specCopy.page_id = cleanTargetPage;
                          if (specCopy.instagram_user_id) {
                            delete specCopy.instagram_user_id; // evita erro de permissão cruzada com conta do IG antiga
                          }
                        }

                        // Tratamento de vídeo e imagem para evitar erro ObjectStorySpecRedundant
                        if (specCopy.video_data) {
                          const oldVideoId = specCopy.video_data.video_id || ad.creative.video_id;
                          if (oldVideoId && isCrossAccount) {
                            try {
                              const srcVidRes = await fetch(`${GRAPH_BASE_URL}/${oldVideoId}?fields=source,picture&access_token=${accessToken}`);
                              const srcVidData = await srcVidRes.json();
                              const directVideoUrl = srcVidData.source;

                              if (directVideoUrl) {
                                const advVideoRes = await fetch(`${GRAPH_BASE_URL}/${formattedActId}/advideos`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                  body: new URLSearchParams({
                                    access_token: destToken,
                                    file_url: directVideoUrl
                                  }).toString()
                                });
                                const advVideoData = await advVideoRes.json();
                                if (advVideoData.id) {
                                  specCopy.video_data.video_id = advVideoData.id;
                                }
                              }
                            } catch (vidTransErr) {
                              console.warn(`[Video Transfer Error]:`, vidTransErr.message);
                            }
                          }

                          // Meta proíbe enviar image_url e image_hash juntos no video_data
                          if (specCopy.video_data.image_hash && specCopy.video_data.image_url) {
                            delete specCopy.video_data.image_url;
                          }
                        }

                        if (specCopy.link_data) {
                          if (specCopy.link_data.image_hash && specCopy.link_data.picture) {
                            delete specCopy.link_data.picture;
                          }
                        }

                        const creativeParams = {
                          access_token: destToken,
                          name: ad.creative.name || ad.name || 'Criativo Duplicado',
                          object_story_spec: JSON.stringify(specCopy),
                          use_page_actor_override: 'true'
                        };

                        const utmTags = ad.creative?.url_tags || ad.url_tags || DEFAULT_UTM_TAGS;
                        if (utmTags) {
                          creativeParams.url_tags = utmTags;
                        }

                        const createCrRes = await fetch(`${GRAPH_BASE_URL}/${formattedActId}/adcreatives`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                          body: new URLSearchParams(creativeParams).toString()
                        });
                        const createCrData = await createCrRes.json();
                        if (createCrData.id) {
                          creativeIdToUse = createCrData.id;
                        } else {
                          console.warn(`[Create AdCreative Spec Warning]:`, createCrData.error?.message);
                        }
                      }
                    } catch (crErr) {
                      console.warn(`[Create AdCreative Error]:`, crErr.message);
                    }
                  }

                  if (creativeIdToUse) {
                    const adParams = new URLSearchParams();
                    adParams.append('access_token', destToken);
                    adParams.append('name', ad.name || 'Anúncio Duplicado');
                    adParams.append('adset_id', newAdsetId);
                    adParams.append('creative', JSON.stringify({ creative_id: creativeIdToUse }));
                    adParams.append('status', status || 'ACTIVE');

                    // Preserva parâmetros UTM (url_tags) no nível do anúncio (com fallback automático e injeção de macros dinâmicas)
                    let adUtmTags = ad.url_tags || ad.creative?.url_tags || DEFAULT_UTM_TAGS;
                    if (!adUtmTags.includes('{{campaign.id}}') || !adUtmTags.includes('{{ad.id}}')) {
                      adUtmTags = DEFAULT_UTM_TAGS;
                    }
                    if (adUtmTags) {
                      adParams.append('url_tags', adUtmTags);
                    }

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
