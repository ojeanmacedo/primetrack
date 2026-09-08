import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Copy, 
  Check, 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Code2, 
  Layers, 
  Sparkles, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Send,
  Terminal,
  FileCode,
  Globe,
  Radio
} from 'lucide-react';

export default function DocsWebhook() {
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    document.title = 'Webhook API - Documentação Oficial — PrimeTrack';
    
    const handleScroll = () => {
      const sections = [
        'overview', 'flow', 'endpoint', 'auth', 'events', 
        'payload', 'fields', 'emq', 'net-value', 'responses', 
        'transitions', 'order-bumps', 'examples', 'notes'
      ];
      
      const scrollPos = window.scrollY + 120;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  const payloadExample = `{
  "event": "sale.approved",
  "transaction_id": "ord_987654321",
  "amount": 97.00,
  "currency": "BRL",
  "payment_method": "pix",
  "product": {
    "id": 101,
    "name": "Método Escala Digital"
  },
  "products": [
    { "id": 101, "name": "Método Escala Digital" },
    { "id": 102, "name": "Pack de Criativos Validados (bump)" }
  ],
  "customer": {
    "name": "João da Silva",
    "first_name": "João",
    "last_name": "Silva",
    "email": "joao.silva@exemplo.com.br",
    "phone": "5511999998888",
    "document": "12345678900",
    "country": "br",
    "city": "São Paulo",
    "state": "SP",
    "zip": "01310100"
  },
  "tracking": {
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "escala-fevereiro",
    "utm_content": "video-depoimento-01",
    "utm_term": "trafego-pago",
    "fbp": "fb.1.1712345678.123456789",
    "fbc": "fb.1.1712345678.IwAR3..."
  },
  "user_ip": "189.40.122.45",
  "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)...",
  "metadata": {
    "platform": "generic_checkout"
  }
}`;

  const curlApproved = `curl -X POST https://app.primetrack.top/api/webhook \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tk_live_sua_chave_aqui" \\
  -d '{
    "event": "sale.approved",
    "transaction_id": "ped_9872134",
    "amount": 197.00,
    "payment_method": "pix",
    "product": { "id": 45, "name": "Comunidade Black" },
    "products": [
      { "id": 45, "name": "Comunidade Black" },
      { "id": 92, "name": "Planilha de Gestão Financeira" }
    ],
    "customer": {
      "name": "Marcos Oliveira",
      "email": "marcos@empresa.com",
      "phone": "5521988887777",
      "document": "09876543210"
    },
    "tracking": {
      "utm_source": "facebook",
      "utm_campaign": "campanha-black-pro"
    }
  }'`;

  const curlPending = `# 1. Pedido gerado (Aguardando pagamento via Pix ou Boleto)
curl -X POST https://app.primetrack.top/api/webhook \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tk_live_sua_chave_aqui" \\
  -d '{
    "event": "sale.pending",
    "transaction_id": "ped_9872134",
    "amount": 197.00,
    "customer": {
      "name": "Marcos Oliveira",
      "email": "marcos@empresa.com",
      "phone": "5521988887777"
    }
  }'

# 2. Pagamento compensado (Envia evento Purchase automaticamente para Meta CAPI)
curl -X POST https://app.primetrack.top/api/webhook \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tk_live_sua_chave_aqui" \\
  -d '{
    "event": "sale.approved",
    "transaction_id": "ped_9872134",
    "amount": 197.00,
    "customer": {
      "email": "marcos@empresa.com"
    }
  }'`;

  const curlRefund = `curl -X POST https://app.primetrack.top/api/webhook \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer tk_live_sua_chave_aqui" \\
  -d '{
    "event": "sale.refunded",
    "transaction_id": "ped_9872134",
    "amount": 197.00
  }'`;

  return (
    <div className="min-h-screen bg-[#060B14] text-zinc-300 font-sans antialiased selection:bg-[#0066FF]/30 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-[#0066FF]/15 via-blue-500/10 to-emerald-500/15 border-b border-white/5 py-2 px-4 text-center text-xs text-zinc-300 flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-white">PrimeTrack Webhook API v2.0:</span>
        <span>Integre qualquer plataforma de vendas ou checkout próprio em minutos.</span>
        <a 
          href="https://docs.primetrack.top" 
          className="text-[#0066FF] hover:underline font-bold ml-1 inline-flex items-center gap-1"
        >
          docs.primetrack.top <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Main Layout Container */}
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-10">
        
        {/* Sticky Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0 md:sticky md:top-6 self-start md:max-h-[calc(100vh-4rem)] md:overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Logo Brand */}
          <div className="mb-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0066FF] to-blue-400 flex items-center justify-center shadow-lg shadow-[#0066FF]/20 border border-white/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                PrimeTrack <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-[#0066FF] border border-[#0066FF]/30">API</span>
              </div>
              <p className="text-[11px] text-zinc-500">Documentação do Desenvolvedor</p>
            </div>
          </div>

          {/* Quick AI Prompt Button */}
          <div className="mb-6">
            <a 
              href="#examples"
              onClick={(e) => scrollToSection(e, 'examples')}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6]/15 via-blue-500/10 to-[#0066FF]/15 border border-[#8b5cf6]/30 hover:border-[#8b5cf6]/60 text-xs font-bold text-[#a78bfa] flex items-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#c084fc] animate-pulse" />
              <span>Prompt de Integração IA</span>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-6 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 mb-2">
                Início
              </div>
              <ul className="space-y-0.5">
                <li>
                  <a 
                    href="#overview" 
                    onClick={(e) => scrollToSection(e, 'overview')}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeSection === 'overview' 
                        ? 'bg-[#0066FF]/15 text-[#0066FF] border-l-2 border-[#0066FF] font-semibold' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>Visão Geral</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="#flow" 
                    onClick={(e) => scrollToSection(e, 'flow')}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeSection === 'flow' 
                        ? 'bg-[#0066FF]/15 text-[#0066FF] border-l-2 border-[#0066FF] font-semibold' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>Fluxo de Rastreamento</span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 mb-2">
                Referência
              </div>
              <ul className="space-y-0.5">
                {[
                  { id: 'endpoint', label: 'Endpoint' },
                  { id: 'auth', label: 'Autenticação' },
                  { id: 'events', label: 'Eventos Suportados' },
                  { id: 'payload', label: 'Payload Padrão' },
                  { id: 'fields', label: 'Campos Obrigatórios & Opcionais' },
                ].map((item) => (
                  <li key={item.id}>
                    <a 
                      href={`#${item.id}`}
                      onClick={(e) => scrollToSection(e, item.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                        activeSection === item.id 
                          ? 'bg-[#0066FF]/15 text-[#0066FF] border-l-2 border-[#0066FF] font-semibold' 
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3 mb-2">
                Avançado & CAPI
              </div>
              <ul className="space-y-0.5">
                {[
                  { id: 'emq', label: 'Melhorar Event Match Quality (EMQ)' },
                  { id: 'net-value', label: 'Valor Bruto vs Líquido' },
                  { id: 'responses', label: 'Respostas da API' },
                  { id: 'transitions', label: 'Transições de Status' },
                  { id: 'order-bumps', label: 'Order Bumps (Múltiplos Itens)' },
                  { id: 'examples', label: 'Exemplos cURL' },
                  { id: 'notes', label: 'Observações & Boas Práticas' },
                ].map((item) => (
                  <li key={item.id}>
                    <a 
                      href={`#${item.id}`}
                      onClick={(e) => scrollToSection(e, item.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                        activeSection === item.id 
                          ? 'bg-[#0066FF]/15 text-[#0066FF] border-l-2 border-[#0066FF] font-semibold' 
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Back to App Link */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <Link 
              to="/integracoes"
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-[#0066FF] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para Integrações</span>
            </Link>
          </div>
        </aside>

        {/* Documentation Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-12">
          
          {/* Header Banner */}
          <div className="border-b border-white/10 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>API v2.0 — Estável & Homologada para CAPI</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Documentação da Webhook API
            </h1>
            <p className="mt-3 text-base text-zinc-400 leading-relaxed">
              Conecte qualquer plataforma de checkout, gateway de pagamento, área de membros ou sistema próprio à <strong>PrimeTrack</strong>. Rastreamento inteligente de conversões com envio em tempo real ao <strong>Meta Conversions API (CAPI)</strong> e máxima pontuação de Event Match Quality (EMQ).
            </p>
          </div>

          {/* Section 1: Overview */}
          <section id="overview" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#0066FF]" />
              <span>Visão Geral</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              O webhook da PrimeTrack recebe dados de transações (vendas aprovadas, pedidos pendentes, reembolsos e assinaturas) e realiza automaticamente:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-[#0B132B] border border-white/5 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
                  <span>Atribuição Precisa</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Identifica a campanha, conjunto e anúncio exatos que geraram a venda, além de capturar vendas recuperadas pela bio.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-white/5 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Meta CAPI Instantâneo</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Dispara o evento <code>Purchase</code> com dados criptografados (SHA-256) diretamente para a API de Conversões do Facebook.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-white/5 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>Match Automático de Cookies</span>
                </div>
                <p className="text-xs text-zinc-400">
                  O script <code>pixel.js</code> já captura <code>_fbp</code>, <code>_fbc</code>, IP e User Agent. O sistema cruza os dados sozinho!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-white/5 space-y-1.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Anti-Duplicação de Vendas</span>
                </div>
                <p className="text-xs text-zinc-400">
                  O campo <code>transaction_id</code> impede que o mesmo evento seja computado mais de uma vez no seu dashboard e no Meta Ads.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3 mt-4">
              <span className="text-base">💡</span>
              <div>
                <strong>Dica Fundamental:</strong> Se você instalou o <code>pixel.js</code> da PrimeTrack na sua página de vendas e checkout, não é obrigatório enviar <code>click_id</code> ou IDs internos. Nosso algoritmo inteligente faz o pareamento automático por IP, horário e dispositivo!
              </div>
            </div>
          </section>

          {/* Section: Tracking Flow */}
          <section id="flow" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Diagrama do Fluxo de Rastreamento</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Veja visualmente como os dados trafegam desde o anúncio até a notificação no painel:
            </p>

            <div className="p-6 rounded-2xl bg-[#081020] border border-white/10 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                
                <div className="w-full md:w-1/4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs font-bold text-blue-400">1. Anúncio & Visita</div>
                  <div className="text-[11px] text-zinc-400 mt-1">Visitante clica no Meta Ads e acessa sua LP</div>
                  <div className="mt-2 text-[10px] font-mono text-zinc-500 bg-black/40 py-1 rounded">pixel.js grava fbp / fbc</div>
                </div>

                <div className="text-zinc-600 font-bold text-lg hidden md:block">→</div>

                <div className="w-full md:w-1/4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-xs font-bold text-amber-400">2. Checkout da Venda</div>
                  <div className="text-[11px] text-zinc-400 mt-1">Cliente preenche dados e efetua pagamento</div>
                  <div className="mt-2 text-[10px] font-mono text-zinc-500 bg-black/40 py-1 rounded">Plataforma gera pedido</div>
                </div>

                <div className="text-zinc-600 font-bold text-lg hidden md:block">→</div>

                <div className="w-full md:w-1/4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="text-xs font-bold text-purple-400">3. Webhook PrimeTrack</div>
                  <div className="text-[11px] text-zinc-400 mt-1">Sua plataforma envia o JSON para nossa API</div>
                  <div className="mt-2 text-[10px] font-mono text-zinc-500 bg-black/40 py-1 rounded">POST /api/webhook</div>
                </div>

                <div className="text-zinc-600 font-bold text-lg hidden md:block">→</div>

                <div className="w-full md:w-1/4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs font-bold text-emerald-400">4. Meta CAPI + Painel</div>
                  <div className="text-[11px] text-zinc-400 mt-1">Atribuição de ROAS e disparo de Purchase ao Facebook</div>
                  <div className="mt-2 text-[10px] font-mono text-zinc-500 bg-black/40 py-1 rounded">EMQ 9.0+ / 10</div>
                </div>

              </div>
            </div>
          </section>

          {/* Section 2: Endpoint */}
          <section id="endpoint" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              <span>Endpoint de Webhook</span>
            </h2>
            <p className="text-sm text-zinc-400">
              Todas as requisições devem ser enviadas via método <code>POST</code> com corpo formatado em JSON:
            </p>

            <div className="relative group">
              <div className="p-4 rounded-xl bg-[#091122] border border-white/10 font-mono text-sm text-emerald-400 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-x-auto">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">POST</span>
                  <span>https://app.primetrack.top/api/webhook</span>
                </div>
                <button
                  onClick={() => copyToClipboard('https://app.primetrack.top/api/webhook', 'endpoint')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-sans flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'endpoint' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              * Nota: Se a sua plataforma exigir identificação no caminho da URL, você também pode usar <code>https://app.primetrack.top/api/webhooks/generic</code>.
            </p>
          </section>

          {/* Section 3: Authentication */}
          <section id="auth" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Autenticação</span>
            </h2>
            <p className="text-sm text-zinc-400">
              A autenticação é feita incluindo o seu Token de API no cabeçalho <code>Authorization</code> da requisição:
            </p>

            <div className="p-4 rounded-xl bg-[#091122] border border-white/10 font-mono text-xs text-zinc-300 space-y-1">
              <div><span className="text-blue-400">Content-Type:</span> application/json</div>
              <div><span className="text-blue-400">Authorization:</span> Bearer SEU_TOKEN_AQUI</div>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-start gap-3">
              <span className="text-base">📌</span>
              <div>
                <strong>Onde encontrar seu Token?</strong> No painel da PrimeTrack, acesse <Link to="/integracoes" className="text-white underline font-bold">Integrações → Webhook API</Link>. Cada token gerado é vinculado à sua conta e anúncios correspondentes.
              </div>
            </div>
          </section>

          {/* Section 4: Supported Events */}
          <section id="events" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400" />
              <span>Eventos Suportados</span>
            </h2>
            <p className="text-sm text-zinc-400">
              O campo <code>event</code> define o ciclo de vida da transação:
            </p>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0B132B] text-zinc-400 border-b border-white/10 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Evento</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Status Painel</th>
                    <th className="py-3 px-4">Disparo Meta CAPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-emerald-400 font-bold">sale.approved</td>
                    <td className="py-3 px-4 text-zinc-300 font-sans">Pagamento confirmado (Cartão, Pix compensado)</td>
                    <td className="py-3 px-4 text-emerald-400 font-sans font-semibold">approved</td>
                    <td className="py-3 px-4 text-emerald-400 font-sans font-bold">✅ Purchase</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-amber-400 font-bold">sale.pending</td>
                    <td className="py-3 px-4 text-zinc-300 font-sans">Aguardando pagamento (Boleto impresso, Pix pendente)</td>
                    <td className="py-3 px-4 text-amber-400 font-sans font-semibold">pending</td>
                    <td className="py-3 px-4 text-zinc-500 font-sans">—</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-red-400 font-bold">sale.refunded</td>
                    <td className="py-3 px-4 text-zinc-300 font-sans">Compra reembolsada ou chargeback</td>
                    <td className="py-3 px-4 text-red-400 font-sans font-semibold">refunded</td>
                    <td className="py-3 px-4 text-zinc-500 font-sans">—</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-blue-400 font-bold">subscription.active</td>
                    <td className="py-3 px-4 text-zinc-300 font-sans">Nova assinatura recorrente ativada</td>
                    <td className="py-3 px-4 text-blue-400 font-sans font-semibold">approved</td>
                    <td className="py-3 px-4 text-emerald-400 font-sans font-bold">✅ Purchase</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-zinc-400 font-bold">subscription.cancelled</td>
                    <td className="py-3 px-4 text-zinc-300 font-sans">Assinatura cancelada</td>
                    <td className="py-3 px-4 text-zinc-400 font-sans font-semibold">refunded</td>
                    <td className="py-3 px-4 text-zinc-500 font-sans">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-xs text-zinc-400 space-y-1">
              <p>• <strong>Alias aceito:</strong> <code>sale.paid</code> é automaticamente interpretado como <code>sale.approved</code>.</p>
              <p>• <strong>InitiateCheckout:</strong> Já é disparado em tempo real pelo <code>pixel.js</code> na página de checkout.</p>
            </div>
          </section>

          {/* Section 5: Standard Payload */}
          <section id="payload" className="scroll-mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#0066FF]" />
                <span>Payload Padrão (JSON)</span>
              </h2>
              <button
                onClick={() => copyToClipboard(payloadExample, 'payload')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'payload' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl bg-[#091122] border border-white/10 overflow-hidden">
              <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{payloadExample}</code>
              </pre>
            </div>
          </section>

          {/* Section 6: Fields */}
          <section id="fields" className="scroll-mt-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-blue-400" />
              <span>Dicionário de Campos</span>
            </h2>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Campos Obrigatórios</h3>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0B132B] text-zinc-400 border-b border-white/10 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4">Campo</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    <tr>
                      <td className="py-2.5 px-4 text-[#0066FF] font-bold">event</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Ex: <code>sale.approved</code>, <code>sale.pending</code> ou <code>sale.refunded</code></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-[#0066FF] font-bold">transaction_id</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">ID único do pedido no seu gateway. Alias aceito: <code>order_id</code></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-[#0066FF] font-bold">amount</td>
                      <td className="py-2.5 px-4 text-zinc-400">number</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Valor da venda em reais (BRL). Pode ser bruto ou líquido. Alias aceito: <code>sale_amount</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Campos Opcionais (Recomendados para EMQ Máximo)</h3>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0B132B] text-zinc-400 border-b border-white/10 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4">Campo</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">customer.email</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Email do comprador (crítico para CAPI)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">customer.phone</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Telefone com código do país (Ex: 5511999998888)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">customer.name</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Nome completo do comprador</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">customer.document</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">CPF ou CNPJ sem pontuação</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">product.name</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Nome do produto principal comprado</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">products</td>
                      <td className="py-2.5 px-4 text-zinc-400">array</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Lista completa contendo produto principal + bumps</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">tracking.utm_*</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Parâmetros UTM (utm_source, utm_campaign, etc.)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">tracking.fbp / fbc</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">Cookies do pixel do Meta capturados na LP</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">user_ip</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">IP público do visitante</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-emerald-400">user_agent</td>
                      <td className="py-2.5 px-4 text-zinc-400">string</td>
                      <td className="py-2.5 px-4 text-zinc-300 font-sans">User Agent do navegador do comprador</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 7: Event Match Quality (EMQ) */}
          <section id="emq" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Maximizando o Event Match Quality (EMQ 9.0+)</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              O Facebook classifica a qualidade de cada evento enviado com uma nota de 0 a 10. Quanto mais parâmetros do cliente você repassar no webhook, mais alto será seu índice de correspondência:
            </p>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0B132B] text-zinc-400 border-b border-white/10 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Parâmetro</th>
                    <th className="py-3 px-4">Peso no CAPI</th>
                    <th className="py-3 px-4">Formato / Exemplo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-zinc-200">customer.email</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">🔴 Crítico (Nota Máx)</span></td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">cliente@gmail.com</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-zinc-200">customer.phone</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">🔴 Crítico (Nota Máx)</span></td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">5511999998888</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-zinc-200">user_ip</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">🔴 Crítico (Nota Máx)</span></td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">189.40.122.45</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-zinc-200">user_agent</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">🔴 Crítico (Nota Máx)</span></td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">Mozilla/5.0 (iPhone...)</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-zinc-200">customer.name / first_name</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">🟡 Alto</span></td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">João Silva</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-zinc-200">customer.document</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">🟡 Alto (external_id)</span></td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">12345678900</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 font-mono text-zinc-200">customer.city / state / zip</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">🟢 Médio</span></td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">São Paulo, SP, 01310100</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-[#091122] border border-white/10 text-xs text-zinc-400 space-y-1">
              <span className="font-bold text-white">🔒 Criptografia Automática:</span> Você não precisa aplicar SHA-256 no e-mail ou telefone antes de enviar para a PrimeTrack. Nosso servidor faz o hashing e normalização de acordo com as diretrizes da Meta antes de encaminhar via CAPI.
            </div>
          </section>

          {/* Section 8: Gross vs Net Value */}
          <section id="net-value" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-lg">R$</span>
              <span>Valor Bruto vs Líquido</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              O campo <code>amount</code> aceita tanto o valor total pago pelo cliente quanto o valor líquido já descontado das taxas da sua plataforma:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0B132B] border border-white/5 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Opção 1: Enviar Líquido (Mais Simples)</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Se a sua plataforma já calcula as taxas de gateway e entrega o valor líquido na notificação, basta repassar esse número diretamente no campo <code>amount</code>.
                </p>
                <div className="p-2.5 rounded bg-black/40 font-mono text-xs text-zinc-300">
                  {`// Cliente pagou R$ 100, taxas foram R$ 8\n{ "amount": 92.00 }`}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B132B] border border-white/5 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Opção 2: Enviar Bruto</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Se preferir enviar o valor cheio de venda, a PrimeTrack calcula os custos automaticamente com base nas configurações de taxas e impostos do seu painel.
                </p>
                <div className="p-2.5 rounded bg-black/40 font-mono text-xs text-zinc-300">
                  {`// Valor integral cobrado no checkout\n{ "amount": 100.00 }`}
                </div>
              </div>
            </div>
          </section>

          {/* Section 9: HTTP Responses */}
          <section id="responses" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Respostas da API</span>
            </h2>

            <div className="space-y-3">
              {/* 200 OK */}
              <div className="p-4 rounded-xl bg-[#091122] border-l-4 border-emerald-500 border-y border-r border-white/10 space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>200 OK — Evento Registrado com Sucesso</span>
                </div>
                <pre className="text-xs font-mono text-zinc-300 bg-black/30 p-2.5 rounded overflow-x-auto">
{`{
  "success": true,
  "message": "Evento registrado com sucesso",
  "transaction_id": "ped_9872134",
  "attributedCampaign": "Escala Escolar",
  "capiSent": true
}`}
                </pre>
              </div>

              {/* 401 Unauthorized */}
              <div className="p-4 rounded-xl bg-[#091122] border-l-4 border-red-500 border-y border-r border-white/10 space-y-2">
                <div className="text-xs font-bold text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>401 Unauthorized — Token Inválido ou Ausente</span>
                </div>
                <pre className="text-xs font-mono text-zinc-300 bg-black/30 p-2.5 rounded overflow-x-auto">
{`{ "success": false, "error": "Token de autenticação inválido ou inativo." }`}
                </pre>
              </div>

              {/* 400 Bad Request */}
              <div className="p-4 rounded-xl bg-[#091122] border-l-4 border-amber-500 border-y border-r border-white/10 space-y-2">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>400 Bad Request — Campos Obrigatórios Faltando</span>
                </div>
                <pre className="text-xs font-mono text-zinc-300 bg-black/30 p-2.5 rounded overflow-x-auto">
{`{
  "success": false,
  "error": "Campos obrigatórios ausentes",
  "missing_fields": ["event", "transaction_id", "amount"]
}`}
                </pre>
              </div>

              {/* 409 Conflict */}
              <div className="p-4 rounded-xl bg-[#091122] border-l-4 border-yellow-500 border-y border-r border-white/10 space-y-2">
                <div className="text-xs font-bold text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>409 Conflict — Pedido Duplicado</span>
                </div>
                <pre className="text-xs font-mono text-zinc-300 bg-black/30 p-2.5 rounded overflow-x-auto">
{`{ "success": false, "error": "Transação já registrada com o mesmo status." }`}
                </pre>
              </div>
            </div>
          </section>

          {/* Section 10: Status Transitions */}
          <section id="transitions" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-[#0066FF]" />
              <span>Transições de Status</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Você pode atualizar transações pendentes enviando um novo webhook com o mesmo <code>transaction_id</code>:
            </p>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#0B132B] text-zinc-400 border-b border-white/10 uppercase tracking-wider font-semibold font-sans">
                    <th className="py-2.5 px-4">Status Inicial</th>
                    <th className="py-2.5 px-4">Novo Status</th>
                    <th className="py-2.5 px-4 font-sans">Comportamento do Sistema</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-2.5 px-4 text-amber-400 font-bold">sale.pending</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">sale.approved</td>
                    <td className="py-2.5 px-4 text-zinc-300 font-sans">Efetiva a receita e dispara o evento Purchase no Meta CAPI</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-amber-400 font-bold">sale.pending</td>
                    <td className="py-2.5 px-4 text-red-400 font-bold">sale.refunded</td>
                    <td className="py-2.5 px-4 text-zinc-300 font-sans">Cancela a cobrança pendente sem afetar métricas de receita</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">sale.approved</td>
                    <td className="py-2.5 px-4 text-red-400 font-bold">sale.refunded</td>
                    <td className="py-2.5 px-4 text-zinc-300 font-sans">Registra estorno e abate o valor da receita líquida do anúncio</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 11: Order Bumps */}
          <section id="order-bumps" className="scroll-mt-8 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>Suporte a Order Bumps</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Para registrar vendas com múltiplos produtos (Order Bumps), envie a lista completa no array <code>products[]</code>:
            </p>

            <div className="p-4 rounded-xl bg-[#091122] border border-white/10 space-y-3">
              <div className="text-xs text-zinc-300 leading-relaxed">
                <strong>Regra Padrão:</strong> O primeiro item de <code>products[]</code> é considerado o produto principal. Todos os itens seguintes são computados como bumps extras:
              </div>
              <div className="p-3 rounded bg-black/30 font-mono text-xs text-purple-300">
{`"products": [
  { "id": 101, "name": "Treinamento Principal" },
  { "id": 102, "name": "Order Bump 1: E-book Exclusivo" },
  { "id": 103, "name": "Order Bump 2: Acesso VIP" }
]`}
              </div>
              <div className="text-xs text-zinc-400">
                • O campo <code>amount</code> deve conter a soma total de todos os itens da compra.<br />
                • As notificações no app e painel exibirão automaticamente: <em>"Treinamento Principal + 2 order bumps"</em>.
              </div>
            </div>
          </section>

          {/* Section 12: cURL Examples */}
          <section id="examples" className="scroll-mt-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <span>Exemplos de Chamadas cURL</span>
            </h2>

            {/* Example 1: Approved */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">1. Venda Aprovada (Pix / Cartão)</span>
                <button
                  onClick={() => copyToClipboard(curlApproved, 'curlApproved')}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'curlApproved' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'curlApproved' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#091122] border border-white/10 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{curlApproved}</code>
              </pre>
            </div>

            {/* Example 2: Pending to Approved */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">2. Ciclo de Boleto: Pendente → Compensado</span>
                <button
                  onClick={() => copyToClipboard(curlPending, 'curlPending')}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'curlPending' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'curlPending' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#091122] border border-white/10 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{curlPending}</code>
              </pre>
            </div>

            {/* Example 3: Refund */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">3. Notificação de Reembolso</span>
                <button
                  onClick={() => copyToClipboard(curlRefund, 'curlRefund')}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === 'curlRefund' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'curlRefund' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#091122] border border-white/10 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{curlRefund}</code>
              </pre>
            </div>
          </section>

          {/* Section 13: Notes & Best Practices */}
          <section id="notes" className="scroll-mt-8 space-y-4 pb-12">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-blue-400" />
              <span>Observações Técnicas & Boas Práticas</span>
            </h2>

            <div className="p-5 rounded-2xl bg-[#091122] border border-white/10 space-y-3 text-xs text-zinc-300 leading-relaxed">
              <ul className="space-y-2.5 list-disc pl-4">
                <li>
                  <strong>Timeouts & Retentativas:</strong> O webhook responde em menos de 150ms. Configure sua plataforma de envio com timeout padrão de 10 segundos. Se o seu gateway falhar ao enviar por oscilação de rede, repita o envio com o mesmo <code>transaction_id</code> para evitar duplicidade.
                </li>
                <li>
                  <strong>Filtro de IPs de Servidor:</strong> IPs de requisições de teste locais (127.0.0.1, 10.x, 192.168.x) ou User Agents genéricos de servidores (como <code>curl</code>, <code>GuzzleHttp</code>, <code>Postman</code>) são automaticamente descartados do cálculo de CAPI para não prejudicar seu score de EMQ.
                </li>
                <li>
                  <strong>Validação em Tempo Real:</strong> Cada evento aprovado aparece no seu painel em <strong>Vendas</strong> e no dashboard em tempo real.
                </li>
              </ul>
            </div>
          </section>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} PrimeTrack. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <a href="https://docs.primetrack.top" className="hover:text-white transition-colors">docs.primetrack.top</a>
            <span>•</span>
            <Link to="/integracoes" className="hover:text-white transition-colors">Integrações</Link>
            <span>•</span>
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
