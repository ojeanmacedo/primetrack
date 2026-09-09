import React, { useState, useEffect } from 'react';
import { Bell, Check, Smartphone, AlertTriangle } from 'lucide-react';
import { subscribeUserToPush } from '../utils/pushNotifications';

export default function Notifications() {
  const [vendasAprovadas, setVendasAprovadas] = useState(true);
  const [vendasPendentes, setVendasPendentes] = useState(true);
  const [vendasReembolsadas, setVendasReembolsadas] = useState(false);
  const [ocultarProduto, setOcultarProduto] = useState(true);
  const [mostrarCampanha, setMostrarCampanha] = useState(true);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);
  const [mostrarBruto, setMostrarBruto] = useState(false);

  const [testSent, setTestSent] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushSubscribed(true);
    }
  }, []);

  const handleSubscribePush = async () => {
    setPushLoading(true);
    setPushError(null);
    try {
      await subscribeUserToPush();
      setPushSubscribed(true);
      setTestMsg('✅ iPhone conectado com sucesso! Agora você receberá notificações mesmo com a tela bloqueada.');
      setTestSent(true);
      setTimeout(() => setTestSent(false), 5000);
    } catch (err) {
      setPushError(err.message || 'Falha ao ativar notificações push');
    } finally {
      setPushLoading(false);
    }
  };

  const handleTest = async (type = 'approved') => {
    setTestMsg(type === 'pending' ? 'Notificação de Venda Pendente enviada para todos os aparelhos!' : 'Notificação de Venda Aprovada enviada para todos os aparelhos!');
    setTestSent(true);

    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: 'R$ 147,00',
          productName: 'Mentoria PrimeTrack',
          campaign: '[ESCALA] Campanha Teste'
        })
      });
      const data = await res.json();
      if (data?.result?.sent > 0) {
        setTestMsg(`🎉 Notificação entregue para ${data.result.sent} aparelho(s)!`);
      } else if (data?.result?.total === 0) {
        setTestMsg('Nenhum aparelho conectado. Abra o app no iPhone e clique no botão azul "Ativar no iPhone / Safari".');
      }
    } catch (e) {
      console.warn('Erro ao disparar teste push:', e);
    }

    setTimeout(() => setTestSent(false), 3500);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Notificações
          </h1>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Configure quais notificações e alertas deseja receber no seu iPhone e navegador
          </p>
        </div>

        {/* Botão de Ativação do Web Push iOS */}
        <div>
          <button
            onClick={handleSubscribePush}
            disabled={pushLoading}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-sans flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer ${
              pushSubscribed
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{pushLoading ? 'Conectando...' : pushSubscribed ? '✅ Sincronizar com este Aparelho' : 'Ativar no iPhone / Safari'}</span>
          </button>
        </div>
      </div>

      {testSent && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{testMsg}</span>
        </div>
      )}

      {pushError && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{pushError} (No iPhone, adicione primeiro o site à Tela de Início via Safari)</span>
        </div>
      )}

      {/* Top 2 Cards: Venda + Relatório */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Notificações de Venda */}
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="font-bold text-white text-sm">
              Notificações de Venda
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Seja notificado no app sempre que for realizada uma nova venda:
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Item 1 */}
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Vendas aprovadas</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleTest('approved')}
                  className="px-2.5 py-1 rounded-lg bg-[#070D1A] border border-white/10 hover:border-brand text-zinc-300 text-[11px] flex items-center gap-1.5"
                >
                  <Bell className="w-3 h-3 text-amber-400" />
                  <span>Testar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVendasAprovadas(!vendasAprovadas)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    vendasAprovadas ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    vendasAprovadas ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Vendas pendentes</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleTest('pending')}
                  className="px-2.5 py-1 rounded-lg bg-[#070D1A] border border-white/10 hover:border-brand text-zinc-300 text-[11px] flex items-center gap-1.5"
                >
                  <Bell className="w-3 h-3 text-amber-400" />
                  <span>Testar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVendasPendentes(!vendasPendentes)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    vendasPendentes ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    vendasPendentes ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Vendas reembolsadas</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleTest}
                  className="px-2.5 py-1 rounded-lg bg-[#070D1A] border border-white/10 hover:border-brand text-zinc-300 text-[11px] flex items-center gap-1.5"
                >
                  <Bell className="w-3 h-3 text-amber-400" />
                  <span>Testar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVendasReembolsadas(!vendasReembolsadas)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    vendasReembolsadas ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    vendasReembolsadas ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#13233E] space-y-3">
              {/* Ocultar nome */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium block">Ocultar nome do produto</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ex: "Venda Aprovada! Valor: R$ 14,00"</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOcultarProduto(!ocultarProduto)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    ocultarProduto ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    ocultarProduto ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Mostrar campanha */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium block">Mostrar nome da campanha</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Ex: "Venda Aprovada! Valor: R$ 14,00 — Campanha: [ESCALA] BF Criativo 03"</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarCampanha(!mostrarCampanha)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    mostrarCampanha ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    mostrarCampanha ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Mostrar nome do dashboard */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium block">Mostrar nome do dashboard no título</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Essencial pra quem roda ofertas simultâneas</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarDashboard(!mostrarDashboard)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    mostrarDashboard ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    mostrarDashboard ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Mostrar valor bruto */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium block">Mostrar valor bruto (sem descontar taxas)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Por padrão a notificação mostra o valor líquido</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarBruto(!mostrarBruto)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    mostrarBruto ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    mostrarBruto ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Notificações de Relatório */}
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="font-bold text-white text-sm">
              Notificações de Relatório
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure as notificações de relatório que quer visualizar:
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="text-[11px] font-sans text-zinc-400 font-bold uppercase">
              Horários
            </div>

            {['08:00', '12:00', '18:00', '23:00'].map(hour => (
              <div key={hour} className="flex items-center justify-between pb-3 border-b border-[#13233E]/50">
                <span className="text-zinc-300">Notificação das {hour}</span>
                <div className="w-9 h-5 flex items-center rounded-full p-0.5 bg-zinc-800">
                  <div className="bg-zinc-500 w-4 h-4 rounded-full shadow-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Alertas de Conta */}
      <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-5">
        <div>
          <h3 className="font-bold text-white text-sm">
            Alertas de Conta
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Configure um valor de alerta por conta. <strong>Pré-pago:</strong> avisa quando o saldo ficar abaixo do valor. <strong>Cartão (pós-pago):</strong> avisa quando faltar pouco para a Meta cobrar no cartão.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* CA01 */}
          <div className="p-4 rounded-xl bg-[#070D1A] border border-[#13233E] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-xs">CA01</div>
                <div className="text-[10px] font-mono text-zinc-500">1892117896682979</div>
              </div>
              <div className="w-9 h-5 flex items-center rounded-full p-0.5 bg-[#2B66E3]">
                <div className="bg-white w-4 h-4 rounded-full shadow-md translate-x-4" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">Alertar quando saldo &lt;=</label>
              <input 
                type="text" 
                defaultValue="R$ 0,00"
                className="w-full px-3 py-1.5 bg-[#03060D] border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-brand"
              />
            </div>

            <button 
              onClick={handleTest}
              className="w-full py-1.5 rounded-lg bg-[#0A1426] border border-white/10 hover:border-brand text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Testar push</span>
            </button>
          </div>

          {/* CA02 JEFFREY */}
          <div className="p-4 rounded-xl bg-[#070D1A] border border-[#13233E] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-xs">CA02 JEFFREY</div>
                <div className="text-[10px] font-mono text-zinc-500">1101817232408751</div>
                <div className="text-[11px] font-mono text-emerald-400 font-bold">Saldo R$ 0,00</div>
              </div>
              <div className="w-9 h-5 flex items-center rounded-full p-0.5 bg-[#2B66E3]">
                <div className="bg-white w-4 h-4 rounded-full shadow-md translate-x-4" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase">Alertar quando saldo &lt;=</label>
              <input 
                type="text" 
                defaultValue="R$ 0,00"
                className="w-full px-3 py-1.5 bg-[#03060D] border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-brand"
              />
            </div>

            <button 
              onClick={handleTest}
              className="w-full py-1.5 rounded-lg bg-[#0A1426] border border-white/10 hover:border-brand text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Testar push</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
