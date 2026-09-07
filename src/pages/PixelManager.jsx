import React, { useState } from 'react';
import { 
  Radio, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Code2, 
  CheckCircle2, 
  ExternalLink,
  Cpu,
  Key,
  Database,
  Save
} from 'lucide-react';

export default function PixelManager({ pixelHealth, settings, onSaveSettings }) {
  const [copied, setCopied] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState(settings?.metaPixelId || 'pt_px_804f84899d2a');
  const [metaAccessToken, setMetaAccessToken] = useState(settings?.metaAccessToken || 'EAAB...demo_token_conversions_api');
  const [testEventCode, setTestEventCode] = useState(settings?.testEventCode || 'TEST98231');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const snippet = `<!-- PrimeTrack Pixel -->
<script>
  window.pixelId = "${metaPixelId}";
  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute("src", "${window.location.origin}/pixel.js");
  document.head.appendChild(a);
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings({
      metaPixelId,
      metaAccessToken,
      testEventCode
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const matchBreakdown = pixelHealth?.breakdown || {
    emailMatchRate: 99.4,
    phoneMatchRate: 96.8,
    fbpMatchRate: 98.2,
    fbcMatchRate: 91.5,
    ipMatchRate: 100.0,
    userAgentMatchRate: 100.0,
    deduplicationAccuracy: 100.0
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Radio className="w-6 h-6 text-brand" />
          <span>Pixel Server-Side & Meta Conversions API (CAPI)</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Instalação simplificada em 1 linha, sem GTM e com Nota do Pixel (EMQ) comprovada acima de 9.1.
        </p>
      </div>

      {/* EMQ Score Card Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Score Radial Visual */}
        <div className="card-glass p-6 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden border-brand/30">
          <div className="absolute inset-0 bg-gradient-to-b from-brand/10 to-transparent pointer-events-none" />
          
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2">
            Nota Geral do Pixel (EMQ)
          </span>

          <div className="relative my-4 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-brand/20 flex items-center justify-center relative">
              <div className="w-28 h-28 rounded-full border-4 border-t-brand border-r-brand border-b-brand border-l-transparent animate-spin-slow flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                  9.3
                </span>
                <span className="text-[10px] text-brand-light font-mono font-bold uppercase">
                  de 10.0
                </span>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Excelente / High Match</span>
          </div>

          <p className="text-xs text-zinc-400 mt-4 max-w-xs">
            A Meta recebe dados de compradores reais completos com SHA-256 e cookies de 1ª parte, fazendo o CPA cair.
          </p>
        </div>

        {/* Match Keys Breakdown */}
        <div className="lg:col-span-2 card-glass p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-brand" />
                <span>Qualidade dos Parâmetros de Correspondência</span>
              </h3>
              <span className="text-xs font-mono text-zinc-400">Tempo Real</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>E-mail Hash (SHA-256)</span>
                  <span className="text-emerald-400 font-bold">{matchBreakdown.emailMatchRate}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${matchBreakdown.emailMatchRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Telefone E.164 Hash</span>
                  <span className="text-emerald-400 font-bold">{matchBreakdown.phoneMatchRate}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${matchBreakdown.phoneMatchRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Cookie Meta (_fbp)</span>
                  <span className="text-brand-light font-bold">{matchBreakdown.fbpMatchRate}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand h-full rounded-full" style={{ width: `${matchBreakdown.fbpMatchRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Click ID Meta (_fbc)</span>
                  <span className="text-brand-light font-bold">{matchBreakdown.fbcMatchRate}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand h-full rounded-full" style={{ width: `${matchBreakdown.fbcMatchRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>IP do Cliente (Client IP)</span>
                  <span className="text-purple-400 font-bold">{matchBreakdown.ipMatchRate}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${matchBreakdown.ipMatchRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1">
                  <span>Deduplicação de Eventos</span>
                  <span className="text-purple-400 font-bold">{matchBreakdown.deduplicationAccuracy}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${matchBreakdown.deduplicationAccuracy}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
            <span>✓ Atribuição Cross-Session de 30 dias ativa</span>
            <span>✓ Proteção contra AdBlockers e iOS 14+</span>
            <span>✓ Zero risco de duplicação de vendas</span>
          </div>
        </div>

      </div>

      {/* Pixel Script Installation Box */}
      <div className="card-glass p-6 rounded-2xl space-y-4 border-brand/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand" />
              <span>Código de Instalação (Cole antes de fechar &lt;/head&gt;)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sem GTM, sem container, sem complicação. Funciona em WordPress, Elementor, Webflow, Vturb ou HTML puro.
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand/30 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Código Copiado!' : 'Copiar Código do Pixel'}</span>
          </button>
        </div>

        <div className="relative">
          <pre className="p-4 rounded-xl bg-[#03060D] border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto selection:bg-brand">
            <code>{snippet}</code>
          </pre>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>O script detecta botões de checkout (Kiwify, Hotmart, Eduzz...) e repassa as UTMs automaticamente.</span>
        </div>
      </div>

      {/* Meta API Configuration Form */}
      <div className="card-glass p-6 rounded-2xl">
        <h3 className="font-bold text-white text-base flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-brand" />
          <span>Configuração da API de Conversões do Facebook (CAPI)</span>
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Insira o Pixel ID do Facebook e seu Token de Acesso do Gerenciador de Eventos para envio Server-Side nativo.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Pixel ID (Meta Ads)
              </label>
              <input
                type="text"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="Ex: 8942189012398"
                className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Código de Teste do Gerenciador (Opcional)
              </label>
              <input
                type="text"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
                placeholder="Ex: TEST12345"
                className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Token de Acesso da Conversions API (Graph API)
            </label>
            <input
              type="password"
              value={metaAccessToken}
              onChange={(e) => setMetaAccessToken(e.target.value)}
              placeholder="EAAB..."
              className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-400">
              {savedSuccess && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Configurações salvas com sucesso!
                </span>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 font-bold text-xs flex items-center gap-2 transition-colors shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
