import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Rules() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Regras de Automação
        </h1>
      </div>

      {/* Main Pro Feature Box matching Screenshot */}
      <div className="w-full bg-[#141C2E] border border-[#1E293B] rounded-xl min-h-[460px] p-8 sm:p-14 flex flex-col items-center justify-center text-center shadow-md">
        
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 font-sans">
          Recurso do Plano Pro
        </h3>
        
        <p className="text-xs sm:text-sm text-zinc-300 max-w-md mb-1 font-sans">
          Automatize o gerenciamento das suas campanhas com regras inteligentes.
        </p>

        <p className="text-xs text-zinc-500 mb-6 font-sans">
          Disponível nos planos Pro e Scale.
        </p>

        <button
          type="button"
          onClick={() => navigate('/planos')}
          className="px-6 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
        >
          Fazer Upgrade
        </button>

      </div>

    </div>
  );
}
