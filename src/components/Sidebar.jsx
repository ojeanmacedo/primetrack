import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, getTrialStatus, logoutUser } from '../utils/auth';
import { 
  FileText,
  Search,
  Video,
  Music2,
  LayoutGrid,
  Link as LinkIcon,
  Link2,
  SlidersHorizontal,
  Percent,
  DollarSign,
  BarChart3,
  Zap,
  Bell,
  CreditCard,
  User,
  Settings,
  Rocket,
  Headphones,
  Star,
  Smartphone,
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Target
} from 'lucide-react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const trialStatus = getTrialStatus(user);

  // Menu items exatamente como na UTMify
  const navItems = [
    { to: '/dashboard', label: 'Resumo', icon: FileText, exact: true },
    { to: '/campanhas', label: 'Meta', icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 7.2c-2.4 0-4.3 1.6-5.4 3.7C5.4 9 3.5 7.6 1.8 7.6.8 7.6 0 8.4 0 9.4c0 2.2 2.6 6.3 5.4 6.3 1.8 0 3.3-1.1 4.4-2.8 1.1 1.7 2.6 2.8 4.4 2.8 2.8 0 5.4-4.1 5.4-6.3 0-1-.8-1.8-1.8-1.8-1.7 0-3.6 1.4-4.8 3.3-1.1-2.1-3-3.7-5.4-3.7zm-6.6 6.7c-1.6 0-3.6-2.9-3.6-4.5 0-.3.2-.5.5-.5 1.1 0 2.5 1.1 3.5 2.7-.2.9-.3 1.8-.4 2.3zm13.2 0c-.1-.5-.2-1.4-.4-2.3 1-1.6 2.4-2.7 3.5-2.7.3 0 .5.2.5.5 0 1.6-2 4.5-3.6 4.5z"/>
      </svg>
    )},
    { to: '/google', label: 'Google', icon: Search },
    { to: '/kwai', label: 'Kwai', icon: Video },
    { to: '/tiktok', label: 'TikTok', icon: Music2 },
    { to: '/taboola', label: 'Taboola', icon: LayoutGrid },
    { to: '/utms', label: 'UTMs', icon: LinkIcon },
    { to: '/integracoes', label: 'Integrações', icon: Link2 },
    { to: '/regras', label: 'Regras', icon: SlidersHorizontal },
    { to: '/taxas', label: 'Taxas', icon: Percent },
    { to: '/despesas', label: 'Despesas', icon: DollarSign },
    { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    { to: '/eventos', label: 'Eventos', icon: Zap },
    { to: '/notificacoes', label: 'Notificações', icon: Bell },
    { to: '/planos', label: 'Assinatura', icon: CreditCard },
    { to: '/integracoes?tab=app', label: 'Minha conta', icon: User },
    { to: '/avancado', label: 'Avançado', icon: Settings },
    { to: '/indique', label: 'Indique e Ganhe 10%', icon: Rocket },
    { to: '/suporte', label: 'Suporte', icon: Headphones },
    { to: '/novidades', label: 'Novidades', icon: Star },
    { to: '/aplicativo', label: 'Aplicativo', icon: Smartphone },
  ];

  return (
    <aside className={`h-screen bg-[#0A0F1D] border-r border-[#182238] flex flex-col justify-between transition-all duration-300 z-40 select-none ${
      collapsed ? 'w-18' : 'w-60'
    }`}>
      
      {/* Top Brand Header */}
      <div className="flex flex-col h-full overflow-hidden">
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#182238] shrink-0">
          <NavLink to="/" className="flex items-center gap-2 overflow-hidden">
            {/* Ícone de logo no estilo da UTMify (u arredondado estilizado + alvo) */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0055FF] to-[#1877F2] flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20 shrink-0">
              <span className="tracking-tighter">u</span>
            </div>
            {!collapsed && (
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white font-sans">
                  utm<span className="text-zinc-400 font-normal">ify</span>
                </span>
                <span className="w-3.5 h-3.5 rounded-full border border-zinc-500 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                </span>
              </div>
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
