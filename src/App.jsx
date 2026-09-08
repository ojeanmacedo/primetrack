import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Sales from './pages/Sales';
import Rules from './pages/Rules';
import Integrations from './pages/Integrations';
import Notifications from './pages/Notifications';
import Plans from './pages/Plans';
import Support from './pages/Support';
import { supabase } from './lib/supabase';
import { loginWithGoogle } from './utils/auth';

function AuthListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Se o usuário acabou de clicar em sair, respeita a saída
    const isManualLogout = typeof window !== 'undefined' && sessionStorage.getItem('primetrack_manual_logout') === 'true';
    const isOAuthCallback = typeof window !== 'undefined' && (
      window.location.hash.includes('access_token') || 
      window.location.search.includes('code=')
    );

    // Se veio de um redirecionamento de login do Google, limpa a flag de logout
    if (isOAuthCallback) {
      sessionStorage.removeItem('primetrack_manual_logout');
    } else if (isManualLogout) {
      return;
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const gEmail = session.user.email.toLowerCase();
          const gName = session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || 
                        session.user.user_metadata?.given_name || 
                        gEmail.split('@')[0];

          await loginWithGoogle(gEmail, gName);
          
          if (location.pathname === '/' || location.pathname === '/login') {
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error('Erro no AuthListener:', err);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (sessionStorage.getItem('primetrack_manual_logout') === 'true') {
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email) {
        const gEmail = session.user.email.toLowerCase();
        const gName = session.user.user_metadata?.full_name || 
                      session.user.user_metadata?.name || 
                      session.user.user_metadata?.given_name || 
                      gEmail.split('@')[0];

        await loginWithGoogle(gEmail, gName);
        navigate('/dashboard', { replace: true });
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate, location]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthListener />
      <Routes>
        {/* Rota 1: Landing Page Pública (1:1 primetrack.com.br) */}
        <Route path="/" element={<LandingPage />} />

        {/* Rota 2: Tela de Login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas do Painel Interno (com Sidebar e Topbar fiéis aos prints) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campanhas" element={<Campaigns />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/regras" element={<Rules />} />
          <Route path="/integracoes" element={<Integrations />} />
          <Route path="/notificacoes" element={<Notifications />} />
          <Route path="/planos" element={<Plans />} />
          <Route path="/suporte" element={<Support />} />
        </Route>

        {/* Redirecionamento padrão para rotas desconhecidas */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
