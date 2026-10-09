import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getTrialStatus } from '../utils/auth';
import { safeStorageSet } from '../utils/safeStorage';
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
export const toBrazilYMD = (dateInput = new Date()) => {
  if (!dateInput) return null;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    const spDate = new Date(d.getTime() - (3 * 3600 * 1000));
    const y = spDate.getUTCFullYear();
    const m = String(spDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(spDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

export const resolvePresetDateKey = (periodName, range) => {
  if (periodName === 'Personalizado' && range?.since) {
    return `${range.since}_${range.until || range.since}`;
  }
  const today = toBrazilYMD(new Date());
  if (!today) return periodName || 'Hoje';
  const [y, m, d] = today.split('-').map(Number);
  const norm = (periodName || 'Hoje').toLowerCase().replace('últimos ', '').replace('ultimos ', '').trim();

  if (norm === 'hoje' || norm === 'today') {
    return `hoje_${today}`;
  }
  if (norm === 'ontem' || norm === 'yesterday') {
    const yestDate = new Date(Date.UTC(y, m - 1, d - 1));
    const yest = yestDate.toISOString().slice(0, 10);
    return `ontem_${yest}`;
  }
  if (norm === '7 dias' || norm === '7d' || norm === 'last_7d') {
    const d7Date = new Date(Date.UTC(y, m - 1, d - 6));
    const d7 = d7Date.toISOString().slice(0, 10);
    return `7d_${d7}_${today}`;
  }
  if (norm === '14 dias' || norm === '15 dias' || norm === '14d' || norm === '15d' || norm === 'last_15d') {
    const d15Date = new Date(Date.UTC(y, m - 1, d - 14));
    const d15 = d15Date.toISOString().slice(0, 10);
    return `15d_${d15}_${today}`;
  }
  if (norm === '30 dias' || norm === '30d' || norm === 'last_30d') {
    const d30Date = new Date(Date.UTC(y, m - 1, d - 29));
    const d30 = d30Date.toISOString().slice(0, 10);
    return `30d_${d30}_${today}`;
  }
  if (norm === 'este mês' || norm === 'este mes' || norm === 'this_month') {
    const mStart = `${today.slice(0, 7)}-01`;
    return `estemes_${mStart}_${today}`;
  }
  if (norm === 'mês passado' || norm === 'mes passado' || norm === 'last_month') {
    const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
    const lastDayPrev = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
    const prevY = prevMonthDate.getUTCFullYear();
    const prevM = String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0');
    return `mespassado_${prevY}-${prevM}-01_${prevY}-${prevM}-${String(lastDayPrev).padStart(2, '0')}`;
  }
  if (norm === 'máximo' || norm === 'maximo' || norm === 'maximum') {
    return `maximo_${today}`;
  }
  return `${norm}_${today}`;
};

export const formatTimeAgo = (mins) => {
  if (!mins || mins <= 0) return 'alguns segundos';
  if (mins === 1) return '1 minuto';
  if (mins < 60) return `${mins} minutos`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hours < 24) {
    if (remMins === 0) {
      return hours === 1 ? '1 hora' : `${hours} horas`;
    }
    return `${hours}h e ${remMins} min`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (remHours === 0) {
    return days === 1 ? '1 dia' : `${days} dias`;
  }
  return `${days} ${days === 1 ? 'dia' : 'dias'} e ${remHours}h`;
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

export const getPeriodStorageKey = (userId, periodName, range) => {
  const p = resolvePresetDateKey(periodName, range);
  return `primetrack_dash_camp_${userId || 'default'}_${p}`;
};

export const getCachedPeriodData = (userId, periodName, range) => {
  if (typeof window === 'undefined') return null;
  try {
    const key = getPeriodStorageKey(userId, periodName, range);
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.campaigns)) {
      return parsed;
    }
  } catch (e) {}
  return null;
};

export const setCachedPeriodData = (userId, periodName, range, data) => {
  if (typeof window === 'undefined' || !data) return;
  try {
    const key = getPeriodStorageKey(userId, periodName, range);
    safeStorageSet(key, {
      ...data,
      timestamp: Date.now()
    });
  } catch (e) {}
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);

  // Sempre inicia no filtro 'Hoje' ao entrar ou retornar à página do Dashboard
  const [period, setPeriod] = useState('Hoje');
  const [customRange, setCustomRange] = useState(null);

  const periodRef = useRef(period);
  const customRangeRef = useRef(customRange);

  useEffect(() => {
    periodRef.current = period;
    customRangeRef.current = customRange;
  }, [period, customRange]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [minsAgo, setMinsAgo] = useState(0);
  const lastSyncTimeRef = useRef(Date.now());

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
      try {
        const v = localStorage.getItem('primetrack_cache_v7');
        if (!v) {
          localStorage.removeItem('primetrack_ad_accounts');
          localStorage.removeItem('primetrack_cached_campaigns');
          localStorage.removeItem('primetrack_cached_period_Hoje_usr_1788826403159');
          localStorage.removeItem('primetrack_cached_period_Hoje');
          localStorage.setItem('primetrack_cache_v7', '1');
        }
      } catch (e) {}
      const saved = localStorage.getItem('primetrack_ad_accounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed.filter(a => a.sync === true && a.status !== 'Bloqueada' && a.status !== 'DISABLED');
        } catch (e) {}
      }
    }
    return [];
  });

  const [campaigns, setCampaigns] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = getCurrentUser();
        const cached = getCachedPeriodData(u?.id, 'Hoje', null);
        if (cached && Array.isArray(cached.campaigns) && cached.campaigns.length > 0) {
          return cached.campaigns;
        }
        const fallback = localStorage.getItem('primetrack_cached_campaigns');
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  const [isPeriodLoading, setIsPeriodLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = getCurrentUser();
        const cached = getCachedPeriodData(u?.id, 'Hoje', null);
        if (cached && Array.isArray(cached.campaigns) && cached.campaigns.length > 0) {
          return false;
        }
        const fallback = localStorage.getItem('primetrack_cached_campaigns');
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch (e) {}
    }
    return true;
  });
  const [ordersList, setOrdersList] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('primetrack_cached_orders');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  // Dashboard ativo selecionado (Principal ou Criado em Avançado)
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

  const periodToPreset = {
    'Hoje': 'today',
    'Ontem': 'yesterday',
    '7 dias': 'last_7d',
    'Últimos 7 dias': 'last_7d',
    '14 dias': 'last_15d',
    'Últimos 14 dias': 'last_15d',
    '15 dias': 'last_15d',
    'Últimos 15 dias': 'last_15d',
    '30 dias': 'last_30d',
    'Últimos 30 dias': 'last_30d',
    'Este mês': 'this_month',
    'Mês passado': 'last_month',
    'mes passado': 'last_month',
    'Máximo': 'maximum',
    'maximo': 'maximum',
    'Personalizado': 'maximum'
  };

  const isFirstMount = useRef(true);

  const handleSelectPeriod = (newPeriod, newRange = null) => {
    setPeriod(newPeriod);
    periodRef.current = newPeriod;
    setCustomRange(newRange);
    customRangeRef.current = newRange;

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('primetrack_dashboard_period');
        localStorage.removeItem('primetrack_dashboard_custom_range');
      } catch (e) {}
    }

    // OTIMIZAÇÃO: Checa se já temos dados salvos para este período para renderização imediata (< 10ms)
    const cached = getCachedPeriodData(user?.id, newPeriod, newRange);
    if (cached) {
      if (Array.isArray(cached.campaigns)) {
        setCampaigns(cached.campaigns);
      }
      if (Array.isArray(cached.orders) && cached.orders.length > 0) {
        setOrdersList(cached.orders);
      }
      if (cached.pixelStats) {
        setPixelStats(cached.pixelStats);
      }
      // Transição instantânea sem skeleton
      setIsPeriodLoading(false);
      setSyncing(true);
    } else {
      // Se já temos dados na tela, mantém visível com indicador de sincronização sem piscar skeletons
      if (campaigns.length === 0) {
        setIsPeriodLoading(true);
      }
      setSyncing(true);
    }

    // Busca os dados exatos do novo período diretamente no servidor
    loadDashboardData(newPeriod, newRange);
  };

  const loadDashboardData = async (customPeriod = period, rangeObj = customRange) => {
    let query = '';
    if (customPeriod === 'Personalizado' && rangeObj?.since) {
      query = `since=${rangeObj.since}&until=${rangeObj.until || rangeObj.since}`;
    } else {
      const preset = periodToPreset[customPeriod] || 'today';
      query = `datePreset=${preset}`;
    }

    const isToday = customPeriod === 'Hoje';

    let currentActiveAccs = adAccountsList.filter(a => a.sync === true && a.status !== 'Bloqueada' && a.status !== 'DISABLED');
    let prefetchedMetaStatus = null;

    const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
    const userParamFirst = user?.id ? `?userId=${encodeURIComponent(user.id)}` : '';

    if (isToday && currentActiveAccs.length === 0) {
      try {
        const sRes = await fetch('/api/meta/status' + userParamFirst, { headers: user?.id ? { 'x-user-id': user.id } : {} });
        prefetchedMetaStatus = await sRes.json().catch(() => null);
        if (prefetchedMetaStatus && Array.isArray(prefetchedMetaStatus.adAccounts)) {
          const userOverridesKey = user?.id ? `primetrack_sync_overrides_${user.id}` : 'primetrack_sync_overrides';
          let localOverrides = {};
          if (prefetchedMetaStatus.overrides && typeof prefetchedMetaStatus.overrides === 'object' && Object.keys(prefetchedMetaStatus.overrides).length > 0) {
            localOverrides = prefetchedMetaStatus.overrides;
            if (typeof window !== 'undefined') {
              localStorage.setItem(userOverridesKey, JSON.stringify(localOverrides));
              localStorage.setItem('primetrack_sync_overrides', JSON.stringify(localOverrides));
            }
          } else if (typeof window !== 'undefined') {
            try {
              localOverrides = JSON.parse(localStorage.getItem(userOverridesKey) || localStorage.getItem('primetrack_sync_overrides') || '{}');
            } catch (e) {}
          }
          const mapped = prefetchedMetaStatus.adAccounts.map(a => {
            const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
            const isActive = a.status === 'ACTIVE' || a.status === 'Ativa' || a.account_status === 1;
            let isSync = false;
            if (isActive) {
              if (localOverrides[accId] !== undefined) {
                isSync = Boolean(localOverrides[accId]);
              } else if (localOverrides[`act_${accId}`] !== undefined) {
                isSync = Boolean(localOverrides[`act_${accId}`]);
              } else {
                isSync = a.syncActive === true;
              }
            }
            return {
              ...a,
              id: accId,
              status: isActive ? 'Ativa' : 'Bloqueada',
              sync: isSync
            };
          });
          currentActiveAccs = mapped.filter(a => a.sync);
          setAdAccountsList(currentActiveAccs);
          if (typeof window !== 'undefined') {
            localStorage.setItem('primetrack_ad_accounts', JSON.stringify(mapped));
            if (user?.id) {
              localStorage.setItem(`primetrack_ad_accounts_${user.id}`, JSON.stringify(mapped));
            }
          }
        }
      } catch (e) {}
    }

    // Sempre envia as contas ativas do usuário para que o backend sincronize apenas o que importa com velocidade instantânea (< 2s)
    const activeAccountsParam = currentActiveAccs.length > 0
      ? `&activeAccounts=${encodeURIComponent(currentActiveAccs.map(a => a.id).join(','))}` 
      : '';
    const activeHeaders = currentActiveAccs.length > 0
      ? { 'x-active-accounts': currentActiveAccs.map(a => a.id).join(',') }
      : {};

    const userHeaders = user?.id ? { 'x-user-id': user.id, ...activeHeaders } : { ...activeHeaders };

    try {
      // Se já temos as contas carregadas, não trava esperando /api/meta/status a cada troca de data
      const statusPromise = prefetchedMetaStatus
        ? Promise.resolve(prefetchedMetaStatus)
        : ((adAccountsList.length === 0)
          ? fetch('/api/meta/status' + userParamFirst, { headers: userHeaders }).then(r => r.json()).catch(() => ({}))
          : Promise.resolve(null));

      // Se os pedidos já estão carregados na memória do cliente, não trava esperando /api/orders na troca de período
      const ordersPromise = (ordersList.length === 0)
        ? fetch('/api/orders' + userParamFirst, { headers: userHeaders })
        : Promise.resolve(null);

      const [rData, crRes, ordRes, pixRes] = await Promise.all([
        statusPromise,
        fetch(`/api/campaigns?${query}${userParam}${activeAccountsParam}`, { headers: userHeaders }),
        ordersPromise,
        fetch(`/api/pixel/stats?${query}${userParam}`, { headers: userHeaders }).catch(() => null)
      ]);

      let resolvedOrders = ordersList;
      if (ordRes) {
        try {
          const oData = await ordRes.json();
          if (Array.isArray(oData) && oData.length > 0) {
            resolvedOrders = oData;
            setOrdersList(oData);
            if (typeof window !== 'undefined') {
              safeStorageSet('primetrack_cached_orders', oData);
            }
          }
        } catch (oErr) {}
      }

      let resolvedPixelStats = pixelStats;
      if (pixRes) {
        try {
          const pData = await pixRes.json();
          if (pData && typeof pData.pageViews === 'number') {
            resolvedPixelStats = pData;
            setPixelStats(pData);
            if (typeof window !== 'undefined') {
              safeStorageSet('primetrack_cached_pixel_stats', pData);
            }
          }
        } catch (pErr) {}
      }

      if (rData) {
        const data = rData;
        if (data && data.connections && data.connections.length > 0) {
          localStorage.removeItem('primetrack_meta_disconnected');
        } else if (data && Array.isArray(data.connections) && data.connections.length === 0) {
          setAdAccountsList([]);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('primetrack_ad_accounts');
          }
        }

        if (data && Array.isArray(data.adAccounts) && data.adAccounts.length > 0) {
          const userOverridesKey = user?.id ? `primetrack_sync_overrides_${user.id}` : 'primetrack_sync_overrides';
          let localOverrides = {};
          if (data.overrides && typeof data.overrides === 'object' && Object.keys(data.overrides).length > 0) {
            localOverrides = data.overrides;
            if (typeof window !== 'undefined') {
              localStorage.setItem(userOverridesKey, JSON.stringify(localOverrides));
              localStorage.setItem('primetrack_sync_overrides', JSON.stringify(localOverrides));
            }
          } else if (typeof window !== 'undefined') {
            try {
              localOverrides = JSON.parse(localStorage.getItem(userOverridesKey) || localStorage.getItem('primetrack_sync_overrides') || '{}');
            } catch (e) {}
          }

          const allMappedAccs = data.adAccounts.map(a => {
            const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
            const isAccountActive = a.status === 'ACTIVE' || a.status === 'Ativa' || a.account_status === 1;
            let isSync = false;
            if (isAccountActive) {
              if (localOverrides[accId] !== undefined) {
                isSync = Boolean(localOverrides[accId]);
              } else if (localOverrides[`act_${accId}`] !== undefined) {
                isSync = Boolean(localOverrides[`act_${accId}`]);
              } else {
                isSync = a.syncActive === true;
              }
            }
            return {
              ...a,
              id: accId,
              status: isAccountActive ? 'Ativa' : 'Bloqueada',
              sync: isSync
            };
          });

          // Preserva quaisquer contas já salvas no localStorage (ex: contas de nova BM recém-adicionadas)
          let currentLocalSaved = [];
          if (typeof window !== 'undefined') {
            try {
              const raw = (user?.id ? localStorage.getItem(`primetrack_ad_accounts_${user.id}`) : null) || localStorage.getItem('primetrack_ad_accounts');
              if (raw) currentLocalSaved = JSON.parse(raw);
            } catch (e) {}
          }
          const serverCleanIds = new Set(allMappedAccs.map(a => String(a.id).replace('act_', '')));
          const preservedLocal = Array.isArray(currentLocalSaved)
            ? currentLocalSaved.filter(a => a && (a.id || a.accountId) && !serverCleanIds.has(String(a.id || a.accountId || '').replace('act_', '')))
            : [];
          const finalAllAccs = [...allMappedAccs, ...preservedLocal];

          const activeOnly = finalAllAccs.filter(a => a.sync === true);
          setAdAccountsList(activeOnly);
          if (typeof window !== 'undefined') {
            localStorage.setItem('primetrack_ad_accounts', JSON.stringify(finalAllAccs));
            if (user?.id) {
              localStorage.setItem(`primetrack_ad_accounts_${user.id}`, JSON.stringify(finalAllAccs));
            }
          }
        } else if (data && Array.isArray(data.adAccounts) && data.adAccounts.length === 0 && (!data.connections || data.connections.length === 0)) {
          setAdAccountsList([]);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('primetrack_ad_accounts');
            if (user?.id) {
              localStorage.removeItem(`primetrack_ad_accounts_${user.id}`);
            }
          }
        }
      }

      const cData = await crRes.json().catch(() => null);
      if (Array.isArray(cData)) {
        setCampaigns(cData);
        setCachedPeriodData(user?.id, customPeriod, rangeObj, {
          campaigns: cData,
          orders: resolvedOrders,
          pixelStats: resolvedPixelStats
        });
      }

      lastSyncTimeRef.current = Date.now();
      setMinsAgo(0);
    } catch (err) {
      console.warn('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setIsPeriodLoading(false);
      setSyncing(false);
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

    const isToday = period === 'Hoje';
    const activeAccountsParam = (isToday && adAccountsList.length > 0)
      ? `&activeAccounts=${encodeURIComponent(adAccountsList.filter(a => a.sync).map(a => a.id).join(','))}` 
      : '';
    const activeHeaders = (isToday && adAccountsList.length > 0)
      ? { 'x-active-accounts': adAccountsList.filter(a => a.sync).map(a => a.id).join(',') }
      : {};

    const userHeaders = user?.id ? { 'x-user-id': user.id, ...activeHeaders } : { ...activeHeaders };
    const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
    const userParamOrdersRefresh = user?.id ? `?userId=${encodeURIComponent(user.id)}&refresh=true` : '?refresh=true';

    try {
      const [cr, ord, pix] = await Promise.all([
        fetch(`/api/campaigns?${query}${userParam}${activeAccountsParam}`, { headers: userHeaders }),
        fetch('/api/orders' + userParamOrdersRefresh, { headers: userHeaders }),
        fetch(`/api/pixel/stats?${query}${userParam}`, { headers: userHeaders }).catch(() => null)
      ]);
      const [cData, oData] = await Promise.all([cr.json().catch(() => null), ord.json().catch(() => null)]);

      let finalOrders = ordersList;
      if (Array.isArray(oData) && oData.length > 0) {
        finalOrders = oData;
        setOrdersList(oData);
        if (typeof window !== 'undefined') {
          safeStorageSet('primetrack_cached_orders', oData);
        }
      }

      let finalPix = pixelStats;
      if (pix) {
        try {
          const pData = await pix.json();
          if (pData && typeof pData.pageViews === 'number') {
            finalPix = pData;
            setPixelStats(pData);
          }
        } catch (pErr) {}
      }

      if (Array.isArray(cData)) {
        setCampaigns(cData);
        setCachedPeriodData(user?.id, period, customRange, {
          campaigns: cData,
          orders: finalOrders,
          pixelStats: finalPix
        });
      }
      lastSyncTimeRef.current = Date.now();
      setMinsAgo(0);
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setIsPeriodLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Purga de caches legados desincronizados e garante que o período sempre resete
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('primetrack_cached_campaigns');
        localStorage.removeItem('primetrack_cached_campaigns_date');
        localStorage.removeItem('primetrack_dashboard_period');
        localStorage.removeItem('primetrack_dashboard_custom_range');
      } catch (e) {}
    }

    let lastKnownDate = toBrazilYMD(new Date());
    loadDashboardData(periodRef.current, customRangeRef.current);

    const handleProfileSync = () => {
      loadDashboardData(periodRef.current, customRangeRef.current);
    };

    const midnightCheckInterval = setInterval(() => {
      // Detecção de virada do dia (00:00 / 00:01)
      const currentToday = toBrazilYMD(new Date());
      if (currentToday !== lastKnownDate) {
        lastKnownDate = currentToday;
        if (periodRef.current === 'Hoje') {
          loadDashboardData('Hoje');
        }
      }
    }, 60000);

    const updateMinsAgo = () => {
      if (lastSyncTimeRef.current) {
        const diff = Math.floor((Date.now() - lastSyncTimeRef.current) / 60000);
        setMinsAgo(Math.max(0, diff));
      }
    };

    const minsInterval = setInterval(updateMinsAgo, 30000);
    window.addEventListener('focus', updateMinsAgo);

    window.addEventListener('primetrack_profile_sync', handleProfileSync);
    return () => {
      clearInterval(midnightCheckInterval);
      clearInterval(minsInterval);
      window.removeEventListener('focus', updateMinsAgo);
      window.removeEventListener('primetrack_profile_sync', handleProfileSync);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('primetrack_dashboard_period');
          localStorage.removeItem('primetrack_dashboard_custom_range');
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
    }
  }, [period]);

  // Preserva cada venda real individual (com suporte a vendas e order bumps)
  const deduplicatedOrders = useMemo(() => {
    const orderMap = new Map();
    for (const o of ordersList) {
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
  }, [ordersList]);

  // Lista única de produtos para o dropdown de filtro
  const uniqueProducts = useMemo(() => {
    const set = new Set();
    deduplicatedOrders.forEach(o => {
      if (o.productName) set.add(o.productName);
    });
    return Array.from(set);
  }, [deduplicatedOrders]);

  // Lista única de plataformas para o dropdown de filtro
  const uniquePlatforms = useMemo(() => {
    const set = new Set();
    deduplicatedOrders.forEach(o => {
      const plat = o.gateway || o.platform;
      if (plat) set.add(plat);
    });
    if (set.size === 0) {
      set.add('MonsterPay');
    }
    return Array.from(set);
  }, [deduplicatedOrders]);

  // Lista unificada de contas de anúncio disponíveis para filtro no Dashboard
  // Inclui contas ativas, contas salvas no cache do usuário e contas com histórico nas campanhas carregadas
  const availableAccounts = useMemo(() => {
    const map = new Map();
    if (Array.isArray(adAccountsList)) {
      adAccountsList.forEach(a => {
        const cleanId = String(a.id || a.accountId || '').replace('act_', '').trim();
        if (cleanId) map.set(cleanId, { id: cleanId, name: a.name || `Conta ${cleanId}` });
      });
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('primetrack_ad_accounts') || '[]');
        if (Array.isArray(stored)) {
          stored.forEach(a => {
            const cleanId = String(a.accountId || a.id || '').replace('act_', '').trim();
            if (cleanId && !map.has(cleanId)) {
              map.set(cleanId, { id: cleanId, name: a.name || `Conta ${cleanId}` });
            }
          });
        }
      } catch (e) {}
    }
    if (Array.isArray(campaigns)) {
      campaigns.forEach(c => {
        const cleanId = String(c.adAccountId || c.accountId || '').replace('act_', '').trim();
        if (cleanId && !map.has(cleanId)) {
          map.set(cleanId, { id: cleanId, name: c.accountName || `Conta ${cleanId}` });
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [adAccountsList, campaigns]);

  // Filtra as campanhas baseado na conta selecionada e no dashboard ativo
  const filteredCampaigns = useMemo(() => {
    // Se o dashboard ativo não é o padrão ("Principal"), ele vem zerado a menos que tenha campanhas/contas vinculadas
    if (activeDashboard && !activeDashboard.isDefault && activeDashboard.id !== 'principal') {
      const hasSpecificAccs = Array.isArray(activeDashboard.adAccounts) && activeDashboard.adAccounts.length > 0;
      const hasSpecificCamps = Array.isArray(activeDashboard.campaignIds) && activeDashboard.campaignIds.length > 0;
      if (!hasSpecificAccs && !hasSpecificCamps) {
        return [];
      }
    }

    const isToday = period === 'Hoje';

    return campaigns.filter(c => {
      const cAdId = String(c.adAccountId || c.accountId || '').replace('act_', '').trim();
      const cAccName = (c.accountName || '').toLowerCase().trim();

      // Se uma conta específica foi selecionada no filtro:
      if (selectedAccount !== 'Todas') {
        const cleanSelected = String(selectedAccount).replace('act_', '').trim();
        const selectedMatch = availableAccounts.find(a => 
          a.name === selectedAccount || 
          String(a.id).replace('act_', '').trim() === cleanSelected
        );
        const targetId = selectedMatch ? String(selectedMatch.id).replace('act_', '').trim() : cleanSelected;
        const targetName = selectedMatch ? (selectedMatch.name || '').toLowerCase().trim() : String(selectedAccount).toLowerCase().trim();

        const matchesById = cAdId && cAdId === targetId;
        const matchesByName = cAccName && (cAccName === targetName || targetName.includes(cAccName) || cAccName.includes(targetName));
        return matchesById || matchesByName;
      }

      // Se for "Todas" / "Qualquer":
      // REGRA FUNDAMENTAL: Gasto e vendas NUNCA somem do usuário,
      // mesmo que a conta de anúncio tenha sido desativada em integrações ou bloqueada no Facebook.
      const hasFinancialActivity = 
        Number(c.spend || 0) > 0 || 
        Number(c.sales || 0) > 0 || 
        Number(c.revenue || 0) > 0 || 
        Number(c.clicks || 0) > 0 || 
        Number(c.impressions || 0) > 0;

      if (hasFinancialActivity) {
        return true;
      }

      // Se não teve movimentação financeira no período:
      // Exibe campanhas pertencentes a contas ativas em Integrações
      if (adAccountsList.length > 0) {
        const belongsToActiveAcc = adAccountsList.some(acc => {
          const accIdClean = String(acc.id || acc.accountId || '').replace('act_', '').trim();
          return (cAdId && cAdId === accIdClean) || (acc.name && cAccName === acc.name.toLowerCase().trim());
        });
        const isCampActive = c.status === true || c.status === 'ACTIVE' || c.rawStatus === 'ACTIVE' || c.effectiveStatus === 'ACTIVE';
        return belongsToActiveAcc && (isCampActive || !isToday);
      }

      return true;
    });
  }, [campaigns, selectedAccount, adAccountsList, availableAccounts, activeDashboard, period]);

  // Filtra as vendas baseado no período e filtros selecionados
  const filteredOrders = useMemo(() => {
    const todayYMD = toBrazilYMD(new Date());
    if (!todayYMD) return [];
    const [y, m, d] = todayYMD.split('-').map(Number);
    const yesterdayYMD = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    const sevenDaysAgoYMD = new Date(Date.UTC(y, m - 1, d - 6)).toISOString().slice(0, 10);
    const fifteenDaysAgoYMD = new Date(Date.UTC(y, m - 1, d - 14)).toISOString().slice(0, 10);
    const thirtyDaysAgoYMD = new Date(Date.UTC(y, m - 1, d - 29)).toISOString().slice(0, 10);
    const currentMonthPrefix = todayYMD.slice(0, 7);

    const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
    const lastDayPrevMonth = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
    const prevYear = prevMonthDate.getUTCFullYear();
    const prevMonthStr = String(prevMonthDate.getUTCMonth() + 1).padStart(2, '0');
    const prevMonthPrefix = `${prevYear}-${prevMonthStr}`;
    const prevMonthSince = `${prevMonthPrefix}-01`;
    const prevMonthUntil = `${prevMonthPrefix}-${String(lastDayPrevMonth).padStart(2, '0')}`;

    return deduplicatedOrders.filter(o => {
      const rawDate = o.createdAt || o.created_at || o.date;
      if (!rawDate) return false;
      const orderYMD = toBrazilYMD(rawDate);
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
      } else if (period === '7 dias' || period === 'Últimos 7 dias') {
        if (orderYMD < sevenDaysAgoYMD || orderYMD > todayYMD) return false;
      } else if (period === '14 dias' || period === '15 dias' || period === 'Últimos 14 dias' || period === 'Últimos 15 dias') {
        if (orderYMD < fifteenDaysAgoYMD || orderYMD > todayYMD) return false;
      } else if (period === '30 dias' || period === 'Últimos 30 dias') {
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

      // Filtro de plataforma
      if (selectedPlatform !== 'Qualquer') {
        const plat = (o.gateway || o.platform || '').toLowerCase();
        if (!plat.includes(selectedPlatform.toLowerCase())) return false;
      }

      // Filtro de produto
      if (selectedProduct !== 'Qualquer') {
        if (o.productName !== selectedProduct) return false;
      }

      // Filtro de conta de anúncios
      if (selectedAccount !== 'Todas') {
        const cleanSelected = String(selectedAccount).replace('act_', '').trim();
        const match = availableAccounts.find(a => 
          a.name === selectedAccount || 
          String(a.id).replace('act_', '').trim() === cleanSelected
        );
        const targetId = match ? String(match.id).replace('act_', '').trim() : cleanSelected;
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

      // Filtro de isolamento do Dashboard ativo:
      // Se for uma dashboard secundária (não é a Principal), ela começa 100% ZERADA
      // a menos que receba vendas do seu produto/plataforma ou vinculadas a ela
      if (activeDashboard && !activeDashboard.isDefault && activeDashboard.id !== 'principal') {
        const hasCustomPlat = activeDashboard.platformType === 'custom' && Array.isArray(activeDashboard.platforms) && activeDashboard.platforms.length > 0;
        const hasCustomProd = activeDashboard.productType === 'custom' && Boolean(activeDashboard.products?.trim());

        // Se o novo dashboard não tem regra de produto nem de plataforma, e o pedido não é explicitamente dele, vem ZERADO
        if (!hasCustomPlat && !hasCustomProd && (!o.dashboardId || o.dashboardId !== activeDashboard.id)) {
          return false;
        }

        // Se o pedido tiver o ID direto deste dashboard
        if (o.dashboardId && o.dashboardId === activeDashboard.id) {
          return true;
        }

        // Se configurou plataforma isolada
        if (hasCustomPlat) {
          const plat = (o.platform || o.gateway || '').toLowerCase();
          const matchPlat = activeDashboard.platforms.some(p => plat.includes(p.toLowerCase()));
          if (!matchPlat) return false;
        }

        // Se configurou produto isolado
        if (hasCustomProd) {
          const prodName = (o.productName || '').toLowerCase();
          const targetProd = activeDashboard.products.toLowerCase().trim();
          if (!prodName.includes(targetProd)) return false;
        }
      }

      return true;
    });
  }, [deduplicatedOrders, period, selectedSource, selectedPlatform, selectedProduct, selectedAccount, availableAccounts, filteredCampaigns, activeDashboard]);

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

  const effectivePixelStats = useMemo(() => {
    if (activeDashboard && !activeDashboard.isDefault && activeDashboard.id !== 'principal') {
      return { pageViews: 0, initiateCheckouts: 0, totalEvents: 0 };
    }
    return pixelStats;
  }, [activeDashboard, pixelStats]);

  // Cálculos do Funil de Conversão (Meta Ads + Pixel PrimeTrack + MonsterPay)
  const totalMetaClicks = useMemo(() => {
    return filteredCampaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  }, [filteredCampaigns]);

  const funnelApr = realApprovedSales;
  const funnelInic = Math.max(filteredOrders.length, funnelApr);
  const funnelIcs = Math.max(effectivePixelStats.initiateCheckouts || 0, funnelInic);
  const funnelVis = Math.max(effectivePixelStats.pageViews || 0, funnelIcs);
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
          {isPeriodLoading ? (
            <div className="py-1">
              <div className="h-6 sm:h-7 w-28 bg-white/10 rounded animate-pulse my-0.5" />
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse mt-1.5" />
            </div>
          ) : (
            <>
              <div className={`text-lg sm:text-xl font-bold tracking-tight font-sans ${card.valueColor}`}>
                {showValues ? card.value : '••••••••'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 truncate font-sans">
                {card.subtitle}
              </div>
            </>
          )}
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

    if (isPeriodLoading) {
      if (cardKey === 'funnel') {
        return (
          <div className={baseContainerClass}>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-1">
              <div className="h-4 w-44 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-4 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="h-16 w-full bg-white/5 rounded-lg animate-pulse" />
            </div>
          </div>
        );
      }
      return (
        <div className={baseContainerClass}>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-2 shrink-0">
            <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-4 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-2.5 py-1">
            <div className="h-3.5 w-full bg-white/5 rounded animate-pulse" />
            <div className="h-3.5 w-4/5 bg-white/5 rounded animate-pulse" />
            <div className="h-3.5 w-3/5 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      );
    }

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

  const renderHourlySalesSection = () => {
    if (isPeriodLoading) {
      return (
        <div className={`bg-[#141C2E] border ${
          isEditingLayout ? 'border-blue-500/50 ring-1 ring-blue-500/30 hover:border-blue-400 cursor-grab active:cursor-grabbing' : 'border-[#1E293B]'
        } rounded-xl p-3.5 sm:p-4 shadow-md h-full w-full flex flex-col justify-between select-none relative transition-colors`}>
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-4 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="h-28 flex items-end justify-between gap-1.5 px-1 pb-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="flex-1 bg-white/5 rounded-t animate-pulse" style={{ height: `${20 + (i % 5) * 12}px` }} />
            ))}
          </div>
        </div>
      );
    }

    return (
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
};

  return (
    <div className="space-y-3 pb-12 font-sans select-none">

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
              Atualizado há {formatTimeAgo(minsAgo)}
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
                  if (val === 'Personalizado') {
                    setPeriod(val);
                    periodRef.current = val;
                    setIsCalendarOpen(true);
                  } else {
                    setIsCalendarOpen(false);
                    handleSelectPeriod(val, null);
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
                setIsCalendarOpen(false);
                handleSelectPeriod(p, null);
              }}
              onApplyCustomRange={(range) => {
                setIsCalendarOpen(false);
                handleSelectPeriod('Personalizado', range);
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
                {availableAccounts.map(acc => (
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
                {uniquePlatforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
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
