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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);

  // Menu items do PrimeTrack com estética UTMify
  const navItems = [
    { to: '/dashboard', label: 'Resumo', icon: FileText, exact: true },
    { to: '/campanhas', label: 'Meta', icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 7.2c-2.4 0-4.3 1.6-5.4 3.7C5.4 9 3.5 7.6 1.8 7.6.8 7.6 0 8.4 0 9.4c0 2.2 2.6 6.3 5.4 6.3 1.8 0 3.3-1.1 4.4-2.8 1.1 1.7 2.6 2.8 4.4 2.8 2.8 0 5.4-4.1 5.4-6.3 0-1-.8-1.8-1.8-1.8-1.7 0-3.6 1.4-4.8 3.3-1.1-2.1-3-3.7-5.4-3.7zm-6.6 6.7c-1.6 0-3.6-2.9-3.6-4.5 0-.3.2-.5.5-.5 1.1 0 2.5 1.1 3.5 2.7-.2.9-.3 1.8-.4 2.3zm13.2 0c-.1-.5-.2-1.4-.4-2.3 1-1.6 2.4-2.7 3.5-2.7.3 0 .5.2.5.5 0 1.6-2 4.5-3.6 4.5z"/>
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
    <aside className={`h-screen bg-[#0A0F1D] border-r border-[#182238] flex flex-col justify-between transition-all duration-300 z-40 select-none ${
      collapsed ? 'w-18' : 'w-60'
    }`}>
      
      {/* Top Brand Header */}
      <div className="flex flex-col h-full overflow-hidden">
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#182238] shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden">
            <img 
              src="/images/logo-primetrack.png" 
              alt="PrimeTrack" 
              className="w-8 h-8 rounded-lg object-contain shadow-md shadow-blue-500/20 shrink-0" 
            />
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight text-white font-sans flex items-center">
                <span>Prime</span>
                <span className="text-[#1877F2]">Track</span>
              </span>
            )}
          </NavLink>

          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-lg border border-white/10 hover:border-[#1877F2] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Items (Scrollable exactly like UTMify) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? (location.pathname === '/dashboard' || location.pathname === '/')
              : location.pathname === item.to || (item.to.includes('?') && location.pathname + location.search === item.to);

            return (
              <NavLink
                key={item.label}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1877F2] text-white font-semibold shadow-sm shadow-blue-500/25'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer with logout option */}
        <div className="p-3 border-t border-[#182238] shrink-0">
          <button 
            type="button"
            onClick={async () => {
              await logoutUser();
              navigate('/login', { replace: true });
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sair da conta</span>}
          </button>
        </div>

      </div>

    </aside>
  );
}
