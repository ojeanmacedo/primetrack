import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

export default function LandingPage({ onGoToDashboard }) {
  const navigate = useNavigate();
  const user = typeof window !== 'undefined' ? getCurrentUser() : null;
  const handleGoToDashboard = onGoToDashboard || (() => navigate(user ? '/dashboard' : '/login'));
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "Por que meu CPA tá caro mesmo trocando criativo?",
      a: "Porque o problema não é o criativo. É o tracking. Se o pixel não conta certo quem comprou, a Meta otimiza no escuro e cobra caro pra chutar. Trocar criativo não resolve dado ruim. A gente arruma os dados completos e muito mais."
    },
    {
      q: "Cliente clica no anúncio, sai, e dias depois compra pelo link da bio. A PrimeTrack atribui pro anúncio?",
      a: "Atribui. Esse é o pesadelo de quem roda oferta no direto: você sabe que o anúncio funcionou, mas a venda cai como \"orgânica\" e seu ROAS no Gerenciador parece um lixo. A PrimeTrack guarda o clique \"pago\" do cara por 7 dias. Quando a venda chega como orgânica/bio/story, a gente reconhece o navegador dele e cola a venda no anúncio que originou o clique. Resultado: Meta recebe o sinal certo, sua campanha para de aparecer com ROAS baixo e você escala sem medo."
    },
    {
      q: "Tem taxa por venda? Percentual sobre faturamento?",
      a: "Não. Mensalidade fixa. Você escala de 10 vendas pra 1.000 e paga o mesmo. Sem surpresa no fim do mês."
    },
    {
      q: "Como é o teste grátis de 7 dias?",
      a: "Cria conta sem cartão, escolhe um plano e usa tudo por 7 dias: pixel, webhook, dashboard, regras e app. Zero cobrança nesse período."
    },
    {
      q: "Funciona com qual plataforma de pagamento?",
      a: "Kiwify, Lowify, Hotmart, Kirvano, Cakto, Braip, Eduzz, Doppus, Yampi, Lastlink, Monetizze, Perfectpay, Ticto, Vegacheckout, Cartpanda e muito mais. Webhook nativo pras todas plataformas do mercado."
    },
    {
      q: "O que é esse tal de nota do pixel que vocês falam?",
      a: "É a nota que a Meta dá pro seu pixel. Quanto mais alta, melhor o algoritmo entende quem compra de você — e mais barato fica o anúncio. A maioria das plataformas de tracking fica em 6 pra baixo. A PrimeTrack chega em 9.1. É a diferença entre escalar com lucro ou queimar verba."
    },
    {
      q: "Por que com a PrimeTrack não preciso de GTM (Google Tag Manager)?",
      a: "Porque a PrimeTrack já faz o trabalho do GTM direto no servidor. Sem container, sem trigger, sem dataLayer e sem configuração técnica complicada. Na PrimeTrack você instala 1 linha na página e conecta 1 webhook da plataforma de pagamento."
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Sem fidelidade. Cancela direto no painel."
    }
  ];

  return (
    <div className="min-h-screen bg-[#03060D] text-[#EDF2FF] font-['DM_Sans',sans-serif] selection:bg-[#5C9BFF] selection:text-white relative">
      
      {/* ── FLOATING PILL NAV (PrimeTrack) ── */}
      <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-[640px] bg-[#0B1424]/85 backdrop-blur-xl border border-white/10 rounded-full px-4 py-1.5 flex items-center justify-between shadow-2xl shadow-black/70">
        <a href="/" className="flex items-center gap-2">
          <img 
            src="/images/logo-primetrack.png?v=5" 
            alt="PrimeTrack" 
            className="w-6 h-6 object-contain shrink-0" 
          />
          <span className="text-sm font-extrabold text-white tracking-tight flex items-center">
            PrimeTrack
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-1 text-[12px] font-medium text-zinc-400">
          <a href="#pain" className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/5 transition-colors">Problema</a>
          <a href="#pixel" className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/5 transition-colors">Solução</a>
          <a href="#cross-attr" className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/5 transition-colors">Atribuição</a>
          <a href="#app" className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/5 transition-colors">App</a>
          <a href="#planos" className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/5 transition-colors">Planos</a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGoToDashboard}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#5C9BFF] hover:text-white text-[#060F1F] font-bold text-[12.5px] transition-all cursor-pointer shadow-md"
          >
            <span>Acessar painel</span>
            <span className="text-xs">→</span>
          </button>
        </div>
      </nav>

      {/* ── HERO SECTION (Objetivo e Limpo) ── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-[#070D1A] via-[#03060D] to-[#03060D]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(92,155,255,0.18),transparent_70%)] pointer-events-none" />

        {/* Hero Content */}
        <div className="max-w-[1000px] w-full mx-auto px-6 sm:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5C9BFF] px-3.5 py-1.5 rounded-full bg-[#5C9BFF]/10 border border-[#5C9BFF]/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#5C9BFF] animate-pulse" />
            <span>Tracking de alta precisão para Meta Ads</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-white leading-[1.05] mb-6">
            Tracking ruim = <span className="text-[#5C9BFF]">anúncio caro</span>.<br />
            Dados certos = <span className="text-white">escala no lucro</span>.
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed max-w-[680px] mx-auto mb-8">
            Envie dados completos via CAPI em tempo real, aumente a nota do pixel e pare de queimar verba com público errado.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleGoToDashboard}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-white hover:bg-[#5C9BFF] hover:text-white text-[#060F1F] font-bold text-sm tracking-tight shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>Começar teste grátis de 7 dias</span>
              <span className="w-6 h-6 rounded-full bg-[#060F1F] text-white flex items-center justify-center text-xs">
                →
              </span>
            </button>

            <a
              href="#planos"
              className="inline-flex items-center gap-1.5 px-6 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/15 transition-colors"
            >
              <span>Ver planos</span>
            </a>
          </div>

          {/* Mini métricas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mt-12 pt-8 border-t border-white/[0.08]">
            <div className="p-3">
              <strong className="block text-2xl font-extrabold text-white">9.1+</strong>
              <span className="text-xs text-zinc-400">Nota média de pixel</span>
            </div>
            <div className="p-3">
              <strong className="block text-2xl font-extrabold text-white">1 linha</strong>
              <span className="text-xs text-zinc-400">Instalação sem GTM</span>
            </div>
            <div className="p-3">
              <strong className="block text-2xl font-extrabold text-white">7 dias</strong>
              <span className="text-xs text-zinc-400">Janela de cross-session</span>
            </div>
            <div className="p-3">
              <strong className="block text-2xl font-extrabold text-white">0% taxa</strong>
              <span className="text-xs text-zinc-400">Mensalidade 100% fixa</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOR + ANTES/DEPOIS (#pain) ── */}
      <section id="pain" className="py-24 bg-[#03060D]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          
          <div className="text-center max-w-[880px] mx-auto mb-14">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5C9BFF] mb-4">
              <span className="w-4 h-[1px] bg-[#5C9BFF]" />
              <span>Sente isso?</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08]">
              Você não tá sozinho.<br />
              <span className="text-[#5C9BFF]">Quase todo gestor</span> tá passando por isso.
            </h2>
          </div>

          {/* 6 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="bg-[#070D1A] border border-white/[0.08] rounded-2xl p-5 hover:border-[#5C9BFF]/50 transition-colors">
              <span className="inline-block w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-extrabold text-xs leading-5 text-center mb-2.5">✕</span>
              <h4 className="text-base font-bold text-white mb-1.5">CPA subindo do nada</h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">Sexta tava 7 reais. Segunda virou 22. Você não mexeu em nada.</p>
            </div>

            <div className="bg-[#070D1A] border border-white/[0.08] rounded-2xl p-5 hover:border-[#5C9BFF]/50 transition-colors">
              <span className="inline-block w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-extrabold text-xs leading-5 text-center mb-2.5">✕</span>
              <h4 className="text-base font-bold text-white mb-1.5">Anúncio que morre rápido</h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">Criativo bom, escala 2 dias, ROAS despenca, você desliga. Toda semana.</p>
            </div>

            <div className="bg-[#070D1A] border border-white/[0.08] rounded-2xl p-5 hover:border-[#5C9BFF]/50 transition-colors">
              <span className="inline-block w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-extrabold text-xs leading-5 text-center mb-2.5">✕</span>
              <h4 className="text-base font-bold text-white mb-1.5">A Meta entrega errado</h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">Você vende pra mulher de 35. Ela manda anúncio pra moleque de 18 que só curte e some.</p>
            </div>

            <div className="bg-[#070D1A] border border-white/[0.08] rounded-2xl p-5 hover:border-[#5C9BFF]/50 transition-colors">
              <span className="inline-block w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-extrabold text-xs leading-5 text-center mb-2.5">✕</span>
              <h4 className="text-base font-bold text-white mb-1.5">Pixel contando errado</h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">Painel da Meta diz 30 vendas. Sua plataforma diz 12. Quem tá certo?</p>
            </div>

            <div className="bg-[#070D1A] border border-white/[0.08] rounded-2xl p-5 hover:border-[#5C9BFF]/50 transition-colors">
              <span className="inline-block w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-extrabold text-xs leading-5 text-center mb-2.5">✕</span>
              <h4 className="text-base font-bold text-white mb-1.5">Não consegue escalar</h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">Sobe R$50 no orçamento e o CPA dobra. A campanha vira outro bicho.</p>
            </div>

            <div className="bg-[#070D1A] border border-white/[0.08] rounded-2xl p-5 hover:border-[#5C9BFF]/50 transition-colors">
              <span className="inline-block w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-extrabold text-xs leading-5 text-center mb-2.5">✕</span>
              <h4 className="text-base font-bold text-white mb-1.5">Trocou criativo, não resolveu</h4>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">Já testou 40 ângulos, mil copies. Continua caro. Porque o problema <strong>nunca foi o criativo</strong>.</p>
            </div>
          </div>

          {/* Comparativo: Sem PrimeTrack vs Com PrimeTrack */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="rounded-2xl p-6 bg-red-950/20 border border-red-500/25">
              <h4 className="text-lg font-extrabold text-white mb-4">Sem PrimeTrack</h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                <li className="flex items-start gap-2.5"><span className="text-red-400 font-bold">✕</span><span>Pixel perde metade das vendas no caminho</span></li>
                <li className="flex items-start gap-2.5"><span className="text-red-400 font-bold">✕</span><span>Meta otimiza pra curioso e te cobra caro</span></li>
                <li className="flex items-start gap-2.5"><span className="text-red-400 font-bold">✕</span><span>Nota do pixel 4 a 6 — algoritmo no chute</span></li>
                <li className="flex items-start gap-2.5"><span className="text-red-400 font-bold">✕</span><span>Você troca criativo toda semana achando que vai resolver</span></li>
                <li className="flex items-start gap-2.5"><span className="text-red-400 font-bold">✕</span><span>Escala vira sinônimo de queimar verba</span></li>
              </ul>
            </div>

            <div className="rounded-2xl p-6 bg-[#070D1A] border border-[#5C9BFF] shadow-xl shadow-[#5C9BFF]/10">
              <h4 className="text-lg font-extrabold text-white mb-4">Com PrimeTrack</h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-200">
                <li className="flex items-start gap-2.5"><span className="text-[#5C9BFF] font-bold">✓</span><span>Toda venda chega na Meta com nome, e-mail, telefone, cidade</span></li>
                <li className="flex items-start gap-2.5"><span className="text-[#5C9BFF] font-bold">✓</span><span>Algoritmo aprende quem é seu comprador real</span></li>
                <li className="flex items-start gap-2.5"><span className="text-[#5C9BFF] font-bold">✓</span><span>NOTA DO PIXEL <strong>9.1</strong> — Meta para de chutar</span></li>
                <li className="flex items-start gap-2.5"><span className="text-[#5C9BFF] font-bold">✓</span><span>Mesmo criativo, CPA cai e ROAS sobe</span></li>
                <li className="flex items-start gap-2.5"><span className="text-[#5C9BFF] font-bold">✓</span><span>Escala virando lucro, não desespero</span></li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* ── NOTA DO PIXEL (#pixel) com Prova do YouTube ── */}
      <section id="pixel" className="py-24 bg-[#070D1A] border-t border-b border-white/[0.08]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          
          <div className="text-center max-w-[880px] mx-auto mb-14">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5C9BFF] mb-4">
              <span className="w-4 h-[1px] bg-[#5C9BFF]" />
              <span>01 / Onde sua grana some</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08] mb-4">
              O algoritmo <span className="text-[#5C9BFF]">não sabe</span> quem te dá lucro.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-[760px] mx-auto">
              Seu pixel desaprendeu quem compra de você. A Meta otimiza errado, mistura curioso com comprador e te cobra caro por isso. A PrimeTrack envia os dados certos pra Meta entender quem realmente compra. Seu pixel ganha força, a nota sobe e o CPA cai. <strong>Nota do pixel comprovada acima de 9.</strong> Se sua nota não ficar acima de 9, você recebe o dobro do dinheiro de volta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#03060D] border border-white/[0.08] flex gap-3.5 items-start hover:border-[#5C9BFF] transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#5C9BFF]/10 text-[#5C9BFF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                01
              </div>
              <div>
                <strong className="text-sm font-bold text-white block mb-0.5">Toda venda chega na Meta</strong>
                <span className="text-xs text-zinc-400">Bloqueador, iPhone, navegador anônimo. Não importa. Nenhuma compra fica fora do pixel.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#03060D] border border-white/[0.08] flex gap-3.5 items-start hover:border-[#5C9BFF] transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#5C9BFF]/10 text-[#5C9BFF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                02
              </div>
              <div>
                <strong className="text-sm font-bold text-white block mb-0.5">Mandamos o dado completo</strong>
                <span className="text-xs text-zinc-400">Nome, e-mail, telefone, cidade e IP em toda venda. Quanto mais dado, mais barato o anúncio fica.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#03060D] border border-white/[0.08] flex gap-3.5 items-start hover:border-[#5C9BFF] transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#5C9BFF]/10 text-[#5C9BFF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                03
              </div>
              <div>
                <strong className="text-sm font-bold text-white block mb-0.5">Acaba a venda dobrada</strong>
                <span className="text-xs text-zinc-400">O Meta para de receber a mesma compra 2x. Sem número inflado bagunçando sua otimização.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#03060D] border border-white/[0.08] flex gap-3.5 items-start hover:border-[#5C9BFF] transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#5C9BFF]/10 text-[#5C9BFF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                04
              </div>
              <div>
                <strong className="text-sm font-bold text-white block mb-0.5">Concorrente não rouba seu pixel</strong>
                <span className="text-xs text-zinc-400">A gente trava. Só o seu site usa. Ninguém mais entra no seu público.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#03060D] border border-white/[0.08] flex gap-3.5 items-start hover:border-[#5C9BFF] transition-colors md:col-span-2 lg:col-span-1">
              <div className="w-7 h-7 rounded-full bg-[#5C9BFF]/10 text-[#5C9BFF] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                05
              </div>
              <div>
                <strong className="text-sm font-bold text-white block mb-0.5">Instala em 1 linha</strong>
                <span className="text-xs text-zinc-400">Sem GTM, sem container, sem programador. Cola o código e pronto.</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── ATRIBUIÇÃO CROSS-SESSION (#cross-attr) ── */}
      <section id="cross-attr" className="py-24 bg-[#03060D]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          
          <div className="text-center max-w-[880px] mx-auto mb-14">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5C9BFF] mb-4">
              <span className="w-4 h-[1px] bg-[#5C9BFF]" />
              <span>Bônus / Tracking que não morre</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08] mb-4">
              Cliente entrou no anúncio, saiu, e <span className="text-[#5C9BFF]">comprou pela bio</span>?<br />
              Na PrimeTrack, você <span className="text-[#5C9BFF]">não perde</span> esse rastreio.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-[700px] mx-auto">
              Sabe aquela venda que cai como "orgânica, bio, story" e você fica sem saber qual anúncio vendeu? Acabou. A PrimeTrack lembra do <strong>1º clique</strong> desse cliente no seu anúncio e atribui pra campanha certa, sem você mexer em nada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#070D1A] border border-white/[0.08] text-center">
              <div className="w-12 h-12 rounded-full border border-dashed border-zinc-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h4 className="text-white font-bold text-base mb-2">O cara clica no seu anúncio</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Vê seu criativo no feed, entra no site, dá uma olhada e sai sem comprar. A PrimeTrack guarda esse clique no histórico dele por 7 dias.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#070D1A] border border-white/[0.08] text-center">
              <div className="w-12 h-12 rounded-full border border-dashed border-zinc-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h4 className="text-white font-bold text-base mb-2">Dias depois ele volta pela bio</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Lembra de você, abre o Instagram, clica no link da bio ou no story e finaliza a compra. Pra qualquer outro tracker isso vira venda <em>orgânica</em>. Crédito perdido.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#070D1A] border border-[#5C9BFF]/60 text-center shadow-lg shadow-[#5C9BFF]/10">
              <div className="w-12 h-12 rounded-full bg-[#5C9BFF] text-[#060F1F] font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h4 className="text-white font-bold text-base mb-2">A venda volta pro anúncio certo</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                O cliente clicou no anúncio, saiu, e comprou pela bio dias depois? A PrimeTrack reconhece o navegador dele (fbp, fbc ou IP) e cola essa venda no anúncio que trouxe ele. Meta recebe o sinal certo e seu ROAS mostra a verdade.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-8 max-w-[680px] mx-auto">
            <strong className="text-white">Resultado:</strong> sua campanha para de aparecer com ROAS baixo só porque o cliente comprou em outra sessão. Você escala com a verdade na mão.
          </p>

        </div>
      </section>

      {/* ── APP MOBILE (#app) ── */}
      <section id="app" className="py-24 bg-[#070D1A] border-t border-b border-white/[0.08]">
        <div className="max-w-[880px] mx-auto px-6 sm:px-8 text-center space-y-6">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5C9BFF] mx-auto">
            <span className="w-4 h-[1px] bg-[#5C9BFF]" />
            <span>03 / App Mobile</span>
          </span>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08]">
            Lucro, ROAS e venda <span className="text-[#5C9BFF]">na palma da mão</span>.
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-[600px] mx-auto">
            Acabou aquele trauma de abrir o Gerenciador 50 vezes por dia. Você vê venda caindo, ROAS subindo e lucro real em tempo real — direto do bolso.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-[640px] mx-auto pt-2">
            <div className="p-3.5 rounded-xl bg-[#03060D] border border-white/[0.08] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#5C9BFF] shrink-0" />
              <span className="text-xs sm:text-sm text-zinc-300 font-medium">Push na hora que cai venda aprovada</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#03060D] border border-white/[0.08] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#5C9BFF] shrink-0" />
              <span className="text-xs sm:text-sm text-zinc-300 font-medium">Dashboard ao vivo com lucro líquido</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#03060D] border border-white/[0.08] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#5C9BFF] shrink-0" />
              <span className="text-xs sm:text-sm text-zinc-300 font-medium">Sobe campanha pelo celular</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#03060D] border border-white/[0.08] flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#5C9BFF] shrink-0" />
              <span className="text-xs sm:text-sm text-zinc-300 font-medium">Mata anúncio caro sem abrir o Gerenciador</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEPS (Setup em 5 minutos) ── */}
      <section className="py-24 bg-[#03060D]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          
          <div className="text-center max-w-[880px] mx-auto mb-14">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5C9BFF] mb-4">
              <span className="w-4 h-[1px] bg-[#5C9BFF]" />
              <span>04 / Setup em 5 minutos</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08]">
              Sai do <span className="text-[#5C9BFF]">chute</span>.<br />
              Entra no <span className="text-[#5C9BFF]">lucro</span>.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#070D1A] border border-white/[0.08]">
              <div className="w-10 h-10 rounded-full border border-dashed border-zinc-600 text-white font-bold text-base flex items-center justify-center mb-4 font-mono">
                1
              </div>
              <h4 className="font-bold text-white text-base mb-1">Conecta o Facebook</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Liga sua conta de anúncio em 1 clique. Sem permissão estranha.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#070D1A] border border-white/[0.08]">
              <div className="w-10 h-10 rounded-full border border-dashed border-zinc-600 text-white font-bold text-base flex items-center justify-center mb-4 font-mono">
                2
              </div>
              <h4 className="font-bold text-white text-base mb-1">Cola o pixel</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">1 linha na página. Webhook plugado. Acabou.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#070D1A] border border-white/[0.08]">
              <div className="w-10 h-10 rounded-full border border-dashed border-zinc-600 text-white font-bold text-base flex items-center justify-center mb-4 font-mono">
                3
              </div>
              <h4 className="font-bold text-white text-base mb-1">Define suas regras</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Custo de plataforma, taxa, automação de pausa. Tudo no painel.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#070D1A] border border-white/[0.08]">
              <div className="w-10 h-10 rounded-full border border-dashed border-zinc-600 text-white font-bold text-base flex items-center justify-center mb-4 font-mono">
                4
              </div>
              <h4 className="font-bold text-white text-base mb-1">Escala sem medo</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">Lucro real, ROAS verdadeiro e venda em tempo real. Sem chute.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── PLANOS (#planos) ── */}
      <section id="planos" className="py-24 bg-[#070D1A] border-t border-b border-white/[0.08]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          
          <div className="text-center max-w-[880px] mx-auto mb-16">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5C9BFF] mb-4">
              <span className="w-4 h-[1px] bg-[#5C9BFF]" />
              <span>05 / Planos</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08] mb-4">
              Começa pequeno.<br />
              <span className="text-[#5C9BFF]">Escala</span> quando o CPA cair.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              7 dias grátis. Sem cartão pra testar. Sem fidelidade. Sem taxa por venda. Cancela quando quiser.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            
            {/* Basic */}
            <div className="bg-[#03060D] border border-white/[0.08] rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-500 transition-colors">
              <div>
                <h3 className="text-2xl font-extrabold text-white mb-2">Basic</h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-5xl font-black text-white">R$ 47</span>
                  <span className="text-sm text-zinc-500 font-mono">/mês</span>
                </div>
                <p className="text-[11px] font-mono text-[#5C9BFF] font-bold uppercase tracking-wider mb-6">Teste grátis por 7 dias</p>

                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Vendas ilimitadas</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>2 contas de anúncios</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>2 pixels de rastreio</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>1 dashboard</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>1 webhook</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Envio automático CAPI</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Notificações de vendas</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Alerta de saldo baixo</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>2 regras de automação</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Suporte via WhatsApp</span></li>
                  <li className="flex items-center gap-2 text-zinc-600 line-through"><span className="text-red-500 font-bold">×</span><span>Duplicar conjunto automático</span></li>
                </ul>
              </div>

              <button
                onClick={handleGoToDashboard}
                className="mt-8 w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-between transition-colors"
              >
                <span>Testar grátis por 7 dias</span>
                <span>→</span>
              </button>
            </div>

            {/* Pro (Destaque Azul Oficial) */}
            <div className="bg-[#5C9BFF] rounded-3xl p-8 flex flex-col justify-between shadow-2xl shadow-[#5C9BFF]/30 transform lg:-translate-y-2 text-white">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-extrabold text-white">Pro</h3>
                  <span className="px-2.5 py-1 rounded bg-white text-[#060F1F] font-mono text-[10px] font-bold uppercase tracking-wider">
                    Mais popular
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-5xl font-black text-white">R$ 97</span>
                  <span className="text-sm text-white/70 font-mono">/mês</span>
                </div>
                <p className="text-[11px] font-mono text-white/90 font-bold uppercase tracking-wider mb-6">Teste grátis por 7 dias</p>

                <ul className="space-y-2.5 text-xs sm:text-sm text-white/90">
                  <li className="flex items-center gap-2 font-bold"><span className="text-white">+</span><span>Tudo do Basic +</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>Vendas ilimitadas</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>5 contas de anúncios</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>5 pixels de rastreio</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>5 dashboards</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>5 webhooks</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>7 regras de automação</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>Notificações de vendas</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>Alerta de saldo baixo</span></li>
                  <li className="flex items-center gap-2"><span className="text-white">+</span><span>Suporte via WhatsApp</span></li>
                  <li className="flex items-center gap-2 text-white/40 line-through"><span className="text-red-300 font-bold">×</span><span>Duplicar conjunto automático</span></li>
                </ul>
              </div>

              <button
                onClick={handleGoToDashboard}
                className="mt-8 w-full py-3.5 px-4 rounded-xl bg-white hover:bg-white/90 text-[#060F1F] font-bold text-xs flex items-center justify-between transition-colors shadow-lg"
              >
                <span>Testar grátis por 7 dias</span>
                <span>→</span>
              </button>
            </div>

            {/* Scale */}
            <div className="bg-[#03060D] border border-white/[0.08] rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-500 transition-colors">
              <div>
                <h3 className="text-2xl font-extrabold text-white mb-2">Scale</h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-5xl font-black text-white">R$ 247</span>
                  <span className="text-sm text-zinc-500 font-mono">/mês</span>
                </div>
                <p className="text-[11px] font-mono text-[#5C9BFF] font-bold uppercase tracking-wider mb-6">Teste grátis por 7 dias</p>

                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-center gap-2 font-bold"><span className="text-[#5C9BFF]">+</span><span>Tudo do Pro +</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Vendas ilimitadas</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Contas ilimitadas</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Pixels ilimitados</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Dashboards ilimitados</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Webhooks ilimitados</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>15 regras de automação</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><strong className="text-white">Duplicar conjunto automático</strong></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Notificações de vendas</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Alerta de saldo baixo</span></li>
                  <li className="flex items-center gap-2"><span className="text-[#5C9BFF] font-bold">+</span><span>Suporte via WhatsApp</span></li>
                </ul>
              </div>

              <button
                onClick={handleGoToDashboard}
                className="mt-8 w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-between transition-colors"
              >
                <span>Testar grátis por 7 dias</span>
                <span>→</span>
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 bg-[#03060D]">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8">
          
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5C9BFF] mb-4">
              <span className="w-4 h-[1px] bg-[#5C9BFF]" />
              <span>06 / FAQ</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08]">
              Perguntas <span className="text-[#5C9BFF]">diretas</span>.
            </h2>
          </div>

          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between text-left py-2 text-base sm:text-lg font-medium text-white hover:text-[#5C9BFF] transition-colors cursor-pointer"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <span className="text-3xl text-zinc-500 shrink-0 font-light font-sans leading-none">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pt-2 pb-4 text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-36 bg-[#070D1A] text-center border-t border-b border-white/[0.08]">
        <div className="max-w-[880px] mx-auto px-6 sm:px-8">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.04] mb-8">
            Para de alimentar o <span className="text-[#5C9BFF]">Zuck</span>.<br />
            Começa a alimentar o <span className="text-[#5C9BFF]">seu bolso</span>.
          </h2>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleGoToDashboard}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white hover:bg-[#5C9BFF] hover:text-white text-[#060F1F] font-bold text-sm tracking-tight shadow-2xl transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>Testar grátis 7 dias</span>
              <span className="w-6 h-6 rounded-full bg-[#060F1F] text-white flex items-center justify-center text-xs">→</span>
            </button>
            <a
              href="#planos"
              className="px-6 py-4 rounded-full bg-transparent hover:bg-white/5 border border-white/20 text-white font-bold text-sm transition-colors"
            >
              Ver planos
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#070D1A] text-zinc-400 py-16 text-xs border-t border-white/[0.08]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-white/[0.08]">
            
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/images/logo-primetrack.png?v=5" 
                  alt="PrimeTrack" 
                  className="w-8 h-8 object-contain shrink-0" 
                />
                <span className="text-lg font-extrabold text-white tracking-tight flex items-center">
                  PrimeTrack
                </span>
              </div>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                O tracking que faz a Meta parar de chutar e seu CPA finalmente cair. Pra quem roda low ticket e quer escalar sem queimar verba.
              </p>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h5 className="font-mono text-white text-[11px] uppercase tracking-wider font-bold">
                Links rápidos
              </h5>
              <ul className="space-y-2 text-sm">
                <li><button onClick={handleGoToDashboard} className="hover:text-white transition-colors">Entrar</button></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="#pixel" className="hover:text-white transition-colors">Nota do pixel</a></li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h5 className="font-mono text-white text-[11px] uppercase tracking-wider font-bold">
                Contato
              </h5>
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-xs flex items-center gap-2.5">
                <span>✉️</span>
                <span>contato@primetrack.com.br</span>
              </div>
              <div className="text-[12px] text-zinc-400 leading-relaxed pt-2">
                <strong className="text-white block mb-0.5">PRIMETRACK</strong>
                CNPJ: 48.390.123/0001-02
              </div>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-zinc-500 uppercase">
            <span>© 2026 PrimeTrack · Todos os direitos reservados</span>
            <span>Feito no Brasil</span>
          </div>

        </div>
      </footer>

    </div>
  );
}
