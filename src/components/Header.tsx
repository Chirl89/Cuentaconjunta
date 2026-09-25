"use client";

import React from "react";
import SygisLogo from "./SygisLogo";
import { Menu, RefreshCw } from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onOpenSyncModal }) => {
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

      {/* Right side: Direct Sync Button */}
      <div className="flex items-center">
        {onOpenSyncModal && (
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 shadow-xs text-xs font-black text-emerald-800 transition-all cursor-pointer active:scale-95"
            title="Sincronizar extracto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#00A37A]" />
            <span>Sync</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
