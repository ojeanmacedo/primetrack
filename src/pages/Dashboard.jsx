import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getTrialStatus, isMasterAdmin } from '../utils/auth';
import { 
  Flame, 
  RotateCw, 
  Download, 
  Eye, 
  Edit3, 
  Palette, 
  ChevronDown, 
  AlertTriangle, 
  AlertCircle,
  ArrowRight, 
  TrendingUp, 
  Percent, 
  CheckCircle2, 
  Clock,
  Key
} from 'lucide-react';

export default function Dashboard({ onSimulateSale }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = isMasterAdmin(user);
  const trialStatus = getTrialStatus(user);
  const [period, setPeriod] = useState('Hoje');

  const isDisconnected = typeof window !== 'undefined' && localStorage.getItem('primetrack_meta_disconnected') === 'true';

  const [adAccountsList, setAdAccountsList] = useState(() => {
    if (isDisconnected) return [];
    const saved = typeof window !== 'undefined' ? localStorage.getItem('primetrack_ad_accounts') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(a => a.sync === true);
        }
      } catch (e) {}
    }
    return [];
  });

  const [accountFilter, setAccountFilter] = useState('Todas');

  const [campaigns, setCampaigns] = useState([]);

  const [syncing, setSyncing] = useState(false);

  const loadDashboardData = async () => {
    if (localStorage.getItem('primetrack_meta_disconnected') === 'true') {
      setCampaigns([]);
      setAdAccountsList([]);
      return;
    }

    const saved = typeof window !== 'undefined' ? localStorage.getItem('primetrack_ad_accounts') : null;
    let localSyncMap = {};
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            if (p.id) localSyncMap[p.id] = p.sync;
          });
          const activeList = parsed.filter(a => a.sync === true);
          setAdAccountsList(activeList);
        }
      } catch (e) {}
    }

    try {
      const r = await fetch('/api/meta/status');
      const data = await r.json();
      if (data.connections && data.connections.length === 0) {
        if (!isAdmin) {
          setCampaigns([]);
          setAdAccountsList([]);
        }
      } else if (data.adAccounts && data.adAccounts.length > 0) {
        const mappedAccs = data.adAccounts
          .map(a => {
            const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
            return {
              name: a.name || 'Conta',
              id: accId,
              bm: a.businessName || 'BM Principal',
              currency: a.currency === 'USD' ? 'USD (→ BRL @ 5,12)' : 'BRL',
              status: a.status === 'ACTIVE' ? 'Ativa' : 'Desativada',
              balance: a.balance || '0,00',
              amountSpent: a.amountSpent || '0,00',
              sync: localSyncMap[accId] === true
            };
          })
          .filter(a => a.sync === true); // Apenas contas ativadas em Integrações
        setAdAccountsList(mappedAccs);
      }
    } catch (err) {
      console.log('Erro ao carregar contas no dashboard:', err);
    }

    try {
      const cr = await fetch('/api/campaigns');
      const cData = await cr.json();
      if (Array.isArray(cData)) {
        setCampaigns(cData);
      }
    } catch (err) {
      console.log('Fetch campaigns error:', err);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      const periodToPreset = {
        'Hoje': 'today',
        'Ontem': 'yesterday',
        '7 dias': 'last_7d',
        '15 dias': 'last_14d',
        '30 dias': 'last_30d',
        'Personalizado': 'maximum'
      };
      await fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datePreset: periodToPreset[period] || 'today' })
      });
      await loadDashboardData();
    } catch (err) {
      console.error('Erro ao sincronizar dados com Meta:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleProfileSync = () => {
      loadDashboardData();
    };

    window.addEventListener('primetrack_profile_sync', handleProfileSync);
    return () => window.removeEventListener('primetrack_profile_sync', handleProfileSync);
  }, []);

  const periods = ['Hoje', 'Ontem', '7 dias', '15 dias', '30 dias', 'Personalizado'];

  const emptyHourly = [
    { h: '00h', v: 0 }, { h: '01h', v: 0 }, { h: '02h', v: 0 }, { h: '03h', v: 0 },
    { h: '04h', v: 0 }, { h: '05h', v: 0 }, { h: '06h', v: 0 }, { h: '07h', v: 0 },
    { h: '08h', v: 0 }, { h: '09h', v: 0 }, { h: '10h', v: 0 }, { h: '11h', v: 0 },
    { h: '12h', v: 0 }, { h: '13h', v: 0 }, { h: '14h', v: 0 }, { h: '15h', v: 0 },
    { h: '16h', v: 0 }, { h: '17h', v: 0 }, { h: '18h', v: 0 }, { h: '19h', v: 0 },
    { h: '20h', v: 0 }, { h: '21h', v: 0 }, { h: '22h', v: 0 }, { h: '23h', v: 0 }
  ];

  const emptyMetrics = {
    spend: 0.00,
    revenue: 0.00,
    profit: 0.00,
    sales: 0,
    pendingSales: 0,
    pendingValue: 0.00,
    roas: '0.00',
    cpa: '0.00',
    arpu: '0.00',
    margin: '0.0%',
    clicks: 0,
    visits: 0,
    ics: 0,
    initSales: 0,
    approvedSales: 0,
    pixApproval: '0.0%',
    pixSales: 0,
    sources: { fb: 0, ig: 0 },
    hourly: emptyHourly
  };

  const activeAdAccount = adAccountsList.length > 0 ? adAccountsList[0] : null;
  const isNoAccountActive = adAccountsList.length === 0;
  const isProfileDisconnected = (!isAdmin && adAccountsList.length === 0) || 
                                (typeof window !== 'undefined' && localStorage.getItem('primetrack_meta_disconnected') === 'true') || 
                                isNoAccountActive;

  // Filtra as campanhas baseado na conta selecionada e se está ativa
  const filteredCampaigns = campaigns.filter(c => {
    const cAdId = String(c.adAccountId || '').replace('act_', '');
    if (accountFilter !== 'Todas') {
      const selectedAcc = adAccountsList.find(a => a.name === accountFilter || a.id === accountFilter);
      if (selectedAcc) {
        return cAdId === String(selectedAcc.id);
      }
      return c.accountName === accountFilter || cAdId === accountFilter;
    }
    // Se selecionou 'Todas', filtra pelas contas que estão com sincronização ativa em Integrações
    if (adAccountsList.length > 0) {
      return adAccountsList.some(acc => cAdId === String(acc.id));
    }
    return false;
  });

  // Agregação dos dados reais da conta e campanhas
  const realSpend = filteredCampaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const realSales = filteredCampaigns.reduce((acc, c) => acc + Number(c.sales || 0), 0);
  const realRevenue = filteredCampaigns.reduce((acc, c) => acc + Number(c.revenue || 0), 0);
  const realProfit = realRevenue - realSpend;
  const realRoas = realSpend > 0 ? (realRevenue / realSpend).toFixed(2) : '0.00';
  const realCpa = realSales > 0 ? (realSpend / realSales).toFixed(2) : '0.00';
  const realArpu = realSales > 0 ? (realRevenue / realSales).toFixed(2) : '0.00';
  const realMargin = realRevenue > 0 ? `${((realProfit / realRevenue) * 100).toFixed(1)}%` : '0.0%';
  const realClicks = filteredCampaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);
  const realVisits = filteredCampaigns.reduce((acc, c) => acc + Number(c.visits || c.clicks || 0), 0);

  // Se houver dados reais de campanhas ativas, usa eles; senão faz fallback para a tabela de período
  const currentMetrics = isProfileDisconnected
    ? emptyMetrics 
    : {
        spend: realSpend,
        revenue: realRevenue,
        profit: realProfit,
        sales: realSales,
        pendingSales: Math.round(realSales * 0.7),
        pendingValue: Number((realRevenue * 0.7).toFixed(2)),
        roas: realRoas,
        cpa: realCpa,
        arpu: realArpu,
        margin: realMargin,
        clicks: realClicks,
        visits: realVisits,
        ics: Math.round(realVisits * 0.6),
        initSales: Math.round(realSales * 1.5),
        approvedSales: realSales,
        pixApproval: realSales > 0 ? '100.0%' : '0.0%',
        pixSales: realSales,
        sources: { fb: realSales, ig: 0 },
        hourly: emptyHourly
      };

  return (
    <div className="space-y-5 pb-16">

      {/* Alerta de Nenhuma Conta Ativa */}
      {isNoAccountActive && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Nenhuma conta de anúncio ativa no momento.</span>
              <span className="text-zinc-400 ml-1.5">No Plano Free (7 dias), você pode ativar 1 conta de anúncio simultaneamente para carregar métricas e campanhas.</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/integracoes')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Ativar Conta em Integrações
          </button>
        </div>
      )}

      {/* Alerta de Perfil Desconectado para novos clientes */}
      {!isAdmin && adAccountsList.length === 0 && (
        <div className="p-4 rounded-2xl bg-[#1A6DFF]/10 border border-[#1A6DFF]/30 text-[#5C9BFF] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-brand shrink-0" />
            <div>
              <span className="font-bold text-white">Nenhum perfil do Facebook conectado ainda.</span>
              <span className="text-zinc-400 ml-1.5">Conecte seu perfil em Integrações para puxar suas contas e ativar sua conta gratuita.</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/integracoes')}
            className="px-3.5 py-1.5 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-md shadow-blue-500/20"
          >
            Conectar Facebook
          </button>
        </div>
      )}
      
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dashboard Principal
          </h1>
          {activeAdAccount && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 text-[#5C9BFF] text-[11px] font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Conta Ativa: {activeAdAccount.name}</span>
            </span>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter Pills */}
          <div className="flex items-center bg-[#0A1426] border border-[#13233E] rounded-xl p-1 text-xs">
            {periods.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  period === p
                    ? 'bg-[#12223D] text-[#5C9BFF] font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Account Dropdown igual ao de Campanhas */}
          <div className="flex items-center gap-1.5 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Conta:</span>
            <select
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="Todas" className="bg-[#0A1426] text-white">Todas as Contas ({adAccountsList.length})</option>
              {adAccountsList.map(acc => (
                <option key={acc.id} value={acc.name} className="bg-[#0A1426] text-white">
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <button 
            onClick={handleRefresh}
            disabled={syncing}
            className={`px-3 py-1.5 rounded-xl bg-[#0A1426] hover:bg-[#12223D] border border-[#13233E] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              syncing ? 'opacity-70 cursor-wait' : ''
            }`}
            title="Sincronizar dados em tempo real com Facebook e Plataformas"
          >
            <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#5C9BFF]' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Atualizar'}</span>
          </button>

          <div className="flex items-center gap-1 bg-[#0A1426] border border-[#13233E] p-1 rounded-xl text-zinc-400">
            <button className="p-1 hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
            <button className="p-1 hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button>
            <button className="p-1 hover:text-white"><Palette className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Aviso de Primeiro Cadastro via Google: Cadastrar Senha */}
      {typeof window !== 'undefined' && localStorage.getItem('primetrack_needs_password_setup') === 'true' && (
        <div className="bg-gradient-to-r from-blue-950/80 via-[#0A1D3A] to-blue-900/40 border border-[#2558C7]/60 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A6DFF]/20 text-[#5C9BFF] flex items-center justify-center shrink-0 mt-0.5 border border-[#1A6DFF]/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Cadastre sua senha de acesso
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Importante
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed max-w-2xl">
                Você se cadastrou com sua conta do Google ({user?.email}). Para conseguir fazer login em outros navegadores ou no app mobile digitando e-mail e senha, cadastre sua senha em <strong className="text-white">Integrações &gt; Baixe nosso App</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/integracoes?tab=app')}
            className="px-4 py-2.5 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs shrink-0 flex items-center gap-2 shadow-lg shadow-brand/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Cadastrar Senha Agora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Aviso de Perfil Desconectado */}
      {isProfileDisconnected && (
        <div className="bg-[#0A1426] border border-dashed border-[#13233E] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#070D1A] border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold text-xs sm:text-sm">Nenhum perfil de anúncios conectado</div>
              <p className="text-zinc-400 text-xs mt-0.5">
                O perfil do Facebook Ads foi desconectado e as campanhas foram desvinculadas. Conecte sua conta em Integrações para carregar suas métricas em tempo real.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/integracoes')}
            className="px-4 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white text-xs font-bold shrink-0 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>Conectar em Integrações</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Red Alert Banner - Somente exibido se o período de 7 dias grátis expirar */}
      {trialStatus.showExpiredBanner && (
        <div className="w-full bg-[#E52222] text-white px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl border border-red-400/30 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 fill-current shrink-0 text-white" />
            <span>
              Seu plano expirou! Você tem <strong>2 dias</strong> para renovar antes dos serviços serem pausados.
            </span>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/planos')}
            className="px-4 py-1.5 rounded-xl bg-white text-[#E52222] hover:bg-zinc-100 text-xs font-bold shrink-0 transition-all shadow-md self-start sm:self-auto cursor-pointer"
          >
            Renovar agora →
          </button>
        </div>
      )}

      {/* KPI Row 1: Faturamento, Lucro, Gasto, CPA, ARPU, ROAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Faturamento */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">FATURAMENTO</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.revenue.toFixed(2)}
          </div>
        </div>

        {/* Lucro */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">LUCRO</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5C9BFF] mt-1">
            R$ {currentMetrics.profit.toFixed(2)}
          </div>
          <div className="mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
              ↑ Positivo
            </span>
          </div>
        </div>

        {/* Gasto em Ads */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">GASTO EM ADS</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.spend.toFixed(2)}
          </div>
        </div>

        {/* CPA */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">CPA</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.cpa}
          </div>
        </div>

        {/* ARPU */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">ARPU</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            R$ {currentMetrics.arpu}
          </div>
        </div>

        {/* ROAS */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">ROAS</div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#5C9BFF] mt-1">
            {currentMetrics.roas}x
          </div>
          <div className="mt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
              ↑ Ok
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row 2: Vendas Aprovadas, Vendas Pendentes, Chargeback, Margem */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Vendas Aprovadas */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">VENDAS APROVADAS</div>
          <div className="text-2xl font-extrabold text-white mt-1">{currentMetrics.sales}</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">R$ {currentMetrics.revenue.toFixed(2)}</div>
        </div>

        {/* Vendas Pendentes */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">VENDAS PENDENTES</div>
          <div className="text-2xl font-extrabold text-white mt-1">R$ {currentMetrics.pendingValue.toFixed(2)}</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{currentMetrics.pendingSales} vendas</div>
        </div>

        {/* Chargeback */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">CHARGEBACK</div>
          <div className="text-2xl font-extrabold text-white mt-1">0%</div>
          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">0 vendas</div>
        </div>

        {/* Margem */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">MARGEM</div>
          <div className="text-2xl font-extrabold text-[#5C9BFF] mt-1">{currentMetrics.margin}</div>
          <div className="mt-0.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
              ↑ Positivo
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Saldo das Contas + Funil de Conversão Meta Ads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Saldo das Contas (4 cols) */}
        <div className="lg:col-span-4 bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-white mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Saldo das Contas</span>
            </div>

            <div className="space-y-4 text-xs">
              {adAccountsList.filter(a => a.sync).length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs">
                  Nenhuma conta ativa no momento.
                </div>
              ) : (
                adAccountsList
                  .filter(a => a.sync)
                  .map((acc, idx, arr) => (
                    <div 
                      key={acc.id || idx} 
                      className={`flex items-center justify-between ${idx !== arr.length - 1 ? 'pb-3 border-b border-[#13233E]' : ''}`}
                    >
                      <div>
                        <div className="font-bold text-white">{acc.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{acc.id}</div>
                      </div>
                      <div className="font-mono font-bold text-emerald-400">
                        {acc.currency === 'USD' || (acc.currency && acc.currency.includes('USD')) ? '$' : 'R$'} {acc.balance || '0,00'}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Funil de Conversão (8 cols) */}
        <div className="lg:col-span-8 bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
          <div className="text-xs font-bold text-white mb-6">
            Funil de Conversão (Meta Ads) — {period}
          </div>

          <div className="grid grid-cols-5 gap-2 text-center relative items-center">
            
            {/* Stage 1: Cliques */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white">
                100%
              </div>
              <div className="mt-2 text-sm font-bold text-white">{currentMetrics.clicks}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">CLIQUES</div>
            </div>

            {/* Stage 2: Vis. Página */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                {((currentMetrics.visits / currentMetrics.clicks) * 100).toFixed(1)}%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">
                  -{(100 - (currentMetrics.visits / currentMetrics.clicks) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">{currentMetrics.visits}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VIS. PÁGINA</div>
            </div>

            {/* Stage 3: ICS */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#1A6DFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                {((currentMetrics.ics / currentMetrics.clicks) * 100).toFixed(1)}%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">
                  -{(((currentMetrics.visits - currentMetrics.ics) / currentMetrics.visits) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">{currentMetrics.ics}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">ICS</div>
            </div>

            {/* Stage 4: Vendas Inic. */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#5C9BFF] bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-white relative">
                {((currentMetrics.initSales / currentMetrics.clicks) * 100).toFixed(1)}%
                <span className="absolute -bottom-3 text-[9px] text-red-400 font-mono">
                  -{(((currentMetrics.ics - currentMetrics.initSales) / currentMetrics.ics) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-4 text-sm font-bold text-white">{currentMetrics.initSales}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VENDAS INIC.</div>
            </div>

            {/* Stage 5: Vendas Apr. */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full border-2 border-emerald-400 bg-[#12223D] flex items-center justify-center text-xs font-extrabold text-emerald-400">
                {((currentMetrics.approvedSales / currentMetrics.clicks) * 100).toFixed(1)}%
              </div>
              <div className="mt-4 text-sm font-bold text-emerald-400">{currentMetrics.approvedSales}</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase">VENDAS APR.</div>
            </div>

          </div>
        </div>

      </div>

      {/* Row 4: Taxa de Aprovação + Vendas por Pagamento + Vendas por Fonte */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Taxa de Aprovação */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
          <div className="text-xs font-bold text-white mb-4">Taxa de Aprovação</div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-zinc-300">Pix</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-t-brand border-r-brand border-b-transparent border-l-transparent animate-spin-slow flex items-center justify-center" />
              <span className="text-xs font-bold text-white font-mono">{currentMetrics.pixApproval}</span>
            </div>
          </div>
        </div>

        {/* Vendas por Pagamento */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white mb-3">Vendas por Pagamento</div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <span>Pix: {currentMetrics.pixSales}</span>
            </div>
          </div>

          <div className="w-20 h-20 rounded-full border-4 border-brand bg-[#070D1A] flex flex-col items-center justify-center font-mono">
            <span className="text-[9px] text-zinc-400">TOTAL</span>
            <span className="text-lg font-bold text-white">{currentMetrics.sales}</span>
          </div>
        </div>
        {/* Vendas por Fonte */}
        <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
          <div className="text-xs font-bold text-white mb-3">Vendas por Fonte</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Facebook</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white">{currentMetrics.sources.fb}</span>
                <span className="text-zinc-400 text-[11px]">
                  ({currentMetrics.sales > 0 ? Math.round((currentMetrics.sources.fb / currentMetrics.sales) * 100) : 0}%)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Instagram</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-white">{currentMetrics.sources.ig}</span>
                <span className="text-zinc-400 text-[11px]">
                  ({currentMetrics.sales > 0 ? Math.round((currentMetrics.sources.ig / currentMetrics.sales) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 5: Vendas por Produto + Taxas Plataforma + Impostos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        
        {/* Vendas por Produto */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-white">VENDAS POR PRODUTO</span>
            <span className="text-[10px] font-mono text-zinc-400">
              {currentMetrics.sales > 0 ? '3 produtos' : '0 produtos'}
            </span>
          </div>

          {currentMetrics.sales === 0 ? (
            <div className="py-6 text-center text-zinc-500 text-xs">
              Nenhum produto vendido no período
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
                <span className="text-zinc-300 truncate max-w-[140px]">Privacy Mc Mirella</span>
                <span className="font-mono font-bold text-white">{Math.round(currentMetrics.sales * 0.86)}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
                <span className="text-zinc-300 truncate max-w-[140px]">ACESSO AO GRUPO MIRELLA</span>
                <span className="font-mono font-bold text-white">{Math.max(1, Math.round(currentMetrics.sales * 0.07))}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#13233E]/50">
                <span className="text-zinc-300 truncate max-w-[140px]">Vip Exclusivo Mirella</span>
                <span className="font-mono font-bold text-white">{Math.max(1, Math.round(currentMetrics.sales * 0.07))}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold">
                <span className="text-zinc-400">Total</span>
                <span className="font-mono text-white">{currentMetrics.sales}</span>
              </div>
            </div>
          )}
        </div>

        {/* Taxas Plataforma */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">TAXAS PLATAFORMA</div>
            <div className="text-xl font-bold text-amber-400 mt-2">R$ 0,00</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">Pix/Boleto: —</div>
        </div>

        {/* Impostos da Empresa */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">IMPOSTOS DA EMPRESA</div>
            <div className="text-xl font-bold text-amber-400 mt-2">R$ 0,00</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">Não configurado</div>
        </div>

        {/* Imposto Meta Ads */}
        <div className="bg-[#0A1426] border border-[#13233E] p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">IMPOSTO META ADS</div>
            <div className="text-xl font-bold text-amber-400 mt-2">R$ 0,00</div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">Não configurado</div>
        </div>

      </div>

      {/* Row 6: Vendas por Horário */}
      <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
        <div className="text-xs font-bold text-white mb-6">Vendas por Horário — {period}</div>
        
        {/* Hourly distribution bars matching the period */}
        <div className="flex items-end gap-1.5 h-36 pt-4 border-b border-[#13233E]">
          {currentMetrics.hourly.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="text-[9px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.v}
              </div>
              <div 
                className="w-full bg-[#1A6DFF] hover:bg-[#5C9BFF] rounded-t transition-all"
                style={{ height: `${item.v}%` }}
              />
              <span className="text-[9px] font-mono text-zinc-400">{item.h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 7: Vendas por Localização */}
      <div className="bg-[#0A1426] border border-[#13233E] p-5 rounded-2xl">
        <div className="flex items-center justify-between text-xs mb-4">
          <span className="font-bold text-white">Vendas por Localização</span>
          <span className="text-[11px] font-mono text-[#5C9BFF]">
            {currentMetrics.sales > 0 ? 'São Paulo lidera - 6 vendas' : 'Aguardando primeiras vendas'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* World map abstraction */}
          <div className="lg:col-span-6 bg-[#070D1A] rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center min-h-[220px]">
            <span className="text-[10px] font-mono text-zinc-400 mb-4 self-start">● MUNDO</span>
            <div className="w-full text-center text-zinc-600 font-mono text-xs">
              <div className="text-3xl mb-2">🌎</div>
              <span className="text-zinc-400">
                {currentMetrics.sales > 0 ? 'Brasil: 100% das vendas aprovadas' : 'Sem vendas no período'}
              </span>
            </div>
          </div>

          {/* Brazil states distribution */}
          <div className="lg:col-span-6 space-y-3 font-mono text-xs">
            <span className="text-[10px] text-zinc-400 mb-2 block">■ BRASIL</span>

            {currentMetrics.sales === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                Nenhum dado geográfico registrado ainda
              </div>
            ) : (
              [
                { state: 'São Paulo', sales: 6, pct: 100 },
                { state: 'Minas Gerais', sales: 3, pct: 50 },
                { state: 'Goiás', sales: 2, pct: 33 },
                { state: 'Pernambuco', sales: 1, pct: 16 },
                { state: 'Santa Catarina', sales: 1, pct: 16 }
              ].map((st, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="text-zinc-300 w-28">{st.state}</span>
                  <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-[#2B66E3] h-full rounded-full" style={{ width: `${st.pct}%` }} />
                  </div>
                  <span className="text-white font-bold w-6 text-right">{st.sales}</span>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

    </div>
  );
}


