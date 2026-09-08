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
import DocsWebhook from './pages/DocsWebhook';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';
import { loginWithGoogle } from './utils/auth';

function AuthListener() {
  const navigate = useNavigate();

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
          
          if (window.location.pathname === '/' || window.location.pathname === '/login') {
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
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
          navigate('/dashboard', { replace: true });
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  return null;
}

function isDocsSubdomain() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'docs.primetrack.top' || 
         window.location.hostname.startsWith('docs.');
}

export default function App() {
  const isDocsHost = isDocsSubdomain();

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {!isDocsHost && <AuthListener />}
        <Routes>
          {/* Subdomínio docs.primetrack.top ou rotas diretas de documentação */}
          {isDocsHost ? (
            <>
              <Route path="/" element={<DocsWebhook />} />
              <Route path="*" element={<DocsWebhook />} />
            </>
          ) : (
            <>
              {/* Documentação Oficial Webhook API */}
              <Route path="/docs" element={<DocsWebhook />} />
              <Route path="/docs/webhook" element={<DocsWebhook />} />
              <Route path="/documentacao" element={<DocsWebhook />} />

              {/* Rota 1: Landing Page Pública */}
              <Route path="/" element={<LandingPage />} />

              {/* Políticas e Termos exigidos pelo Facebook / Meta Review */}
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/termos" element={<TermsOfService />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Rota 2: Tela de Login */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rotas do Painel Interno */}
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
            </>
          )}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
