"use client";

import React from "react";
import VersionBadge from "./VersionBadge";
import { useUserNames } from "@/context/UserNamesContext";
import { Menu, HeartHandshake } from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { memberAName, memberBName } = useUserNames();

  return (
    <header className="md:hidden sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 h-14 flex items-center justify-between pt-safe-top">
      {/* Mobile Hamburger to trigger vertical sidebar */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5 text-[#00D09C]" />
        </button>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-[#00D09C] to-teal-400 flex items-center justify-center shadow-sm">
            <HeartHandshake className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">Cuenta Conjunta</span>
        </div>
      </div>

      {/* Right side: Read-only Couple Badge & VersionBadge (NO edit button) */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/70 text-[11px] font-medium text-slate-300 border border-slate-700/50">
          <span className="text-[#00D09C]">{memberAName}</span>
          <span className="text-slate-500">&</span>
          <span className="text-rose-400">{memberBName}</span>
        </div>
        <VersionBadge showDetails={false} />
      </div>
    </header>
  );
};

export default Header;
