import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Snowflake, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  PartyPopper,
  Check,
  X,
  CreditCard,
  Lock,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentUser, setCurrentUser, getTrialStatus } from '../utils/auth';

const PLANS_DATA = [
  {
    id: 'basic',
    name: 'Basic',
    title: 'Plano Basic',
    price: 'R$ 47',
    formattedPrice: 'R$ 47,00',
    rawPrice: 47,
    tagline: 'PARA COMEÇAR COM O PÉ DIREITO',
    features: [
      { text: 'Vendas ilimitadas', included: true },
      { text: '2 contas de anúncios', included: true },
      { text: '2 pixels de rastreio', included: true },
      { text: '1 dashboard', included: true },
      { text: '1 webhook', included: true },
      { text: 'Envio automático CAPI', included: true },
      { text: 'Notificações de vendas', included: true },
      { text: 'Alerta de saldo baixo', included: true },
      { text: 'Alerta de cobrança Meta', included: true },
      { text: '2 regras de automação', included: true },
      { text: 'Suporte via WhatsApp', included: true },
      { text: 'Duplicar conjunto automático', included: false }
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    title: 'Plano Pro',
    price: 'R$ 97',
    formattedPrice: 'R$ 97,00',
    rawPrice: 97,
    tagline: 'A ESCOLHA DE QUEM ESTÁ ESCALANDO',
    popular: true,
    features: [
      { text: 'Tudo do Basic +', included: true, highlight: true },
      { text: '5 contas de anúncios', included: true },
      { text: '5 pixels de rastreio', included: true },
      { text: '5 dashboards', included: true },
      { text: '5 webhooks', included: true },
      { text: '7 regras de automação', included: true },
      { text: 'Notificações de vendas', included: true },
      { text: 'Alerta de saldo baixo', included: true },
      { text: 'Alerta de cobrança Meta', included: true },
      { text: 'Suporte via WhatsApp', included: true },
      { text: 'Duplicar conjunto automático', included: false }
    ]
  },
  {
    id: 'scale',
    name: 'Scale',
    title: 'Plano Scale',
    price: 'R$ 247',
    formattedPrice: 'R$ 247,00',
    rawPrice: 247,
    tagline: 'PARA OPERAÇÕES SEM LIMITES',
    features: [
      { text: 'Tudo do Pro +', included: true, highlight: true },
      { text: 'Contas ilimitadas', included: true },
      { text: 'Pixels ilimitados', included: true },
      { text: 'Dashboards ilimitados', included: true },
      { text: 'Webhooks ilimitados', included: true },
      { text: '15 regras de automação', included: true },
      { text: 'Duplicar conjunto automático', included: true },
      { text: 'Notificações de vendas', included: true },
      { text: 'Alerta de saldo baixo', included: true },
      { text: 'Alerta de cobrança Meta', included: true },
      { text: 'Suporte via WhatsApp', included: true }
    ]
  }
];

export default function Plans() {
  const [user, setUser] = useState(getCurrentUser());
  const isOwner = user?.email?.toLowerCase() === 'jeeanmacedo@gmail.com' || user?.email?.toLowerCase() === 'jeanmacedo@gmail.com';
  const trialStatus = getTrialStatus(user);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Estado do Modal de Pagamento com Cartão
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form Fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [holderName, setHolderName] = useState(user?.name || '');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [isConfirmedHolder, setIsConfirmedHolder] = useState(true);

  useEffect(() => {
    const handleProfileSync = () => {
      const cur = getCurrentUser();
      setUser(cur);
      if (cur?.name && !holderName) {
        setHolderName(cur.name);
      }
    };
    window.addEventListener('primetrack_profile_sync', handleProfileSync);

    // Checa retorno eventual de checkout
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

  // Formatação de máscaras
  const handleCardNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    const masked = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(masked);
  };

  const handleExpiryChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handleCvvChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(digits);
  };

  const handleCpfCnpjChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      let res = digits;
      if (digits.length > 9) res = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      else if (digits.length > 6) res = digits.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      else if (digits.length > 3) res = digits.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      setCpfCnpj(res);
    } else {
      // CNPJ: 00.000.000/0001-00
      let res = digits;
      if (digits.length > 12) res = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
      else if (digits.length > 8) res = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
      else if (digits.length > 5) res = digits.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
      else if (digits.length > 2) res = digits.replace(/(\d{2})(\d{1,3})/, '$1.$2');
      setCpfCnpj(res);
    }
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      // (00) 0000-0000
      let res = digits;
      if (digits.length > 6) res = digits.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
      else if (digits.length > 2) res = digits.replace(/(\d{2})(\d{1,4})/, '($1) $2');
      setPhone(res);
    } else {
      // (00) 00000-0000
      let res = digits.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
      setPhone(res);
    }
  };

  // Abre o modal de cartão com o plano selecionado
  const handleOpenPlanModal = (plan) => {
    setSelectedPlanModal(plan);
    setModalError(null);
    if (user?.name && !holderName) {
      setHolderName(user.name);
    }
  };

  // Data da próxima cobrança (exatamente 1 mês a partir de hoje)
  const getNextBillingDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const pad = n => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Submissão do Pagamento da Assinatura
  const handleConfirmSubscription = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Se for o dono da PrimeTrack (Jean Macedo), nunca cobra nada
    if (isOwner) {
      setIsSubmitting(true);
      const newPlan = selectedPlanModal?.id || 'scale';
      const curUser = getCurrentUser() || user;
      curUser.plan = newPlan;
      curUser.role = 'admin';
      setCurrentUser(curUser);
      setUser(curUser);
      setPaymentSuccess(newPlan);
      try {
        confetti({
          particleCount: 160,
          spread: 85,
          origin: { y: 0.55 },
          zIndex: 99999
        });
      } catch (e) {}
      window.dispatchEvent(new Event('primetrack_profile_sync'));
      setSelectedPlanModal(null);
      setIsSubmitting(false);
      return;
    }

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 13) {
      setModalError('Por favor, informe um número de cartão de crédito válido.');
      return;
    }
    if (!cardName.trim()) {
      setModalError('Informe o nome impresso no cartão.');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setModalError('Informe a data de vencimento no formato MM/AA.');
      return;
    }
    const [expMonth, expYear] = cardExpiry.split('/').map(n => parseInt(n, 10));
    if (isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
      setModalError('Mês de vencimento inválido.');
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      setModalError('Informe o código de segurança (CVC de 3 ou 4 dígitos).');
      return;
    }
    if (!holderName.trim()) {
      setModalError('Informe o nome completo do titular.');
      return;
    }
    const cleanCpf = cpfCnpj.replace(/\D/g, '');
    if (cleanCpf.length < 11) {
      setModalError('Informe um CPF ou CNPJ válido.');
      return;
    }
    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 10) {
      setModalError('Informe um telefone celular válido com DDD.');
      return;
    }
    if (!isConfirmedHolder) {
      setModalError('Você precisa confirmar que o responsável pela compra é o titular do cartão.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/abacatepay/subscribe-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {})
        },
        body: JSON.stringify({
          plan: selectedPlanModal.id,
          userId: user?.id,
          userEmail: user?.email,
          userName: holderName || user?.name,
          cardData: {
            number: cleanCard,
            holderName: cardName.trim().toUpperCase(),
            expiry: cardExpiry,
            cvv: cardCvv,
            cpfCnpj: cleanCpf,
            phone: cleanPhoneDigits
          }
        })
      });

      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Não foi possível autorizar o cartão. Verifique os dados e tente novamente.');
      }

      // Sucesso! Atualiza plano local e fecha modal
      const newPlan = selectedPlanModal.id;
      setPaymentSuccess(newPlan);

      try {
        confetti({
          particleCount: 160,
          spread: 85,
          origin: { y: 0.55 },
          zIndex: 99999
        });
      } catch (e) {}

      const curUser = getCurrentUser();
      if (curUser) {
        curUser.plan = newPlan;
        setCurrentUser(curUser);
        setUser(curUser);
        window.dispatchEvent(new Event('primetrack_profile_sync'));

        fetch(`/api/auth/me?userId=${curUser.id}`)
          .then(r => r.json())
          .then(apiRes => {
            if (apiRes.success && apiRes.user) {
              setCurrentUser(apiRes.user);
              setUser(apiRes.user);
              window.dispatchEvent(new Event('primetrack_profile_sync'));
            }
          })
          .catch(() => {});
      }

      setSelectedPlanModal(null);
    } catch (err) {
      console.error('Erro ao assinar com cartão:', err);
      setModalError(err.message || 'Erro ao processar assinatura via cartão de crédito.');
    } finally {
      setIsSubmitting(false);
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
            🎉 Parabéns! Assinatura confirmada com sucesso via Cartão de Crédito. O seu <strong>Plano {paymentSuccess.toUpperCase()}</strong> já está 100% ativo!
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

      {/* 3 Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {PLANS_DATA.map((plan) => {
          const isCurrentPlan = isOwner ? plan.id === 'scale' : (user?.plan || '').toLowerCase() === plan.id;

          return (
            <div 
              key={plan.id}
              className={`p-7 rounded-xl bg-[#141C2E] border flex flex-col justify-between shadow-md transition-all ${
                plan.popular ? 'border-[#5C9BFF]/60 shadow-[#5C9BFF]/10' : 'border-[#1E293B]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white font-sans">{plan.name}</h3>
                  {plan.popular && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#5C9BFF]/20 text-[#5C9BFF] border border-[#5C9BFF]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                      Mais Popular
                    </span>
                  )}
                </div>
                
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white font-sans tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">/mês</span>
                </div>
                
                <p className="text-[10px] font-mono text-[#5C9BFF] font-bold uppercase tracking-wider mt-1 mb-6">
                  {plan.tagline}
                </p>

                <ul className="space-y-2.5 text-xs font-sans">
                  {plan.features.map((feat, idx) => (
                    <li 
                      key={idx} 
                      className={`flex items-center gap-2 ${
                        !feat.included ? 'text-zinc-600 line-through' : (feat.highlight ? 'font-semibold text-white' : 'text-zinc-300')
                      }`}
                    >
                      <span className={`font-bold font-mono ${feat.included ? 'text-[#5C9BFF]' : 'text-zinc-600'}`}>
                        {feat.included ? '+' : '×'}
                      </span>
                      <span>{feat.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => handleOpenPlanModal(plan)}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-between px-5 shadow-md transition-all cursor-pointer ${
                    isCurrentPlan 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-none'
                      : 'bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-blue-600/25'
                  }`}
                >
                  <span>{isCurrentPlan ? 'Plano Atual (Renovar)' : `Assinar ${plan.name}`}</span>
                  <span>→</span>
                </button>

                <p className="text-[10.5px] text-zinc-400 text-center mt-2.5 flex items-center justify-center gap-1 font-sans">
                  <span>💳 Cartão de Crédito</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Text */}
      <div className="text-center text-xs text-zinc-500 font-sans pt-4">
        Sem fidelidade &nbsp;·&nbsp; Sem taxa por venda &nbsp;·&nbsp; Cancele quando quiser
      </div>

      {/* ========================================================= */}
      {/* MODAL CHECKOUT CARTÃO DE CRÉDITO (REPLICANDO SCREENSHOTS) */}
      {/* ========================================================= */}
      {selectedPlanModal && (
        <div 
          onClick={() => setSelectedPlanModal(null)}
          className="fixed inset-0 z-50 bg-[#060B14]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative w-full max-w-[940px] bg-white text-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto border border-zinc-200/90 max-h-[92vh]"
          >
            {/* Botão Fechar X no topo direito */}
            <button 
              onClick={() => setSelectedPlanModal(null)}
              className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-zinc-700 bg-white/90 hover:bg-zinc-100 p-1.5 rounded-full transition-all z-20 cursor-pointer shadow-sm border border-zinc-200/50"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* COLUNA ESQUERDA: FORMULÁRIO DE PAGAMENTO */}
            <div className="w-full md:w-[55%] p-6 sm:p-8 overflow-y-auto max-h-[92vh] flex flex-col justify-between space-y-5 bg-white">
              
              <div>
                {/* Título do Plano */}
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight font-sans">
                  Plano {selectedPlanModal.name}
                </h2>

                {/* Badges de Garantia */}
                <div className="space-y-1 mt-2.5 mb-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                    <span>Assinatura mensal, sem fidelidade</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                    <span>Cancele quando quiser</span>
                  </div>
                </div>

                {modalError && (
                  <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Campos do Cartão */}
                <form onSubmit={handleConfirmSubscription} className="space-y-3.5">
                  
                  {/* Número do Cartão */}
                  <div>
                    <label className="block text-[11.5px] font-semibold text-zinc-700 mb-1">
                      Número do cartão
                    </label>
                    <div className="relative">
                      <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="Número do cartão"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full border border-zinc-250 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white shadow-xs font-mono"
                        required
                      />
                      <CreditCard className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Nome no Cartão */}
                  <div>
                    <label className="block text-[11.5px] font-semibold text-zinc-700 mb-1">
                      Nome no cartão
                    </label>
                    <input 
                      type="text"
                      placeholder="Nome no cartão"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      className="w-full border border-zinc-250 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white shadow-xs uppercase"
                      required
                    />
                  </div>

                  {/* Vencimento e CVC */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] font-semibold text-zinc-700 mb-1">
                        Vencimento
                      </label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="w-full border border-zinc-250 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white shadow-xs font-mono text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-semibold text-zinc-700 mb-1">
                        Código de segurança
                      </label>
                      <div className="relative">
                        <input 
                          type="password"
                          inputMode="numeric"
                          placeholder="CVC"
                          maxLength={4}
                          value={cardCvv}
                          onChange={handleCvvChange}
                          className="w-full border border-zinc-250 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white shadow-xs font-mono text-center tracking-widest"
                          required
                        />
                        <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Divisória Dados do Titular */}
                  <div className="pt-3 border-t border-zinc-150">
                    <h3 className="text-xs font-bold text-zinc-900 mb-3 tracking-wide">
                      Dados do titular do cartão
                    </h3>

                    {/* Nome Completo */}
                    <div className="mb-3">
                      <label className="block text-[11.5px] font-semibold text-zinc-700 mb-1">
                        Nome completo do titular
                      </label>
                      <input 
                        type="text"
                        placeholder="Nome completo do titular"
                        value={holderName}
                        onChange={(e) => setHolderName(e.target.value)}
                        className="w-full border border-zinc-250 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white shadow-xs"
                        required
                      />
                    </div>

                    {/* CPF/CNPJ */}
                    <div className="mb-3">
                      <label className="block text-[11.5px] font-semibold text-zinc-700 mb-1">
                        CPF/CNPJ
                      </label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={cpfCnpj}
                        onChange={handleCpfCnpjChange}
                        className="w-full border border-zinc-250 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white shadow-xs font-mono"
                        required
                      />
                    </div>

                    {/* Telefone Celular */}
                    <div className="mb-3">
                      <label className="block text-[11.5px] font-semibold text-zinc-700 mb-1">
                        Telefone Celular
                      </label>
                      <input 
                        type="text"
                        inputMode="tel"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="w-full border border-zinc-250 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all bg-white shadow-xs font-mono"
                        required
                      />
                    </div>

                    {/* Termos de Serviço */}
                    <p className="text-[10.5px] text-zinc-400 leading-relaxed mb-3">
                      Ao continuar você aceita nossos termos e condições.
                    </p>

                    {/* Checkboxes */}
                    <div className="space-y-2 mb-4">
                      <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={isConfirmedHolder}
                          onChange={(e) => setIsConfirmedHolder(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 border-zinc-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Confirmo que o responsável pela compra é o titular do cartão</span>
                      </label>
                    </div>

                  </div>

                  {/* Resumo do Pedido */}
                  <div className="pt-3 border-t border-zinc-150 space-y-2">
                    <h4 className="text-xs font-bold text-zinc-900">Resumo do pedido</h4>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Valor a pagar</span>
                      <span className="font-extrabold text-zinc-900 text-sm">
                        {selectedPlanModal.formattedPrice}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Data da próxima cobrança</span>
                      <span className="font-semibold text-zinc-700">
                        {getNextBillingDate()}
                      </span>
                    </div>
                  </div>

                  {/* Botão de Confirmação */}
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-4 py-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando assinatura...</span>
                      </>
                    ) : (
                      <span>Confirmar assinatura</span>
                    )}
                  </button>

                </form>
              </div>

            </div>

            {/* COLUNA DIREITA: BRANDING & ILUSTRAÇÃO (REPLICANDO SCREENSHOT) */}
            <div className="w-full md:w-[45%] bg-[#F0F4F8] p-6 sm:p-8 flex flex-col items-center justify-between border-l border-zinc-200/60 relative text-center">
              
              {/* Header Logo + Slogan */}
              <div className="w-full flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <img 
                    src="/images/logo-primetrack.png?v=5" 
                    alt="PrimeTrack" 
                    className="w-8 h-8 object-contain shrink-0" 
                  />
                  <span className="text-xl font-extrabold text-[#0B1424] tracking-tight">
                    PrimeTrack
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-zinc-800 tracking-tight">
                  Não tenha mais medo de escalar!
                </h3>
              </div>

              {/* Imagem Ilustração de Alta Resolução */}
              <div className="my-auto py-4 w-full flex items-center justify-center">
                <img 
                  src="/images/checkout_scaling.jpg" 
                  alt="Não tenha mais medo de escalar" 
                  className="max-h-[320px] w-auto max-w-full object-contain rounded-xl shadow-xs" 
                />
              </div>

              {/* Selos de Confiança no Rodapé */}
              <div className="w-full pt-3 border-t border-zinc-200/80 flex items-center justify-center text-[11px] text-zinc-500 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ambiente Seguro</span>
                </span>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
