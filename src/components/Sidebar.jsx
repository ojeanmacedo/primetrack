import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, getTrialStatus, logoutUser } from '../utils/auth';
import { 
  LayoutDashboard, 
  Layers, 
  ShoppingBag, 
  Sliders, 
  Link2, 
  Bell, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Trophy, 
  Headphones,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dashboardsOpen, setDashboardsOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);

  const isPainelActive = location.pathname === '/dashboard' || location.pathname === '/';

  const menuItems = [
    { to: '/campanhas', label: 'Campanhas', icon: Layers },
    { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
    { to: '/regras', label: 'Regras', icon: Sliders, badge: 'PRO' },
    { to: '/integracoes', label: 'Integrações', icon: Link2 },
    { to: '/notificacoes', label: 'Notificações', icon: Bell },
  ];

  return (
    <aside className={`h-screen bg-[#070D1A] border-r border-[#13233E] flex flex-col justify-between transition-all duration-300 z-40 select-none ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      
      {/* Top Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#13233E]">
          <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden">
            <img 
              src="/images/logo-primetrack.png" 
              alt="PrimeTrack" 
              className="w-7 h-7 rounded-lg object-contain shadow-md shrink-0" 
            />
            {!collapsed && (
              <span className="text-base font-extrabold text-white tracking-tight flex items-center">
                <span>Prime</span>
                <span className="text-[#5C9BFF]">Track</span>
              </span>
            )}
          </NavLink>

          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-lg border border-white/10 hover:border-[#5C9BFF] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Dashboards Accordion */}
        <div className="px-3 pt-4">
          {!collapsed && (
            <div className="mb-2">
              <button 
                onClick={() => setDashboardsOpen(!dashboardsOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#5C9BFF]" />
                  <span>Dashboards</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dashboardsOpen ? '' : '-rotate-90'}`} />
              </button>

              {dashboardsOpen && (
                <div className="pl-2 pt-1 space-y-1">
                  <div className="text-[11px] font-medium text-zinc-400 px-3 py-1 flex items-center justify-between">
                    <span>Dashboard Principal</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </div>

                  <NavLink 
                    to="/dashboard"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      isPainelActive
                        ? 'bg-[#12223D] text-[#5C9BFF] border border-[#1A6DFF]/30 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A6DFF]" />
                    <span>Painel</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Main Navigation Items */}
          <nav className="space-y-1 mt-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#12223D] text-[#5C9BFF] border border-[#1A6DFF]/30 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5C9BFF]' : 'text-zinc-400'}`} />
                      {!collapsed && (
                        <span className="flex-1 text-left">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1A6DFF]/20 text-[#5C9BFF] border border-[#1A6DFF]/30 text-[9px] font-mono font-bold">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Area: Plan Card & User Profile */}
      <div className="p-3 border-t border-[#13233E] space-y-3">
        
        {/* Plan / Trial Card */}
        {!collapsed && (
          <div className="p-3.5 rounded-2xl bg-[#0A1426] border border-[#13233E]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                {trialStatus.isTrial ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#5C9BFF]" />
                    <span>Trial</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Plano Pro</span>
                  </>
                )}
              </span>
              <span className="font-mono text-[10px] text-zinc-400 bg-[#070D1A] px-2 py-0.5 rounded-full border border-white/5">
                {trialStatus.isTrial ? `${trialStatus.daysLeft}d restantes` : 'Ativo'}
              </span>
            </div>

            <div className="text-xs text-zinc-300 font-mono mt-1">
              R$ 481,41 <span className="text-[10px] text-zinc-500">faturado</span>
            </div>

            <div className="text-[11px] text-amber-400 flex items-center gap-1 mt-1 mb-3 cursor-pointer hover:underline" onClick={() => navigate('/planos')}>
              <span>🏆</span>
              <span>Ver placas</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NavLink 
                to="/planos"
                className="py-1.5 px-3 rounded-lg bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs text-center transition-colors shadow-sm"
              >
                Planos
              </NavLink>
              <NavLink 
                to="/suporte"
                className="py-1.5 px-3 rounded-lg bg-[#070D1A] hover:bg-white/5 border border-white/10 text-zinc-300 font-medium text-xs text-center transition-colors flex items-center justify-center gap-1"
              >
                <span>Suporte</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* User Profile Bar */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#1A6DFF] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
              {user.avatarLetter || 'D'}
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate" title={user.name || 'Digital JM Soluções'}>
                  {user.name || 'Digital JM Soluções'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate font-mono">
                  {user.email || 'digitaljmsolucoes@gmail.com'}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button 
              onClick={() => {
                logoutUser();
                navigate('/login');
              }}
              title="Sair da conta"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

    </aside>
  );
}
