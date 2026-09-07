import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, AlertCircle, X, ShieldCheck, ArrowRight, Lock, Mail, User } from 'lucide-react';
import { loginUser, loginWithGoogle } from '../utils/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Google Modal States
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('Por favor, informe uma conta de e-mail do Google válida (ex: seu.email@gmail.com).');
      return;
    }

    setGoogleLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginWithGoogle(cleanEmail, googleName.trim());
      setGoogleLoading(false);
      setShowGoogleModal(false);

      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage('Não foi possível conectar com o Google. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setGoogleLoading(false);
      setErrorMessage('Erro ao autenticar com o Google. Tente novamente.');
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
            src="/images/logo-primetrack.png" 
            alt="PrimeTrack" 
            className="w-8 h-8 rounded-lg object-contain shadow-md shrink-0" 
          />
          <span className="text-xl font-extrabold text-white tracking-tight flex items-center">
            <span>Prime</span><span className="text-[#5C9BFF]">Track</span>
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
          onClick={() => {
            setErrorMessage(null);
            setShowGoogleModal(true);
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-[#2B66E3] hover:bg-[#2558C7] text-white font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-brand/20 cursor-pointer active:scale-[0.98]"
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
          <span className="tracking-wide">Entrar com Google</span>
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
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[440px] bg-white text-zinc-900 rounded-3xl p-7 sm:p-8 shadow-2xl relative border border-zinc-200">
            
            {/* Close button */}
            <button
              onClick={() => {
                if (!googleLoading) setShowGoogleModal(false);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google G Logo Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-md border border-zinc-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                Fazer login com o Google
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Para continuar para o <strong className="text-zinc-800">PrimeTrack</strong>
              </p>
            </div>

            {/* Form to enter Google Account */}
            <form onSubmit={handleGoogleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  E-mail do Google
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="seu.email@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="ex: Jean Macedo"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 text-xs text-zinc-900 placeholder-zinc-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Privacy notice box */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-500 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  O Google compartilhará com o PrimeTrack seu nome e e-mail para criar seu painel privado e seguro.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={() => setShowGoogleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="px-6 py-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557CC] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {googleLoading ? 'Autenticando...' : 'Continuar com Google'}
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
