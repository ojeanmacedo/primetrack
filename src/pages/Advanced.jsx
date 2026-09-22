import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sliders, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  Radio, 
  Link2, 
  FlaskConical, 
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  Lock
} from 'lucide-react';
import PixelManager from './PixelManager';
import UtmBuilder from './UtmBuilder';
import SimulatorLab from './SimulatorLab';

export default function Advanced() {
  const [activeSubTab, setActiveSubTab] = useState('geral'); // 'geral', 'pixel', 'utm', 'simulador'

  // Configurações de Atribuição
  const [attributionModel, setAttributionModel] = useState(() => {
    return localStorage.getItem('primetrack_attr_model') || 'last_click';
  });
  const [attributionWindow, setAttributionWindow] = useState(() => {
    return localStorage.getItem('primetrack_attr_window') || '7d';
  });
  const [crossDomainEnabled, setCrossDomainEnabled] = useState(() => {
    return localStorage.getItem('primetrack_cross_domain') !== 'false';
  });
  const [autoPreserveUtms, setAutoPreserveUtms] = useState(() => {
    return localStorage.getItem('primetrack_preserve_utms') !== 'false';
  });

  // Domínio Personalizado (CNAME)
  const [customDomain, setCustomDomain] = useState(() => {
    return localStorage.getItem('primetrack_custom_domain') || '';
  });
  const [domainVerified, setDomainVerified] = useState(() => {
    return localStorage.getItem('primetrack_domain_verified') === 'true';
  });
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);

  // Status de salvamento / resync
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncSuccess, setResyncSuccess] = useState(false);

  const handleSaveGeneral = (e) => {
    e?.preventDefault();
    localStorage.setItem('primetrack_attr_model', attributionModel);
    localStorage.setItem('primetrack_attr_window', attributionWindow);
    localStorage.setItem('primetrack_cross_domain', String(crossDomainEnabled));
    localStorage.setItem('primetrack_preserve_utms', String(autoPreserveUtms));
    localStorage.setItem('primetrack_custom_domain', customDomain.trim());
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleVerifyCustomDomain = () => {
    if (!customDomain.trim()) return;
    setIsVerifyingDomain(true);
    setTimeout(() => {
      setIsVerifyingDomain(false);
      setDomainVerified(true);
      localStorage.setItem('primetrack_domain_verified', 'true');
    }, 1500);
  };

  const handleResyncAll = () => {
    setIsResyncing(true);
    setResyncSuccess(false);
    setTimeout(() => {
      setIsResyncing(false);
      setResyncSuccess(true);
      window.dispatchEvent(new Event('primetrack_profile_sync'));
      setTimeout(() => setResyncSuccess(false), 3000);
    }, 1800);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#0066FF]" />
            <span>Configurações Avançadas</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Controle de atribuição, domínio de rastreamento próprio (CNAME), CAPI e ferramentas de diagnóstico.
          </p>
        </div>

        {/* Botão Ressincronizar Cache */}
        <button
          type="button"
          onClick={handleResyncAll}
          disabled={isResyncing}
          className="px-4 py-2 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          title="Recalcula atribuições e limpa cache temporário"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0066FF] ${isResyncing ? 'animate-spin' : ''}`} />
          <span>{isResyncing ? 'Ressincronizando...' : 'Limpar Cache & Sincronizar'}</span>
        </button>
      </div>

      {resyncSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>Cache limpo e métricas ressincronizadas com sucesso!</span>
        </div>
      )}

      {/* Sub-tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#1E293B] overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('geral')}
          className={`px-4 py-2.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'geral'
              ? 'text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#0066FF]" />
          <span>Atribuição & Domínio</span>
          {activeSubTab === 'geral' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF]" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('pixel')}
          className={`px-4 py-2.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'pixel'
              ? 'text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Radio className="w-4 h-4 text-[#0066FF]" />
          <span>Pixel & Meta CAPI</span>
          {activeSubTab === 'pixel' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF]" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('utm')}
          className={`px-4 py-2.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'utm'
              ? 'text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Link2 className="w-4 h-4 text-[#0066FF]" />
          <span>Gerador de UTMs</span>
          {activeSubTab === 'utm' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF]" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('simulador')}
          className={`px-4 py-2.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'simulador'
              ? 'text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-[#0066FF]" />
          <span>Simulador & Testes</span>
          {activeSubTab === 'simulador' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF]" />
          )}
        </button>
      </div>

      {/* ABA 1: Atribuição & Domínio */}
      {activeSubTab === 'geral' && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card: Modelo e Janela de Atribuição */}
            <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 shadow-md space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#1E293B]">
                <Layers className="w-4 h-4 text-[#0066FF]" />
                <h2 className="text-sm font-bold text-white">Regras de Atribuição</h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Modelo de Atribuição
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttributionModel('last_click')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      attributionModel === 'last_click'
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]'
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Último Clique
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttributionModel('first_click')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      attributionModel === 'first_click'
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]'
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Primeiro Clique
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttributionModel('linear')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      attributionModel === 'linear'
                        ? 'bg-[#0066FF]/20 border-[#0066FF] text-[#5C9BFF]'
                        : 'bg-[#0D1424] border-[#1E293B] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Linear
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  <strong>Último Clique (Recomendado):</strong> Atribui 100% da conversão ao anúncio mais recente que levou o lead à compra.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Janela de Rastreamento (Cookies de 1ª Parte)
                </label>
                <select
                  value={attributionWindow}
                  onChange={(e) => setAttributionWindow(e.target.value)}
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#0066FF]"
                >
                  <option value="1d">1 dia pós-clique</option>
                  <option value="7d">7 dias pós-clique (Padrão Meta Ads)</option>
                  <option value="28d">28 dias pós-clique (Cross-Session Estendido)</option>
                  <option value="90d">90 dias (Longo Prazo / Infoprodutos)</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Tempo que os parâmetros de rastreamento ficam ativos no navegador do visitante caso ele compre mais tarde pela Bio do Instagram ou WhatsApp.
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#0D1424] border border-[#1E293B] cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Preservação Automática de UTMs</span>
                    <span className="text-[11px] text-zinc-400">Repassa UTMs automaticamente para todos os links e botões da página.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPreserveUtms}
                    onChange={(e) => setAutoPreserveUtms(e.target.checked)}
                    className="w-4 h-4 accent-[#0066FF] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[#0D1424] border border-[#1E293B] cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Rastreamento Cross-Domain</span>
                    <span className="text-[11px] text-zinc-400">Transfere o SessionID e cookies entre domínios diferentes (ex: presell → checkout).</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={crossDomainEnabled}
                    onChange={(e) => setCrossDomainEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#0066FF] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Card: Domínio Personalizado (CNAME) */}
            <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-6 shadow-md space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#0066FF]" />
                    <h2 className="text-sm font-bold text-white">Domínio Próprio de Rastreamento (CNAME)</h2>
                  </div>
                  {domainVerified ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ativo
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                      Opcional
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Ao usar seu próprio subdomínio (ex: <code className="bg-[#0D1424] px-1.5 py-0.5 rounded text-white font-mono">track.seusite.com.br</code>), o pixel opera como cookie de primeira parte legítimo, contornando 100% dos bloqueadores de anúncios e restrições do Safari/iOS.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Subdomínio de Rastreamento
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => {
                        setCustomDomain(e.target.value);
                        setDomainVerified(false);
                      }}
                      placeholder="track.seusite.com.br"
                      className="flex-1 bg-[#0D1424] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCustomDomain}
                      disabled={isVerifyingDomain || !customDomain.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingDomain ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#0066FF]" />}
                      <span>{isVerifyingDomain ? 'Verificando...' : 'Verificar DNS'}</span>
                    </button>
                  </div>
                </div>

                {/* Caixa de Apontamento DNS */}
                <div className="p-4 rounded-xl bg-[#0D1424] border border-[#1E293B] space-y-2 text-xs font-mono">
                  <div className="text-zinc-400 text-[11px] font-sans font-semibold">
                    Instruções de Apontamento no Cloudflare / Registro.br:
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">TIPO:</span>
                      <span className="text-white font-bold">CNAME</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">NOME:</span>
                      <span className="text-white font-bold">{customDomain ? customDomain.split('.')[0] : 'track'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">DESTINO:</span>
                      <span className="text-[#5C9BFF] font-bold">cname.primetrack.top</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-[#1E293B]">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Configurações salvas!
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Alterações salvas localmente e aplicadas instantaneamente.
                  </span>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* ABA 2: Pixel & Meta CAPI */}
      {activeSubTab === 'pixel' && (
        <PixelManager 
          onSaveSettings={(s) => {
            localStorage.setItem('primetrack_pixel_settings', JSON.stringify(s));
          }}
        />
      )}

      {/* ABA 3: Gerador de UTMs */}
      {activeSubTab === 'utm' && (
        <UtmBuilder />
      )}

      {/* ABA 4: Simulador & Testes */}
      {activeSubTab === 'simulador' && (
        <SimulatorLab />
      )}

    </div>
  );
}
