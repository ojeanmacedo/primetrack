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
  LogOut
} from 'lucide-react';

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);

  useEffect(() => {
    // Fecha o menu mobile ao navegar
    onMobileClose();
  }, [location.pathname]);

  // Menu items do PrimeTrack com estética UTMify
  const navItems = [
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
    { to: '/notificacoes', label: 'Notificações', icon: Bell },
    { to: '/planos', label: 'Assinatura', icon: CreditCard },
    { to: '/conta', label: 'Minha conta', icon: User },
    { to: '/avancado', label: 'Avançado', icon: Settings },
    { to: '/suporte', label: 'Suporte', icon: Headphones },
  ];

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
          : 'fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0 lg:static ' + (collapsed ? 'lg:w-18' : 'lg:w-60')
      }`}>
        
        {/* Top Brand Header */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E293B] shrink-0 bg-[#0D1424]">
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

          {/* Navigation Items (Scrollable exactly like UTMify) */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin bg-[#0D1424]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? (location.pathname === '/dashboard' || location.pathname === '/')
                : location.pathname === item.to || (item.to.includes('?') && location.pathname + location.search === item.to);

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#0066FF] text-white font-semibold shadow-md shadow-blue-600/25'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  {(!collapsed || mobileOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
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
