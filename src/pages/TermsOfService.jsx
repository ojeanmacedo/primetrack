import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#050A14] text-zinc-300 font-sans p-6 sm:p-12 selection:bg-[#1A6DFF] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-[#13233E] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#1A6DFF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Termos de Serviço</h1>
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
            <h2 className="text-lg font-bold text-white">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma <strong>PrimeTrack</strong>, você concorda em cumprir estes Termos de Serviço e todas as leis e regulamentos aplicáveis. Caso não concorde, não utilize este serviço.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Descrição do Serviço</h2>
            <p>
              A PrimeTrack fornece ferramentas de análise de tráfego pago, rastreamento via UTM, integração com Meta Conversions API e consolidação de métricas de anúncios para otimização de campanhas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Responsabilidades do Usuário</h2>
            <p>
              O usuário é o único responsável pela integridade das credenciais de acesso fornecidas e pelo uso correto das permissões do Meta concedidas ao aplicativo PrimeTrack, comprometendo-se a não violar as políticas de publicidade do Meta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Disponibilidade e Isenção de Garantias</h2>
            <p>
              O serviço é fornecido "como está". Nos empenhamos para manter a disponibilidade máxima do sistema, mas não garantimos que o serviço será ininterrupto ou livre de falhas decorrentes de instabilidades de provedores terceiros (como a Meta Graph API).
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
