import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, DollarSign, Percent, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'primetrack_tax_settings';

export function getTaxSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {
    metaTaxRate: 0, // Alíquota % de imposto Meta Ads (ex: 12 para BR ou 0 para US)
    applyToAllMetaAccounts: true,
    additionalTaxes: []
  };
}

export function saveTaxSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('primetrack_tax_settings_updated'));
  } catch (e) {
    console.error('Erro ao salvar taxas:', e);
  }
}

export default function Taxes() {
  const [settings, setSettings] = useState(getTaxSettings);
  const [isEditingMetaTax, setIsEditingMetaTax] = useState(false);
  const [tempRate, setTempRate] = useState(settings.metaTaxRate || 0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSettings(getTaxSettings());
  }, []);

  const handleSaveMetaTax = (e) => {
    e?.preventDefault();
    const rateNumber = parseFloat(tempRate) || 0;
    const updated = {
      ...settings,
      metaTaxRate: rateNumber
    };
    saveTaxSettings(updated);
    setSettings(updated);
    setIsEditingMetaTax(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRemoveMetaTax = () => {
    const updated = {
      ...settings,
      metaTaxRate: 0
    };
    saveTaxSettings(updated);
    setSettings(updated);
    setTempRate(0);
    setIsEditingMetaTax(false);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Taxas e Impostos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Configure as taxas e impostos sobre anúncios e produtos para cálculo automático de lucro líquido na dashboard.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-medium animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Configurações salvas!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bloco 1: Imposto sobre anúncios */}
        <div className="space-y-6">
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Imposto sobre anúncios
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure o imposto sobre seus gastos com tráfego pago (Meta Ads / Facebook):
                </p>
              </div>

              {!isEditingMetaTax && (
                <button
                  type="button"
                  onClick={() => {
                    setTempRate(settings.metaTaxRate || 12);
                    setIsEditingMetaTax(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{settings.metaTaxRate > 0 ? 'Editar Imposto' : 'Adicionar Imposto'}</span>
                </button>
              )}
            </div>

            {/* Formulário / Exibição */}
            {isEditingMetaTax ? (
              <form onSubmit={handleSaveMetaTax} className="bg-[#0D1424] border border-[#1E293B] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#182238] pb-2">
                  <span className="text-xs font-bold text-white">Configurar Imposto Meta Ads (Facebook)</span>
                  <span className="text-[11px] text-zinc-400 font-mono">Ex: 12% para contas BR</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-300 block mb-1 font-medium">
                      Nome da Taxa / Imposto
                    </label>
                    <input
                      type="text"
                      disabled
                      value="Imposto Meta (Facebook Ads)"
                      className="w-full bg-[#141C2E] border border-[#1E293B] rounded-lg px-3 py-2 text-zinc-300 text-xs opacity-80 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-300 block mb-1 font-medium">
                      Alíquota (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={tempRate}
                        onChange={(e) => setTempRate(e.target.value)}
                        placeholder="12.00"
                        className="w-full bg-[#141C2E] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#0066FF]"
                        autoFocus
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono font-bold">%</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 bg-blue-500/5 border border-blue-500/20 p-2.5 rounded-lg flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>
                    <strong>Dica:</strong> Se você utiliza contas brasileiras (CNPJ/CPF no Brasil), coloque <strong>12%</strong>. Se utiliza contas sediadas nos EUA ou sem incidência de imposto, mantenha <strong>0%</strong>.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingMetaTax(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    Salvar Alíquota
                  </button>
                </div>
              </form>
            ) : settings.metaTaxRate > 0 ? (
              <div className="bg-[#0D1424] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Imposto Meta</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[#0066FF] text-[10px] font-bold font-mono">
                      {settings.metaTaxRate.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Alíquota: <strong>{settings.metaTaxRate.toFixed(2)}%</strong> • Aplicado sobre o gasto total de anúncios Meta Ads
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Aplicando em: Todas as contas Meta
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTempRate(settings.metaTaxRate);
                      setIsEditingMetaTax(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-zinc-200 text-xs font-medium transition-all cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveMetaTax}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                    title="Remover imposto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#0D1424]/60 border border-dashed border-[#1E293B] rounded-xl p-6 text-center">
                <Percent className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs text-zinc-300 font-medium">
                  Nenhum imposto sobre anúncios configurado (0%)
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-sm mx-auto">
                  Ideal para contas dos Estados Unidos ou sem incidência de impostos. Se utilizar contas brasileiras, clique em "Adicionar Imposto" e defina 12%.
                </p>
              </div>
            )}
          </div>

          {/* Bloco 2: Taxas adicionais */}
          <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Taxas Adicionais
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure taxas de gateway, checkout ou intermediadores:
                </p>
              </div>
            </div>

            <div className="bg-[#0D1424]/60 border border-dashed border-[#1E293B] rounded-xl p-6 text-center">
              <p className="text-xs text-zinc-400">
                As taxas de gateways são processadas diretamente nos webhooks recebidos.
              </p>
            </div>
          </div>
        </div>

        {/* Bloco 3: Custo de Produtos */}
        <div className="bg-[#141C2E] border border-[#1E293B] rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Custo de Produtos
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure o custo unitário (COGS) dos seus produtos:
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/90 mb-4 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>Sincronização dos produtos</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Para que os seus produtos apareçam para seleção, é necessário que pelo menos uma venda ou processamento de pedido tenha sido realizado com o devido produto.
              </p>
            </div>

            <div className="bg-[#0D1424]/60 border border-dashed border-[#1E293B] rounded-xl p-8 text-center text-xs text-zinc-500">
              Nenhum custo de produto configurado ainda.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
