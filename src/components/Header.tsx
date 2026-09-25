"use client";

import React, { useState } from "react";
import SygisLogo from "./SygisLogo";
import { useTransactions } from "@/context/TransactionsContext";
import { Menu, RefreshCw, SlidersHorizontal } from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onOpenSyncModal }) => {
  const { syncBankFeed } = useTransactions();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      const res = await syncBankFeed();
      if (res?.cardCount) {
        setSyncToast(`¡Al día! (${res.cardCount})`);
      } else {
        setSyncToast("¡Al día!");
      }
      setTimeout(() => setSyncToast(null), 3000);
    } catch {
      setSyncToast("Error");
      setTimeout(() => setSyncToast(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="md:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 h-14 flex items-center justify-between pt-safe-top shadow-xs">
      {/* Mobile Hamburger to trigger vertical sidebar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5 text-[#00A37A]" />
        </button>

        <div className="flex items-center gap-1.5">
          <SygisLogo size={28} variant="dark" />
          <span className="font-extrabold text-sm tracking-tight text-slate-900">Sygis</span>
        </div>
      </div>

      {/* Right side: Sync Button (placed where VersionBadge previously was) */}
      <div className="flex items-center">
        <div className="flex items-center rounded-full bg-emerald-50 border border-emerald-300/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={handleQuickSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            title="Sincronizar todo en 1 clic (cuenta + tarjetas BBDD)"
          >
            <RefreshCw className={`w-3 h-3 text-[#00A37A] ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Sync..." : syncToast || "Sync"}</span>
          </button>
          {onOpenSyncModal && (
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="px-1.5 py-1 text-emerald-700 hover:bg-emerald-100 border-l border-emerald-200 transition-colors"
              title="Opciones avanzadas y subida de archivos"
            >
              <SlidersHorizontal className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
