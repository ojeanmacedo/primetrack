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
  createdAt: '2026-01-01T00:00:00.000Z',
  hasSetPassword: true
};

const STORAGE_KEY = 'primetrack_current_user';

export function getCurrentUser() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const user = JSON.parse(raw);
    if (!user || !user.email) {
      return null;
    }
    return user;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Erro ao salvar usuário:', e);
  }
}

export function isMasterAdmin(user) {
  const current = user || getCurrentUser();
  if (!current || !current.email) return false;
  const email = current.email.toLowerCase();
  return email === 'digitaljmsolucoes@gmail.com' || current.role === 'admin';
}

/**
 * Login com E-mail e Senha
 * REGRA: O primeiro cadastro é OBRIGATÓRIO ser feito com a conta do Google!
 * Só pode entrar digitando e-mail e senha quem já tiver cadastro e tiver definido uma senha no app.
 */
export async function loginUser(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const inputPass = (password || '').trim();

  if (!cleanEmail || !inputPass) {
    return { success: false, error: 'Por favor, preencha o e-mail e a senha.' };
  }

  // 1. Tenta autenticar pelo backend central da PrimeTrack (Supabase Admin)
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: inputPass })
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setCurrentUser(data.user);
      localStorage.setItem(`primetrack_usr_${cleanEmail}`, JSON.stringify(data.user));
      return { success: true, user: data.user };
    } else if (data && data.error) {
      // Se o backend diz que ainda não possui senha, mas o usuário acabou de criar e salvou localmente neste navegador
      const localRaw = localStorage.getItem(`primetrack_usr_${cleanEmail}`);
      if (localRaw) {
        try {
          const localUser = JSON.parse(localRaw);
          if (localUser && localUser.password && localUser.password === inputPass) {
            // Sincroniza com o Supabase via backend imediatamente
            fetch('/api/auth/update-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password: inputPass })
            }).catch(() => {});

            setCurrentUser(localUser);
            return { success: true, user: localUser };
          }
        } catch (e) {}
      }
      return { success: false, error: data.error };
    }
  } catch (apiErr) {
    console.warn('Backend auth endpoint indisponível, usando fallback:', apiErr.message);
  }

  // 2. Fallback: Conta administradora principal Digital JM Soluções
  if (cleanEmail === 'digitaljmsolucoes@gmail.com') {
    if (inputPass !== 'jean031522') {
      return { success: false, error: 'Senha incorreta para a conta administradora.' };
    }
    const adminUser = {
      ...DEFAULT_ADMIN,
      email: 'digitaljmsolucoes@gmail.com'
    };
    setCurrentUser(adminUser);
    return { success: true, user: adminUser };
  }

  // 3. Fallback: Busca o usuário no Supabase direto
  let userRecord = null;
  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (data) {
      userRecord = data;
    }
  } catch (err) {
    console.warn('Erro ao consultar Supabase:', err.message);
  }

  // Fallback para cache local
  if (!userRecord) {
    const localRaw = localStorage.getItem(`primetrack_usr_${cleanEmail}`);
    if (localRaw) {
      try { userRecord = JSON.parse(localRaw); } catch (e) {}
    }
  }

  // REGRA CRÍTICA: Se o usuário não existe no banco, NÃO pode logar direto!
  // Primeiro cadastro OBRIGATÓRIO via Google!
  if (!userRecord) {
    return {
      success: false,
      error: 'Conta não encontrada! O primeiro cadastro deve ser feito clicando em "Entrar com Google" acima.'
    };
  }

  // Se o usuário entrou pelo Google mas nunca cadastrou senha no app
  if (!userRecord.password || userRecord.password.trim().length < 6) {
    return {
      success: false,
      error: 'Esta conta foi criada com o Google mas ainda não possui senha. Entre com o Google e defina sua senha em Integrações > Baixe nosso App.'
    };
  }

  // Validação da senha cadastrada
  if (userRecord.password !== inputPass) {
    return {
      success: false,
      error: 'Senha incorreta. Tente novamente ou entre com a sua conta Google.'
    };
  }

  // Usuário autenticado com sucesso
  const authenticatedUser = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    password: userRecord.password,
    role: userRecord.role || 'client',
    plan: userRecord.plan || 'trial',
    avatarLetter: (userRecord.name || cleanEmail).charAt(0).toUpperCase(),
    createdAt: userRecord.created_at,
    trialStartedAt: userRecord.trial_started_at || userRecord.created_at,
    hasSetPassword: true
  };

  setCurrentUser(authenticatedUser);
  localStorage.setItem(`primetrack_usr_${cleanEmail}`, JSON.stringify(authenticatedUser));
  return { success: true, user: authenticatedUser };
}

/**
 * Login e Cadastro pela Primeira Vez via Google
 * Cria o usuário zerado no Supabase e solicita a definição de senha
 */
export async function loginWithGoogle(email, name = '') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || cleanEmail.split('@')[0]).trim();

  // 1. Tenta autenticar/cadastrar pelo backend da PrimeTrack
  try {
    const res = await fetch('/api/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: cleanName })
    });
    const data = await res.json();
    if (res.ok && data.success && data.user) {
      const clientUser = data.user;
      if (!clientUser.hasSetPassword) {
        localStorage.setItem('primetrack_needs_password_setup', 'true');
      } else {
        localStorage.removeItem('primetrack_needs_password_setup');
      }

      if (data.isNew) {
        localStorage.removeItem('primetrack_webhook_tokens');
        localStorage.removeItem('primetrack_pixels');
      }

      localStorage.setItem(`primetrack_usr_${cleanEmail}`, JSON.stringify(clientUser));
      setCurrentUser(clientUser);
      return { success: true, user: clientUser, isNew: data.isNew };
    }
  } catch (apiErr) {
    console.warn('Backend google auth offline, usando fallback direto:', apiErr.message);
  }

  // 2. Fallback: Se for o admin mestre entrando via Google
  if (cleanEmail === 'digitaljmsolucoes@gmail.com') {
    const adminUser = {
      ...DEFAULT_ADMIN,
      email: 'digitaljmsolucoes@gmail.com'
    };
    setCurrentUser(adminUser);
    return { success: true, user: adminUser, isNew: false };
  }

  let clientUser = null;
  let isNew = false;

  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (data) {
      clientUser = {
        id: data.id,
        name: data.name || cleanName,
        email: data.email,
        password: data.password || '',
        role: data.role || 'client',
        plan: data.plan || 'trial',
        avatarLetter: (data.name || cleanEmail).charAt(0).toUpperCase(),
        createdAt: data.created_at,
        trialStartedAt: data.trial_started_at,
        hasSetPassword: Boolean(data.password && data.password.trim().length >= 6)
      };
    } else {
      isNew = true;
      const newId = `usr_${Date.now()}`;
      const newRecord = {
        id: newId,
        name: cleanName,
        email: cleanEmail,
        password: '',
        role: 'client',
        plan: 'trial',
        trial_started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await supabase.from('users').insert(newRecord);

      clientUser = {
        ...newRecord,
        createdAt: newRecord.created_at,
        trialStartedAt: newRecord.trial_started_at,
        avatarLetter: cleanName.charAt(0).toUpperCase(),
        hasSetPassword: false
      };
    }
  } catch (err) {
    console.warn('Erro ao conectar ao Supabase Google Login:', err.message);
  }

  // Fallback local caso Supabase esteja temporariamente inacessível
  if (!clientUser) {
    const existing = localStorage.getItem(`primetrack_usr_${cleanEmail}`);
    if (existing) {
      try { clientUser = JSON.parse(existing); } catch (e) {}
    } else {
      isNew = true;
      clientUser = {
        id: `usr_${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        password: '',
        role: 'client',
        plan: 'trial',
        avatarLetter: cleanName.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString(),
        trialStartedAt: new Date().toISOString(),
        hasSetPassword: false
      };
    }
  }

  if (!clientUser.hasSetPassword) {
    localStorage.setItem('primetrack_needs_password_setup', 'true');
  } else {
    localStorage.removeItem('primetrack_needs_password_setup');
  }

  if (isNew) {
    localStorage.removeItem('primetrack_webhook_tokens');
    localStorage.removeItem('primetrack_pixels');
  }

  localStorage.setItem(`primetrack_usr_${cleanEmail}`, JSON.stringify(clientUser));
  setCurrentUser(clientUser);

  return { success: true, user: clientUser, isNew };
}

export async function logoutUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('primetrack_needs_password_setup');
    sessionStorage.setItem('primetrack_manual_logout', 'true');
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Erro ao deslogar:', e);
  }
}

export function getTrialStatus(user) {
  const current = user || getCurrentUser();
  if (!current) {
    return {
      showExpiredBanner: false,
      isExpired: false,
      isTrial: false,
      daysLeft: null,
      dayLabel: '',
      planLabel: 'Visitante'
    };
  }

  // Conta Digital JM / Admin / Pro: NUNCA expira, não exibe banner de renovação urgente
  if (current.email === 'digitaljmsolucoes@gmail.com' || current.plan === 'pro' || current.role === 'admin') {
    return {
      showExpiredBanner: false,
      isExpired: false,
      isTrial: false,
      daysLeft: null,
      dayLabel: 'Pro',
      planLabel: 'Plano Pro'
    };
  }

  // Clientes normais em período de 7 dias grátis
  const startRaw = current.trialStartedAt || current.trial_started_at || current.createdAt || current.created_at;
  const start = startRaw ? new Date(startRaw) : new Date();
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - (isNaN(start.getTime()) ? now.getTime() : start.getTime()));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const TRIAL_DAYS = 7;
  const isExpired = diffDays >= TRIAL_DAYS;
  const daysLeft = Math.max(0, TRIAL_DAYS - diffDays);

  return {
    showExpiredBanner: isExpired, // Aparece assim que passar os 7 dias grátis
    isExpired,
    isTrial: true,
    daysLeft,
    dayLabel: isExpired ? 'Expirado' : `${daysLeft} dia`,
    planLabel: isExpired ? 'Plano Expirado' : 'Plano Free',
    limits: {
      maxAdAccounts: 1,
      maxPixels: 1,
      maxWebhooks: 1,
      rulesAllowed: false,
      maxApprovedSales: 50
    }
  };
}
