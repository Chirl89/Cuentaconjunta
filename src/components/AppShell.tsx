"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SyncModal from "./SyncModal";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";
import { TransactionsProvider, useTransactions } from "@/context/TransactionsContext";
import { ProfileSecurityProvider } from "@/context/ProfileSecurityContext";

export const AppShellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const { activeTab, setActiveTab } = useNavigation();
  const { syncBankFeed } = useTransactions();

  // Automatic seamless background synchronization whenever switching tabs
  useEffect(() => {
    syncBankFeed().catch(() => {});
  }, [activeTab, syncBankFeed]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row antialiased">
      {/* Vertical Sidebar on Left */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">
        <Header
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
        />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-safe-bottom">
          {children}
        </main>
      </div>

      {/* Interactive Sync Modal for mobile and desktop */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onOpenBankConnect={() => setActiveTab("cuentas")}
      />
    </div>
  );
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProfileSecurityProvider>
      <TransactionsProvider>
        <NavigationProvider>
          <AppShellContent>{children}</AppShellContent>
        </NavigationProvider>
      </TransactionsProvider>
    </ProfileSecurityProvider>
  );
};

export default AppShell;
