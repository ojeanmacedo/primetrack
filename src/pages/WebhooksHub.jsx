import React, { useState } from 'react';
import { Webhook, Copy, Check, Send, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';

export default function WebhooksHub({ onSimulateWebhook }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [testingKey, setTestingKey] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const baseUrl = window.location.origin;

  const platforms = [
    {
      id: 'kiwify',
      name: 'Kiwify',
      color: 'from-green-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/30',
      tagColor: 'bg-emerald-500/20 text-emerald-300',
      endpoint: `${baseUrl}/api/webhooks/kiwify`,
      instructions: 'Acesse Apps > Webhooks na Kiwify, clique em "Criar Webhook", selecione os eventos de "Compra Aprovada" e "Pix Gerado", e cole a URL abaixo.'
    },
    {
      id: 'hotmart',
      name: 'Hotmart',
      color: 'from-orange-500/20 to-red-500/5',
      borderColor: 'border-orange-500/30',
      tagColor: 'bg-orange-500/20 text-orange-300',
      endpoint: `${baseUrl}/api/webhooks/hotmart`,
      instructions: 'Na Hotmart, vá em Ferramentas > Webhook (API e Notificações), crie uma nova configuração com a versão 2.0.0 e marque "Compra Aprovada".'
    },
    {
      id: 'eduzz',
      name: 'Eduzz',
      color: 'from-yellow-500/20 to-amber-500/5',
      borderColor: 'border-amber-500/30',
      tagColor: 'bg-amber-500/20 text-amber-300',
      endpoint: `${baseUrl}/api/webhooks/eduzz`,
      instructions: 'Na Eduzz / Nutror / MyEduzz, acesse o menu de Integrações > Webhooks > Nova Notificação e insira a URL da PrimeTrack.'
    },
    {
      id: 'cakto',
      name: 'Cakto',
      color: 'from-purple-500/20 to-indigo-500/5',
      borderColor: 'border-purple-500/30',
      tagColor: 'bg-purple-500/20 text-purple-300',
      endpoint: `${baseUrl}/api/webhooks/cakto`,
      instructions: 'No painel da Cakto, vá em Configurações > Webhooks, adicione a URL e selecione os eventos de transação aprovada.'
    },
    {
      id: 'kirvano',
      name: 'Kirvano',
      color: 'from-blue-500/20 to-cyan-500/5',
      borderColor: 'border-blue-500/30',
      tagColor: 'bg-blue-500/20 text-blue-300',
      endpoint: `${baseUrl}/api/webhooks/kirvano`,
      instructions: 'Acesse Integrações > Webhooks na Kirvano, cole a URL e ative o envio em tempo real.'
    },
    {
      id: 'perfectpay',
      name: 'PerfectPay',
      color: 'from-pink-500/20 to-rose-500/5',
      borderColor: 'border-pink-500/30',
      tagColor: 'bg-pink-500/20 text-pink-300',
      endpoint: `${baseUrl}/api/webhooks/perfectpay`,
      instructions: 'Em Ferramentas > Postback na PerfectPay, configure o envio das vendas aprovadas para a URL da PrimeTrack.'
    },
    {
      id: 'braip',
      name: 'Braip',
      color: 'from-red-500/20 to-orange-500/5',
      borderColor: 'border-red-500/30',
      tagColor: 'bg-red-500/20 text-red-300',
      endpoint: `${baseUrl}/api/webhooks/braip`,
      instructions: 'No painel da Braip, vá em Ferramentas > Postback / Webhook, adicione a URL e selecione seus produtos.'
    },
    {
      id: 'generic',
      name: 'Webhook Customizado',
      color: 'from-zinc-500/20 to-zinc-500/5',
      borderColor: 'border-zinc-500/30',
      tagColor: 'bg-zinc-500/20 text-zinc-300',
      endpoint: `${baseUrl}/api/webhooks/custom`,
      instructions: 'Use para Shopify, WooCommerce, Yampi, Cartpanda ou checkout proprietário em JSON.'
    }
  ];

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTest = async (platform) => {
    setTestingKey(platform.id);
    try {
      const res = await fetch(`/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: platform.name,
          amount: 97.00,
          customerName: `Teste ${platform.name}`
        })
      });
      const data = await res.json();
      setTestResult({
        platform: platform.name,
        success: true,
        orderCode: data.order?.orderCode,
        ad: data.order?.attribution?.ad,
        emq: data.emq?.score
      });
      if (onSimulateWebhook) onSimulateWebhook();
    } catch (err) {
      console.error(err);
    } finally {
      setTestingKey(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Webhook className="w-6 h-6 text-brand" />
          <span>Central de Webhooks de Plataformas de Checkout</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Conectores nativos prontos para receber o sinal de compra e disparar imediatamente a atribuição e o CAPI.
        </p>
      </div>

      {/* Test Feedback Toast */}
      {testResult && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-white">
          <div className="flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Webhook de teste de <strong>{testResult.platform}</strong> processado com sucesso! Código: <strong>{testResult.orderCode}</strong>, Anúncio: <strong>{testResult.ad}</strong>, Nota CAPI: <strong>{testResult.emq}</strong>.
            </span>
          </div>
          <button 
            onClick={() => setTestResult(null)}
            className="text-zinc-400 hover:text-white font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid of Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((plat) => {
          const isCopied = copiedKey === plat.id;
          const isTesting = testingKey === plat.id;

          return (
            <div 
              key={plat.id}
              className="p-5 rounded-xl bg-[#141C2E] border border-[#1E293B] shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base font-sans">
                      {plat.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0066FF]/20 text-[#5C9BFF] border border-[#0066FF]/30">
                      Webhook Nativo
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>CAPI Ativo</span>
                  </span>
                </div>

                <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                  {plat.instructions}
                </p>

                {/* Endpoint input */}
                <div className="flex items-center gap-1.5 p-1.5 bg-[#0D1424] border border-[#1E293B] rounded-xl mb-4">
                  <span className="px-2 py-1 bg-[#141C2E] border border-[#1E293B] rounded text-[10px] font-mono text-zinc-400 uppercase font-bold">
                    POST
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={plat.endpoint}
                    className="flex-1 bg-transparent text-xs text-zinc-300 font-mono focus:outline-none truncate"
                  />
                  <button
                    onClick={() => handleCopy(plat.id, plat.endpoint)}
                    className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Copiar URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400">
                  {isCopied ? '✓ Copiado para a área de transferência' : 'Recebe: Pix, Cartão, Boleto'}
                </span>
                <button
                  onClick={() => handleTest(plat)}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3 text-white" />
                  <span>{isTesting ? 'Testando...' : 'Testar Webhook'}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
