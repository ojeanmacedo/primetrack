import React, { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser } from '../utils/auth';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Mail, 
  Shield, 
  KeyRound, 
  Check, 
  Eye, 
  EyeOff, 
  Lock, 
  Sparkles,
  Smartphone,
  AlertCircle,
  Copy,
  CheckCheck,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  X
} from 'lucide-react';
import { 
  generateTwoFactorSecret, 
  generateQRCode, 
  verifyTwoFactorCode, 
  saveTwoFactorConfig, 
  getTwoFactorConfig, 
  formatSecretKey 
} from '../utils/twoFactor';

export default function Account() {
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());
  const [name, setName] = useState(currentUser?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Senha States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const email = getCurrentUser()?.email;
      if (email) {
        return getTwoFactorConfig(email).enabled;
      }
      return localStorage.getItem('primetrack_2fa_enabled') === 'true';
    }
    return false;
  });
  const [twoFactorSuccess, setTwoFactorSuccess] = useState(false);

  // 2FA Modal States
  const [show2FAActivateModal, setShow2FAActivateModal] = useState(false);
  const [show2FADeactivateModal, setShow2FADeactivateModal] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [twoFactorVerifyInput, setTwoFactorVerifyInput] = useState('');
  const [twoFactorModalError, setTwoFactorModalError] = useState('');
  const [twoFactorModalLoading, setTwoFactorModalLoading] = useState(false);
  const [isCopiedKey, setIsCopiedKey] = useState(false);
  const [deactivateInput, setDeactivateInput] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Sincroniza status real do 2FA (local + Supabase backend)
  useEffect(() => {
    const check2FAStatus = async () => {
      const email = currentUser?.email?.toLowerCase().trim();
      if (!email) return;

      const localCfg = getTwoFactorConfig(email);
      setTwoFactorEnabled(Boolean(localCfg.enabled));

      try {
        const res = await fetch(`/api/auth/2fa/status?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data?.success && typeof data.enabled === 'boolean') {
          setTwoFactorEnabled(data.enabled);
        }
      } catch (e) {}
    };

    check2FAStatus();

    const handle2FAUpdated = (e) => {
      if (e?.detail && typeof e.detail.enabled === 'boolean') {
        setTwoFactorEnabled(e.detail.enabled);
      }
    };

    window.addEventListener('primetrack_2fa_updated', handle2FAUpdated);
    return () => window.removeEventListener('primetrack_2fa_updated', handle2FAUpdated);
  }, [currentUser?.email]);

  useEffect(() => {
    const syncUser = () => {
      const u = getCurrentUser();
      if (u) {
        if (u.email && (u.email.toLowerCase() === 'jeeanmacedo@gmail.com' || u.email.toLowerCase() === 'jeanmacedo@gmail.com')) {
          u.plan = 'scale';
          u.role = 'admin';
        }
        setCurrentUserState(u);
        setName(u.name || '');
      }
    };
    syncUser();
    window.addEventListener('primetrack_profile_sync', syncUser);
    return () => window.removeEventListener('primetrack_profile_sync', syncUser);
  }, []);

  // Alteração do Nome de Exibição
  const handleUpdateName = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    setIsSavingName(true);
    setNameSuccess(false);

    try {
      const cleanName = name.trim();
      const email = currentUser?.email?.toLowerCase();
      
      // 1. Atualiza no backend central Node.js
      if (email) {
        try {
          await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: cleanName })
          });
        } catch (apiErr) {
          console.warn('Erro ao chamar /api/auth/update-profile:', apiErr);
        }
      }

      // 2. Atualiza usuário no Supabase direto
      if (email) {
        try {
          await supabase
            .from('users')
            .update({ name: cleanName })
            .eq('email', email);
        } catch (sbErr) {
          console.warn('Erro ao salvar no Supabase users:', sbErr);
        }
      }

      const updatedUser = {
        ...currentUser,
        name: cleanName,
        avatarLetter: cleanName.charAt(0).toUpperCase()
      };

      setCurrentUser(updatedUser);
      setCurrentUserState(updatedUser);
      
      if (email) {
        localStorage.setItem(`primetrack_usr_${email}`, JSON.stringify(updatedUser));
      }

      window.dispatchEvent(new Event('primetrack_profile_sync'));
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao atualizar nome:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  // Alteração / Cadastro de Senha
  const handleUpdatePassword = async (e) => {
    e?.preventDefault();
    setPassError('');
    setPassSuccess(false);

    const cleanPass = newPassword.trim();
    if (cleanPass.length < 6) {
      setPassError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setPassError('A confirmação da senha não coincide com a nova senha.');
      return;
    }

    setIsSavingPass(true);

    try {
      const email = currentUser?.email?.toLowerCase();

      // Envia ao backend central se houver
      try {
        await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: cleanPass })
        });
      } catch (e) {}

      // Atualiza no Supabase
      if (email) {
        await supabase
          .from('users')
          .update({ password: cleanPass })
          .eq('email', email)
          .catch(() => {});
      }

      const updatedUser = {
        ...currentUser,
        password: cleanPass,
        hasSetPassword: true
      };

      setCurrentUser(updatedUser);
      setCurrentUserState(updatedUser);

      if (email) {
        localStorage.setItem(`primetrack_usr_${email}`, JSON.stringify(updatedUser));
      }

      localStorage.removeItem('primetrack_needs_password_setup');
      setPassSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err) {
      setPassError('Erro ao atualizar senha. Tente novamente.');
    } finally {
      setIsSavingPass(false);
    }
  };

  // 2FA - Abertura do Modal de Ativação
  const handleOpenActivate2FA = async () => {
    setTwoFactorModalError('');
    setTwoFactorVerifyInput('');
    setIsCopiedKey(false);
    setTwoFactorModalLoading(true);
    setShow2FAActivateModal(true);

    try {
      const email = currentUser?.email || 'usuario@primetrack.top';
      const setup = generateTwoFactorSecret(email);
      const qr = await generateQRCode(setup.uri);
      setTwoFactorSetupData(setup);
      setQrCodeDataUrl(qr);
    } catch (err) {
      console.error('Erro ao gerar configuração 2FA:', err);
      setTwoFactorModalError('Erro ao gerar QR Code. Tente novamente.');
    } finally {
      setTwoFactorModalLoading(false);
    }
  };

  // 2FA - Confirmação do Código e Ativação Definitiva
  const handleConfirmActivate2FA = async (e) => {
    e?.preventDefault();
    if (!twoFactorSetupData?.secret) return;

    const cleanCode = twoFactorVerifyInput.replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      setTwoFactorModalError('Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.');
      return;
    }

    setTwoFactorModalLoading(true);
    setTwoFactorModalError('');

    const isValid = verifyTwoFactorCode(twoFactorSetupData.secret, cleanCode);
    if (!isValid) {
      setTwoFactorModalError('Código inválido ou expirado. Verifique os números no seu aplicativo autenticador e tente novamente.');
      setTwoFactorModalLoading(false);
      return;
    }

    try {
      const email = currentUser?.email || '';
      await saveTwoFactorConfig(email, {
        enabled: true,
        secret: twoFactorSetupData.secret
      });
      setTwoFactorEnabled(true);
      setShow2FAActivateModal(false);
      setTwoFactorSuccess(true);
      setTimeout(() => setTwoFactorSuccess(false), 4000);
    } catch (err) {
      console.error('Erro ao ativar 2FA:', err);
      setTwoFactorModalError('Erro ao salvar configuração do 2FA. Tente novamente.');
    } finally {
      setTwoFactorModalLoading(false);
    }
  };

  // 2FA - Abertura do Modal de Desativação
  const handleOpenDeactivate2FA = () => {
    setDeactivateInput('');
    setDeactivateError('');
    setShow2FADeactivateModal(true);
  };

  // 2FA - Confirmação da Desativação
  const handleConfirmDeactivate2FA = async (e) => {
    e?.preventDefault();
    setDeactivateLoading(true);
    setDeactivateError('');

    const email = currentUser?.email || '';
    const cleanInput = deactivateInput.trim();

    // Se o usuário digitou algo, valida se é o código TOTP ou a senha
    if (cleanInput) {
      const isDigitCode = /^\d{6}$/.test(cleanInput);
      if (isDigitCode) {
        const localCfg = getTwoFactorConfig(email);
        if (localCfg?.secret) {
          const valid = verifyTwoFactorCode(localCfg.secret, cleanInput);
          if (!valid) {
            setDeactivateError('Código de 6 dígitos inválido ou expirado.');
            setDeactivateLoading(false);
            return;
          }
        }
      } else if (currentUser?.password && cleanInput !== currentUser.password) {
        setDeactivateError('Senha incorreta.');
        setDeactivateLoading(false);
        return;
      }
    }

    try {
      await saveTwoFactorConfig(email, {
        enabled: false,
        secret: null
      });
      setTwoFactorEnabled(false);
      setShow2FADeactivateModal(false);
      setTwoFactorSuccess(true);
      setTimeout(() => setTwoFactorSuccess(false), 4000);
    } catch (err) {
      console.error('Erro ao desativar 2FA:', err);
      setDeactivateError('Erro ao desativar 2FA. Tente novamente.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  // Determinação do Plano
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isOwner = userEmail === 'jeeanmacedo@gmail.com' || userEmail === 'jeanmacedo@gmail.com';
  const effectivePlan = isOwner ? 'scale' : (currentUser?.plan || 'trial').toLowerCase();

  const getPlanInfo = () => {
    if (effectivePlan === 'scale') {
      return {
        name: 'Scale',
        badge: 'Ativo',
        badgeClass: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
        description: 'Acesso ilimitado a todas as métricas, pixels, dashboards, webhooks e 15 regras automáticas'
      };
    }
    if (effectivePlan === 'pro') {
      return {
        name: 'Pro',
        badge: 'Ativo',
        badgeClass: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
        description: 'Até 5 contas de anúncios, 5 pixels, 5 dashboards, 5 webhooks e 7 regras automáticas'
      };
    }
    if (effectivePlan === 'basic') {
      return {
        name: 'Basic',
        badge: 'Ativo',
        badgeClass: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
        description: 'Até 2 contas de anúncios, 2 pixels, 1 dashboard, 1 webhook e 2 regras automáticas'
      };
    }
    return {
      name: 'Free',
      badge: 'Plano Free',
      badgeClass: 'bg-blue-500/10 border border-blue-500/20 text-blue-400',
      description: '1 conta de anúncio ativa, 1 pixel e 1 webhook de vendas'
    };
  };

  const planInfo = getPlanInfo();

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Minha Conta
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Gerencie os dados do seu perfil, plano atual e segurança de acesso.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Coluna Esquerda: Detalhes da Conta + Autenticação de dois fatores (2FA) */}
        <div className="space-y-6">
          
          {/* Card 1: Detalhes da Conta */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#0066FF]" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Detalhes da conta
                </h2>
              </div>
              {nameSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
                  <Check className="w-3.5 h-3.5" /> Nome atualizado!
                </span>
              )}
            </div>

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* Nome de Exibição (Editável) */}
                <div>
                  <label className="text-[11px] text-zinc-300 block mb-1 font-medium">
                    Nome de exibição
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                {/* E-mail (Somente leitura - Conta Google) */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium flex items-center gap-1">
                    <span>E-mail</span>
                    <span className="text-[10px] text-zinc-500 font-mono">(Google Conectado)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={currentUser?.email || 'contato@gmail.com'}
                      className="w-full bg-[#0D1424]/60 border border-[#1E293B] rounded-lg px-3 py-2 text-zinc-400 text-xs cursor-not-allowed opacity-80"
                    />
                    <Mail className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Plano Atual */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                    Status do Plano
                  </label>
                  <div className="bg-[#0D1424] border border-[#1E293B] rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#0066FF]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Plano {planInfo.name}</span>
                          <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${planInfo.badgeClass}`}>
                            {planInfo.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {planInfo.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="px-4 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingName ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Autenticação de dois fatores (2FA) */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0066FF]" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Autenticação de dois fatores (2FA)
                </h2>
              </div>
              <Lock className="w-4 h-4 text-zinc-500" />
            </div>

            <p className="text-xs text-zinc-400">
              A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta PrimeTrack ao solicitar verificação adicional durante o login.
            </p>

            {twoFactorSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Status de 2FA atualizado com sucesso!</span>
              </div>
            )}

            <div className="bg-[#0D1424] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Status do 2FA:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    twoFactorEnabled ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}>
                    {twoFactorEnabled ? 'ATIVADO' : 'DESATIVADO'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {twoFactorEnabled 
                    ? 'Sua conta está protegida com autenticação em duas etapas.' 
                    : 'A ativação de 2FA é recomendada para maior proteção dos seus dados de vendas.'}
                </p>
              </div>

              <button
                type="button"
                onClick={twoFactorEnabled ? handleOpenDeactivate2FA : handleOpenActivate2FA}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
                  twoFactorEnabled 
                    ? 'bg-[#1E293B] hover:bg-[#334155] text-zinc-300' 
                    : 'bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-blue-500/20'
                }`}
              >
                {twoFactorEnabled ? 'Desativar 2FA' : 'Ativar 2FA'}
              </button>
            </div>
          </div>

        </div>

        {/* Coluna Direita: Trocar Senha */}
        <div className="space-y-6">
          
          {/* Card: Trocar Senha */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0066FF]" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {currentUser?.hasSetPassword ? 'Trocar senha' : 'Definir senha de acesso'}
                </h2>
              </div>
              {currentUser?.hasSetPassword && (
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-semibold">
                  Senha Ativa
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-400">
              Cadastre ou altere sua senha para conseguir fazer login com seu e-mail em outros navegadores ou no aplicativo mobile.
            </p>

            {passError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Senha atualizada com sucesso!</span>
              </div>
            )}

            {/* Caixa: Como acessar */}
            <div className="bg-[#0D1424] border border-[#1E293B] rounded-xl p-4 space-y-2 text-xs">
              <div className="font-bold text-white text-xs">Como acessar:</div>
              <ol className="space-y-1.5 text-zinc-400 text-[11px]">
                <li>1. Baixe o app ou abra outro navegador</li>
                <li>2. Defina ou altere sua senha de acesso</li>
                <li>
                  3. No app ou em outro navegador, faça login com:
                  <div className="mt-1 pl-3 space-y-0.5 font-mono text-zinc-300 text-[11px]">
                    <div>✉️ {currentUser?.email || 'digitaljmsolucoes@gmail.com'}</div>
                    <div>🔑 A senha que você definir</div>
                  </div>
                </li>
              </ol>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] text-zinc-300 block mb-1 font-medium">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha (mínimo 6 caracteres)"
                    className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#0066FF] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-300 block mb-1 font-medium">
                  Confirmar nova senha
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a nova senha novamente"
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword('');
                    setConfirmPassword('');
                    setPassError('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPass}
                  className="px-4 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPass ? 'Salvando...' : (currentUser?.hasSetPassword ? 'Salvar Nova Senha' : 'Criar Senha')}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

      {/* Modal de Ativação de 2FA */}
      {show2FAActivateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0D1526] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4 text-white relative">
            
            {/* Fechar Modal */}
            <button
              type="button"
              onClick={() => setShow2FAActivateModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#0066FF] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Ativar Autenticação (2FA)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    PrimeTrack
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Proteja sua conta utilizando um aplicativo autenticador.
                </p>
              </div>
            </div>

            {/* Etapa 1: QR Code */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300 block">
                1. Escaneie o QR Code no seu aplicativo (Google Authenticator, Authy, etc.):
              </span>

              <div className="flex flex-col items-center justify-center p-4 bg-[#080D1A] border border-[#1E293B] rounded-xl">
                {twoFactorModalLoading && !qrCodeDataUrl ? (
                  <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
                    Gerando QR Code...
                  </div>
                ) : qrCodeDataUrl ? (
                  <div className="p-3 bg-white rounded-xl shadow-lg shadow-black/40">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code PrimeTrack 2FA" 
                      className="w-40 h-40 object-contain" 
                    />
                  </div>
                ) : null}

                <div className="mt-3 text-center">
                  <span className="text-[10px] font-mono text-zinc-400 block">Nome da conta no app:</span>
                  <span className="text-xs font-semibold text-white">
                    PrimeTrack ({currentUser?.email || 'usuario@primetrack.top'})
                  </span>
                </div>
              </div>
            </div>

            {/* Chave Manual com Copiar */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-zinc-400 block">
                Não consegue ler o QR Code? Insira o código manual:
              </span>
              <div className="bg-[#141C2E] border border-[#1E293B] rounded-lg p-2.5 flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-blue-400 select-all tracking-wider font-semibold">
                  {formatSecretKey(twoFactorSetupData?.secret)}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    if (twoFactorSetupData?.secret) {
                      navigator.clipboard.writeText(twoFactorSetupData.secret);
                      setIsCopiedKey(true);
                      setTimeout(() => setIsCopiedKey(false), 2500);
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-zinc-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {isCopiedKey ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Etapa 2: Confirmação do Código */}
            <form onSubmit={handleConfirmActivate2FA} className="space-y-3 pt-1">
              <span className="text-xs font-semibold text-zinc-300 block">
                2. Digite o código de 6 dígitos exibido no app para confirmar:
              </span>

              {twoFactorModalError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{twoFactorModalError}</span>
                </div>
              )}

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={twoFactorVerifyInput}
                  onChange={(e) => setTwoFactorVerifyInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000 000"
                  className="w-full text-center text-xl tracking-[0.35em] font-mono font-bold py-2.5 px-4 rounded-xl bg-[#080D1A] border border-[#1E293B] text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShow2FAActivateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={twoFactorModalLoading || twoFactorVerifyInput.replace(/\D/g, '').length !== 6}
                  className="px-4 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{twoFactorModalLoading ? 'Verificando...' : 'Confirmar e Ativar 2FA'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal de Desativação de 2FA */}
      {show2FADeactivateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0D1526] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4 text-white relative">
            
            {/* Fechar Modal */}
            <button
              type="button"
              onClick={() => setShow2FADeactivateModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Desativar Autenticação (2FA)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Conta PrimeTrack ({currentUser?.email || 'usuario@primetrack.top'})
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Atenção: Ao desativar o 2FA, sua conta não exigirá mais verificação em duas etapas ao fazer login com e-mail e senha.
              </span>
            </div>

            {deactivateError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deactivateError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDeactivate2FA} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                  Digite o código do app ou sua senha para confirmar:
                </label>
                <input
                  type="text"
                  value={deactivateInput}
                  onChange={(e) => setDeactivateInput(e.target.value)}
                  placeholder="Código de 6 dígitos ou senha"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border border-[#1E293B] text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setShow2FADeactivateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deactivateLoading}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {deactivateLoading ? 'Desativando...' : 'Confirmar Desativação'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
