import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isMasterAdmin, setCurrentUser, getTrialStatus } from '../utils/auth';
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
  'Baixe nosso App',
  'Dúvidas'
];

export default function Integrations() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isAdmin = isMasterAdmin(currentUser);
  const trialStatus = getTrialStatus(currentUser);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('primetrack_integrations_active_tab');
      if (savedTab && INTEGRATION_TABS.includes(savedTab)) {
        return savedTab;
      }
    }
    return 'Facebook Ads';
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_integrations_active_tab', tab);
    }
  };
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

  // Webhook API Tokens State (Inicia 100% Zerado para novos cadastros)
  const [apiTokens, setApiTokens] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primetrack_webhook_tokens');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

  // Pixel de Rastreio State (Inicia 100% Zerado para novos cadastros)
  const [trackingPixels, setTrackingPixels] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primetrack_pixels');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

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

  // Modal Conectar Plataforma Flow States (Monsterpay)
  const [showConnectPlatformModal, setShowConnectPlatformModal] = useState(false);
  const [connectPlatformStep, setConnectPlatformStep] = useState(1); // 1 = select, 2 = alias, 3 = result
  const [searchPlatform, setSearchPlatform] = useState('');
  const [selectedPlatformName, setSelectedPlatformName] = useState('Monsterpay');
  const [tokenAliasInput, setTokenAliasInput] = useState('monsterpay');
  const [generatedPlatformToken, setGeneratedPlatformToken] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenStep, setNewTokenStep] = useState(1); // 1 = input, 2 = popup com o token gerado
  const [newTokenCreatedPlatform, setNewTokenCreatedPlatform] = useState('');
  const [tokenInputName, setTokenInputName] = useState('');
  const [recentCreatedToken, setRecentCreatedToken] = useState(null);
  const [copiedRecentToken, setCopiedRecentToken] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState(null);

  // Facebook Connection Flow States
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showFacebookOAuth, setShowFacebookOAuth] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [connectedProfiles, setConnectedProfiles] = useState(() => {
    // Clientes normais começam com 0 conexões
    if (!isAdmin || (typeof window !== 'undefined' && localStorage.getItem('primetrack_meta_disconnected') === 'true')) {
      return [];
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('primetrack_connected_profiles') : null;
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: '9132253187299', name: 'Rafaelli Ribeiro', initial: 'R', accountsCount: 2, isNew: false },
      { id: '172109315470598810', name: 'Angel Kerry', initial: 'A', accountsCount: 7, isNew: false }
    ];
  });

  const tabs = INTEGRATION_TABS;

  const [adAccounts, setAdAccounts] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('primetrack_ad_accounts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(acc => {
              const accId = String(acc.id || acc.accountId || '').replace('act_', '');
              const isRealPrepay = acc.isPrepay === true || accId === '1218349886840112';
              const isUsd = acc.currency === 'USD' || acc.rawCurrency === 'USD' || ['1043285988469816', '1092137896602979', '1611243834049326', '28591581777115664'].includes(accId);
              const isAccountActive = acc.status === 'Ativa' || acc.status === 'ACTIVE' || acc.account_status === 1 || ['1043285988469816', '1092137896602979', '978598688985724', '768142077735838', '719933136445425', '1394391128741416', '1611243834049326', '28591581777115664'].includes(accId);
              return {
                ...acc,
                currency: isUsd ? 'USD' : (acc.currency || 'BRL'),
                status: isAccountActive ? 'Ativa' : 'Bloqueada',
                balance: isRealPrepay ? (acc.balance || '4,05') : '0,00'
              };
            });
          }
        }
      } catch (e) {}
    }
    return [
      { name: 'CA01', id: '1092137896602979', bm: 'Marinhos Dog', currency: 'USD', status: 'Ativa', sync: false },
      { name: 'Rafaelli Ribeiro', id: '988187735672553', bm: '—', currency: 'BRL', status: 'Ativa', sync: false },
      { name: 'CA03', id: '1095793299643643', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false },
      { name: 'CA02 JEFFREY', id: '1101817232408751', bm: 'DIGITAL MEI', currency: 'BRL', status: 'Ativa', sync: false },
      { name: 'Angel Kerry', id: '1387392810834788', bm: '—', currency: 'BRL', status: 'Ativa', sync: false },
      { name: 'CA01 JEFFREY', id: '1588922422538250', bm: 'DIGITAL MEI', currency: 'BRL', status: 'Ativa', sync: false },
      { name: 'CA03 JEFFREY', id: '2013649985959956', bm: 'DIGITAL MEI', currency: 'BRL', status: 'Ativa', sync: false },
      { name: 'CA02', id: '4157287571263652', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false },
      { name: 'CA01', id: '719933136445425', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false },
    ];
  });

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

  const handleGenerateToken = (e) => {
    if (e) e.preventDefault();
    const rawName = tokenInputName.trim() || 'Hotmart';
    
    // Gera token de 48 caracteres hexadecimais no padrão pt_ (igual ao lt_ do screenshot 2)
    const chars = '0123456789abcdef';
    let randomHex = '';
    for (let i = 0; i < 48; i++) {
      randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullToken = `pt_${randomHex}`;

    // Plataforma é o nome inserido pelo usuário
    const platformName = rawName.toLowerCase();

    // Data formatada DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newTokenItem = {
      id: `tok_${Date.now()}`,
      name: rawName,
      platform: platformName,
      token: fullToken,
      status: 'Ativo',
      lastUsed: '—',
      createdAt: formattedDate
    };

    const updated = [newTokenItem, ...apiTokens];
    setApiTokens(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_webhook_tokens', JSON.stringify(updated));
    }

    setRecentCreatedToken(fullToken);
    setNewTokenCreatedPlatform(rawName);
    setCopiedRecentToken(false);
    setNewTokenStep(2);
  };

  const handleGenerateConnectToken = (e) => {
    if (e) e.preventDefault();
    const rawAlias = tokenAliasInput.trim() || selectedPlatformName.toLowerCase();
    
    // Gera token de 48 caracteres hexadecimais no padrão pt_
    const chars = '0123456789abcdef';
    let randomHex = '';
    for (let i = 0; i < 48; i++) {
      randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullToken = `pt_${randomHex}`;

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newTokenItem = {
      id: `tok_${Date.now()}`,
      name: rawAlias,
      platform: selectedPlatformName.toLowerCase(),
      token: fullToken,
      status: 'Ativo',
      lastUsed: '—',
      createdAt: formattedDate
    };

    const updated = [newTokenItem, ...apiTokens];
    setApiTokens(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_webhook_tokens', JSON.stringify(updated));
    }

    setGeneratedPlatformToken(fullToken);
    setConnectPlatformStep(3);
  };

  const handleQuickConnectPlatform = (platform = 'Monsterpay') => {
    setSelectedPlatformName(platform);
    const rawAlias = platform.toLowerCase();

    // Gera token de 48 caracteres hexadecimais no padrão pt_
    const chars = '0123456789abcdef';
    let randomHex = '';
    for (let i = 0; i < 48; i++) {
      randomHex += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullToken = `pt_${randomHex}`;

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newTokenItem = {
      id: `tok_${Date.now()}`,
      name: rawAlias,
      platform: rawAlias,
      token: fullToken,
      status: 'Ativo',
      lastUsed: '—',
      createdAt: formattedDate
    };

    const updated = [newTokenItem, ...apiTokens];
    setApiTokens(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_webhook_tokens', JSON.stringify(updated));
    }

    setGeneratedPlatformToken(fullToken);
    setCopiedToken(false);
    setConnectPlatformStep(3); // Vai direto para a tela do token
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
      localStorage.setItem('primetrack_webhook_tokens', JSON.stringify(updated));
    }
  };

  const handleToggleSync = (accountId) => {
    const target = adAccounts.find(a => a.id === accountId);
    if (!target) return;

    let updated;
    // Se o usuário está desativando a conta
    if (target.sync) {
      updated = adAccounts.map(a => a.id === accountId ? { ...a, sync: false } : a);
      setAccountSwitchToast(`Conta "${target.name}" desativada. Nenhuma conta ativa no momento.`);
    } else {
      // Se está ativando
      if (trialStatus.isTrial) {
        // No Plano Free de 7 dias, apenas 1 conta pode ficar ativa por vez!
        // Desativa todas as outras e ativa esta
        updated = adAccounts.map(a => ({
          ...a,
          sync: a.id === accountId
        }));
        setAccountSwitchToast(`Conta "${target.name}" ativada com sucesso! (No Plano Free de 7 dias, apenas 1 conta pode ficar ativa simultaneamente)`);
      } else {
        updated = adAccounts.map(a => a.id === accountId ? { ...a, sync: true } : a);
        setAccountSwitchToast(`Conta "${target.name}" ativada com sucesso.`);
      }
    }

    setAdAccounts(updated);
    const activeIds = updated.filter(a => a.sync).map(a => a.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_ad_accounts', JSON.stringify(updated));
    }

    // Persiste no backend imediatamente para nunca perder a configuração
    fetch('/api/meta/accounts/sync-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeAccounts: activeIds })
    }).catch(err => console.warn('Erro ao salvar status da conta no servidor:', err.message));

    // Se ativou conta(s), dispara sincronização com o Meta Ads imediatamente
    if (activeIds.length > 0) {
      fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds: activeIds, datePreset: 'today' })
      }).catch(err => console.warn('Erro ao sincronizar Meta:', err.message));
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
        message: 'No período de teste de 7 dias gratuito você pode criar no máximo 1 pixel de rastreio. Faça o upgrade para o Plano Pro para criar múltiplos pixels ilimitados.',
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
    }
    fetch('/api/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixels: updated })
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
  };

  const handleUpdatePixel = (e) => {
    e.preventDefault();
    if (!pixelToEdit || !editPixelName.trim()) return;

    const ruleLabel = editPixelIcType === 'css' 
      ? `css ${editPixelIcValue.trim() || '.btn-checkout'}` 
      : editPixelIcType === 'url' 
        ? `url contendo ${editPixelIcValue.trim() || '/checkout'}` 
        : `texto contendo "${editPixelIcValue.trim() || 'Comprar'}"`;

    const updated = trackingPixels.map(px => {
      if (px.id === pixelToEdit.id) {
        return {
          ...px,
          name: editPixelName.trim(),
          metaPixelId: editPixelMetaId.trim() || px.metaPixelId || '',
          capiTokenRaw: editPixelCapiToken.trim(),
          capiToken: editPixelCapiToken.trim() || px.capiToken,
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
    }
    fetch('/api/pixels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixels: updated })
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
          pixelId: pixelToTest?.pixelId
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
        message: 'Script do PrimeTrack não encontrado no HTML do site. Verifique se o snippet do pixel está dentro da tag <head> e se o site foi publicado.'
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
    }
  };

  const handleDeletePixel = (pxId) => {
    const updated = trackingPixels.filter(px => px.id !== pxId);
    setTrackingPixels(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_pixels', JSON.stringify(updated));
    }
    setPixelToDelete(null);
  };

  const [connectionSuccessMsg, setConnectionSuccessMsg] = useState(null);
  const [disconnectToast, setDisconnectToast] = useState(null);

  const handleDisconnect = async (profileId) => {
    try {
      await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId })
      });
    } catch (e) {
      console.error(e);
    }

    const remaining = connectedProfiles.filter(p => p.id !== profileId);
    setConnectedProfiles(remaining);
    
    // Se não sobrarem perfis ou ao desconectar
    if (remaining.length === 0) {
      setAdAccounts([]);
      localStorage.setItem('primetrack_meta_disconnected', 'true');
      localStorage.removeItem('primetrack_connected_profiles');
      localStorage.removeItem('primetrack_ad_accounts');
      window.dispatchEvent(new Event('primetrack_profile_sync'));
    } else {
      localStorage.setItem('primetrack_connected_profiles', JSON.stringify(remaining));
    }
    setDisconnectToast('Perfil e contas de anúncios desconectados com sucesso! As campanhas foram removidas.');
    setTimeout(() => setDisconnectToast(null), 4000);
  };

  const handleDisconnectAll = async () => {
    try {
      await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (e) {
      console.error(e);
    }

    setConnectedProfiles([]);
    setAdAccounts([]);
    localStorage.setItem('primetrack_meta_disconnected', 'true');
    localStorage.removeItem('primetrack_connected_profiles');
    localStorage.removeItem('primetrack_ad_accounts');
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

    // Busca status real das conexões salvas no backend (fonte única de verdade)
    fetch('/api/meta/status')
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
        } else {
          // Se backend reportar 0 conexões
          setConnectedProfiles([]);
          setAdAccounts([]);
          localStorage.setItem('primetrack_meta_disconnected', 'true');
        }

        if (data.adAccounts && data.adAccounts.length > 0) {
          const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('primetrack_ad_accounts') : null;
          let localSyncMap = {};
          if (savedLocal) {
            try {
              const parsed = JSON.parse(savedLocal);
              if (Array.isArray(parsed)) {
                parsed.forEach(p => {
                  if (p.id) localSyncMap[p.id] = p.sync;
                });
              }
            } catch (e) {}
          }

          const mappedAccs = data.adAccounts.map(a => {
            const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
            const isAccountActive = a.status === 'ACTIVE' || a.status === 'Ativa' || a.account_status === 1;
            // Prioridade: syncActive salvo no backend > localStorage > ativação inteligente para contas ativas com gasto
            const isSyncActive = a.syncActive !== undefined
              ? a.syncActive === true
              : (localSyncMap[accId] !== undefined 
                  ? localSyncMap[accId] === true 
                  : (isAccountActive && (Number(a.amountSpent) > 0 || accId === '1092137896602979')));

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
        }
      })
      .catch(e => console.log('Backend offline ou usando cache local'));
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
      <div className="flex items-center gap-6 border-b border-[#13233E] text-xs font-medium overflow-x-auto scrollbar-none">
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
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B66E3]" />
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
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="font-bold text-white text-sm">
                Perfil Conectados ({connectedProfiles.length})
              </h3>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-[#24131A] hover:bg-red-950/40 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Tutorial</span>
                </button>
                <button 
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#2B66E3] hover:bg-[#2558C7] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand/30 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Facebook</span>
                </button>
                <button 
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-white/10 hover:border-brand text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reconectar</span>
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
              <div className="p-8 text-center rounded-xl bg-[#070D1A] border border-dashed border-[#13233E]">
                <ShieldAlert className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <div className="font-bold text-white text-xs">Nenhum perfil do Facebook conectado</div>
                <p className="text-zinc-500 text-[11px] mt-1">
                  Clique em "Adicionar Facebook" para conectar sua conta de anúncios com segurança.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectedProfiles.map((prof) => (
                  <div key={prof.id} className="p-4 rounded-xl bg-[#070D1A] border border-[#13233E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A6DFF] text-white font-bold text-sm flex items-center justify-center font-mono shrink-0 shadow-md">
                        {prof.initial}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-2 flex-wrap">
                          <span>{prof.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span>Perfil Backup (Seguro)</span>
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          ID: {prof.id} · {prof.accountsCount} conta(s) de anúncio
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Modo Leitura e Sincronização Seguro: Nenhuma escrita no Meta é disparada através desta conta.</span>
                        </div>
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
                ))}
              </div>
            )}
          </div>

          {/* Contas de Anúncio Table matching Screenshot 4 */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#13233E] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Contas de Anúncio ({adAccounts.length})</span>
                {trialStatus.isTrial && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-bold">
                    {adAccounts.filter(a => a.sync).length}/1 ativa no Trial
                  </span>
                )}
              </h3>
              {adAccounts.length > 0 && (
                <button 
                  onClick={() => {
                    setAdAccounts([]);
                    setConnectedProfiles([]);
                    setDisconnectToast('Todas as contas de anúncio e perfis foram desconectados.');
                    setTimeout(() => setDisconnectToast(null), 4000);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-medium cursor-pointer"
                >
                  Desconectar Todas
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
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
                <tbody className="divide-y divide-[#13233E]/60 font-sans">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
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

            <div className="p-3.5 border-t border-[#13233E] text-xs font-mono text-zinc-500">
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
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Pixels de Rastreio ({trackingPixels.length}/{trialStatus.isTrial ? 1 : '∞'})</span>
                {trialStatus.isTrial && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-bold">
                    Máx 1 no Trial
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-[#24131A] hover:bg-red-950/40 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Tutorial</span>
                </button>
                <button 
                  onClick={() => {
                    if (trialStatus.isTrial && trackingPixels.length >= 1) {
                      setTrialLimitModal({
                        title: 'Limite do Plano Free Atingido',
                        message: 'No período de teste de 7 dias gratuito você pode criar no máximo 1 pixel de rastreio. Faça o upgrade para o Plano Pro para criar múltiplos pixels ilimitados.',
                        ctaText: 'Ver Planos Pro'
                      });
                      return;
                    }
                    setShowNewPixelModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1A6DFF] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar Pixel</span>
                </button>
              </div>
            </div>

            {/* If zero pixels: clean empty state */}
            {trackingPixels.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-[#070D1A] border border-dashed border-[#13233E] space-y-3">
                <Radio className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="font-bold text-white text-xs">Nenhum pixel de rastreio configurado ainda</div>
                <p className="text-zinc-500 text-[11px] max-w-md mx-auto">
                  Crie seu pixel da PrimeTrack para capturar 100% dos dados, driblar bloqueadores e atingir Nota de Match 9.1+ no CAPI da Meta.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewPixelModal(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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
                    <div key={px.id} className="space-y-4 pb-6 border-b border-[#13233E] last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#13233E]/60">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-white font-mono text-[10px] font-bold ${px.status === 'Ativo' ? 'bg-[#1A6DFF]' : 'bg-zinc-700'}`}>
                            {px.status}
                          </span>
                          <span className="font-bold text-white text-sm">{px.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => handleOpenTestPixel(px)}
                            className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            Testar
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenEditPixel(px)}
                            className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleTogglePixelStatus(px.id)}
                            className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            {px.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setPixelToDelete(px)}
                            className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-red-950/30 border border-white/10 text-red-400 text-xs transition-colors cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Pixel ID</div>
                          <div className="font-mono text-zinc-300 truncate" title={px.metaPixelId || px.pixelId}>
                            {px.metaPixelId || px.pixelId}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Token CAPI</div>
                          <div className="font-mono text-zinc-300 truncate" title={px.capiTokenRaw || px.capiToken}>
                            {px.capiTokenRaw || px.capiToken || 'Não informado'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Regra de IC</div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
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
                        <div className="relative bg-[#070D1A] border border-[#13233E] rounded-xl p-3.5 font-mono text-[11px] text-zinc-300 pr-20 overflow-x-auto whitespace-pre">
                          <code>{pxScript}</code>
                          <button
                            onClick={() => copyToClipboard(pxScript, 'pixel')}
                            className="absolute right-2.5 top-2.5 px-3 py-1 rounded-lg bg-[#0A1426] hover:bg-[#12223D] border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
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
            <div className="bg-[#070D1A] border border-[#13233E] rounded-xl p-3 text-xs text-zinc-400">
              <strong>Dica:</strong> nosso pixel já captura automaticamente os parâmetros da URL (UTMs, fbclid, etc.) e repassa para todos os links da página, inclusive o checkout. Não precisa de script extra.
            </div>
          </div>

          {/* Big Blue Card: Nosso Pixel entrega 9.1/10 de Event Match Quality */}
          <div className="bg-[#1A6DFF] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
            
            {/* Top row with Meta seal and EMQ Score */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                  META CERTIFIED
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
                  Nosso Pixel entrega 9.1/10 de Event Match Quality
                </h3>
                <p className="text-xs sm:text-sm text-white/80 font-sans mt-0.5 max-w-2xl">
                  A maioria das plataformas fica abaixo de 6.0. Com PrimeTrack você envia eventos enriquecidos direto para o CAPI da Meta, escalando anúncios com a maior precisão do mercado.
                </p>
              </div>
            </div>

            {/* Bottom Row: Video Thumbnail + 6 Grid Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Video Thumbnail Card matching Screenshot 5 */}
              <div className="lg:col-span-3 flex justify-center lg:justify-start">
                <div className="relative w-[130px] sm:w-[150px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/30 shadow-2xl bg-black group cursor-pointer">
                  <img 
                    src="/images/pixel_video_thumb.png" 
                    alt="Nota do pixel PrimeTrack" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 right-2 text-[10px] font-bold text-white drop-shadow bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm truncate">
                    Nota do pixel
                  </div>
                </div>
              </div>

              {/* Right 6 Benefit Cards Grid matching Screenshot 5 */}
              <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">CAPI server-side direto</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Eventos disparados pelo nosso servidor, sem perda por bloqueador ou iOS.
                  </div>
                </div>

                {/* 2 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Enriquecimento completo</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    fbp, fbc, IP real, geo, e-mail e telefone em todo Purchase.
                  </div>
                </div>

                {/* 3 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Deduplicação automática</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Sem evento duplicado entre browser e servidor. EMQ limpo.
                  </div>
                </div>

                {/* 4 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Escala com precisão</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Mais qualidade de match = otimização rápida e CPA mais baixo.
                  </div>
                </div>

                {/* 5 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Allowlist de domínios</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Bloqueie tráfego de terceiros que tentem copiar seu pixel.
                  </div>
                </div>

                {/* 6 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Sem container, sem GTM-SS</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Mesmo poder do Stape/Elevar, com instalação em 1 linha.
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UTMs (Screenshot 4)                                                */}
      {/* ========================================================================= */}
      {activeTab === 'UTMs' && (
        <div className="space-y-6">
          
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 sm:p-7 shadow-xl space-y-7">
            
            {/* Header com botão Tutorial */}
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-bold text-white text-sm">
                UTMs para Facebook Ads
              </h3>

              <button className="px-3 py-1.5 rounded-lg bg-[#24131A] hover:bg-red-950/40 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                <Play className="w-3 h-3 fill-current" />
                <span>Tutorial</span>
              </button>
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

              <div className="relative bg-[#070D1A] border border-[#13233E] rounded-xl p-3.5 font-mono text-[11px] text-zinc-300 pr-24 overflow-x-auto">
                <code>{utmString}</code>
                <button
                  onClick={() => copyToClipboard(utmString, 'utm')}
                  className="absolute right-2.5 top-2.5 px-3 py-1 rounded-lg bg-[#0A1426] hover:bg-[#12223D] border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1"
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
                  <thead className="text-[10px] text-zinc-500 uppercase border-b border-[#13233E]">
                    <tr>
                      <th className="py-2.5 px-3">PARÂMETRO</th>
                      <th className="py-2.5 px-3">VALOR</th>
                      <th className="py-2.5 px-3">O QUE CAPTURA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#13233E]/60 text-xs">
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
            <div className="bg-[#070D1A] border border-[#13233E] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-400">
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
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                Webhook API
              </h3>
              <a 
                href="https://docs.primetrack.top"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 hover:border-[#0066FF]/50 text-zinc-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
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
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#13233E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Tokens de API ({apiTokens.length}/{trialStatus.isTrial ? 1 : 2})</span>
                {trialStatus.isTrial && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-bold">
                    Máx 1 no Trial
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setShowConnectPlatformModal(true);
                    setConnectPlatformStep(1);
                    setSearchPlatform('');
                    setSelectedPlatformName('Monsterpay');
                    setTokenAliasInput('monsterpay');
                    setGeneratedPlatformToken('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#070D1A] hover:bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Conectar Plataforma</span>
                </button>
                <button 
                  onClick={() => {
                    setShowNewTokenModal(true);
                    setNewTokenStep(1);
                    setTokenInputName('');
                    setCopiedRecentToken(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#070D1A] hover:bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Token Padrão</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                  <tr>
                    <th className="py-3 px-4">PLATAFORMA</th>
                    <th className="py-3 px-4">TOKEN</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4">ÚLTIMO USO</th>
                    <th className="py-3 px-4">CRIADO EM</th>
                    <th className="py-3 px-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13233E]/60 font-sans">
                  {apiTokens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 px-4 text-center">
                        <div className="text-zinc-400 font-bold text-xs">
                          Nenhum token de API criado ainda
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1">
                          Clique em <span className="text-[#5C9BFF] font-semibold">"Conectar Plataforma"</span> ou <span className="text-[#5C9BFF] font-semibold">"Token Padrão"</span> acima para gerar seu primeiro token.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    apiTokens.map((tok) => (
                    <tr key={tok.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4 font-bold text-white">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                          {tok.platform || tok.name}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-zinc-300">
                        {tok.token ? `${tok.token.slice(0, 3)}****${tok.token.slice(-6)}` : 'pt_****1775a8'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                          {tok.status || 'Ativo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                        {tok.lastUsed || '—'}
                      </td>
                      <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                        {tok.createdAt || '07/09/2026'}
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
                  )))}
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
          
          {/* Header Card with Status Senha Definida */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <span>📲</span>
              <span>App PrimeTrack</span>
            </div>

            {currentUser?.hasSetPassword ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                <span>Senha</span>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Definida</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                <span>Defina sua Senha</span>
              </div>
            )}
          </div>

          {/* 2 Columns Grid: Baixe o app + Atualizar senha */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col (5 cols): Baixe o app & Como acessar */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-white text-sm">
                  Baixe o app
                </h3>
                <p className="text-xs text-zinc-400">
                  Acompanhe suas métricas em tempo real direto do celular.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button className="px-4 py-2 rounded-xl bg-black border border-white/20 text-white font-bold text-xs flex items-center gap-2 hover:bg-zinc-900 transition-colors">
                    <Apple className="w-4 h-4 fill-current" />
                    <span>App Store</span>
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-[#00C853] hover:bg-[#00B34A] text-black font-bold text-xs flex items-center gap-2 shadow-md transition-colors">
                    <Smartphone className="w-4 h-4" />
                    <span>Android APK</span>
                  </button>
                </div>
              </div>

              {/* Como acessar box */}
              <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-2 text-xs">
                <div className="font-bold text-white">Como acessar:</div>
                <ol className="space-y-1.5 text-zinc-400 text-[12px]">
                  <li>1. Baixe o app</li>
                  <li>2. Defina uma senha ao lado →</li>
                  <li>
                    3. No app ou em outro navegador, faça login com:
                    <div className="mt-1 pl-4 space-y-0.5 font-mono text-zinc-300">
                      <div>✉️ {currentUser?.email || 'seu@email.com'}</div>
                      <div>🔑 A senha que você definir</div>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            {/* Right Col (7 cols): Atualizar senha do app Form */}
            <div className="lg:col-span-7 bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Key className="w-4 h-4 text-[#5C9BFF]" />
                <span>{currentUser?.hasSetPassword ? 'Atualizar senha de acesso' : 'Cadastre sua senha de acesso'}</span>
              </div>
              <p className="text-xs text-zinc-400">
                {currentUser?.hasSetPassword 
                  ? 'Você já possui uma senha ativa. Preencha abaixo caso queira alterá-la.' 
                  : 'Cadastre sua senha abaixo para conseguir fazer login em outros navegadores ou no aplicativo sem precisar do Google.'}
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    NOVA SENHA
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#070D1A] border border-[#13233E] focus:border-[#1A6DFF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    CONFIRMAR SENHA
                  </label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#070D1A] border border-[#13233E] focus:border-[#1A6DFF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                {passError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passError}</span>
                  </div>
                )}

                {passUpdated && (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Senha cadastrada com sucesso! Agora você pode logar em qualquer navegador digitando seu e-mail ({currentUser?.email}) e sua senha.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingPass}
                  className="px-5 py-2.5 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isSavingPass ? 'Salvando senha...' : (currentUser?.hasSetPassword ? 'Atualizar Senha' : 'Cadastrar Senha')}</span>
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: Dúvidas (Screenshot 3)                                              */}
      {/* ========================================================================= */}
      {activeTab === 'Dúvidas' && (
        <div className="space-y-3">
          {[
            {
              title: "Minhas vendas não está marcando nas campanhas",
              hasVideo: true,
              content: "Certifique-se de que os botões de checkout da sua landing page estão com o script da PrimeTrack instalado e que o webhook da sua plataforma foi cadastrado corretamente com os eventos de compra aprovada."
            },
            {
              title: "Não tá marcando IC",
              hasVideo: true,
              content: "O evento InitiateCheckout (IC) é disparado automaticamente quando o lead clica em qualquer botão com a classe .btn-checkout ou link de checkout."
            },
            {
              title: "Como faço para entrar no app?",
              hasVideo: false,
              content: "Basta baixar o app na App Store ou Android APK, definir sua senha na aba 'Baixe nosso App' e fazer login com seu e-mail cadastrado."
            },
            {
              title: "Meu app não notificou a venda",
              hasVideo: false,
              content: "Verifique na aba Notificações se as opções de notificações estão ativas e conceda permissão de notificações push no seu smartphone."
            },
            {
              title: "Como funciona a notificação de saldo baixo e limite de gastos?",
              hasVideo: false,
              content: "Sincronizamos de hora em hora o saldo das suas contas de anúncios. Ao atingir o limite estipulado, você recebe um push imediato."
            },
            {
              title: "Não está trackeando minhas vendas na Hotmart",
              hasVideo: false,
              content: "Na Hotmart, certifique-se de usar a versão 2.0.0 de Webhook com a URL gerada e com o evento 'Compra Aprovada' selecionado."
            },
            {
              title: "A plataforma que uso para vender não está na lista de integrações",
              hasVideo: false,
              content: "A PrimeTrack possui suporte a Webhook Genérico via API para aceitar payloads em JSON de qualquer plataforma proprietária."
            }
          ].map((faq, idx) => (
            <div 
              key={idx}
              className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-white hover:bg-white/[0.02] transition-colors"
              >
                <span>{faq.title}</span>
                <div className="flex items-center gap-3">
                  {faq.hasVideo && (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider">
                      Vídeo
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${openFaq === idx ? 'rotate-180 text-white' : ''}`} />
                </div>
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 border-t border-[#13233E]/60 bg-[#070D1A]/50 leading-relaxed font-sans">
                  {faq.content}
                </div>
              )}
            </div>
          ))}
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
            className="w-full max-w-md bg-[#0A1426] border border-[#13233E] rounded-3xl p-6 sm:p-7 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowConnectModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors"
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
                  window.location.href = '/api/auth/facebook';
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-brand/30 transition-transform active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Conectar com Facebook</span>
              </button>

              {/* Secondary Dark Button: Copiar link de conexão */}
              <button
                onClick={() => {
                  copyToClipboard(`${window.location.origin}/auth/facebook/connect?token=pt_auth_${Date.now()}`, 'connect');
                  setCopiedConnectLink(true);
                  setTimeout(() => setCopiedConnectLink(false), 2500);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <span>📋</span>
                <span>{copiedConnectLink ? 'Link copiado com sucesso!' : 'Copiar link de conexão'}</span>
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
          <div className="bg-[#0A1426] border border-[#1E3A5F] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setTrialLimitModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-sans flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span>Seu teste de 7 dias gratuitos está ativo! Faça upgrade a qualquer momento para liberar todos os recursos.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTrialLimitModal(null)}
                className="px-4 py-2 rounded-xl bg-[#070D1A] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Entendi
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrialLimitModal(null);
                  navigate('/planos');
                }}
                className="px-4 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-xs font-bold text-white shadow-lg shadow-brand/30 transition-all flex items-center gap-1.5 cursor-pointer"
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
            setTokenInputName('');
          }}
        >
          <div 
            className="bg-[#0C172B] border border-[#1E3254] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1E3254]/60">
              <h3 className="text-base font-bold text-white tracking-tight">
                Novo Token de API
              </h3>
              <button 
                onClick={() => {
                  setShowNewTokenModal(false);
                  setNewTokenStep(1);
                  setTokenInputName('');
                }} 
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newTokenStep === 1 && (
              <form onSubmit={handleGenerateToken} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                    NOME DA PLATAFORMA
                  </label>
                  <input 
                    type="text"
                    autoFocus
                    value={tokenInputName}
                    onChange={(e) => setTokenInputName(e.target.value)}
                    placeholder="Ex: Hotmart, Kiwify, Monetizze..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#060D1A] border border-[#1E3254] text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-[#1A6DFF] transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTokenModal(false);
                      setNewTokenStep(1);
                      setTokenInputName('');
                    }}
                    className="px-4 py-2 rounded-lg bg-[#070D1A] hover:bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#1A6DFF] hover:bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
                  >
                    Gerar Token
                  </button>
                </div>
              </form>
            )}

            {newTokenStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Banner de Sucesso verde */}
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Pronto! Copie abaixo e cole no painel da <strong className="text-[#5C9BFF] font-bold">{newTokenCreatedPlatform}</strong>.
                  </span>
                </div>

                {/* Campo do TOKEN */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    TOKEN
                  </label>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#060D1A] border border-[#1E3254]">
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
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-zinc-200 font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedRecentToken ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
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
                      setTokenInputName('');
                    }}
                    className="px-6 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
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
            className="bg-[#0C172B] border border-[#1E3254] rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com Título e Botão Fechar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3254]/60">
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

            {/* PASSO 1: Seleção de Plataforma (Screenshot 1) - Deixa somente Monsterpay */}
            {connectPlatformStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="Buscar plataforma..."
                    value={searchPlatform}
                    onChange={(e) => setSearchPlatform(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#060D1A] border border-[#1E3254] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#1A6DFF] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {'monsterpay'.includes(searchPlatform.toLowerCase().trim()) ? (
                    <div 
                      onClick={() => handleQuickConnectPlatform('Monsterpay')}
                      className="bg-[#070D1A] hover:bg-[#0E1B33] border border-[#1E3254] hover:border-[#1A6DFF] rounded-xl p-4 transition-all cursor-pointer group flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">Monsterpay</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                          Nativa
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open('https://docs.primetrack.top', '_blank');
                        }}
                        className="px-2.5 py-1 rounded bg-[#10203D] hover:bg-[#1A3360] text-[#5C9BFF] text-[10px] font-semibold flex items-center gap-1 border border-[#1E3254] cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Tutorial</span>
                      </button>
                    </div>
                  ) : (
                    <div className="col-span-full py-8 text-center text-xs text-zinc-500 font-sans">
                      Nenhuma plataforma encontrada com "{searchPlatform}".
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 2: Apelido do Token (Screenshot 2) */}
            {connectPlatformStep === 2 && (
              <form onSubmit={handleGenerateConnectToken} className="space-y-5 animate-in fade-in duration-150">
                <div className="text-xs text-zinc-400 font-sans">
                  Plataforma: <strong className="text-[#5C9BFF] font-bold">{selectedPlatformName.toLowerCase()}</strong>
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
                    placeholder="monsterpay"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#060D1A] border border-[#1E3254] text-white text-xs focus:outline-none focus:border-[#1A6DFF] transition-colors font-sans"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setConnectPlatformStep(1)}
                    className="px-4 py-2 rounded-xl bg-[#070D1A] hover:bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>←</span>
                    <span>Voltar</span>
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    Gerar Token
                  </button>
                </div>
              </form>
            )}

            {/* PASSO 3: Token Gerado (Print 3) - Somente o Token */}
            {connectPlatformStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Banner de Sucesso verde */}
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Pronto! Copie abaixo e cole no painel da <strong className="text-[#5C9BFF] font-bold">{selectedPlatformName.toLowerCase()}</strong>.
                  </span>
                </div>

                {/* Campo do TOKEN */}
                <div>
                  <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    TOKEN
                  </label>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#060D1A] border border-[#1E3254]">
                    <span className="font-mono text-xs text-zinc-200 select-all truncate pl-1">
                      {generatedPlatformToken}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyPlatformField(generatedPlatformToken, 'token')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-zinc-200 font-medium transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedToken ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
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
                    onClick={() => setShowConnectPlatformModal(false)}
                    className="px-6 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
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
            className="bg-[#0C172B] border border-[#1E3254] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3254]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 flex items-center justify-center text-[#5C9BFF]">
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#1A6DFF] transition-colors"
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#1A6DFF] transition-colors"
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#1A6DFF] transition-colors"
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
                        ? 'bg-[#1A6DFF]/20 border-[#1A6DFF] text-[#5C9BFF]' 
                        : 'bg-[#070D1A] border-[#1E3254] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Seletor CSS
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPixelIcType('url')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      newPixelIcType === 'url' 
                        ? 'bg-[#1A6DFF]/20 border-[#1A6DFF] text-[#5C9BFF]' 
                        : 'bg-[#070D1A] border-[#1E3254] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Contém na URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPixelIcType('text')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      newPixelIcType === 'text' 
                        ? 'bg-[#1A6DFF]/20 border-[#1A6DFF] text-[#5C9BFF]' 
                        : 'bg-[#070D1A] border-[#1E3254] text-zinc-400 hover:text-zinc-200'
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#1A6DFF] transition-colors"
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#1A6DFF] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPixelModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#070D1A] hover:bg-white/5 border border-white/10 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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
            className="bg-[#0C172B] border border-[#1E3254] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3254]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 flex items-center justify-center text-[#5C9BFF]">
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
                  Nome do Pixel (Identificação interna)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hotmart, Meu Checkout, Pixel Principal"
                  value={editPixelName}
                  onChange={(e) => setEditPixelName(e.target.value)}
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#1A6DFF] transition-colors"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>Pixel ID (Facebook / Meta Ads)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Não editável</span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editPixelMetaId}
                  className="w-full bg-[#070D1A]/60 border border-[#1E3254]/60 rounded-xl px-3.5 py-2.5 text-zinc-400 font-mono cursor-not-allowed select-all focus:outline-none"
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
                  value={editPixelCapiToken}
                  onChange={(e) => setEditPixelCapiToken(e.target.value)}
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#1A6DFF] transition-colors"
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
                    onClick={() => setEditPixelIcType('css')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      editPixelIcType === 'css' 
                        ? 'bg-[#1A6DFF]/20 border-[#1A6DFF] text-[#5C9BFF]' 
                        : 'bg-[#070D1A] border-[#1E3254] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Seletor CSS
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPixelIcType('url')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      editPixelIcType === 'url' 
                        ? 'bg-[#1A6DFF]/20 border-[#1A6DFF] text-[#5C9BFF]' 
                        : 'bg-[#070D1A] border-[#1E3254] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Contém na URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPixelIcType('text')}
                    className={`py-2 px-2.5 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                      editPixelIcType === 'text' 
                        ? 'bg-[#1A6DFF]/20 border-[#1A6DFF] text-[#5C9BFF]' 
                        : 'bg-[#070D1A] border-[#1E3254] text-zinc-400 hover:text-zinc-200'
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#1A6DFF] transition-colors"
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-[#1A6DFF] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPixelToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-[#070D1A] hover:bg-white/5 border border-white/10 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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
            className="bg-[#0C172B] border border-[#1E3254] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3254]">
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
                  className="w-full bg-[#070D1A] border border-[#1E3254] rounded-xl px-3.5 py-2.5 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-[#1A6DFF] transition-colors"
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
                    <span>⚠️ Script não encontrado no HTML do site.</span>
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
                  className="px-4 py-2 rounded-xl bg-[#070D1A] hover:bg-white/5 border border-white/10 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPixel || !testSiteUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
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
            className="bg-[#0C172B] border border-[#1E3254] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#10203D] border border-[#1E3254] flex items-center justify-center mx-auto text-[#2B66E3]">
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#070D1A] hover:bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeletePixel(pixelToDelete.id)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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
            className="bg-[#0C172B] border border-[#1E3254] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícone de alerta em círculo azul */}
            <div className="w-12 h-12 rounded-full bg-[#10203D] border border-[#1E3254] flex items-center justify-center mx-auto text-[#2B66E3]">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              Excluir este token?
            </h3>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTokenToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#070D1A] hover:bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteToken(tokenToDelete.id);
                  setTokenToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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
