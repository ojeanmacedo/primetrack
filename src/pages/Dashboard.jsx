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
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import DateRangePicker from '../components/DateRangePicker';
import { getTaxSettings } from './Taxes';

// Converte qualquer data para YYYY-MM-DD no fuso de São Paulo / Brasília (UTC-3)
const toBrazilYMD = (dateInput = new Date()) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const spDate = new Date(d.getTime() - (3 * 3600 * 1000));
  const y = spDate.getUTCFullYear();
  const m = String(spDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(spDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

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

  const [period, setPeriod] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primetrack_dashboard_period');
      if (saved === '14 dias') return '15 dias';
      if (saved) return saved;
    }
    return 'Hoje';
  });
  const [customRange, setCustomRange] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primetrack_dashboard_custom_range');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return null;
  });

  const periodRef = useRef(period);
  const customRangeRef = useRef(customRange);

  useEffect(() => {
    periodRef.current = period;
    customRangeRef.current = customRange;
  }, [period, customRange]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
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
  const [currentBreakpoint, setCurrentBreakpoint] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) return 'xs';
      if (window.innerWidth < 1024) return 'md';
      return 'lg';
    }
    return 'lg';
  });
  const currentBreakpointRef = useRef(currentBreakpoint);
  useEffect(() => {
    currentBreakpointRef.current = currentBreakpoint;
  }, [currentBreakpoint]);

  const getIsMobile = () => {
    const bp = currentBreakpointRef.current;
    return bp === 'xs' || bp === 'sm' || (typeof window !== 'undefined' && window.innerWidth < 768);
  };

  const DEFAULT_DESKTOP_LAYOUT = [
    // Linha 0: 4 KPIs (h: 2, w: 3 cada = 12 cols, altura 104px)
    { i: 'faturamento', x: 0, y: 0, w: 3, h: 2 },
    { i: 'gastos', x: 3, y: 0, w: 3, h: 2 },
    { i: 'lucro', x: 6, y: 0, w: 3, h: 2 },
    { i: 'cpa', x: 9, y: 0, w: 3, h: 2 },
    // Linha 1: 4 KPIs (h: 2, w: 3 cada = 12 cols, altura 104px)
    { i: 'roas', x: 0, y: 2, w: 3, h: 2 },
    { i: 'margem', x: 3, y: 2, w: 3, h: 2 },
    { i: 'pendentes', x: 6, y: 2, w: 3, h: 2 },
    { i: 'reembolsadas', x: 9, y: 2, w: 3, h: 2 },
    // Linha 2: 3 Cards Analíticos (h: 3, w: 4 cada = 12 cols, altura 162px -> ~20% menor)
    { i: 'products', x: 0, y: 4, w: 4, h: 3 },
    { i: 'sources', x: 4, y: 4, w: 4, h: 3 },
    { i: 'approval', x: 8, y: 4, w: 4, h: 3 },
    // Linha 3: Funil de Conversão + Vendas por Pagamento lado a lado (h: 4, w: 6 cada = 12 cols, altura 220px)
    { i: 'funnel', x: 0, y: 7, w: 6, h: 4 },
    { i: 'payments', x: 6, y: 7, w: 6, h: 4 },
    // Linha 4: Vendas por Horário (h: 4, w: 12 = 12 cols, altura 220px)
    { i: 'hourly', x: 0, y: 11, w: 12, h: 4 }
  ];

  const DEFAULT_MOBILE_LAYOUT = [
    { i: 'faturamento', x: 0, y: 0, w: 1, h: 2 },
    { i: 'gastos', x: 0, y: 2, w: 1, h: 2 },
    { i: 'lucro', x: 0, y: 4, w: 1, h: 2 },
    { i: 'cpa', x: 0, y: 6, w: 1, h: 2 },
    { i: 'roas', x: 0, y: 8, w: 1, h: 2 },
    { i: 'margem', x: 0, y: 10, w: 1, h: 2 },
    { i: 'pendentes', x: 0, y: 12, w: 1, h: 2 },
    { i: 'reembolsadas', x: 0, y: 14, w: 1, h: 2 },
    { i: 'products', x: 0, y: 16, w: 1, h: 3 },
    { i: 'sources', x: 0, y: 19, w: 1, h: 3 },
    { i: 'approval', x: 0, y: 22, w: 1, h: 3 },
    { i: 'funnel', x: 0, y: 25, w: 1, h: 4 },
    { i: 'payments', x: 0, y: 29, w: 1, h: 4 },
    { i: 'hourly', x: 0, y: 33, w: 1, h: 4 }
  ];

  const sanitizeLayout = (savedLayout, defaultLayout, isMobileLayout = false) => {
    if (!Array.isArray(savedLayout)) return defaultLayout;
    const existingMap = new Map();
    savedLayout.forEach(item => {
      if (item && item.i) {
        existingMap.set(item.i, item);
      }
    });

    const result = [];
    savedLayout.forEach(item => {
      if (item && item.i && defaultLayout.some(d => d.i === item.i)) {
        const defaultItem = defaultLayout.find(d => d.i === item.i);
        result.push(isMobileLayout ? { 
          ...item, 
          x: 0, 
          w: 1, 
          h: defaultItem ? defaultItem.h : (item.h || 2) 
        } : { 
          ...item,
          h: defaultItem ? defaultItem.h : (item.h || 2) 
        });
      }
    });

    defaultLayout.forEach(defaultItem => {
      if (!existingMap.has(defaultItem.i)) {
        result.push({ ...defaultItem });
      }
    });

    return result;
  };

  const [desktopLayout, setDesktopLayout] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('primetrack_dashboard_layout_desktop_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return sanitizeLayout(parsed, DEFAULT_DESKTOP_LAYOUT, false);
          }
        }
        const legacy = localStorage.getItem('primetrack_dashboard_layout_desktop_v1');
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          if (parsedLegacy && Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            return sanitizeLayout(parsedLegacy, DEFAULT_DESKTOP_LAYOUT, false);
          }
        }
      } catch (e) {}
    }
    return DEFAULT_DESKTOP_LAYOUT;
  });

  const [mobileLayout, setMobileLayout] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('primetrack_dashboard_layout_mobile_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return sanitizeLayout(parsed, DEFAULT_MOBILE_LAYOUT, true);
          }
        }
        const legacy = localStorage.getItem('primetrack_dashboard_layout_mobile_v1');
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          if (parsedLegacy && Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            return sanitizeLayout(parsedLegacy, DEFAULT_MOBILE_LAYOUT, true);
          }
        }
      } catch (e) {}
    }
    return DEFAULT_MOBILE_LAYOUT;
  });

  const desktopLayoutRef = useRef(desktopLayout);
  useEffect(() => {
    desktopLayoutRef.current = desktopLayout;
  }, [desktopLayout]);

  const mobileLayoutRef = useRef(mobileLayout);
  useEffect(() => {
    mobileLayoutRef.current = mobileLayout;
  }, [mobileLayout]);

  // Se o usuário não está em modo de edição, travamos todos os blocos (static: true)
  // para que nenhum clique ou movimento acidental altere o layout
  const activeLayouts = useMemo(() => {
    const desktopItems = desktopLayout.map(item => ({
      ...item,
      static: !isEditingLayout,
      isDraggable: isEditingLayout
    }));
    const mobileItems = mobileLayout.map(item => ({
      ...item,
      x: 0,
      w: 1,
      static: !isEditingLayout,
      isDraggable: isEditingLayout
    }));

    return {
      lg: desktopItems,
      md: desktopItems,
      sm: mobileItems,
      xs: mobileItems
    };
  }, [desktopLayout, mobileLayout, isEditingLayout]);

  const { width: containerWidth, containerRef } = useContainerWidth({ 
    initialWidth: typeof window !== 'undefined' ? (window.innerWidth - (window.innerWidth >= 1024 ? 260 : 32)) : 1280 
  });

  const initialLayoutSnapshot = useRef(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('primetrack_edit_layout_status', { detail: { isEditing: isEditingLayout } }));
  }, [isEditingLayout]);

  useEffect(() => {
    const handleToggleEditEvent = (e) => {
      setIsEditingLayout(prev => {
        const next = typeof e.detail?.isEditing === 'boolean' ? e.detail.isEditing : !prev;
        if (next) {
          initialLayoutSnapshot.current = {
            desktop: JSON.parse(JSON.stringify(desktopLayoutRef.current)),
            mobile: JSON.parse(JSON.stringify(mobileLayoutRef.current))
          };
        }
        return next;
      });
    };
    const handleToggleShowValuesEvent = (e) => {
      if (typeof e.detail?.showValues === 'boolean') {
        setShowValues(e.detail.showValues);
      } else {
        setShowValues(prev => !prev);
      }
    };
    window.addEventListener('primetrack_toggle_edit_layout', handleToggleEditEvent);
    window.addEventListener('primetrack_toggle_show_values', handleToggleShowValuesEvent);
    return () => {
      window.removeEventListener('primetrack_toggle_edit_layout', handleToggleEditEvent);
      window.removeEventListener('primetrack_toggle_show_values', handleToggleShowValuesEvent);
    };
  }, []);

  const handleToggleEdit = (status) => {
    if (status) {
      initialLayoutSnapshot.current = {
        desktop: JSON.parse(JSON.stringify(desktopLayoutRef.current)),
        mobile: JSON.parse(JSON.stringify(mobileLayoutRef.current))
      };
    }
    setIsEditingLayout(status);
  };

  const handleCancelEdit = () => {
    if (initialLayoutSnapshot.current) {
      if (getIsMobile()) {
        setMobileLayout(initialLayoutSnapshot.current.mobile);
        mobileLayoutRef.current = initialLayoutSnapshot.current.mobile;
      } else {
        setDesktopLayout(initialLayoutSnapshot.current.desktop);
        desktopLayoutRef.current = initialLayoutSnapshot.current.desktop;
      }
    }
    setIsEditingLayout(false);
  };

  const handleResetLayout = () => {
    if (getIsMobile()) {
      setMobileLayout(DEFAULT_MOBILE_LAYOUT);
      mobileLayoutRef.current = DEFAULT_MOBILE_LAYOUT;
      try {
        localStorage.removeItem('primetrack_dashboard_layout_mobile_v2');
        localStorage.removeItem('primetrack_dashboard_layout_mobile_v1');
      } catch (e) {}
    } else {
      setDesktopLayout(DEFAULT_DESKTOP_LAYOUT);
      desktopLayoutRef.current = DEFAULT_DESKTOP_LAYOUT;
      try {
        localStorage.removeItem('primetrack_dashboard_layout_desktop_v2');
        localStorage.removeItem('primetrack_dashboard_layout_desktop_v1');
      } catch (e) {}
    }
  };

  const handleSaveLayout = () => {
    try {
      if (getIsMobile()) {
        localStorage.setItem('primetrack_dashboard_layout_mobile_v2', JSON.stringify(mobileLayoutRef.current));
      } else {
        localStorage.setItem('primetrack_dashboard_layout_desktop_v2', JSON.stringify(desktopLayoutRef.current));
      }
    } catch (e) {}
    setIsEditingLayout(false);
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            const savedDate = localStorage.getItem('primetrack_cached_campaigns_date');
            const todayYMD = toBrazilYMD(new Date());
            if (savedDate && savedDate !== todayYMD) {
              return parsed.map(c => ({
                ...c,
                spend: '0.00',
                rawSpendUsd: c.rawSpendUsd !== null ? '0.00' : null,
                impressions: 0,
                clicks: 0,
                cpc: '0.00',
                cpm: '0.00',
                ctr: '0.00%',
                initCheckouts: 0,
                costPerIc: '0.00',
                sales: 0,
                pendingSales: 0,
                revenue: '0.00',
                profit: '0.00',
                roas: '0.00',
                cpa: '0.00',
                adsets: (c.adsets || []).map(as => ({
                  ...as,
                  spend: '0.00',
                  rawSpendUsd: as.rawSpendUsd !== null ? '0.00' : null,
                  impressions: 0,
                  clicks: 0,
                  cpc: '0.00',
                  cpm: '0.00',
                  ctr: '0.00%',
                  initCheckouts: 0,
                  costPerIc: '0.00',
                  sales: 0,
                  pendingSales: 0,
                  revenue: '0.00',
                  profit: '0.00',
                  roas: '0.00',
                  cpa: '0.00'
                })),
                ads: (c.ads || []).map(ad => ({
                  ...ad,
                  spend: '0.00',
                  rawSpendUsd: ad.rawSpendUsd !== null ? '0.00' : null,
                  impressions: 0,
                  clicks: 0,
                  cpc: '0.00',
                  cpm: '0.00',
                  ctr: '0.00%',
                  initCheckouts: 0,
                  costPerIc: '0.00',
                  sales: 0,
                  pendingSales: 0,
                  revenue: '0.00',
                  profit: '0.00',
                  roas: '0.00',
                  cpa: '0.00'
                }))
              }));
            }
            return parsed;
          }
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

  const [taxSettings, setTaxSettings] = useState(getTaxSettings);

  useEffect(() => {
    const handleTaxUpdate = () => {
      setTaxSettings(getTaxSettings());
    };
    window.addEventListener('primetrack_tax_settings_updated', handleTaxUpdate);
    return () => window.removeEventListener('primetrack_tax_settings_updated', handleTaxUpdate);
  }, []);

  const periodToPreset = {
    'Hoje': 'today',
    'Ontem': 'yesterday',
    '7 dias': 'last_7d',
    '14 dias': 'last_15d',
    '15 dias': 'last_15d',
    '30 dias': 'last_30d',
    'Este mês': 'this_month',
    'Mês passado': 'last_month',
    'mes passado': 'last_month',
    'Máximo': 'maximum',
    'maximo': 'maximum',
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

    const userHeaders = user?.id ? { 'x-user-id': user.id } : {};
    const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
    const userParamFirst = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';

    try {
      const [rRes, crRes, ordRes, pixRes] = await Promise.all([
        fetch('/api/meta/status' + userParamFirst, { headers: userHeaders }),
        fetch(`/api/campaigns?${query}${userParam}`, { headers: userHeaders }),
        fetch('/api/orders' + userParamFirst, { headers: userHeaders }),
        fetch(`/api/pixel/stats?${query}${userParam}`, { headers: userHeaders }).catch(() => null)
      ]);

      try {
        const oData = await ordRes.json();
        if (Array.isArray(oData)) {
          setOrdersList(oData);
          if (typeof window !== 'undefined') {
            if (oData.length > 0) {
              localStorage.setItem('primetrack_cached_orders', JSON.stringify(oData));
            } else {
              localStorage.removeItem('primetrack_cached_orders');
            }
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

      const data = await rRes.json().catch(() => ({}));
      if (data && data.connections && data.connections.length > 0) {
        localStorage.removeItem('primetrack_meta_disconnected');
      } else if (data && Array.isArray(data.connections) && data.connections.length === 0) {
        setAdAccountsList([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('primetrack_ad_accounts');
        }
      }

      if (data && Array.isArray(data.adAccounts) && data.adAccounts.length > 0) {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('primetrack_ad_accounts') : null;
        let localSyncMap = {};
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              parsed.forEach(p => {
                if (p.id) localSyncMap[p.id] = p.sync;
              });
            }
          } catch (e) {}
        }

        const allMappedAccs = data.adAccounts.map(a => {
          const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
          const isSync = localSyncMap[accId] !== undefined
            ? localSyncMap[accId] === true
            : (a.syncActive === true);
          return {
            ...a,
            id: accId,
            sync: isSync
          };
        });

        const activeSynced = allMappedAccs.filter(a => a.sync);
        setAdAccountsList(activeSynced.length > 0 ? activeSynced : allMappedAccs);
      } else if (data && Array.isArray(data.adAccounts) && data.adAccounts.length === 0) {
        setAdAccountsList([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('primetrack_ad_accounts');
        }
      }

      const cData = await crRes.json().catch(() => null);
      if (Array.isArray(cData)) {
        setCampaigns(cData);
        if (typeof window !== 'undefined') {
          if (cData.length > 0) {
            localStorage.setItem('primetrack_cached_campaigns', JSON.stringify(cData));
            if (customPeriod === 'Hoje' || (!customPeriod && period === 'Hoje')) {
              localStorage.setItem('primetrack_cached_campaigns_date', toBrazilYMD(new Date()));
            }
          } else {
            localStorage.removeItem('primetrack_cached_campaigns');
          }
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

    const userHeaders = user?.id ? { 'x-user-id': user.id } : {};
    const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
    const userParamFirst = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';

    try {
      const [cr, ord, pix] = await Promise.all([
        fetch(`/api/campaigns?${query}${userParam}`, { headers: userHeaders }),
        fetch('/api/orders' + userParamFirst, { headers: userHeaders }),
        fetch(`/api/pixel/stats?${query}${userParam}`, { headers: userHeaders }).catch(() => null)
      ]);
      const [cData, oData] = await Promise.all([cr.json().catch(() => null), ord.json().catch(() => null)]);
      if (Array.isArray(cData)) {
        setCampaigns(cData);
        if (typeof window !== 'undefined') {
          if (cData.length > 0) {
            localStorage.setItem('primetrack_cached_campaigns', JSON.stringify(cData));
            if (period === 'Hoje') {
              localStorage.setItem('primetrack_cached_campaigns_date', toBrazilYMD(new Date()));
            }
          } else {
            localStorage.removeItem('primetrack_cached_campaigns');
          }
        }
      }
      if (Array.isArray(oData)) {
        setOrdersList(oData);
        if (typeof window !== 'undefined') {
          if (oData.length > 0) {
            localStorage.setItem('primetrack_cached_orders', JSON.stringify(oData));
          } else {
            localStorage.removeItem('primetrack_cached_orders');
          }
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
    let lastKnownDate = toBrazilYMD(new Date());
    loadDashboardData(periodRef.current, customRangeRef.current);

    const handleProfileSync = () => {
      loadDashboardData(periodRef.current, customRangeRef.current);
    };

    const ordersPollInterval = setInterval(() => {
      // Detecção de virada do dia (00:00 / 00:01)
      const currentToday = toBrazilYMD(new Date());
      if (currentToday !== lastKnownDate) {
        lastKnownDate = currentToday;
        if (periodRef.current === 'Hoje') {
          loadDashboardData('Hoje');
        }
      }

      const userHeaders = user?.id ? { 'x-user-id': user.id } : {};
      const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
      const userParamFirst = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';

      fetch('/api/orders' + userParamFirst, { headers: userHeaders })
        .then(res => res.json())
        .then(oData => {
          if (Array.isArray(oData)) {
            setOrdersList(oData);
            try {
              if (oData.length > 0) {
                localStorage.setItem('primetrack_cached_orders', JSON.stringify(oData));
              } else {
                localStorage.removeItem('primetrack_cached_orders');
              }
            } catch (e) {}
          }
        })
        .catch(() => {});

      const currentPreset = periodToPreset[periodRef.current] || 'today';
      fetch(`/api/pixel/stats?datePreset=${currentPreset}${userParam}`, { headers: userHeaders })
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
    const todayYMD = toBrazilYMD(new Date());
    const yesterdayYMD = toBrazilYMD(new Date(Date.now() - 86400000));
    const sevenDaysAgoYMD = toBrazilYMD(new Date(Date.now() - 6 * 86400000));
    const fifteenDaysAgoYMD = toBrazilYMD(new Date(Date.now() - 14 * 86400000));
    const thirtyDaysAgoYMD = toBrazilYMD(new Date(Date.now() - 29 * 86400000));
    const currentMonthPrefix = todayYMD ? todayYMD.slice(0, 7) : '';

    let prevMonthSince = '';
    let prevMonthUntil = '';
    if (todayYMD) {
      const [yearStr, monthStr] = todayYMD.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const prevMonthDate = new Date(Date.UTC(y, m - 1, 1));
      const lastDayPrevMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const prevYear = prevMonthDate.getUTCFullYear();
      const prevMonthStr = String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0');
      const prevMonthPrefix = `${prevYear}-${prevMonthStr}`;
      prevMonthSince = `${prevMonthPrefix}-01`;
      prevMonthUntil = `${prevMonthPrefix}-${String(lastDayPrevMonth).padStart(2, '0')}`;
    }

    return deduplicatedOrders.filter(o => {
      if (!o.createdAt) return true;
      const orderYMD = toBrazilYMD(o.createdAt);
      if (!orderYMD) return false;

      // Filtro de data estrito pelo calendário civil (dia vira exatamente às 00:00)
      if (period === 'Personalizado' && customRange?.since) {
        const since = customRange.since;
        const until = customRange.until || customRange.since;
        if (orderYMD < since || orderYMD > until) return false;
      } else if (period === 'Hoje') {
        if (orderYMD !== todayYMD) return false;
      } else if (period === 'Ontem') {
        if (orderYMD !== yesterdayYMD) return false;
      } else if (period === '7 dias') {
        if (orderYMD < sevenDaysAgoYMD || orderYMD > todayYMD) return false;
      } else if (period === '15 dias') {
        if (orderYMD < fifteenDaysAgoYMD || orderYMD > todayYMD) return false;
      } else if (period === '30 dias') {
        if (orderYMD < thirtyDaysAgoYMD || orderYMD > todayYMD) return false;
      } else if (period === 'Este mês') {
        if (!orderYMD.startsWith(currentMonthPrefix)) return false;
      } else if (period === 'Mês passado' || period === 'mes passado') {
        if (orderYMD < prevMonthSince || orderYMD > prevMonthUntil) return false;
      } else if (period === 'Máximo' || period === 'maximo') {
        // Todas as vendas sem restrição de data
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

      // Filtro de conta de anúncios
      if (selectedAccount !== 'Todas') {
        const match = adAccountsList.find(a => a.name === selectedAccount || a.id === selectedAccount);
        const targetId = match ? String(match.id).replace('act_', '') : String(selectedAccount).replace('act_', '');
        const targetName = match ? (match.name || '').toLowerCase().trim() : String(selectedAccount).toLowerCase().trim();

        const orderAccId = String(o.attribution?.accountId || o.attribution?.adAccountId || o.accountId || '').replace('act_', '').trim();
        const orderAccName = String(o.attribution?.accountName || o.accountName || '').toLowerCase().trim();

        const matchesAcc = (orderAccId && orderAccId === targetId) || (orderAccName && (orderAccName === targetName || targetName.includes(orderAccName) || orderAccName.includes(targetName)));

        if (!matchesAcc) {
          const oCampId = String(o.attribution?.campaignId || o.campaignId || '').trim();
          const oCampName = (o.attribution?.campaign || o.campaign || '').toLowerCase().trim();
          const oAdId = String(o.attribution?.adId || o.adId || '').trim();

          const campBelongsToAcc = filteredCampaigns.some(c => {
            const matchesCId = oCampId && String(c.id).trim() === oCampId;
            const matchesCName = oCampName && oCampName !== 'orgânico' && oCampName !== 'organico' && (c.name || '').toLowerCase().trim() === oCampName;
            const matchesAd = oAdId && Array.isArray(c.ads) && c.ads.some(ad => String(ad.id).trim() === oAdId);
            return matchesCId || matchesCName || matchesAd;
          });

          if (!campBelongsToAcc) return false;
        }
      }

      return true;
    });
  }, [deduplicatedOrders, period, selectedSource, selectedProduct, selectedAccount, adAccountsList, filteredCampaigns]);

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
  
  // CPA geral (Custo por Aquisição = Gastos com anúncios / Vendas aprovadas)
  const realCpa = realApprovedSales > 0 ? (realSpend / realApprovedSales) : 0;
  
  // Impostos calculados com base na alíquota configurada em Taxas (ex: 12% para BR ou 0% para EUA)
  const metaTaxPercent = Number(taxSettings?.metaTaxRate || 0);
  const impostoMetaValue = realSpend > 0 && metaTaxPercent > 0 ? (realSpend * (metaTaxPercent / 100)) : 0;
  const impostoMetaAds = impostoMetaValue.toFixed(2);
  const impostoTotal = impostoMetaValue.toFixed(2);

  // Lucro, ROAS e Margem considerando impostos e gastos
  const totalCost = realSpend + impostoMetaValue;
  const realProfit = realApprovedRevenue - totalCost;
  const realRoas = realSpend > 0 ? (realApprovedRevenue / realSpend).toFixed(2) : '0.00';
  const realRoi = totalCost > 0 ? ((realApprovedRevenue - totalCost) / totalCost).toFixed(2) : '0.00';
  const realMargin = realApprovedRevenue > 0 ? `${(((realApprovedRevenue - totalCost) / realApprovedRevenue) * 100).toFixed(1)}%` : '0.0%';

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

  // Vendas agrupadas por fonte com quantidade e porcentagem (Estilo UTMify)
  const sourcesMap = useMemo(() => {
    const map = {};
    const totalApproved = approvedOrders.length;

    approvedOrders.forEach(o => {
      const rawSrc = (o.attribution?.source || o.utm_source || o.source || '').toLowerCase();
      let srcName = 'MetaAds';
      if (rawSrc.includes('google') || rawSrc.includes('gads')) {
        srcName = 'Google Ads';
      } else if (rawSrc.includes('tiktok') || rawSrc.includes('tt')) {
        srcName = 'TikTok Ads';
      } else if (rawSrc.includes('org') || rawSrc.includes('direct') || rawSrc.includes('direto')) {
        srcName = 'Orgânico';
      } else {
        srcName = 'MetaAds';
      }

      if (!map[srcName]) {
        map[srcName] = { name: srcName, sales: 0, revenue: 0 };
      }
      map[srcName].sales += 1;
      map[srcName].revenue += Number(o.amount || 0);
    });

    if (totalApproved > 0 && Object.keys(map).length === 0) {
      map['MetaAds'] = { name: 'MetaAds', sales: totalApproved, revenue: realApprovedRevenue };
    }

    return Object.values(map)
      .map(s => ({
        ...s,
        percentage: totalApproved > 0 ? (s.sales / totalApproved) * 100 : 0
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [approvedOrders, realApprovedRevenue]);

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

  // Taxas de aprovação por método (Cartão, Pix, Boleto) no estilo UTMify
  const approvalRates = useMemo(() => {
    const calcRate = (matcher) => {
      const created = filteredOrders.filter(o => matcher((o.paymentMethod || '').toLowerCase())).length;
      const approved = approvedOrders.filter(o => matcher((o.paymentMethod || '').toLowerCase())).length;
      if (created === 0) return { label: 'N/A', pct: 0, hasData: false };
      const pct = (approved / created) * 100;
      return { label: `${pct.toFixed(1)}%`, pct, hasData: true };
    };

    return [
      { name: 'Cartão', ...calcRate(pm => pm.includes('card') || pm.includes('credit') || pm.includes('cartao')) },
      { name: 'Pix', ...calcRate(pm => pm.includes('pix') || !pm) },
      { name: 'Boleto', ...calcRate(pm => pm.includes('boleto')) }
    ];
  }, [filteredOrders, approvedOrders]);

  const pixRate = approvalRates[1]?.label || 'N/A';

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

  const funnelApr = realApprovedSales;
  const funnelInic = Math.max(filteredOrders.length, funnelApr);
  const funnelIcs = Math.max(pixelStats.initiateCheckouts || 0, funnelInic);
  const funnelVis = Math.max(pixelStats.pageViews || 0, funnelIcs);
  const funnelClicks = Math.max(totalMetaClicks, funnelVis);

  const pctClicks = funnelClicks > 0 ? 100 : 0;
  const pctVis = funnelClicks > 0 ? Math.min(100, (funnelVis / funnelClicks) * 100) : 0;
  const dropVis = funnelClicks > 0 && funnelVis > 0 ? ((funnelVis - funnelClicks) / funnelClicks) * 100 : null;

  const pctIcs = funnelClicks > 0 ? Math.min(pctVis, (funnelIcs / funnelClicks) * 100) : 0;
  const dropIcs = funnelVis > 0 && funnelIcs > 0 ? ((funnelIcs - funnelVis) / funnelVis) * 100 : null;

  const pctInic = funnelClicks > 0 ? Math.min(pctIcs, (funnelInic / funnelClicks) * 100) : 0;
  const dropInic = funnelIcs > 0 && funnelInic > 0 ? ((funnelInic - funnelIcs) / funnelIcs) * 100 : null;

  const pctApr = funnelClicks > 0 ? Math.min(pctInic, (funnelApr / funnelClicks) * 100) : 0;

  // Vendas Reembolsadas
  const refundedOrders = filteredOrders.filter(o => 
    o.status === 'refunded' || o.status === 'chargeback' || o.status === 'reembolsado' || o.status === 'estornado' || o.status === 'cancelado'
  );
  const realRefundedSales = refundedOrders.length;
  const realRefundedValue = refundedOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);

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
    cpa: {
      id: 'cpa',
      label: 'CPA',
      value: `R$ ${realCpa.toFixed(2).replace('.', ',')}`,
      subtitle: 'Custo por aquisição geral',
      valueColor: 'text-white'
    },
    lucro: {
      id: 'lucro',
      label: 'Lucro',
      value: `R$ ${realProfit.toFixed(2).replace('.', ',')}`,
      subtitle: realProfit > 0 ? 'Resultado positivo' : realProfit < 0 ? 'Abaixo da meta' : 'Sem movimentação',
      valueColor: realProfit > 0 ? 'text-emerald-400' : realProfit < 0 ? 'text-[#EF4444]' : 'text-white'
    },
    pendentes: {
      id: 'pendentes',
      label: 'Vendas Pendentes',
      value: `R$ ${realPendingValue.toFixed(2).replace('.', ',')}`,
      subtitle: `${realPendingSales} ${realPendingSales === 1 ? 'venda pendente' : 'vendas pendentes'}`,
      valueColor: 'text-white'
    },
    reembolsadas: {
      id: 'reembolsadas',
      label: 'Vendas Reembolsadas',
      value: `R$ ${realRefundedValue.toFixed(2).replace('.', ',')}`,
      subtitle: `${realRefundedSales} ${realRefundedSales === 1 ? 'reembolso' : 'reembolsos'}`,
      valueColor: realRefundedSales > 0 ? 'text-[#EF4444]' : 'text-white'
    },
    roas: {
      id: 'roas',
      label: 'ROAS',
      value: realRoas,
      subtitle: 'Retorno sobre gasto de anúncio',
      valueColor: Number(realRoas) > 0 ? (Number(realRoas) >= 1 ? 'text-emerald-400' : 'text-[#EF4444]') : 'text-white'
    },
    roi: {
      id: 'roas',
      label: 'ROAS',
      value: realRoas,
      subtitle: 'Retorno sobre gasto de anúncio',
      valueColor: Number(realRoas) > 0 ? (Number(realRoas) >= 1 ? 'text-emerald-400' : 'text-[#EF4444]') : 'text-white'
    },
    margem: {
      id: 'margem',
      label: 'Margem',
      value: realMargin,
      subtitle: 'Margem líquida operacional',
      valueColor: 'text-white'
    }
  };

  const renderKpiCard = (kpiKey) => {
    const card = kpiDataMap[kpiKey] || kpiDataMap.faturamento;
    return (
      <div 
        className={`bg-[#141C2E] border ${
          isEditingLayout 
            ? 'border-blue-500/50 ring-1 ring-blue-500/30 hover:border-blue-400 cursor-grab active:cursor-grabbing' 
            : 'border-[#1E293B]'
        } rounded-xl p-3 sm:p-3.5 flex flex-col justify-between shadow-md h-full w-full select-none relative group transition-colors`}
      >
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
          <span className="truncate font-semibold text-zinc-300">
            {card.label}
          </span>
          <div className="flex items-center gap-1">
            {isEditingLayout ? (
              <GripVertical className="w-3.5 h-3.5 text-blue-400" title="Arraste com o mouse para reposicionar" />
            ) : (
              <span className="text-zinc-500 text-[11px] cursor-help" title={card.label}>ⓘ</span>
            )}
          </div>
        </div>

        <div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight font-sans ${card.valueColor}`}>
            {showValues ? card.value : '••••••••'}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate font-sans">
            {card.subtitle}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalysisCard = (cardKey) => {
    const editHeaderControls = isEditingLayout ? (
      <GripVertical className="w-4 h-4 text-blue-400 cursor-grab active:cursor-grabbing" title="Arraste com o mouse para reposicionar" />
    ) : (
      <span className="text-zinc-500 text-[11px] cursor-help">ⓘ</span>
    );

    const baseContainerClass = `bg-[#141C2E] border ${
      isEditingLayout
        ? 'border-blue-500/50 ring-1 ring-blue-500/30 hover:border-blue-400 cursor-grab active:cursor-grabbing'
        : 'border-[#1E293B]'
    } rounded-xl p-3 sm:p-3.5 flex flex-col shadow-md h-full w-full select-none relative transition-colors overflow-hidden`;

    if (cardKey === 'products') {
      return (
        <div className={baseContainerClass}>
          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-2 shrink-0">
              <span className="text-white font-semibold">Vendas por Produto</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Vendas agrupadas por produto">ⓘ</span>}
            </div>

            {productsMap.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs font-sans">
                Nenhuma venda por aqui
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 py-0.5 scrollbar-thin scrollbar-thumb-[#1E293B] hover:scrollbar-thumb-[#2E3D5B]">
                {productsMap.map((prod, i) => {
                  const validPct = Math.min(100, Math.max(0, prod.percentage || 0));
                  const circumference = 56.55; // 2 * pi * 9
                  const strokeDashoffset = circumference - (validPct / 100) * circumference;

                  return (
                    <div key={i} className="flex items-center justify-between text-xs group">
                      <div 
                        className="font-normal text-zinc-200 truncate pr-3 text-xs tracking-tight select-none" 
                        title={showValues ? prod.name : undefined}
                      >
                        {showValues ? (
                          prod.name
                        ) : (
                          <span className="tracking-widest font-mono text-zinc-400 font-semibold">
                            ••••••••••••
                          </span>
                        )}
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
        <div className={`${baseContainerClass} justify-between`}>
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-1">
              <span className="text-white font-semibold">Vendas por Pagamento</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Distribuição por método de pagamento">ⓘ</span>}
            </div>

            {/* Gráfico Donut com Total no centro */}
            <div className="my-1 flex flex-col items-center justify-center relative">
              <div className="w-20 h-20 sm:w-22 sm:h-22 relative flex items-center justify-center">
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
                  <span className="text-base font-bold text-white font-sans">{realApprovedSales}</span>
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
        <div className={baseContainerClass}>
          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-2 shrink-0">
              <span className="text-white font-semibold">Vendas por Fonte</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Origem de tráfego das vendas">ⓘ</span>}
            </div>

            {sourcesMap.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs font-sans">
                Nenhuma venda por aqui
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 py-0.5 scrollbar-thin scrollbar-thumb-[#1E293B] hover:scrollbar-thumb-[#2E3D5B]">
                {sourcesMap.map((src, i) => {
                  const validPct = Math.min(100, Math.max(0, src.percentage || 0));
                  const circumference = 56.55; // 2 * pi * 9
                  const strokeDashoffset = circumference - (validPct / 100) * circumference;

                  return (
                    <div key={i} className="flex items-center justify-between text-xs group">
                      <div className="font-normal text-zinc-200 truncate pr-3 text-xs tracking-tight" title={src.name}>
                        {src.name}
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quantidade vendida */}
                        <span className="text-zinc-300 font-mono text-xs w-4 text-right">
                          {src.sales}
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
                        <span className="text-white font-bold font-mono text-xs w-12 text-right">
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

    if (cardKey === 'approval') {
      return (
        <div className={baseContainerClass}>
          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-2 shrink-0">
              <span className="text-white font-semibold">Taxa de Aprovação</span>
              {isEditingLayout ? editHeaderControls : <span className="text-zinc-500 text-[11px] cursor-help" title="Percentual de pedidos aprovados por meio">ⓘ</span>}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 py-0.5 scrollbar-thin scrollbar-thumb-[#1E293B] hover:scrollbar-thumb-[#2E3D5B]">
              {approvalRates.map((method, i) => {
                const validPct = method.hasData ? Math.min(100, Math.max(0, method.pct)) : 0;
                const circumference = 56.55; // 2 * pi * 9
                const strokeDashoffset = circumference - (validPct / 100) * circumference;

                return (
                  <div key={i} className="flex items-center justify-between text-xs group">
                    <span className="font-normal text-zinc-200 text-xs tracking-tight">
                      {method.name}
                    </span>

                    <div className="flex items-center gap-3 shrink-0">
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
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="#0066FF"
                            strokeWidth="2.5"
                            strokeDasharray={circumference}
                            strokeDashoffset={method.hasData ? strokeDashoffset : circumference}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                      </div>

                      {/* Porcentagem ou N/A */}
                      <span className={`font-mono text-xs w-12 text-right ${method.hasData ? 'text-white font-bold' : 'text-zinc-400 font-medium'}`}>
                        {method.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (cardKey === 'funnel') {
      const centerY = 68;
      // Curva harmônica estritamente decrescente do funil (Estilo UTMify)
      const pathD = `
        M 16 18
        L 120 18
        C 180 18, 220 33, 280 33
        L 320 33
        C 380 33, 420 48, 480 48
        L 520 48
        C 580 48, 620 60, 680 60
        L 710 60
        C 745 60, 770 68, 785 68
        C 770 68, 745 76, 710 76
        L 680 76
        C 620 76, 580 88, 520 88
        L 480 88
        C 420 88, 380 103, 320 103
        L 280 103
        C 220 103, 180 118, 120 118
        L 16 118
        Z
      `;

      return (
        <div className={baseContainerClass}>
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
              <svg className="w-full h-24 sm:h-28 overflow-visible" viewBox="0 0 1000 136">
                <defs>
                  <linearGradient id="streamFunnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0062FF" />
                    <stop offset="25%" stopColor="#2563EB" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="70%" stopColor="#8B5CF6" />
                    <stop offset="85%" stopColor="#C026D3" />
                    <stop offset="100%" stopColor="#F43F5E" />
                  </linearGradient>
                </defs>

                {/* Fluxo Orgânico do Funil com Curvas Harmônicas Decrescentes */}
                <path d={pathD} fill="url(#streamFunnelGrad)" />

                {/* Divisórias verticais sutis entre as 5 etapas cortando sobre a onda */}
                <line x1="200" y1="4" x2="200" y2="132" stroke="#253248" strokeWidth="1.2" />
                <line x1="400" y1="4" x2="400" y2="132" stroke="#253248" strokeWidth="1.2" />
                <line x1="600" y1="4" x2="600" y2="132" stroke="#253248" strokeWidth="1.2" />
                <line x1="800" y1="4" x2="800" y2="132" stroke="#253248" strokeWidth="1.2" />

                {/* Linha magenta horizontal de saída no final da onda */}
                <line x1="785" y1="68" x2="984" y2="68" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />

                {/* Porcentagens no Centro da Onda (todas alinhadas na mesma linha horizontal y=68) */}
                <text x="100" y="68" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontWeight="800" fontSize="19" fontFamily="sans-serif">
                  {funnelClicks > 0 ? '100%' : '0%'}
                </text>
                <text x="300" y="68" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontWeight="800" fontSize="19" fontFamily="sans-serif">
                  {pctVis.toFixed(1)}%
                </text>
                <text x="500" y="68" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontWeight="800" fontSize="19" fontFamily="sans-serif">
                  {pctIcs.toFixed(1)}%
                </text>
                <text x="700" y="68" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontWeight="800" fontSize="19" fontFamily="sans-serif" paintOrder="stroke" stroke="#141C2E" strokeWidth="3">
                  {pctInic.toFixed(1)}%
                </text>
                <text x="900" y="68" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontWeight="800" fontSize="19" fontFamily="sans-serif" paintOrder="stroke" stroke="#141C2E" strokeWidth="4">
                  {pctApr.toFixed(1)}%
                </text>
              </svg>
            </div>

            {/* Quantidades Numéricas Inferiores */}
            <div className="flex items-center justify-between text-center text-xs sm:text-sm font-sans font-bold text-white tracking-tight">
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
      isEditingLayout ? 'border-blue-500/50 ring-1 ring-blue-500/30 hover:border-blue-400 cursor-grab active:cursor-grabbing' : 'border-[#1E293B]'
    } rounded-xl p-3.5 sm:p-4 shadow-md h-full w-full flex flex-col justify-between select-none relative transition-colors`}>
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

      {/* Banner de Edição Ativa (Idêntico ao Utmify do vídeo) */}
      {isEditingLayout && (
        <div className="bg-[#141C2E] border border-blue-500/50 rounded-xl px-4 py-3 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-zinc-300">
              Você está editando seu dashboard para: <span className="text-white font-bold">{getIsMobile() ? 'Mobile' : 'Desktop'}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleResetLayout}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-[#1E293B]/60 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Redefinir configurações</span>
            </button>
            <button 
              onClick={handleCancelEdit}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-[#1E293B]/60 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveLayout}
              className="px-4 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar</span>
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
          <div className="relative">
            <label className="text-[10px] text-zinc-400 mb-1 flex items-center gap-1 font-medium">
              <span>Período de Visualização</span>
              <span className="text-zinc-500 text-[10px] cursor-help" title="Filtro de período de análise">ⓘ</span>
            </label>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => {
                  const val = e.target.value;
                  setPeriod(val);
                  periodRef.current = val;
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('primetrack_dashboard_period', val);
                  }
                  if (val === 'Personalizado') {
                    setIsCalendarOpen(true);
                  } else {
                    setCustomRange(null);
                    customRangeRef.current = null;
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('primetrack_dashboard_custom_range');
                    }
                    setIsCalendarOpen(false);
                    loadDashboardData(val, null);
                  }
                }}
                className="w-full appearance-none bg-[#0F1728] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-[#0066FF] text-xs cursor-pointer font-medium"
              >
                <option value="Hoje">Hoje</option>
                <option value="Ontem">Ontem</option>
                <option value="7 dias">7 dias</option>
                <option value="15 dias">15 dias</option>
                <option value="30 dias">30 dias</option>
                <option value="Este mês">Este mês</option>
                <option value="Mês passado">Mês passado</option>
                <option value="Máximo">Máximo</option>
                <option value="Personalizado">
                  {period === 'Personalizado' && customRange?.since && customRange?.until
                    ? `Personalizado (${customRange.since.split('-').reverse().slice(0, 2).join('/')} - ${customRange.until.split('-').reverse().slice(0, 2).join('/')})`
                    : 'Personalizado'}
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <DateRangePicker
              currentPeriod={period}
              customRange={customRange}
              isOpen={isCalendarOpen}
              onOpenChange={setIsCalendarOpen}
              hideTriggerButton={true}
              onSelectPeriod={(p) => {
                setPeriod(p);
                periodRef.current = p;
                setCustomRange(null);
                customRangeRef.current = null;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('primetrack_dashboard_period', p);
                  localStorage.removeItem('primetrack_dashboard_custom_range');
                }
                setIsCalendarOpen(false);
                loadDashboardData(p, null);
              }}
              onApplyCustomRange={(range) => {
                setPeriod('Personalizado');
                periodRef.current = 'Personalizado';
                setCustomRange(range);
                customRangeRef.current = range;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('primetrack_dashboard_period', 'Personalizado');
                  localStorage.setItem('primetrack_dashboard_custom_range', JSON.stringify(range));
                }
                setIsCalendarOpen(false);
                loadDashboardData('Personalizado', range);
              }}
            />
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
                {uniqueProducts.map((p, idx) => (
                  <option key={p} value={p}>{showValues ? p : `Produto ${idx + 1}`}</option>
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

      {/* Grid Unificado e Fluido com Física em Tempo Real (Estilo Utmify) */}
      <div ref={containerRef} className={`w-full ${isEditingLayout ? 'dashboard-editing-active' : ''}`}>
        <ResponsiveGridLayout
          width={containerWidth}
          layouts={activeLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 0 }}
          cols={{ lg: 12, md: 12, sm: 1, xs: 1 }}
          rowHeight={46}
          margin={getIsMobile() ? [0, 12] : [12, 12]}
          containerPadding={[0, 0]}
          isDraggable={isEditingLayout}
          isResizable={false}
          dragConfig={{ enabled: isEditingLayout, cancel: '.no-drag, select, button, a' }}
          useCSSTransforms={true}
          draggableCancel=".no-drag, select, button, a"
          onLayoutChange={(currentLayout) => {
            if (isEditingLayout && Array.isArray(currentLayout) && currentLayout.length > 0) {
              if (getIsMobile()) {
                const updatedMobile = currentLayout.map(item => ({
                  i: item.i,
                  x: 0,
                  y: item.y,
                  w: 1,
                  h: item.h || 1
                }));
                setMobileLayout(updatedMobile);
                mobileLayoutRef.current = updatedMobile;
              } else {
                setDesktopLayout(currentLayout);
                desktopLayoutRef.current = currentLayout;
              }
            }
          }}
          onBreakpointChange={(newBreakpoint) => {
            setCurrentBreakpoint(newBreakpoint);
            currentBreakpointRef.current = newBreakpoint;
          }}
        >
          <div key="faturamento" className="h-full w-full">{renderKpiCard('faturamento')}</div>
          <div key="gastos" className="h-full w-full">{renderKpiCard('gastos')}</div>
          <div key="lucro" className="h-full w-full">{renderKpiCard('lucro')}</div>
          <div key="cpa" className="h-full w-full">{renderKpiCard('cpa')}</div>
          <div key="roas" className="h-full w-full">{renderKpiCard('roas')}</div>
          <div key="margem" className="h-full w-full">{renderKpiCard('margem')}</div>
          <div key="pendentes" className="h-full w-full">{renderKpiCard('pendentes')}</div>
          <div key="reembolsadas" className="h-full w-full">{renderKpiCard('reembolsadas')}</div>
          <div key="products" className="h-full w-full">{renderAnalysisCard('products')}</div>
          <div key="sources" className="h-full w-full">{renderAnalysisCard('sources')}</div>
          <div key="approval" className="h-full w-full">{renderAnalysisCard('approval')}</div>
          <div key="payments" className="h-full w-full">{renderAnalysisCard('payments')}</div>
          <div key="funnel" className="h-full w-full">{renderAnalysisCard('funnel')}</div>
          <div key="hourly" className="h-full w-full">{renderHourlySalesSection()}</div>
        </ResponsiveGridLayout>
      </div>

    </div>
  );
}
