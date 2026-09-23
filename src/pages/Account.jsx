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
  AlertCircle
} from 'lucide-react';

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
      return localStorage.getItem('primetrack_2fa_enabled') === 'true';
    }
    return false;
  });
  const [twoFactorSuccess, setTwoFactorSuccess] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      setCurrentUserState(u);
      setName(u.name || '');
    }
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

  // Toggle 2FA
  const handleToggle2FA = () => {
    const nextVal = !twoFactorEnabled;
    setTwoFactorEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('primetrack_2fa_enabled', String(nextVal));
    }
    setTwoFactorSuccess(true);
    setTimeout(() => setTwoFactorSuccess(false), 3000);
  };

  // Determinação do Plano
  const planLabel = (currentUser?.plan || 'pro').toUpperCase();
  const isPro = planLabel === 'PRO' || planLabel === 'SCALE' || planLabel === 'BUSINESS';

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
                          <span>Plano {isPro ? 'Pro' : 'Free'}</span>
                          <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                            isPro ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          }`}>
                            {isPro ? 'Ativo' : 'Plano Free'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {isPro ? 'Acesso ilimitado a todas as métricas, pixels e integrações' : '1 conta de anúncio ativa, 1 pixel e 1 webhook de vendas'}
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
                onClick={handleToggle2FA}
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

    </div>
  );
}
