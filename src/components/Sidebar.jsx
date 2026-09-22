import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, getTrialStatus, logoutUser } from '../utils/auth';
import { 
  FileText,
  ShoppingBag,
  Link2,
  SlidersHorizontal,
  Percent,
  Bell,
  CreditCard,
  User,
  Settings,
  Headphones,
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Plus
} from 'lucide-react';

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);

  // Lista de Dashboards
  const [dashboards, setDashboards] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('primetrack_dashboards');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [{ id: 'principal', name: 'Principal', isDefault: true }];
  });

  // ID do Dashboard Ativo
  const [activeDashboardId, setActiveDashboardId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('primetrack_active_dashboard_id') || 'principal';
    }
    return 'principal';
  });

  // Estado de expansão de cada dashboard (setinha abre/fecha)
  const [expandedDashboards, setExpandedDashboards] = useState(() => {
    const initialActive = typeof window !== 'undefined' 
      ? (localStorage.getItem('primetrack_active_dashboard_id') || 'principal')
      : 'principal';
    return { [initialActive]: true, principal: true };
  });

  useEffect(() => {
    // Fecha o menu mobile ao navegar
    onMobileClose();
  }, [location.pathname]);

  // Escuta alterações de dashboards e dashboard ativo
  useEffect(() => {
    const handleDashboardsUpdated = (e) => {
      if (Array.isArray(e.detail)) {
        setDashboards(e.detail);
      } else if (typeof window !== 'undefined') {
        try {
          const saved = JSON.parse(localStorage.getItem('primetrack_dashboards') || '[]');
          if (Array.isArray(saved) && saved.length > 0) setDashboards(saved);
        } catch (err) {}
      }
    };

    const handleDashboardChanged = (e) => {
      if (e.detail?.id) {
        setActiveDashboardId(e.detail.id);
        setExpandedDashboards(prev => ({ ...prev, [e.detail.id]: true }));
      }
    };

    window.addEventListener('primetrack_dashboards_updated', handleDashboardsUpdated);
    window.addEventListener('primetrack_dashboard_changed', handleDashboardChanged);
    return () => {
      window.removeEventListener('primetrack_dashboards_updated', handleDashboardsUpdated);
      window.removeEventListener('primetrack_dashboard_changed', handleDashboardChanged);
    };
  }, []);

  // Sub-itens que pertencem a CADA dashboard
  const dashboardSubItems = [
    { to: '/dashboard', label: 'Resumo', icon: FileText, exact: true },
    { to: '/campanhas', label: 'Meta', icon: ({ className }) => (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={`feather feather-facebook ${className}`}
      >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    )},
    { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
    { to: '/integracoes', label: 'Integrações', icon: Link2 },
    { to: '/regras', label: 'Regras', icon: SlidersHorizontal },
    { to: '/taxas', label: 'Taxas', icon: Percent },
  ];

  // Itens globais de navegação da conta
  const globalNavItems = [
    { to: '/notificacoes', label: 'Notificações', icon: Bell },
    { to: '/planos', label: 'Assinatura', icon: CreditCard },
    { to: '/conta', label: 'Minha conta', icon: User },
    { to: '/avancado', label: 'Avançado', icon: Settings },
    { to: '/suporte', label: 'Suporte', icon: Headphones },
  ];

  // Alterna expansão da setinha de um dashboard
  const handleToggleExpand = (dashId, e) => {
    e?.stopPropagation();
    setExpandedDashboards(prev => ({
      ...prev,
      [dashId]: !prev[dashId]
    }));
  };

  // Clica no header do dashboard (abre e ativa)
  const handleSelectDashboardHeader = (dash) => {
    setExpandedDashboards(prev => ({
      ...prev,
      [dash.id]: true
    }));

    if (activeDashboardId !== dash.id) {
      setActiveDashboardId(dash.id);
      localStorage.setItem('primetrack_active_dashboard_id', dash.id);
      window.dispatchEvent(new CustomEvent('primetrack_dashboard_changed', { detail: dash }));
    }

    navigate('/dashboard');
  };

  // Clica em um sub-item de um dashboard específico
  const handleSelectSubItem = (dash, path) => {
    if (activeDashboardId !== dash.id) {
      setActiveDashboardId(dash.id);
      localStorage.setItem('primetrack_active_dashboard_id', dash.id);
      window.dispatchEvent(new CustomEvent('primetrack_dashboard_changed', { detail: dash }));
    }
    navigate(path);
  };

  return (
    <>
      {/* Overlay Backdrop para Mobile */}
      {mobileOpen && (
        <div 
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
        />
      )}

      <aside className={`h-screen bg-[#0D1424] border-r border-[#1E293B] flex flex-col justify-between transition-all duration-300 z-50 select-none ${
        /* No mobile: gaveta fixa com slide. No desktop: posição normal inline */
        mobileOpen 
          ? 'fixed inset-y-0 left-0 w-64 shadow-2xl flex translate-x-0' 
          : 'fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0 lg:static ' + (collapsed ? 'lg:w-18' : 'lg:w-64')
      }`}>
        
        {/* Top Brand Header */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-[#1E293B] shrink-0 bg-[#0D1424]">
            <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden">
              <img 
                src="/images/logo-primetrack.png?v=5" 
                alt="PrimeTrack" 
                className="w-8 h-8 object-contain shrink-0" 
              />
              {(!collapsed || mobileOpen) && (
                <span className="text-lg font-bold tracking-tight text-white font-sans flex items-center">
                  <span>PrimeTrack</span>
                </span>
              )}
            </NavLink>

            {/* Botão fechar no mobile / recolher no desktop */}
            <div className="flex items-center">
              <button 
                onClick={onMobileClose}
                className="lg:hidden p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                title="Fechar menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex w-6 h-6 rounded-lg border border-[#1E293B] hover:border-[#0066FF] text-zinc-400 hover:text-white items-center justify-center transition-colors cursor-pointer"
                title={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Navigation Items (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin bg-[#0D1424]">
            
            {/* Seção Dashboards com Accordion / Setinha para cada um */}
            <div className="space-y-1.5">
              {dashboards.map((dash) => {
                const isActiveDash = dash.id === activeDashboardId;
                const isExpanded = !!expandedDashboards[dash.id];

                return (
                  <div key={dash.id} className="space-y-1">
                    
                    {/* Linha do Dashboard (com setinha para abrir opções) */}
                    <div 
                      onClick={() => handleSelectDashboardHeader(dash)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none group ${
                        isActiveDash 
                          ? 'bg-[#141C2E] text-white border border-[#0066FF]/40 shadow-sm' 
                          : 'text-zinc-300 hover:text-white hover:bg-white/[0.04]'
                      }`}
                      title={collapsed && !mobileOpen ? dash.name : undefined}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <LayoutDashboard className={`w-4 h-4 shrink-0 transition-colors ${
                          isActiveDash ? 'text-[#0066FF]' : 'text-zinc-400 group-hover:text-zinc-200'
                        }`} />
                        
                        {(!collapsed || mobileOpen) && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{dash.name}</span>
                            {isActiveDash && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Botão da Setinha (Abre / Fecha opções daquela dashboard) */}
                      {(!collapsed || mobileOpen) && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleExpand(dash.id, e)}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title={isExpanded ? "Recolher opções" : "Expandir opções"}
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? 'rotate-0 text-white' : '-rotate-90 text-zinc-400'
                          }`} />
                        </button>
                      )}
                    </div>

                    {/* Sub-itens daquela dashboard (quando expandido) */}
                    {isExpanded && (!collapsed || mobileOpen) && (
                      <div className="pl-3 space-y-0.5 border-l border-[#1E293B]/80 ml-4.5 my-1 animate-in fade-in duration-150">
                        {dashboardSubItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubItemActive = isActiveDash && (
                            subItem.exact 
                              ? (location.pathname === '/dashboard' || location.pathname === '/')
                              : location.pathname === subItem.to
                          );

                          return (
                            <button
                              key={subItem.label}
                              type="button"
                              onClick={() => handleSelectSubItem(dash, subItem.to)}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left cursor-pointer ${
                                isSubItemActive
                                  ? 'bg-[#0066FF] text-white font-semibold shadow-md shadow-blue-600/25'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                              }`}
                            >
                              <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubItemActive ? 'text-white' : 'text-zinc-400'}`} />
                              <span className="truncate">{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Divisor sutil entre Dashboards e Itens Globais */}
            <div className="pt-2 pb-1 border-t border-[#1E293B]/70 my-2"></div>

            {/* Itens Globais de Navegação (Notificações, Assinatura, Minha Conta, Avançado, Suporte) */}
            <div className="space-y-1">
              {globalNavItems.map((item) => {
                const Icon = item.icon;
                const isGlobalActive = location.pathname === item.to;

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    title={collapsed && !mobileOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isGlobalActive
                        ? 'bg-[#0066FF] text-white font-semibold shadow-md shadow-blue-600/25'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isGlobalActive ? 'text-white' : 'text-zinc-400'}`} />
                    {(!collapsed || mobileOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>

          </div>

          {/* Footer with logout option */}
          <div className="p-3 border-t border-[#1E293B] shrink-0">
            <button 
              type="button"
              onClick={async () => {
                await logoutUser();
                navigate('/login', { replace: true });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {(!collapsed || mobileOpen) && <span>Sair da conta</span>}
            </button>
          </div>

        </div>

      </aside>
    </>
  );
}
