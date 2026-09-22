import React, { useState } from 'react';
import { 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  DollarSign, 
  Radio, 
  Webhook, 
  Layers,
  Flame,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SimulatorLab({ onSimulationComplete }) {
  const [customerName, setCustomerName] = useState('Juliana Ferreira Mendes');
  const [amount, setAmount] = useState('97.00');
  const [gateway, setGateway] = useState('Kiwify');
  const [adCreative, setAdCreative] = useState('vsl_gancho_dermatologista_v1');
  const [scenario, setScenario] = useState('cross_session_bio'); // 'direct' or 'cross_session_bio'
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationResult, setSimulationResult] = useState(null);

  const steps = [
    { title: 'Clique no Facebook Ad', desc: 'Visitante clica no criativo no Feed/Stories com UTMs e fbclid.' },
    { title: 'Pixel Server-Side Ativado', desc: 'Captura cookies _fbp, _fbc, IP e salva histórico no navegador.' },
    { title: scenario === 'cross_session_bio' ? 'Saída e Retorno pela Bio' : 'Redirecionamento ao Checkout', desc: scenario === 'cross_session_bio' ? 'Lead sai da página e compra 3 dias depois pelo link da bio do Instagram!' : 'Injeta SessionID e UTMs no botão de checkout.' },
    { title: 'Webhook Recebido do Gateway', desc: `Webhook de compra aprovada recebido da plataforma ${gateway}.` },
    { title: 'Atribuição Inteligente & CAPI', desc: 'Venda vinculada ao criativo original e enviada à Meta com Nota 9.3+' }
  ];

  const runSimulation = async () => {
    setIsRunning(true);
    setCurrentStep(1);
    setSimulationResult(null);

    // Animação passo a passo
    await new Promise(r => setTimeout(r, 600));
    setCurrentStep(2);

    await new Promise(r => setTimeout(r, 650));
    setCurrentStep(3);

    await new Promise(r => setTimeout(r, 700));
    setCurrentStep(4);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          amount: Number(amount) || 97.00,
          gateway,
          simulatedAd: adCreative
        })
      });

      const data = await res.json();
      setCurrentStep(5);
      setSimulationResult(data);

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onSimulationComplete) onSimulationComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <FlaskConical className="w-6 h-6 text-brand" />
          <span>Simulador & Laboratório de Testes em Tempo Real</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Teste o fluxo completo: clique no anúncio → visita com UTMs → checkout → webhook → Meta CAPI e atualização do Dashboard.
        </p>
      </div>

      {/* Simulator Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Inputs */}
        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#0066FF]" />
            <span>Configurar Cenário de Teste</span>
          </h3>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
              Tipo de Conversão
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScenario('cross_session_bio')}
                className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                  scenario === 'cross_session_bio'
                    ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF] font-bold shadow-sm'
                    : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="font-bold">Salvo da Bio 🎯</div>
                <div className="text-[10px] text-zinc-400 font-normal">Cross-Session 30D</div>
              </button>

              <button
                type="button"
                onClick={() => setScenario('direct')}
                className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                  scenario === 'direct'
                    ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF] font-bold shadow-sm'
                    : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-white'
                }`}
              >
                <div className="font-bold">Clique Direto ⚡</div>
                <div className="text-[10px] text-zinc-400 font-normal">Sessão Imediata</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
              Nome do Comprador
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0D1424] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-[#0066FF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D1424] border border-[#1E293B] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                Gateway
              </label>
              <select
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D1424] border border-[#1E293B] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#0066FF]"
              >
                <option value="Kiwify">Kiwify</option>
                <option value="Hotmart">Hotmart</option>
                <option value="Eduzz">Eduzz</option>
                <option value="Cakto">Cakto</option>
                <option value="Kirvano">Kirvano</option>
                <option value="PerfectPay">PerfectPay</option>
                <option value="Braip">Braip</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
              Criativo de Origem
            </label>
            <select
              value={adCreative}
              onChange={(e) => setAdCreative(e.target.value)}
              className="w-full px-3 py-2 bg-[#0D1424] border border-[#1E293B] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#0066FF]"
            >
              <option value="vsl_gancho_dermatologista_v1">AD 01 - Gancho Dermato Revela</option>
              <option value="ugc_depoimento_clara_v3">AD 02 - UGC Antes & Depois Clara</option>
              <option value="comparativo_farmacia_vs_formula">AD 03 - Farmácia vs Fórmula</option>
            </select>
          </div>

          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="w-full py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Processando Simulação...' : 'Executar Simulação ao Vivo'}</span>
          </button>
        </div>

        {/* Live Pipeline Visualizer */}
        <div className="lg:col-span-2 bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-[#0066FF]" />
              <span>Pipeline de Rastreamento em Ação</span>
            </h3>

            {/* Stepper list */}
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isPassed = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;

                return (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                      isCurrent
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-white shadow-md'
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-200'
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-500'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                      isPassed
                        ? 'bg-emerald-500 text-black'
                        : isCurrent
                        ? 'bg-[#0066FF] text-white animate-pulse'
                        : 'bg-white/10 text-zinc-500'
                    }`}>
                      {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
                    </div>

                    <div className="flex-1">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{step.title}</span>
                        {isPassed && <span className="text-[10px] font-mono text-emerald-400 font-bold">✓ OK</span>}
                        {isCurrent && <span className="text-[10px] font-mono text-[#5C9BFF] animate-pulse">Processando...</span>}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success Box */}
          {simulationResult && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-blue-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Venda Aprovada & CAPI Enviado com Sucesso!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-zinc-300 mt-2">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Código:</span>
                  <span className="font-bold text-white">{simulationResult.order?.orderCode}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Atribuído a:</span>
                  <span className="font-bold text-[#5C9BFF] truncate block">{simulationResult.order?.attribution?.ad}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Tipo de Match:</span>
                  <span className="font-bold text-amber-300">{simulationResult.order?.attribution?.matchType}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Nota Meta CAPI:</span>
                  <span className="font-extrabold text-emerald-400">★ {simulationResult.emq?.score || '9.4'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
