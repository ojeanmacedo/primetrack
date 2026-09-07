import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSimulateQuickSale = () => {
    showToast('⚡ Venda de R$ 97,00 aprovada! Sinal Meta CAPI 9.3 enviado.');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#03060D] text-[#EDF2FF] flex font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#0A1426] border border-[#1A6DFF] text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#03060D]">
        
        {/* Dynamic Route Content - Full Width filling the canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:px-7 lg:py-6">
          <div className="w-full">
            <Outlet />
          </div>
        </main>

      </div>

    </div>
  );
}
