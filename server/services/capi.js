import crypto from 'crypto';

/**
 * Utilitário de Hashing SHA-256 para Meta CAPI
 */
export function sha256(val) {
  if (!val) return undefined;
  const clean = String(val).trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

export function formatPhone(phone) {
  if (!phone) return undefined;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits.startsWith('55') && digits.length >= 10 && digits.length <= 11) {
    digits = '55' + digits;
  }
  return digits;
}

export function formatCity(city) {
  if (!city) return undefined;
  return String(city)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function formatState(state) {
  if (!state) return undefined;
  const clean = String(state)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (clean.length === 2) return clean;
  return clean.slice(0, 2);
}

export function formatZip(zip) {
  if (!zip) return undefined;
  const digits = String(zip).replace(/\D/g, '').trim();
  if (!digits) return undefined;
  // Formata CEP brasileiro para 8 dígitos se tiver até 8, ou corta/completa
  return digits;
}

export function formatCountry(country) {
  if (!country) return 'br';
  const clean = String(country).trim().toLowerCase();
  return clean.length === 2 ? clean : 'br';
}

/**
 * Calcula a Nota do Pixel / EMQ (Event Match Quality) de 0 a 10
 */
export function calculateEmq(userData) {
  let score = 0;
  const breakdown = {
    email: false,
    phone: false,
    fbp: false,
    fbc: false,
    ip: false,
    userAgent: false,
    location: false,
    zip: false,
    country: false,
    externalId: false
  };

  if (userData.em || userData.email) {
    score += 2.5;
    breakdown.email = true;
  }
  if (userData.ph || userData.phone) {
    score += 2.2;
    breakdown.phone = true;
  }
  if (userData.fbp) {
    score += 1.4;
    breakdown.fbp = true;
  }
  if (userData.fbc) {
    score += 1.2;
    breakdown.fbc = true;
  }
  if (userData.client_ip_address || userData.ip) {
    score += 0.6;
    breakdown.ip = true;
  }
  if (userData.client_user_agent || userData.userAgent) {
    score += 0.4;
    breakdown.userAgent = true;
  }
  if (userData.ct || userData.st || userData.city || userData.state) {
    score += 0.4;
    breakdown.location = true;
  }
  if (userData.zp || userData.zip) {
    score += 0.4;
    breakdown.zip = true;
  }
  if (userData.country) {
    score += 0.3;
    breakdown.country = true;
  }
  if (userData.external_id || userData.externalId) {
    score += 0.5;
    breakdown.externalId = true;
  }

  // Cap at 9.8 max realistic
  const finalScore = Math.min(9.8, Math.max(3.0, Number(score.toFixed(1))));
  return { score: finalScore, breakdown };
}

/**
 * Envia evento Server-Side para o Facebook CAPI
 */
export async function sendCapiEvent({
  pixelId,
  accessToken,
  eventName,
  eventId,
  eventTime = Math.floor(Date.now() / 1000),
  eventSourceUrl,
  userData = {},
  customData = {},
  testEventCode
}) {
  const externalIdValue = userData.external_id || userData.externalId || (userData.email ? sha256(userData.email) : undefined);

  const formattedUserData = {
    em: userData.em ? (Array.isArray(userData.em) ? userData.em : [userData.em]) : (userData.email ? [sha256(userData.email)] : undefined),
    ph: userData.ph ? (Array.isArray(userData.ph) ? userData.ph : [userData.ph]) : (userData.phone ? [sha256(formatPhone(userData.phone))] : undefined),
    fn: userData.fn ? [userData.fn] : (userData.name ? [sha256(userData.name.trim().split(' ')[0])] : undefined),
    ln: userData.ln ? [userData.ln] : (userData.name && userData.name.trim().split(' ').length > 1 ? [sha256(userData.name.trim().split(' ').slice(1).join(' '))] : undefined),
    ct: userData.ct ? [userData.ct] : (userData.city ? [sha256(formatCity(userData.city))] : undefined),
    st: userData.st ? [userData.st] : (userData.state ? [sha256(formatState(userData.state))] : undefined),
    zp: userData.zp ? [userData.zp] : (userData.zip || userData.cep ? [sha256(formatZip(userData.zip || userData.cep))] : undefined),
    country: userData.country ? (Array.isArray(userData.country) ? userData.country : [sha256(formatCountry(userData.country))]) : [sha256('br')],
    external_id: externalIdValue ? (Array.isArray(externalIdValue) ? externalIdValue : [externalIdValue]) : undefined,
    fbp: userData.fbp || undefined,
    fbc: userData.fbc || undefined,
    client_ip_address: userData.client_ip_address || userData.ip || undefined,
    client_user_agent: userData.client_user_agent || userData.userAgent || undefined
  };

  // Remove campos vazios
  Object.keys(formattedUserData).forEach(k => {
    if (formattedUserData[k] === undefined) delete formattedUserData[k];
  });

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId || `pt_ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: formattedUserData,
        custom_data: customData
      }
    ]
  };

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  const emq = calculateEmq(formattedUserData);

  // Se houver token de verdade e não for demo, despacha via fetch
  if (accessToken && !accessToken.startsWith('EAAB...demo')) {
    try {
      const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resJson = await response.json();
      return {
        success: response.ok,
        status: response.status,
        response: resJson,
        emq,
        payload
      };
    } catch (err) {
      console.error("Erro ao enviar Meta CAPI:", err);
      return {
        success: false,
        error: err.message,
        emq,
        payload
      };
    }
  }

  // Modo Simulação/Demo com resposta idêntica ao Facebook
  return {
    success: true,
    status: 200,
    response: {
      events_received: 1,
      messages: [],
      fbtrace_id: "LT_" + Math.random().toString(36).substring(2, 12).toUpperCase(),
      test_run: true
    },
    emq,
    payload
  };
}
