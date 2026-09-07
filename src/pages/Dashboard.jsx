import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const totalSpend = campaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const totalSales = campaigns.reduce((acc, c) => acc + Number(c.sales || 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + Number(c.revenue || 0), 0);
  const totalProfit = totalRevenue - totalSpend;
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '1.13';
  const cpa = totalSales > 0 ? (totalSpend / totalSales).toFixed(2) : '8.22';
  const arpu = totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : '9.31';

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

      {/* Red Alert Banner */}
      <div className="w-full bg-[#E52222] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 fill-current shrink-0" />
          <span>
            Seu plano expirou! Você tem <strong>2 dias</strong> para renovar antes dos serviços serem pausados.
          </span>
        </div>
        <button 
          type="button"
          onClick={() => navigate('/planos')}
          className="underline hover:text-zinc-200 text-xs font-bold shrink-0 ml-4 cursor-pointer"
        >
          Renovar agora →
        </button>
      </div>

      {/* KPI Row 1: Faturamento, Lucro, Gasto, CPA, ARPU, ROAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Faturamento */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">FATURAMENTO</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {(totalRevenue > 0 ? totalRevenue : 139.67).toFixed(2)}
          </div>
        </div>

        {/* Lucro */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">LUCRO</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5C9BFF] mt-1">
            R$ {(totalProfit !== 0 ? totalProfit : 16.36).toFixed(2)}
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
            R$ {(totalSpend > 0 ? totalSpend : 123.31).toFixed(2)}
          </div>
        </div>

        {/* CPA */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">CPA</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {cpa}
          </div>
        </div>

        {/* ARPU */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">ARPU</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {arpu}
          </div>
        </div>

        {/* ROAS */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">ROAS</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5C9BFF] mt-1">
            {roas}x
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
          <div className="text-2xl font-extrabold text-white mt-1">15</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">R$ 139,67</div>
        </div>

        {/* Vendas Pendentes */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">VENDAS PENDENTES</div>
          <div className="text-2xl font-extrabold text-white mt-1">R$ 125,72</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">11 vendas</div>
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
          <div className="text-2xl font-extrabold text-[#5C9BFF] mt-1">11.7%</div>
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
            Funil de Conversão (Meta Ads)
          </div>

          <div className="grid grid-cols-5 gap-2 text-center relative items-center">
            
            {/* Stage 1: Cliques */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white">
                100%
              </div>
              <div className="mt-2 text-sm font-bold text-white">421</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">CLIQUES</div>
            </div>

            {/* Stage 2: Vis. Página */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                75.3%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">-24.7%</span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">317</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VIS. PÁGINA</div>
            </div>

            {/* Stage 3: ICS */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                45.6%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">-29.7%</span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">192</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">ICS</div>
            </div>

            {/* Stage 4: Vendas Inic. */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#5C9BFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                6.2%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">-39.4%</span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">26</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VENDAS INIC.</div>
            </div>

            {/* Stage 5: Vendas Apr. */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-emerald-400 bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-emerald-400">
                3.6%
              </div>
              <div className="mt-4 text-sm font-bold text-emerald-400">15</div>
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
              <span className="text-xs font-bold text-white font-mono">57.7%</span>
            </div>
          </div>
        </div>

        {/* Vendas por Pagamento */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white mb-3">Vendas por Pagamento</div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <span>Pix: 15</span>
            </div>
          </div>

          <div className="w-20 h-20 rounded-full border-4 border-brand bg-[#070D1A] flex flex-col items-center justify-center font-mono">
            <span className="text-[9px] text-zinc-400">TOTAL</span>
            <span className="text-lg font-bold text-white">15</span>
          </div>
        </div>

        {/* Vendas por Fonte */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
          <div className="text-xs font-bold text-white mb-3">Vendas por Fonte</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Facebook</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white">9</span>
                <span className="text-zinc-400 text-[11px]">(60%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Instagram</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white">6</span>
                <span className="text-zinc-400 text-[11px]">(40%)</span>
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
              <span className="font-mono font-bold text-white">13</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
              <span className="text-zinc-300 truncate max-w-[140px]">ACESSO AO GRUPO MIRELLA</span>
              <span className="font-mono font-bold text-white">1</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
              <span className="text-zinc-300 truncate max-w-[140px]">Vip Exclusivo Mirella</span>
              <span className="font-mono font-bold text-white">1</span>
            </div>
            <div className="flex justify-between pt-1 font-bold">
              <span className="text-zinc-400">Total</span>
              <span className="font-mono text-white">15</span>
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
        <div className="text-xs font-bold text-white mb-6">Vendas por Horário</div>
        
        {/* Hourly distribution bars matching the print */}
        <div className="flex items-end gap-1.5 h-36 pt-4 border-b border-[#13233E]">
          {[
            { h: '00h', v: 80 }, { h: '01h', v: 0 }, { h: '02h', v: 0 }, { h: '03h', v: 45 },
            { h: '04h', v: 45 }, { h: '05h', v: 45 }, { h: '06h', v: 45 }, { h: '07h', v: 80 },
            { h: '08h', v: 45 }, { h: '09h', v: 45 }, { h: '10h', v: 45 }, { h: '11h', v: 80 },
            { h: '12h', v: 80 }, { h: '13h', v: 0 }, { h: '14h', v: 0 }, { h: '15h', v: 0 },
            { h: '16h', v: 0 }, { h: '17h', v: 0 }, { h: '18h', v: 0 }, { h: '19h', v: 0 },
            { h: '20h', v: 0 }, { h: '21h', v: 0 }, { h: '22h', v: 0 }, { h: '23h', v: 0 }
          ].map((item, idx) => (
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


