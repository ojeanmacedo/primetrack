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

  const [activeDashboard, setActiveDashboard] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const list = JSON.parse(localStorage.getItem('primetrack_dashboards') || '[]');
        const activeId = localStorage.getItem('primetrack_active_dashboard_id') || 'principal';
        return list.find(d => d.id === activeId) || null;
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    const handleDashChange = (e) => {
      setActiveDashboard(e.detail || null);
    };
    window.addEventListener('primetrack_dashboard_changed', handleDashChange);
    return () => window.removeEventListener('primetrack_dashboard_changed', handleDashChange);
  }, []);

  const fetchSales = () => {
    const userHeaders = user?.id ? { 'x-user-id': user.id } : {};
    const userParam = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';

    fetch('/api/orders' + userParam, { headers: userHeaders })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLiveOrders(data);
          try {
            if (data.length > 0) {
              localStorage.setItem('primetrack_cached_orders', JSON.stringify(data));
            } else {
              localStorage.removeItem('primetrack_cached_orders');
            }
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

  // Mantém todas as vendas individuais válidas pelo ID do pedido
  const deduplicatedLiveOrders = React.useMemo(() => {
    const orderMap = new Map();
    for (const o of liveOrders) {
      // Se for uma dashboard secundária (não é a Principal), ela começa 100% ZERADA
      // a menos que receba vendas do seu produto/plataforma ou vinculadas a ela
      if (activeDashboard && !activeDashboard.isDefault && activeDashboard.id !== 'principal') {
        const hasCustomPlat = activeDashboard.platformType === 'custom' && Array.isArray(activeDashboard.platforms) && activeDashboard.platforms.length > 0;
        const hasCustomProd = activeDashboard.productType === 'custom' && Boolean(activeDashboard.products?.trim());

        if (!hasCustomPlat && !hasCustomProd && (!o.dashboardId || o.dashboardId !== activeDashboard.id)) {
          continue;
        }

        if (o.dashboardId && o.dashboardId === activeDashboard.id) {
          // Permite
        } else {
          if (hasCustomPlat) {
            const plat = (o.platform || o.gateway || '').toLowerCase();
            const matchPlat = activeDashboard.platforms.some(p => plat.includes(p.toLowerCase()));
            if (!matchPlat) continue;
          }
          if (hasCustomProd) {
            const prodName = (o.productName || '').toLowerCase();
            const targetProd = activeDashboard.products.toLowerCase().trim();
            if (!prodName.includes(targetProd)) continue;
          }
        }
      }

      const key = o.id || o.orderCode;
      if (!orderMap.has(key)) {
        orderMap.set(key, o);
      } else {
        const existing = orderMap.get(key);
        if (['approved', 'paid', 'pago'].includes(o.status)) {
          orderMap.set(key, o);
        }
      }
    }
    return Array.from(orderMap.values());
  }, [liveOrders, activeDashboard]);


const DDD_MAP = {
  '11': 'São Paulo, SP',
  '12': 'São José dos Campos, SP',
  '13': 'Santos, SP',
  '14': 'Bauru, SP',
  '15': 'Sorocaba, SP',
  '16': 'Ribeirão Preto, SP',
  '17': 'São José do Rio Preto, SP',
  '18': 'Presidente Prudente, SP',
  '19': 'Campinas, SP',
  '21': 'Rio de Janeiro, RJ',
  '22': 'Campos dos Goytacazes, RJ',
  '24': 'Volta Redonda, RJ',
  '27': 'Vitória, ES',
  '28': 'Cachoeiro de Itapemirim, ES',
  '31': 'Belo Horizonte, MG',
  '32': 'Juiz de Fora, MG',
  '33': 'Governador Valadares, MG',
  '34': 'Uberlândia, MG',
  '35': 'Poços de Caldas, MG',
  '37': 'Divinópolis, MG',
  '38': 'Montes Claros, MG',
  '41': 'Curitiba, PR',
  '42': 'Ponta Grossa, PR',
  '43': 'Londrina, PR',
  '44': 'Maringá, PR',
  '45': 'Foz do Iguaçu, PR',
  '46': 'Francisco Beltrão, PR',
  '47': 'Joinville, SC',
  '48': 'Florianópolis, SC',
  '49': 'Chapecó, SC',
  '51': 'Porto Alegre, RS',
  '53': 'Pelotas, RS',
  '54': 'Caxias do Sul, RS',
  '55': 'Santa Maria, RS',
  '61': 'Brasília, DF',
  '62': 'Goiânia, GO',
  '63': 'Palmas, TO',
  '64': 'Rio Verde, GO',
  '65': 'Cuiabá, MT',
  '66': 'Rondonópolis, MT',
  '67': 'Campo Grande, MS',
  '68': 'Rio Branco, AC',
  '69': 'Porto Velho, RO',
  '71': 'Salvador, BA',
  '73': 'Ilhéus, BA',
  '74': 'Juazeiro, BA',
  '75': 'Feira de Santana, BA',
  '77': 'Vitória da Conquista, BA',
  '79': 'Aracaju, SE',
  '81': 'Recife, PE',
  '82': 'Maceió, AL',
  '83': 'João Pessoa, PB',
  '84': 'Natal, RN',
  '85': 'Fortaleza, CE',
  '86': 'Teresina, PI',
  '87': 'Petrolina, PE',
  '88': 'Juazeiro do Norte, CE',
  '89': 'Picos, PI',
  '91': 'Belém, PA',
  '92': 'Manaus, AM',
  '93': 'Santarém, PA',
  '94': 'Marabá, PA',
  '95': 'Boa Vista, RR',
  '96': 'Macapá, AP',
  '97': 'Coari, AM',
  '98': 'São Luís, MA',
  '99': 'Imperatriz, MA'
};

function resolveCustomerCityState(cust, o) {
  // 1. Dados reais capturados pelo Pixel PrimeTrack / Meta CAPI
  const explicitCity = cust?.city || o?.attribution?.customer_city || o?.attribution?.city || o?.customer_city;
  const explicitState = cust?.state || o?.attribution?.customer_state || o?.attribution?.state || o?.customer_state;
  if (explicitCity && explicitState) {
    return `${explicitCity}, ${explicitState}`;
  }
  if (explicitCity) {
    return explicitCity;
  }

  // 2. DDD do telefone real fornecido pelo comprador no checkout
  const phone = String(cust?.phone || o?.phone || '').replace(/\D/g, '');
  if (phone.length >= 10) {
    const rawDigits = phone.startsWith('55') && (phone.length === 12 || phone.length === 13)
      ? phone.slice(2)
      : phone;
    const ddd = rawDigits.slice(0, 2);
    if (DDD_MAP[ddd]) {
      return DDD_MAP[ddd];
    }
  }

  return 'Brasil';
}

  const formattedLiveOrders = deduplicatedLiveOrders.map(o => {
    const cust = o.customer || {};
    const d = o.createdAt ? new Date(o.createdAt) : new Date();
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const cityState = resolveCustomerCityState(cust, o);
    
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
    const isPix = (o.paymentMethod || '').toLowerCase().includes('pix') || (o.payment_method || '').toLowerCase().includes('pix') || (o.status || '').toLowerCase().includes('pix');
    const isBoleto = (o.paymentMethod || '').toLowerCase().includes('boleto') || (o.paymentMethod || '').toLowerCase().includes('billet');

    const statusText = isApproved 
      ? 'Paga' 
      : isRefunded 
      ? 'Reembolsada' 
      : isPix 
      ? 'PIX Gerado' 
      : isBoleto 
      ? 'Boleto Gerado' 
      : 'Pendente';

    return {
      id: o.id || o.orderCode,
      name: cust.name || 'Sem Nome',
      email: cust.email || '—',
      city: cityState,
      product: o.productName || 'Produto',
      value: `R$ ${Number(o.amount || 0).toFixed(2).replace('.', ',')}`,
      platform: o.gateway || 'MonsterPay',
      source: cleanSource,
      isOrganic,
      campaign: cleanCampaign,
      isApproved,
      statusText,
      capi: isApproved ? 'approved' : 'pending',
      emq: o.emqScore || 9.7,
      reason: isApproved ? 'Aprovado' : (isRefunded ? 'Reembolsado' : (isPix ? 'PIX Gerado' : 'Pendente')),
      date: formattedDate,
      rawDate: d
    };
  });

  // Converte data para YYYY-MM-DD no fuso de São Paulo (UTC-3)
  const toBrazilYMD = (dateInput) => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const spDate = new Date(d.getTime() - (3 * 3600 * 1000));
    const y = spDate.getUTCFullYear();
    const m = String(spDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(spDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Apenas vendas reais que vierem da MonsterPay ou do Pixel da PrimeTrack
  const baseSales = formattedLiveOrders;

  const displayedSales = baseSales.filter(sale => {
    if (!sale.rawDate) return true;
    const todayYMD = toBrazilYMD(new Date());
    const yesterdayYMD = toBrazilYMD(new Date(Date.now() - 86400000));
    const sevenDaysAgoYMD = toBrazilYMD(new Date(Date.now() - 6 * 86400000));
    const saleYMD = toBrazilYMD(sale.rawDate);
    if (!saleYMD) return false;

    if (period === 'Hoje') return saleYMD === todayYMD;
    if (period === 'Ontem') return saleYMD === yesterdayYMD;
    if (period === '7d') return saleYMD >= sevenDaysAgoYMD && saleYMD <= todayYMD;
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
          
          <div className="flex items-center gap-2 bg-[#141C2E] border border-[#1E293B] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todas as origens</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          <div className="flex items-center gap-2 bg-[#141C2E] border border-[#1E293B] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todos os produtos</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          <div className="flex items-center gap-2 bg-[#141C2E] border border-[#1E293B] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todas as plataformas</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          <div className="flex items-center gap-2 bg-[#141C2E] border border-[#1E293B] px-3 py-1.5 rounded-xl text-zinc-300">
            <span>Todas as campanhas</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          {/* Period Pills */}
          <div className="flex items-center bg-[#141C2E] border border-[#1E293B] rounded-xl p-0.5 text-xs">
            {['Hoje', 'Ontem', '7d'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-[#0066FF] text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Main Table matching Screenshot */}
      <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
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
              <thead className="bg-[#141C2E] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                <tr>
                  <th className="py-3 px-4">CLIENTE</th>
                  <th className="py-3 px-4">PRODUTO</th>
                  <th className="py-3 px-4">VALOR</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4">PLATAFORMA</th>
                  <th className="py-3 px-4">ORIGEM</th>
                  <th className="py-3 px-4">CAMPANHA</th>
                  <th className="py-3 px-4 text-center">CAPI</th>
                  <th className="py-3 px-4 text-right">DATA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
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
                    <div className="text-[10px] text-zinc-400 font-sans flex items-center gap-1 mt-0.5">
                      <span>📍</span>
                      <span>{sale.city}</span>
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
                        <span>⏳ {sale.statusText}</span>
                      </span>
                    )}
                  </td>

                  {/* Plataforma */}
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-[#0D1424] border border-[#1E293B] text-zinc-300 font-mono text-[11px]">
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0066FF] text-white font-mono text-[10px] font-bold">
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

                  {/* Data */}
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-400">
                    {sale.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination matching Screenshot */}
          <div className="p-3 bg-[#141C2E] border-t border-[#1E293B] flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Página 1 de 1</span>
            <button className="px-3 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 hover:text-white transition-colors cursor-pointer">
              Próxima →
            </button>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
