import { db } from '../db.js';

/**
 * Motor de Atribuição Cross-Session e Resolução de Anúncios
 */
export function attributeOrder(parsedOrder, clientIp = null) {
  const sessions = db.get('sessions') || [];
  const tracking = parsedOrder.tracking || {};
  const customer = parsedOrder.customer || {};

  let matchedSession = null;
  let matchType = 'direct_click';

  // 1. Match por Session ID direto
  if (tracking.sessionId) {
    matchedSession = sessions.find(s => s.sessionId === tracking.sessionId);
    if (matchedSession) matchType = 'session_id';
  }

  // 2. Match por FBP / FBC
  if (!matchedSession && (tracking.fbp || tracking.fbc)) {
    matchedSession = sessions.find(s => 
      (tracking.fbp && s.fbp === tracking.fbp) ||
      (tracking.fbc && s.fbc === tracking.fbc)
    );
    if (matchedSession) matchType = 'fbp_fbc_cookie';
  }

  // 3. Match por Email / Telefone caso tenha sido capturado em Lead anterior
  if (!matchedSession && (customer.email || customer.phone)) {
    matchedSession = sessions.find(s => 
      (customer.email && s.customerEmail === customer.email) ||
      (customer.phone && s.customerPhone === customer.phone)
    );
    if (matchedSession) matchType = 'customer_identity';
  }

  // 4. Match por IP dentro da janela de 30 dias (Cross-Session / Link da Bio)
  if (!matchedSession && clientIp) {
    matchedSession = sessions.find(s => s.ip === clientIp);
    if (matchedSession) matchType = 'ip_cross_session';
  }

  // Identifica se foi uma compra "perdida" pela Bio ou Orgânico recuperada
  const isOrganicOrDirect = !tracking.utm_campaign || 
    tracking.utm_source === 'instagram' || 
    tracking.utm_source === 'bio' || 
    tracking.utm_source === 'direct';

  if (matchedSession && isOrganicOrDirect && matchedSession.utms && matchedSession.utms.utm_campaign) {
    matchType = 'cross_session_bio';
  }

function cleanTrackingValue(val) {
  if (!val) return '';
  let str = String(val);
  if (str.includes('::')) str = str.split('::')[0];
  if (str.includes('|')) str = str.split('|')[0];
  str = str.replace(/[-_]\s*\d{6,}$/, '');
  return str.trim();
}

  const rawAdset = tracking.utm_medium || (matchedSession && matchedSession.utms && matchedSession.utms.utm_medium) || '';
  const resolvedAdset = cleanTrackingValue(rawAdset) || 'conjunto_padrao';

  const rawAd = tracking.utm_content || (matchedSession && matchedSession.utms && matchedSession.utms.utm_content) || '';
  const resolvedAd = cleanTrackingValue(rawAd) || 'criativo_padrao';

  // Extrai e normaliza o nome da campanha
  let rawCampaign = tracking.utm_campaign || (matchedSession && matchedSession.utms && matchedSession.utms.utm_campaign) || '';
  let resolvedCampaign = rawCampaign;
  if (!resolvedCampaign || resolvedCampaign === 'campanha_direta' || resolvedCampaign.toLowerCase().includes('direta')) {
    resolvedCampaign = '';
  } else {
    resolvedCampaign = cleanTrackingValue(resolvedCampaign);
  }

  // Se a campanha não veio explícita no link mas temos criativo (AD01, AD02), conjunto ou fbc do Meta
  const hasMetaTraffic = Boolean(tracking.fbc || (matchedSession && matchedSession.fbc) || (resolvedAd && resolvedAd !== 'criativo_padrao') || (resolvedAdset && resolvedAdset !== 'conjunto_padrao'));
  
  if (!resolvedCampaign && hasMetaTraffic) {
    const campaigns = db.get('campaigns') || [];
    const activeCamp = campaigns.find(c => c.status === true || c.rawStatus === 'ACTIVE') || campaigns[0];
    if (activeCamp && activeCamp.name) {
      resolvedCampaign = activeCamp.name;
    }
  }

  if (!resolvedCampaign) {
    resolvedCampaign = 'Orgânico';
  }

  const rawSource = tracking.utm_source || (matchedSession && matchedSession.utms && matchedSession.utms.utm_source) || '';
  let resolvedSource = 'facebook';
  if (resolvedCampaign === 'Orgânico' && !hasMetaTraffic) {
    resolvedSource = 'Orgânico';
  } else if (rawSource) {
    resolvedSource = rawSource;
  }

  // Extrai as UTMs finais
  const finalUtms = {
    source: resolvedSource,
    campaign: resolvedCampaign,
    adset: resolvedAdset,
    ad: resolvedAd,
    term: tracking.utm_term || (matchedSession && matchedSession.utms && matchedSession.utms.utm_term) || ''
  };

  const fbp = tracking.fbp || (matchedSession && matchedSession.fbp) || `fb.1.${Date.now()}.${Math.floor(Math.random() * 1000000)}`;
  const fbc = tracking.fbc || (matchedSession && matchedSession.fbc) || undefined;

  // Atualiza métricas agregadas da campanha no banco
  updateCampaignStats(finalUtms.campaign, finalUtms.ad, parsedOrder.amount);

  return {
    campaign: finalUtms.campaign,
    adset: finalUtms.adset,
    ad: finalUtms.ad,
    source: finalUtms.source,
    term: finalUtms.term,
    matchType,
    fbp,
    fbc,
    city: (matchedSession && matchedSession.city) || null,
    state: (matchedSession && matchedSession.state) || null,
    ip: (matchedSession && matchedSession.ip) || clientIp || null,
    userAgent: (matchedSession && matchedSession.userAgent) || null,
    landingUrl: (matchedSession && matchedSession.landingUrl) || null,
    sessionId: (matchedSession && matchedSession.sessionId) || tracking.sessionId || null,
    recoveredFromBio: matchType === 'cross_session_bio'
  };
}

function updateCampaignStats(campaignName, adName, amount) {
  const campaigns = db.get('campaigns') || [];
  let camp = campaigns.find(c => (c.utm_campaign && c.utm_campaign === campaignName) || (c.campaign_name && campaignName && c.campaign_name.includes(campaignName)));

  if (!camp && campaigns.length > 0) {
    camp = campaigns[0]; // Associa à principal caso não encontrada
  }

  if (camp) {
    camp.sales = (Number(camp.sales) || 0) + 1;
    const currentRev = Number(camp.revenue) || 0;
    camp.revenue = Number((currentRev + Number(amount || 0)).toFixed(2));
    const spend = Number(camp.spend) || 0;
    if (spend > 0) {
      camp.cpa = Number((spend / camp.sales).toFixed(2));
      camp.roas = Number((camp.revenue / spend).toFixed(2));
    }

    if (camp.ads && camp.ads.length > 0) {
      const ad = camp.ads.find(a => (a.utm_content && a.utm_content === adName) || (a.ad_name && adName && a.ad_name.includes(adName))) || camp.ads[0];
      if (ad) {
        ad.sales = (Number(ad.sales) || 0) + 1;
        const currentAdRev = Number(ad.revenue) || 0;
        ad.revenue = Number((currentAdRev + Number(amount || 0)).toFixed(2));
        const adSpend = Number(ad.spend) || 0;
        if (adSpend > 0) {
          ad.cpa = Number((adSpend / ad.sales).toFixed(2));
          ad.roas = Number((ad.revenue / adSpend).toFixed(2));
        }
      }
    }

    db.set('campaigns', campaigns);
  }
}
