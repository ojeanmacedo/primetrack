import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  MoreVertical, 
  Lock, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Copy, 
  ExternalLink,
  ArrowRightLeft,
  AlertTriangle,
  Sliders,
  Layers,
  Sparkles,
  ShoppingBag,
  Clock,
  Coins,
  Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getPlanLimits } from '../utils/auth';

const DEFAULT_DASHBOARD = {
  id: 'principal',
  name: 'Principal',
  billingType: 'Faturamento Normal',
  timezone: 'GMT -3 | Brasília',
  currency: 'Real Brasileiro (R$)',
  currencySymbol: 'R$',
  interest: 'habilitado',
  platformType: 'all', // 'all' ou 'custom'
  platforms: [],
  productType: 'all', // 'all' ou 'custom'
  products: '',
  attributionModel: 'last_click',
  attributionWindow: '7d',
  isDefault: true,
  createdAt: new Date().toISOString()
};

const PLATFORMS_LIST = [
  'Kiwify',
  'Hotmart',
  'PerfectPay',
  'Kirvano',
  'Greenn',
  'Braip',
  'Ticto',
  'Eduzz',
  'Monetizze',
  'Yampi',
  'Shopify',
  'Appmax',
  'Doppus',
  'Hubla'
];

export default function Advanced() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const planLimits = getPlanLimits(currentUser);
  const maxDashboards = planLimits.maxDashboards;
  const isFreePlan = planLimits.name === 'Free';

  // Modal de Upgrade quando atinge o limite do plano
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState('');

  // Lista de dashboards
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
    return [DEFAULT_DASHBOARD];
  });

  // ID do dashboard ativo
  const [activeDashboardId, setActiveDashboardId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('primetrack_active_dashboard_id') || 'principal';
    }
    return 'principal';
  });

  // Estado do Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState(null);

  // Formulário do Dashboard
  const [formName, setFormName] = useState('');
  const [formBillingType, setFormBillingType] = useState('Faturamento Normal');
  const [formTimezone, setFormTimezone] = useState('GMT -3 | Brasília');
  const [formCurrency, setFormCurrency] = useState('Real Brasileiro (R$)');
  const [formInterest, setFormInterest] = useState('habilitado');
  const [formPlatformType, setFormPlatformType] = useState('all');
  const [formSelectedPlatforms, setFormSelectedPlatforms] = useState([]);
  const [formProductType, setFormProductType] = useState('all');
  const [formProducts, setFormProducts] = useState('');
  const [formAttributionModel, setFormAttributionModel] = useState('last_click');
  const [formAttributionWindow, setFormAttributionWindow] = useState('7d');

  // Menu de opções aberto (ID do dashboard)
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Feedback de notificação
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Salva lista no localStorage
  const saveDashboardsList = (list) => {
    setDashboards(list);
    localStorage.setItem('primetrack_dashboards', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('primetrack_dashboards_updated', { detail: list }));
  };

  // Fechar menu de opções ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Abrir Modal para Novo Dashboard
  const handleOpenNewModal = () => {
    if (dashboards.length >= maxDashboards) {
      if (isFreePlan) {
        setUpgradeModalReason('O Plano Free permite apenas 1 dashboard (a Principal já inclusa no seu cadastro). Para criar múltiplos dashboards e isolar operações, faça upgrade para o Plano Pro ou Scale.');
      } else {
        setUpgradeModalReason(`Seu plano atual (${planLimits.name}) permite até ${maxDashboards} ${maxDashboards === 1 ? 'dashboard' : 'dashboards'}. Faça o upgrade para criar mais dashboards.`);
      }
      setIsUpgradeModalOpen(true);
      return;
    }
    setEditingDashboardId(null);
    setFormName('');
    setFormBillingType('Faturamento Normal');
    setFormTimezone('GMT -3 | Brasília');
    setFormCurrency('Real Brasileiro (R$)');
    setFormInterest('habilitado');
    setFormPlatformType('all');
    setFormSelectedPlatforms([]);
    setFormProductType('all');
    setFormProducts('');
    setFormAttributionModel('last_click');
    setFormAttributionWindow('7d');
    setIsModalOpen(true);
  };

  // Abrir Modal para Editar Dashboard
  const handleOpenEditModal = (dashboard) => {
    setEditingDashboardId(dashboard.id);
    setFormName(dashboard.name);
    setFormBillingType(dashboard.billingType || 'Faturamento Normal');
    setFormTimezone(dashboard.timezone || 'GMT -3 | Brasília');
    setFormCurrency(dashboard.currency || 'Real Brasileiro (R$)');
    setFormInterest(dashboard.interest || 'habilitado');
    setFormPlatformType(dashboard.platformType || 'all');
    setFormSelectedPlatforms(dashboard.platforms || []);
    setFormProductType(dashboard.productType || 'all');
    setFormProducts(dashboard.products || '');
    setFormAttributionModel(dashboard.attributionModel || 'last_click');
    setFormAttributionWindow(dashboard.attributionWindow || '7d');
    setOpenMenuId(null);
    setIsModalOpen(true);
  };

  // Salvar Criação ou Edição
  const handleSaveDashboard = (e) => {
    e?.preventDefault();
    if (!formName.trim()) {
      showNotification('Insira um nome para o dashboard', 'error');
      return;
    }

    const currencySymbol = formCurrency.includes('$') ? (formCurrency.includes('Real') ? 'R$' : '$') : '€';

    if (editingDashboardId) {
      // Editando existente
      const updatedList = dashboards.map(d => {
        if (d.id === editingDashboardId) {
          return {
            ...d,
            name: formName.trim(),
            billingType: formBillingType,
            timezone: formTimezone,
            currency: formCurrency,
            currencySymbol,
            interest: formInterest,
            platformType: formPlatformType,
            platforms: formPlatformType === 'all' ? [] : formSelectedPlatforms,
            productType: formProductType,
            products: formProductType === 'all' ? '' : formProducts.trim(),
            attributionModel: formAttributionModel,
            attributionWindow: formAttributionWindow
          };
        }
        return d;
      });

      saveDashboardsList(updatedList);

      // Se editou o ativo, emite evento
      if (editingDashboardId === activeDashboardId) {
        const activeOne = updatedList.find(d => d.id === editingDashboardId);
        window.dispatchEvent(new CustomEvent('primetrack_dashboard_changed', { detail: activeOne }));
      }

      showNotification('Dashboard atualizado com sucesso!');
    } else {
      // Criando novo
      if (dashboards.length >= maxDashboards) {
        showNotification(`Limite de ${maxDashboards} dashboards atingido para o seu plano.`, 'error');
        setIsModalOpen(false);
        setIsUpgradeModalOpen(true);
        return;
      }
      const newId = 'dash_' + Date.now();
      const newDashboard = {
        id: newId,
        name: formName.trim(),
        billingType: formBillingType,
        timezone: formTimezone,
        currency: formCurrency,
        currencySymbol,
        interest: formInterest,
        platformType: formPlatformType,
        platforms: formPlatformType === 'all' ? [] : formSelectedPlatforms,
        productType: formProductType,
        products: formProductType === 'all' ? '' : formProducts.trim(),
        attributionModel: formAttributionModel,
        attributionWindow: formAttributionWindow,
        isDefault: false,
        createdAt: new Date().toISOString()
      };

      const updatedList = [...dashboards, newDashboard];
      saveDashboardsList(updatedList);
      showNotification('Novo dashboard criado com sucesso!');
    }

    setIsModalOpen(false);
  };

  // Definir como Ativo / Acessar Dashboard
  const handleSetActive = (dashboard) => {
    setActiveDashboardId(dashboard.id);
    localStorage.setItem('primetrack_active_dashboard_id', dashboard.id);
    window.dispatchEvent(new CustomEvent('primetrack_dashboard_changed', { detail: dashboard }));
    setOpenMenuId(null);
    showNotification(`Dashboard "${dashboard.name}" ativado!`);
  };

  // Acessar diretamente a tela de Dashboard com esse selecionado
  const handleGoToDashboard = (dashboard) => {
    handleSetActive(dashboard);
    navigate('/dashboard');
  };

  // Duplicar Dashboard
  const handleDuplicate = (dashboard) => {
    if (dashboards.length >= maxDashboards) {
      if (isFreePlan) {
        setUpgradeModalReason('O Plano Free permite apenas 1 dashboard (a Principal já inclusa). Para duplicar dashboards, faça upgrade para o Plano Pro ou Scale.');
      } else {
        setUpgradeModalReason(`Seu plano atual (${planLimits.name}) atingiu o limite de ${maxDashboards} ${maxDashboards === 1 ? 'dashboard' : 'dashboards'}. Faça upgrade para duplicar dashboards.`);
      }
      setOpenMenuId(null);
      setIsUpgradeModalOpen(true);
      return;
    }
    const newId = 'dash_' + Date.now();
    const duplicated = {
      ...dashboard,
      id: newId,
      name: `${dashboard.name} (Cópia)`,
      isDefault: false,
      createdAt: new Date().toISOString()
    };
    const updatedList = [...dashboards, duplicated];
    saveDashboardsList(updatedList);
    setOpenMenuId(null);
    showNotification(`Dashboard duplicado com sucesso!`);
  };

  // Excluir Dashboard
  const handleDelete = (dashboardId) => {
    if (dashboards.length <= 1) {
      showNotification('Não é possível excluir o único dashboard.', 'error');
      return;
    }
    const target = dashboards.find(d => d.id === dashboardId);
    if (target?.isDefault) {
      showNotification('O dashboard Principal não pode ser excluído.', 'error');
      return;
    }

    const updatedList = dashboards.filter(d => d.id !== dashboardId);
    saveDashboardsList(updatedList);

    try {
      localStorage.removeItem(`primetrack_webhook_tokens_${dashboardId}`);
      localStorage.removeItem(`primetrack_pixels_${dashboardId}`);
      localStorage.removeItem(`primetrack_connected_profiles_${dashboardId}`);
      localStorage.removeItem(`primetrack_ad_accounts_${dashboardId}`);
    } catch (e) {}

    // Se o dashboard excluído era o ativo ou se sobrou apenas 1 dashboard (Principal)
    if (activeDashboardId === dashboardId || updatedList.length === 1) {
      const fallback = updatedList[0];
      setActiveDashboardId(fallback.id);
      localStorage.setItem('primetrack_active_dashboard_id', fallback.id);
      window.dispatchEvent(new CustomEvent('primetrack_dashboard_changed', { detail: fallback }));
    }

    setOpenMenuId(null);
    showNotification('Dashboard excluído com sucesso.');
  };

  // Toggle de seleção de plataformas no modal
  const handleTogglePlatform = (plat) => {
    setFormSelectedPlatforms(prev => 
      prev.includes(plat) ? prev.filter(p => p !== plat) : [...prev, plat]
    );
  };

  return (
    <div className="min-h-full bg-[#0D1424] text-white p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 transition-all ${
          notification.type === 'error' 
            ? 'bg-red-500/90 text-white border border-red-400' 
            : 'bg-emerald-600/90 text-white border border-emerald-400'
        }`}>
          {notification.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}

      {/* Grid Principal: Esquerda (Dashboards) + Direita (Recursos Pro) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Coluna Esquerda: Gerenciador de Dashboards (8 Colunas no Desktop) */}
        <div className="lg:col-span-8 bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 sm:p-6 shadow-xl">
          
          {/* Header do Card */}
          <div className="flex items-center justify-between pb-5 border-b border-[#1E293B]/70">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Dashboards</h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#0D1424] border border-[#1E293B] text-zinc-300">
                  {dashboards.length} / {maxDashboards === Infinity ? 'Ilimitados' : maxDashboards} ({planLimits.name})
                </span>
                <button 
                  onClick={() => showNotification('Dashboards sincronizados!')}
                  className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md hover:bg-[#1E293B]"
                  title="Sincronizar"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">Gerencie seus dashboards.</p>
            </div>
          </div>

          {/* Lista de Dashboards */}
          <div className="mt-6 space-y-4">
            {dashboards.map((dash) => {
              const isActive = dash.id === activeDashboardId;

              return (
                <div 
                  key={dash.id}
                  className={`bg-[#0D1424] border rounded-lg p-5 relative transition-all ${
                    isActive 
                      ? 'border-[#0066FF] shadow-lg shadow-blue-500/5 ring-1 ring-[#0066FF]/30' 
                      : 'border-[#1E293B] hover:border-[#1E293B]/90'
                  }`}
                >
                  {/* Topo do Card de Dashboard: Nome + Ações */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-semibold text-white text-base sm:text-lg">
                        {dash.name}
                      </h3>
                      {isActive && (
                        <span className="bg-[#0066FF]/15 text-[#5C9BFF] border border-[#0066FF]/40 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      )}
                      {dash.isDefault && (
                        <span className="bg-zinc-800/60 text-zinc-400 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded">
                          Padrão
                        </span>
                      )}
                    </div>

                    {/* Menu Três Pontinhos */}
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === dash.id ? null : dash.id);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1E293B] rounded-md transition-colors cursor-pointer"
                        title="Opções"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === dash.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-0 top-8 w-48 bg-[#141C2E] border border-[#1E293B] rounded-lg shadow-2xl py-1 z-30 text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-100"
                        >
                          {!isActive && (
                            <button
                              onClick={() => handleSetActive(dash)}
                              className="w-full text-left px-3 py-2 text-white hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 text-[#0066FF]" />
                              Definir como Ativo
                            </button>
                          )}
                          <button
                            onClick={() => handleGoToDashboard(dash)}
                            className="w-full text-left px-3 py-2 text-white hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            Acessar Dashboard
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(dash)}
                            className="w-full text-left px-3 py-2 text-white hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDuplicate(dash)}
                            className="w-full text-left px-3 py-2 text-white hover:bg-[#1E293B] flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Duplicar</span>
                            </div>
                            {dashboards.length >= maxDashboards && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-[#5C9BFF] flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                Upgrade
                              </span>
                            )}
                          </button>
                          {!dash.isDefault && (
                            <button
                              onClick={() => handleDelete(dash.id)}
                              className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-[#1E293B] mt-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações / Parâmetros do Dashboard */}
                  <div className="mt-3 space-y-1 text-xs sm:text-sm text-zinc-300">
                    <p>{dash.billingType || 'Faturamento Normal'}</p>
                    <p>{dash.timezone || 'GMT -3 | Brasília'}</p>
                    <p>{dash.currency || 'Real Brasileiro (R$)'}</p>
                    <p>Contabilizar juros: {dash.interest || 'habilitado'}</p>
                    
                    {/* Exibe isolamento de plataforma caso configurado */}
                    {dash.platformType === 'custom' && dash.platforms && dash.platforms.length > 0 && (
                      <p className="text-[#5C9BFF] pt-1">
                        Plataformas isoladas: {dash.platforms.join(', ')}
                      </p>
                    )}

                    {/* Exibe isolamento de produto caso configurado */}
                    {dash.productType === 'custom' && dash.products && (
                      <p className="text-emerald-400">
                        Produto isolado: {dash.products}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão Novo Dashboard */}
          <div className="mt-6 pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenNewModal}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98] ${
                dashboards.length >= maxDashboards
                  ? 'bg-[#182236] hover:bg-[#1E2B45] text-zinc-200 border border-[#0066FF]/40 shadow-blue-500/10'
                  : 'bg-[#0066FF] hover:bg-[#0055D4] text-white shadow-blue-600/20'
              }`}
            >
              {dashboards.length >= maxDashboards ? <Lock className="w-4 h-4 text-[#5C9BFF]" /> : <Plus className="w-4 h-4" />}
              <span>Novo Dashboard</span>
              {dashboards.length >= maxDashboards && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#0066FF]/25 text-[#5C9BFF] ml-1">
                  Upgrade
                </span>
              )}
            </button>
            {dashboards.length >= maxDashboards && isFreePlan && (
              <span className="text-xs text-zinc-400 font-sans">
                O Plano Free inclui 1 dashboard. Faça upgrade para desbloquear mais.
              </span>
            )}
          </div>
        </div>

        {/* Coluna Direita: Integração MCP & Colaboradores (4 Colunas no Desktop) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card: Integração MCP 🔒 */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-white text-base sm:text-lg">Integração MCP</h3>
              <Lock className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Este recurso está disponível somente para usuários com uma assinatura paga.
            </p>
          </div>

          {/* Card: Colaboradores 🔒 */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-white text-base sm:text-lg">Colaboradores</h3>
              <Lock className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Este recurso está disponível somente para usuários com uma assinatura paga.
            </p>
          </div>

        </div>

      </div>

      {/* Modal: Criar / Editar Dashboard */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            
            {/* Fechar modal */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {editingDashboardId ? 'Editar Dashboard' : 'Novo Dashboard'}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Configure as preferências e regras de isolamento para este dashboard.
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveDashboard} className="space-y-4">
              
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nome do Dashboard *
                </label>
                <input 
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Produto X - Isolado, Loja Shopify..."
                  required
                  className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#0066FF] transition-colors"
                />
              </div>

              {/* Faturamento & Fuso Horário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Tipo de Faturamento
                  </label>
                  <select
                    value={formBillingType}
                    onChange={(e) => setFormBillingType(e.target.value)}
                    className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#0066FF] transition-colors"
                  >
                    <option value="Faturamento Normal">Faturamento Normal</option>
                    <option value="Faturamento Líquido">Faturamento Líquido (s/ taxas)</option>
                    <option value="Faturamento Bruto">Faturamento Bruto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Fuso Horário
                  </label>
                  <select
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                    className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#0066FF] transition-colors"
                  >
                    <option value="GMT -3 | Brasília">GMT -3 | Brasília</option>
                    <option value="GMT -4 | Manaus">GMT -4 | Manaus</option>
                    <option value="GMT -5 | Acre">GMT -5 | Acre</option>
                    <option value="GMT 0 | UTC">GMT 0 | UTC</option>
                    <option value="GMT -5 | Nova York (EST)">GMT -5 | Nova York (EST)</option>
                  </select>
                </div>
              </div>

              {/* Moeda & Juros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Moeda
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#0066FF] transition-colors"
                  >
                    <option value="Real Brasileiro (R$)">Real Brasileiro (R$)</option>
                    <option value="Dólar Americano ($)">Dólar Americano ($)</option>
                    <option value="Euro (€)">Euro (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Contabilizar juros
                  </label>
                  <select
                    value={formInterest}
                    onChange={(e) => setFormInterest(e.target.value)}
                    className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#0066FF] transition-colors"
                  >
                    <option value="habilitado">Habilitado</option>
                    <option value="desabilitado">Desabilitado</option>
                  </select>
                </div>
              </div>

              {/* Isolamento de Plataforma */}
              <div className="pt-2 border-t border-[#1E293B]">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Isolamento de Plataforma
                </label>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="platformType" 
                      checked={formPlatformType === 'all'} 
                      onChange={() => setFormPlatformType('all')}
                      className="text-[#0066FF] focus:ring-0"
                    />
                    Todas as plataformas
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="platformType" 
                      checked={formPlatformType === 'custom'} 
                      onChange={() => setFormPlatformType('custom')}
                      className="text-[#0066FF] focus:ring-0"
                    />
                    Plataformas específicas
                  </label>
                </div>

                {formPlatformType === 'custom' && (
                  <div className="bg-[#0D1424] border border-[#1E293B] p-3 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                    {PLATFORMS_LIST.map(plat => {
                      const selected = formSelectedPlatforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => handleTogglePlatform(plat)}
                          className={`text-xs px-2.5 py-1.5 rounded-md border text-left flex items-center justify-between transition-colors cursor-pointer ${
                            selected 
                              ? 'bg-[#0066FF]/20 border-[#0066FF] text-white font-medium' 
                              : 'bg-[#141C2E] border-[#1E293B] text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{plat}</span>
                          {selected && <Check className="w-3 h-3 text-[#0066FF] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Isolamento de Produto */}
              <div className="pt-2 border-t border-[#1E293B]">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Isolamento de Produto (Produto X)
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="productType" 
                      checked={formProductType === 'all'} 
                      onChange={() => setFormProductType('all')}
                      className="text-[#0066FF] focus:ring-0"
                    />
                    Todos os produtos
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="productType" 
                      checked={formProductType === 'custom'} 
                      onChange={() => setFormProductType('custom')}
                      className="text-[#0066FF] focus:ring-0"
                    />
                    Produto isolado
                  </label>
                </div>

                {formProductType === 'custom' && (
                  <div>
                    <input 
                      type="text"
                      value={formProducts}
                      onChange={(e) => setFormProducts(e.target.value)}
                      placeholder="Digite o nome do produto exato (Ex: Curso X)"
                      className="w-full bg-[#0D1424] border border-[#1E293B] rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#0066FF] transition-colors"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Apenas vendas correspondentes a este produto aparecerão neste dashboard.
                    </p>
                  </div>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#1E293B] text-zinc-300 hover:text-white hover:bg-[#1E293B] text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0055D4] text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
                >
                  {editingDashboardId ? 'Salvar Alterações' : 'Criar Dashboard'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Upgrade de Dashboards */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsUpgradeModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#5C9BFF] flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#5C9BFF] font-bold">
                  Limite de Dashboards
                </span>
                <h3 className="text-lg font-bold text-white">
                  Desbloqueie Múltiplos Dashboards
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-5">
              {upgradeModalReason || 'O Plano Free permite apenas 1 dashboard (a Principal já inclusa). Para criar e gerenciar múltiplos dashboards independentes, faça o upgrade para o Plano Pro ou Scale.'}
            </p>

            <div className="space-y-2.5 mb-6">
              <div className="p-3 bg-[#0D1424] rounded-xl border border-[#1E293B] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white">Plano Free</span>
                  <p className="text-[11px] text-zinc-400">1 dashboard padrão incluso</p>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 font-bold">1 Dashboard</span>
              </div>
              <div className="p-3 bg-[#0D1424] rounded-xl border border-blue-500/30 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">Plano Pro</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-[#5C9BFF]">R$ 97/mês</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Até 5 dashboards + 5 contas + 5 pixels</p>
                </div>
                <span className="text-[11px] font-mono text-[#5C9BFF] font-bold">5 Dashboards</span>
              </div>
              <div className="p-3 bg-[#0D1424] rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">Plano Scale</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">R$ 247/mês</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">Dashboards, contas e pixels ilimitados</p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">Ilimitados</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  navigate('/planos');
                }}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Fazer Upgrade Agora</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0D1424] hover:bg-[#182236] text-zinc-400 hover:text-white border border-[#1E293B] text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
