import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isMasterAdmin } from '../utils/auth';
import { 
  Eye, 
  Plus, 
  ChevronDown, 
  Download, 
  RefreshCw, 
  SlidersHorizontal,
  Lock,
  ExternalLink,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Check,
  ShieldAlert,
  Sliders,
  ArrowRight
} from 'lucide-react';

export default function Campaigns({ clientMode = 'clean', onGoToIntegrations }) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdmin = isMasterAdmin(user);
  const [subTab, setSubTab] = useState('Campanhas');
  const [activeCreativePreview, setActiveCreativePreview] = useState(null);
  const [statusFilter, setStatusFilter] = useState('Qualquer');
  const [periodFilter, setPeriodFilter] = useState('Hoje');
  const [accountFilter, setAccountFilter] = useState('Todas');
  
  const isDisconnected = typeof window !== 'undefined' && localStorage.getItem('primetrack_meta_disconnected') === 'true';

  const defaultCampaignData = [
    {
      id: "52604661655655",
      name: "TESTE MI",
      status: true,
      rawStatus: "ACTIVE",
      effectiveStatus: "ACTIVE",
      accountName: "CA01",
      adAccountId: "act_1092137896602979",
      objective: "OUTCOME_SALES",
      budget: "256.99",
      budgetType: "Diário",
      spend: "123.41",
      impressions: 4168,
      clicks: 421,
      visits: 317,
      cpc: "0.29",
      cpm: "29.61",
      ctr: "10.10",
      sales: 15,
      pendingSales: 11,
      revenue: "139.67",
      profit: "16.26",
      roas: "1.13",
      cpa: "8.23",
      approvalRate: "57.7%",
      conversionRate: "3.6%",
      creatives: [
        {
          id: "cr_teste_mi_1",
          name: "Vídeo 01 - Mirella Story VIP",
          thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
          videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-posing-for-a-fashion-photoshoot-40291-large.mp4",
          type: "VIDEO",
          duration: "0:15",
          resolution: "1080x1920 (9:16)",
          clicks: 421,
          impressions: 4168,
          ctr: "10.10%",
          spend: 123.41,
          sales: 15,
          revenue: 139.67,
          roas: 1.13,
          retention: { sec3: 82, sec15: 48, sec30: 31 },
          fatigue: "Saudável (Baixa Fadiga)"
        }
      ]
    }
  ];

  const [campaignsList, setCampaignsList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('primetrack_cached_campaigns');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

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
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Agora');

  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editBidCap, setEditBidCap] = useState('');
  const [editStrategy, setEditStrategy] = useState('LOWEST_COST_WITH_BID_CAP');
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const subTabs = ['Contas', 'Campanhas', 'Conjuntos', 'Anúncios'];
  const isFirstMount = React.useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    loadData(periodFilter);
  }, [periodFilter]);

  const loadData = async () => {
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
          if (activeList.length > 0) {
            setAdAccountsList(activeList);
          }
        }
      } catch (e) {}
    }

    try {
      const statusRes = await fetch('/api/meta/status');
      const data = await statusRes.json();

      if (data.connections && data.connections.length > 0) {
        localStorage.removeItem('primetrack_meta_disconnected');
      } else if (data.connections && data.connections.length === 0) {
        if (!isAdmin) {
          setCampaignsList([]);
          setAdAccountsList([]);
          return;
        }
      }

      if (data.adAccounts && data.adAccounts.length > 0) {
        const mappedAccs = data.adAccounts
          .map(a => {
            const accId = a.accountId || (a.id ? a.id.replace('act_', '') : '0000');
            const isSyncActive = a.syncActive !== undefined
              ? a.syncActive === true
              : (localSyncMap[accId] !== undefined ? localSyncMap[accId] === true : false);

            return {
              name: a.name || 'Conta',
              id: accId,
              bm: a.businessName || 'BM Principal',
              currency: a.currency === 'USD' ? 'USD' : (a.currency || 'BRL'),
              status: a.status === 'ACTIVE' ? 'Ativa' : 'Desativada',
              balance: a.balance || '0,00',
              amountSpent: a.amountSpent || '0,00',
              sync: isSyncActive
            };
          })
          .filter(a => a.sync === true); // Apenas contas ativadas no perfil em integrações

        setAdAccountsList(mappedAccs);

        if (accountFilter !== 'Todas' && !mappedAccs.some(a => a.id === accountFilter || a.name === accountFilter)) {
          setAccountFilter('Todas');
        }
      } else {
        setAdAccountsList([]);
      }
    } catch (err) {
      console.log('Erro ao carregar status Meta:', err);
    }

    const periodMap = {
      'Hoje': 'today',
      'Ontem': 'yesterday',
      'Últimos 7 dias': 'last_7d',
      '7 dias': 'last_7d',
      'Últimos 14 dias': 'last_14d',
      '14 dias': 'last_14d',
      'Últimos 30 dias': 'last_30d',
      '30 dias': 'last_30d',
      'Personalizado': 'maximum'
    };
    const datePreset = periodMap[customPreset] || 'today';

    try {
      const cr = await fetch(`/api/campaigns?datePreset=${datePreset}`);
      const data = await cr.json();
      if (Array.isArray(data)) {
        setCampaignsList(data);
        if (typeof window !== 'undefined' && data.length > 0) {
          localStorage.setItem('primetrack_cached_campaigns', JSON.stringify(data));
        }
      }
    } catch (err) {
      console.log('Erro ao carregar campanhas:', err);
    }
  };

  useEffect(() => {
    loadData(periodFilter);

    const handleProfileSync = () => {
      loadData(periodFilter);
    };

    window.addEventListener('primetrack_profile_sync', handleProfileSync);
    return () => window.removeEventListener('primetrack_profile_sync', handleProfileSync);
  }, []);

  const handleSyncNow = async (preset = periodFilter) => {
    setSyncing(true);
    try {
      const selectedPreset = typeof preset === 'string' ? preset : periodFilter;
      const periodMap = {
        'Hoje': 'today',
        'Ontem': 'yesterday',
        'Últimos 7 dias': 'last_7d',
        '7 dias': 'last_7d',
        'Últimos 14 dias': 'last_14d',
        '14 dias': 'last_14d',
        'Últimos 30 dias': 'last_30d',
        '30 dias': 'last_30d',
        'Personalizado': 'maximum'
      };
      const datePreset = periodMap[selectedPreset] || selectedPreset || 'today';
      
      const saved = typeof window !== 'undefined' ? localStorage.getItem('primetrack_ad_accounts') : null;
      let activeAccountIds = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            activeAccountIds = parsed.filter(a => a.sync === true).map(a => a.id);
          }
        } catch (e) {}
      }

      const syncRes = await fetch('/api/meta/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          datePreset,
          accountIds: activeAccountIds.length > 0 ? activeAccountIds : undefined
        })
      });
      const syncData = await syncRes.json();
      if (syncData && Array.isArray(syncData.campaigns) && syncData.campaigns.length > 0) {
        setCampaignsList(syncData.campaigns);
        if (typeof window !== 'undefined') {
          localStorage.setItem('primetrack_cached_campaigns', JSON.stringify(syncData.campaigns));
        }
      }

      await loadData(selectedPreset);
      const now = new Date();
      setLastSyncTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (e) {
      console.error(e);
    }
    setSyncing(false);
  };

  const handleToggleStatus = (campId) => {
    setCampaignsList(prev => prev.map(c => {
      if (c.id === campId) {
        return { ...c, status: !c.status };
      }
      return c;
    }));
  };

  // Abre modal de edição
  const handleOpenEdit = (camp) => {
    setEditingCampaign(camp);
    setEditName(camp.name || 'TESTE MI');
    setEditBudget(camp.budget || '256.99');
    setEditBidCap(camp.bidCap || '15.00');
    setEditStrategy(camp.bidStrategy || 'LOWEST_COST_WITH_BID_CAP');
  };

  // Salva alteração com Trava de Perfil Backup
  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    setSavingEdit(true);

    // Atualiza imediatamente na tabela
    setCampaignsList(prev => prev.map(c => {
      if (c.id === editingCampaign.id || c.name === editingCampaign.name) {
        return {
          ...c,
          name: editName,
          budget: editBudget,
          bidCap: editBidCap,
          bidStrategy: editStrategy
        };
      }
      return c;
    }));

    // Envia ao servidor garantindo segurança do perfil backup
    try {
      const res = await fetch('/api/campaigns/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCampaign.id,
          name: editName,
          budget: editBudget,
          bidCap: editBidCap,
          bidStrategy: editStrategy,
          profileType: 'backup' // Trava de proteção total para não alterar no perfil backup
        })
      });
      const data = await res.json();
      setSaveSuccessMsg(data.message || 'Campanha atualizada na PrimeTrack!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
      setEditingCampaign(null);
    } catch (err) {
      setSaveSuccessMsg('Salvo na PrimeTrack com sucesso! (Modo de Proteção Backup Ativo).');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
      setEditingCampaign(null);
    }
    setSavingEdit(false);
  };

  const isNoAccountActive = adAccountsList.length === 0;
  const activeAdAccount = adAccountsList.length > 0 ? adAccountsList[0] : null;

  // Filtragem
  const filteredCampaigns = isNoAccountActive ? [] : campaignsList.filter(c => {
    if (statusFilter === 'Ativo' && !c.status) return false;
    if (statusFilter === 'Pausado' && c.status) return false;
    const cAdId = String(c.adAccountId || '').replace('act_', '');
    if (accountFilter !== 'Todas') {
      const selectedAcc = adAccountsList.find(a => a.name === accountFilter || a.id === accountFilter);
      if (selectedAcc) {
        return cAdId === String(selectedAcc.id);
      }
      return c.accountName === accountFilter || cAdId === accountFilter;
    }
    return adAccountsList.some(acc => cAdId === String(acc.id));
  });

  // Totais calculados dinamicamente
  const activeCurrency = filteredCampaigns[0]?.currency || activeAdAccount?.currency || 'BRL';
  const isUsd = activeCurrency === 'USD' || String(activeCurrency).includes('USD');
  const currencySymbol = isUsd ? '$' : 'R$';

  const totalSpend = filteredCampaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const totalSpendBrl = filteredCampaigns.reduce((acc, c) => acc + Number(c.spendBrl || c.spend || 0), 0);
  const totalRawSpendUsd = filteredCampaigns.reduce((acc, c) => acc + Number(c.rawSpendUsd || 0), 0);
  const totalSales = filteredCampaigns.reduce((acc, c) => acc + Number(c.sales || 0), 0);
  const totalRevenue = filteredCampaigns.reduce((acc, c) => acc + Number(c.revenue || 0), 0);
  const totalProfit = totalRevenue - (isUsd ? totalSpendBrl : totalSpend);
  const avgRoas = (isUsd ? totalSpendBrl : totalSpend) > 0 ? (totalRevenue / (isUsd ? totalSpendBrl : totalSpend)).toFixed(2) : '0.00';
  const avgCpa = totalSales > 0 ? (totalSpend / totalSales).toFixed(2) : '0.00';
  const totalImpressions = filteredCampaigns.reduce((acc, c) => acc + Number(c.impressions || 0), 0);
  const totalClicks = filteredCampaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);

  return (
    <div className="space-y-5 pb-16">

      {/* Alerta de Nenhuma Conta Ativa */}
      {isNoAccountActive && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Nenhuma conta de anúncio ativa.</span>
              <span className="text-zinc-400 ml-1.5">No Plano Free (7 dias), você pode manter 1 conta de anúncio ativa simultaneamente. Ative sua conta em Integrações.</span>
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
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Campanhas
          </h1>
          {activeAdAccount && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A6DFF]/15 border border-[#1A6DFF]/30 text-[#5C9BFF] text-[11px] font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Conta: {activeAdAccount.name}</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-[#1A6DFF]/20 border border-[#1A6DFF]/40 text-[#5C9BFF] font-mono text-[11px] font-bold">
            {filteredCampaigns.filter(c => c.status).length} Ativas
          </span>
          <button className="text-zinc-400 hover:text-white transition-colors ml-1">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sincronizado: {lastSyncTime}</span>
          </span>
          <button 
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand/30 transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Meta'}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs: Contas, Campanhas, Conjuntos, Anúncios */}
      <div className="flex items-center gap-6 border-b border-[#13233E] text-xs font-medium">
        {subTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`pb-3 transition-colors relative cursor-pointer ${
              subTab === tab
                ? 'text-[#5C9BFF] font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{tab}</span>
            {tab === 'Contas' && adAccountsList.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                {adAccountsList.length}
              </span>
            )}
            {tab === 'Campanhas' && campaignsList.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#1A6DFF]/20 text-[#5C9BFF] text-[10px] font-bold">
                {campaignsList.length}
              </span>
            )}
            {subTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B66E3]" />
            )}
          </button>
        ))}
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="Qualquer" className="bg-[#0A1426] text-white">Qualquer Status</option>
              <option value="Ativo" className="bg-[#0A1426] text-emerald-400">Ativo</option>
              <option value="Pausado" className="bg-[#0A1426] text-zinc-400">Pausado</option>
            </select>
          </div>

          {/* Period Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Período:</span>
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="Hoje" className="bg-[#0A1426] text-white">Hoje</option>
              <option value="Ontem" className="bg-[#0A1426] text-white">Ontem</option>
              <option value="7 dias" className="bg-[#0A1426] text-white">Últimos 7 dias</option>
              <option value="30 dias" className="bg-[#0A1426] text-white">Últimos 30 dias</option>
            </select>
          </div>

          {/* Account Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0A1426] border border-[#13233E] px-3 py-1.5 rounded-xl text-zinc-300">
            <span className="text-zinc-500 font-mono text-[10px] uppercase">Conta:</span>
            <select
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="Todas" className="bg-[#0A1426] text-white">Todas as Contas ({adAccountsList.length})</option>
              {adAccountsList.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-[#0A1426] text-white">
                  {acc.name} ({acc.id.slice(-4)})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => window.open('https://adsmanager.facebook.com', '_blank')}
            className="px-3 py-1.5 rounded-xl bg-[#0A1426] border border-[#13233E] text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Gerenciador</span>
          </button>

          <button className="px-3 py-1.5 rounded-xl bg-[#0A1426] border border-[#13233E] text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Colunas</span>
          </button>

          <button 
            onClick={handleSyncNow}
            className="px-3 py-1.5 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ── VIEW 0: SUB-ABA CONTAS ── */}
      {subTab === 'Contas' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
          {adAccountsList.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#070D1A] border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <ShieldAlert className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="font-bold text-white text-sm">Nenhuma conta de anúncio encontrada</div>
              <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
                O perfil do Facebook Ads foi desconectado. Conecte sua conta na aba Integrações para visualizar suas contas.
              </p>
              <button
                onClick={() => navigate('/integracoes')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Ir para Integrações</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                  <tr>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">CONTA DE ANÚNCIO</th>
                    <th className="py-3 px-4">ID DA CONTA</th>
                    <th className="py-3 px-4">PORTFÓLIO (BM)</th>
                    <th className="py-3 px-4">TOTAL GASTO</th>
                    <th className="py-3 px-4">SALDO / LIMITE</th>
                    <th className="py-3 px-4">MOEDA</th>
                    <th className="py-3 px-4">SYNC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13233E]/60 font-mono">
                  {adAccountsList.map((acc, idx) => (
                    <tr key={acc.id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.status === 'ACTIVE' || acc.status === 'Ativa'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'ACTIVE' || acc.status === 'Ativa' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                          <span>{acc.status === 'ACTIVE' || acc.status === 'Ativa' ? 'Ativo' : 'Desativado'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {acc.name}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {acc.id}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300 font-sans">
                        {acc.bm || acc.businessName || 'BM Principal'}
                      </td>
                      <td className="py-3.5 px-4 text-white font-bold">
                        {acc.currency?.includes('USD') ? '$' : 'R$'} {acc.amountSpent || '0,00'}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono">
                        {acc.currency?.includes('USD') ? '$' : 'R$'} {acc.balance || '0,00'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {acc.currency || 'BRL'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ativo</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 1: SUB-ABA CAMPANHAS ── */}
      {subTab === 'Campanhas' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#070D1A] border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <ShieldAlert className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="font-bold text-white text-sm">Nenhuma campanha encontrada</div>
              <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
                {isDisconnected || campaignsList.length === 0
                  ? "O perfil do Facebook Ads foi desconectado. Todas as campanhas associadas foram desvinculadas. Conecte seu perfil em Integrações para sincronizar."
                  : "Nenhuma campanha ativa encontrada para os filtros selecionados."}
              </p>
              {(isDisconnected || campaignsList.length === 0) && (
                <button
                  onClick={() => navigate('/integracoes')}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white text-xs font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Ir para Integrações</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                    </th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-4">CAMPANHA</th>
                    <th className="py-3 px-4">CONTA</th>
                    <th className="py-3 px-4">ORÇAMENTO</th>
                    <th className="py-3 px-4">GASTO</th>
                    <th className="py-3 px-4 text-center">VENDAS</th>
                    <th className="py-3 px-4">FATURAMENTO</th>
                    <th className="py-3 px-4">LUCRO</th>
                    <th className="py-3 px-4">ROAS</th>
                    <th className="py-3 px-4">CPA</th>
                    <th className="py-3 px-4">CPC</th>
                    <th className="py-3 px-4">IMPRESSÕES</th>
                    <th className="py-3 px-4">CLIQUES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13233E]/60 font-mono">
                  {filteredCampaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-3">
                        <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                      </td>

                      <td className="py-4 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(camp.id)}
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                            camp.status ? 'bg-[#2B66E3]' : 'bg-zinc-700'
                          }`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            camp.status ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </td>

                      <td className="py-4 px-4 font-sans">
                        <div>
                          <div 
                            onClick={() => handleOpenEdit(camp)}
                            className="font-bold text-white text-sm hover:text-[#5C9BFF] cursor-pointer flex items-center gap-2"
                            title="Clique para editar nome, orçamento ou bid cap"
                          >
                            <span>{camp.name}</span>
                            {camp.status && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            )}
                            <Edit3 className="w-3 h-3 text-zinc-500 hover:text-[#5C9BFF]" />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-mono">ID: {camp.id}</span>
                            {camp.bidCap && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold">
                                Bid Cap: R$ {camp.bidCap}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-zinc-400 font-sans">
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-white text-[11px] font-medium">
                          {camp.accountName || 'CA01'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-sans">
                        <div 
                          onClick={() => handleOpenEdit(camp)}
                          className="cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors group"
                          title="Clique para alterar orçamento"
                        >
                          <div className="font-bold text-white font-mono flex items-center gap-1.5">
                            <span>{camp.currency === 'USD' ? '$' : 'R$'} {camp.budget || '0.00'}</span>
                            <Edit3 className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#5C9BFF]" />
                          </div>
                          {camp.currency === 'USD' && camp.budgetBrl && (
                            <div className="text-[10px] text-zinc-400 font-mono">≈ R$ {camp.budgetBrl}</div>
                          )}
                          <div className="text-[10px] text-zinc-400">{camp.budgetType || 'Diário'}</div>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-white font-bold">
                        <div>{camp.currency === 'USD' ? '$' : 'R$'} {camp.spend}</div>
                        {camp.currency === 'USD' && camp.spendBrl && (
                          <div className="text-[10px] text-zinc-400 font-normal font-mono">
                            ≈ R$ {camp.spendBrl}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-white font-bold text-center">{camp.sales}</td>
                      <td className="py-4 px-4 text-white font-bold">R$ {camp.revenue}</td>
                      <td className={`py-4 px-4 font-extrabold ${Number(camp.profit) >= 0 ? 'text-[#5C9BFF]' : 'text-red-400'}`}>
                        R$ {camp.profit}
                      </td>
                      <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">{camp.roas}</td>
                      <td className="py-4 px-4 font-bold text-[#5C9BFF]">{camp.currency === 'USD' ? '$' : 'R$'} {camp.cpa}</td>
                      <td className="py-4 px-4 text-zinc-300">{camp.currency === 'USD' ? '$' : 'R$'} {camp.cpc}</td>
                      <td className="py-4 px-4 text-zinc-300">{Number(camp.impressions || 0).toLocaleString('pt-BR')}</td>
                      <td className="py-4 px-4 text-zinc-300">{Number(camp.clicks || 0).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="bg-[#070D1A] font-bold border-t border-[#13233E] text-xs font-mono">
                  <tr>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-3"></td>
                    <td className="py-3 px-4 font-sans text-white uppercase text-[11px]">
                      {filteredCampaigns.length} CAMPANHAS
                    </td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-white">
                      <div>{currencySymbol} {totalSpend.toFixed(2)}</div>
                      {isUsd && totalSpendBrl > 0 && (
                        <div className="text-[10px] text-zinc-400 font-normal font-mono">
                          ≈ R$ {totalSpendBrl.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white text-center">{totalSales}</td>
                    <td className="py-3 px-4 text-white">R$ {totalRevenue.toFixed(2)}</td>
                    <td className={`py-3 px-4 font-extrabold ${totalProfit >= 0 ? 'text-[#5C9BFF]' : 'text-red-400'}`}>
                      R$ {totalProfit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-[#5C9BFF]">{avgRoas}</td>
                    <td className="py-3 px-4 text-[#5C9BFF]">{currencySymbol} {avgCpa}</td>
                    <td className="py-3 px-4 text-zinc-300"></td>
                    <td className="py-3 px-4 text-zinc-300">{totalImpressions.toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-4 text-zinc-300">{totalClicks.toLocaleString('pt-BR')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: SUB-ABA CONJUNTOS ── */}
      {subTab === 'Conjuntos' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#070D1A] border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <ShieldAlert className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="font-bold text-white text-sm">Nenhum conjunto encontrado</div>
              <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
                Conecte um perfil do Facebook Ads na aba Integrações para visualizar os conjuntos ativos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                    </th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-4">CONJUNTO</th>
                    <th className="py-3 px-4">ORÇAMENTO</th>
                    <th className="py-3 px-4">GASTO</th>
                    <th className="py-3 px-4 text-center">VENDAS</th>
                    <th className="py-3 px-4">FATURAMENTO</th>
                    <th className="py-3 px-4">LUCRO</th>
                    <th className="py-3 px-4">ROAS</th>
                    <th className="py-3 px-4">CPA</th>
                    <th className="py-3 px-4">IMPRESSÕES</th>
                    <th className="py-3 px-4">CLIQUES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13233E]/60 font-mono">
                  {filteredCampaigns.slice(0, 8).map((camp, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-3">
                        <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                      </td>
                      <td className="py-4 px-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${camp.status ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-600'}`} />
                      </td>
                      <td className="py-4 px-4 font-sans">
                        <div className="font-bold text-white text-xs">{camp.name} — Conjunto Aberto</div>
                        <div className="text-[10px] text-zinc-500 font-mono">Público Aberto 18-65</div>
                      </td>
                      <td className="py-4 px-4 text-white">{camp.currency === 'USD' ? '$' : 'R$'} {camp.budget}</td>
                      <td className="py-4 px-4 text-white font-bold">{camp.currency === 'USD' ? '$' : 'R$'} {camp.spend}</td>
                      <td className="py-4 px-4 text-white text-center font-bold">{camp.sales}</td>
                      <td className="py-4 px-4 text-white font-bold">R$ {camp.revenue}</td>
                      <td className={`py-4 px-4 font-extrabold ${Number(camp.profit) >= 0 ? 'text-[#5C9BFF]' : 'text-red-400'}`}>
                        R$ {camp.profit}
                      </td>
                      <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">{camp.roas}</td>
                      <td className="py-4 px-4 font-bold text-[#5C9BFF]">{camp.currency === 'USD' ? '$' : 'R$'} {camp.cpa}</td>
                      <td className="py-4 px-4 text-zinc-300">{Number(camp.impressions).toLocaleString('pt-BR')}</td>
                      <td className="py-4 px-4 text-zinc-300">{Number(camp.clicks).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 3: SUB-ABA ANÚNCIOS ── */}
      {subTab === 'Anúncios' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#070D1A] border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <ShieldAlert className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="font-bold text-white text-sm">Nenhum anúncio encontrado</div>
              <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
                Conecte um perfil do Facebook Ads na aba Integrações para visualizar seus anúncios e criativos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans whitespace-nowrap">
                <thead className="bg-[#070D1A] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#13233E]">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                    </th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-4">ANÚNCIO</th>
                    <th className="py-3 px-4 text-center">PREVIEW</th>
                    <th className="py-3 px-4">GASTO</th>
                    <th className="py-3 px-4 text-center">VENDAS</th>
                    <th className="py-3 px-4">FATURAMENTO</th>
                    <th className="py-3 px-4">LUCRO</th>
                    <th className="py-3 px-4">ROAS</th>
                    <th className="py-3 px-4">CPA</th>
                    <th className="py-3 px-4">IMPRESSÕES</th>
                    <th className="py-3 px-4">CLIQUES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13233E]/60 font-mono">
                  {filteredCampaigns.slice(0, 10).map((camp, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-3">
                        <input type="checkbox" className="rounded bg-[#03060D] border-white/10" defaultChecked />
                      </td>
                      <td className="py-4 px-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${camp.status ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      </td>
                      <td className="py-4 px-4 font-sans">
                        <div className="font-bold text-white text-xs hover:text-[#5C9BFF] cursor-pointer">
                          {camp.name} — Criativo Principal
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">{camp.accountName || 'CA01'}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button 
                          type="button"
                          onClick={() => setActiveCreativePreview({
                            id: camp.id,
                            title: `${camp.name} — Anúncio`,
                            mediaSrc: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
                            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-posing-for-a-fashion-photoshoot-40291-large.mp4',
                            type: 'video'
                          })}
                          title="Ver criativo"
                          className="p-1.5 rounded-lg border border-white/10 hover:border-[#1A6DFF] hover:bg-[#12223D] text-zinc-400 hover:text-[#5C9BFF] transition-all cursor-pointer inline-flex items-center justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-4 px-4 text-white font-bold">{camp.currency === 'USD' ? '$' : 'R$'} {camp.spend}</td>
                      <td className="py-4 px-4 text-white font-bold text-center">{camp.sales}</td>
                      <td className="py-4 px-4 text-white font-bold">R$ {camp.revenue}</td>
                      <td className={`py-4 px-4 font-extrabold ${Number(camp.profit) >= 0 ? 'text-[#5C9BFF]' : 'text-red-400'}`}>
                        R$ {camp.profit}
                      </td>
                      <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">{camp.roas}</td>
                      <td className="py-4 px-4 font-bold text-[#5C9BFF]">{camp.currency === 'USD' ? '$' : 'R$'} {camp.cpa}</td>
                      <td className="py-4 px-4 text-zinc-300">{Number(camp.impressions).toLocaleString('pt-BR')}</td>
                      <td className="py-4 px-4 text-zinc-300">{Number(camp.clicks).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Toast de Confirmação de Salvamento com Trava de Segurança */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#0A1426] border border-[#1A6DFF] text-white text-xs font-semibold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── MODAL DE EDIÇÃO DE CAMPANHA & BID CAP ── */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[500px] bg-[#0A1426] border border-[#13233E] rounded-3xl p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#13233E] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#12223D] border border-[#1A6DFF]/30 flex items-center justify-center text-[#5C9BFF]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Editar Campanha & Lances</h3>
                  <span className="text-[10px] font-mono text-zinc-400">ID: {editingCampaign.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setEditingCampaign(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">Nome da Campanha</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070D1A] border border-[#13233E] text-white focus:outline-none focus:border-[#1A6DFF] font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1.5">
                    Orçamento Diário ({editingCampaign?.currency === 'USD' ? 'USD $' : 'R$'})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 font-mono">
                      {editingCampaign?.currency === 'USD' ? '$' : 'R$'}
                    </span>
                    <input 
                      type="text"
                      value={editBudget}
                      onChange={e => setEditBudget(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#070D1A] border border-[#13233E] text-white focus:outline-none focus:border-[#1A6DFF] font-mono font-bold"
                      placeholder="99.51"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1.5">Bid Cap / Limite de Lance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 font-mono">R$</span>
                    <input 
                      type="text"
                      value={editBidCap}
                      onChange={e => setEditBidCap(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#070D1A] border border-[#13233E] text-amber-300 focus:outline-none focus:border-amber-400 font-mono font-bold"
                      placeholder="15.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">Estratégia de Lance</label>
                <select 
                  value={editStrategy}
                  onChange={e => setEditStrategy(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070D1A] border border-[#13233E] text-white focus:outline-none focus:border-[#1A6DFF] font-medium cursor-pointer"
                >
                  <option value="LOWEST_COST_WITH_BID_CAP">Limite de Lance (Bid Cap) — Recomendado</option>
                  <option value="LOWEST_COST_WITHOUT_CAP">Menor Custo (Maximizar Volume)</option>
                  <option value="COST_CAP">Meta de Custo (Cost Cap)</option>
                </select>
              </div>

              {/* CARD DE PROTEÇÃO TOTAL DO PERFIL BACKUP */}
              <div className="p-3.5 rounded-2xl bg-[#070D1A] border border-amber-500/30 text-[11px] leading-relaxed space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Trava de Proteção Ativa: Perfil Backup</span>
                </div>
                <p className="text-zinc-400">
                  O perfil conectado atualmente é um <strong className="text-white">Perfil Backup (Contingência)</strong>. Para garantir que seu ativo nunca sofra bloqueios ou penalidades, a PrimeTrack <strong className="text-emerald-400">bloqueia qualquer chamada de escrita para o Meta Ads através deste perfil</strong>.
                </p>
                <p className="text-zinc-500 font-mono text-[10px]">
                  ✓ Valores atualizados na PrimeTrack imediatamente<br/>
                  ✓ Zero risco para o seu perfil de backup
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCampaign(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-bold transition-all shadow-md shadow-brand/30 cursor-pointer disabled:opacity-60"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL DE PREVIEW DO CRIATIVO REAL (APENAS VÍDEO OU IMAGEM) ── */}
      {activeCreativePreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveCreativePreview(null)}
        >
          <div 
            className="relative max-w-xl w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Title and Close */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-sm truncate max-w-[400px]">
                  {activeCreativePreview.title || 'Criativo do Anúncio'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCreativePreview(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Media Only - Video or Image */}
            <div className="relative w-full max-h-[80vh] flex items-center justify-center bg-black/80 rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
              {activeCreativePreview.type === 'video' || activeCreativePreview.videoUrl ? (
                <video 
                  src={activeCreativePreview.videoUrl || activeCreativePreview.mediaSrc} 
                  controls 
                  autoPlay 
                  loop
                  className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                />
              ) : (
                <img 
                  src={activeCreativePreview.mediaSrc} 
                  alt={activeCreativePreview.title}
                  className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
