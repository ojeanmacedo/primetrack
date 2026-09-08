import React, { useState, useEffect } from 'react';
import { getCurrentUser, isMasterAdmin, getTrialStatus } from '../utils/auth';
import { 
  ChevronDown, 
  Download, 
  Eye, 
  Check, 
  X, 
  Clock,
  Sparkles
} from 'lucide-react';

export default function Sales() {
  const user = getCurrentUser();
  const isAdmin = isMasterAdmin(user);
  const trialStatus = getTrialStatus(user);
  const [period, setPeriod] = useState('Hoje');
  const [liveOrders, setLiveOrders] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('primetrack_cached_orders');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => liveOrders.length === 0);

  const fetchSales = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLiveOrders(data);
          try {
            localStorage.setItem('primetrack_cached_orders', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(err => console.error('Erro ao carregar vendas:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
    const interval = setInterval(fetchSales, 8000);
    return () => clearInterval(interval);
  }, []);

  // Deduplica pedidos por orderCode priorizando pedidos aprovados/pagos
  const deduplicatedLiveOrders = React.useMemo(() => {
    const orderMap = new Map();
    for (const o of liveOrders) {
      const code = o.orderCode || o.id;
      if (!orderMap.has(code)) {
        orderMap.set(code, o);
      } else {
        const existing = orderMap.get(code);
        if (['approved', 'paid', 'pago'].includes(o.status)) {
          orderMap.set(code, o);
        } else if (!['approved', 'paid', 'pago'].includes(existing.status)) {
          orderMap.set(code, o);
        }
      }
    }
    return Array.from(orderMap.values());
  }, [liveOrders]);

  const formattedLiveOrders = deduplicatedLiveOrders.map(o => {
    const cust = o.customer || {};
    const d = o.createdAt ? new Date(o.createdAt) : new Date();
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const cityState = [cust.city, cust.state].filter(Boolean).join(', ') || 'Brasil';
    
    let cleanCampaign = o.attribution?.campaign || o.campaign || '';
    if (!cleanCampaign || cleanCampaign === 'campanha_direta' || cleanCampaign.toLowerCase().includes('direta')) {
      cleanCampaign = 'Orgânico';
    } else {
      cleanCampaign = cleanCampaign.split('::')[0].split('|')[0].replace(/[-_]\s*\d{6,}$/, '').trim();
      if (!cleanCampaign) cleanCampaign = 'Orgânico';
    }

    const isOrganic = cleanCampaign === 'Orgânico' || (o.attribution?.source && o.attribution.source.toLowerCase().includes('org'));
    let cleanSource = isOrganic ? 'ORG' : (o.attribution?.source ? o.attribution.source.toUpperCase().slice(0, 2) : 'FB');
    if (cleanSource.length > 3) cleanSource = cleanSource.slice(0, 2);

    const isApproved = o.status === 'approved' || o.status === 'paid' || o.status === 'pago';
    const isRefunded = o.status === 'refunded' || o.status === 'chargeback' || o.status === 'cancelado';

    return {
      id: o.id || o.orderCode,
      name: cust.name || 'Cliente MonsterPay',
      email: cust.email || '—',
      city: cityState,
      product: o.productName || 'Produto MonsterPay',
      value: `R$ ${Number(o.amount || 0).toFixed(2).replace('.', ',')}`,
      platform: o.gateway || 'MonsterPay',
      source: cleanSource,
      isOrganic,
      campaign: cleanCampaign,
      isApproved,
      statusText: isApproved ? 'Paga' : (isRefunded ? 'Reembolsada' : 'Pendente'),
      capi: isApproved ? 'approved' : 'pending',
      emq: o.emqScore || 9.7,
      reason: isApproved ? 'Aprovado' : (isRefunded ? 'Reembolsado' : 'Pendente'),
      date: formattedDate,
      rawDate: d
    };
  });

  // Apenas vendas reais que vierem da MonsterPay ou do Pixel da PrimeTrack
  const baseSales = formattedLiveOrders;

  const displayedSales = baseSales.filter(sale => {
    if (!sale.rawDate) return true;
    const now = new Date();
    const diffHours = (now - sale.rawDate) / (1000 * 60 * 60);
    if (period === 'Hoje') return diffHours <= 24;
    if (period === 'Ontem') return diffHours > 24 && diffHours <= 48;
    if (period === '7d') return diffHours <= 24 * 7;
    return true;
  });

  return (
    <div className="space-y-4 pb-16">
      
      {/* Top Header & Filters Bar matching Screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Title */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Vendas
            </h1>
            {trialStatus.isTrial && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{displayedSales.filter(s => s.capi === 'approved').length}/50 vendas aprovadas no Trial</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            {trialStatus.isTrial 
              ? `${displayedSales.length} vendas registradas (limite de 50 vendas no período de 7 dias gratuito)` 
              : `${displayedSales.length} vendas hoje`}
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
        {displayedSales.length === 0 ? (
          <div className="p-16 text-center">
            <div className="font-bold text-white text-sm">Nenhuma venda registrada ainda</div>
            <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
              Suas vendas rastreadas pelo pixel e via Webhook aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans whitespace-nowrap">
              <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                <tr>
                  <th className="py-3 px-4">CLIENTE</th>
                  <th className="py-3 px-4">PRODUTO</th>
                  <th className="py-3 px-4">VALOR</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4">PLATAFORMA</th>
                  <th className="py-3 px-4">ORIGEM</th>
                  <th className="py-3 px-4">CAMPANHA</th>
                  <th className="py-3 px-4 text-center">CAPI</th>
                  <th className="py-3 px-4">MOTIVO</th>
                  <th className="py-3 px-4 text-right">DATA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#13233E]/60">
                {displayedSales.map((sale) => (
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

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    {sale.isApproved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                        <span>● Paga</span>
                      </span>
                    ) : sale.statusText === 'Reembolsada' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-mono text-[10px] font-bold">
                        <span>✕ Reembolsada</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-[10px] font-bold">
                        <span>⏳ Pendente</span>
                      </span>
                    )}
                  </td>

                  {/* Plataforma */}
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-[#070D1A] border border-[#13233E] text-zinc-300 font-mono text-[11px]">
                      {sale.platform}
                    </span>
                  </td>

                  {/* Origem */}
                  <td className="py-3.5 px-4">
                    <span className={`w-7 h-6 px-1 rounded-full text-white font-bold text-[10px] flex items-center justify-center font-mono shadow-sm ${
                      sale.isOrganic || sale.source === 'ORG' ? 'bg-emerald-600' : 'bg-[#1877F2]'
                    }`}>
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
                        <span>{sale.emq || '9.7'}</span>
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
                    {sale.isApproved ? (
                      <span className="text-emerald-400 font-medium text-[11px]">Aprovado</span>
                    ) : sale.reason === 'Pendente' ? (
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

          {/* Pagination matching Screenshot */}
          <div className="p-3 bg-[#070D1A] border-t border-[#13233E] flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Página 1 de 1</span>
            <button className="px-3 py-1 rounded-lg bg-[#0A1426] hover:bg-[#12223D] border border-[#13233E] text-zinc-300 hover:text-white transition-colors cursor-pointer">
              Próxima →
            </button>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
