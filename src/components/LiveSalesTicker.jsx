import React from 'react';
import { DollarSign, CheckCircle, Zap } from 'lucide-react';

export default function LiveSalesTicker({ orders = [] }) {
  const displayOrders = orders.slice(0, 10);

  if (!displayOrders.length) return null;

  // Duplicamos a lista para criar um loop contínuo infinito suave
  const items = [...displayOrders, ...displayOrders];

  return (
    <div className="relative border-b border-white/5 bg-[#050A14]/80 backdrop-blur-md overflow-hidden py-2 text-xs font-mono select-none">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#03060D] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#03060D] to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 flex items-center gap-1.5 text-emerald-400 font-semibold border-r border-white/10 z-20 bg-[#050A14]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>AO VIVO</span>
        </div>

        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="animate-ticker flex items-center gap-8 pl-4">
            {items.map((ord, idx) => (
              <div key={`${ord.id}-${idx}`} className="inline-flex items-center gap-2 text-zinc-300">
                <span className="px-1.5 py-0.5 rounded bg-brand/15 text-brand-light font-bold text-[10px]">
                  {ord.gateway}
                </span>
                <span className="font-sans text-white font-medium">
                  {ord.customer?.name?.split(' ')[0] || 'Cliente'}
                </span>
                <span className="text-emerald-400 font-bold">
                  +R$ {Number(ord.amount).toFixed(2).replace('.', ',')}
                </span>
                <span className="text-zinc-400 text-[11px] truncate max-w-[140px]">
                  • {ord.attribution?.ad || 'Criativo #1'}
                </span>
                {ord.attribution?.matchType === 'cross_session_bio' && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px]">
                    Salvo da Bio 🎯
                  </span>
                )}
                <span className="text-zinc-600">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
