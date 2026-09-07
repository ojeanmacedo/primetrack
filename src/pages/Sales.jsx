import React, { useState } from 'react';
import { 
  ChevronDown, 
  Download, 
  Eye, 
  Check, 
  X, 
  Clock
} from 'lucide-react';

export default function Sales() {
  const [period, setPeriod] = useState('Hoje');

  const salesData = [
    {
      id: 1,
      name: 'Juliano dos reis machado',
      email: 'julianodober6@gmail.com',
      city: 'Ribeirao Preto, Sao Paulo',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'approved',
      reason: '—',
      date: '07/09 12:52'
    },
    {
      id: 2,
      name: 'Hallan Fabiano pasquim',
      email: 'hallanfabiano20@gmail.com',
      city: 'Iguatemi, Mato Grosso Do Sul',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'approved',
      reason: '—',
      date: '07/09 12:05'
    },
    {
      id: 3,
      name: 'Joselas Eyji Tsugue',
      email: 'joselasu@gmail.com',
      city: 'Belo Horizonte, Minas Gerais',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'pending',
      reason: 'Pendente',
      date: '07/09 11:54'
    },
    {
      id: 4,
      name: 'Savio Gabriel Querino Sampaio',
      email: 'saviogabriel051@gmail.com',
      city: 'Rio De Janeiro, Rio De Janeiro',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'approved',
      reason: '—',
      date: '07/09 10:49'
    },
    {
      id: 5,
      name: 'Jorge Armando da Silva',
      email: 'jorgedody138@gmail.com',
      city: 'Sao José Dos Campos, Sao Paulo',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'approved',
      reason: '—',
      date: '07/09 10:37'
    },
    {
      id: 6,
      name: 'Ivaneu pereira',
      email: 'vaniupereira@gmail.com',
      city: 'Goiânia, Goiás',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'approved',
      reason: '—',
      date: '07/09 09:52'
    },
    {
      id: 7,
      name: 'Marcio aparecido costa',
      email: 'marcioaparecido3337@gmail.com',
      city: 'Palhoça, Santa Catarina',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'pending',
      reason: 'Pendente',
      date: '07/09 08:51'
    },
    {
      id: 8,
      name: 'Gerson silva',
      email: 'gersonssilvasilva05122019@gmail.com',
      city: 'Paragominas, Pará',
      product: 'Privacy Mc Mirella',
      value: 'R$ 9,44',
      platform: 'Monsterpay',
      source: 'FB',
      campaign: 'TESTE MI',
      capi: 'pending',
      reason: 'Pendente',
      date: '07/09 08:08'
    }
  ];

  return (
    <div className="space-y-4 pb-16">
      
      {/* Top Header & Filters Bar matching Screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Vendas
          </h1>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            26 vendas hoje
          </p>
        </div>

        {/* Right Filters matching Screenshot */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          <div className="flex items-center gap-2 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todas as origens</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          <div className="flex items-center gap-2 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todos os produtos</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          <div className="flex items-center gap-2 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todas as plataformas</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          <div className="flex items-center gap-2 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todas as campanhas</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          {/* Eye Icon */}
          <button className="p-2 bg-[#0A1426] border border-[#13233E] rounded-xl text-zinc-400 hover:text-white transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Period Pills */}
          <div className="flex items-center bg-[#0A1426] border border-[#13233E] rounded-xl p-0.5 text-xs">
            {['Hoje', 'Ontem', '7d'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-[#12223D] text-[#5C9BFF] font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button className="px-3 py-1.5 rounded-xl bg-[#0A1426] hover:bg-[#12223D] border border-[#13233E] text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>

        </div>
      </div>

      {/* Main Table matching Screenshot */}
      <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans whitespace-nowrap">
            <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
              <tr>
                <th className="py-3 px-4">CLIENTE</th>
                <th className="py-3 px-4">PRODUTO</th>
                <th className="py-3 px-4">VALOR</th>
                <th className="py-3 px-4">PLATAFORMA</th>
                <th className="py-3 px-4">ORIGEM</th>
                <th className="py-3 px-4">CAMPANHA</th>
                <th className="py-3 px-4 text-center">CAPI</th>
                <th className="py-3 px-4">MOTIVO</th>
                <th className="py-3 px-4 text-right">DATA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13233E]/60">
              {salesData.map((sale) => (
                <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Cliente */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white text-xs">
                      {sale.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {sale.email}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      📍 {sale.city}
                    </div>
                  </td>

                  {/* Produto */}
                  <td className="py-3.5 px-4 text-zinc-300 text-xs font-medium">
                    {sale.product}
                  </td>

                  {/* Valor */}
                  <td className="py-3.5 px-4 font-mono font-bold text-white text-xs">
                    {sale.value}
                  </td>

                  {/* Plataforma */}
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-[#070D1A] border border-[#13233E] text-zinc-300 font-mono text-[11px]">
                      {sale.platform}
                    </span>
                  </td>

                  {/* Origem */}
                  <td className="py-3.5 px-4">
                    <span className="w-6 h-6 rounded-full bg-[#1877F2] text-white font-bold text-[10px] flex items-center justify-center font-mono shadow-sm">
                      {sale.source}
                    </span>
                  </td>

                  {/* Campanha */}
                  <td className="py-3.5 px-4 font-mono text-xs text-zinc-300">
                    {sale.campaign}
                  </td>

                  {/* CAPI */}
                  <td className="py-3.5 px-4 text-center">
                    {sale.capi === 'approved' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2B66E3] text-white font-mono text-[10px] font-bold">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>9.3</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                        <X className="w-3 h-3" />
                        <span>0</span>
                      </span>
                    )}
                  </td>

                  {/* Motivo */}
                  <td className="py-3.5 px-4 font-mono text-xs">
                    {sale.reason === 'Pendente' ? (
                      <span className="text-zinc-400 flex items-center gap-1">
                        <span>⏳</span> Pendente
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>

                  {/* Data */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-400">
                    {sale.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination matching Screenshot */}
        <div className="p-3 bg-[#070D1A] border-t border-[#13233E] flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>Página 1 de 4</span>
          <button className="px-3 py-1 rounded-lg bg-[#0A1426] hover:bg-[#12223D] border border-[#13233E] text-zinc-300 hover:text-white transition-colors cursor-pointer">
            Próxima →
          </button>
        </div>
      </div>

    </div>
  );
}
