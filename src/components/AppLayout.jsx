import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

export default function AppLayout() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSimulateQuickSale = () => {
    showToast('⚡ Venda de R$ 97,00 aprovada! Sinal Meta CAPI 9.3 enviado.');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#03060D] text-[#EDF2FF] flex font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#0A1426] border border-[#1A6DFF] text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#03060D]">
        
        {/* Top Header Bar */}
        <header className="h-14 bg-[#070D1A] border-b border-[#13233E] px-6 flex items-center justify-between text-xs">
          {/* CAPI Status Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A1426] border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="font-mono font-bold text-[11px] text-white">META CAPI 9.3 ATIVO</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSimulateQuickSale}
              className="px-3 py-1.5 rounded-lg bg-[#12223D] hover:bg-[#1A2D4F] border border-[#1A6DFF]/40 text-[#5C9BFF] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Simular Venda</span>
            </button>

            <NavLink 
              to="/"
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Ver Site / Landing</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </NavLink>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

      </div>

    </div>
  );
}
