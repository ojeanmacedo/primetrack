import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#03060D] text-[#EDF2FF] flex font-sans">
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
