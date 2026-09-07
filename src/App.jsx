import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
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
