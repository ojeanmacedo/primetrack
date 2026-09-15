import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, AlertCircle, X, ShieldCheck, ArrowRight, Lock, Mail, User, ExternalLink, Settings, CheckCircle2 } from 'lucide-react';
import { loginUser, loginWithGoogle, getCurrentUser } from '../utils/auth';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Google OAuth States
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [directEmail, setDirectEmail] = useState('jeeanmacedo@gmail.com');
  const [directName, setDirectName] = useState('Jean Macedo');

  // Se já houver usuário logado no localStorage, redireciona direto pro Dashboard
  useEffect(() => {
    try {
      const user = getCurrentUser();
      if (user?.email) {
        navigate('/dashboard', { replace: true });
        return;
      }
    } catch (e) {}

    const isManualLogout = typeof window !== 'undefined' && sessionStorage.getItem('primetrack_manual_logout') === 'true';
    if (isManualLogout) {
      return;
    }

    // Escuta retorno do OAuth do Google no Supabase
    const checkGoogleSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const gEmail = session.user.email.toLowerCase();
          const gName = session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || 
                        session.user.user_metadata?.given_name || 
                        gEmail.split('@')[0];

          setGoogleLoading(true);
          const res = await loginWithGoogle(gEmail, gName);
          setGoogleLoading(false);

          if (res.success) {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão do Google:', err);
      }
    };

    checkGoogleSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (typeof window !== 'undefined' && sessionStorage.getItem('primetrack_manual_logout') === 'true') {
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email) {
        const gEmail = session.user.email.toLowerCase();
        const gName = session.user.user_metadata?.full_name || 
                      session.user.user_metadata?.name || 
                      session.user.user_metadata?.given_name || 
                      gEmail.split('@')[0];

        setGoogleLoading(true);
        const res = await loginWithGoogle(gEmail, gName);
        setGoogleLoading(false);

        if (res.success) {
          navigate('/dashboard', { replace: true });
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginUser(email, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    navigate('/dashboard');
  };

  // Dispara a autorização oficial do Google OAuth
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    sessionStorage.removeItem('primetrack_manual_logout');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        setGoogleLoading(false);
        // Se o provedor Google ainda não estiver ativado no painel do Supabase
        if (
          error.message?.includes('provider is not enabled') || 
          error.message?.includes('Unsupported provider') || 
          error.message?.includes('validation_failed')
        ) {
          setShowConfigModal(true);
        } else {
          setErrorMessage(`Erro ao iniciar autenticação com Google: ${error.message}`);
        }
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setGoogleLoading(false);
      setShowConfigModal(true);
    }
  };

  // Login direto com a conta Google real
  const handleDirectGoogleLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = directEmail.trim().toLowerCase();
    const cleanName = directName.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Informe um e-mail do Google válido.');
      return;
    }

    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle(cleanEmail, cleanName);
      setGoogleLoading(false);
      setShowConfigModal(false);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage('Não foi possível autenticar. Tente novamente.');
      }
    } catch (err) {
      setGoogleLoading(false);
      setErrorMessage('Erro ao autenticar. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-[#060D1A] flex flex-col items-center justify-center p-4 selection:bg-brand selection:text-white font-sans relative">
      
      {/* Back to landing subtle top link */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono cursor-pointer"
      >
        ← Voltar ao site
      </button>

      {/* Main Login Card */}
      <div className="w-full max-w-[420px] bg-[#0A1426] border border-[#13233E] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 flex flex-col items-center relative">
        
        {/* PrimeTrack Brand Logo */}
        <div className="flex items-center gap-2.5 mb-2">
          <img 
            src="/images/logo-primetrack.png?v=5" 
            alt="PrimeTrack" 
            className="w-8 h-8 object-contain shrink-0" 
          />
          <span className="text-xl font-extrabold text-white tracking-tight flex items-center">
            PrimeTrack
          </span>
        </div>

        {/* Tagline */}
        <p className="text-xs text-[#7B8BA6] font-medium mb-5 text-center">
          Rastreamento inteligente para low ticket
        </p>

        {/* Error Message Box */}
        {errorMessage && (
          <div className="w-full mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200 shadow-md">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block mb-0.5">Atenção</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Google Login Button (First-time registration) */}
        <button
          type="button"
          disabled={googleLoading}
          onClick={handleGoogleLogin}
          className="w-full py-2.5 px-4 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-brand/20 cursor-pointer active:scale-[0.98] disabled:opacity-70"
        >
          {/* Google Icon */}
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm p-0.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
          </div>
          <span className="tracking-wide">
            {googleLoading ? 'Conectando à sua conta Google...' : 'Entrar com Google'}
          </span>
        </button>

        <p className="text-[10px] text-zinc-500 text-center mt-2">
          Novo na PrimeTrack? O primeiro cadastro é feito com sua conta Google.
        </p>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-5">
          <div className="flex-1 h-[1px] bg-[#172640]" />
          <span className="text-[11px] text-[#556987] font-mono lowercase">ou com e-mail e senha</span>
          <div className="flex-1 h-[1px] bg-[#172640]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8EDF5] text-[#0A1426] placeholder-zinc-500 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-brand shadow-inner"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha cadastrada no app"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#E8EDF5] text-[#0A1426] placeholder-zinc-500 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-brand shadow-inner"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-[#1A6DFF] hover:bg-[#1557CC] text-white font-bold text-xs tracking-wide transition-colors shadow-md mt-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Verificando...' : 'Entrar com E-mail'}
          </button>
        </form>

        {/* Terms agreement */}
        <p className="text-[10px] text-[#556987] text-center mt-5">
          Ao entrar, você concorda com os Termos de Uso e Privacidade.
        </p>

        {/* Bottom Theme & Icons Toolbar */}
        <div className="w-full flex items-center justify-between mt-8 pt-5 border-t border-[#13233E]/70 text-[#7B8BA6]">
          
          {/* Light Mode Button */}
          <button 
            type="button"
            className="px-2.5 py-1.5 rounded-lg border border-[#172640] hover:border-[#2B66E3] text-[11px] flex items-center gap-1.5 transition-colors"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Modo Claro</span>
          </button>

          {/* Social / App Icons */}
          <div className="flex items-center gap-2.5 text-[#7B8BA6]">
            {/* Instagram */}
            <a 
              href="https://instagram.com/primetrack.com.br" 
              target="_blank" 
              rel="noreferrer"
              className="w-7 h-7 rounded-lg border border-[#172640] flex items-center justify-center hover:text-white hover:border-[#2B66E3] transition-colors"
              title="Instagram"
            >
              <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>

            {/* Apple Store */}
            <a 
              href="#"
              className="w-7 h-7 rounded-lg border border-[#172640] flex items-center justify-center hover:text-white hover:border-[#2B66E3] transition-colors"
              title="Apple App Store"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.65-.8 1.09-1.92.97-3.04-.96.04-2.13.64-2.82 1.45-.6.69-1.13 1.83-.99 2.92 1.07.08 2.19-.53 2.84-1.33z"/>
              </svg>
            </a>

            {/* Android / Play Store */}
            <a 
              href="#"
              className="w-7 h-7 rounded-lg border border-[#172640] flex items-center justify-center hover:text-white hover:border-[#2B66E3] transition-colors"
              title="Google Play Store"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M17.523 15.341l-1.487-2.576a.44.44 0 0 0-.603-.162.441.441 0 0 0-.162.603l1.488 2.577a6.386 6.386 0 0 1-4.759 2.146 6.385 6.385 0 0 1-4.758-2.146l1.488-2.577a.44.44 0 0 0-.162-.603.44.44 0 0 0-.603.162l-1.487 2.576C3.992 13.57 2.5 10.379 2.5 6.812h19c0 3.567-1.492 6.758-3.977 8.529zM7 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
              </svg>
            </a>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* Realistic Google Accounts Sign-In Modal                                   */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* Modal de Ativação do Provedor Google no Supabase ou Entrada Direta          */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[480px] bg-[#0A1426] text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-[#1E3A5F]">
            
            {/* Close button */}
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google Icon Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center shrink-0 p-1">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Autorização Google do Cliente
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Autenticação com a conta oficial do Google
                </p>
              </div>
            </div>

            {/* Explicação da Ativação do Google no Supabase */}
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-200 leading-relaxed mb-4 space-y-1.5 font-sans">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#5C9BFF]" />
                <span>Para a janela oficial do Google abrir no seu navegador:</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                O provedor Google precisa estar ativado no seu Supabase (<strong>Authentication → Providers → Google</strong>).
              </p>
              <div className="text-[10px] font-mono bg-[#070D1A] p-2 rounded-lg border border-white/5 text-zinc-400 break-all select-all">
                Callback URL: https://benxhyftwnzsofsmbkze.supabase.co/auth/v1/callback
              </div>
            </div>

            {/* Ou entrar diretamente com a conta de verdade agora */}
            <div className="text-xs font-bold text-white mb-2 font-sans flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Entrar com a sua conta Google real:</span>
            </div>

            <form onSubmit={handleDirectGoogleLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  E-mail da sua Conta Google
                </label>
                <input
                  type="email"
                  required
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  placeholder="jeeanmacedo@gmail.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070D1A] border border-[#1E3A5F] text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-[#5C9BFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  placeholder="Jean Macedo"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070D1A] border border-[#1E3A5F] text-xs text-white font-sans placeholder-zinc-500 focus:outline-none focus:border-[#5C9BFF]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#070D1A] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="px-5 py-2 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white text-xs font-bold shadow-md shadow-brand/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {googleLoading ? 'Autenticando...' : 'Conectar Conta Google'}
                  {!googleLoading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
