import React from 'react';
import { 
  BarChart3, 
  Layers, 
  Radio, 
  Webhook, 
  FlaskConical, 
  Link2, 
  Globe, 
  Zap, 
  Copy, 
  Check,
  ShieldCheck,
  LogIn
} from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onQuickSimulate }) {
  const [copied, setCopied] = React.useState(false);

  const copyPixelScript = () => {
    const script = `<script>
  window.pixelId = "lt_px_804f84899d2a";
  var a = document.createElement("script");
  a.setAttribute("async", "");
  a.setAttribute("defer", "");
  a.setAttribute("src", "${window.location.origin}/pixel.js");
  document.head.appendChild(a);
</script>`;
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', label: 'Campanhas & ROAS', icon: Layers },
    { id: 'pixel', label: 'Pixel & CAPI', icon: Radio, badge: 'Nota 9.3' },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'simulator', label: 'Simulador Lab', icon: FlaskConical, highlight: true },
    { id: 'utm_builder', label: 'Gerador UTM', icon: Link2 },
    { id: 'landing', label: 'Landing Page', icon: Globe },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#03060D]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand to-brand-light flex items-center justify-center text-white shadow-lg shadow-brand/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-sans">
                  PrimeTrack
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand/20 text-brand-light border border-brand/30 font-bold">
                  v2.0 CAPI
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono -mt-0.5">
                Rastreador Inteligente
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#070D1A] p-1 rounded-full border border-white/5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand text-white shadow-md shadow-brand/30'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={copyPixelScript}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0C1426] hover:bg-[#111B33] text-zinc-300 border border-white/10 transition-all"
              title="Copiar snippet do pixel para landing pages"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copied ? 'Pixel Copiado!' : 'Copiar Pixel'}</span>
            </button>

            <button
              onClick={() => setActiveTab('login')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#0C1426] hover:bg-[#111B33] text-zinc-400 hover:text-white border border-white/10 transition-all"
              title="Tela de Login"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>

            <button
              onClick={onQuickSimulate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-brand to-brand-light hover:brightness-110 text-white shadow-lg shadow-brand/25 transition-all transform active:scale-95"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Simular Venda</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                  isActive ? 'bg-brand text-white' : 'bg-[#070D1A] text-zinc-400'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
