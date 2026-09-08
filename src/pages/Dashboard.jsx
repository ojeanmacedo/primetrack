import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getTrialStatus } from '../utils/auth';
import { 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  HelpCircle, 
  RotateCw, 
  RotateCcw,
  PieChart,
  ArrowRight,
  Edit3,
  Check,
  X,
  GripVertical,
  Move
} from 'lucide-react';
import DateRangePicker from '../components/DateRangePicker';

function FunnelGauge({ percentage, strokeColor = '#0066FF', isFull = false }) {
  const radius = 24;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius; // ~150.8
  const validPct = Math.min(100, Math.max(0, Number(percentage) || 0));
  const dashoffset = circumference - (validPct / 100) * circumference;

  const displayPct = isFull || validPct >= 99.9 
    ? '100%' 
    : `${validPct.toFixed(1).replace('.', ',')}%`;

  return (
    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 58 58">
        {/* Background Track */}
        <circle
          cx="29"
          cy="29"
          r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
        />
        {/* Active Arc */}
        {validPct > 0 && (
          <circle
            cx="29"
            cy="29"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>
      {/* Percentage Center Text */}
      <span className="absolute text-[11px] sm:text-xs font-bold text-white tracking-tight font-sans">
        {displayPct}
      </span>
    </div>
  );
}

function FunnelConnector({ dropPct }) {
  return (
    <div className="flex flex-col items-center justify-center px-0.5 sm:px-1 min-w-[44px]">
      <ArrowRight className="w-3 h-3 text-zinc-600/70 mb-1" />
      {dropPct !== undefined && dropPct !== null && (
        <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#24131A] border border-red-500/20 text-[#EF4444]">
          {dropPct < 0 ? `${dropPct.toFixed(1).replace('.', ',')}%` : `${dropPct > 0 ? '+' : ''}${dropPct.toFixed(1).replace('.', ',')}%`}
        </span>
      )}
    </div>
  );
}

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

  // Modo de Personalização de Layout (Acionado pela canetinha)
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [showValues, setShowValues] = useState(true);

  const DEFAULT_LAYOUT = {
    // 6 KPIs em ordem harmônica
    kpis: ['faturamento', 'gastos', 'lucro', 'pendentes', 'roi', 'margem'],
    // 5 Cards Analíticos:
    // Linha 1 (3 horizontais): products, sources, approval
    // Linha 2 (2 horizontais): funnel, payments
    analysisCards: ['products', 'sources', 'approval', 'funnel', 'payments']
  };

  const [layoutConfig, setLayoutConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('primetrack_dashboard_layout_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.analysisCards) && parsed.analysisCards.includes('funnel') && parsed.analysisCards[0] === 'products' && parsed.analysisCards[1] === 'sources' && parsed.analysisCards[2] === 'approval') {
            return {
              kpis: Array.isArray(parsed.kpis) && parsed.kpis.length === 6 ? parsed.kpis : DEFAULT_LAYOUT.kpis,
              analysisCards: parsed.analysisCards
            };
          }
        }
      } catch (e) {}
    }
    return DEFAULT_LAYOUT;
  });

  const saveLayoutConfig = (newConfig) => {
    setLayoutConfig(newConfig);
    try {
      localStorage.setItem('primetrack_dashboard_layout_config', JSON.stringify(newConfig));
    } catch (e) {}
  };

  const resetLayoutConfig = () => {
    saveLayoutConfig(DEFAULT_LAYOUT);
  };

  const moveKpi = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= layoutConfig.kpis.length) return;
    const newKpis = [...layoutConfig.kpis];
    const [removed] = newKpis.splice(index, 1);
    newKpis.splice(newIndex, 0, removed);
    saveLayoutConfig({ ...layoutConfig, kpis: newKpis });
  };

  const swapAnalysisCards = (idx1, idx2) => {
    if (idx1 < 0 || idx1 >= layoutConfig.analysisCards.length || idx2 < 0 || idx2 >= layoutConfig.analysisCards.length || idx1 === idx2) return;
    const newCards = [...layoutConfig.analysisCards];
    const temp = newCards[idx1];
    newCards[idx1] = newCards[idx2];
    newCards[idx2] = temp;
    saveLayoutConfig({ ...layoutConfig, analysisCards: newCards });
  };

  const initialLayoutSnapshot = useRef(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('primetrack_edit_layout_status', { detail: { isEditing: isEditingLayout } }));
  }, [isEditingLayout]);

  const handleToggleEdit = (status) => {
    if (status) {
      initialLayoutSnapshot.current = JSON.parse(JSON.stringify(layoutConfig));
    }
    setIsEditingLayout(status);
  };

  const handleCancelEdit = () => {
    if (initialLayoutSnapshot.current) {
      saveLayoutConfig(initialLayoutSnapshot.current);
    }
    setIsEditingLayout(false);
  };

  // Drag and Drop com Mouse para reposicionamento
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'analysis' | 'kpi', index: number }
  const [dragOverItem, setDragOverItem] = useState(null); // { type: 'analysis' | 'kpi', index: number }

  const handleDragStart = (e, type, index) => {
    if (!isEditingLayout) return;
    setDraggedItem({ type, index });
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type, index }));
    } catch (err) {}
  };

  const handleDragOver = (e, type, index) => {
    if (!isEditingLayout || !draggedItem || draggedItem.type !== type) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverItem || dragOverItem.type !== type || dragOverItem.index !== index) {
      setDragOverItem({ type, index });
    }
  };

  const handleDragLeave = (type, index) => {
    if (dragOverItem?.type === type && dragOverItem?.index === index) {
      setDragOverItem(null);
    }
  };

  const handleDrop = (e, type, targetIndex) => {
    e.preventDefault();
    if (!isEditingLayout || !draggedItem || draggedItem.type !== type) return;
    const sourceIndex = draggedItem.index;
    if (sourceIndex === targetIndex) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    if (type === 'analysis') {
      swapAnalysisCards(sourceIndex, targetIndex);
    } else if (type === 'kpi') {
      const newKpis = [...layoutConfig.kpis];
      const [moved] = newKpis.splice(sourceIndex, 1);
      newKpis.splice(targetIndex, 0, moved);
      saveLayoutConfig({ ...layoutConfig, kpis: newKpis });
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

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

  const [pixelStats, setPixelStats] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('primetrack_cached_pixel_stats');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return { pageViews: 0, initiateCheckouts: 0, totalEvents: 0 };
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
      const [rRes, crRes, ordRes, pixRes] = await Promise.all([
        fetch('/api/meta/status'),
        fetch(`/api/campaigns?${query}`),
        fetch('/api/orders'),
        fetch(`/api/pixel/stats?${query}`).catch(() => null)
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

      if (pixRes) {
        try {
          const pData = await pixRes.json();
          if (pData && typeof pData.pageViews === 'number') {
            setPixelStats(pData);
            if (typeof window !== 'undefined') {
              localStorage.setItem('primetrack_cached_pixel_stats', JSON.stringify(pData));
            }
          }
        } catch (pErr) {}
      }

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
      const [cr, ord, pix] = await Promise.all([
        fetch(`/api/campaigns?${query}`),
        fetch('/api/orders'),
        fetch(`/api/pixel/stats?${query}`).catch(() => null)
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
      if (pix) {
        try {
          const pData = await pix.json();
          if (pData && typeof pData.pageViews === 'number') {
            setPixelStats(pData);
            if (typeof window !== 'undefined') {
              localStorage.setItem('primetrack_cached_pixel_stats', JSON.stringify(pData));
            }
          }
        } catch (pErr) {}
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

      const currentPreset = periodToPreset[period] || 'today';
      fetch(`/api/pixel/stats?datePreset=${currentPreset}`)
        .then(res => res.json())
        .then(pData => {
          if (pData && typeof pData.pageViews === 'number') {
            setPixelStats(pData);
            try {
              localStorage.setItem('primetrack_cached_pixel_stats', JSON.stringify(pData));
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

  useEffect(() => {
    const handleEditEvent = (e) => {
      setIsEditingLayout(prev => {
        const next = typeof e.detail?.isEditing === 'boolean' ? e.detail.isEditing : !prev;
        if (next) {
          initialLayoutSnapshot.current = JSON.parse(JSON.stringify(layoutConfig));
        }
        return next;
      });
    };

    const handleShowValues = (e) => {
      if (typeof e.detail?.showValues === 'boolean') {
        setShowValues(e.detail.showValues);
      } else {
        setShowValues(prev => !prev);
      }
    };

    window.addEventListener('primetrack_toggle_edit_layout', handleEditEvent);
    window.addEventListener('primetrack_toggle_show_values', handleShowValues);

    return () => {
      window.removeEventListener('primetrack_toggle_edit_layout', handleEditEvent);
      window.removeEventListener('primetrack_toggle_show_values', handleShowValues);
    };
  }, []);

  // Mantém todas as vendas individuais válidas pelo ID do pedido
  const deduplicatedOrders = useMemo(() => {
    const orderMap = new Map();
    for (const o of ordersList) {
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

  // Vendas agrupadas por produto com quantidade e porcentagem
  const productsMap = useMemo(() => {
    const map = {};
    const totalApproved = approvedOrders.length;
    approvedOrders.forEach(o => {
      const pName = o.productName || 'Produto MonsterPay';
      if (!map[pName]) {
        map[pName] = { name: pName, sales: 0, revenue: 0 };
      }
      map[pName].sales += 1;
      map[pName].revenue += Number(o.amount || 0);
    });

    return Object.values(map)
      .map(p => ({
        ...p,
        percentage: totalApproved > 0 ? (p.sales / totalApproved) * 100 : 0
      }))
      .sort((a, b) => b.sales - a.sales);
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

  // Cálculos de Vendas por Horário (distribuição pelas 24h do dia)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hStr = String(i).padStart(2, '0');
      return {
        hour: i,
        timeLabel: `${hStr}:00`,
        rangeLabel: `${hStr}:00 - ${hStr}:59`,
        count: 0,
        revenue: 0,
        percentage: 0
      };
    });

    const targetOrders = approvedOrders.length > 0 ? approvedOrders : [];
    const totalSales = targetOrders.length;

    targetOrders.forEach(o => {
      const dateVal = o.createdAt || o.created_at;
      if (!dateVal) return;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return;

      const hour = d.getHours();
      if (hour >= 0 && hour < 24) {
        hours[hour].count += 1;
        hours[hour].revenue += Number(o.amount || 0);
      }
    });

    if (totalSales > 0) {
      hours.forEach(h => {
        h.percentage = (h.count / totalSales) * 100;
      });
    }

    const maxCount = Math.max(...hours.map(h => h.count), 1);

    return {
      hours,
      totalSales,
      maxCount
    };
  }, [approvedOrders]);

  // Cálculos do Funil de Conversão (Meta Ads + Pixel PrimeTrack + MonsterPay)
  const totalMetaClicks = useMemo(() => {
    return filteredCampaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  }, [filteredCampaigns]);

  const rawInic = filteredOrders.length;
  const rawApr = realApprovedSales;
  const rawIcs = Math.max(pixelStats.initiateCheckouts || 0, rawInic);
  const rawVis = Math.max(pixelStats.pageViews || 0, rawIcs);

  const funnelClicks = totalMetaClicks > 0 
    ? totalMetaClicks 
    : (rawVis > 0 ? rawVis : (rawInic > 0 ? rawInic : 0));

  const funnelVis = rawVis;
  const funnelIcs = rawIcs;
  const funnelInic = rawInic;
  const funnelApr = rawApr;

  const pctClicks = funnelClicks > 0 ? 100 : 0;
  const pctVis = funnelClicks > 0 ? Math.min(100, (funnelVis / funnelClicks) * 100) : 0;
  const dropVis = funnelClicks > 0 && funnelVis > 0 ? ((funnelVis - funnelClicks) / funnelClicks) * 100 : null;

  const pctIcs = funnelClicks > 0 ? Math.min(100, (funnelIcs / funnelClicks) * 100) : 0;
  const dropIcs = funnelVis > 0 && funnelIcs > 0 ? ((funnelIcs - funnelVis) / funnelVis) * 100 : null;

  const pctInic = funnelClicks > 0 ? Math.min(100, (funnelInic / funnelClicks) * 100) : 0;
  const dropInic = funnelIcs > 0 && funnelInic > 0 ? ((funnelInic - funnelIcs) / funnelIcs) * 100 : null;

  const pctApr = funnelClicks > 0 ? Math.min(100, (funnelApr / funnelClicks) * 100) : 0;

  const realPendingSales = pendingOrders.length;

  const kpiDataMap = {
    faturamento: {
      id: 'faturamento',
      label: 'Faturamento Líquido',
      value: `R$ ${realApprovedRevenue.toFixed(2).replace('.', ',')}`,
      subtitle: `${realApprovedSales} ${realApprovedSales === 1 ? 'venda aprovada' : 'vendas aprovadas'}`,
      valueColor: 'text-white'
    },
    gastos: {
      id: 'gastos',
      label: 'Gastos com anúncios',
      value: `R$ ${realSpend.toFixed(2).replace('.', ',')}`,
      subtitle: 'Meta Ads API',
      valueColor: 'text-white'
    },
    lucro: {
      id: 'lucro',
      label: 'Lucro',
      value: `R$ ${realProfit.toFixed(2).replace('.', ',')}`,
      subtitle: realProfit >= 0 ? 'Resultado positivo' : 'Abaixo da meta',
      valueColor: realProfit < 0 ? 'text-[#EF4444]' : 'text-white'
    },
    pendentes: {
      id: 'pendentes',
      label: 'Vendas Pendentes',
      value: `R$ ${realPendingValue.toFixed(2).replace('.', ',')}`,
      subtitle: `${realPendingSales} ${realPendingSales === 1 ? 'venda pendente' : 'vendas pendentes'}`,
      valueColor: 'text-white'
    },
    roi: {
      id: 'roi',
      label: 'ROI',
      value: realRoi,
      subtitle: 'Retorno sobre investimento',
      valueColor: Number(realRoi) < 0 ? 'text-[#EF4444]' : 'text-white'
    },
    margem: {
      id: 'margem',
      label: 'Margem',
      value: realMargin,
      subtitle: 'Margem líquida operacional',
      valueColor: 'text-white'
    }
  };

  const renderAnalysisCard = (cardKey, slotIndex) => {
    const isDraggingThis = draggedItem?.type === 'analysis' && draggedItem?.index === slotIndex;
    const isOverThis = dragOverItem?.type === 'analysis' && dragOverItem?.index === slotIndex && !isDraggingThis;

    const editHeaderControls = isEditingLayout ? (
      <GripVertical className="w-4 h-4 text-blue-400 cursor-grab active:cursor-grabbing" title="Arraste com o mouse para reposicionar" />
    ) : (
      <span className="text-zinc-500 text-[11px] cursor-help">ⓘ</span>
    );

    const baseContainerClass = `bg-[#141C2E] border ${
      isDraggingThis
        ? 'border-dashed border-blue-500 opacity-30 scale-[0.98] shadow-2xl ring-2 ring-blue-500/30'
        : isOverThis
          ? 'border-blue-400 ring-4 ring-blue-500/50 bg-[#16233E] scale-[1.01]'
          : isEditingLayout
            ? 'border-blue-500/50 ring-1 ring-blue-500/30 hover:border-blue-400 cursor-grab active:cursor-grabbing'
            : 'border-[#1E293B]'
    } rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-md h-[240px] transition-all duration-200 relative select-none`;

    const dropOverlay = isOverThis && (
      <div className="absolute inset-0 bg-[#0066FF]/20 backdrop-blur-[1px] border-2 border-[#0066FF] rounded-xl flex flex-col items-center justify-center z-30 pointer-events-none">
        <div className="bg-[#0066FF] text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <Move className="w-4 h-4" />
          <span>Solte o mouse aqui para trocar de posição</span>
        </div>
      </div>
    );

    if (cardKey === 'products') {
      return (
        <div 
          key="products"
          draggable={isEditingLayout}
          onDragStart={(e) => handleDragStart(e, 'analysis', slotIndex)}
          onDragOver={(e) => handleDragOver(e, 'analysis', slotIndex)}
          onDragLeave={() => handleDragLeave('analysis', slotIndex)}
          onDrop={(e) => handleDrop(e, 'analysis', slotIndex)}
          onDragEnd={handleDragEnd}
          className={baseContainerClass}
        >
          {dropOverlay}
          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-3">
              <span className="text-white font-semibold">Vendas por Produto</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Vendas agrupadas por produto">ⓘ</span>}
            </div>

            {productsMap.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-zinc-500 text-xs font-sans">
                Nenhuma venda por aqui
              </div>
            ) : (
              <div className="space-y-3 py-1 max-h-[185px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1E293B]">
                {productsMap.map((prod, i) => {
                  const validPct = Math.min(100, Math.max(0, prod.percentage || 0));
                  const circumference = 56.55; // 2 * pi * 9
                  const strokeDashoffset = circumference - (validPct / 100) * circumference;

                  return (
                    <div key={i} className="flex items-center justify-between text-xs group">
                      <div className="font-normal text-zinc-200 truncate pr-3 text-xs tracking-tight" title={prod.name}>
                        {prod.name}
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quantidade vendida */}
                        <span className="text-zinc-300 font-mono text-xs w-3 text-right">
                          {prod.sales}
                        </span>

                        {/* Gauge Circular Mini */}
                        <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 relative flex items-center justify-center shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              fill="none"
                              stroke="#1E293B"
                              strokeWidth="2.5"
                            />
                            {validPct > 0 && (
                              <circle
                                cx="12"
                                cy="12"
                                r="9"
                                fill="none"
                                stroke="#0066FF"
                                strokeWidth="2.5"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                              />
                            )}
                          </svg>
                        </div>

                        {/* Porcentagem */}
                        <span className="text-white font-bold font-mono text-xs w-11 text-right">
                          {validPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (cardKey === 'payments') {
      return (
        <div 
          key="payments"
          draggable={isEditingLayout}
          onDragStart={(e) => handleDragStart(e, 'analysis', slotIndex)}
          onDragOver={(e) => handleDragOver(e, 'analysis', slotIndex)}
          onDragLeave={() => handleDragLeave('analysis', slotIndex)}
          onDrop={(e) => handleDrop(e, 'analysis', slotIndex)}
          onDragEnd={handleDragEnd}
          className={baseContainerClass}
        >
          {dropOverlay}
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-1">
              <span className="text-white font-semibold">Vendas por Pagamento</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Distribuição por método de pagamento">ⓘ</span>}
            </div>

            {/* Gráfico Donut com Total no centro */}
            <div className="my-1.5 flex flex-col items-center justify-center relative">
              <div className="w-22 h-22 sm:w-24 sm:h-24 relative flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#0D1424]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
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
                  <span className="text-[9px] text-zinc-400 font-medium">Total</span>
                  <span className="text-lg font-bold text-white font-sans">{realApprovedSales}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legenda com as pills idênticas ao print */}
          <div className="flex items-center justify-center gap-3.5 text-[11px] pt-1.5 border-t border-[#1E293B]/40">
            <div className="flex items-center gap-1 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
              <span>Pix</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
              <span>Cartão</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
              <span>Boleto</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
              <span>Outros</span>
            </div>
          </div>
        </div>
      );
    }

    if (cardKey === 'sources') {
      return (
        <div 
          key="sources"
          draggable={isEditingLayout}
          onDragStart={(e) => handleDragStart(e, 'analysis', slotIndex)}
          onDragOver={(e) => handleDragOver(e, 'analysis', slotIndex)}
          onDragLeave={() => handleDragLeave('analysis', slotIndex)}
          onDrop={(e) => handleDrop(e, 'analysis', slotIndex)}
          onDragEnd={handleDragEnd}
          className={baseContainerClass}
        >
          {dropOverlay}
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-2">
              <span className="text-white font-semibold">Vendas por Fonte</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Origem de tráfego das vendas">ⓘ</span>}
            </div>

            {realApprovedSales === 0 ? (
              <div className="h-28 flex items-center justify-center text-zinc-500 text-xs font-sans">
                Nenhuma venda por aqui
              </div>
            ) : (
              <div className="space-y-2.5 py-3">
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 mb-1">
                    <span className="font-medium">Facebook Ads</span>
                    <span className="font-bold text-white">{realApprovedSales} (100%)</span>
                  </div>
                  <div className="w-full bg-[#0D1424] h-2 rounded-full overflow-hidden border border-[#1E293B]/60">
                    <div className="bg-[#0066FF] h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="text-[10px] text-zinc-500 pt-1.5 border-t border-[#1E293B]/40 flex items-center justify-between">
            <span>Rastreamento CAPI & Pixel</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo
            </span>
          </div>
        </div>
      );
    }

    if (cardKey === 'approval') {
      return (
        <div 
          key="approval"
          draggable={isEditingLayout}
          onDragStart={(e) => handleDragStart(e, 'analysis', slotIndex)}
          onDragOver={(e) => handleDragOver(e, 'analysis', slotIndex)}
          onDragLeave={() => handleDragLeave('analysis', slotIndex)}
          onDrop={(e) => handleDrop(e, 'analysis', slotIndex)}
          onDragEnd={handleDragEnd}
          className={baseContainerClass}
        >
          {dropOverlay}
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-2">
              <span className="text-white font-semibold">Taxa de Aprovação</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Percentual de pedidos aprovados por meio">ⓘ</span>}
            </div>

            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Cartão</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  </div>
                  <span className="text-zinc-400 font-mono text-xs">N/A</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Pix</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-[#0066FF] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                  </div>
                  <span className="text-white font-mono font-bold text-xs">{pixRate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Boleto</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  </div>
                  <span className="text-zinc-400 font-mono text-xs">N/A</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 pt-1.5 border-t border-[#1E293B]/40 flex items-center justify-between">
            <span>Conversão Geral do Checkout</span>
            <span className="font-mono font-bold text-white">{pixRate}</span>
          </div>
        </div>
      );
    }

    if (cardKey === 'funnel') {
      const centerY = 65;
      const halfH = (pct) => {
        if (!pct || pct <= 0) return 2.5;
        const norm = Math.min(100, Math.max(0, pct));
        if (norm >= 99.5) return 46;
        return Math.max(2.5, Math.min(46, 3 + Math.pow(norm / 100, 0.65) * 43));
      };

      const h0 = halfH(pctClicks);
      const h1 = halfH(pctVis);
      const h2 = halfH(pctIcs);
      const h3 = halfH(pctInic);
      const h4 = halfH(pctApr);

      const t0 = centerY - h0, b0 = centerY + h0;
      const t1 = centerY - h1, b1 = centerY + h1;
      const t2 = centerY - h2, b2 = centerY + h2;
      const t3 = centerY - h3, b3 = centerY + h3;
      const t4 = centerY - h4, b4 = centerY + h4;

      const pathD = `
        M 0 ${t0.toFixed(1)}
        L 70 ${t0.toFixed(1)}
        C 150 ${t0.toFixed(1)}, 250 ${t1.toFixed(1)}, 300 ${t1.toFixed(1)}
        L 310 ${t1.toFixed(1)}
        C 370 ${t1.toFixed(1)}, 440 ${t2.toFixed(1)}, 500 ${t2.toFixed(1)}
        L 510 ${t2.toFixed(1)}
        C 570 ${t2.toFixed(1)}, 640 ${t3.toFixed(1)}, 700 ${t3.toFixed(1)}
        L 710 ${t3.toFixed(1)}
        C 770 ${t3.toFixed(1)}, 840 ${t4.toFixed(1)}, 900 ${t4.toFixed(1)}
        L 920 ${t4.toFixed(1)}
        C 950 ${t4.toFixed(1)}, 970 ${centerY}, 1000 ${centerY}
        C 970 ${centerY}, 950 ${b4.toFixed(1)}, 920 ${b4.toFixed(1)}
        L 900 ${b4.toFixed(1)}
        C 840 ${b4.toFixed(1)}, 770 ${b3.toFixed(1)}, 710 ${b3.toFixed(1)}
        L 700 ${b3.toFixed(1)}
        C 640 ${b3.toFixed(1)}, 570 ${b2.toFixed(1)}, 510 ${b2.toFixed(1)}
        L 500 ${b2.toFixed(1)}
        C 440 ${b2.toFixed(1)}, 370 ${b1.toFixed(1)}, 310 ${b1.toFixed(1)}
        L 300 ${b1.toFixed(1)}
        C 250 ${b1.toFixed(1)}, 150 ${b0.toFixed(1)}, 70 ${b0.toFixed(1)}
        L 0 ${b0.toFixed(1)}
        Z
      `;

      return (
        <div 
          key="funnel"
          draggable={isEditingLayout}
          onDragStart={(e) => handleDragStart(e, 'analysis', slotIndex)}
          onDragOver={(e) => handleDragOver(e, 'analysis', slotIndex)}
          onDragLeave={() => handleDragLeave('analysis', slotIndex)}
          onDrop={(e) => handleDrop(e, 'analysis', slotIndex)}
          onDragEnd={handleDragEnd}
          className={baseContainerClass}
        >
          {dropOverlay}
          <div className="w-full flex flex-col justify-between h-full">
            {/* Header */}
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-1">
              <span className="text-white font-semibold">Funil de Conversão (Meta Ads)</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Funil de conversão de cliques até vendas aprovadas">ⓘ</span>}
            </div>

            {/* Rótulos Superiores das Etapas */}
            <div className="flex items-center justify-between text-center text-[10px] sm:text-[11px] font-semibold text-zinc-300">
              <span className="w-1/5">Cliques</span>
              <span className="w-1/5">Vis. Página</span>
              <span className="w-1/5">ICs</span>
              <span className="w-1/5">Vendas Inic.</span>
              <span className="w-1/5">Vendas Apr.</span>
            </div>

            {/* Onda Horizontal com Gradiente (SVG) */}
            <div className="relative w-full my-1 sm:my-1.5">
              <svg className="w-full h-24 sm:h-26 overflow-visible" viewBox="0 0 1000 130">
                <defs>
                  <linearGradient id="streamFunnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0066FF" />
                    <stop offset="25%" stopColor="#2563EB" />
                    <stop offset="52%" stopColor="#5B21B6" />
                    <stop offset="75%" stopColor="#86198F" />
                    <stop offset="92%" stopColor="#BE185D" />
                    <stop offset="100%" stopColor="#E11D48" />
                  </linearGradient>
                </defs>

                {/* Divisórias verticais sutis entre as 5 etapas */}
                <line x1="200" y1="5" x2="200" y2="125" stroke="#223048" strokeWidth="1.5" />
                <line x1="400" y1="5" x2="400" y2="125" stroke="#223048" strokeWidth="1.5" />
                <line x1="600" y1="5" x2="600" y2="125" stroke="#223048" strokeWidth="1.5" />
                <line x1="800" y1="5" x2="800" y2="125" stroke="#223048" strokeWidth="1.5" />

                {/* Fluxo Orgânico do Funil com Curvas Suaves */}
                <path d={pathD} fill="url(#streamFunnelGrad)" />

                {/* Linha magenta horizontal de saída no final */}
                <line x1="920" y1={centerY} x2="1000" y2={centerY} stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />

                {/* Porcentagens no Centro da Onda */}
                <text x="100" y="70" textAnchor="middle" fill="#FFFFFF" fontWeight="bold" fontSize="16" fontFamily="sans-serif">
                  {funnelClicks > 0 ? '100%' : '0%'}
                </text>
                <text x="300" y="70" textAnchor="middle" fill="#FFFFFF" fontWeight="bold" fontSize="15" fontFamily="sans-serif">
                  {pctVis.toFixed(1)}%
                </text>
                <text x="500" y="70" textAnchor="middle" fill="#FFFFFF" fontWeight="bold" fontSize="14" fontFamily="sans-serif">
                  {pctIcs.toFixed(1)}%
                </text>
                <text x="700" y="70" textAnchor="middle" fill="#FFFFFF" fontWeight="bold" fontSize="13" fontFamily="sans-serif">
                  {pctInic.toFixed(1)}%
                </text>
                <text x="900" y={h4 < 8 ? "57" : "70"} textAnchor="middle" fill="#FFFFFF" fontWeight="bold" fontSize="12" fontFamily="sans-serif">
                  {pctApr.toFixed(1)}%
                </text>
              </svg>
            </div>

            {/* Quantidades Numéricas Inferiores */}
            <div className="flex items-center justify-between text-center text-[11px] sm:text-xs font-mono font-bold text-zinc-300">
              <span className="w-1/5">{funnelClicks.toLocaleString('pt-BR')}</span>
              <span className="w-1/5">{funnelVis.toLocaleString('pt-BR')}</span>
              <span className="w-1/5">{funnelIcs.toLocaleString('pt-BR')}</span>
              <span className="w-1/5">{funnelInic.toLocaleString('pt-BR')}</span>
              <span className="w-1/5">{funnelApr.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderHourlySalesSection = () => (
    <div className={`bg-[#141C2E] border ${
      isEditingLayout ? 'border-blue-500/50 ring-1 ring-blue-500/30' : 'border-[#1E293B]'
    } rounded-xl p-3.5 sm:p-4 shadow-md transition-all duration-200 relative`}>
      {/* Header do Card */}
      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
          Vendas por Horário
        </h3>
        <div className="flex items-center gap-1.5">
          {isEditingLayout ? (
            <GripVertical className="w-4 h-4 text-blue-400" title="Bloco de Vendas por Horário" />
          ) : (
            <span 
              className="text-zinc-500 hover:text-zinc-300 text-[11px] cursor-help transition-colors" 
              title="Distribuição das vendas aprovadas ao longo das 24 horas do dia"
            >
              ⓘ
            </span>
          )}
        </div>
      </div>

      {/* Gráfico de Vendas por Horário (24 colunas de 00:00 a 23:00) */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#1E293B] pb-1">
        <div className="min-w-[700px] sm:min-w-[760px] w-full">
          {/* Área das Barras e Porcentagens */}
          <div className="h-24 sm:h-28 flex items-end justify-between gap-1 sm:gap-1.5 px-1 pt-3 pb-1.5 border-b border-[#1E293B]">
            {hourlyData.hours.map((h) => {
              const hasSales = h.count > 0;
              // Altura proporcional comprimida
              const barHeight = hasSales 
                ? Math.max(14, Math.round((h.count / hourlyData.maxCount) * 65))
                : 0;

              return (
                <div 
                  key={h.hour}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Tooltip Hover no card */}
                  <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                    <div className="bg-[#0B0F19] text-white text-[10px] rounded-lg px-2 py-1 shadow-2xl border border-blue-500/40 flex flex-col items-center gap-0.5">
                      <span className="font-bold text-blue-400 font-mono">{h.rangeLabel}</span>
                      <span className="font-medium">
                        {h.count} {h.count === 1 ? 'venda' : 'vendas'} ({h.percentage.toFixed(1)}%)
                      </span>
                      {h.count > 0 && (
                        <span className="text-[10px] text-zinc-400 font-mono">
                          R$ {h.revenue.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                    <div className="w-1.5 h-1.5 bg-[#0B0F19] border-r border-b border-blue-500/40 rotate-45 -mt-1" />
                  </div>

                  {/* Rótulo de porcentagem acima da barra */}
                  {hasSales ? (
                    <span className="text-[9px] sm:text-[10px] text-zinc-400 font-mono font-medium pb-1 transition-colors group-hover:text-blue-300">
                      {h.percentage.toFixed(1)}%
                    </span>
                  ) : (
                    <div className="h-3" />
                  )}

                  {/* Barra Azul */}
                  {hasSales ? (
                    <div 
                      style={{ height: `${barHeight}px` }}
                      className="w-full max-w-[32px] min-w-[6px] bg-[#0066FF] group-hover:bg-[#2563EB] rounded-t-[2px] shadow-sm shadow-blue-500/20 transition-all duration-150"
                    />
                  ) : (
                    <div className="w-full max-w-[32px] h-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Linha dos Horários (00:00 até 23:00) */}
          <div className="flex items-center justify-between gap-1 sm:gap-1.5 px-1 pt-1.5">
            {hourlyData.hours.map((h) => (
              <div 
                key={h.hour}
                className="flex-1 text-center text-[9px] sm:text-[10px] text-zinc-400 font-mono tracking-tight"
              >
                {h.timeLabel}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 pb-12 font-sans select-none">

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

      {/* Banner de Edição Ativa (Canetinha) */}
      {isEditingLayout && (
        <div className="bg-gradient-to-r from-[#0F1D38] via-[#142347] to-[#0F1D38] border border-blue-500/50 rounded-xl p-3 sm:p-3.5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
              <Edit3 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Personalização de Layout Ativa</span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-bold">
                  Modo de Edição
                </span>
              </div>
              <p className="text-[11px] text-zinc-300">
                <span className="font-semibold text-white">🖱️ Arraste com o mouse</span> qualquer card ou métrica para mudar de posição. O formato quadrado simétrico da dashboard é mantido sempre.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleCancelEdit}
              className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Cancelar e descartar alterações"
            >
              <X className="w-3 h-3 text-zinc-400" />
              <span>Cancelar</span>
            </button>
            <button 
              onClick={resetLayoutConfig}
              className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Restaurar posições originais"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar Padrão</span>
            </button>
            <button 
              onClick={() => handleToggleEdit(false)}
              className="px-3.5 py-1 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Salvar e Concluir</span>
            </button>
          </div>
        </div>
      )}

      {/* Card "Resumo" com filtros idênticos ao print da UTMify */}
      <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-3.5 sm:p-4 shadow-md">
        {/* Header do card Resumo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Resumo
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 font-sans">
              Atualizado há {minsAgo === 0 ? 'alguns segundos' : `${minsAgo} minutos`}
            </span>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="px-3.5 py-1 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        </div>

        {/* Linha dos 5 Filtros Dropdowns da UTMify */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          
          {/* 1. Período de Visualização */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 flex items-center gap-1 font-medium">
              <span>Período de Visualização</span>
              <span className="text-zinc-500 text-[10px] cursor-help" title="Filtro de período de análise">ⓘ</span>
            </label>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Hoje">Hoje</option>
                <option value="Ontem">Ontem</option>
                <option value="7 dias">7 dias</option>
                <option value="14 dias">14 dias</option>
                <option value="30 dias">30 dias</option>
                <option value="Este mês">Este mês</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Conta de Anúncio */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block font-medium">
              Conta de Anúncio
            </label>
            <div className="relative">
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Todas">Qualquer</option>
                {adAccountsList.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Fonte de Tráfego */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block font-medium">
              Fonte de Tráfego
            </label>
            <div className="relative">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Qualquer">Qualquer</option>
                <option value="Facebook">Facebook Ads</option>
                <option value="Organico">Orgânico</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Plataforma */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block font-medium">
              Plataforma
            </label>
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Qualquer">Qualquer</option>
                <option value="MonsterPay">MonsterPay</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 5. Produto */}
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block font-medium">
              Produto
            </label>
            <div className="relative">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Qualquer">Qualquer</option>
                {uniqueProducts.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Link Mais filtros no canto inferior direito */}
        <div className="flex justify-end mt-2">
          <button className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer">
            <span>Mais filtros</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* 6 Cards KPIs Principais em Grid 3x2 Perfeito e Harmônico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {layoutConfig.kpis.map((kpiKey, index) => {
          const card = kpiDataMap[kpiKey] || kpiDataMap.faturamento;
          const isKpiDragging = draggedItem?.type === 'kpi' && draggedItem?.index === index;
          const isKpiOver = dragOverItem?.type === 'kpi' && dragOverItem?.index === index && !isKpiDragging;

          return (
            <div 
              key={card.id}
              draggable={isEditingLayout}
              onDragStart={(e) => handleDragStart(e, 'kpi', index)}
              onDragOver={(e) => handleDragOver(e, 'kpi', index)}
              onDragLeave={() => handleDragLeave('kpi', index)}
              onDrop={(e) => handleDrop(e, 'kpi', index)}
              onDragEnd={handleDragEnd}
              className={`bg-[#141C2E] border ${
                isKpiDragging
                  ? 'border-dashed border-blue-500 opacity-30 scale-[0.97] shadow-2xl ring-2 ring-blue-500/30'
                  : isKpiOver
                    ? 'border-blue-400 ring-4 ring-blue-500/50 bg-[#16233E] scale-[1.02]'
                    : isEditingLayout 
                      ? 'border-blue-500/50 ring-1 ring-blue-500/30 hover:border-blue-400 cursor-grab active:cursor-grabbing' 
                      : 'border-[#1E293B]'
              } rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-md h-[92px] sm:h-[98px] transition-all duration-200 relative group select-none`}
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span className="truncate">
                  {card.label}
                </span>
                <div className="flex items-center gap-1">
                  {isEditingLayout ? (
                    <GripVertical className="w-3.5 h-3.5 text-blue-400 cursor-grab active:cursor-grabbing" title="Arraste com o mouse para reposicionar" />
                  ) : (
                    <span className="text-zinc-500 text-[11px] cursor-help" title={card.label}>ⓘ</span>
                  )}
                </div>
              </div>

              <div>
                <div className={`text-lg sm:text-xl font-bold tracking-tight font-sans ${card.valueColor}`}>
                  {showValues ? card.value : '••••••'}
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate font-sans">
                  {card.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Linha Analítica 1 (Horizontal - 3 Blocos): Vendas por Produto, Vendas por Fonte, Taxa de Aprovação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
        {layoutConfig.analysisCards.slice(0, 3).map((cardKey, i) => renderAnalysisCard(cardKey, i))}
      </div>

      {/* Linha Analítica 2 (Horizontal - 2 Blocos): Funil de Conversão e Vendas por Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
        {layoutConfig.analysisCards.slice(3, 5).map((cardKey, i) => renderAnalysisCard(cardKey, i + 3))}
      </div>

      {/* Bloco de Vendas por Horário */}
      {renderHourlySalesSection()}

    </div>
  );
}
