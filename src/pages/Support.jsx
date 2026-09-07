import React, { useState } from 'react';
import { ChevronDown, MessageSquare, ExternalLink, Play } from 'lucide-react';

export default function Support() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const faqs = [
    {
      title: "Minhas vendas não está marcando nas campanhas",
      hasVideo: true,
      content: "Certifique-se de que os botões de checkout da sua landing page estão com o script da PrimeTrack instalado e que o webhook da sua plataforma (Kiwify, Hotmart, Eduzz) foi cadastrado corretamente com os eventos de compra aprovada."
    },
    {
      title: "Não tá marcando IC",
      hasVideo: true,
      content: "O evento InitiateCheckout (IC) é disparado automaticamente quando o lead clica em qualquer botão de compra da página. Verifique se o botão possui o link direto para o checkout ou a classe data-track-checkout."
    },
    {
      title: "Como faço para entrar no app?",
      hasVideo: false,
      content: "Basta baixar o app na App Store ou Google Play, usar o mesmo e-mail e senha cadastrados no painel web, e autorizar as notificações push."
    },
    {
      title: "Meu app não notificou a venda",
      hasVideo: false,
      content: "Verifique na aba Notificações se a opção 'Vendas aprovadas' está ativa e certifique-se de que as permissões de notificação estão concedidas nas configurações do seu celular."
    },
    {
      title: "Como funciona a notificação de saldo baixo e limite de gastos?",
      hasVideo: false,
      content: "Nosso sistema sincroniza de hora em hora o saldo das suas contas de anúncios do Meta. Caso o valor fique menor ou igual ao configurado, um push é enviado imediatamente."
    },
    {
      title: "Não está trackeando minhas vendas na Hotmart",
      hasVideo: false,
      content: "Na Hotmart, certifique-se de cadastrar o Webhook na versão 2.0.0 com a URL gerada na aba Integrações > Webhooks e selecionar o evento de 'Compra Aprovada'."
    },
    {
      title: "A plataforma que uso para vender não está na lista de integrações",
      hasVideo: false,
      content: "A PrimeTrack possui um Webhook Genérico (API) que aceita payloads em JSON de qualquer plataforma ou checkout proprietário. Entre em contato com nosso suporte para enviarmos a documentação técnica."
    }
  ];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Suporte & Dúvidas
        </h1>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Tire dúvidas rápidas com os vídeos abaixo. Se precisar, fale com a gente no WhatsApp.
        </p>
      </div>

      {/* Big Green Banner matching Screenshot 4 */}
      <div className="w-full bg-[#1FAF55] text-white p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-green-950/20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <MessageSquare className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              Precisa de ajuda direta?
            </h3>
            <p className="text-xs text-white/90 mt-0.5">
              Nosso time responde no WhatsApp em horário comercial.
            </p>
          </div>
        </div>

        <a
          href="https://instagram.com/primetrack.com.br"
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-[#1FAF55] font-bold text-xs flex items-center gap-2 shadow transition-all self-start sm:self-auto"
        >
          <span>Falar no WhatsApp</span>
          <span>→</span>
        </a>
      </div>

      {/* Perguntas frequentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="font-bold text-white font-sans text-sm">Perguntas frequentes</span>
          <span>7 dúvidas</span>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx}
                className="bg-[#0A1426] border border-[#13233E] rounded-xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
                >
                  <span>{faq.title}</span>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {faq.hasVideo && (
                      <span className="px-2 py-0.5 rounded bg-[#E52222] text-white text-[10px] font-bold flex items-center gap-1 font-mono">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Vídeo</span>
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 border-t border-[#13233E]/60 leading-relaxed font-sans">
                    {faq.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
