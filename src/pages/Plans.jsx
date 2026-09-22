import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Plans() {
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

      {/* Warning / Notification Banner matching Screenshot 1 */}
      <div className="w-full bg-[#20180B] border border-[#3E2F13] text-[#E5B54F] px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-center shadow-md">
        <span>Seu plano expirou. Restam <strong>2 dias</strong> para renovar antes da pausa dos serviços.</span>
      </div>

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

          <button className="mt-8 w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center justify-between px-5 shadow-md shadow-blue-600/25 transition-all cursor-pointer">
            <span>Assinar Basic</span>
            <span>→</span>
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

          <button className="mt-8 w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center justify-between px-5 shadow-md shadow-blue-600/25 transition-all cursor-pointer">
            <span>Assinar Pro</span>
            <span>→</span>
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

          <button className="mt-8 w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center justify-between px-5 shadow-md shadow-blue-600/25 transition-all cursor-pointer">
            <span>Assinar Scale</span>
            <span>→</span>
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
