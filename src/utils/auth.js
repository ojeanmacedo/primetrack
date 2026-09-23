// Gerenciamento de Sessão e Usuários PrimeTrack conectado ao Supabase
import { supabase } from '../lib/supabase';

export const DEFAULT_ADMIN = {
  id: 'usr_1788826403159',
  name: 'Jean Macedo',
  email: 'jeeanmacedo@gmail.com',
  password: 'jean031522',
  role: 'admin',
  plan: 'scale',
  avatarLetter: 'J',
  createdAt: '2026-09-08T00:13:23.159Z',
  hasSetPassword: true
};

const STORAGE_KEY = 'primetrack_current_user';

export function clearUserLocalCaches() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const keysToRemove = [
    'primetrack_ad_accounts',
    'primetrack_connected_profiles',
    'primetrack_cached_campaigns',
    'primetrack_cached_campaigns_date',
    'primetrack_cached_orders',
    'primetrack_cached_pixel_stats',
    'primetrack_webhook_tokens',
    'primetrack_pixels',
    'primetrack_meta_disconnected',
    'primetrack_status_filter'
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

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
    const emailLower = user.email.toLowerCase();
    if ((emailLower === 'jeeanmacedo@gmail.com' || emailLower === 'jeanmacedo@gmail.com') && user.plan !== 'scale') {
      user.plan = 'scale';
      user.role = 'admin';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!user) {
      clearUserLocalCaches();
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const prevUserRaw = localStorage.getItem(STORAGE_KEY);
      if (prevUserRaw) {
        try {
          const prevUser = JSON.parse(prevUserRaw);
          if (prevUser && prevUser.id !== user.id) {
            clearUserLocalCaches();
          }
        } catch (e) {}
      }
      if (user.id === 'usr_meta_reviewer' || user.isNew) {
        clearUserLocalCaches();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    window.dispatchEvent(new CustomEvent('primetrack_profile_sync', { detail: user }));
  } catch (e) {
    console.error('Erro ao salvar usuário:', e);
  }
}

export function isMasterAdmin(user) {
  const current = user || getCurrentUser();
  if (!current || !current.email) return false;
  const email = current.email.toLowerCase();
  return email === 'jeeanmacedo@gmail.com' || email === 'jeanmacedo@gmail.com' || email === 'digitaljmsolucoes@gmail.com' || current.role === 'admin';
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

  // 2. Fallback: Conta administradora principal Jean Macedo / Digital JM Soluções e Conta de Teste do Analista Meta
  if (cleanEmail === 'jeeanmacedo@gmail.com' || cleanEmail === 'jeanmacedo@gmail.com') {
    if (inputPass !== 'jean031522') {
      return { success: false, error: 'Senha incorreta para a conta administradora.' };
    }
    const adminUser = {
      id: 'usr_1788826403159',
      name: 'Jean Macedo',
      email: cleanEmail,
      role: 'admin',
      plan: 'scale',
      avatarLetter: 'J',
      createdAt: '2026-09-08T00:13:23.159Z',
      hasSetPassword: true
    };
    setCurrentUser(adminUser);
    return { success: true, user: adminUser };
  }

  if (cleanEmail === 'digitaljmsolucoes@gmail.com') {
    if (inputPass !== 'jean031522') {
      return { success: false, error: 'Senha incorreta para a conta administradora.' };
    }
    const adminUser = {
      id: 'usr_admin_digitaljm',
      name: 'Digital JM Soluções',
      email: 'digitaljmsolucoes@gmail.com',
      role: 'admin',
      plan: 'pro',
      avatarLetter: 'D',
      createdAt: '2026-01-01T00:00:00.000Z',
      hasSetPassword: true
    };
    setCurrentUser(adminUser);
    return { success: true, user: adminUser };
  }

  // Conta de Teste dedicada para Revisão de App da Meta (App Review)
  if (cleanEmail === 'teste@primetrack.top') {
    if (inputPass !== 'PrimeTrack2026!') {
      return { success: false, error: 'Senha incorreta para a conta de teste.' };
    }
    const testReviewUser = {
      id: 'usr_meta_reviewer',
      name: 'Meta Reviewer',
      email: 'teste@primetrack.top',
      role: 'admin',
      plan: 'pro',
      avatarLetter: 'M',
      createdAt: '2026-09-14T00:00:00.000Z',
      hasSetPassword: true
    };
    setCurrentUser(testReviewUser);
    return { success: true, user: testReviewUser };
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
  if (cleanEmail === 'jeeanmacedo@gmail.com' || cleanEmail === 'jeanmacedo@gmail.com') {
    const adminUser = {
      id: 'usr_1788826403159',
      name: 'Jean Macedo',
      email: cleanEmail,
      role: 'admin',
      plan: 'scale',
      avatarLetter: 'J',
      createdAt: '2026-09-08T00:13:23.159Z',
      hasSetPassword: true
    };
    setCurrentUser(adminUser);
    return { success: true, user: adminUser, isNew: false };
  }

  if (cleanEmail === 'digitaljmsolucoes@gmail.com') {
    const adminUser = {
      id: 'usr_admin_digitaljm',
      name: 'Digital JM Soluções',
      email: 'digitaljmsolucoes@gmail.com',
      role: 'admin',
      plan: 'pro',
      avatarLetter: 'D',
      createdAt: '2026-01-01T00:00:00.000Z',
      hasSetPassword: true
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
    clearUserLocalCaches();
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

  // Conta Digital JM / Admin / Planos pagos: NUNCA expiram, não exibem banner de renovação urgente
  const isPaidOrAdmin = current.email === 'digitaljmsolucoes@gmail.com' || 
                        current.email === 'jeeanmacedo@gmail.com' || 
                        current.plan === 'pro' || 
                        current.plan === 'basic' || 
                        current.plan === 'scale' || 
                        current.role === 'admin';

  if (isPaidOrAdmin) {
    const planName = current.plan ? current.plan.toUpperCase() : 'SCALE';
    return {
      showExpiredBanner: false,
      isExpired: false,
      isTrial: false,
      isInTrial: false,
      isGracePeriod: false,
      isFrozen: false,
      daysLeft: null,
      dayLabel: 'Ativo',
      planLabel: `Plano ${planName}`,
      limits: getPlanLimits(current)
    };
  }

  // Clientes normais em período de Plano Free (7 dias grátis + 2 dias adicionais de tolerância)
  const startRaw = current.trialStartedAt || current.trial_started_at || current.createdAt || current.created_at;
  const start = startRaw ? new Date(startRaw) : new Date();
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - (isNaN(start.getTime()) ? now.getTime() : start.getTime()));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const TRIAL_DAYS = 7; // 7 dias grátis
  const GRACE_DAYS = 2; // 2 dias de tolerância após os 7 dias
  const TOTAL_DAYS = TRIAL_DAYS + GRACE_DAYS; // 9 dias no total

  // Fase 1: Primeiros 7 dias (0 a 6 dias) -> Plano Free 100% ativo sem aviso de expiração
  const isInTrial = diffDays < TRIAL_DAYS;
  const trialDaysLeft = Math.max(1, TRIAL_DAYS - diffDays);

  // Fase 2: Do 7º ao 8º dia (7 ou 8 dias) -> Bateu 7 dias: restam até 2 dias de tolerância antes de congelar
  const isGracePeriod = diffDays >= TRIAL_DAYS && diffDays < TOTAL_DAYS;
  const graceDaysLeft = Math.max(1, TOTAL_DAYS - diffDays);

  // Fase 3: A partir do 9º dia (9+ dias) -> Período de tolerância esgotado: conta congelada
  const isFrozen = diffDays >= TOTAL_DAYS;
  const isExpired = diffDays >= TRIAL_DAYS;

  return {
    showExpiredBanner: isGracePeriod, // Aparece SOMENTE quando bater os 7 dias e estiver nos 2 dias de tolerância
    isExpired,
    isTrial: !isFrozen && (current.plan === 'trial' || !current.plan || current.plan === 'free'),
    isInTrial,
    isGracePeriod,
    isFrozen,
    trialDaysLeft,
    graceDaysLeft,
    daysLeft: isInTrial ? trialDaysLeft : (isGracePeriod ? graceDaysLeft : 0),
    dayLabel: isFrozen ? 'Conta Congelada' : isGracePeriod ? `Tolerância (${graceDaysLeft}d)` : `${trialDaysLeft} dias restantes`,
    planLabel: isFrozen ? 'Conta Congelada' : isGracePeriod ? 'Plano Expirado' : 'Plano Free',
    limits: getPlanLimits(current)
  };
}

export function getPlanLimits(user) {
  const current = user || getCurrentUser();
  if (!current) {
    return {
      maxDashboards: 1,
      maxAdAccounts: 1,
      maxPixels: 1,
      maxWebhooks: 1,
      maxRules: 0,
      autoDuplicateAdsets: false,
      name: 'Free'
    };
  }

  const isAdmin = isMasterAdmin(current);
  const plan = (current.plan || 'trial').toLowerCase();

  if (isAdmin || plan === 'scale') {
    return {
      maxDashboards: Infinity,
      maxAdAccounts: Infinity,
      maxPixels: Infinity,
      maxWebhooks: Infinity,
      maxRules: 15,
      autoDuplicateAdsets: true,
      name: 'Scale'
    };
  }

  if (plan === 'pro') {
    return {
      maxDashboards: 5,
      maxAdAccounts: 5,
      maxPixels: 5,
      maxWebhooks: 5,
      maxRules: 7,
      autoDuplicateAdsets: false,
      name: 'Pro'
    };
  }

  if (plan === 'basic') {
    return {
      maxDashboards: 1,
      maxAdAccounts: 2,
      maxPixels: 2,
      maxWebhooks: 1,
      maxRules: 2,
      autoDuplicateAdsets: false,
      name: 'Basic'
    };
  }

  // Free / Trial: Permissões atuais + estritamente 1 dashboard (o padrão que já vem na conta)
  return {
    maxDashboards: 1,
    maxAdAccounts: 1,
    maxPixels: 1,
    maxWebhooks: 1,
    maxRules: 0,
    autoDuplicateAdsets: false,
    maxApprovedSales: 50,
    name: 'Free'
  };
}
