import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentUser, isMasterAdmin, getTrialStatus } from '../utils/auth';
import { 
  ChevronDown, 
  Download, 
  Eye, 
  Check, 
  X, 
  Clock,
  Sparkles,
  Search,
  RefreshCw,
  Filter,
  DollarSign,
  CheckCircle2,
  Clock3,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

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
  const explicitCity = cust?.city || o?.attribution?.customer_city || o?.attribution?.city || o?.customer_city;
  const explicitState = cust?.state || o?.attribution?.customer_state || o?.attribution?.state || o?.customer_state;
  if (explicitCity && explicitState) {
    return `${explicitCity}, ${explicitState}`;
  }
  if (explicitCity) {
    return explicitCity;
  }

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

export default function Sales() {
  const user = getCurrentUser();
  const isAdmin = isMasterAdmin(user);
  const trialStatus = getTrialStatus(user);
  const [period, setPeriod] = useState('Hoje');
  const [statusTab, setStatusTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('Todas');
  const [selectedOrigin, setSelectedOrigin] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState('Todos');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

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
  const [loading, setLoading] = useState(false);

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

  const fetchSales = (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    const userHeaders = user?.id ? { 'x-user-id': user.id } : {};
    const userParam = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';
    const forceParam = isManual ? (userParam ? '&refresh=true' : '?refresh=true') : '';

    fetch('/api/orders' + userParam + forceParam, { headers: userHeaders })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveOrders(data);
          try {
            localStorage.setItem('primetrack_cached_orders', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(err => console.error('Erro ao carregar vendas:', err))
      .finally(() => {
        setLoading(false);
        if (isManual) setTimeout(() => setIsRefreshing(false), 500);
      });
  };

  useEffect(() => {
    fetchSales(false);
    const interval = setInterval(() => fetchSales(false), 8000);
    return () => clearInterval(interval);
  }, []);

  // Mantém todas as vendas individuais válidas pelo ID do pedido
  const deduplicatedLiveOrders = useMemo(() => {
    const orderMap = new Map();
    for (const o of liveOrders) {
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
        orderMap.set(key, { ...o });
      } else {
        const existing = orderMap.get(key);
        if (['approved', 'paid', 'pago'].includes(o.status)) {
          existing.status = 'approved';
        }
      }
    }
    return Array.from(orderMap.values());
  }, [liveOrders, activeDashboard]);

  const formattedLiveOrders = useMemo(() => {
    return deduplicatedLiveOrders.map(o => {
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

      const numericVal = Number(o.grossAmount || o.amount || 0);

      return {
        id: o.id || o.orderCode,
        name: cust.name || 'Sem Nome',
        email: cust.email || '—',
        phone: cust.phone || '',
        city: cityState,
        product: o.productName || 'Produto',
        hasBump: o.hasBump || false,
        bumpCount: o.bumpCount || (Array.isArray(o.products) && o.products.length > 1 ? o.products.length - 1 : 0),
        bumpNames: o.bumpNames || (Array.isArray(o.products) && o.products.length > 1 ? o.products.slice(1) : []),
        rawNumericValue: numericVal,
        value: `R$ ${numericVal.toFixed(2).replace('.', ',')}`,
        platform: o.gateway || 'MonsterPay',
        source: cleanSource,
        isOrganic,
        campaign: cleanCampaign,
        isApproved,
        isRefunded,
        statusText,
        capi: isApproved ? 'approved' : 'pending',
        emq: o.emqScore || 9.7,
        reason: isApproved ? 'Aprovado' : (isRefunded ? 'Reembolsado' : (isPix ? 'PIX Gerado' : 'Pendente')),
        date: formattedDate,
        rawDate: d
      };
    });
  }, [deduplicatedLiveOrders]);

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

  // Extrai opções únicas para dropdowns dinâmicos
  const availablePlatforms = useMemo(() => {
    const set = new Set();
    formattedLiveOrders.forEach(o => { if (o.platform) set.add(o.platform); });
    return ['Todas', ...Array.from(set)];
  }, [formattedLiveOrders]);

  const availableProducts = useMemo(() => {
    const set = new Set();
    formattedLiveOrders.forEach(o => { if (o.product) set.add(o.product); });
    return ['Todos', ...Array.from(set)];
  }, [formattedLiveOrders]);

  const availableOrigins = useMemo(() => {
    const set = new Set();
    formattedLiveOrders.forEach(o => { if (o.source) set.add(o.source); });
    return ['Todas', ...Array.from(set)];
  }, [formattedLiveOrders]);

  // Vendas filtradas por período e controles
  const displayedSales = useMemo(() => {
    const todayYMD = toBrazilYMD(new Date());
    const yesterdayYMD = toBrazilYMD(new Date(Date.now() - 86400000));
    const sevenDaysAgoYMD = toBrazilYMD(new Date(Date.now() - 6 * 86400000));
    const thirtyDaysAgoYMD = toBrazilYMD(new Date(Date.now() - 29 * 86400000));
    const thisMonthPrefix = todayYMD ? todayYMD.slice(0, 7) : '';

    return formattedLiveOrders.filter(sale => {
      // 1. Filtro de Período
      if (sale.rawDate) {
        const saleYMD = toBrazilYMD(sale.rawDate);
        if (saleYMD) {
          if (period === 'Hoje' && saleYMD !== todayYMD) return false;
          if (period === 'Ontem' && saleYMD !== yesterdayYMD) return false;
          if (period === '7d' && (saleYMD < sevenDaysAgoYMD || saleYMD > todayYMD)) return false;
          if (period === '30d' && (saleYMD < thirtyDaysAgoYMD || saleYMD > todayYMD)) return false;
          if (period === 'Este mês' && !saleYMD.startsWith(thisMonthPrefix)) return false;
        }
      }

      // 2. Filtro de Status Tab
      if (statusTab === 'approved' && !sale.isApproved) return false;
      if (statusTab === 'pending' && (sale.isApproved || sale.isRefunded)) return false;
      if (statusTab === 'refunded' && !sale.isRefunded) return false;

      // 3. Filtro de Plataforma
      if (selectedPlatform !== 'Todas' && sale.platform !== selectedPlatform) return false;

      // 4. Filtro de Origem
      if (selectedOrigin !== 'Todas' && sale.source !== selectedOrigin) return false;

      // 5. Filtro de Produto
      if (selectedProduct !== 'Todos' && sale.product !== selectedProduct) return false;

      // 6. Busca Textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchName = (sale.name || '').toLowerCase().includes(term);
        const matchEmail = (sale.email || '').toLowerCase().includes(term);
        const matchProd = (sale.product || '').toLowerCase().includes(term);
        const matchCamp = (sale.campaign || '').toLowerCase().includes(term);
        const matchId = String(sale.id || '').toLowerCase().includes(term);
        const matchCity = (sale.city || '').toLowerCase().includes(term);
        if (!matchName && !matchEmail && !matchProd && !matchCamp && !matchId && !matchCity) return false;
      }

      return true;
    });
  }, [formattedLiveOrders, period, statusTab, selectedPlatform, selectedOrigin, selectedProduct, searchTerm]);

  // Métricas do período atual selecionado
  const metrics = useMemo(() => {
    let revenue = 0;
    let approved = 0;
    let pending = 0;
    let refunded = 0;

    displayedSales.forEach(s => {
      if (s.isApproved) {
        revenue += s.rawNumericValue;
        approved++;
      } else if (s.isRefunded) {
        refunded++;
      } else {
        pending++;
      }
    });

    const totalOrdersCount = approved + pending;
    const approvalRate = totalOrdersCount > 0 ? ((approved / totalOrdersCount) * 100).toFixed(1) : '0,0';

    return {
      revenue: `R$ ${revenue.toFixed(2).replace('.', ',')}`,
      approved,
      pending,
      refunded,
      total: displayedSales.length,
      approvalRate: `${approvalRate}%`
    };
  }, [displayedSales]);

  // Paginação inteligente
  const totalPages = Math.max(1, Math.ceil(displayedSales.length / rowsPerPage));
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return displayedSales.slice(start, start + rowsPerPage);
  }, [displayedSales, currentPage, rowsPerPage]);

  const handleExportCsv = () => {
    if (displayedSales.length === 0) return;
    const headers = ['ID', 'Cliente', 'Email', 'Local', 'Produto', 'Valor', 'Status', 'Plataforma', 'Origem', 'Campanha', 'CAPI', 'Data'];
    const rows = displayedSales.map(s => [
      `"${s.id}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.email}"`,
      `"${s.city}"`,
      `"${s.product.replace(/"/g, '""')}"`,
      `"${s.value}"`,
      `"${s.statusText}"`,
      `"${s.platform}"`,
      `"${s.source}"`,
      `"${s.campaign.replace(/"/g, '""')}"`,
      `"${s.emq || ''}"`,
      `"${s.date}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendas_primetrack_${period.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-16">
      
      {/* Top Header & Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Title */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Vendas
              <button
                onClick={() => fetchSales(true)}
                title="Sincronizar vendas agora"
                className="p-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1E293B] border border-[#1E293B] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </h1>
            {trialStatus.isTrial && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>{displayedSales.filter(s => s.capi === 'approved').length}/50 vendas aprovadas no Plano Free</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            {trialStatus.isTrial 
              ? `${displayedSales.length} vendas registradas (limite de 50 vendas no Plano Free)` 
              : `${displayedSales.length} vendas encontradas no período (${period})`}
          </p>
        </div>

        {/* Right Actions & Period Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Period Pills */}
          <div className="flex items-center bg-[#141C2E] border border-[#1E293B] rounded-xl p-0.5 text-xs shadow-sm">
            {['Hoje', 'Ontem', '7d', '30d', 'Este mês', 'Todas'].map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  period === p
                    ? 'bg-[#0066FF] text-white font-bold shadow-md shadow-blue-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={displayedSales.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141C2E] hover:bg-[#1E293B] border border-[#1E293B] text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            title="Exportar vendas filtradas para CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar CSV</span>
          </button>

        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Faturamento Aprovado</div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">{metrics.revenue}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Vendas Pagas</div>
            <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">{metrics.approved}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Pendentes (PIX/Boleto)</div>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1">{metrics.pending}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock3 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Taxa de Conversão</div>
            <div className="text-lg sm:text-xl font-bold font-mono text-blue-400 mt-1">{metrics.approvalRate}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#141C2E] border border-[#1E293B] p-2.5 rounded-xl">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => { setStatusTab('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusTab === 'all'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({metrics.total})
          </button>
          <button
            onClick={() => { setStatusTab('approved'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusTab === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pagas ({metrics.approved})
          </button>
          <button
            onClick={() => { setStatusTab('pending'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pendentes ({metrics.pending})
          </button>
          {metrics.refunded > 0 && (
            <button
              onClick={() => { setStatusTab('refunded'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusTab === 'refunded'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Reembolsadas ({metrics.refunded})
            </button>
          )}
        </div>

        {/* Search & Dynamic Selects */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar cliente, email, campanha..."
              className="w-full bg-[#0D1424] border border-[#1E293B] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Origem Dropdown */}
          {availableOrigins.length > 2 && (
            <select
              value={selectedOrigin}
              onChange={(e) => { setSelectedOrigin(e.target.value); setCurrentPage(1); }}
              className="bg-[#0D1424] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {availableOrigins.map(o => (
                <option key={o} value={o}>{o === 'Todas' ? 'Todas Origens' : `Origem: ${o}`}</option>
              ))}
            </select>
          )}

          {/* Plataforma Dropdown */}
          {availablePlatforms.length > 2 && (
            <select
              value={selectedPlatform}
              onChange={(e) => { setSelectedPlatform(e.target.value); setCurrentPage(1); }}
              className="bg-[#0D1424] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {availablePlatforms.map(p => (
                <option key={p} value={p}>{p === 'Todas' ? 'Todas Plataformas' : p}</option>
              ))}
            </select>
          )}

          {/* Produto Dropdown */}
          {availableProducts.length > 2 && (
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setCurrentPage(1); }}
              className="bg-[#0D1424] border border-[#1E293B] rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[160px] truncate"
            >
              {availableProducts.map(prod => (
                <option key={prod} value={prod}>{prod === 'Todos' ? 'Todos Produtos' : prod}</option>
              ))}
            </select>
          )}

        </div>

      </div>

      {/* Main Table */}
      <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
        {displayedSales.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-[#1E293B] flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="font-bold text-white text-sm">Nenhuma venda encontrada</div>
            <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
              {searchTerm 
                ? 'Nenhum resultado para a busca. Tente alterar os termos ou limpar os filtros.'
                : 'Suas vendas rastreadas pelo pixel e via Webhook aparecerão aqui em tempo real.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setStatusTab('all'); setSelectedPlatform('Todas'); setSelectedOrigin('Todas'); setSelectedProduct('Todos'); }}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            )}
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
                {paginatedSales.map((sale) => (
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{sale.product}</span>
                      {sale.bumpCount > 0 && (
                        <span 
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono"
                          title={Array.isArray(sale.bumpNames) && sale.bumpNames.length > 0 ? `Order Bump: ${sale.bumpNames.join(' + ')}` : 'Com Order Bump'}
                        >
                          +{sale.bumpCount} Bump{sale.bumpCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
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

          {/* Pagination */}
          <div className="p-3 bg-[#141C2E] border-t border-[#1E293B] flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>
              Mostrando {Math.min(displayedSales.length, (currentPage - 1) * rowsPerPage + 1)} - {Math.min(displayedSales.length, currentPage * rowsPerPage)} de {displayedSales.length} vendas
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-zinc-300 px-1">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 rounded-lg bg-[#0D1424] hover:bg-[#182236] border border-[#1E293B] text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima →
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
