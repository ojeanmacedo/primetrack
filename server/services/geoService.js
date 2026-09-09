/**
 * Serviço de Geolocalização do Pixel PrimeTrack & Meta CAPI
 * Resolve o IP real do visitante para Cidade e Estado no momento do acesso.
 * Estes são os mesmos dados enviados no payload do Meta CAPI (ct e st) para otimizar as campanhas.
 */

const geoCache = new Map();
const LOCAL_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

export function cleanIp(ip) {
  if (!ip) return '';
  let str = String(ip).trim();
  if (str.includes(',')) {
    str = str.split(',')[0].trim();
  }
  if (str.startsWith('::ffff:')) {
    str = str.replace('::ffff:', '');
  }
  return str;
}

/**
 * Resolve o IP real para Cidade e Estado (ex.: { city: 'Rio de Janeiro', state: 'RJ' })
 */
export async function resolveIpLocation(rawIp) {
  const ip = cleanIp(rawIp);
  if (!ip || LOCAL_IPS.has(ip)) {
    return { city: 'São Paulo', state: 'SP', country: 'BR' };
  }

  if (geoCache.has(ip)) {
    return geoCache.get(ip);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,region,city`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.city && data.region) {
        const result = {
          city: data.city,
          state: data.region,
          country: data.countryCode || 'BR'
        };
        geoCache.set(ip, result);
        if (geoCache.size > 2000) {
          const firstKey = geoCache.keys().next().value;
          geoCache.delete(firstKey);
        }
        return result;
      }
    }
  } catch (err) {
    // Ignora erro e usa fallback
  }

  const fallback = { city: 'São Paulo', state: 'SP', country: 'BR' };
  return fallback;
}
