import { db } from '../db.js';

export function isSharedProxyIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const clean = ip.replace('::ffff:', '').trim();
  if (!clean || clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;
  
  // Faixas privadas locais
  if (clean.startsWith('10.') || clean.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;

  // Faixas de Proxy / CDN Cloudflare (compartilhadas por múltiplos visitantes)
  if (/^172\.(6[4-9]|7[0-1])\./.test(clean)) return true;
  if (/^104\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  if (/^162\.(158|159)\./.test(clean)) return true;
  if (clean.startsWith('108.162.') || clean.startsWith('198.41.') || clean.startsWith('141.101.') || 
      clean.startsWith('190.93.') || clean.startsWith('188.114.') || clean.startsWith('197.234.') || 
      clean.startsWith('173.245.') || clean.startsWith('103.21.') || clean.startsWith('103.22.') || 
      clean.startsWith('103.31.') || clean.startsWith('131.0.72.')) {
    return true;
  }

  return false;
}

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
  // Ignora IPs compartilhados de proxies/CDNs (Cloudflare, etc.) para evitar contaminação cruzada entre visitantes distintos
  if (!matchedSession && clientIp && !isSharedProxyIp(clientIp)) {
    matchedSession = sessions.find(s => s.ip === clientIp && !isSharedProxyIp(s.ip));
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

function parseTrackingEntity(val) {
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
  return { name, id };
}

  // Extrai UTMs diretamente da landingUrl se disponível
  const landingUrl = tracking.landingUrl || parsedOrder.raw?.landingUrl || parsedOrder.raw?.src || (matchedSession && matchedSession.landingUrl) || '';
  let urlUtms = {};
  if (landingUrl && landingUrl.includes('?')) {
    try {
      const q = new URLSearchParams(landingUrl.split('?')[1]);
      urlUtms = {
        utm_source: q.get('utm_source'),
        utm_medium: q.get('utm_medium'),
        utm_campaign: q.get('utm_campaign'),
        utm_content: q.get('utm_content'),
        utm_term: q.get('utm_term')
      };
    } catch (e) {}
  }

  const rawAdset = tracking.utm_medium || urlUtms.utm_medium || (matchedSession && matchedSession.utms && matchedSession.utms.utm_medium) || '';
  const parsedAdset = parseTrackingEntity(rawAdset);
  const resolvedAdset = parsedAdset.name || 'conjunto_padrao';
  const resolvedAdsetId = parsedAdset.id || tracking.adsetId || (matchedSession && matchedSession.utms && matchedSession.utms.adsetId) || null;

  const rawAd = tracking.utm_content || urlUtms.utm_content || (matchedSession && matchedSession.utms && matchedSession.utms.utm_content) || '';
  const parsedAd = parseTrackingEntity(rawAd);
  const resolvedAd = parsedAd.name || 'criativo_padrao';
  const resolvedAdId = parsedAd.id || tracking.adId || (matchedSession && matchedSession.utms && matchedSession.utms.adId) || null;

  // Extrai e normaliza o nome e ID da campanha estritamente do tracking real (UTM ou Pixel)
  let rawCampaign = tracking.utm_campaign || urlUtms.utm_campaign || (matchedSession && matchedSession.utms && matchedSession.utms.utm_campaign) || '';
  const parsedCamp = parseTrackingEntity(rawCampaign);
  let resolvedCampaign = parsedCamp.name;
  if (!resolvedCampaign || resolvedCampaign === 'campanha_direta' || resolvedCampaign.toLowerCase().includes('direta')) {
    resolvedCampaign = 'Orgânico';
  }
  const resolvedCampaignId = parsedCamp.id || tracking.campaignId || (matchedSession && matchedSession.utms && matchedSession.utms.campaignId) || null;

  const rawSource = tracking.utm_source || urlUtms.utm_source || (matchedSession && matchedSession.utms && matchedSession.utms.utm_source) || '';
  let resolvedSource = resolvedCampaign === 'Orgânico' ? 'Orgânico' : (rawSource || 'facebook');
  let resolvedAccountId = tracking.accountId || (matchedSession && matchedSession.accountId) || null;
  let resolvedAccountName = tracking.accountName || (matchedSession && matchedSession.accountName) || null;

  // Extrai conta se codificada na UTM source (ex: "FB|act_1101817232408751" ou "FB|CA02 JEFFREY")
  if (rawSource && (rawSource.includes('|') || rawSource.includes('::'))) {
    const parts = rawSource.includes('|') ? rawSource.split('|') : rawSource.split('::');
    resolvedSource = parts[0].trim();
    const accPart = (parts[1] || '').trim();
    if (accPart.startsWith('act_') || /^\d{6,}$/.test(accPart)) {
      resolvedAccountId = accPart.startsWith('act_') ? accPart : `act_${accPart}`;
    } else if (accPart) {
      resolvedAccountName = accPart;
    }
  }

  // Extrai as UTMs finais
  const finalUtms = {
    source: resolvedSource,
    campaign: resolvedCampaign,
    campaignId: resolvedCampaignId,
    adset: resolvedAdset,
    adsetId: resolvedAdsetId,
    ad: resolvedAd,
    adId: resolvedAdId,
    accountId: resolvedAccountId,
    accountName: resolvedAccountName,
    term: tracking.utm_term || (matchedSession && matchedSession.utms && matchedSession.utms.utm_term) || ''
  };

  const fbp = tracking.fbp || (matchedSession && matchedSession.fbp) || `fb.1.${Date.now()}.${Math.floor(Math.random() * 1000000)}`;
  const fbc = tracking.fbc || (matchedSession && matchedSession.fbc) || undefined;

  // Atualiza métricas agregadas da campanha no banco apenas se for match confiável
  updateCampaignStats(finalUtms.campaign, finalUtms.campaignId, finalUtms.ad, finalUtms.adId, parsedOrder.amount);

  return {
    campaign: finalUtms.campaign,
    campaignId: finalUtms.campaignId,
    adset: finalUtms.adset,
    adsetId: finalUtms.adsetId,
    ad: finalUtms.ad,
    adId: finalUtms.adId,
    accountId: finalUtms.accountId,
    accountName: finalUtms.accountName,
    source: finalUtms.source,
    term: finalUtms.term,
    matchType,
    fbp,
    fbc,
    pixelId: (matchedSession && matchedSession.pixelId) || tracking.pixelId || null,
    city: (matchedSession && matchedSession.city) || null,
    state: (matchedSession && matchedSession.state) || null,
    ip: (matchedSession && matchedSession.ip) || clientIp || null,
    userAgent: (matchedSession && matchedSession.userAgent) || null,
    landingUrl: (matchedSession && matchedSession.landingUrl) || null,
    sessionId: (matchedSession && matchedSession.sessionId) || tracking.sessionId || null,
    recoveredFromBio: matchType === 'cross_session_bio'
  };
}

function updateCampaignStats(campaignName, campaignId, adName, adId, amount) {
  if (!campaignName || campaignName === 'Orgânico') return;
  const campaigns = db.get('campaigns') || [];
  
  let camp = null;
  if (campaignId) {
    camp = campaigns.find(c => String(c.id).trim() === String(campaignId).trim());
  }
  if (!camp && campaignName) {
    const cleanName = campaignName.toLowerCase().trim();
    camp = campaigns.find(c => (c.name || '').toLowerCase().trim() === cleanName || (c.utm_campaign || '').toLowerCase().trim() === cleanName);
  }

  // NUNCA associa arbitrariamente a campaigns[0] se não houver correspondência real!
  if (!camp) return;

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
