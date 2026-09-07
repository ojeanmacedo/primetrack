import React, { useState } from 'react';
import { Link2, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

export default function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState('https://seusite.com.br/oferta');
  const [utmSource, setUtmSource] = useState('{{site_source_name}}');
  const [utmCampaign, setUtmCampaign] = useState('{{campaign.name}}');
  const [utmMedium, setUtmMedium] = useState('{{adset.name}}');
  const [utmContent, setUtmContent] = useState('{{ad.name}}');
  const [utmTerm, setUtmTerm] = useState('{{ad.id}}');

  const [copiedParams, setCopiedParams] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  // Parâmetros para colar no campo de Parâmetros de URL do Gerenciador de Anúncios do Meta
  const urlParametersOnly = `utm_source=${utmSource}&utm_campaign=${utmCampaign}&utm_medium=${utmMedium}&utm_content=${utmContent}&utm_term=${utmTerm}&src=${utmSource}`;

  // URL completa pronta para testar
  const cleanBase = baseUrl.split('?')[0].trim();
  const fullUrl = `${cleanBase}?${urlParametersOnly}`;

  const copyParams = () => {
    navigator.clipboard.writeText(urlParametersOnly);
    setCopiedParams(true);
    setTimeout(() => setCopiedParams(false), 2000);
  };

  const copyFull = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const applyPreset = (type) => {
    if (type === 'meta_dynamic') {
      setUtmSource('{{site_source_name}}');
      setUtmCampaign('{{campaign.name}}');
      setUtmMedium('{{adset.name}}');
      setUtmContent('{{ad.name}}');
      setUtmTerm('{{ad.id}}');
    } else if (type === 'manual') {
      setUtmSource('facebook');
      setUtmCampaign('escala_protetor_solar');
      setUtmMedium('aberto_mulheres');
      setUtmContent('ad01_gancho_dermato');
      setUtmTerm('feed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Link2 className="w-6 h-6 text-brand" />
          <span>Gerador Inteligente de UTMs para Facebook Ads</span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Crie parâmetros dinâmicos oficiais do Meta Ads para rastrear campanhas, conjuntos e criativos sem esforço manual.
        </p>
      </div>

      {/* Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Configuration */}
        <div className="lg:col-span-2 card-glass p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Configurar Parâmetros</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset('meta_dynamic')}
                className="px-2.5 py-1 rounded-lg bg-brand/15 hover:bg-brand/25 text-brand-light text-xs font-mono font-bold transition-colors"
              >
                ⚡ Dinâmico Meta (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('manual')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono transition-colors"
              >
                Manual
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
              URL da sua Landing Page
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://seusite.com.br/oferta"
              className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                Origem (utm_source)
              </label>
              <input
                type="text"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand font-mono"
              />
              <span className="text-[10px] text-zinc-500 font-mono">Dica: {'{{site_source_name}}'} preenche fb ou ig</span>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                Campanha (utm_campaign)
              </label>
              <input
                type="text"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand font-mono"
              />
              <span className="text-[10px] text-zinc-500 font-mono">Dica: {'{{campaign.name}}'} puxa o nome da campanha</span>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                Conjunto (utm_medium)
              </label>
              <input
                type="text"
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand font-mono"
              />
              <span className="text-[10px] text-zinc-500 font-mono">Dica: {'{{adset.name}}'} identifica o público</span>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                Criativo / Anúncio (utm_content)
              </label>
              <input
                type="text"
                value={utmContent}
                onChange={(e) => setUtmContent(e.target.value)}
                className="w-full px-3 py-2 bg-[#03060D] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand font-mono"
              />
              <span className="text-[10px] text-zinc-500 font-mono">Dica: {'{{ad.name}}'} identifica o vídeo/imagem exato</span>
            </div>
          </div>
        </div>

        {/* Output Box */}
        <div className="card-glass p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-brand" />
              <span>Campos Prontos para Copiar</span>
            </h3>

            {/* Field 1: Meta Ads Manager Box */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase font-bold">
                  Campo "Parâmetros de URL" do Facebook:
                </span>
                <button
                  onClick={copyParams}
                  className="text-xs text-brand-light hover:underline flex items-center gap-1 font-bold"
                >
                  {copiedParams ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedParams ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={3}
                value={urlParametersOnly}
                className="w-full p-2.5 bg-[#03060D] border border-white/10 rounded-xl font-mono text-xs text-zinc-300 resize-none focus:outline-none"
              />
              <p className="text-[10px] text-zinc-500">
                Cole no campo "Parâmetros de URL" ao criar o anúncio no Gerenciador da Meta.
              </p>
            </div>

            {/* Field 2: Full URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase font-bold">
                  URL Completa:
                </span>
                <button
                  onClick={copyFull}
                  className="text-xs text-brand-light hover:underline flex items-center gap-1 font-bold"
                >
                  {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFull ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={3}
                value={fullUrl}
                className="w-full p-2.5 bg-[#03060D] border border-white/10 rounded-xl font-mono text-xs text-zinc-300 resize-none focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] text-zinc-400">
            ✓ O script da PrimeTrack intercepta esses valores e repassa ao checkout automaticamente.
          </div>
        </div>

      </div>

    </div>
  );
}
