import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function Support() {
  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Suporte & Dúvidas
        </h1>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Se precisar de ajuda direta, fale com a gente no WhatsApp.
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

    </div>
  );
}
