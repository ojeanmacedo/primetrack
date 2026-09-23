import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertTriangle, Snowflake, Sparkles, CheckCircle2, Loader2, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentUser, setCurrentUser, getTrialStatus } from '../utils/auth';

export default function Plans() {
  const [user, setUser] = useState(getCurrentUser());
  const trialStatus = getTrialStatus(user);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handleProfileSync = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('primetrack_profile_sync', handleProfileSync);

    // Checa retorno do checkout AbacatePay
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const planPaid = params.get('plan') || 'pro';
      setPaymentSuccess(planPaid);

      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.55 },
          zIndex: 9999
        });
      } catch (e) {}

      const curUser = getCurrentUser();
      if (curUser) {
        curUser.plan = planPaid;
        setCurrentUser(curUser);
        setUser(curUser);
        window.dispatchEvent(new Event('primetrack_profile_sync'));

        fetch(`/api/auth/me?userId=${curUser.id}`)
          .then(r => r.json())
          .then(res => {
            if (res.success && res.user) {
              setCurrentUser(res.user);
              setUser(res.user);
              window.dispatchEvent(new Event('primetrack_profile_sync'));
            }
          })
          .catch(() => {});
      }

      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => window.removeEventListener('primetrack_profile_sync', handleProfileSync);
  }, []);

  const handleSubscribe = async (planName) => {
    setErrorMessage(null);
    setLoadingPlan(planName);

    try {
      const res = await fetch('/api/abacatepay/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {})
        },
        body: JSON.stringify({
          plan: planName.toLowerCase(),
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name
        })
      });

      const data = await res.json();
      if (!data?.success || !data?.url) {
        throw new Error(data?.error || 'Não foi possível gerar a cobrança. Tente novamente.');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Erro ao assinar plano:', err);
      setErrorMessage(err.message || 'Erro ao conectar à AbacatePay.');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Planos
        </h1>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Comece pequeno. Escale quando precisar.
        </p>
      </div>

      {paymentSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-3 animate-in fade-in duration-300 shadow-lg">
          <PartyPopper className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            🎉 Parabéns! Pagamento confirmado com sucesso via AbacatePay. O seu <strong>Plano {paymentSuccess.toUpperCase()}</strong> já está 100% ativo!
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-medium text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Warning / Notification Banner dinâmico por ciclo de vida */}
      {trialStatus.isFrozen ? (
        <div className="w-full bg-rose-950/40 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-center shadow-md flex items-center justify-center gap-2">
          <Snowflake className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Sua conta está <strong>congelada</strong> por expiração do período de teste e tolerância. Escolha um dos planos abaixo para desbloquear seu acesso imediatamente.</span>
        </div>
      ) : trialStatus.isGracePeriod ? (
        <div className="w-full bg-[#20180B] border border-[#3E2F13] text-[#E5B54F] px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-center shadow-md flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-[#E5B54F] shrink-0" />
          <span>Seu plano expirou. Restam <strong>{trialStatus.graceDaysLeft} {trialStatus.graceDaysLeft === 1 ? 'dia' : 'dias'}</strong> para renovar antes da pausa dos serviços.</span>
        </div>
      ) : trialStatus.isInTrial ? (
        <div className="w-full bg-[#141C2E] border border-blue-500/25 text-blue-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-center shadow-md flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Você está no <strong>Plano Free</strong>. Restam <strong>{trialStatus.trialDaysLeft} {trialStatus.trialDaysLeft === 1 ? 'dia' : 'dias'}</strong> de acesso gratuito para testar todas as funcionalidades.</span>
        </div>
      ) : (
        <div className="w-full bg-[#141C2E] border border-emerald-500/25 text-emerald-400 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-center shadow-md flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Sua assinatura está ativa ({trialStatus.planLabel}). Aproveite todos os recursos liberados.</span>
        </div>
      )}

      {/* 3 Plans Grid matching Screenshot 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        
        {/* Basic Plan */}
        <div className="p-7 rounded-xl bg-[#141C2E] border border-[#1E293B] flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-xl font-bold text-white font-sans">Basic</h3>
            
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-white font-sans tracking-tight">
                R$ 47
              </span>
              <span className="text-xs text-zinc-400 font-mono">/mês</span>
            </div>
            
            <p className="text-[10px] font-mono text-[#5C9BFF] font-bold uppercase tracking-wider mt-1 mb-6">
              PARA COMEÇAR COM O PÉ DIREITO
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300 font-sans">
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Vendas ilimitadas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>2 contas de anúncios</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>2 pixels de rastreio</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>1 dashboard</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>1 webhook</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Envio automático CAPI</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Notificações de vendas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Alerta de saldo baixo</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Alerta de cobrança Meta</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>2 regras de automação</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Suporte via WhatsApp</span>
              </li>
              <li className="flex items-center gap-2 text-zinc-600 line-through">
                <span className="text-zinc-600 font-bold font-mono">×</span>
                <span>Duplicar conjunto automático</span>
              </li>
            </ul>
          </div>

          <button 
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe('Basic')}
            className="mt-8 w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-between px-5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <span>{loadingPlan === 'Basic' ? 'Gerando Pix...' : (user?.plan === 'basic' ? 'Plano Atual' : 'Assinar Basic')}</span>
            {loadingPlan === 'Basic' ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>→</span>}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="p-7 rounded-xl bg-[#141C2E] border border-[#1E293B] flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-xl font-bold text-white font-sans">Pro</h3>
            
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-white font-sans tracking-tight">
                R$ 97
              </span>
              <span className="text-xs text-zinc-400 font-mono">/mês</span>
            </div>
            
            <p className="text-[10px] font-mono text-[#5C9BFF] font-bold uppercase tracking-wider mt-1 mb-6">
              A ESCOLHA DE QUEM ESTÁ ESCALANDO
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300 font-sans">
              <li className="flex items-center gap-2 font-semibold text-white">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Tudo do Basic +</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>5 contas de anúncios</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>5 pixels de rastreio</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>5 dashboards</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>5 webhooks</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>7 regras de automação</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Notificações de vendas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Alerta de saldo baixo</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Alerta de cobrança Meta</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Suporte via WhatsApp</span>
              </li>
              <li className="flex items-center gap-2 text-zinc-600 line-through">
                <span className="text-zinc-600 font-bold font-mono">×</span>
                <span>Duplicar conjunto automático</span>
              </li>
            </ul>
          </div>

          <button 
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe('Pro')}
            className="mt-8 w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-between px-5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <span>{loadingPlan === 'Pro' ? 'Gerando Pix...' : (user?.plan === 'pro' ? 'Plano Atual' : 'Assinar Pro')}</span>
            {loadingPlan === 'Pro' ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>→</span>}
          </button>
        </div>

        {/* Scale Plan */}
        <div className="p-7 rounded-xl bg-[#141C2E] border border-[#1E293B] flex flex-col justify-between shadow-md">
          <div>
            <h3 className="text-xl font-bold text-white font-sans">Scale</h3>
            
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-extrabold text-white font-sans tracking-tight">
                R$ 247
              </span>
              <span className="text-xs text-zinc-400 font-mono">/mês</span>
            </div>
            
            <p className="text-[10px] font-mono text-[#5C9BFF] font-bold uppercase tracking-wider mt-1 mb-6">
              PARA OPERAÇÕES SEM LIMITES
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300 font-sans">
              <li className="flex items-center gap-2 font-semibold text-white">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Tudo do Pro +</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Contas ilimitadas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Pixels ilimitados</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Dashboards ilimitados</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Webhooks ilimitados</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>15 regras de automação</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Duplicar conjunto automático</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Notificações de vendas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Alerta de saldo baixo</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Alerta de cobrança Meta</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#5C9BFF] font-bold font-mono">+</span>
                <span>Suporte via WhatsApp</span>
              </li>
            </ul>
          </div>

          <button 
            disabled={loadingPlan !== null}
            onClick={() => handleSubscribe('Scale')}
            className="mt-8 w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-between px-5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
          >
            <span>{loadingPlan === 'Scale' ? 'Gerando Pix...' : (user?.plan === 'scale' ? 'Plano Atual' : 'Assinar Scale')}</span>
            {loadingPlan === 'Scale' ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>→</span>}
          </button>
        </div>

      </div>

      {/* Footer Text */}
      <div className="text-center text-xs text-zinc-500 font-sans pt-4">
        Sem fidelidade &nbsp;·&nbsp; Sem taxa por venda &nbsp;·&nbsp; Cancele quando quiser
      </div>

    </div>
  );
}
