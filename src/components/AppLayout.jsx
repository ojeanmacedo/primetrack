import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { getCurrentUser } from '../utils/auth';
import { 
  Eye, 
  RotateCw, 
  Edit3, 
  Trophy, 
  HelpCircle 
} from 'lucide-react';

export default function AppLayout() {
  const user = getCurrentUser();
  const location = useLocation();
  const [totalFaturado, setTotalFaturado] = useState(0);
  const [showValues, setShowValues] = useState(true);

  // Bloqueio de rota não autenticada: redireciona para /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(orders => {
        if (Array.isArray(orders)) {
          const approvedSum = orders
            .filter(o => o.status === 'approved' || o.status === 'paid' || o.status === 'pago')
            .reduce((acc, o) => acc + Number(o.amount || 0), 0);
          setTotalFaturado(approvedSum);
        }
      })
      .catch(() => {});
  }, [location.pathname]);

  const userName = user?.name || user?.email?.split('@')[0] || 'Jean Macedo';
  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'JM');

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0D1424] text-[#EDF2FF] flex font-sans">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0D1424]">
        
        {/* Topbar matching UTMify */}
        <header className="h-16 bg-[#0D1424] border-b border-[#182238] px-6 flex items-center justify-between shrink-0 select-none z-30">
          {/* Left: Page title and action icons */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Dashboard – Principal
            </h1>
            <div className="flex items-center gap-1 text-zinc-400">
              <button 
                onClick={() => setShowValues(!showValues)}
                className="p-1 hover:text-white transition-colors cursor-pointer" 
                title={showValues ? "Ocultar valores" : "Mostrar valores"}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => window.dispatchEvent(new Event('primetrack_profile_sync'))}
                className="p-1 hover:text-white transition-colors cursor-pointer" 
                title="Sincronizar dados"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button 
                className="p-1 hover:text-white transition-colors cursor-pointer" 
                title="Editar layout"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Language, Prêmios, Goal & User profile */}
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* Language Selector */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
              <span className="text-sm">🇧🇷</span>
              <span className="text-[11px] font-mono">PT-BR</span>
            </div>

            {/* Prêmios */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-[#1877F2] font-semibold cursor-pointer hover:underline">
              <Trophy className="w-3.5 h-3.5 text-[#1877F2]" />
              <span>Prêmios</span>
              <span className="text-zinc-500 text-[10px]">ⓘ</span>
            </div>

            {/* Goal progress */}
            <div className="hidden lg:flex items-center text-xs font-mono font-bold text-zinc-300">
              <span>R$ {totalFaturado.toFixed(2).replace('.', ',')}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span className="text-zinc-400">R$ 1M</span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#182238]">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight">
                  {userName}
                </div>
                <div className="text-[10px] text-zinc-400 font-sans leading-tight">
                  Usuário
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                {userInitials}
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-6 scrollbar-thin">
          <div className="w-full max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
