import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const ISSUER = 'PrimeTrack';

/**
 * Gera um novo segredo TOTP de 20 bytes (RFC 6238) associado à marca PrimeTrack
 */
export function generateTwoFactorSecret(email = 'usuario@primetrack.top') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const secret = new OTPAuth.Secret({ size: 20 });

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: cleanEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
    issuer: ISSUER,
    email: cleanEmail
  };
}

/**
 * Gera a imagem Data URL do QR Code para escaneamento no aplicativo autenticador
 */
export async function generateQRCode(uri) {
  try {
    return await QRCode.toDataURL(uri, {
      margin: 2,
      width: 220,
      color: {
        dark: '#0B1424',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Erro ao gerar QR Code 2FA:', err);
    throw new Error('Não foi possível gerar a imagem do QR Code.');
  }
}

/**
 * Valida o código de 6 dígitos gerado pelo aplicativo autenticador
 */
export function verifyTwoFactorCode(secretBase32, token) {
  if (!secretBase32 || !token) return false;
  
  const cleanToken = String(token).replace(/\D/g, '').trim();
  if (cleanToken.length !== 6) return false;

  try {
    const secret = OTPAuth.Secret.fromBase32(secretBase32.trim());
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret
    });

    // Window 1 permite 30s de tolerância para cima ou para baixo (desvio de relógio do smartphone)
    const delta = totp.validate({ token: cleanToken, window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('Erro ao validar token 2FA:', err);
    return false;
  }
}

/**
 * Salva a configuração de 2FA localmente e sincroniza com o backend/Supabase
 */
export async function saveTwoFactorConfig(email, { enabled, secret = null }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return false;

  const storageKey = `primetrack_2fa_${cleanEmail}`;
  const config = {
    enabled: Boolean(enabled),
    secret: enabled ? secret : null,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(storageKey, JSON.stringify(config));
    localStorage.setItem('primetrack_2fa_enabled', String(config.enabled));
  }

  // Notifica componentes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('primetrack_2fa_updated', { detail: config }));
  }

  // Sincroniza com o servidor central
  try {
    await fetch('/api/auth/2fa/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        enabled: config.enabled,
        secret: config.secret
      })
    });
  } catch (e) {
    console.warn('Erro ao sincronizar 2FA com servidor central:', e.message);
  }

  return true;
}

/**
 * Obtém a configuração de 2FA armazenada para o e-mail
 */
export function getTwoFactorConfig(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { enabled: false, secret: null };

  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem(`primetrack_2fa_${cleanEmail}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          enabled: Boolean(parsed.enabled),
          secret: parsed.secret || null
        };
      } catch (e) {}
    }
    
    // Fallback genérico para primetrack_2fa_enabled legado
    const genericEnabled = localStorage.getItem('primetrack_2fa_enabled') === 'true';
    if (genericEnabled) {
      return { enabled: true, secret: null };
    }
  }

  return { enabled: false, secret: null };
}

/**
 * Formata a chave secreta em blocos de 4 caracteres para facilitar a digitação manual
 */
export function formatSecretKey(secret) {
  if (!secret) return '';
  return secret.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}
