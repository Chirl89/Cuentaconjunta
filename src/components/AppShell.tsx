"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Vertical Sidebar on Left */}
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Content Area (offset on desktop for sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">
        <Header onOpenMobileMenu={() => setIsMobileOpen(true)} />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-safe-bottom">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
