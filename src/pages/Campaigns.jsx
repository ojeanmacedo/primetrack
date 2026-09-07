import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';

export default function Campaigns({ clientMode = 'clean', onGoToIntegrations }) {
  const [subTab, setSubTab] = useState('Campanhas');
  const [activeCreativePreview, setActiveCreativePreview] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Qualquer');
  const [periodFilter, setPeriodFilter] = useState('Hoje');
  const [accountFilter, setAccountFilter] = useState('Todas');
  
  const [campaignsList, setCampaignsList] = useState([
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
  ]);
  const [adAccountsList, setAdAccountsList] = useState([
    { id: "act_1092137896602979", name: "CA01", currency: "BRL", account_status: 1, amount_spent: "123.41" },
    { id: "act_1101817232408751", name: "CA02 JEFFREY", currency: "BRL", account_status: 1, amount_spent: "0.00" }
  ]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Agora');

  const subTabs = ['Contas', 'Campanhas', 'Conjuntos', 'Anúncios'];

  // Carrega campanhas e contas reais - apenas ativas rodando
  const loadData = () => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const activeOnly = data.filter(c => c.name === 'TESTE MI' || (c.status === true && Number(c.spend) > 0));
          setCampaignsList(activeOnly.length > 0 ? activeOnly : data);
        }
      })
      .catch(err => console.log('Erro ao carregar campanhas:', err));

    fetch('/api/meta/status')
      .then(r => r.json())
      .then(data => {
        if (data.adAccounts && data.adAccounts.length > 0) {
          setAdAccountsList(data.adAccounts);
        }
      })
      .catch(err => console.log('Erro ao carregar contas:', err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await fetch('/api/meta/sync', { method: 'POST' });
      await loadData();
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

  // Filtragem
  const filteredCampaigns = campaignsList.filter(c => {
    if (statusFilter === 'Ativo' && !c.status) return false;
    if (statusFilter === 'Pausado' && c.status) return false;
    if (accountFilter !== 'Todas' && c.accountName !== accountFilter && c.adAccountId !== accountFilter) return false;
    return true;
  });

  // Totais calculados dinamicamente
  const totalSpend = filteredCampaigns.reduce((acc, c) => acc + Number(c.spend || 0), 0);
  const totalSales = filteredCampaigns.reduce((acc, c) => acc + Number(c.sales || 0), 0);
  const totalRevenue = filteredCampaigns.reduce((acc, c) => acc + Number(c.revenue || 0), 0);
  const totalProfit = totalRevenue - totalSpend;
  const avgRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';
  const avgCpa = totalSales > 0 ? (totalSpend / totalSales).toFixed(2) : '0.00';
  const totalImpressions = filteredCampaigns.reduce((acc, c) => acc + Number(c.impressions || 0), 0);
  const totalClicks = filteredCampaigns.reduce((acc, c) => acc + Number(c.clicks || 0), 0);

  return (
    <div className="space-y-5 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Campanhas
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-[#1A6DFF]/20 border border-[#1A6DFF]/40 text-[#5C9BFF] font-mono text-[11px] font-bold">
            {campaignsList.filter(c => c.status).length} Ativas
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
                <option key={acc.id} value={acc.name} className="bg-[#0A1426] text-white">
                  {acc.name}
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

          <button className="px-3 py-1.5 rounded-xl bg-[#0A1426] border border-[#13233E] text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* ── VIEW 0: SUB-ABA CONTAS ── */}
      {subTab === 'Contas' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
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
                        acc.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        <span>{acc.status === 'ACTIVE' ? 'Ativo' : 'Desativado'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      {acc.name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {acc.id}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-sans">
                      {acc.businessName || 'DJS02'}
                    </td>
                    <td className="py-3.5 px-4 text-white font-bold">
                      R$ {acc.amountSpent || '0,00'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      R$ {acc.balance || '0,00'}
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
        </div>
      )}

      {/* ── VIEW 1: SUB-ABA CAMPANHAS ── */}
      {subTab === 'Campanhas' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
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
                      <div className="font-bold text-white text-sm hover:text-[#5C9BFF] cursor-pointer flex items-center gap-2">
                        <span>{camp.name}</span>
                        {camp.status && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">ID: {camp.id}</div>
                    </td>

                    <td className="py-4 px-4 text-zinc-400 font-sans">
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-white text-[11px] font-medium">
                        {camp.accountName || 'CA01'}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-sans">
                      <div className="font-bold text-white font-mono">R$ {camp.budget || '25,00'}</div>
                      <div className="text-[10px] text-zinc-400">{camp.budgetType || 'Diário'}</div>
                    </td>

                    <td className="py-4 px-4 text-white font-bold">R$ {camp.spend}</td>
                    <td className="py-4 px-4 text-white font-bold text-center">{camp.sales}</td>
                    <td className="py-4 px-4 text-white font-bold">R$ {camp.revenue}</td>
                    <td className={`py-4 px-4 font-extrabold ${Number(camp.profit) >= 0 ? 'text-[#5C9BFF]' : 'text-red-400'}`}>
                      R$ {camp.profit}
                    </td>
                    <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">{camp.roas}</td>
                    <td className="py-4 px-4 font-bold text-[#5C9BFF]">R$ {camp.cpa}</td>
                    <td className="py-4 px-4 text-zinc-300">R$ {camp.cpc}</td>
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
                  <td className="py-3 px-4 text-white">R$ {totalSpend.toFixed(2)}</td>
                  <td className="py-3 px-4 text-white text-center">{totalSales}</td>
                  <td className="py-3 px-4 text-white">R$ {totalRevenue.toFixed(2)}</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ {totalProfit.toFixed(2)}</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">{avgRoas}</td>
                  <td className="py-3 px-4 text-[#5C9BFF]">R$ {avgCpa}</td>
                  <td className="py-3 px-4 text-zinc-300"></td>
                  <td className="py-3 px-4 text-zinc-300">{totalImpressions.toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-4 text-zinc-300">{totalClicks.toLocaleString('pt-BR')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: SUB-ABA CONJUNTOS ── */}
      {subTab === 'Conjuntos' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
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
                    <td className="py-4 px-4 text-white">R$ {camp.budget}</td>
                    <td className="py-4 px-4 text-white font-bold">R$ {camp.spend}</td>
                    <td className="py-4 px-4 text-white text-center font-bold">{camp.sales}</td>
                    <td className="py-4 px-4 text-white font-bold">R$ {camp.revenue}</td>
                    <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">R$ {camp.profit}</td>
                    <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">{camp.roas}</td>
                    <td className="py-4 px-4 font-bold text-[#5C9BFF]">R$ {camp.cpa}</td>
                    <td className="py-4 px-4 text-zinc-300">{Number(camp.impressions).toLocaleString('pt-BR')}</td>
                    <td className="py-4 px-4 text-zinc-300">{Number(camp.clicks).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 3: SUB-ABA ANÚNCIOS ── */}
      {subTab === 'Anúncios' && (
        <div className="bg-[#0A1426] border border-[#13233E] rounded-2xl overflow-hidden shadow-xl">
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
                        onClick={() => setActiveCreativePreview({
                          id: camp.id,
                          title: camp.name,
                          mediaSrc: '/images/ad_video_creative.png',
                          type: 'video'
                        })}
                        title="Ver criativo"
                        className="p-1.5 rounded-lg border border-white/10 hover:border-[#1A6DFF] hover:bg-[#12223D] text-zinc-400 hover:text-[#5C9BFF] transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-4 px-4 text-white font-bold">R$ {camp.spend}</td>
                    <td className="py-4 px-4 text-white font-bold text-center">{camp.sales}</td>
                    <td className="py-4 px-4 text-white font-bold">R$ {camp.revenue}</td>
                    <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">R$ {camp.profit}</td>
                    <td className="py-4 px-4 font-extrabold text-[#5C9BFF]">{camp.roas}</td>
                    <td className="py-4 px-4 font-bold text-[#5C9BFF]">R$ {camp.cpa}</td>
                    <td className="py-4 px-4 text-zinc-300">{Number(camp.impressions).toLocaleString('pt-BR')}</td>
                    <td className="py-4 px-4 text-zinc-300">{Number(camp.clicks).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL DE PREVIEW DO CRIATIVO ── */}
      {activeCreativePreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-[340px] bg-[#0A1426] border border-white/20 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            
            {/* Top Close Bar */}
            <div className="absolute top-3 right-3 z-10">
              <button 
                onClick={() => setActiveCreativePreview(null)}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video / Creative Area */}
            <div className="relative aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
              <img 
                src={activeCreativePreview.mediaSrc} 
                alt={activeCreativePreview.title}
                className="w-full h-full object-contain"
              />

              {/* Video Player Control Bar overlay at bottom */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex flex-col gap-2">
                <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                  <div className="h-full bg-white rounded-full w-[12%]" />
                </div>

                <div className="flex items-center justify-between text-white text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="hover:text-[#5C9BFF] transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                    <span className="text-[11px] text-white/90">0:01 / 0:09</span>
                  </div>

                  <div className="flex items-center gap-3 text-white/80">
                    <button onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <Maximize2 className="w-3.5 h-3.5 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Meta Info Bar */}
            <div className="bg-[#0A1426] border-t border-white/10 px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white truncate max-w-[200px]">
                  {activeCreativePreview.title}
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 uppercase">
                Creative Meta Ads
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
