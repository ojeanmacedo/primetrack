import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, isMasterAdmin, setCurrentUser, getTrialStatus } from '../utils/auth';
import { safeStorageSet } from '../utils/safeStorage';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Check, 
  Copy, 
  Code2, 
  Radio, 
  Webhook, 
  Smartphone, 
  HelpCircle, 
  Play, 
  CheckCircle2, 
  ChevronDown, 
  ShieldCheck, 
  Key, 
  Apple, 
  AlertTriangle, 
  Lock, 
  X, 
  ShieldAlert,
  AlertCircle,
  Search
} from 'lucide-react';

const INTEGRATION_TABS = [
  'Facebook Ads',
  'Pixel de Rastreio',
  'UTMs',
  'Webhook API',
  'Baixe nosso App'
];

let isWindowUnloading = false;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    isWindowUnloading = true;
  });
}

export default function Integrations() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isAdmin = isMasterAdmin(currentUser);
  const trialStatus = getTrialStatus(currentUser);
  const userAccKey = currentUser?.id ? `primetrack_ad_accounts_${currentUser.id}` : 'primetrack_ad_accounts';
  const userCampKey = currentUser?.id ? `primetrack_cached_campaigns_${currentUser.id}` : 'primetrack_cached_campaigns';
  const userDisconKey = currentUser?.id ? `primetrack_meta_disconnected_${currentUser.id}` : 'primetrack_meta_disconnected';

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      let isReload = false;
      try {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
          isReload = navEntries[0].type === 'reload';
        } else if (window.performance && window.performance.navigation) {
          isReload = window.performance.navigation.type === 1;
        }
      } catch (e) {}

      // Só mantém na mesma aba se a página foi explicitamente recarregada (F5 / Refresh)
      if (isReload) {
        const savedTab = sessionStorage.getItem('primetrack_integrations_active_tab');
        if (savedTab && INTEGRATION_TABS.includes(savedTab)) {
          return savedTab;
        }
      } else {
        sessionStorage.removeItem('primetrack_integrations_active_tab');
        localStorage.removeItem('primetrack_integrations_active_tab');
      }
    }
    return 'Facebook Ads';
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('primetrack_integrations_active_tab', tab);
      localStorage.removeItem('primetrack_integrations_active_tab');
    }
  };

  // Se o usuário clicar em "Integrações" em qualquer lugar do menu, reseta imediatamente para Facebook Ads
  useEffect(() => {
    const handleNavReset = () => {
      setActiveTab('Facebook Ads');
      try {
        sessionStorage.removeItem('primetrack_integrations_active_tab');
        localStorage.removeItem('primetrack_integrations_active_tab');
      } catch (e) {}
    };
    window.addEventListener('primetrack_integrations_nav', handleNavReset);
    return () => window.removeEventListener('primetrack_integrations_nav', handleNavReset);
  }, []);

  // Ao sair de Integrações para outra página (desmontagem SPA sem F5), limpa a aba salva para sempre reabrir em Facebook Ads
  useEffect(() => {
    return () => {
      try {
        if (!isWindowUnloading) {
          sessionStorage.removeItem('primetrack_integrations_active_tab');
          localStorage.removeItem('primetrack_integrations_active_tab');
        }
      } catch (e) {}
    };
  }, []);
  const [copiedUTM, setCopiedUTM] = useState(false);
  const [copiedPixel, setCopiedPixel] = useState(false);
  const [copiedConnectLink, setCopiedConnectLink] = useState(false);
  
  // Trial Limit Modal State
  const [trialLimitModal, setTrialLimitModal] = useState(null);

  // App Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passUpdated, setPassUpdated] = useState(false);
  const [passError, setPassError] = useState(null);
  const [isSavingPass, setIsSavingPass] = useState(false);

  const [openFaq, setOpenFaq] = useState(null);

  const DEFAULT_MONSTERPAY_TOKEN = {
    id: 'tok_monsterpay',
    name: 'Monsterpay',
    platform: 'Monsterpay',
    type: 'token',
    token: 'pt_9f8c12a47e0345b89a2345bcdef0123456789abcdef01234',
    webhookUrl: '',
    status: 'Ativo',
    lastUsed: 'Hoje',
    createdAt: '08/09/2026'
  };

  // Dashboard Ativo
  const [activeDashboard, setActiveDashboard] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const list = JSON.parse(localStorage.getItem('primetrack_dashboards') || '[]');
        const activeId = localStorage.getItem('primetrack_active_dashboard_id') || 'principal';
        return list.find(d => d.id === activeId) || { id: 'principal', isDefault: true, name: 'Principal' };
      } catch (e) {}
    }
    return { id: 'principal', isDefault: true, name: 'Principal' };
  });

  const activeDashboardId = activeDashboard?.id || 'principal';
  const isDefaultDashboard = activeDashboardId === 'principal' || activeDashboard?.isDefault === true;

  const getScopedKey = (baseKey) => {
    return isDefaultDashboard ? baseKey : `${baseKey}_${activeDashboardId}`;
  };

  const loadApiTokens = (dashId, isDef) => {
    if (typeof window === 'undefined') return [];
    const key = isDef || dashId === 'principal' ? 'primetrack_webhook_tokens' : `primetrack_webhook_tokens_${dashId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  };

  const loadTrackingPixels = (dashId, isDef) => {
    if (typeof window === 'undefined') return [];
    const key = isDef || dashId === 'principal' ? 'primetrack_pixels' : `primetrack_pixels_${dashId}`;
    const userDeletedKey = currentUser?.id ? `primetrack_deleted_pixels_${currentUser.id}` : 'primetrack_deleted_pixels';
    const deletedIds = JSON.parse(localStorage.getItem(userDeletedKey) || '[]');
    const userPxKey = currentUser?.id && (isDef || dashId === 'principal') ? `primetrack_pixels_${currentUser.id}` : null;
    const saved = (userPxKey && localStorage.getItem(userPxKey)) || localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => {
            if (!p || p.name === 'UserSettings' || String(p.id || '').startsWith('settings_')) return false;
            const pxId = p.pixelId || p.internalPixelId || p.id;
            return !deletedIds.includes(pxId) && !deletedIds.includes(p.id);
          });
        }
      } catch (e) {}
    }
    return [];
  };

  const loadConnectedProfiles = (dashId, isDef) => {
    if (typeof window === 'undefined') return [];
    const key = isDef || dashId === 'principal' ? 'primetrack_connected_profiles' : `primetrack_connected_profiles_${dashId}`;
    if (localStorage.getItem('primetrack_meta_disconnected') === 'true' && (isDef || dashId === 'principal')) {
      return [];
    }
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  };

  const loadAdAccounts = (dashId, isDef) => {
    if (typeof window === 'undefined') return [];
    const isDisc = localStorage.getItem(userDisconKey) === 'true' || localStorage.getItem('primetrack_meta_disconnected') === 'true';
    if (isDisc && (isDef || dashId === 'principal')) {
      return [];
    }
    const key = isDef || dashId === 'principal' ? 'primetrack_ad_accounts' : `primetrack_ad_accounts_${dashId}`;
    const saved = localStorage.getItem(userAccKey) || localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  };

  // Webhook API Tokens State (Inicia 100% Zerado para novos dashboards)
  const [apiTokens, setApiTokens] = useState(() => loadApiTokens(activeDashboardId, isDefaultDashboard));

  // Pixel de Rastreio State (Inicia 100% Zerado para novos dashboards)
  const [trackingPixels, setTrackingPixels] = useState(() => loadTrackingPixels(activeDashboardId, isDefaultDashboard));

  useEffect(() => {
    const handleDashboardChange = (e) => {
      const nextDash = e.detail || { id: 'principal', isDefault: true, name: 'Principal' };
      setActiveDashboard(nextDash);
      const nextId = nextDash.id || 'principal';
      const nextIsDef = nextId === 'principal' || nextDash.isDefault === true;

      setApiTokens(loadApiTokens(nextId, nextIsDef));
      setTrackingPixels(loadTrackingPixels(nextId, nextIsDef));
      setConnectedProfiles(loadConnectedProfiles(nextId, nextIsDef));
      setAdAccounts(loadAdAccounts(nextId, nextIsDef));
    };

    window.addEventListener('primetrack_dashboard_changed', handleDashboardChange);
    return () => window.removeEventListener('primetrack_dashboard_changed', handleDashboardChange);
  }, []);

  const [showNewPixelModal, setShowNewPixelModal] = useState(false);
  const [newPixelName, setNewPixelName] = useState('');
  const [newPixelMetaId, setNewPixelMetaId] = useState('');
  const [newPixelCapiToken, setNewPixelCapiToken] = useState('');
  const [newPixelIcType, setNewPixelIcType] = useState('css'); // 'css', 'url', 'text'
  const [newPixelIcValue, setNewPixelIcValue] = useState('');
  const [newPixelDomains, setNewPixelDomains] = useState('');
  const [pixelToDelete, setPixelToDelete] = useState(null);
  const [pixelSuccessMsg, setPixelSuccessMsg] = useState(null);
  const [accountSwitchToast, setAccountSwitchToast] = useState(null);

  // Modal de Teste de Pixel
  const [pixelToTest, setPixelToTest] = useState(null);
  const [testSiteUrl, setTestSiteUrl] = useState('');
  const [isVerifyingPixel, setIsVerifyingPixel] = useState(false);
  const [pixelVerificationResult, setPixelVerificationResult] = useState(null); // { found: boolean, message: string }

  // Modal de Edição de Pixel
  const [pixelToEdit, setPixelToEdit] = useState(null);
  const [editPixelName, setEditPixelName] = useState('');
  const [editPixelMetaId, setEditPixelMetaId] = useState('');
  const [editPixelCapiToken, setEditPixelCapiToken] = useState('');
  const [editPixelIcType, setEditPixelIcType] = useState('css');
  const [editPixelIcValue, setEditPixelIcValue] = useState('');
  const [editPixelDomains, setEditPixelDomains] = useState('');
  const [editMetaPixelsList, setEditMetaPixelsList] = useState([]); // [{ id, metaPixelId, token, name }]
  const [editSubPixelIndex, setEditSubPixelIndex] = useState(null); // null = novo, number = editando
  const [newMetaSubPixelId, setNewMetaSubPixelId] = useState('');
  const [newMetaSubPixelToken, setNewMetaSubPixelToken] = useState('');
  const [newMetaSubPixelName, setNewMetaSubPixelName] = useState('');
  const [showAddSubPixelForm, setShowAddSubPixelForm] = useState(false);

  // Modal Conectar Plataforma Flow States (Monsterpay, Perfect Pay, Hotmart, Kiwify)
  const [showConnectPlatformModal, setShowConnectPlatformModal] = useState(false);
  const [connectPlatformStep, setConnectPlatformStep] = useState(1); // 1 = select, 2 = alias, 3 = result
  const [searchPlatform, setSearchPlatform] = useState('');
  const [selectedPlatformName, setSelectedPlatformName] = useState('Monsterpay');
  const [selectedPlatformType, setSelectedPlatformType] = useState('token'); // 'token' ou 'webhook_url'
  const [tokenAliasInput, setTokenAliasInput] = useState('monsterpay');
  const [generatedPlatformToken, setGeneratedPlatformToken] = useState('');
  const [generatedPlatformWebhookUrl, setGeneratedPlatformWebhookUrl] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedDocEndpoint, setCopiedDocEndpoint] = useState(false);

  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenStep, setNewTokenStep] = useState(1); // 1 = input, 2 = popup com o token gerado
  const [newTokenCreatedPlatform, setNewTokenCreatedPlatform] = useState('Documentação');
  const [tokenInputName, setTokenInputName] = useState('Documentação');
  const [recentCreatedToken, setRecentCreatedToken] = useState(null);
  const [copiedRecentToken, setCopiedRecentToken] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState(null);

  // Facebook Connection Flow States
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [copiedAuthLink, setCopiedAuthLink] = useState(false);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);
  const [refreshAccountsToast, setRefreshAccountsToast] = useState(null);
  const [showFacebookOAuth, setShowFacebookOAuth] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [connectedProfiles, setConnectedProfiles] = useState(() => loadConnectedProfiles(activeDashboardId, isDefaultDashboard));

  const tabs = INTEGRATION_TABS;

  const [adAccounts, setAdAccounts] = useState(() => loadAdAccounts(activeDashboardId, isDefaultDashboard));

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPassError(null);
    setPassUpdated(false);

    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 6) {
      setPassError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setPassError('A confirmação da senha não coincide com a nova senha.');
      return;
    }

    setIsSavingPass(true);

    try {
      let savedToBackend = false;

      // 1. Salva via API backend central (supabaseAdmin com Service Role Key, sem bloqueio de RLS)
      try {
        const response = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUser?.email,
            password: cleanPass
          })
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.success) {
          savedToBackend = true;
        } else if (data?.error) {
          console.warn('Resposta da API update-password:', data.error);
        }
      } catch (apiErr) {
        console.warn('Erro ao chamar /api/auth/update-password:', apiErr);
      }

      // 2. Tenta também diretamente no Supabase como garantia adicional
      if (currentUser?.email) {
        try {
          await supabase
            .from('users')
            .update({ password: cleanPass })
            .eq('email', currentUser.email);
        } catch (sbErr) {
          console.warn('Erro no update direto Supabase:', sbErr);
        }
      }

      const updatedUser = {
        ...(currentUser || {}),
        password: cleanPass,
        hasSetPassword: true
      };

      setCurrentUser(updatedUser);
      localStorage.setItem('primetrack_current_user', JSON.stringify(updatedUser));
      if (currentUser?.email) {
        localStorage.setItem(`primetrack_usr_${currentUser.email}`, JSON.stringify(updatedUser));
      }
      localStorage.removeItem('primetrack_needs_password_setup');

      setPassUpdated(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassUpdated(false), 8000);
    } catch (err) {
      console.error('Erro ao atualizar senha:', err);
      setPassError('Erro ao salvar senha no banco de dados. Tente novamente.');
    } finally {
      setIsSavingPass(false);
    }
  };

  const SUPPORTED_GATEWAY_PLATFORMS = [
    {
      id: 'monsterpay',
      name: 'Monsterpay',
      slug: 'monsterpay',
      badge: 'Nativa',
      badgeColor: 'emerald',
      type: 'token',
      logo: '/logos/monsterpay.png',
      tutorialUrl: 'https://docs.primetrack.top',
      description: 'Integração direta via token no painel da Monsterpay'
    },
    {
      id: 'perfectpay',
      name: 'Perfect Pay',
      slug: 'perfectpay',
      badge: 'Webhook',
      badgeColor: 'blue',
      type: 'webhook_url',
      logo: '/logos/perfectpay.png',
      tutorialUrl: 'https://docs.primetrack.top',
      description: 'Envio automático de pedidos via URL de Webhook'
    },
    {
      id: 'hotmart',
      name: 'Hotmart',
      slug: 'hotmart',
      badge: 'Webhook',
      badgeColor: 'blue',
      type: 'webhook_url',
      logo: '/logos/hotmart.png',
      tutorialUrl: 'https://docs.primetrack.top',
      description: 'Integração via Webhook no painel da Hotmart'
    },
    {
      id: 'kiwify',
      name: 'Kiwify',
      slug: 'kiwify',
      badge: 'Webhook',
      badgeColor: 'blue',
      type: 'webhook_url',
      logo: '/logos/kiwify.png',
      tutorialUrl: 'https://docs.primetrack.top',
      description: 'Integração via Webhook no painel da Kiwify'
    }
  ];

  const getPlatformLogo = (platformNameOrSlug) => {
    const norm = String(platformNameOrSlug || '').toLowerCase();
    if (norm.includes('monster')) return '/logos/monsterpay.png';
    if (norm.includes('perfect')) return '/logos/perfectpay.png';
    if (norm.includes('hotmart')) return '/logos/hotmart.png';
    if (norm.includes('kiwify')) return '/logos/kiwify.png';
    return null;
  };

  const handleGenerateToken = (e) => {
    if (e) e.preventDefault();
    if (trialStatus.isTrial && apiTokens.length >= 1) {
      setTrialLimitModal({
        title: 'Limite do Plano Free Atingido',
        message: 'No Plano Free você pode conectar 1 plataforma de vendas (webhook). Faça o upgrade para o Plano Pro para conectar múltiplas plataformas de checkout ilimitadas.',
        ctaText: 'Ver Planos Pro'
      });
      return;
    }
    const rawName = tokenInputName.trim() || 'Documentação';
    
    // Gera token de 48 caracteres hexadecimais no padrão pt_
    const chars = '0123456789abcdef';
    let randomHex = '';
    for (let i = 0; i < 48; i++) {
      randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullToken = `pt_${randomHex}`;

    // Data formatada DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost') 
      ? window.location.origin 
      : 'https://app.primetrack.top';

    const newTokenItem = {
      id: `tok_${Date.now()}`,
      name: rawName,
      platform: 'documentacao',
      type: 'token',
      token: fullToken,
      webhookUrl: `${baseUrl}/api/webhooks`,
      status: 'Ativo',
      lastUsed: '—',
      createdAt: formattedDate
    };

    const updated = [newTokenItem, ...apiTokens];
    setApiTokens(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_webhook_tokens', JSON.stringify(updated));
    }
    fetch('/api/webhook/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ tokens: updated, userId: currentUser?.id })
    }).catch(() => {});

    setRecentCreatedToken(fullToken);
    setNewTokenCreatedPlatform(rawName);
    setCopiedRecentToken(false);
    setNewTokenStep(2);
  };

  const handleGenerateConnectToken = (e) => {
    if (e) e.preventDefault();
    if (trialStatus.isTrial && apiTokens.length >= 1) {
      setTrialLimitModal({
        title: 'Limite do Plano Free Atingido',
        message: 'No Plano Free você pode conectar 1 plataforma de vendas (webhook). Faça o upgrade para o Plano Pro para conectar múltiplas plataformas de checkout ilimitadas.',
        ctaText: 'Ver Planos Pro'
      });
      return;
    }
    const platform = SUPPORTED_GATEWAY_PLATFORMS.find(p => p.name.toLowerCase() === selectedPlatformName.toLowerCase() || p.slug === selectedPlatformName.toLowerCase()) || {
      name: selectedPlatformName,
      slug: selectedPlatformName.toLowerCase().replace(/\s+/g, ''),
      type: selectedPlatformName.toLowerCase().includes('monster') ? 'token' : 'webhook_url'
    };

    const isMonster = platform.name.toLowerCase().includes('monster') || platform.slug === 'monsterpay' || platform.type === 'token';
    const rawAlias = tokenAliasInput.trim() || platform.name;
    
    // Gera token de 48 caracteres hexadecimais no padrão pt_
    const chars = '0123456789abcdef';
    let randomHex = '';
    for (let i = 0; i < 48; i++) {
      randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullToken = `pt_${randomHex}`;

    const baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost') 
      ? window.location.origin 
      : 'https://app.primetrack.top';

    const webhookUrl = isMonster ? '' : `${baseUrl}/webhook/${fullToken}/${platform.slug}`;

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newTokenItem = {
      id: `tok_${Date.now()}`,
      name: rawAlias,
      platform: platform.slug,
      type: isMonster ? 'token' : 'webhook_url',
      token: fullToken,
      webhookUrl: isMonster ? '' : webhookUrl,
      status: 'Ativo',
      lastUsed: '—',
      createdAt: formattedDate
    };

    const updated = [newTokenItem, ...apiTokens];
    setApiTokens(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(getScopedKey('primetrack_webhook_tokens'), JSON.stringify(updated));
    }
    fetch('/api/webhook/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ tokens: updated, userId: currentUser?.id })
    }).catch(() => {});

    setGeneratedPlatformToken(fullToken);
    setGeneratedPlatformWebhookUrl(isMonster ? '' : webhookUrl);
    setSelectedPlatformType(isMonster ? 'token' : 'webhook_url');
    setCopiedToken(false);
    setCopiedWebhookUrl(false);
    setConnectPlatformStep(3);
  };

  const handleQuickConnectPlatform = (platformOrName = 'Monsterpay') => {
    if (trialStatus.isTrial && apiTokens.length >= 1) {
      setShowConnectPlatformModal(false);
      setTrialLimitModal({
        title: 'Limite do Plano Free Atingido',
        message: 'No Plano Free você pode conectar 1 plataforma de vendas (webhook). Faça o upgrade para o Plano Pro para conectar múltiplas plataformas de checkout ilimitadas.',
        ctaText: 'Ver Planos Pro'
      });
      return;
    }
    const platform = typeof platformOrName === 'object'
      ? platformOrName
      : SUPPORTED_GATEWAY_PLATFORMS.find(p => p.name.toLowerCase() === platformOrName.toLowerCase() || p.slug === platformOrName.toLowerCase()) || {
          id: platformOrName.toLowerCase(),
          name: platformOrName,
          slug: platformOrName.toLowerCase().replace(/\s+/g, ''),
          type: platformOrName.toLowerCase().includes('monster') ? 'token' : 'webhook_url'
        };

    const isMonster = platform.name.toLowerCase().includes('monster') || platform.slug === 'monsterpay' || platform.type === 'token';

    setSelectedPlatformName(platform.name);
    setSelectedPlatformType(isMonster ? 'token' : 'webhook_url');

    // Gera token de 48 caracteres hexadecimais no padrão pt_
    const chars = '0123456789abcdef';
    let randomHex = '';
    for (let i = 0; i < 48; i++) {
      randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullToken = `pt_${randomHex}`;

    const baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost') 
      ? window.location.origin 
      : 'https://app.primetrack.top';

    const webhookUrl = isMonster ? '' : `${baseUrl}/webhook/${fullToken}/${platform.slug}`;

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newTokenItem = {
      id: `tok_${Date.now()}`,
      name: platform.name,
      platform: platform.slug,
      type: isMonster ? 'token' : 'webhook_url',
      token: fullToken,
      webhookUrl: isMonster ? '' : webhookUrl,
      status: 'Ativo',
      lastUsed: '—',
      createdAt: formattedDate
    };

    const updated = [newTokenItem, ...apiTokens];
    setApiTokens(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(getScopedKey('primetrack_webhook_tokens'), JSON.stringify(updated));
    }
    fetch('/api/webhook/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ tokens: updated, userId: currentUser?.id })
    }).catch(() => {});

    setGeneratedPlatformToken(fullToken);
    setGeneratedPlatformWebhookUrl(isMonster ? '' : webhookUrl);
    setCopiedToken(false);
    setCopiedWebhookUrl(false);
    setConnectPlatformStep(3); // Vai direto para a tela final
  };

  const copyPlatformField = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === 'url') {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    }
  };

  const handleDeleteToken = (tokenId) => {
    const updated = apiTokens.filter(t => t.id !== tokenId);
    setApiTokens(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(getScopedKey('primetrack_webhook_tokens'), JSON.stringify(updated));
    }
    fetch('/api/webhook/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ tokens: updated, userId: currentUser?.id })
    }).catch(() => {});
  };

  const handleToggleSync = (accountId) => {
    const cleanTargetId = String(accountId).replace('act_', '');
    const target = adAccounts.find(a => String(a.id).replace('act_', '') === cleanTargetId);
    if (!target) return;

    const nextSync = !target.sync;
    let updated;
    // Se o usuário está desativando a conta
    if (!nextSync) {
      updated = adAccounts.map(a => String(a.id).replace('act_', '') === cleanTargetId ? { ...a, sync: false } : a);
      setAccountSwitchToast(`Conta "${target.name}" desativada.`);
    } else {
      // Se está ativando
      if (trialStatus.isTrial) {
        // No Plano Free, apenas 1 conta pode ficar ativa por vez!
        // Desativa todas as outras e ativa esta
        updated = adAccounts.map(a => ({
          ...a,
          sync: String(a.id).replace('act_', '') === cleanTargetId
        }));
        setAccountSwitchToast(`Conta "${target.name}" ativada com sucesso! (No Plano Free, 1 conta de anúncio ativa)`);
      } else {
        updated = adAccounts.map(a => String(a.id).replace('act_', '') === cleanTargetId ? { ...a, sync: true } : a);
        setAccountSwitchToast(`Conta "${target.name}" ativada com sucesso.`);
      }
    }

    setAdAccounts(updated);
    const activeIds = updated.filter(a => a.sync).map(a => String(a.id).replace('act_', ''));
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_ad_accounts', JSON.stringify(updated));
      localStorage.setItem(userAccKey, JSON.stringify(updated));
      localStorage.setItem(getScopedKey('primetrack_ad_accounts'), JSON.stringify(updated));
      // Mantém os caches de campanhas intactos mesmo se todas as contas forem desativadas
      // para que o histórico de dias passados continue sempre disponível no Dashboard
    }

    // Persiste no backend imediatamente para nunca perder a configuração
    fetch('/api/meta/accounts/sync-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ activeAccounts: activeIds, accountId: cleanTargetId, syncActive: nextSync, userId: currentUser?.id })
    }).catch(err => console.warn('Erro ao salvar status da conta no servidor:', err.message));

    // Se ativou conta(s), dispara sincronização com o Meta Ads imediatamente e armazena resultado no cache
    if (activeIds.length > 0) {
      fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ accountIds: activeIds, datePreset: 'today', userId: currentUser?.id })
      })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
          safeStorageSet(userCampKey, data.campaigns);
          safeStorageSet('primetrack_cached_campaigns', data.campaigns);
          window.dispatchEvent(new Event('primetrack_profile_sync'));
        }
      })
      .catch(err => console.warn('Erro ao sincronizar Meta:', err.message));
    }

    window.dispatchEvent(new Event('primetrack_profile_sync'));
    setTimeout(() => setAccountSwitchToast(null), 4500);
  };

  const handleSavePixel = (e) => {
    e.preventDefault();
    if (!newPixelName.trim() || !newPixelMetaId.trim()) return;

    if (trialStatus.isTrial && trackingPixels.length >= 1) {
      setTrialLimitModal({
        title: 'Limite do Plano Free Atingido',
        message: 'No Plano Free você pode criar no máximo 1 pixel de rastreio. Faça o upgrade para o Plano Pro para criar múltiplos pixels ilimitados.',
        ctaText: 'Ver Planos Pro'
      });
      return;
    }

    const ruleLabel = newPixelIcType === 'css' 
      ? `css ${newPixelIcValue.trim() || '.btn-checkout'}` 
      : newPixelIcType === 'url' 
        ? `url contendo ${newPixelIcValue.trim() || '/checkout'}` 
        : `texto contendo "${newPixelIcValue.trim() || 'Comprar'}"`;

    const autoInternalPixelId = `pt_px_${Math.random().toString(36).substr(2, 12)}`;

    const newPx = {
      id: `px_${Date.now()}`,
      name: newPixelName.trim(),
      internalPixelId: autoInternalPixelId,
      pixelId: autoInternalPixelId, // Código identificador único PrimeTrack no script
      metaPixelId: newPixelMetaId.trim(), // ID do Pixel do Facebook/Meta (ex: 1056706567239394)
      capiToken: newPixelCapiToken.trim() || 'EAAB••••••••••••',
      capiTokenRaw: newPixelCapiToken.trim(),
      icType: newPixelIcType,
      icValue: newPixelIcValue.trim(),
      icRule: ruleLabel,
      domains: newPixelDomains.trim() || '*',
      status: 'Ativo',
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    const updated = [newPx, ...trackingPixels];
    setTrackingPixels(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_pixels', JSON.stringify(updated));
      localStorage.setItem(getScopedKey('primetrack_pixels'), JSON.stringify(updated));
      if (currentUser?.id) {
        localStorage.setItem(`primetrack_pixels_${currentUser.id}`, JSON.stringify(updated));
      }
    }
    fetch('/api/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ pixels: updated, userId: currentUser?.id })
    }).catch(() => {});
    setShowNewPixelModal(false);
    setNewPixelName('');
    setNewPixelMetaId('');
    setNewPixelCapiToken('');
    setNewPixelIcType('css');
    setNewPixelIcValue('');
    setNewPixelDomains('');
    setPixelSuccessMsg(`Pixel "${newPx.name}" configurado com sucesso!`);
    setTimeout(() => setPixelSuccessMsg(null), 3500);
  };

  const handleOpenEditPixel = (px) => {
    setPixelToEdit(px);
    setEditPixelName(px.name || '');
    setEditPixelMetaId(px.metaPixelId || '');
    setEditPixelCapiToken(px.capiTokenRaw || px.capiToken || '');
    const currentType = px.icType || (px.icRule && px.icRule.startsWith('url') ? 'url' : px.icRule && px.icRule.startsWith('texto') ? 'text' : 'css');
    setEditPixelIcType(currentType);
    setEditPixelIcValue(px.icValue !== undefined ? px.icValue : '');
    setEditPixelDomains(px.domains === '*' ? '' : (px.domains || ''));
    
    // Lista de múltiplos Pixels Meta (igual UTMify)
    let metaList = [];
    if (Array.isArray(px.metaPixels) && px.metaPixels.length > 0) {
      metaList = [...px.metaPixels];
    } else if (px.metaPixelId) {
      metaList = [{
        id: `mp_${Date.now()}`,
        metaPixelId: px.metaPixelId,
        capiToken: px.capiTokenRaw || px.capiToken || '',
        name: px.name || 'Pixel Principal'
      }];
    }
    setEditMetaPixelsList(metaList);
    setNewMetaSubPixelId('');
    setNewMetaSubPixelToken('');
    setNewMetaSubPixelName('');
    setShowAddSubPixelForm(false);
  };

  const handleAddMetaSubPixel = (e) => {
    e?.preventDefault();
    if (!newMetaSubPixelId.trim()) return;

    if (editSubPixelIndex !== null && editSubPixelIndex >= 0 && editSubPixelIndex < editMetaPixelsList.length) {
      // Editando pixel existente
      const updatedList = [...editMetaPixelsList];
      updatedList[editSubPixelIndex] = {
        ...updatedList[editSubPixelIndex],
        metaPixelId: newMetaSubPixelId.trim(),
        capiToken: newMetaSubPixelToken.trim(),
        name: newMetaSubPixelName.trim() || updatedList[editSubPixelIndex].name || `Pixel Meta ${editSubPixelIndex + 1}`
      };
      setEditMetaPixelsList(updatedList);
    } else {
      // Novo pixel
      const newEntry = {
        id: `mp_${Date.now()}`,
        metaPixelId: newMetaSubPixelId.trim(),
        capiToken: newMetaSubPixelToken.trim(),
        name: newMetaSubPixelName.trim() || `Pixel Meta ${editMetaPixelsList.length + 1}`
      };
      setEditMetaPixelsList([...editMetaPixelsList, newEntry]);
    }

    setNewMetaSubPixelId('');
    setNewMetaSubPixelToken('');
    setNewMetaSubPixelName('');
    setEditSubPixelIndex(null);
    setShowAddSubPixelForm(false);
  };

  const handleRemoveMetaSubPixel = (subId) => {
    setEditMetaPixelsList(editMetaPixelsList.filter(p => p.id !== subId));
  };

  const handleUpdatePixel = (e) => {
    e.preventDefault();
    if (!pixelToEdit || !editPixelName.trim()) return;

    let finalMetaList = [...editMetaPixelsList];
    // Se o usuário digitou dados no formulário de subpixel mas não clicou no botão "Confirmar", inclui automaticamente
    if (newMetaSubPixelId && newMetaSubPixelId.trim()) {
      const pendingSubId = newMetaSubPixelId.trim();
      const existingIdx = editSubPixelIndex !== null && editSubPixelIndex >= 0 ? editSubPixelIndex : -1;
      if (existingIdx >= 0 && existingIdx < finalMetaList.length) {
        finalMetaList[existingIdx] = {
          ...finalMetaList[existingIdx],
          metaPixelId: pendingSubId,
          capiToken: newMetaSubPixelToken.trim(),
          name: newMetaSubPixelName.trim() || finalMetaList[existingIdx].name || `Pixel Meta ${existingIdx + 1}`
        };
      } else if (!finalMetaList.some(m => m.metaPixelId === pendingSubId)) {
        finalMetaList.push({
          id: `mp_${Date.now()}`,
          metaPixelId: pendingSubId,
          capiToken: newMetaSubPixelToken.trim(),
          name: newMetaSubPixelName.trim() || `Pixel Meta ${finalMetaList.length + 1}`
        });
      }
    }

    const ruleLabel = editPixelIcType === 'css' 
      ? `css ${editPixelIcValue.trim() || '.btn-checkout'}` 
      : editPixelIcType === 'url' 
        ? `url contendo ${editPixelIcValue.trim() || '/checkout'}` 
        : `texto contendo "${editPixelIcValue.trim() || 'Comprar'}"`;

    // O pixel principal assume o primeiro da lista se houver
    const primaryMetaId = finalMetaList.length > 0 
      ? finalMetaList[0].metaPixelId 
      : editPixelMetaId.trim();
    const primaryToken = finalMetaList.length > 0 
      ? finalMetaList[0].capiToken 
      : editPixelCapiToken.trim();

    const updated = trackingPixels.map(px => {
      if (px.id === pixelToEdit.id) {
        return {
          ...px,
          name: editPixelName.trim(),
          metaPixelId: primaryMetaId,
          capiTokenRaw: primaryToken,
          capiToken: primaryToken,
          metaPixels: finalMetaList, // Guarda a lista completa de pixels da Meta
          icType: editPixelIcType,
          icValue: editPixelIcValue.trim(),
          icRule: ruleLabel,
          domains: editPixelDomains.trim() || '*'
        };
      }
      return px;
    });

    setTrackingPixels(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_pixels', JSON.stringify(updated));
      localStorage.setItem(getScopedKey('primetrack_pixels'), JSON.stringify(updated));
      if (currentUser?.id) {
        localStorage.setItem(`primetrack_pixels_${currentUser.id}`, JSON.stringify(updated));
      }
    }
    fetch('/api/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ pixels: updated, userId: currentUser?.id })
    }).catch(() => {});
    setPixelToEdit(null);
    setPixelSuccessMsg(`Pixel "${editPixelName.trim()}" atualizado com sucesso!`);
    setTimeout(() => setPixelSuccessMsg(null), 3500);
  };

  const handleOpenTestPixel = (px) => {
    setPixelToTest(px);
    setTestSiteUrl('');
    setPixelVerificationResult(null);
  };

  const handleVerifyPixelScript = async (e) => {
    e?.preventDefault();
    if (!testSiteUrl.trim() || isVerifyingPixel) return;

    setIsVerifyingPixel(true);
    setPixelVerificationResult(null);

    try {
      const res = await fetch('/api/pixel/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testSiteUrl.trim(),
          pixelId: pixelToTest?.pixelId || pixelToTest?.internalPixelId,
          metaPixelId: pixelToTest?.metaPixelId,
          icType: pixelToTest?.icType,
          icValue: pixelToTest?.icValue
        })
      });
      const data = await res.json();
      setPixelVerificationResult({
        found: data.found === true,
        message: data.message || (data.found ? 'Pixel funcionando corretamente' : 'Script do PrimeTrack não encontrado no HTML do site.')
      });
    } catch (err) {
      setPixelVerificationResult({
        found: false,
        message: 'Não foi possível conectar ao site para verificar o script. Verifique se o site está online e publicado.'
      });
    } finally {
      setIsVerifyingPixel(false);
    }
  };

  const handleTogglePixelStatus = (pxId) => {
    const updated = trackingPixels.map(px => px.id === pxId ? { ...px, status: px.status === 'Ativo' ? 'Inativo' : 'Ativo' } : px);
    setTrackingPixels(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_pixels', JSON.stringify(updated));
      localStorage.setItem(getScopedKey('primetrack_pixels'), JSON.stringify(updated));
      if (currentUser?.id) {
        localStorage.setItem(`primetrack_pixels_${currentUser.id}`, JSON.stringify(updated));
      }
    }
    fetch('/api/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
      body: JSON.stringify({ pixels: updated, userId: currentUser?.id })
    }).catch(() => {});
  };

  const handleDeletePixel = async (pxId) => {
    const targetPx = trackingPixels.find(px => px.id === pxId || px.pixelId === pxId);
    const idToFilter = targetPx ? (targetPx.pixelId || targetPx.id) : pxId;
    const updated = trackingPixels.filter(px => px.id !== pxId && px.pixelId !== pxId && px.id !== idToFilter && px.pixelId !== idToFilter);
    setTrackingPixels(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_pixels', JSON.stringify(updated));
      localStorage.setItem(getScopedKey('primetrack_pixels'), JSON.stringify(updated));
      if (currentUser?.id) {
        localStorage.setItem(`primetrack_pixels_${currentUser.id}`, JSON.stringify(updated));
      }
      
      const userDeletedKey = currentUser?.id ? `primetrack_deleted_pixels_${currentUser.id}` : 'primetrack_deleted_pixels';
      const deletedIds = JSON.parse(localStorage.getItem(userDeletedKey) || '[]');
      if (idToFilter && !deletedIds.includes(idToFilter)) {
        deletedIds.push(idToFilter);
      }
      if (pxId && !deletedIds.includes(pxId)) {
        deletedIds.push(pxId);
      }
      localStorage.setItem(userDeletedKey, JSON.stringify(deletedIds));
    }
    try {
      await fetch('/api/pixels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ pixels: updated, userId: currentUser?.id })
      });
      setPixelSuccessMsg('Pixel excluído com sucesso!');
      setTimeout(() => setPixelSuccessMsg(null), 3000);
    } catch (err) {
      console.warn('Erro ao sincronizar exclusão de pixel:', err);
    }
    setPixelToDelete(null);
  };

  const [connectionSuccessMsg, setConnectionSuccessMsg] = useState(null);
  const [disconnectToast, setDisconnectToast] = useState(null);

  const handleDisconnect = async (profileId) => {
    try {
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ profileId, userId: currentUser?.id })
      });
      const data = await res.json().catch(() => ({}));

      if (data.success) {
        const remainingConns = (data.connections || []).map(c => ({
          id: c.id,
          name: c.name,
          initial: c.name ? c.name.charAt(0).toUpperCase() : 'M',
          accountsCount: c.accountsCount || 0,
          isNew: true
        }));
        setConnectedProfiles(remainingConns);

        const newMappedAccs = Array.isArray(data.adAccounts) ? data.adAccounts.map(a => {
          const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
          const isAccountActive = a.status === 'ACTIVE' || a.status === 'Ativa' || a.account_status === 1;
          const isRealPrepay = a.isPrepay === true || accId === '1218349886840112';
          const realBalance = isRealPrepay ? (a.balance || '4,05') : '0,00';
          const realCurrency = a.currency === 'USD' || a.rawCurrency === 'USD' ? 'USD' : (a.currency || a.rawCurrency || 'BRL');
          return {
            name: a.name || 'Conta',
            id: accId,
            bm: a.businessName || 'BM Principal',
            currency: realCurrency,
            status: isAccountActive ? 'Ativa' : 'Bloqueada',
            balance: realBalance,
            amountSpent: a.amountSpent || '0,00',
            sync: a.syncActive !== false,
            isPrepay: isRealPrepay
          };
        }) : [];

        setAdAccounts(newMappedAccs);

        if (remainingConns.length === 0) {
          localStorage.setItem('primetrack_meta_disconnected', 'true');
          localStorage.removeItem('primetrack_connected_profiles');
          localStorage.removeItem('primetrack_ad_accounts');
          localStorage.removeItem('primetrack_cached_campaigns');
        } else {
          localStorage.removeItem('primetrack_meta_disconnected');
          localStorage.setItem('primetrack_connected_profiles', JSON.stringify(remainingConns));
          localStorage.setItem('primetrack_ad_accounts', JSON.stringify(newMappedAccs));
        }

        window.dispatchEvent(new Event('primetrack_profile_sync'));
        setDisconnectToast('Perfil e contas de anúncios desconectados com sucesso! As campanhas foram removidas.');
        setTimeout(() => setDisconnectToast(null), 4000);
        return;
      }
    } catch (e) {
      console.error('Erro ao desconectar perfil:', e);
    }

    // Fallback optimista caso a rede falhe
    const remaining = connectedProfiles.filter(p => String(p.id) !== String(profileId));
    setConnectedProfiles(remaining);
    
    if (remaining.length === 0) {
      setAdAccounts([]);
      localStorage.setItem('primetrack_meta_disconnected', 'true');
      localStorage.removeItem('primetrack_connected_profiles');
      localStorage.removeItem('primetrack_ad_accounts');
      localStorage.removeItem('primetrack_cached_campaigns');
    } else {
      localStorage.setItem('primetrack_connected_profiles', JSON.stringify(remaining));
      fetch(`/api/meta/status${currentUser?.id ? `?userId=${currentUser.id}` : ''}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      }).then(r => r.json()).then(d => {
        if (Array.isArray(d.adAccounts)) {
          setAdAccounts(d.adAccounts);
          localStorage.setItem('primetrack_ad_accounts', JSON.stringify(d.adAccounts));
        }
      }).catch(() => {});
    }
    window.dispatchEvent(new Event('primetrack_profile_sync'));
    setDisconnectToast('Perfil e contas de anúncios desconectados com sucesso! As campanhas foram removidas.');
    setTimeout(() => setDisconnectToast(null), 4000);
  };

  const handleDisconnectAll = async () => {
    try {
      await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
        body: JSON.stringify({ userId: currentUser?.id })
      });
    } catch (e) {
      console.error(e);
    }

    setConnectedProfiles([]);
    setAdAccounts([]);
    localStorage.setItem('primetrack_meta_disconnected', 'true');
    localStorage.removeItem('primetrack_connected_profiles');
    localStorage.removeItem('primetrack_ad_accounts');
    localStorage.removeItem('primetrack_cached_campaigns');
    window.dispatchEvent(new Event('primetrack_profile_sync'));

    setDisconnectToast('Todos os perfis e contas foram desconectados com sucesso.');
    setTimeout(() => setDisconnectToast(null), 4000);
  };

  React.useEffect(() => {
    // Verifica retorno do OAuth ou aba solicitada via URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'app') {
      setActiveTab('Baixe nosso App');
    }

    if (params.get('connected') === 'true') {
      localStorage.removeItem('primetrack_meta_disconnected');
      // Limpa cache antigo de contas ativas para garantir que todas venham desativadas na nova conexão
      localStorage.removeItem('primetrack_ad_accounts');
      const userName = params.get('name') || 'Perfil';
      setConnectionSuccessMsg(`🎉 Perfil ${userName} conectado com sucesso ao PrimeTrack!`);
      setTimeout(() => setConnectionSuccessMsg(null), 5000);
      window.history.replaceState({}, document.title, window.location.pathname);
      window.dispatchEvent(new Event('primetrack_profile_sync'));
    }

    // Se estiver em um dashboard secundário, NÃO carrega os dados do dashboard Principal:
    // Começa 100% zerado e isolado para este dashboard
    if (!isDefaultDashboard) {
      setConnectedProfiles(loadConnectedProfiles(activeDashboardId, false));
      setAdAccounts(loadAdAccounts(activeDashboardId, false));
      setTrackingPixels(loadTrackingPixels(activeDashboardId, false));
      setApiTokens(loadApiTokens(activeDashboardId, false));
      return;
    }

    // Busca status real das conexões salvas no backend (isolado por usuário)
    const userHeader = currentUser?.id ? { 'x-user-id': currentUser.id } : {};
    fetch(`/api/meta/status${currentUser?.id ? `?userId=${currentUser.id}` : ''}`, {
      headers: userHeader
    })
      .then(res => res.json())
      .then(data => {
        if (data.connections && data.connections.length > 0) {
          localStorage.removeItem('primetrack_meta_disconnected');
          const mapped = data.connections.map(c => ({
            id: c.id,
            name: c.name,
            initial: c.name ? c.name.charAt(0).toUpperCase() : 'M',
            accountsCount: c.accountsCount || (data.adAccounts ? data.adAccounts.length : 0),
            isNew: true
          }));
          setConnectedProfiles(mapped);
          localStorage.setItem('primetrack_connected_profiles', JSON.stringify(mapped));
        } else if (data && Array.isArray(data.connections) && data.connections.length === 0) {
          // Se backend explicitamente reportar 0 conexões (ex: nova instalação ou analista Meta)
          setConnectedProfiles([]);
          setAdAccounts([]);
          localStorage.removeItem('primetrack_connected_profiles');
          localStorage.removeItem('primetrack_ad_accounts');
          localStorage.removeItem(userAccKey);
        }

        if (Array.isArray(data.adAccounts)) {
          if (data.adAccounts.length === 0) {
            setAdAccounts([]);
            localStorage.removeItem('primetrack_ad_accounts');
            localStorage.removeItem(userAccKey);
          } else {
            const savedLocal = typeof window !== 'undefined' 
              ? (localStorage.getItem(userAccKey) || localStorage.getItem('primetrack_ad_accounts')) 
              : null;
            let localSyncMap = {};
            if (savedLocal) {
              try {
                const parsed = JSON.parse(savedLocal);
                if (Array.isArray(parsed)) {
                  parsed.forEach(p => {
                    if (p.id) {
                      const cleanKey = String(p.id).replace('act_', '');
                      localSyncMap[cleanKey] = p.sync;
                      localSyncMap[`act_${cleanKey}`] = p.sync;
                    }
                  });
                }
              } catch (e) {}
            }

            const mappedAccs = data.adAccounts.map(a => {
              const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
              const isAccountActive = a.status === 'ACTIVE' || a.status === 'Ativa' || a.account_status === 1;
              // Prioridade: status real do backend/Supabase > fallback para localStorage local
              const isSyncActive = a.syncActive !== undefined
                ? (a.syncActive === true)
                : (localSyncMap[accId] !== undefined ? localSyncMap[accId] === true : false);

              const isRealPrepay = a.isPrepay === true || accId === '1218349886840112';
              const realBalance = isRealPrepay ? (a.balance || '4,05') : '0,00';
              const realCurrency = a.currency === 'USD' || a.rawCurrency === 'USD' || ['1043285988469816', '1092137896602979', '1611243834049326', '28591581777115664'].includes(accId)
                ? 'USD'
                : (a.currency || a.rawCurrency || 'BRL');

              return {
                name: a.name || 'Conta',
                id: accId,
                bm: a.businessName || 'BM Principal',
                currency: realCurrency,
                status: isAccountActive ? 'Ativa' : 'Bloqueada',
                balance: realBalance,
                amountSpent: a.amountSpent || '0,00',
                sync: isSyncActive,
                isPrepay: isRealPrepay
              };
            });
            setAdAccounts(mappedAccs);
            localStorage.setItem('primetrack_ad_accounts', JSON.stringify(mappedAccs));
            localStorage.setItem(userAccKey, JSON.stringify(mappedAccs));
          }
        }
      })
      .catch(e => console.log('Backend offline ou usando cache local'));

    // Sincroniza pixels cadastrados com o banco de dados / backend (isolado por usuário)
    fetch(`/api/pixels${currentUser?.id ? `?userId=${currentUser.id}` : ''}`, {
      headers: userHeader
    })
      .then(res => res.json())
      .then(pixels => {
        if (Array.isArray(pixels)) {
          const userDeletedKey = currentUser?.id ? `primetrack_deleted_pixels_${currentUser.id}` : 'primetrack_deleted_pixels';
          const deletedIds = JSON.parse(localStorage.getItem(userDeletedKey) || '[]');
          const cleanPixels = pixels.filter(p => {
            if (!p || p.name === 'UserSettings' || String(p.id || '').startsWith('settings_')) return false;
            const pxId = p.pixelId || p.internalPixelId || p.id;
            return !deletedIds.includes(pxId) && !deletedIds.includes(p.id);
          });
          setTrackingPixels(cleanPixels);
          if (typeof window !== 'undefined') {
            localStorage.setItem('primetrack_pixels', JSON.stringify(cleanPixels));
            localStorage.setItem(getScopedKey('primetrack_pixels'), JSON.stringify(cleanPixels));
            if (currentUser?.id) {
              localStorage.setItem(`primetrack_pixels_${currentUser.id}`, JSON.stringify(cleanPixels));
            }
          }
        }
      })
      .catch(() => {});

    // Sincroniza tokens de Webhook API com o servidor (isolado por usuário)
    fetch(`/api/webhook/tokens${currentUser?.id ? `?userId=${currentUser.id}` : ''}`, {
      headers: userHeader
    })
      .then(res => res.json())
      .then(tokens => {
        if (Array.isArray(tokens)) {
          let localTokens = [];
          if (typeof window !== 'undefined') {
            try {
              const saved = localStorage.getItem('primetrack_webhook_tokens');
              if (saved) localTokens = JSON.parse(saved);
            } catch (e) {}
          }

          // Merge: se o usuário criou tokens localmente, preserva
          const mergedMap = new Map();
          tokens.forEach(t => {
            const k = t.token || t.id;
            if (k) mergedMap.set(k, t);
          });
          localTokens.forEach(t => {
            const k = t.token || t.id;
            if (k && !mergedMap.has(k)) {
              mergedMap.set(k, t);
            }
          });

          const combined = Array.from(mergedMap.values());
          setApiTokens(combined);
          if (typeof window !== 'undefined') {
            localStorage.setItem('primetrack_webhook_tokens', JSON.stringify(combined));
          }

          // Se tiver tokens locais que ainda não estavam no servidor, sincroniza agora
          if (combined.length > tokens.length) {
            fetch('/api/webhook/tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}) },
              body: JSON.stringify({ tokens: combined, userId: currentUser?.id })
            }).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  const pixelScript = `<!-- PrimeTrack Pixel -->
<script>
  window.pixelId = "pt_px_590fedcfff65";
  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute("src", "https://app.primetrack.top/pixel.js");
  document.head.appendChild(a);
</script>`;

  const utmString = `utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === 'utm') {
      setCopiedUTM(true);
      setTimeout(() => setCopiedUTM(false), 2000);
    } else if (type === 'pixel') {
      setCopiedPixel(true);
      setTimeout(() => setCopiedPixel(false), 2000);
    }
  };


  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Integrações
        </h1>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Conecte suas contas de anúncios e configure o rastreamento
        </p>
      </div>

      {/* Horizontal Nav Tabs matching Screenshots */}
      <div className="flex items-center gap-6 border-b border-[#1E293B] text-xs font-medium overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`pb-3 transition-colors relative whitespace-nowrap ${
              activeTab === tab
                ? 'text-[#5C9BFF] font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{tab}</span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF]" />
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Facebook Ads                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'Facebook Ads' && (
        <div className="space-y-6">
          
          {/* Connection Success Toast */}
          {connectionSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2.5 animate-bounce">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span>{connectionSuccessMsg}</span>
            </div>
          )}
          
          {/* Perfil Conectados Card */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="font-bold text-white text-sm">
                Perfil Conectados ({connectedProfiles.length})
              </h3>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Facebook</span>
                </button>
              </div>
            </div>

            {/* Toast de Alternância de Conta */}
            {accountSwitchToast && (
              <div className="mb-4 p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{accountSwitchToast}</span>
              </div>
            )}

            {/* Toast de Desconexão */}
            {disconnectToast && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-2.5 animate-bounce">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{disconnectToast}</span>
              </div>
            )}

            {/* Profiles List */}
            {connectedProfiles.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#0D1424] border border-dashed border-[#1E293B]">
                <ShieldAlert className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <div className="font-bold text-white text-xs">Nenhum perfil do Facebook conectado</div>
                <p className="text-zinc-500 text-[11px] mt-1">
                  Clique em "Adicionar Facebook" para conectar sua conta de anúncios com segurança.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectedProfiles.map((prof) => {
                  const isMuriloBackup = (prof.name || '').toLowerCase().includes('murilo');
                  return (
                    <div key={prof.id} className="p-4 rounded-xl bg-[#0D1424] border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0066FF] text-white font-bold text-sm flex items-center justify-center font-mono shrink-0 shadow-md">
                          {prof.initial}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-2 flex-wrap">
                            <span>{prof.name}</span>
                            {isMuriloBackup && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span>Perfil Backup (Seguro)</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            ID: {prof.id} · {prof.accountsCount} conta(s) de anúncio
                          </div>
                          {isMuriloBackup ? (
                            <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>Modo Leitura e Sincronização Seguro: Nenhuma escrita no Meta é disparada através deste perfil backup.</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Acesso Total: Edição de orçamento, duplicação e gerenciamento de campanhas.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                          ● Conectado
                        </span>
                        <button 
                          onClick={() => handleDisconnect(prof.id)}
                          className="px-3 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Desconectar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contas de Anúncio Table matching Screenshot 4 */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Contas de Anúncio ({adAccounts.length})</span>
                {trialStatus.isTrial && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-bold">
                    {adAccounts.filter(a => a.sync).length}/1 ativa no Plano Free
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={async () => {
                    setIsRefreshingAccounts(true);
                    try {
                      const res = await fetch('/api/meta/refresh-accounts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || '' },
                        body: JSON.stringify({ userId: currentUser?.id })
                      });
                      const d = await res.json();
                      if (d.success) {
                        setRefreshAccountsToast(`✨ ${d.count} conta(s) atualizadas diretamente da Meta!`);
                        setTimeout(() => setRefreshAccountsToast(null), 4000);
                        // Recarrega status
                        const statusRes = await fetch(`/api/meta/status${currentUser?.id ? `?userId=${currentUser.id}` : ''}`, {
                          headers: { 'x-user-id': currentUser?.id || '' }
                        });
                        const statusData = await statusRes.json();
                        if (statusData.adAccounts) {
                          setAdAccounts(statusData.adAccounts.map(a => ({
                            name: a.name || 'Conta',
                            id: (a.accountId || a.id || '').replace('act_', ''),
                            bm: a.businessName || 'BM Principal',
                            currency: a.currency || 'BRL',
                            status: a.status === 'ACTIVE' || a.status === 'Ativa' ? 'Ativa' : 'Bloqueada',
                            balance: a.balance || '0,00',
                            sync: a.syncActive === true
                          })));
                        }
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsRefreshingAccounts(false);
                    }
                  }}
                  disabled={isRefreshingAccounts}
                  className="px-2.5 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] text-[#5C9BFF] hover:text-white border border-[#1E293B] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Buscar novas contas criadas no perfil conectado"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingAccounts ? 'animate-spin text-blue-400' : ''}`} />
                  <span>{isRefreshingAccounts ? 'Buscando contas...' : 'Atualizar Novas Contas'}</span>
                </button>
              </div>
            </div>

            {/* Toast de Atualização de Novas Contas */}
            {refreshAccountsToast && (
              <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 text-blue-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>{refreshAccountsToast}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#141C2E] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3 px-4">CONTA</th>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">BM</th>
                    <th className="py-3 px-4">SALDO</th>
                    <th className="py-3 px-4">MOEDA</th>
                    <th className="py-3 px-4 text-center">STATUS META</th>
                    <th className="py-3 px-4 text-center">SINCRONIZAÇÃO</th>
                    <th className="py-3 px-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-sans">
                  {adAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans text-xs">
                        Nenhuma conta de anúncio conectada. Clique em "Adicionar Facebook" acima para conectar seu perfil.
                      </td>
                    </tr>
                  ) : (
                    adAccounts.map((acc, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        {acc.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400">
                        {acc.id}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                        {acc.bm}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold text-xs">
                        R$ {acc.balance || '0,00'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                        {acc.currency || 'BRL'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                          acc.status === 'Ativa'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {acc.sync ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0066FF] text-white font-mono text-[10px] font-bold">
                            <span>● Ativa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                            <span>○ Inativa</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <button 
                          onClick={() => handleToggleSync(acc.id)}
                          className={`text-xs hover:underline cursor-pointer font-semibold ${acc.sync ? 'text-zinc-400 hover:text-white' : 'text-[#5C9BFF]'}`}
                        >
                          {acc.sync ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 border-t border-[#1E293B] text-xs font-mono text-zinc-500">
              {trialStatus.isTrial 
                ? `${adAccounts.filter(a => a.sync).length} de 1 conta ativa permitida no Plano Free` 
                : `${adAccounts.filter(a => a.sync).length} conta(s) ativa(s) de ${adAccounts.length} disponíveis`}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Pixel de Rastreio (Screenshot 5)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'Pixel de Rastreio' && (
        <div className="space-y-6">
          
          {/* Success toast if any */}
          {pixelSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{pixelSuccessMsg}</span>
            </div>
          )}

          {/* Pixels de Rastreio Card */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 shadow-md space-y-6">
            
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Pixels de Rastreio ({trackingPixels.length}/{trialStatus.isTrial ? 1 : '∞'})</span>
                {trialStatus.isTrial && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-bold">
                    Máx 1 no Plano Free
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (trialStatus.isTrial && trackingPixels.length >= 1) {
                      setTrialLimitModal({
                        title: 'Limite do Plano Free Atingido',
                        message: 'No Plano Free você pode criar no máximo 1 pixel de rastreio da PrimeTrack. Faça o upgrade para o Plano Pro para criar múltiplos pixels ilimitados.',
                        ctaText: 'Ver Planos Pro'
                      });
                      return;
                    }
                    setShowNewPixelModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Pixel</span>
                </button>
              </div>
            </div>

            {/* If zero pixels: clean empty state */}
            {trackingPixels.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-[#0D1424] border border-dashed border-[#1E293B] space-y-3">
                <Radio className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="font-bold text-white text-xs">Nenhum pixel de rastreio configurado ainda</div>
                <p className="text-zinc-500 text-[11px] max-w-md mx-auto">
                  Crie seu pixel da PrimeTrack para capturar 100% dos dados, driblar bloqueadores e atingir Nota de Match 9.1+ no CAPI da Meta.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewPixelModal(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Primeiro Pixel</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {trackingPixels.map((px) => {
                  const pxScript = `<!-- PrimeTrack Pixel -->
<script>
  window.pixelId = "${px.pixelId || px.internalPixelId || 'pt_px_590fedcfff65'}";
  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute("src", "https://app.primetrack.top/pixel.js");
  document.head.appendChild(a);
</script>`;
                  return (
                    <div key={px.id} className="space-y-4 pb-6 border-b border-[#1E293B] last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#1E293B]/60">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-white font-mono text-[10px] font-bold ${px.status === 'Ativo' ? 'bg-[#0066FF]' : 'bg-zinc-700'}`}>
                            {px.status}
                          </span>
                          <span className="font-bold text-white text-sm">{px.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => handleOpenTestPixel(px)}
                            className="px-3 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            Testar
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenEditPixel(px)}
                            className="px-3 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleTogglePixelStatus(px.id)}
                            className="px-3 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            {px.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setPixelToDelete(px)}
                            className="px-3 py-1 rounded-lg bg-[#0D1424] hover:bg-red-950/30 border border-[#1E293B] text-red-400 text-xs transition-colors cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                            Pixels Meta ({Array.isArray(px.metaPixels) && px.metaPixels.length > 0 ? px.metaPixels.length : 1})
                          </div>
                          <div className="font-mono text-zinc-300 truncate flex items-center gap-1" title={Array.isArray(px.metaPixels) && px.metaPixels.length > 0 ? px.metaPixels.map(m => m.metaPixelId).join(', ') : (px.metaPixelId || px.pixelId)}>
                            <span className="truncate">{Array.isArray(px.metaPixels) && px.metaPixels.length > 0 ? px.metaPixels.map(m => m.metaPixelId).join(', ') : (px.metaPixelId || px.pixelId)}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Tokens CAPI</div>
                          <div className="font-mono text-zinc-300 truncate" title={px.capiTokenRaw || px.capiToken}>
                            {Array.isArray(px.metaPixels) && px.metaPixels.length > 0 
                              ? `${px.metaPixels.filter(m => m.capiToken && m.capiToken.startsWith('EAA')).length} Ativo(s)` 
                              : (px.capiTokenRaw || px.capiToken ? 'Configurado' : 'Não informado')}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Regra de IC</div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#0066FF] text-white font-mono text-[10px] font-bold">
                              {px.icType || (px.icRule && px.icRule.startsWith('url') ? 'url' : px.icRule && px.icRule.startsWith('texto') ? 'text' : 'css')}
                            </span>
                            <span className="font-mono text-zinc-300 truncate max-w-[140px]" title={px.icValue || px.icRule}>
                              {px.icValue || px.icRule || '—'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Criado em</div>
                          <div className="font-mono text-zinc-300">{px.createdAt}</div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <div className="text-[11px] text-zinc-400 font-sans">
                          Instale no &lt;head&gt; do seu site:
                        </div>
                        <div className="relative bg-[#0D1424] border border-[#1E293B] rounded-xl p-3.5 font-mono text-[11px] text-zinc-300 pr-20 overflow-x-auto whitespace-pre">
                          <code>{pxScript}</code>
                          <button
                            onClick={() => copyToClipboard(pxScript, 'pixel')}
                            className="absolute right-2.5 top-2.5 px-3 py-1 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedPixel ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedPixel ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dica Box */}
            <div className="bg-[#0D1424] border border-[#1E293B] rounded-xl p-3 text-xs text-zinc-400">
              <strong>Dica:</strong> nosso pixel já captura automaticamente os parâmetros da URL (UTMs, fbclid, etc.) e repassa para todos os links da página, inclusive o checkout. Não precisa de script extra.
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UTMs (Screenshot 4)                                                */}
      {/* ========================================================================= */}
      {activeTab === 'UTMs' && (
        <div className="space-y-6">
          
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 sm:p-7 shadow-md space-y-7">
            
            {/* Header com botão Tutorial */}
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-bold text-white text-sm">
                UTMs para Facebook Ads
              </h3>
            </div>

            {/* O que são UTMs? */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="text-red-400">📌</span>
                <span>O que são UTMs?</span>
              </div>
              <p className="text-zinc-400 pl-6 text-[12px] leading-relaxed">
                UTMs são parâmetros adicionados à URL do seu anúncio que permitem ao PrimeTrack identificar <strong>exatamente de qual campanha, conjunto e anúncio veio cada clique e venda</strong>. Sem UTMs, o rastreamento não funciona.
              </p>
            </div>

            {/* Como configurar */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-white">
                <span>⚙️</span>
                <span>Como configurar</span>
              </div>
              <ol className="space-y-1.5 text-zinc-400 pl-6 text-[12px]">
                <li>1. No Gerenciador de Anúncios, edite ou crie um anúncio</li>
                <li>2. Role até a seção <strong>"Rastreamento"</strong></li>
                <li>3. No campo <strong>"Parâmetros de URL"</strong>, cole o valor abaixo</li>
                <li>4. Publique o anúncio normalmente</li>
              </ol>
            </div>

            {/* Parâmetros de URL copiável */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <span>📋</span>
                <span>Parâmetros de URL</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Copie e cole no campo "Parâmetros de URL" do seu anúncio no Facebook:
              </div>

              <div className="relative bg-[#0D1424] border border-[#1E293B] rounded-xl p-3.5 font-mono text-[11px] text-zinc-300 pr-24 overflow-x-auto">
                <code>{utmString}</code>
                <button
                  onClick={() => copyToClipboard(utmString, 'utm')}
                  className="absolute right-2.5 top-2.5 px-3 py-1 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedUTM ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUTM ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Entenda cada parâmetro (Tabela) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <span className="text-amber-400">💡</span>
                <span>Entenda cada parâmetro</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[10px] text-zinc-500 uppercase border-b border-[#1E293B]">
                    <tr>
                      <th className="py-2.5 px-3">PARÂMETRO</th>
                      <th className="py-2.5 px-3">VALOR</th>
                      <th className="py-2.5 px-3">O QUE CAPTURA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60 text-xs">
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_source</td>
                      <td className="py-3 px-3 text-white">FB</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Identifica que o tráfego vem do Facebook</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_campaign</td>
                      <td className="py-3 px-3 text-white">{`{{campaign.name}}|{{campaign.id}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Nome e ID da campanha</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_medium</td>
                      <td className="py-3 px-3 text-white">{`{{adset.name}}|{{adset.id}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Nome e ID do conjunto de anúncios</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_content</td>
                      <td className="py-3 px-3 text-white">{`{{ad.name}}|{{ad.id}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Nome e ID do anúncio (criativo)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_term</td>
                      <td className="py-3 px-3 text-white">{`{{placement}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Posicionamento (Feed, Stories, Reels, etc.)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aviso inferior de macros dinâmicas */}
            <div className="bg-[#0D1424] border border-[#1E293B] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-400">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> Os valores entre {'{{ }}'} são macros dinâmicas do Facebook — eles serão substituídos automaticamente pelos dados reais de cada anúncio. Não altere os nomes dentro das chaves.
              </span>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Webhook API (Screenshot 1)                                         */}
      {/* ========================================================================= */}
      {activeTab === 'Webhook API' && (
        <div className="space-y-6">
          
          {/* Top Header Card */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                Webhook API
              </h3>
              <a 
                href="https://docs.primetrack.top"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] hover:border-[#0066FF]/50 text-zinc-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Documentação</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#0066FF]" />
              </a>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Cada integração usa seu próprio token e URL. Clique em "Conectar Plataforma" abaixo para gerar a URL certa para a sua ferramenta, ou consulte a documentação oficial em{' '}
              <a 
                href="https://docs.primetrack.top" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#0066FF] hover:underline font-semibold inline-flex items-center gap-0.5"
              >
                docs.primetrack.top
                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
              </a>{' '}
              para integrações avançadas.
            </p>
          </div>

          {/* Tokens de API Table */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
            <div className="p-4 border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Tokens de API ({apiTokens.length}/{trialStatus.isTrial ? 1 : '∞'})</span>
                {trialStatus.isTrial && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-bold">
                    Máx 1 no Plano Free
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (trialStatus.isTrial && apiTokens.length >= 1) {
                      setTrialLimitModal({
                        title: 'Limite do Plano Free Atingido',
                        message: 'No Plano Free você pode conectar 1 plataforma de vendas (webhook). Faça o upgrade para o Plano Pro para conectar múltiplas plataformas de checkout ilimitadas.',
                        ctaText: 'Ver Planos Pro'
                      });
                      return;
                    }
                    setShowConnectPlatformModal(true);
                    setConnectPlatformStep(1);
                    setSearchPlatform('');
                    setSelectedPlatformName('Monsterpay');
                    setSelectedPlatformType('token');
                    setTokenAliasInput('monsterpay');
                    setGeneratedPlatformToken('');
                    setGeneratedPlatformWebhookUrl('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Conectar Plataforma</span>
                </button>
                <button 
                  onClick={() => {
                    if (trialStatus.isTrial && apiTokens.length >= 1) {
                      setTrialLimitModal({
                        title: 'Limite do Plano Free Atingido',
                        message: 'No Plano Free você pode conectar 1 plataforma de vendas (webhook). Faça o upgrade para o Plano Pro para conectar múltiplas plataformas de checkout ilimitadas.',
                        ctaText: 'Ver Planos Pro'
                      });
                      return;
                    }
                    setShowNewTokenModal(true);
                    setNewTokenStep(1);
                    setTokenInputName('Documentação');
                    setCopiedRecentToken(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Token Padrão</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#141C2E] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="py-3 px-4">PLATAFORMA</th>
                    <th className="py-3 px-4">TOKEN / WEBHOOK URL</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4">ÚLTIMO USO</th>
                    <th className="py-3 px-4">CRIADO EM</th>
                    <th className="py-3 px-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60 font-sans">
                  {apiTokens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 px-4 text-center">
                        <div className="text-zinc-400 font-bold text-xs">
                          Nenhum token de API ou webhook criado ainda
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1">
                          Clique em <span className="text-[#5C9BFF] font-semibold">"Conectar Plataforma"</span> para gerar URLs de webhook (Hotmart, Kiwify, Perfect Pay) ou <span className="text-[#5C9BFF] font-semibold">"Token Padrão"</span> para Documentação.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    apiTokens.map((tok) => {
                      const norm = (tok.platform || tok.name || '').toLowerCase();
                      const isMonster = norm.includes('monster');
                      const isDoc = norm.includes('doc');
                      const isPerfect = norm.includes('perfect');
                      const isHotmart = norm.includes('hotmart');
                      const isKiwify = norm.includes('kiwify');

                      const displayName = isMonster 
                        ? 'Monsterpay' 
                        : isPerfect 
                        ? 'Perfect Pay' 
                        : isHotmart 
                        ? 'Hotmart' 
                        : isKiwify 
                        ? 'Kiwify' 
                        : isDoc 
                        ? 'Documentação' 
                        : (tok.name || tok.platform);

                      const badgeText = isMonster 
                        ? 'Nativa' 
                        : isDoc 
                        ? 'API' 
                        : 'Webhook';

                      const baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost') 
                        ? window.location.origin 
                        : 'https://app.primetrack.top';

                      // Monsterpay e Documentação NUNCA mostram webhookUrl na tabela, somente o TOKEN
                      const effectiveWebhookUrl = (!isMonster && !isDoc) && (
                        tok.webhookUrl || (
                          (isPerfect || isHotmart || isKiwify) 
                            ? `${baseUrl}/webhook/${tok.token}/${tok.platform || 'webhook'}`
                            : null
                        )
                      );

                      return (
                        <tr key={tok.id} className="hover:bg-[#182236]/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-white">
                            <div className="flex items-center gap-2.5">
                              {getPlatformLogo(displayName) && (
                                <div className="w-6 h-6 rounded-md bg-[#141C2E] border border-[#1E293B] flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                                  <img src={getPlatformLogo(displayName)} alt={displayName} className="w-full h-full object-contain" />
                                </div>
                              )}
                              <span className="px-2.5 py-0.5 rounded-full bg-[#0066FF] text-white font-mono text-[10px] font-bold">
                                {displayName}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-zinc-300">
                            {effectiveWebhookUrl ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-zinc-300 max-w-[280px] truncate" title={effectiveWebhookUrl}>
                                  {effectiveWebhookUrl}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyPlatformField(effectiveWebhookUrl, 'url')}
                                  className="px-2 py-0.5 rounded bg-[#0D1424] hover:bg-[#182236] text-[10px] text-[#5C9BFF] hover:text-white transition-colors cursor-pointer border border-[#1E293B] flex items-center gap-1 shrink-0"
                                  title="Copiar URL do Webhook"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar URL</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span>{tok.token ? `${tok.token.slice(0, 7)}••••${tok.token.slice(-6)}` : 'pt_****1775a8'}</span>
                                <button
                                  type="button"
                                  onClick={() => copyPlatformField(tok.token, 'token')}
                                  className="p-0.5 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                                  title="Copiar Token"
                                >
                                  <Copy className="w-3 h-3 text-zinc-500 hover:text-white" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                              {tok.status || 'Ativo'}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                            {tok.lastUsed || 'Hoje'}
                          </td>
                          <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                            {tok.createdAt || '08/09/2026'}
                          </td>
                          <td className="py-4 px-4 text-right font-mono">
                            <button 
                              onClick={() => setTokenToDelete(tok)}
                              className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: Baixe nosso App (Screenshot 2)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'Baixe nosso App' && (
        <div className="space-y-6">
          {/* 2 Columns Grid: Baixe o app + Link Minha Conta */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col (5 cols): Baixe o app */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 shadow-md space-y-4">
                <h3 className="font-bold text-white text-sm">
                  Baixe o app
                </h3>
                <p className="text-xs text-zinc-400">
                  Acompanhe suas métricas em tempo real direto do celular.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button className="px-4 py-2 rounded-xl bg-black border border-white/20 text-white font-bold text-xs flex items-center gap-2 hover:bg-zinc-900 transition-colors cursor-pointer">
                    <Apple className="w-4 h-4 fill-current" />
                    <span>App Store</span>
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-[#00C853] hover:bg-[#00B34A] text-black font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer">
                    <Smartphone className="w-4 h-4" />
                    <span>Android APK</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col (7 cols): Link para Minha Conta */}
            <div className="lg:col-span-7 bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 shadow-md space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Key className="w-4 h-4 text-[#5C9BFF]" />
                  <span>Gerenciar Senha de Acesso</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  A definição e troca de senha foi unificada na aba <strong>Minha Conta</strong> para facilitar a gestão centralizada da sua segurança.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/conta"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs transition-all shadow-md shadow-blue-600/25 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Ir para Minha Conta e Gerenciar Senha</span>
                </Link>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Conectar Meta Ads (Screenshot 1)                                */}
      {/* ========================================================================= */}
      {showConnectModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowConnectModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 sm:p-7 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowConnectModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base sm:text-lg font-bold text-white font-sans mb-2">
              Conectar Meta Ads
            </h3>

            <p className="text-xs text-zinc-400 font-sans mb-6">
              Escolha como deseja conectar sua conta Meta Ads:
            </p>

            <div className="space-y-3">
              {/* Primary Blue Button: Conectar com Facebook Oficial */}
              <button
                onClick={() => {
                  window.location.href = `/api/auth/facebook?userId=${encodeURIComponent(currentUser?.id || '')}`;
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md shadow-blue-600/25 transition-transform active:scale-95 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Conectar com Facebook</span>
              </button>

              {/* Botão de Copiar Link para Conectar em Outro Perfil / Navegador */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/api/auth/facebook?userId=${encodeURIComponent(currentUser?.id || '')}`;
                  navigator.clipboard.writeText(url);
                  setCopiedAuthLink(true);
                  setTimeout(() => setCopiedAuthLink(false), 2500);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#0D1424] hover:bg-[#182236] text-zinc-200 border border-[#1E293B] font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                {copiedAuthLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-zinc-400" />
                    <span>Copiar Link de Conexão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Facebook OAuth Oficial (Screenshot 2)                            */}
      {/* ========================================================================= */}
      {showFacebookOAuth && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => !isConnecting && setShowFacebookOAuth(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden text-zinc-900 border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Facebook Top App Header Bar */}
            <div className="bg-[#1877F2] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>facebook</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] font-bold">
                  JM
                </div>
                <span>Jean</span>
                <span className="text-white/40">|</span>
                <span className="text-white/80 cursor-pointer hover:underline">Página inicial</span>
              </div>
            </div>

            {/* Meta + PrimeTrack Integration Header Ribbon */}
            <div className="border-b border-zinc-200 px-6 py-3 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                {/* Meta Infinity Logo */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#0081FB">
                  <path d="M12 7.2c-3.1 0-5.4 2.2-6.5 4.8 1.1 2.6 3.4 4.8 6.5 4.8s5.4-2.2 6.5-4.8c-1.1-2.6-3.4-4.8-6.5-4.8zm0 8c-2.2 0-4-1.4-4.8-3.2.8-1.8 2.6-3.2 4.8-3.2s4 1.4 4.8 3.2c-.8 1.8-2.6 3.2-4.8 3.2z"/>
                </svg>
                <span className="text-zinc-400 font-mono text-xs">⇄</span>
                {/* PrimeTrack Logo */}
                <div className="w-5 h-5 rounded bg-[#1A6DFF] flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">P</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[9px]">
                  👤
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>

            {/* Main Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight font-sans">
                  Continuar como Jean Macedo?
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-sans">
                  O PrimeTrack receberá seu nome e a foto do perfil.
                </p>
              </div>

              {/* Action Buttons: Cancelar & Continuar */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => setShowFacebookOAuth(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => {
                    setIsConnecting(true);
                    setTimeout(() => {
                      setIsConnecting(false);
                      setShowFacebookOAuth(false);
                      localStorage.removeItem('primetrack_meta_disconnected');
                      
                      const newProfiles = [
                        { id: '1092847291884920', name: 'Jean Macedo', initial: 'J', accountsCount: 2, isNew: true }
                      ];
                      setConnectedProfiles(newProfiles);
                      localStorage.setItem('primetrack_connected_profiles', JSON.stringify(newProfiles));

                      const newAccs = [
                        { name: 'CA01', id: '1892117896682979', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false },
                        { name: 'CA02 JEFFREY', id: '1101817232408751', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false }
                      ];
                      setAdAccounts(newAccs);
                      localStorage.setItem('primetrack_ad_accounts', JSON.stringify(newAccs));

                      window.dispatchEvent(new Event('primetrack_profile_sync'));
                    }, 1400);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Conectando Meta Ads...</span>
                    </>
                  ) : (
                    <span>Continuar</span>
                  )}
                </button>
              </div>

              {/* Switch account link */}
              <div className="text-xs text-zinc-600 font-sans">
                Não é Jean Macedo? <span className="text-[#1877F2] font-semibold hover:underline cursor-pointer">Entrar em outra conta</span>
              </div>

              {/* Legal & Permissions Footnote */}
              <div className="pt-8 border-t border-zinc-100 space-y-3 text-[11px] text-zinc-500 leading-relaxed font-sans">
                <p>
                  Ao continuar, o PrimeTrack receberá acesso contínuo às informações que você compartilha, e a Meta registrará quando o PrimeTrack acessar essas informações. <span className="text-[#1877F2] hover:underline cursor-pointer">Saiba mais</span> sobre esse compartilhamento e suas configurações ativas.
                </p>

                <div className="text-[11px] text-[#1877F2] flex items-center gap-1">
                  <span className="hover:underline cursor-pointer">Política de Privacidade</span>
                  <span className="text-zinc-400">·</span>
                  <span className="hover:underline cursor-pointer">Termos de Serviço</span>
                  <span className="text-zinc-600">do PrimeTrack</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Modal de Limite do Plano Free / Trial */}
      {trialLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setTrialLimitModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#182236] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {trialLimitModal.title}
              </h3>
              <p className="text-xs text-zinc-400 font-sans mt-2 leading-relaxed">
                {trialLimitModal.message}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D1424] border border-[#1E293B] text-[11px] text-blue-300 font-sans flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span>Seu teste de 7 dias gratuitos está ativo! Faça upgrade a qualquer momento para liberar todos os recursos.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTrialLimitModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Entendi
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrialLimitModal(null);
                  navigate('/planos');
                }}
                className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-xs font-bold text-white shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{trialLimitModal.ctaText || 'Fazer Upgrade'}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Token de API (Token Padrão com popup de resultado) */}
      {showNewTokenModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            setShowNewTokenModal(false);
            setNewTokenStep(1);
            setTokenInputName('Documentação');
          }}
        >
          <div 
            className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#38BDF8]" />
                <span>Novo Token de API (Documentação)</span>
              </h3>
              <button 
                onClick={() => {
                  setShowNewTokenModal(false);
                  setNewTokenStep(1);
                  setTokenInputName('Documentação');
                }} 
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newTokenStep === 1 && (
              <form onSubmit={handleGenerateToken} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#0D1424] border border-[#1E293B] text-xs text-zinc-300 space-y-1.5 font-sans">
                  <div className="flex items-center gap-1.5 text-[#38BDF8] font-bold text-xs">
                    <span>Integração via Documentação Oficial</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Gere um token de autenticação para integrar seu sistema, checkout ou backend personalizado utilizando a nossa documentação oficial de Webhooks.
                  </p>
                  <a
                    href="https://docs.primetrack.top"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#5C9BFF] hover:underline font-semibold pt-0.5"
                  >
                    <span>Acessar documentação da API</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                    IDENTIFICADOR DA INTEGRAÇÃO
                  </label>
                  <input 
                    type="text"
                    autoFocus
                    value={tokenInputName}
                    onChange={(e) => setTokenInputName(e.target.value)}
                    placeholder="Ex: Documentação Oficial, API Própria, Meu Sistema..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0D1424] border border-[#1E293B] text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-[#0066FF] transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTokenModal(false);
                      setNewTokenStep(1);
                      setTokenInputName('Documentação');
                    }}
                    className="px-4 py-2 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-xs font-bold text-white shadow-md shadow-blue-600/25 transition-colors cursor-pointer"
                  >
                    Gerar Token
                  </button>
                </div>
              </form>
            )}

            {newTokenStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Banner de Sucesso verde */}
                <div className="p-3.5 rounded-xl bg-[#0D1424] border border-[#1E293B] text-[#4ADE80] text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  <span>
                    Pronto! Copie as credenciais abaixo para usar na <strong className="text-[#38BDF8] font-bold">Documentação da API</strong>.
                  </span>
                </div>

                {/* Campo do TOKEN */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    TOKEN DE AUTENTICAÇÃO
                  </label>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0D1424] border border-[#1E293B]">
                    <span className="font-mono text-xs text-zinc-200 select-all truncate pl-1">
                      {recentCreatedToken}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(recentCreatedToken);
                        setCopiedRecentToken(true);
                        setTimeout(() => setCopiedRecentToken(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-xs text-zinc-200 font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedRecentToken ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copiado!</span>
                        </>
                      ) : (
                        <span>Copiar</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Campo do ENDPOINT */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    URL DO ENDPOINT (POST)
                  </label>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0D1424] border border-[#1E293B]">
                    <span className="font-mono text-xs text-zinc-200 select-all truncate pl-1">
                      {(typeof window !== 'undefined' && window.location.origin.includes('localhost') ? window.location.origin : 'https://app.primetrack.top') + '/api/webhooks'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? window.location.origin : 'https://app.primetrack.top') + '/api/webhooks';
                        navigator.clipboard?.writeText(url);
                        setCopiedDocEndpoint(true);
                        setTimeout(() => setCopiedDocEndpoint(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-xs text-zinc-200 font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedDocEndpoint ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copiado!</span>
                        </>
                      ) : (
                        <span>Copiar</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Botão Concluir */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTokenModal(false);
                      setNewTokenStep(1);
                      setTokenInputName('Documentação');
                    }}
                    className="px-6 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-colors cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CONECTAR PLATAFORMA (Screenshots 1, 2 e 3)                          */}
      {/* ========================================================================= */}
      {showConnectPlatformModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowConnectPlatformModal(false)}
        >
          <div 
            className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com Título e Botão Fechar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                Conectar Plataforma
              </h3>
              <button 
                onClick={() => setShowConnectPlatformModal(false)} 
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PASSO 1: Seleção de Plataforma (Monsterpay, Perfect Pay, Hotmart, Kiwify) */}
            {connectPlatformStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="Buscar plataforma..."
                    value={searchPlatform}
                    onChange={(e) => setSearchPlatform(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1424] border border-[#1E293B] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#0066FF] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {SUPPORTED_GATEWAY_PLATFORMS.filter(p => 
                    p.name.toLowerCase().includes(searchPlatform.toLowerCase().trim()) ||
                    p.slug.toLowerCase().includes(searchPlatform.toLowerCase().trim())
                  ).length > 0 ? (
                    SUPPORTED_GATEWAY_PLATFORMS.filter(p => 
                      p.name.toLowerCase().includes(searchPlatform.toLowerCase().trim()) ||
                      p.slug.toLowerCase().includes(searchPlatform.toLowerCase().trim())
                    ).map((platform) => (
                      <div 
                        key={platform.id}
                        onClick={() => handleQuickConnectPlatform(platform)}
                        className="bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] hover:border-[#0066FF] rounded-xl p-3.5 transition-all cursor-pointer group flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#141C2E] border border-[#1E293B] flex items-center justify-center p-1.5 shrink-0 overflow-hidden group-hover:border-[#0066FF]/60 transition-colors shadow-inner">
                            {platform.logo ? (
                              <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-sm font-bold text-white">{platform.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm group-hover:text-[#5C9BFF] transition-colors block">{platform.name}</span>
                            <span className="text-[10px] text-zinc-400 font-sans block">{platform.type === 'token' ? 'Integração Nativa' : 'Webhook'}</span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-[#141C2E] group-hover:bg-[#0066FF] text-zinc-400 group-hover:text-white flex items-center justify-center transition-all shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-xs text-zinc-500 font-sans">
                      Nenhuma plataforma encontrada com "{searchPlatform}".
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 2: Apelido do Token (Opcional) */}
            {connectPlatformStep === 2 && (
              <form onSubmit={handleGenerateConnectToken} className="space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0D1424] border border-[#1E293B]">
                  {getPlatformLogo(selectedPlatformName) && (
                    <div className="w-9 h-9 rounded-xl bg-[#141C2E] border border-[#1E293B] flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                      <img src={getPlatformLogo(selectedPlatformName)} alt={selectedPlatformName} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="text-xs text-zinc-400 font-sans">
                    Plataforma selecionada: <strong className="text-white font-bold text-sm block">{selectedPlatformName}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    APELIDO DO TOKEN
                  </label>
                  <input 
                    type="text"
                    autoFocus
                    value={tokenAliasInput}
                    onChange={(e) => setTokenAliasInput(e.target.value)}
                    placeholder={selectedPlatformName.toLowerCase()}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0D1424] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#0066FF] transition-colors font-sans"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setConnectPlatformStep(1)}
                    className="px-4 py-2 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>←</span>
                    <span>Voltar</span>
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                  >
                    Gerar
                  </button>
                </div>
              </form>
            )}

            {/* PASSO 3: Resultado Gerado (Conforme Screenshot do Usuário) */}
            {connectPlatformStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Banner de Sucesso verde */}
                <div className="p-3.5 rounded-xl bg-[#0D1424] border border-[#1E293B] text-[#4ADE80] text-xs flex items-center gap-3 font-medium">
                  {getPlatformLogo(selectedPlatformName) ? (
                    <div className="w-8 h-8 rounded-lg bg-[#141C2E] border border-[#1E293B] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      <img src={getPlatformLogo(selectedPlatformName)} alt={selectedPlatformName} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-[#4ADE80] shrink-0" />
                  )}
                  <span>
                    Pronto! Copie abaixo e cole no painel da <strong className="text-[#38BDF8] font-bold">{selectedPlatformName}</strong>.
                  </span>
                </div>

                {/* Se for Monsterpay: SOMENTE O TOKEN */}
                {selectedPlatformName.toLowerCase().includes('monster') || selectedPlatformType === 'token' ? (
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      TOKEN
                    </label>
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#0D1424] border border-[#1E293B]">
                      <span className="font-mono text-xs text-zinc-200 select-all truncate pl-1">
                        {generatedPlatformToken}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyPlatformField(generatedPlatformToken, 'token')}
                        className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-xs text-zinc-200 font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        {copiedToken ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copiado!</span>
                          </>
                        ) : (
                          <span>Copiar</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Demais plataformas (Perfect Pay, Hotmart, Kiwify): URL DO WEBHOOK */
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      URL DO WEBHOOK
                    </label>
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#0D1424] border border-[#1E293B]">
                      <span className="font-mono text-xs text-zinc-200 select-all truncate pl-1">
                        {generatedPlatformWebhookUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyPlatformField(generatedPlatformWebhookUrl, 'url')}
                        className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-xs text-zinc-200 font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        {copiedWebhookUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copiado!</span>
                          </>
                        ) : (
                          <span>Copiar</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Botão Concluir */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectPlatformModal(false);
                      setConnectPlatformStep(1);
                    }}
                    className="px-6 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-colors cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CRIAR NOVO PIXEL DE RASTREIO                                        */}
      {/* ========================================================================= */}
      {showNewPixelModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div 
            className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF]/15 border border-[#0066FF]/30 flex items-center justify-center text-[#5C9BFF]">
                  <Radio className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  Criar Pixel de Rastreio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPixelModal(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePixel} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  Nome do Pixel (Identificação interna)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hotmart, Meu Checkout, Pixel Principal"
                  value={newPixelName}
                  onChange={(e) => setNewPixelName(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#0066FF] transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  Pixel ID (Facebook / Meta Ads)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 1056786567239394"
                  value={newPixelMetaId}
                  onChange={(e) => setNewPixelMetaId(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#0066FF] transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Token de Acesso CAPI (Conversions API)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Opcional</span>
                </label>
                <input
                  type="text"
                  placeholder="EAAB... (Token gerado no Gerenciador de Eventos da Meta)"
                  value={newPixelCapiToken}
                  onChange={(e) => setNewPixelCapiToken(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#0066FF] transition-colors"
                />
              </div>

              {/* Regra de Detecção de InitiateCheckout */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  Regra de Detecção de Initiate Checkout (IC)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setNewPixelIcType('css')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      newPixelIcType === 'css' 
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]' 
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Seletor CSS
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPixelIcType('url')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      newPixelIcType === 'url' 
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]' 
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Contém na URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPixelIcType('text')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      newPixelIcType === 'text' 
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]' 
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Contém no Texto
                  </button>
                </div>

                <input
                  type="text"
                  placeholder={
                    newPixelIcType === 'css' 
                      ? 'Ex: .btn-checkout, #btn-comprar, .btn-cta' 
                      : newPixelIcType === 'url' 
                        ? 'Ex: pay.hotmart, kiwify.com.br, /checkout' 
                        : 'Ex: Comprar Agora, Quero Garantir'
                  }
                  value={newPixelIcValue}
                  onChange={(e) => setNewPixelIcValue(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#0066FF] transition-colors"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  {newPixelIcType === 'css' && 'Dispara quando o usuário clicar em qualquer elemento que tenha a classe/ID configurada.'}
                  {newPixelIcType === 'url' && 'Dispara quando o link clicado contiver o texto ou domínio informado.'}
                  {newPixelIcType === 'text' && 'Dispara quando o botão clicado contiver o texto informado.'}
                </p>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Domínios Autorizados</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Opcional</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: meusite.com, checkout.meusite.com (ou deixe em branco para todos)"
                  value={newPixelDomains}
                  onChange={(e) => setNewPixelDomains(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#0066FF] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPixelModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  Criar Pixel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDITAR PIXEL DE RASTREIO                                            */}
      {/* ========================================================================= */}
      {pixelToEdit && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div 
            className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF]/15 border border-[#0066FF]/30 flex items-center justify-center text-[#5C9BFF]">
                  <Radio className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  Editar Pixel de Rastreio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPixelToEdit(null)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePixel} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  Nome da Configuração (Identificação interna)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hotmart, Meu Checkout, Pixel Principal"
                  value={editPixelName}
                  onChange={(e) => setEditPixelName(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#0066FF] transition-colors"
                />
              </div>

              {/* Seção Múltiplos Pixels da Meta (Estilo UTMify) */}
              <div className="pt-2 pb-1 border-y border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Pixels da Meta Conectados</span>
                    <span className="text-[10px] text-zinc-400">Todos estes pixels receberão os eventos deste mesmo script.</span>
                  </div>
                  {!showAddSubPixelForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddSubPixelForm(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#0066FF]/20 hover:bg-[#0066FF]/30 border border-[#0066FF]/40 text-[#5C9BFF] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar +</span>
                    </button>
                  )}
                </div>

                {/* Tags dos Pixels Ativos com botão de edição inline */}
                <div className="space-y-2">
                  {editMetaPixelsList.map((mp, idx) => (
                    <div 
                      key={mp.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D1424] border border-[#1E293B] text-zinc-200 text-xs font-mono"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold">{mp.metaPixelId}</span>
                          {mp.name && <span className="text-[10px] text-zinc-400 font-sans">({mp.name})</span>}
                        </div>
                        <span className="text-[10px] text-zinc-500 truncate">
                          {mp.capiToken ? `Token: ${mp.capiToken.slice(0, 8)}...${mp.capiToken.slice(-4)}` : 'Sem Token CAPI'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setNewMetaSubPixelId(mp.metaPixelId || '');
                            setNewMetaSubPixelToken(mp.capiToken || '');
                            setNewMetaSubPixelName(mp.name || '');
                            setEditSubPixelIndex(idx);
                            setShowAddSubPixelForm(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-[#5C9BFF] text-[11px] font-sans font-medium transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        {editMetaPixelsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMetaSubPixel(mp.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remover Pixel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {editMetaPixelsList.length === 0 && (
                    <div className="text-[11px] text-zinc-500 italic py-2">
                      Nenhum Pixel da Meta adicionado. Clique em "Adicionar +" acima.
                    </div>
                  )}
                </div>

                {/* Formulário para adicionar mais um pixel */}
                {showAddSubPixelForm && (
                  <div className="p-3 rounded-xl bg-[#0D1424] border border-[#0066FF]/40 space-y-3 animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold text-[#5C9BFF] flex items-center justify-between">
                      <span>{editSubPixelIndex !== null ? 'Editar Pixel Meta' : 'Novo Pixel da Meta (Outra BM / Conta)'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSubPixelForm(false);
                          setEditSubPixelIndex(null);
                        }}
                        className="text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                        ID do Pixel Meta *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 1342429849238924"
                        value={newMetaSubPixelId}
                        onChange={(e) => setNewMetaSubPixelId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMetaSubPixel(e);
                          }
                        }}
                        className="w-full bg-[#141C2E] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#0066FF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                        Token CAPI (Conversions API)
                      </label>
                      <input
                        type="text"
                        placeholder="EAAB... (Token da BM do novo pixel)"
                        value={newMetaSubPixelToken}
                        onChange={(e) => setNewMetaSubPixelToken(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMetaSubPixel(e);
                          }
                        }}
                        className="w-full bg-[#141C2E] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#0066FF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                        Apelido (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: BM 2, Pixel Backup, Conta João"
                        value={newMetaSubPixelName}
                        onChange={(e) => setNewMetaSubPixelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMetaSubPixel(e);
                          }
                        }}
                        className="w-full bg-[#141C2E] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#0066FF]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddSubPixelForm(false)}
                        className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMetaSubPixel}
                        className="px-4 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Regra de Detecção de InitiateCheckout */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1.5">
                  Regra de Detecção de Initiate Checkout (IC)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setEditPixelIcType('css')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      editPixelIcType === 'css' 
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]' 
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Seletor CSS
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPixelIcType('url')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      editPixelIcType === 'url' 
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]' 
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Contém na URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPixelIcType('text')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      editPixelIcType === 'text' 
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]' 
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Contém no Texto
                  </button>
                </div>

                <input
                  type="text"
                  placeholder={
                    editPixelIcType === 'css' 
                      ? 'Ex: .btn-checkout, #btn-comprar, .btn-cta' 
                      : editPixelIcType === 'url' 
                        ? 'Ex: pay.hotmart, kiwify.com.br, /checkout' 
                        : 'Ex: Comprar Agora, Quero Garantir'
                  }
                  value={editPixelIcValue}
                  onChange={(e) => setEditPixelIcValue(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#0066FF] transition-colors"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  {editPixelIcType === 'css' && 'Dispara quando o usuário clicar em qualquer elemento que tenha a classe/ID configurada.'}
                  {editPixelIcType === 'url' && 'Dispara quando o link clicado contiver o texto ou domínio informado.'}
                  {editPixelIcType === 'text' && 'Dispara quando o botão clicado contiver o texto informado.'}
                </p>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Domínios Autorizados</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Opcional</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: meusite.com, checkout.meusite.com (ou deixe em branco para todos)"
                  value={editPixelDomains}
                  onChange={(e) => setEditPixelDomains(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#0066FF] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPixelToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE TESTE DE PIXEL NA PÁGINA DE VENDAS                               */}
      {/* ========================================================================= */}
      {pixelToTest && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPixelToTest(null)}
        >
          <div 
            className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="text-sm font-bold text-white">
                Testar Pixel
              </h3>
              <button
                type="button"
                onClick={() => setPixelToTest(null)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyPixelScript} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1.5">
                  URL DO SITE
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://seusite.com.br"
                  value={testSiteUrl}
                  onChange={(e) => {
                    setTestSiteUrl(e.target.value);
                    if (pixelVerificationResult) setPixelVerificationResult(null);
                  }}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-[#0066FF] transition-colors"
                />
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Vamos verificar se o script da PrimeTrack está instalado.
                </p>
              </div>

              {/* Resultado do Teste: Sucesso */}
              {pixelVerificationResult && pixelVerificationResult.found && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                  <span>{pixelVerificationResult.message || 'Pixel funcionando corretamente'}</span>
                </div>
              )}

              {/* Resultado do Teste: Erro */}
              {pixelVerificationResult && !pixelVerificationResult.found && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                    <span>⚠️ {pixelVerificationResult.message || 'Script não encontrado no HTML do site.'}</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Verifique se o snippet do pixel está dentro da tag <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-white">&lt;head&gt;</code> e se o site foi publicado.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPixelToTest(null)}
                  className="px-4 py-2 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPixel || !testSiteUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isVerifyingPixel && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isVerifyingPixel ? 'Verificando...' : 'Verificar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PIXEL                                 */}
      {/* ========================================================================= */}
      {pixelToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPixelToDelete(null)}
        >
          <div 
            className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-sm w-full p-6 shadow-2xl relative text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#0D1424] border border-[#1E293B] flex items-center justify-center mx-auto text-[#0066FF]">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              Excluir este pixel?
            </h3>
            <p className="text-xs text-zinc-400">
              O pixel <strong className="text-white">"{pixelToDelete.name}"</strong> será removido e deixará de receber eventos do site.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPixelToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeletePixel(pixelToDelete.id)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-xs font-bold text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE TOKEN (Screenshot)                    */}
      {/* ========================================================================= */}
      {tokenToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setTokenToDelete(null)}
        >
          <div 
            className="bg-[#141C2E] border border-[#1E293B] rounded-xl max-w-sm w-full p-6 shadow-2xl relative text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícone de alerta em círculo azul */}
            <div className="w-12 h-12 rounded-full bg-[#0D1424] border border-[#1E293B] flex items-center justify-center mx-auto text-[#0066FF]">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              Excluir este token?
            </h3>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTokenToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteToken(tokenToDelete.id);
                  setTokenToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-xs font-bold text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
