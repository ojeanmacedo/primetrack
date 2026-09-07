// Gerenciamento de Sessão e Usuários PrimeTrack conectado ao Supabase
import { supabase } from '../lib/supabase';

export const DEFAULT_ADMIN = {
  id: 'usr_admin_digitaljm',
  name: 'Digital JM Soluções',
  email: 'digitaljmsolucoes@gmail.com',
  password: 'jean031522',
  role: 'admin',
  plan: 'pro',
  avatarLetter: 'D',
  createdAt: '2026-01-01T00:00:00.000Z'
};

const STORAGE_KEY = 'primetrack_current_user';

export function getCurrentUser() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_ADMIN;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN));
      return DEFAULT_ADMIN;
    }
    const user = JSON.parse(raw);
    if (!user || user.email === 'blackhospedagem@gmail.com' || !user.email) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN));
      return DEFAULT_ADMIN;
    }
    return user;
  } catch (e) {
    return DEFAULT_ADMIN;
  }
}

export function setCurrentUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Erro ao salvar usuário:', e);
  }
}

export async function loginUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  
  // Conta proprietária Digital JM Soluções
  if (cleanEmail === 'digitaljmsolucoes@gmail.com' || cleanEmail === 'blackhospedagem@gmail.com') {
    const adminUser = {
      ...DEFAULT_ADMIN,
      email: 'digitaljmsolucoes@gmail.com'
    };
    setCurrentUser(adminUser);

    // Sincroniza admin com Supabase em segundo plano
    try {
      await supabase.from('users').upsert({
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        password: adminUser.password,
        role: adminUser.role,
        plan: adminUser.plan
      });
    } catch (e) {
      console.log('Supabase sync background notice:', e.message);
    }

    return { success: true, user: adminUser };
  }

  // Busca ou cria no Supabase
  let clientUser = null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (data) {
      clientUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || 'client',
        plan: data.plan || 'trial',
        avatarLetter: (data.name || cleanEmail).charAt(0).toUpperCase(),
        createdAt: data.created_at,
        trialStartedAt: data.trial_started_at
      };
    } else {
      // Novo cliente cadastrado no Supabase
      const newId = `usr_${Date.now()}`;
      const newRecord = {
        id: newId,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        password: password || '123456',
        role: 'client',
        plan: 'trial',
        trial_started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await supabase.from('users').insert(newRecord);

      clientUser = {
        ...newRecord,
        avatarLetter: cleanEmail.charAt(0).toUpperCase()
      };
    }
  } catch (err) {
    console.warn('Erro ao conectar ao Supabase, usando cache local:', err.message);
  }

  // Fallback local caso o cliente esteja offline
  if (!clientUser) {
    clientUser = {
      id: `usr_${Date.now()}`,
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      password: password || '123456',
      role: 'client',
      plan: 'trial',
      avatarLetter: cleanEmail.charAt(0).toUpperCase(),
      createdAt: new Date().toISOString(),
      trialStartedAt: new Date().toISOString()
    };
  }

  localStorage.setItem(`primetrack_usr_${cleanEmail}`, JSON.stringify(clientUser));
  setCurrentUser(clientUser);
  return { success: true, user: clientUser };
}

export function logoutUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

export function getTrialStatus(user) {
  const current = user || getCurrentUser() || DEFAULT_ADMIN;

  // Conta Digital JM / Admin / Pro: NUNCA expira, não exibe banner de renovação urgente
  if (!current || current.email === 'digitaljmsolucoes@gmail.com' || current.plan === 'pro' || current.role === 'admin') {
    return {
      showExpiredBanner: false,
      isExpired: false,
      isTrial: false,
      daysLeft: null,
      planLabel: 'Plano Pro'
    };
  }

  // Clientes normais em período de 7 dias grátis
  const start = current.trialStartedAt ? new Date(current.trialStartedAt) : new Date(current.createdAt || Date.now());
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const TRIAL_DAYS = 7;
  const isExpired = diffDays >= TRIAL_DAYS;
  const daysLeft = Math.max(0, TRIAL_DAYS - diffDays);

  return {
    showExpiredBanner: isExpired, // SÓ aparece quando bater os 7 dias grátis
    isExpired,
    isTrial: true,
    daysLeft,
    planLabel: isExpired ? 'Trial Expirado' : `Trial (${daysLeft}d restantes)`
  };
}
