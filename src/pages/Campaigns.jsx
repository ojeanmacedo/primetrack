import React, { useState } from 'react';
import { 
  Eye, 
  Plus, 
  ChevronDown, 
  Download, 
  RefreshCw, 
  SlidersHorizontal,
  Lock,
  ExternalLink,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2
} from 'lucide-react';

export default function Campaigns({ clientMode = 'clean', onGoToIntegrations }) {
  const [subTab, setSubTab] = useState('Campanhas');
  const [activeCreativePreview, setActiveCreativePreview] = useState(null); // { id: 'AD02' | 'AD01', title: string, mediaSrc: string }
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Qualquer');
  const [periodFilter, setPeriodFilter] = useState('Hoje');
  const [accountFilter, setAccountFilter] = useState('Todas');
  
  const [campaignActive, setCampaignActive] = useState(true);
  const [adset1Active, setAdset1Active] = useState(true);
  const [ad1Active, setAd1Active] = useState(true);
  const [ad2Active, setAd2Active] = useState(true);

  const subTabs = ['Contas', 'Campanhas', 'Conjuntos', 'Anúncios'];

  return (
    <div className="space-y-5 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Campanhas
          </h1>
          <button className="text-zinc-400 hover:text-white transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400">
            Agendando sincronização...
          </span>
          <button className="px-4 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand/30 transition-all">
            <Plus className="w-4 h-4" />
            <span>Criar Campanha</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Contas, Campanhas, Conjuntos, Anúncios */}
      <div className="flex items-center gap-6 border-b border-[#13233E] text-xs font-medium">
        {subTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`pb-3 transition-colors relative ${
              subTab === tab
                ? 'text-[#5C9BFF] font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{tab}</span>
            {subTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B66E3]" />
            )}
          </button>
        ))}
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Status</span>
            <span className="font-semibold">{statusFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          {/* Period Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Período</span>
            <span className="font-semibold">{periodFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          {/* Account Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Conta de Anúncio</span>
            <span className="font-semibold">{accountFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3 py-1.5 rounded-xl bg-[#0A1426] border border-[#13233E] text-zinc-300 hover:text-white flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Gerenciador</span>
          </button>

          <button className="px-3 py-1.5 rounded-xl bg-[#0A1426] border border-[#13233E] text-zinc-300 hover:text-white flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Colunas</span>
          </button>

          <button className="px-3 py-1.5 rounded-xl bg-[#0A1426] border border-[#13233E] text-zinc-300 hover:text-white flex items-center gap-1.5">
            <span>🎨 Cores</span>
            <Lock className="w-3 h-3 text-amber-400" />
          </button>

          <button className="px-3 py-1.5 rounded-xl bg-[#2B66E3] text-white font-bold flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          <button className="px-3 py-1.5 rounded-xl bg-[#0A1426] border border-[#13233E] text-zinc-300 hover:text-white flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ── VIEW 1: SUB-ABA CAMPANHAS ── */}
      {subTab === 'Campanhas' && (
            <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                  <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-xs tracking-wider border-b border-[#13233E]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                  </th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-4">CAMPANHA</th>
                  <th className="py-3 px-4">ÚLTIMA ATUALIZAÇÃO</th>
                  <th className="py-3 px-4">ORÇAMENTO</th>
                  <th className="py-3 px-4">GASTO</th>
                  <th className="py-3 px-4 text-center">VENDAS</th>
                  <th className="py-3 px-4 text-center">VENDAS PEND.</th>
                  <th className="py-3 px-4">FATURAMENTO</th>
                  <th className="py-3 px-4">LUCRO</th>
                  <th className="py-3 px-4">ROAS</th>
                  <th className="py-3 px-4">CPA</th>
                  <th className="py-3 px-4">ARPU</th>
                  <th className="py-3 px-4">IMPRESSÕES</th>
                  <th className="py-3 px-4">CLIQUES</th>
                  <th className="py-3 px-4">VISITAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13233E]/60 font-mono">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-3">
                    <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                  </td>

                  <td className="py-4 px-3">
                    <button
                      type="button"
                      onClick={() => setCampaignActive(!campaignActive)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        campaignActive ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        campaignActive ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </td>

                  <td className="py-4 px-4 font-sans">
                    <div className="font-bold text-white text-sm hover:text-[#5C9BFF] cursor-pointer">
                      TESTE MI
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">CA01</div>
                  </td>

                  <td className="py-4 px-4 text-[11px] font-sans">
                    <div className="text-zinc-300">
                      Orç: R$ 128,12 <span className="text-emerald-400 font-bold">↑ R$ 256,00</span>
                    </div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">
                      Gasto: R$ 5,48 | Lucro: R$ 10,51 | Vendas: 2 | CPA: R$ 2,74 | ROI: 2,92
                    </div>
                    <div className="text-zinc-500 text-[9px] font-mono mt-0.5">
                      🕒 07/09/2026 01:16
                    </div>
                  </td>

                  <td className="py-4 px-4 font-sans">
                    <div className="font-bold text-white font-mono">R$ 256,99</div>
                    <div className="text-[10px] text-zinc-400">Diário</div>
                  </td>

                  <td className="py-4 px-4 text-white font-bold">R$ 123,41</td>
                  <td className="py-4 px-4 text-white font-bold text-center">15</td>
                  <td className="py-4 px-4 text-zinc-400 text-center">11</td>
                  <td className="py-4 px-4 text-white font-bold">R$ 139,67</td>
                  <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">R$ 16,26</td>
                  <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">1,13</td>
                  <td className="py-4 px-4 font-bold text-[#5C9BFF]">R$ 8,23</td>
                  <td className="py-4 px-4 text-zinc-300">R$ 9,31</td>
                  <td className="py-4 px-4 text-zinc-300">4.168</td>
                  <td className="py-4 px-4 text-zinc-300">421</td>
                  <td className="py-4 px-4 text-zinc-300">317</td>
                </tr>
              </tbody>

              <tfoot className="bg-[#070D1A] font-bold border-t border-[#13233E] text-xs font-mono">
                <tr>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-4 font-sans text-white uppercase text-[11px]">1 CAMPANHA</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-white">R$ 123,41</td>
                  <td className="py-3 px-4 text-white text-center">15</td>
                  <td className="py-3 px-4 text-zinc-400 text-center">11</td>
                  <td className="py-3 px-4 text-white">R$ 139,67</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ 16,26</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">1,13</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ 8,23</td>
                  <td className="py-3 px-4 text-zinc-300">R$ 9,31</td>
                  <td className="py-3 px-4 text-zinc-300">4.168</td>
                  <td className="py-3 px-4 text-zinc-300">421</td>
                  <td className="py-3 px-4 text-zinc-300">317</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: SUB-ABA CONJUNTOS matching Screenshot 2 ── */}
      {subTab === 'Conjuntos' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans whitespace-nowrap">
              <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                  </th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-4">CONJUNTO</th>
                  <th className="py-3 px-4">ÚLTIMA ATUALIZAÇÃO</th>
                  <th className="py-3 px-4">ORÇAMENTO</th>
                  <th className="py-3 px-4">GASTO</th>
                  <th className="py-3 px-4 text-center">VENDAS</th>
                  <th className="py-3 px-4 text-center">VENDAS PEND.</th>
                  <th className="py-3 px-4">FATURAMENTO</th>
                  <th className="py-3 px-4">LUCRO</th>
                  <th className="py-3 px-4">ROAS</th>
                  <th className="py-3 px-4">CPA</th>
                  <th className="py-3 px-4">ARPU</th>
                  <th className="py-3 px-4">IMPRESSÕES</th>
                  <th className="py-3 px-4">CLIQUES</th>
                  <th className="py-3 px-4">VISITAS</th>
                  <th className="py-3 px-4">LANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13233E]/60 font-mono">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-3">
                    <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                  </td>

                  <td className="py-4 px-3">
                    <button
                      type="button"
                      onClick={() => setAdset1Active(!adset1Active)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        adset1Active ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        adset1Active ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </td>

                  <td className="py-4 px-4 font-sans">
                    <div className="font-bold text-white text-xs hover:text-[#5C9BFF] cursor-pointer truncate max-w-[180px]">
                      Novo conjunto de anúncios de...
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">CA01</div>
                  </td>

                  <td className="py-4 px-4 text-zinc-500 font-mono text-[11px]">
                    N/A
                  </td>

                  <td className="py-4 px-4 font-sans text-zinc-400 text-[11px]">
                    Usando orç. campanha
                  </td>

                  <td className="py-4 px-4 text-white font-bold">R$ 123,46</td>
                  <td className="py-4 px-4 text-white font-bold text-center">15</td>
                  <td className="py-4 px-4 text-zinc-400 text-center">11</td>
                  <td className="py-4 px-4 text-white font-bold">R$ 139,67</td>
                  <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">R$ 16,21</td>
                  <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">1,13</td>
                  <td className="py-4 px-4 font-bold text-[#5C9BFF]">R$ 8,23</td>
                  <td className="py-4 px-4 text-zinc-300">R$ 9,31</td>
                  <td className="py-4 px-4 text-zinc-300">4.168</td>
                  <td className="py-4 px-4 text-zinc-300">421</td>
                  <td className="py-4 px-4 text-zinc-300">317</td>

                  {/* Lance */}
                  <td className="py-4 px-4 font-sans text-xs">
                    <div className="font-bold text-white font-mono">R$ 11,02</div>
                    <div className="text-[10px] text-zinc-500">Limite de lance</div>
                  </td>
                </tr>
              </tbody>

              <tfoot className="bg-[#070D1A] font-bold border-t border-[#13233E] text-xs font-mono">
                <tr>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-4 font-sans text-white uppercase text-[11px]">1 CONJUNTO</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-white">R$ 123,46</td>
                  <td className="py-3 px-4 text-white text-center">15</td>
                  <td className="py-3 px-4 text-zinc-400 text-center">11</td>
                  <td className="py-3 px-4 text-white">R$ 139,67</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ 16,21</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">1,13</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ 8,23</td>
                  <td className="py-3 px-4 text-zinc-300">R$ 9,31</td>
                  <td className="py-3 px-4 text-zinc-300">4.168</td>
                  <td className="py-3 px-4 text-zinc-300">421</td>
                  <td className="py-3 px-4 text-zinc-300">317</td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 3: SUB-ABA ANÚNCIOS matching Screenshot 3 ── */}
      {subTab === 'Anúncios' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans whitespace-nowrap">
              <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                  </th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-4">ANÚNCIO</th>
                  <th className="py-3 px-4">ÚLTIMA ATUALIZAÇÃO</th>
                  <th className="py-3 px-4 text-center">PREVIEW</th>
                  <th className="py-3 px-4">GASTO</th>
                  <th className="py-3 px-4 text-center">VENDAS</th>
                  <th className="py-3 px-4 text-center">VENDAS PEND.</th>
                  <th className="py-3 px-4">FATURAMENTO</th>
                  <th className="py-3 px-4">LUCRO</th>
                  <th className="py-3 px-4">ROAS</th>
                  <th className="py-3 px-4">CPA</th>
                  <th className="py-3 px-4">ARPU</th>
                  <th className="py-3 px-4">IMPRESSÕES</th>
                  <th className="py-3 px-4">CLIQUES</th>
                  <th className="py-3 px-4">VISITAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13233E]/60 font-mono">
                
                {/* Row 1: AD02 (Lucro Positivo R$ 37,41) */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-3">
                    <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                  </td>

                  <td className="py-4 px-3">
                    <button
                      type="button"
                      onClick={() => setAd2Active(!ad2Active)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        ad2Active ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        ad2Active ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </td>

                  <td className="py-4 px-4 font-sans">
                    <div className="font-bold text-white text-xs hover:text-[#5C9BFF] cursor-pointer">
                      AD02
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">CA01</div>
                  </td>

                  <td className="py-4 px-4 text-zinc-500 font-mono text-[11px]">N/A</td>

                  <td className="py-4 px-4 text-center">
                    <button 
                      onClick={() => setActiveCreativePreview({
                        id: 'AD02',
                        title: 'AD02 · Privacy Mc Mirella',
                        mediaSrc: '/images/ad_video_creative.png',
                        type: 'video',
                        duration: '0:09',
                        currentTime: '0:01'
                      })}
                      title="Ver criativo do anúncio no Facebook"
                      className="p-1.5 rounded-lg border border-white/10 hover:border-[#1A6DFF] hover:bg-[#12223D] text-zinc-400 hover:text-[#5C9BFF] transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>

                  <td className="py-4 px-4 text-white font-bold">R$ 83,38</td>
                  <td className="py-4 px-4 text-white font-bold text-center">13</td>
                  <td className="py-4 px-4 text-zinc-400 text-center">7</td>
                  <td className="py-4 px-4 text-white font-bold">R$ 120,79</td>
                  <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">R$ 37,41</td>
                  <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">1,45</td>
                  <td className="py-4 px-4 font-bold text-[#5C9BFF]">R$ 6,41</td>
                  <td className="py-4 px-4 text-zinc-300">R$ 9,29</td>
                  <td className="py-4 px-4 text-zinc-300">3.073</td>
                  <td className="py-4 px-4 text-zinc-300">296</td>
                  <td className="py-4 px-4 text-zinc-300">220</td>
                </tr>

                {/* Row 2: AD01 (Lucro Negativo R$ -21,15 em vermelho) */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-3">
                    <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                  </td>

                  <td className="py-4 px-3">
                    <button
                      type="button"
                      onClick={() => setAd1Active(!ad1Active)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        ad1Active ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        ad1Active ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </td>

                  <td className="py-4 px-4 font-sans">
                    <div className="font-bold text-white text-xs hover:text-[#5C9BFF] cursor-pointer">
                      AD01
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">CA01</div>
                  </td>

                  <td className="py-4 px-4 text-zinc-500 font-mono text-[11px]">N/A</td>

                  <td className="py-4 px-4 text-center">
                    <button 
                      onClick={() => setActiveCreativePreview({
                        id: 'AD01',
                        title: 'AD01 · VIP Mc Mirella',
                        mediaSrc: '/images/ad_video_creative.png',
                        type: 'video',
                        duration: '0:09',
                        currentTime: '0:01'
                      })}
                      title="Ver criativo do anúncio no Facebook"
                      className="p-1.5 rounded-lg border border-white/10 hover:border-[#1A6DFF] hover:bg-[#12223D] text-zinc-400 hover:text-[#5C9BFF] transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>

                  <td className="py-4 px-4 text-white font-bold">R$ 40,03</td>
                  <td className="py-4 px-4 text-white font-bold text-center">2</td>
                  <td className="py-4 px-4 text-zinc-400 text-center">4</td>
                  <td className="py-4 px-4 text-white font-bold">R$ 18,88</td>
                  <td className="py-4 px-4 font-extrabold text-red-500">R$ -21,15</td>
                  <td className="py-4 px-4 font-bold text-red-400">0,47</td>
                  <td className="py-4 px-4 font-bold text-red-500">R$ 20,02</td>
                  <td className="py-4 px-4 text-zinc-300">R$ 9,44</td>
                  <td className="py-4 px-4 text-zinc-300">1.095</td>
                  <td className="py-4 px-4 text-zinc-300">125</td>
                  <td className="py-4 px-4 text-zinc-300">97</td>
                </tr>

              </tbody>

              {/* Total Row */}
              <tfoot className="bg-[#070D1A] font-bold border-t border-[#13233E] text-xs font-mono">
                <tr>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-4 font-sans text-white uppercase text-[11px]">2 ANÚNCIOS</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-white">R$ 123,41</td>
                  <td className="py-3 px-4 text-white text-center">15</td>
                  <td className="py-3 px-4 text-zinc-400 text-center">11</td>
                  <td className="py-3 px-4 text-white">R$ 139,67</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ 16,26</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">1,13</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ 8,23</td>
                  <td className="py-3 px-4 text-zinc-300">R$ 9,31</td>
                  <td className="py-3 px-4 text-zinc-300">4.168</td>
                  <td className="py-3 px-4 text-zinc-300">421</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Facebook Ad Creative Preview Modal matching Screenshot */}
      {activeCreativePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setActiveCreativePreview(null)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-[#000000] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button (x) */}
            <button
              onClick={() => setActiveCreativePreview(null)}
              className="absolute top-3 right-3 z-30 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white flex items-center justify-center transition-all border border-white/20"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Video / Creative Viewport */}
            <div className="relative w-full aspect-[9/16] max-h-[78vh] bg-black flex items-center justify-center overflow-hidden select-none">
              <img 
                src={activeCreativePreview.mediaSrc} 
                alt={activeCreativePreview.title}
                className="w-full h-full object-contain"
              />

              {/* Subtitle / Overlay highlight if image is raw */}
              <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 text-center pointer-events-none">
                {/* Red headline bar matching the screenshot */}
              </div>

              {/* Video Player Control Bar overlay at bottom */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col gap-2">
                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                  <div className="h-full bg-white rounded-full w-[12%]" />
                </div>

                <div className="flex items-center justify-between text-white text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="hover:text-[#5C9BFF] transition-colors"
                      title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    <span className="text-[11px] text-white/90">
                      0:01 / 0:09
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-white/80">
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className="hover:text-white transition-colors"
                      title={isMuted ? 'Ativar som' : 'Silenciar'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <button 
                      className="hover:text-white transition-colors"
                      title="Tela cheia"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex flex-col gap-0.5 cursor-pointer hover:text-white">
                      <span className="w-1 h-1 bg-current rounded-full" />
                      <span className="w-1 h-1 bg-current rounded-full" />
                      <span className="w-1 h-1 bg-current rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Meta Info Bar */}
            <div className="bg-[#0A1426] border-t border-white/10 px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white truncate max-w-[200px]">
                  {activeCreativePreview.title}
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 uppercase">
                Creative Meta Ads
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
