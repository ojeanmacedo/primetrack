import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getTrialStatus } from '../utils/auth';
import { 
  ChevronDown, 
  HelpCircle, 
  RotateCw, 
  PieChart 
} from 'lucide-react';
import DateRangePicker from '../components/DateRangePicker';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);

  const [period, setPeriod] = useState('Hoje');
  const [customRange, setCustomRange] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [minsAgo, setMinsAgo] = useState(0);

  // Filtros dropdowns
  const [selectedAccount, setSelectedAccount] = useState('Todas');
  const [selectedSource, setSelectedSource] = useState('Qualquer');
  const [selectedPlatform, setSelectedPlatform] = useState('Qualquer');
  const [selectedProduct, setSelectedProduct] = useState('Qualquer');

  const [adAccountsList, setAdAccountsList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primetrack_ad_accounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed.filter(a => a.sync === true);
        } catch (e) {}
      }
    }
    return [];
  });

  const [campaigns, setCampaigns] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('primetrack_cached_campaigns');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

  const [ordersList, setOrdersList] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('primetrack_cached_orders');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  const periodToPreset = {
    'Hoje': 'today',
    'Ontem': 'yesterday',
    '7 dias': 'last_7d',
    '14 dias': 'last_14d',
    '30 dias': 'last_30d',
    'Este mês': 'this_month',
    'Personalizado': 'maximum'
  };

  const isFirstMount = useRef(true);

  const loadDashboardData = async (customPeriod = period, rangeObj = customRange) => {
    let query = '';
    if (customPeriod === 'Personalizado' && rangeObj?.since) {
      query = `since=${rangeObj.since}&until=${rangeObj.until || rangeObj.since}`;
    } else {
      const preset = periodToPreset[customPeriod] || 'today';
      query = `datePreset=${preset}`;
    }

    try {
      const [rRes, crRes, ordRes] = await Promise.all([
        fetch('/api/meta/status'),
        fetch(`/api/campaigns?${query}`),
        fetch('/api/orders')
      ]);

      try {
        const oData = await ordRes.json();
        if (Array.isArray(oData)) {
          setOrdersList(oData);
          if (typeof window !== 'undefined') {
            localStorage.setItem('primetrack_cached_orders', JSON.stringify(oData));
          }
        }
      } catch (oErr) {}

      const data = await rRes.json();
      if (data.adAccounts && data.adAccounts.length > 0) {
        const allMappedAccs = data.adAccounts.map(a => ({
          ...a,
          id: a.accountId || (a.id ? a.id.replace('act_', '') : '0000'),
          sync: a.syncActive !== undefined ? a.syncActive === true : (a.status === 'ACTIVE' || a.status === 'Ativa')
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('primetrack_ad_accounts', JSON.stringify(allMappedAccs));
        }
        const activeSynced = allMappedAccs.filter(a => a.sync);
        setAdAccountsList(activeSynced);
      }

      const cData = await crRes.json();
      if (Array.isArray(cData)) {
        setCampaigns(cData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('primetrack_cached_campaigns', JSON.stringify(cData));
        }
      }

      setMinsAgo(0);
    } catch (err) {
      console.warn('Erro ao carregar dados do Dashboard:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    let query = '';
    if (period === 'Personalizado' && customRange?.since) {
      query = `since=${customRange.since}&until=${customRange.until || customRange.since}&refresh=true`;
    } else {
      const preset = periodToPreset[period] || 'today';
      query = `datePreset=${preset}&refresh=true`;
    }

    try {
      const [cr, ord] = await Promise.all([
        fetch(`/api/campaigns?${query}`),
        fetch('/api/orders')
      ]);
      const [cData, oData] = await Promise.all([cr.json(), ord.json()]);
      if (Array.isArray(cData)) {
        setCampaigns(cData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('primetrack_cached_campaigns', JSON.stringify(cData));
        }
      }
      if (Array.isArray(oData)) {
        setOrdersList(oData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('primetrack_cached_orders', JSON.stringify(oData));
        }
      }
      setMinsAgo(0);
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(period, customRange);

    const handleProfileSync = () => {
      loadDashboardData(period, customRange);
    };

    const ordersPollInterval = setInterval(() => {
      fetch('/api/orders')
        .then(res => res.json())
        .then(oData => {
          if (Array.isArray(oData) && oData.length > 0) {
            setOrdersList(oData);
            try {
              localStorage.setItem('primetrack_cached_orders', JSON.stringify(oData));
            } catch (e) {}
          }
        })
        .catch(() => {});
    }, 10000);

    const minsInterval = setInterval(() => {
      setMinsAgo(m => m + 1);
    }, 60000);

    window.addEventListener('primetrack_profile_sync', handleProfileSync);
    return () => {
      clearInterval(ordersPollInterval);
      clearInterval(minsInterval);
      window.removeEventListener('primetrack_profile_sync', handleProfileSync);
    };
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (period !== 'Personalizado') {
      loadDashboardData(period, null);
    }
  }, [period]);

  // Deduplica pedidos por orderCode priorizando vendas aprovadas
  const deduplicatedOrders = useMemo(() => {
    const orderMap = new Map();
    for (const o of ordersList) {
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
  }, [ordersList]);

  // Lista única de produtos para o dropdown de filtro
  const uniqueProducts = useMemo(() => {
    const set = new Set();
    deduplicatedOrders.forEach(o => {
      if (o.productName) set.add(o.productName);
    });
    return Array.from(set);
  }, [deduplicatedOrders]);

  // Filtra as campanhas baseado na conta selecionada
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const cAdId = String(c.adAccountId || '').replace('act_', '');
      if (selectedAccount !== 'Todas') {
        const match = adAccountsList.find(a => a.name === selectedAccount || a.id === selectedAccount);
        if (match) return cAdId === String(match.id);
        return c.accountName === selectedAccount || cAdId === selectedAccount;
      }
      if (adAccountsList.length > 0) {
        return adAccountsList.some(acc => cAdId === String(acc.id));
      }
      return true;
    });
  }, [campaigns, selectedAccount, adAccountsList]);

  // Filtra as vendas baseado no período e filtros selecionados
  const filteredOrders = useMemo(() => {
    return deduplicatedOrders.filter(o => {
      if (!o.createdAt) return true;
      const d = new Date(o.createdAt);
      const now = new Date();
      const diffHours = (now - d) / (1000 * 60 * 60);

      // Filtro de data
      if (period === 'Hoje') {
        const isSameDay = d.toDateString() === now.toDateString();
        if (!isSameDay && !(diffHours >= -1 && diffHours <= 24)) return false;
      } else if (period === 'Ontem') {
        if (!(diffHours > 24 && diffHours <= 48)) return false;
      } else if (period === '7 dias') {
        if (diffHours > 24 * 7) return false;
      } else if (period === '14 dias') {
        if (diffHours > 24 * 14) return false;
      } else if (period === '30 dias') {
        if (diffHours > 24 * 30) return false;
      }

      // Filtro de fonte
      if (selectedSource !== 'Qualquer') {
        const src = (o.attribution?.source || '').toLowerCase();
        if (selectedSource === 'Facebook' && !src.includes('fb') && !src.includes('meta')) return false;
        if (selectedSource === 'Organico' && !src.includes('org')) return false;
      }

      // Filtro de produto
      if (selectedProduct !== 'Qualquer') {
        if (o.productName !== selectedProduct) return false;
      }

      return true;
    });
  }, [deduplicatedOrders, period, selectedSource, selectedProduct]);

  // Vendas Pendentes reais da MonsterPay
  const pendingOrders = filteredOrders.filter(o => 
    o.status === 'waiting_payment' || o.status === 'pending' || o.status === 'aguardando_pagamento'
  );
  const realPendingValue = pendingOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);

  // Vendas Aprovadas (Pagas)
  const approvedOrders = filteredOrders.filter(o => 
    o.status === 'approved' || o.status === 'paid' || o.status === 'pago'
  );
  const realApprovedSales = approvedOrders.length;
  const realApprovedRevenue = approvedOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);

  // Gastos com anúncios reais
  const realSpend = filteredCampaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const realProfit = realApprovedRevenue - realSpend;
  const realRoas = realSpend > 0 ? (realApprovedRevenue / realSpend).toFixed(2) : '0.00';
  const realRoi = realSpend > 0 ? ((realApprovedRevenue - realSpend) / realSpend).toFixed(2) : (realApprovedRevenue > 0 ? '0.00' : '-0.12');
  const realMargin = realApprovedRevenue > 0 ? `${(((realApprovedRevenue - realSpend) / realApprovedRevenue) * 100).toFixed(1)}%` : 'N/A';

  // Impostos e despesas
  const impostoMetaAds = realSpend > 0 ? (realSpend * 0.12).toFixed(2) : '0,00';
  const impostoTotal = realSpend > 0 ? (realSpend * 0.12).toFixed(2) : '0,00';

  // Vendas agrupadas por produto
  const productsMap = useMemo(() => {
    const map = {};
    approvedOrders.forEach(o => {
      const pName = o.productName || 'Produto MonsterPay';
      if (!map[pName]) {
        map[pName] = { name: pName, sales: 0, revenue: 0 };
      }
      map[pName].sales += 1;
      map[pName].revenue += Number(o.amount || 0);
    });
    return Object.values(map);
  }, [approvedOrders]);

  // Métodos de pagamento
  const paymentBreakdown = useMemo(() => {
    let pix = 0, cc = 0, boleto = 0, outros = 0;
    approvedOrders.forEach(o => {
      const pm = (o.paymentMethod || '').toLowerCase();
      if (pm.includes('pix')) pix++;
      else if (pm.includes('card') || pm.includes('credit')) cc++;
      else if (pm.includes('boleto')) boleto++;
      else outros++;
    });
    return { pix, cc, boleto, outros, total: approvedOrders.length };
  }, [approvedOrders]);

  // Taxa de aprovação Pix
  const pixRate = useMemo(() => {
    const totalPixCreated = filteredOrders.filter(o => (o.paymentMethod || '').toLowerCase().includes('pix') || !o.paymentMethod).length;
    const totalPixApproved = approvedOrders.filter(o => (o.paymentMethod || '').toLowerCase().includes('pix') || !o.paymentMethod).length;
    if (totalPixCreated === 0) return 'N/A';
    return `${Math.round((totalPixApproved / totalPixCreated) * 100)}%`;
  }, [filteredOrders, approvedOrders]);

  return (
    <div className="space-y-4 pb-16 font-sans select-none">

      {/* Banner de Aviso no estilo exato da UTMify */}
      {trialStatus.isTrial && (
        <div className="bg-[#24131A] border border-red-900/40 rounded-xl px-4 py-2.5 text-xs text-red-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
          <div>
            <span className="font-bold text-red-400 mr-2">Conta teste ativo!</span>
            <span className="text-red-300">
              Seu período de avaliação gratuito está ativo ({trialStatus.daysLeft} dias restantes). Não interrompa seu crescimento agora.
            </span>
            <button 
              onClick={() => navigate('/planos')}
              className="underline text-red-400 hover:text-red-300 ml-2 font-semibold cursor-pointer"
            >
              Gerenciar assinatura
            </button>
          </div>
        </div>
      )}

      {/* Card "Resumo" com filtros idênticos ao print da UTMify */}
      <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-lg">
        {/* Header do card Resumo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold text-white tracking-tight">
            Resumo
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 font-sans">
              Atualizado há {minsAgo === 0 ? 'alguns segundos' : `${minsAgo} minutos`}
            </span>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        </div>

        {/* Linha dos 5 Filtros Dropdowns da UTMify */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          {/* 1. Período de Visualização */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 flex items-center gap-1 font-medium">
              <span>Período de Visualização</span>
              <span className="text-zinc-500 text-[10px] cursor-help" title="Filtro de período de análise">ⓘ</span>
            </label>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Hoje">Hoje</option>
                <option value="Ontem">Ontem</option>
                <option value="7 dias">7 dias</option>
                <option value="14 dias">14 dias</option>
                <option value="30 dias">30 dias</option>
                <option value="Este mês">Este mês</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Conta de Anúncio */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 block font-medium">
              Conta de Anúncio
            </label>
            <div className="relative">
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Todas">Qualquer</option>
                {adAccountsList.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Fonte de Tráfego */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 block font-medium">
              Fonte de Tráfego
            </label>
            <div className="relative">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Qualquer">Qualquer</option>
                <option value="Facebook">Facebook Ads</option>
                <option value="Organico">Orgânico</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Plataforma */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 block font-medium">
              Plataforma
            </label>
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Qualquer">Qualquer</option>
                <option value="MonsterPay">MonsterPay</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 5. Produto */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 block font-medium">
              Produto
            </label>
            <div className="relative">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Qualquer">Qualquer</option>
                {uniqueProducts.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Link Mais filtros no canto inferior direito */}
        <div className="flex justify-end mt-2.5">
          <button className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer">
            <span>Mais filtros</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Row 1: 4 Cards Principais idênticos ao print da UTMify */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Faturamento Líquido */}
        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Faturamento Líquido</span>
            <span className="text-zinc-500 text-[11px]">ⓘ</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-3 tracking-tight font-sans">
            R$ {realApprovedRevenue.toFixed(2).replace('.', ',')}
          </div>
        </div>

        {/* Gastos com anúncios */}
        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Gastos com anúncios</span>
            <span className="text-zinc-500 text-[11px]">ⓘ</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mt-3 tracking-tight font-sans">
            R$ {realSpend.toFixed(2).replace('.', ',')}
          </div>
        </div>

        {/* ROAS */}
        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>ROAS</span>
            <span className="text-zinc-500 text-[11px]">ⓘ</span>
          </div>
          <div className={`text-xl sm:text-2xl font-bold mt-3 tracking-tight font-sans ${
            Number(realRoas) <= 0.00 ? 'text-[#EF4444]' : 'text-white'
          }`}>
            {realRoas}
          </div>
        </div>

        {/* Lucro */}
        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Lucro</span>
            <span className="text-zinc-500 text-[11px]">ⓘ</span>
          </div>
          <div className={`text-xl sm:text-2xl font-bold mt-3 tracking-tight font-sans ${
            realProfit < 0 ? 'text-[#EF4444]' : 'text-white'
          }`}>
            R$ {realProfit.toFixed(2).replace('.', ',')}
          </div>
        </div>

      </div>

      {/* Row 2: Vendas por Produto (Card Largo) + Grid com os 12 Mini Cards idêntico ao print */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Vendas por Produto (Lado Esquerdo - 5 colunas de 12) */}
        <div className="lg:col-span-5 bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-4">
              <span className="text-white font-semibold">Vendas por Produto</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>

            {productsMap.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-zinc-500 text-xs font-sans">
                Nenhuma venda por aqui
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {productsMap.map((prod, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#1E293B]/60 text-xs">
                    <div>
                      <div className="font-bold text-white">{prod.name}</div>
                      <div className="text-[11px] text-zinc-400">{prod.sales} {prod.sales === 1 ? 'venda aprovada' : 'vendas aprovadas'}</div>
                    </div>
                    <div className="font-mono font-bold text-emerald-400">
                      R$ {prod.revenue.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 12 Mini Cards da UTMify (Lado Direito - 7 colunas de 12 em 3 colunas) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Linha 1 */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Vendas Pendentes</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ {realPendingValue.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>ROI</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className={`text-lg font-bold mt-2 ${
              Number(realRoi) < 0 ? 'text-[#EF4444]' : 'text-white'
            }`}>
              {realRoi}
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Custos de Produto</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ 0,00
            </div>
          </div>

          {/* Linha 2 */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Vendas Reembolsadas</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ 0,00
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Margem</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              {realMargin}
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Despesas adicionais</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ 0,00
            </div>
          </div>

          {/* Linha 3 */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Imposto sobre vendas</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ 0,00
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Reembolso</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              0.0%
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Taxas</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ 0,00
            </div>
          </div>

          {/* Linha 4 */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Imposto total</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ {impostoTotal.replace('.', ',')}
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Chargeback</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              0.0%
            </div>
          </div>

          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Imposto Meta Ads</span>
              <span className="text-zinc-500 text-[11px]">ⓘ</span>
            </div>
            <div className="text-lg font-bold text-white mt-2">
              R$ {impostoMetaAds.replace('.', ',')}
            </div>
          </div>

        </div>

      </div>

      {/* Row 3: Vendas por Pagamento + Vendas por Fonte + Taxa de Aprovação idêntico ao print */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Vendas por Pagamento (4 cols de 12) */}
        <div className="lg:col-span-4 bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Vendas por Pagamento</span>
            <span className="text-zinc-500 text-[11px]">ⓘ</span>
          </div>

          {/* Gráfico Donut com Total no centro */}
          <div className="my-6 flex flex-col items-center justify-center relative">
            <div className="w-36 h-36 relative flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-[#0D1424]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Pix Slice */}
                {realApprovedSales > 0 && (
                  <path
                    className="text-[#0066FF]"
                    strokeDasharray="100, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-[10px] text-zinc-400 font-medium">Total</span>
                <span className="text-xl font-extrabold text-white font-sans">{realApprovedSales}</span>
              </div>
            </div>
          </div>

          {/* Legenda com as pills idênticas ao print */}
          <div className="flex items-center justify-center gap-4 text-xs pt-2">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
              <span>Pix</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
              <span>Cartão</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
              <span>Boleto</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
              <span>Outros</span>
            </div>
          </div>
        </div>

        {/* Vendas por Fonte (4 cols de 12) */}
        <div className="lg:col-span-4 bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Vendas por Fonte</span>
            <span className="text-zinc-500 text-[11px]">ⓘ</span>
          </div>

          {realApprovedSales === 0 ? (
            <div className="h-44 flex items-center justify-center text-zinc-500 text-xs font-sans">
              Nenhuma venda por aqui
            </div>
          ) : (
            <div className="space-y-4 my-auto py-4">
              <div>
                <div className="flex justify-between text-xs text-zinc-300 mb-1">
                  <span>Facebook Ads</span>
                  <span className="font-bold text-white">{realApprovedSales} (100%)</span>
                </div>
                <div className="w-full bg-[#0D1424] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0066FF] h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}
          <div className="h-4"></div>
        </div>

        {/* Taxa de Aprovação (4 cols de 12) */}
        <div className="lg:col-span-4 bg-[#141C2E] border border-[#1E293B] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-4">
            <span>Taxa de Aprovação</span>
            <span className="text-zinc-500 text-[11px]">ⓘ</span>
          </div>

          <div className="space-y-4 my-auto">
            {/* Cartão */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">Cartão</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                </div>
                <span className="text-zinc-400 font-mono text-xs">N/A</span>
              </div>
            </div>

            {/* Pix */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">Pix</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-[#0066FF] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                </div>
                <span className="text-white font-mono font-bold text-xs">{pixRate}</span>
              </div>
            </div>

            {/* Boleto */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">Boleto</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                </div>
                <span className="text-zinc-400 font-mono text-xs">N/A</span>
              </div>
            </div>
          </div>
          <div className="h-4"></div>
        </div>

      </div>

    </div>
  );
}
