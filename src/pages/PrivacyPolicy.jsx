import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#050A14] text-zinc-300 font-sans p-6 sm:p-12 selection:bg-[#1A6DFF] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-[#13233E] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#1A6DFF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Política de Privacidade</h1>
              <p className="text-xs text-zinc-500 font-mono">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#5C9BFF] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-300">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Visão Geral</h2>
            <p>
              A <strong>PrimeTrack</strong> valoriza e respeita a sua privacidade. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações ao utilizar nossa plataforma de atribuição de vendas e rastreamento de anúncios (Meta Ads).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Dados Coletados</h2>
            <p>Para fornecer nossos serviços de análise e rastreamento, coletamos:</p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li><strong>Informações da Conta:</strong> Nome, endereço de e-mail e dados cadastrais.</li>
              <li><strong>Dados da Integração Meta:</strong> Identificador de conta de anúncio, nomes de campanhas, métricas de desempenho (impressões, cliques, gastos, saldo de conta) via Meta Graph API e Marketing API.</li>
              <li><strong>Dados de Eventos e Conversões:</strong> Parâmetros UTM, identificadores de transações, valores de vendas e status enviados por gateways de pagamento integrados.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Finalidade do Uso dos Dados</h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Exibir relatórios unificados de ROI, ROAS, CPA e métricas de campanhas do Meta Ads.</li>
              <li>Disparar eventos de conversão via Meta Conversions API (CAPI).</li>
              <li>Sincronizar e monitorar saldos e status das contas de anúncios selecionadas pelo usuário.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Não Compartilhamento e Segurança</h2>
            <p>
              A PrimeTrack <strong>não comercializa, não aluga e não compartilha</strong> seus dados com terceiros para fins de marketing direto. Seus tokens de acesso do Facebook são transmitidos de forma segura e armazenados de modo restrito.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">5. Exclusão e Revogação de Dados</h2>
            <p>
              Você pode desconectar sua conta do Facebook a qualquer momento através da aba de Integrações no painel da PrimeTrack, ou solicitar a exclusão definitiva dos seus dados entrando em contato pelo e-mail de suporte.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">6. Contato</h2>
            <p>
              Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento de dados da plataforma, entre em contato através do nosso canal oficial de suporte na PrimeTrack.
            </p>
          </section>
        </div>

        <div className="border-t border-[#13233E] pt-6 text-center text-xs text-zinc-600 font-mono">
          PrimeTrack &copy; {new Date().getFullYear()} — Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
