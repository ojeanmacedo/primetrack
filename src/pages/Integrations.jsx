import React, { useState } from 'react';
import { 
  Plus, 
  RefreshCw, 
  ExternalLink, 
  Check, 
  Copy, 
  Code2, 
  Radio, 
  Webhook, 
  Smartphone, 
  HelpCircle,
  Play,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  Key,
  Apple,
  AlertTriangle,
  Lock,
  X
} from 'lucide-react';

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('Facebook Ads');
  const [copiedUTM, setCopiedUTM] = useState(false);
  const [copiedPixel, setCopiedPixel] = useState(false);
  const [copiedConnectLink, setCopiedConnectLink] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passUpdated, setPassUpdated] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Facebook Connection Flow States
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showFacebookOAuth, setShowFacebookOAuth] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [connectedProfiles, setConnectedProfiles] = useState([
    { id: '9132253187299', name: 'Rafaelli Ribeiro', initial: 'R', accountsCount: 2, isNew: false },
    { id: '172109315470598810', name: 'Angel Kerry', initial: 'A', accountsCount: 7, isNew: false }
  ]);

  const tabs = [
    'Facebook Ads',
    'Pixel de Rastreio',
    'UTMs',
    'Webhook API',
    'Baixe nosso App',
    'Dúvidas'
  ];

  const [adAccounts, setAdAccounts] = useState([
    { name: 'CA01', id: '1892117896682979', bm: 'Marinhos Dog', currency: 'USD (→ BRL @ 5,12)', status: 'Ativa', sync: true },
    { name: 'Rafaelli Ribeiro', id: '988187735672553', bm: '—', currency: 'BRL', status: 'Ativa', sync: false },
    { name: 'CA03', id: '1095793299643643', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false },
    { name: 'CA02 JEFFREY', id: '1101817232408751', bm: 'DIGITAL MEI', currency: 'USD (→ BRL @ 5,12)', status: 'Ativa', sync: true },
    { name: 'Angel Kerry', id: '1387392810834788', bm: '—', currency: 'USD (→ BRL @ 5,12)', status: 'Ativa', sync: false },
    { name: 'CA01 JEFFREY', id: '1588922422538250', bm: 'DIGITAL MEI', currency: 'USD (→ BRL @ 5,12)', status: 'Ativa', sync: false },
    { name: 'CA03 JEFFREY', id: '2013649985959956', bm: 'DIGITAL MEI', currency: 'USD (→ BRL @ 5,12)', status: 'Ativa', sync: false },
    { name: 'CA02', id: '4157287571263652', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false },
    { name: 'CA01', id: '719933136445425', bm: 'DIGITAL JM SOLUCOES LTDA', currency: 'BRL', status: 'Ativa', sync: false },
  ]);

  const [connectionSuccessMsg, setConnectionSuccessMsg] = useState(null);

  React.useEffect(() => {
    // Verifica retorno do OAuth via URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      const userName = params.get('name') || 'Perfil';
      setConnectionSuccessMsg(`🎉 Perfil ${userName} conectado com sucesso ao PrimeTrack!`);
      setTimeout(() => setConnectionSuccessMsg(null), 5000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Busca status das conexões salvas no backend
    fetch('http://localhost:3001/api/meta/status')
      .then(res => res.json())
      .then(data => {
        if (data.connections && data.connections.length > 0) {
          const mapped = data.connections.map(c => ({
            id: c.id,
            name: c.name,
            initial: c.name ? c.name.charAt(0).toUpperCase() : 'M',
            accountsCount: c.accountsCount || 0,
            isNew: true
          }));
          setConnectedProfiles(mapped);
        }
        if (data.adAccounts && data.adAccounts.length > 0) {
          const mappedAccs = data.adAccounts.map(a => ({
            name: a.name || 'Conta',
            id: a.accountId || (a.id ? a.id.replace('act_', '') : '0000'),
            bm: a.businessName || 'BM Principal',
            currency: a.currency === 'USD' ? 'USD (→ BRL @ 5,12)' : 'BRL',
            status: a.status === 'ACTIVE' ? 'Ativa' : 'Desativada',
            sync: a.status === 'ACTIVE'
          }));
          setAdAccounts(mappedAccs);
        }
      })
      .catch(e => console.log('Backend offline, usando dados em cache'));
  }, []);

  const pixelScript = `<script> window.pixelId = "pt_px_590fedcfff65"; var a = document.createElement("script"); a.setAttribute("async", ""); a.setAttribute("defer", ""); a.setAttribute("src", "https://primetrack.com.br/pixel.js"); document.head.appendChild(a); </script>`;

  const utmString = `utm_source=FB&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{placement}}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === 'utm') {
      setCopiedUTM(true);
      setTimeout(() => setCopiedUTM(false), 2000);
    } else if (type === 'pixel') {
      setCopiedPixel(true);
      setTimeout(() => setCopiedPixel(false), 2000);
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('As senhas não conferem.');
      return;
    }
    setPassUpdated(true);
    setTimeout(() => setPassUpdated(false), 3000);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Integrações
        </h1>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Conecte suas contas de anúncios e configure o rastreamento
        </p>
      </div>

      {/* Horizontal Nav Tabs matching Screenshots */}
      <div className="flex items-center gap-6 border-b border-[#13233E] text-xs font-medium overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 transition-colors relative whitespace-nowrap ${
              activeTab === tab
                ? 'text-[#5C9BFF] font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{tab}</span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B66E3]" />
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Facebook Ads                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'Facebook Ads' && (
        <div className="space-y-6">
          
          {/* Connection Success Toast */}
          {connectionSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2.5 animate-bounce">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span>{connectionSuccessMsg}</span>
            </div>
          )}
          
          {/* Perfil Conectados Card */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="font-bold text-white text-sm">
                Perfil Conectados (2)
              </h3>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-[#24131A] hover:bg-red-950/40 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Tutorial</span>
                </button>
                <button 
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#2B66E3] hover:bg-[#2558C7] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand/30 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Facebook</span>
                </button>
                <button 
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-white/10 hover:border-brand text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reconectar</span>
                </button>
              </div>
            </div>

            {/* Profiles List */}
            <div className="space-y-3">
              {connectedProfiles.map((prof) => (
                <div key={prof.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#070D1A] border border-[#13233E]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1A6DFF] text-white font-bold text-sm flex items-center justify-center font-mono">
                      {prof.initial}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <span>{prof.name}</span>
                        {prof.isNew && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold animate-pulse">
                            Novo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        ID: {prof.id} · {prof.accountsCount} conta(s) de anúncio
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                      Conectado
                    </span>
                    <button 
                      onClick={() => setConnectedProfiles(prev => prev.filter(p => p.id !== prof.id))}
                      className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                    >
                      Desconectar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contas de Anúncio Table matching Screenshot 4 */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#13233E]">
              <h3 className="font-bold text-white text-sm">
                Contas de Anúncio (9)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                  <tr>
                    <th className="py-3 px-4">CONTA</th>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">BM</th>
                    <th className="py-3 px-4">MOEDA</th>
                    <th className="py-3 px-4 text-center">STATUS META</th>
                    <th className="py-3 px-4 text-center">SINCRONIZAÇÃO</th>
                    <th className="py-3 px-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13233E]/60 font-sans">
                  {adAccounts.map((acc, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        {acc.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400">
                        {acc.id}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-mono text-[11px]">
                        {acc.bm}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                        {acc.currency}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {acc.sync ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                            <span>● Ativa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                            <span>○ Inativa</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <button className={`text-xs hover:underline ${acc.sync ? 'text-zinc-400 hover:text-white' : 'text-[#5C9BFF]'}`}>
                          {acc.sync ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 border-t border-[#13233E] text-xs font-mono text-zinc-500">
              2 conta(s) ativa(s) neste dashboard de 9 disponíveis
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Pixel de Rastreio (Screenshot 5)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'Pixel de Rastreio' && (
        <div className="space-y-6">
          
          {/* Pixels de Rastreio (1/1) Card */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm">
                Pixels de Rastreio (1/1)
              </h3>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-[#24131A] hover:bg-red-950/40 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Tutorial</span>
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-[#070D1A] border border-white/10 hover:border-brand text-zinc-300 text-xs font-medium transition-colors">
                  Upgrade para mais
                </button>
              </div>
            </div>

            {/* Pixel Details Bar */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#13233E]">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                    Ativo
                  </span>
                  <span className="font-bold text-white text-sm">hot</span>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-300 text-xs transition-colors">
                    Testar
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-300 text-xs transition-colors">
                    Editar
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-300 text-xs transition-colors">
                    Desativar
                  </button>
                  <button className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-red-950/30 border border-white/10 text-red-400 text-xs transition-colors">
                    Excluir
                  </button>
                </div>
              </div>

              {/* Grid 4 Colunas com infos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Pixel ID</div>
                  <div className="font-mono text-zinc-300">1056786567239394</div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Token CAPI</div>
                  <div className="font-mono text-zinc-300">••••••9y2D2D</div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Regra de IC</div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">css</span>
                    <span className="font-mono text-zinc-300">.btn-checkout</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Criado em</div>
                  <div className="font-mono text-zinc-300">05/09/2026</div>
                </div>
              </div>

              {/* Instale no <head> Snippet */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] text-zinc-400 font-sans">
                  Instale no &lt;head&gt; do seu site:
                </div>
                <div className="relative bg-[#070D1A] border border-[#13233E] rounded-xl p-3.5 font-mono text-[11px] text-zinc-300 pr-20 overflow-x-auto">
                  <code>{pixelScript}</code>
                  <button
                    onClick={() => copyToClipboard(pixelScript, 'pixel')}
                    className="absolute right-2.5 top-2.5 px-3 py-1 rounded-lg bg-[#0A1426] hover:bg-[#12223D] border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    {copiedPixel ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPixel ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Dica Box */}
              <div className="bg-[#070D1A] border border-[#13233E] rounded-xl p-3 text-xs text-zinc-400">
                <strong>Dica:</strong> nosso pixel já captura automaticamente os parâmetros da URL (UTMs, fbclid, etc.) e repassa para todos os links da página, inclusive o checkout. Não precisa de script extra.
              </div>
            </div>

          </div>

          {/* Big Blue Card: Nosso Pixel entrega 9.1/10 de Event Match Quality */}
          <div className="bg-[#1A6DFF] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
            
            {/* Top row with Meta seal and EMQ Score */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                  META CERTIFIED
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
                  Nosso Pixel entrega 9.1/10 de Event Match Quality
                </h3>
                <p className="text-xs sm:text-sm text-white/80 font-sans mt-0.5 max-w-2xl">
                  A maioria das plataformas fica abaixo de 6.0. Com PrimeTrack você envia eventos enriquecidos direto para o CAPI da Meta, escalando anúncios com a maior precisão do mercado.
                </p>
              </div>
            </div>

            {/* Bottom Row: Video Thumbnail + 6 Grid Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Video Thumbnail Card matching Screenshot 5 */}
              <div className="lg:col-span-3 flex justify-center lg:justify-start">
                <div className="relative w-[130px] sm:w-[150px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/30 shadow-2xl bg-black group cursor-pointer">
                  <img 
                    src="/images/pixel_video_thumb.png" 
                    alt="Nota do pixel PrimeTrack" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 right-2 text-[10px] font-bold text-white drop-shadow bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm truncate">
                    Nota do pixel
                  </div>
                </div>
              </div>

              {/* Right 6 Benefit Cards Grid matching Screenshot 5 */}
              <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">CAPI server-side direto</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Eventos disparados pelo nosso servidor, sem perda por bloqueador ou iOS.
                  </div>
                </div>

                {/* 2 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Enriquecimento completo</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    fbp, fbc, IP real, geo, e-mail e telefone em todo Purchase.
                  </div>
                </div>

                {/* 3 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Deduplicação automática</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Sem evento duplicado entre browser e servidor. EMQ limpo.
                  </div>
                </div>

                {/* 4 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Escala com precisão</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Mais qualidade de match = otimização rápida e CPA mais baixo.
                  </div>
                </div>

                {/* 5 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Allowlist de domínios</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Bloqueie tráfego de terceiros que tentem copiar seu pixel.
                  </div>
                </div>

                {/* 6 */}
                <div className="bg-[#1258DB] border border-white/15 p-4 rounded-2xl">
                  <div className="font-bold text-sm text-white mb-1">Sem container, sem GTM-SS</div>
                  <div className="text-[11px] text-white/80 leading-relaxed">
                    Mesmo poder do Stape/Elevar, com instalação em 1 linha.
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: UTMs (Screenshot 4)                                                */}
      {/* ========================================================================= */}
      {activeTab === 'UTMs' && (
        <div className="space-y-6">
          
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 sm:p-7 shadow-xl space-y-7">
            
            {/* Header com botão Tutorial */}
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-bold text-white text-sm">
                UTMs para Facebook Ads
              </h3>

              <button className="px-3 py-1.5 rounded-lg bg-[#24131A] hover:bg-red-950/40 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors">
                <Play className="w-3 h-3 fill-current" />
                <span>Tutorial</span>
              </button>
            </div>

            {/* O que são UTMs? */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="text-red-400">📌</span>
                <span>O que são UTMs?</span>
              </div>
              <p className="text-zinc-400 pl-6 text-[12px] leading-relaxed">
                UTMs são parâmetros adicionados à URL do seu anúncio que permitem ao PrimeTrack identificar <strong>exatamente de qual campanha, conjunto e anúncio veio cada clique e venda</strong>. Sem UTMs, o rastreamento não funciona.
              </p>
            </div>

            {/* Como configurar */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-white">
                <span>⚙️</span>
                <span>Como configurar</span>
              </div>
              <ol className="space-y-1.5 text-zinc-400 pl-6 text-[12px]">
                <li>1. No Gerenciador de Anúncios, edite ou crie um anúncio</li>
                <li>2. Role até a seção <strong>"Rastreamento"</strong></li>
                <li>3. No campo <strong>"Parâmetros de URL"</strong>, cole o valor abaixo</li>
                <li>4. Publique o anúncio normalmente</li>
              </ol>
            </div>

            {/* Parâmetros de URL copiável */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <span>📋</span>
                <span>Parâmetros de URL</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Copie e cole no campo "Parâmetros de URL" do seu anúncio no Facebook:
              </div>

              <div className="relative bg-[#070D1A] border border-[#13233E] rounded-xl p-3.5 font-mono text-[11px] text-zinc-300 pr-24 overflow-x-auto">
                <code>{utmString}</code>
                <button
                  onClick={() => copyToClipboard(utmString, 'utm')}
                  className="absolute right-2.5 top-2.5 px-3 py-1 rounded-lg bg-[#0A1426] hover:bg-[#12223D] border border-white/10 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  {copiedUTM ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUTM ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Entenda cada parâmetro (Tabela) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <span className="text-amber-400">💡</span>
                <span>Entenda cada parâmetro</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[10px] text-zinc-500 uppercase border-b border-[#13233E]">
                    <tr>
                      <th className="py-2.5 px-3">PARÂMETRO</th>
                      <th className="py-2.5 px-3">VALOR</th>
                      <th className="py-2.5 px-3">O QUE CAPTURA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#13233E]/60 text-xs">
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_source</td>
                      <td className="py-3 px-3 text-white">FB</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Identifica que o tráfego vem do Facebook</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_campaign</td>
                      <td className="py-3 px-3 text-white">{`{{campaign.name}}|{{campaign.id}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Nome e ID da campanha</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_medium</td>
                      <td className="py-3 px-3 text-white">{`{{adset.name}}|{{adset.id}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Nome e ID do conjunto de anúncios</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_content</td>
                      <td className="py-3 px-3 text-white">{`{{ad.name}}|{{ad.id}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Nome e ID do anúncio (criativo)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-[#5C9BFF]">utm_term</td>
                      <td className="py-3 px-3 text-white">{`{{placement}}`}</td>
                      <td className="py-3 px-3 text-zinc-400 font-sans">Posicionamento (Feed, Stories, Reels, etc.)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aviso inferior de macros dinâmicas */}
            <div className="bg-[#070D1A] border border-[#13233E] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-400">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> Os valores entre {'{{ }}'} são macros dinâmicas do Facebook — eles serão substituídos automaticamente pelos dados reais de cada anúncio. Não altere os nomes dentro das chaves.
              </span>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Webhook API (Screenshot 1)                                         */}
      {/* ========================================================================= */}
      {activeTab === 'Webhook API' && (
        <div className="space-y-6">
          
          {/* Top Header Card */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                Webhook API
              </h3>
              <button className="px-3 py-1 rounded-lg bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-300 text-xs transition-colors">
                Documentação
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Cada integração usa seu próprio token e URL. Clique em "Conectar Plataforma" abaixo para gerar a URL certa para a sua ferramenta, ou consulte a documentação para integrações avançadas.
            </p>
          </div>

          {/* Tokens de API (1/2) Table */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#13233E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm">
                Tokens de API (1/2)
              </h3>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-[#070D1A] hover:bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Conectar Plataforma</span>
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-[#070D1A] hover:bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Token Padrão</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                  <tr>
                    <th className="py-3 px-4">NOME</th>
                    <th className="py-3 px-4">PLATAFORMA</th>
                    <th className="py-3 px-4">TOKEN</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4">ÚLTIMO USO</th>
                    <th className="py-3 px-4">CRIADO EM</th>
                    <th className="py-3 px-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13233E]/60 font-sans">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4 font-bold text-white">
                      mosterpay
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                        lowify
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-300">
                      lt_****1775a8
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
                        Ativo
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                      07/09 12:53
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                      30/08/2026
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      <button className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors">
                        Excluir
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: Baixe nosso App (Screenshot 2)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'Baixe nosso App' && (
        <div className="space-y-6">
          
          {/* Header Card with Status Senha Definida */}
          <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <span>📲</span>
              <span>App PrimeTrack</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A6DFF] text-white font-mono text-[10px] font-bold">
              <span>Senha</span>
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Definida</span>
            </div>
          </div>

          {/* 2 Columns Grid: Baixe o app + Atualizar senha */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col (5 cols): Baixe o app & Como acessar */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-white text-sm">
                  Baixe o app
                </h3>
                <p className="text-xs text-zinc-400">
                  Acompanhe suas métricas em tempo real direto do celular.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button className="px-4 py-2 rounded-xl bg-black border border-white/20 text-white font-bold text-xs flex items-center gap-2 hover:bg-zinc-900 transition-colors">
                    <Apple className="w-4 h-4 fill-current" />
                    <span>App Store</span>
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-[#00C853] hover:bg-[#00B34A] text-black font-bold text-xs flex items-center gap-2 shadow-md transition-colors">
                    <Smartphone className="w-4 h-4" />
                    <span>Android APK</span>
                  </button>
                </div>
              </div>

              {/* Como acessar box */}
              <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-2 text-xs">
                <div className="font-bold text-white">Como acessar:</div>
                <ol className="space-y-1.5 text-zinc-400 text-[12px]">
                  <li>1. Baixe o app</li>
                  <li>2. Defina uma senha ao lado →</li>
                  <li>
                    3. No app, faça login com:
                    <div className="mt-1 pl-4 space-y-0.5 font-mono text-zinc-300">
                      <div>✉️ blackhospedagem@gmail.com</div>
                      <div>🔑 A senha que você definir</div>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            {/* Right Col (7 cols): Atualizar senha do app Form */}
            <div className="lg:col-span-7 bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Key className="w-4 h-4 text-[#5C9BFF]" />
                <span>Atualizar senha do app</span>
              </div>
              <p className="text-xs text-zinc-400">
                Você já tem uma senha. Atualize abaixo se desejar.
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    NOVA SENHA
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#070D1A] border border-[#13233E] focus:border-[#1A6DFF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    CONFIRMAR SENHA
                  </label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#070D1A] border border-[#13233E] focus:border-[#1A6DFF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                {passUpdated && (
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Senha atualizada com sucesso!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand/30 transition-all"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Atualizar Senha</span>
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: Dúvidas (Screenshot 3)                                              */}
      {/* ========================================================================= */}
      {activeTab === 'Dúvidas' && (
        <div className="space-y-3">
          {[
            {
              title: "Minhas vendas não está marcando nas campanhas",
              hasVideo: true,
              content: "Certifique-se de que os botões de checkout da sua landing page estão com o script da PrimeTrack instalado e que o webhook da sua plataforma foi cadastrado corretamente com os eventos de compra aprovada."
            },
            {
              title: "Não tá marcando IC",
              hasVideo: true,
              content: "O evento InitiateCheckout (IC) é disparado automaticamente quando o lead clica em qualquer botão com a classe .btn-checkout ou link de checkout."
            },
            {
              title: "Como faço para entrar no app?",
              hasVideo: false,
              content: "Basta baixar o app na App Store ou Android APK, definir sua senha na aba 'Baixe nosso App' e fazer login com blackhospedagem@gmail.com."
            },
            {
              title: "Meu app não notificou a venda",
              hasVideo: false,
              content: "Verifique na aba Notificações se as opções de notificações estão ativas e conceda permissão de notificações push no seu smartphone."
            },
            {
              title: "Como funciona a notificação de saldo baixo e limite de gastos?",
              hasVideo: false,
              content: "Sincronizamos de hora em hora o saldo das suas contas de anúncios. Ao atingir o limite estipulado, você recebe um push imediato."
            },
            {
              title: "Não está trackeando minhas vendas na Hotmart",
              hasVideo: false,
              content: "Na Hotmart, certifique-se de usar a versão 2.0.0 de Webhook com a URL gerada e com o evento 'Compra Aprovada' selecionado."
            },
            {
              title: "A plataforma que uso para vender não está na lista de integrações",
              hasVideo: false,
              content: "A PrimeTrack possui suporte a Webhook Genérico via API para aceitar payloads em JSON de qualquer plataforma proprietária."
            }
          ].map((faq, idx) => (
            <div 
              key={idx}
              className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-white hover:bg-white/[0.02] transition-colors"
              >
                <span>{faq.title}</span>
                <div className="flex items-center gap-3">
                  {faq.hasVideo && (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider">
                      Vídeo
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${openFaq === idx ? 'rotate-180 text-white' : ''}`} />
                </div>
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 border-t border-[#13233E]/60 bg-[#070D1A]/50 leading-relaxed font-sans">
                  {faq.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Conectar Meta Ads (Screenshot 1)                                */}
      {/* ========================================================================= */}
      {showConnectModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowConnectModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0A1426] border border-[#13233E] rounded-3xl p-6 sm:p-7 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowConnectModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base sm:text-lg font-bold text-white font-sans mb-2">
              Conectar Meta Ads
            </h3>

            <p className="text-xs text-zinc-400 font-sans mb-6">
              Escolha como deseja conectar sua conta Meta Ads:
            </p>

            <div className="space-y-3">
              {/* Primary Blue Button: Conectar com Facebook Oficial */}
              <button
                onClick={() => {
                  window.location.href = 'http://localhost:3001/api/auth/facebook';
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-brand/30 transition-transform active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Conectar com Facebook</span>
              </button>

              {/* Secondary Dark Button: Copiar link de conexão */}
              <button
                onClick={() => {
                  copyToClipboard(`${window.location.origin}/auth/facebook/connect?token=lt_auth_${Date.now()}`, 'connect');
                  setCopiedConnectLink(true);
                  setTimeout(() => setCopiedConnectLink(false), 2500);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#070D1A] hover:bg-[#12223D] border border-white/10 text-zinc-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <span>📋</span>
                <span>{copiedConnectLink ? 'Link copiado com sucesso!' : 'Copiar link de conexão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Facebook OAuth Oficial (Screenshot 2)                            */}
      {/* ========================================================================= */}
      {showFacebookOAuth && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => !isConnecting && setShowFacebookOAuth(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden text-zinc-900 border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Facebook Top App Header Bar */}
            <div className="bg-[#1877F2] text-white px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>facebook</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] font-bold">
                  JM
                </div>
                <span>Jean</span>
                <span className="text-white/40">|</span>
                <span className="text-white/80 cursor-pointer hover:underline">Página inicial</span>
              </div>
            </div>

            {/* Meta + PrimeTrack Integration Header Ribbon */}
            <div className="border-b border-zinc-200 px-6 py-3 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                {/* Meta Infinity Logo */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#0081FB">
                  <path d="M12 7.2c-3.1 0-5.4 2.2-6.5 4.8 1.1 2.6 3.4 4.8 6.5 4.8s5.4-2.2 6.5-4.8c-1.1-2.6-3.4-4.8-6.5-4.8zm0 8c-2.2 0-4-1.4-4.8-3.2.8-1.8 2.6-3.2 4.8-3.2s4 1.4 4.8 3.2c-.8 1.8-2.6 3.2-4.8 3.2z"/>
                </svg>
                <span className="text-zinc-400 font-mono text-xs">⇄</span>
                {/* PrimeTrack Logo */}
                <div className="w-5 h-5 rounded bg-[#1A6DFF] flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">P</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[9px]">
                  👤
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>

            {/* Main Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight font-sans">
                  Continuar como Jean Macedo?
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-sans">
                  O PrimeTrack receberá seu nome e a foto do perfil.
                </p>
              </div>

              {/* Action Buttons: Cancelar & Continuar */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => setShowFacebookOAuth(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => {
                    setIsConnecting(true);
                    setTimeout(() => {
                      setIsConnecting(false);
                      setShowFacebookOAuth(false);
                      // Add Jean Macedo to connected profiles
                      setConnectedProfiles(prev => [
                        ...prev,
                        { id: '1092847291884920', name: 'Jean Macedo', initial: 'J', accountsCount: 3, isNew: true }
                      ]);
                    }, 1400);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Conectando Meta Ads...</span>
                    </>
                  ) : (
                    <span>Continuar</span>
                  )}
                </button>
              </div>

              {/* Switch account link */}
              <div className="text-xs text-zinc-600 font-sans">
                Não é Jean Macedo? <span className="text-[#1877F2] font-semibold hover:underline cursor-pointer">Entrar em outra conta</span>
              </div>

              {/* Legal & Permissions Footnote */}
              <div className="pt-8 border-t border-zinc-100 space-y-3 text-[11px] text-zinc-500 leading-relaxed font-sans">
                <p>
                  Ao continuar, o PrimeTrack receberá acesso contínuo às informações que você compartilha, e a Meta registrará quando o PrimeTrack acessar essas informações. <span className="text-[#1877F2] hover:underline cursor-pointer">Saiba mais</span> sobre esse compartilhamento e suas configurações ativas.
                </p>

                <div className="text-[11px] text-[#1877F2] flex items-center gap-1">
                  <span className="hover:underline cursor-pointer">Política de Privacidade</span>
                  <span className="text-zinc-400">·</span>
                  <span className="hover:underline cursor-pointer">Termos de Serviço</span>
                  <span className="text-zinc-600">do PrimeTrack</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
