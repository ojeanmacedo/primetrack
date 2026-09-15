import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import { getCurrentUser } from '../utils/auth';
import { 
  Eye, 
  EyeOff, 
  Edit3, 
  HelpCircle,
  Menu,
  FileText,
  ShoppingBag,
  SlidersHorizontal,
  Link2
} from 'lucide-react';

export default function AppLayout() {
  const [user, setUser] = useState(getCurrentUser());
  const location = useLocation();
  const [totalFaturado, setTotalFaturado] = useState(0);
  const [showValues, setShowValues] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sincroniza usuário quando o perfil é alterado em Minha Conta
  useEffect(() => {
    const handleProfileSync = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('primetrack_profile_sync', handleProfileSync);
    return () => window.removeEventListener('primetrack_profile_sync', handleProfileSync);
  }, []);

  // Bloqueio de rota não autenticada: redireciona para /login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    if (!user) {
      setTotalFaturado(0);
      return;
    }
    const userHeaders = user.id ? { 'x-user-id': user.id } : {};
    const userParam = user.id ? `?userId=${encodeURIComponent(user.id)}` : '';

    fetch('/api/orders' + userParam, { headers: userHeaders })
      .then(r => r.json())
      .then(orders => {
        if (Array.isArray(orders)) {
          const approvedSum = orders
            .filter(o => o.status === 'approved' || o.status === 'paid' || o.status === 'pago')
            .reduce((acc, o) => acc + Number(o.amount || 0), 0);
          setTotalFaturado(approvedSum);
        } else {
          setTotalFaturado(0);
        }
      })
      .catch(() => setTotalFaturado(0));
  }, [location.pathname, user?.id]);

  const userName = user?.name || user?.email?.split('@')[0] || 'Jean Macedo';
  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'JM');

  const [isEditingLayout, setIsEditingLayout] = useState(false);

  useEffect(() => {
    const handleEditStatus = (e) => {
      if (typeof e.detail?.isEditing === 'boolean') {
        setIsEditingLayout(e.detail.isEditing);
      }
    };
    window.addEventListener('primetrack_edit_layout_status', handleEditStatus);
    return () => window.removeEventListener('primetrack_edit_layout_status', handleEditStatus);
  }, []);

  const handleToggleEdit = () => {
    const next = !isEditingLayout;
    setIsEditingLayout(next);
    window.dispatchEvent(new CustomEvent('primetrack_toggle_edit_layout', { detail: { isEditing: next } }));
  };

  const handleToggleShowValues = () => {
    const next = !showValues;
    setShowValues(next);
    window.dispatchEvent(new CustomEvent('primetrack_toggle_show_values', { detail: { showValues: next } }));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0D1424] text-[#EDF2FF] flex font-sans">
      {/* Left Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar 
        mobileOpen={mobileMenuOpen} 
        onMobileClose={() => setMobileMenuOpen(false)} 
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0D1424]">
        
        {/* Topbar matching UTMify */}
        <header className="h-14 sm:h-16 bg-[#0D1424] border-b border-[#182238] px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-30">
          {/* Left: Mobile Menu Button + Page title and action icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 cursor-pointer"
              title="Abrir menu lateral"
            >
              <Menu className="w-4 h-4" />
            </button>

            <h1 className="text-xs sm:text-base font-bold text-white tracking-tight truncate max-w-[140px] sm:max-w-none">
              Dashboard – Principal
            </h1>
            <div className="flex items-center gap-1 sm:gap-1.5 text-zinc-400">
              <button 
                onClick={handleToggleShowValues}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  !showValues ? 'text-blue-400 bg-blue-500/10' : 'hover:text-white'
                }`} 
                title={showValues ? "Ocultar nome dos produtos" : "Mostrar nome dos produtos"}
              >
                {!showValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button 
                onClick={handleToggleEdit}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isEditingLayout 
                    ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/30' 
                    : 'hover:text-white hover:bg-white/5 transition-colors'
                }`} 
                title={isEditingLayout ? "Concluir edição do layout" : "Editar layout da dashboard"}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Goal & User profile */}
          <div className="flex items-center gap-2.5 sm:gap-6">
            
            {/* Goal progress */}
            <div className="hidden md:flex items-center text-xs font-mono font-bold text-zinc-300">
              <span>R$ {totalFaturado.toFixed(2).replace('.', ',')}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span className="text-zinc-400">R$ 1M</span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 sm:gap-2.5 pl-2 border-l border-[#182238]">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight">
                  {userName}
                </div>
                <div className="text-[10px] text-zinc-400 font-sans leading-tight">
                  Usuário
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1877F2] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                {userInitials}
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Route Content (with padding bottom on mobile for safe area) */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-20 lg:pb-6 scrollbar-thin">
          <div className="w-full max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Bottom Mobile Navigation Bar (Estilo App Nativo iOS / Android) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0A0F1D]/95 backdrop-blur-md border-t border-[#182238] flex items-center justify-around px-2 z-40">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#1877F2] font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4 mb-0.5" />
            <span>Resumo</span>
          </NavLink>

          <NavLink
            to="/campanhas"
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#1877F2] font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-4 h-4 mb-0.5 feather feather-facebook"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
            <span>Meta</span>
          </NavLink>

          <NavLink
            to="/vendas"
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#1877F2] font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            <span>Vendas</span>
          </NavLink>

          <NavLink
            to="/integracoes"
            className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#1877F2] font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Link2 className="w-4 h-4 mb-0.5" />
            <span>Integrações</span>
          </NavLink>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-zinc-400 hover:text-white cursor-pointer"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            <span>Mais</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
