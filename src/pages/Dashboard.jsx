import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getTrialStatus } from '../utils/auth';
import { 
  Flame, 
  RotateCw, 
  Download, 
  Eye, 
  Edit3, 
  Palette, 
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function Dashboard({ onSimulateSale }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);
  const [period, setPeriod] = useState('Hoje');
  const [campaigns, setCampaigns] = useState([
    {
      id: "52604661655655",
      name: "TESTE MI",
      status: true,
      spend: "123.41",
      sales: 15,
      revenue: "139.67"
    }
  ]);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const activeOnly = data.filter(c => c.name === 'TESTE MI' || (c.status === true && Number(c.spend) > 0));
          setCampaigns(activeOnly.length > 0 ? activeOnly : data);
        }
      })
      .catch(err => console.log('Fetch campaigns error:', err));
  }, []);

  const periods = ['Hoje', 'Ontem', '7 dias', '15 dias', '30 dias', 'Personalizado'];

  const periodDataMap = {
    'Hoje': {
      spend: 123.41,
      revenue: 139.67,
      profit: 16.26,
      sales: 15,
      pendingSales: 11,
      pendingValue: 125.72,
      roas: '1.13',
      cpa: '8.23',
      arpu: '9.31',
      margin: '11.7%',
      clicks: 421,
      visits: 317,
      ics: 192,
      initSales: 26,
      approvedSales: 15,
      pixApproval: '57.7%',
      pixSales: 15,
      sources: { fb: 9, ig: 6 },
      hourly: [
        { h: '00h', v: 80 }, { h: '01h', v: 0 }, { h: '02h', v: 0 }, { h: '03h', v: 45 },
        { h: '04h', v: 45 }, { h: '05h', v: 45 }, { h: '06h', v: 45 }, { h: '07h', v: 80 },
        { h: '08h', v: 45 }, { h: '09h', v: 45 }, { h: '10h', v: 45 }, { h: '11h', v: 80 },
        { h: '12h', v: 80 }, { h: '13h', v: 0 }, { h: '14h', v: 0 }, { h: '15h', v: 0 },
        { h: '16h', v: 0 }, { h: '17h', v: 0 }, { h: '18h', v: 0 }, { h: '19h', v: 0 },
        { h: '20h', v: 0 }, { h: '21h', v: 0 }, { h: '22h', v: 0 }, { h: '23h', v: 0 }
      ]
    },
    'Ontem': {
      spend: 142.50,
      revenue: 198.24,
      profit: 55.74,
      sales: 21,
      pendingSales: 14,
      pendingValue: 158.40,
      roas: '1.39',
      cpa: '6.78',
      arpu: '9.44',
      margin: '28.1%',
      clicks: 512,
      visits: 394,
      ics: 238,
      initSales: 34,
      approvedSales: 21,
      pixApproval: '60.0%',
      pixSales: 21,
      sources: { fb: 13, ig: 8 },
      hourly: [
        { h: '00h', v: 30 }, { h: '01h', v: 20 }, { h: '02h', v: 0 }, { h: '03h', v: 20 },
        { h: '04h', v: 0 }, { h: '05h', v: 30 }, { h: '06h', v: 50 }, { h: '07h', v: 70 },
        { h: '08h', v: 85 }, { h: '09h', v: 90 }, { h: '10h', v: 75 }, { h: '11h', v: 60 },
        { h: '12h', v: 95 }, { h: '13h', v: 80 }, { h: '14h', v: 65 }, { h: '15h', v: 55 },
        { h: '16h', v: 70 }, { h: '17h', v: 85 }, { h: '18h', v: 90 }, { h: '19h', v: 100 },
        { h: '20h', v: 85 }, { h: '21h', v: 75 }, { h: '22h', v: 60 }, { h: '23h', v: 40 }
      ]
    },
    '7 dias': {
      spend: 890.20,
      revenue: 1113.92,
      profit: 223.72,
      sales: 118,
      pendingSales: 78,
      pendingValue: 882.10,
      roas: '1.25',
      cpa: '7.54',
      arpu: '9.44',
      margin: '20.1%',
      clicks: 3120,
      visits: 2410,
      ics: 1450,
      initSales: 198,
      approvedSales: 118,
      pixApproval: '59.6%',
      pixSales: 118,
      sources: { fb: 72, ig: 46 },
      hourly: [
        { h: '00h', v: 50 }, { h: '01h', v: 35 }, { h: '02h', v: 20 }, { h: '03h', v: 30 },
        { h: '04h', v: 25 }, { h: '05h', v: 40 }, { h: '06h', v: 60 }, { h: '07h', v: 75 },
        { h: '08h', v: 80 }, { h: '09h', v: 85 }, { h: '10h', v: 90 }, { h: '11h', v: 85 },
        { h: '12h', v: 95 }, { h: '13h', v: 80 }, { h: '14h', v: 75 }, { h: '15h', v: 70 },
        { h: '16h', v: 80 }, { h: '17h', v: 85 }, { h: '18h', v: 90 }, { h: '19h', v: 100 },
        { h: '20h', v: 95 }, { h: '21h', v: 85 }, { h: '22h', v: 70 }, { h: '23h', v: 55 }
      ]
    },
    '15 dias': {
      spend: 1840.00,
      revenue: 2322.24,
      profit: 482.24,
      sales: 246,
      pendingSales: 162,
      pendingValue: 1832.00,
      roas: '1.26',
      cpa: '7.48',
      arpu: '9.44',
      margin: '20.8%',
      clicks: 6480,
      visits: 5020,
      ics: 3010,
      initSales: 410,
      approvedSales: 246,
      pixApproval: '60.3%',
      pixSales: 246,
      sources: { fb: 152, ig: 94 },
      hourly: [
        { h: '00h', v: 55 }, { h: '01h', v: 40 }, { h: '02h', v: 25 }, { h: '03h', v: 35 },
        { h: '04h', v: 30 }, { h: '05h', v: 45 }, { h: '06h', v: 65 }, { h: '07h', v: 80 },
        { h: '08h', v: 85 }, { h: '09h', v: 90 }, { h: '10h', v: 95 }, { h: '11h', v: 90 },
        { h: '12h', v: 100 }, { h: '13h', v: 85 }, { h: '14h', v: 80 }, { h: '15h', v: 75 },
        { h: '16h', v: 85 }, { h: '17h', v: 90 }, { h: '18h', v: 95 }, { h: '19h', v: 100 },
        { h: '20h', v: 95 }, { h: '21h', v: 90 }, { h: '22h', v: 75 }, { h: '23h', v: 60 }
      ]
    },
    '30 dias': {
      spend: 3820.00,
      revenue: 4644.48,
      profit: 824.48,
      sales: 492,
      pendingSales: 310,
      pendingValue: 3510.00,
      roas: '1.21',
      cpa: '7.76',
      arpu: '9.44',
      margin: '17.8%',
      clicks: 13420,
      visits: 10390,
      ics: 6240,
      initSales: 830,
      approvedSales: 492,
      pixApproval: '61.2%',
      pixSales: 492,
      sources: { fb: 305, ig: 187 },
      hourly: [
        { h: '00h', v: 60 }, { h: '01h', v: 45 }, { h: '02h', v: 30 }, { h: '03h', v: 40 },
        { h: '04h', v: 35 }, { h: '05h', v: 50 }, { h: '06h', v: 70 }, { h: '07h', v: 85 },
        { h: '08h', v: 90 }, { h: '09h', v: 95 }, { h: '10h', v: 100 }, { h: '11h', v: 95 },
        { h: '12h', v: 100 }, { h: '13h', v: 90 }, { h: '14h', v: 85 }, { h: '15h', v: 80 },
        { h: '16h', v: 90 }, { h: '17h', v: 95 }, { h: '18h', v: 100 }, { h: '19h', v: 100 },
        { h: '20h', v: 95 }, { h: '21h', v: 90 }, { h: '22h', v: 80 }, { h: '23h', v: 65 }
      ]
    }
  };

  const currentMetrics = periodDataMap[period] || periodDataMap['Hoje'];

  return (
    <div className="space-y-5 pb-16">
      
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dashboard Principal
          </h1>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter Pills */}
          <div className="flex items-center bg-[#0A1426] border border-[#13233E] rounded-xl p-1 text-xs">
            {periods.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  period === p
                    ? 'bg-[#12223D] text-[#5C9BFF] font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Account selector */}
          <div className="flex items-center gap-2 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-xs text-zinc-300 font-medium cursor-pointer">
            <span>Todas as contas</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          {/* Buttons */}
          <button 
            onClick={onSimulateSale}
            className="px-3 py-1.5 rounded-xl bg-[#0A1426] hover:bg-[#12223D] border border-[#13233E] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Atualizar dados"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          <button 
            className="px-3 py-1.5 rounded-xl bg-[#0A1426] hover:bg-[#12223D] border border-[#13233E] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>

          <div className="flex items-center gap-1 bg-[#0A1426] border border-[#13233E] p-1 rounded-xl text-zinc-400">
            <button className="p-1 hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
            <button className="p-1 hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button>
            <button className="p-1 hover:text-white"><Palette className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Red Alert Banner - Somente exibido se o período de 7 dias grátis expirar (removido da conta principal) */}
      {trialStatus.showExpiredBanner && (
        <div className="w-full bg-[#E52222] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 fill-current shrink-0" />
            <span>
              Seu período de teste de 7 dias grátis expirou! Renove seu plano para evitar a pausa dos serviços.
            </span>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/planos')}
            className="underline hover:text-zinc-200 text-xs font-bold shrink-0 ml-4 cursor-pointer"
          >
            Assinar agora →
          </button>
        </div>
      )}

      {/* KPI Row 1: Faturamento, Lucro, Gasto, CPA, ARPU, ROAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Faturamento */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">FATURAMENTO</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.revenue.toFixed(2)}
          </div>
        </div>

        {/* Lucro */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">LUCRO</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5C9BFF] mt-1">
            R$ {currentMetrics.profit.toFixed(2)}
          </div>
          <div className="mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
              ↑ Positivo
            </span>
          </div>
        </div>

        {/* Gasto em Ads */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">GASTO EM ADS</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.spend.toFixed(2)}
          </div>
        </div>

        {/* CPA */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">CPA</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.cpa}
          </div>
        </div>

        {/* ARPU */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">ARPU</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.arpu}
          </div>
        </div>

        {/* ROAS */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">ROAS</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5C9BFF] mt-1">
            {currentMetrics.roas}x
          </div>
          <div className="mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
              ↑ Ok
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row 2: Vendas Aprovadas, Vendas Pendentes, Chargeback, Margem */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Vendas Aprovadas */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">VENDAS APROVADAS</div>
          <div className="text-2xl font-extrabold text-white mt-1">{currentMetrics.sales}</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">R$ {currentMetrics.revenue.toFixed(2)}</div>
        </div>

        {/* Vendas Pendentes */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">VENDAS PENDENTES</div>
          <div className="text-2xl font-extrabold text-white mt-1">R$ {currentMetrics.pendingValue.toFixed(2)}</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{currentMetrics.pendingSales} vendas</div>
        </div>

        {/* Chargeback */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">CHARGEBACK</div>
          <div className="text-2xl font-extrabold text-white mt-1">0%</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">0 vendas</div>
        </div>

        {/* Margem */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">MARGEM</div>
          <div className="text-2xl font-extrabold text-[#5C9BFF] mt-1">{currentMetrics.margin}</div>
          <div className="mt-0.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
              ↑ Positivo
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Saldo das Contas + Funil de Conversão Meta Ads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Saldo das Contas (4 cols) */}
        <div className="lg:col-span-4 bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-white mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Saldo das Contas</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#13233E]">
                <div>
                  <div className="font-bold text-white">CA01</div>
                  <div className="text-[10px] font-mono text-zinc-500">1892117896682979</div>
                </div>
                <div className="font-mono font-bold text-emerald-400">R$ 0,00</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">CA02 JEFFREY</div>
                  <div className="text-[10px] font-mono text-zinc-500">1101817232408751</div>
                </div>
                <div className="font-mono font-bold text-emerald-400">R$ 0,00</div>
              </div>
            </div>
          </div>
        </div>

        {/* Funil de Conversão (8 cols) */}
        <div className="lg:col-span-8 bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
          <div className="text-xs font-bold text-white mb-6">
            Funil de Conversão (Meta Ads) — {period}
          </div>

          <div className="grid grid-cols-5 gap-2 text-center relative items-center">
            
            {/* Stage 1: Cliques */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white">
                100%
              </div>
              <div className="mt-2 text-sm font-bold text-white">{currentMetrics.clicks}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">CLIQUES</div>
            </div>

            {/* Stage 2: Vis. Página */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                {((currentMetrics.visits / currentMetrics.clicks) * 100).toFixed(1)}%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">
                  -{(100 - (currentMetrics.visits / currentMetrics.clicks) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">{currentMetrics.visits}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VIS. PÁGINA</div>
            </div>

            {/* Stage 3: ICS */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                {((currentMetrics.ics / currentMetrics.clicks) * 100).toFixed(1)}%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">
                  -{(((currentMetrics.visits - currentMetrics.ics) / currentMetrics.visits) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">{currentMetrics.ics}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">ICS</div>
            </div>

            {/* Stage 4: Vendas Inic. */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#5C9BFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                {((currentMetrics.initSales / currentMetrics.clicks) * 100).toFixed(1)}%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">
                  -{(((currentMetrics.ics - currentMetrics.initSales) / currentMetrics.ics) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">{currentMetrics.initSales}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VENDAS INIC.</div>
            </div>

            {/* Stage 5: Vendas Apr. */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-emerald-400 bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-emerald-400">
                {((currentMetrics.approvedSales / currentMetrics.clicks) * 100).toFixed(1)}%
              </div>
              <div className="mt-4 text-sm font-bold text-emerald-400">{currentMetrics.approvedSales}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VENDAS APR.</div>
            </div>

          </div>
        </div>

      </div>

      {/* Row 4: Taxa de Aprovação + Vendas por Pagamento + Vendas por Fonte */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Taxa de Aprovação */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
          <div className="text-xs font-bold text-white mb-4">Taxa de Aprovação</div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-zinc-300">Pix</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-t-brand border-r-brand border-b-transparent border-l-transparent animate-spin-slow flex items-center justify-center" />
              <span className="text-xs font-bold text-white font-mono">{currentMetrics.pixApproval}</span>
            </div>
          </div>
        </div>

        {/* Vendas por Pagamento */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white mb-3">Vendas por Pagamento</div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <span>Pix: {currentMetrics.pixSales}</span>
            </div>
          </div>

          <div className="w-20 h-20 rounded-full border-4 border-brand bg-[#070D1A] flex flex-col items-center justify-center font-mono">
            <span className="text-[9px] text-zinc-400">TOTAL</span>
            <span className="text-lg font-bold text-white">{currentMetrics.sales}</span>
          </div>
        </div>

        {/* Vendas por Fonte */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
          <div className="text-xs font-bold text-white mb-3">Vendas por Fonte</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Facebook</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white">{currentMetrics.sources.fb}</span>
                <span className="text-zinc-400 text-[11px]">({Math.round((currentMetrics.sources.fb / currentMetrics.sales) * 100)}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Instagram</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white">{currentMetrics.sources.ig}</span>
                <span className="text-zinc-400 text-[11px]">({Math.round((currentMetrics.sources.ig / currentMetrics.sales) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 5: Vendas por Produto + Taxas Plataforma + Impostos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        
        {/* Vendas por Produto */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-white">VENDAS POR PRODUTO</span>
            <span className="text-[10px] font-mono text-zinc-400">3 produtos</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
              <span className="text-zinc-300 truncate max-w-[140px]">Privacy Mc Mirella</span>
              <span className="font-mono font-bold text-white">{Math.round(currentMetrics.sales * 0.86)}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
              <span className="text-zinc-300 truncate max-w-[140px]">ACESSO AO GRUPO MIRELLA</span>
              <span className="font-mono font-bold text-white">{Math.max(1, Math.round(currentMetrics.sales * 0.07))}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
              <span className="text-zinc-300 truncate max-w-[140px]">Vip Exclusivo Mirella</span>
              <span className="font-mono font-bold text-white">{Math.max(1, Math.round(currentMetrics.sales * 0.07))}</span>
            </div>
            <div className="flex justify-between pt-1 font-bold">
              <span className="text-zinc-400">Total</span>
              <span className="font-mono text-white">{currentMetrics.sales}</span>
            </div>
          </div>
        </div>

        {/* Taxas Plataforma */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">TAXAS PLATAFORMA</div>
            <div className="text-xl font-bold text-amber-400 mt-2">R$ 0,00</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">Pix/Boleto: —</div>
        </div>

        {/* Impostos da Empresa */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">IMPOSTOS DA EMPRESA</div>
            <div className="text-xl font-bold text-amber-400 mt-2">R$ 0,00</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">Não configurado</div>
        </div>

        {/* Imposto Meta Ads */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">IMPOSTO META ADS</div>
            <div className="text-xl font-bold text-amber-400 mt-2">R$ 0,00</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">Não configurado</div>
        </div>

      </div>

      {/* Row 6: Vendas por Horário */}
      <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
        <div className="text-xs font-bold text-white mb-6">Vendas por Horário — {period}</div>
        
        {/* Hourly distribution bars matching the period */}
        <div className="flex items-end gap-1.5 h-36 pt-4 border-b border-[#13233E]">
          {currentMetrics.hourly.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div 
                className={`w-full rounded-t-sm transition-all ${
                  item.v > 0 ? 'bg-[#2B66E3] hover:bg-[#5C9BFF]' : 'bg-transparent'
                }`}
                style={{ height: `${item.v}%` }}
              />
              <span className="text-[9px] font-mono text-zinc-500">{item.h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 7: Vendas por Localização */}
      <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
        <div className="flex items-center justify-between text-xs mb-4">
          <span className="font-bold text-white">Vendas por Localização</span>
          <span className="text-[11px] font-mono text-[#5C9BFF]">São Paulo lidera - 6 vendas</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* World map abstraction */}
          <div className="lg:col-span-6 bg-[#070D1A] rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center min-h-[220px]">
            <span className="text-[10px] font-mono text-zinc-400 mb-4 self-start">● MUNDO</span>
            <div className="w-full text-center text-zinc-600 font-mono text-xs">
              <div className="text-3xl mb-2">🌎</div>
              <span className="text-zinc-400">Brasil: 100% das vendas aprovadas</span>
            </div>
          </div>

          {/* Brazil states distribution */}
          <div className="lg:col-span-6 space-y-3 font-mono text-xs">
            <span className="text-[10px] text-zinc-400 mb-2 block">■ BRASIL</span>

            {[
              { state: 'São Paulo', sales: 6, pct: 100 },
              { state: 'Minas Gerais', sales: 3, pct: 50 },
              { state: 'Goiás', sales: 2, pct: 33 },
              { state: 'Pernambuco', sales: 1, pct: 16 },
              { state: 'Santa Catarina', sales: 1, pct: 16 }
            ].map((st, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4">
                <span className="text-zinc-300 w-28">{st.state}</span>
                <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2B66E3] h-full rounded-full" style={{ width: `${st.pct}%` }} />
                </div>
                <span className="text-white font-bold w-6 text-right">{st.sales}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}


